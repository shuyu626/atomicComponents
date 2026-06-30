/**
 * 泛型 Singleton Observer 工廠 —— `createResizeObserver` 與 `createIntersectionObserver`
 * 的共用骨架（兩者原本約 90% 邏輯重複，差別僅在原生 observer 的建構與「何時觸發 callback」）。
 *
 * 為什麼需要這層包裝：直接 `new ResizeObserver` / `new IntersectionObserver` 有 3 個常見痛點 ——
 *   1. 每個呼叫端各建一個 observer，多元件場景下記憶體與排程開銷高
 *   2. 沒人管釋放，元件 unmount 後 observer 殘留
 *   3. SSR / 舊瀏覽器需要呼叫端自己寫 typeof guard
 * 本檔解掉這三件事，呼叫端只負責「element + callback」與「unobserve」。
 *
 * ## 設計重點（兩種 observer 共用）
 *
 * 1. **Singleton（單例）** —— N 個呼叫端共享 1 個原生 observer 實例，瀏覽器批次量測。
 * 2. **Lazy 建立** —— 原生 observer 延遲到首次 `observe()` 才 `new`，引入但未使用時零成本。
 * 3. **Auto-disconnect** —— 最後一個 unobserve 解除（`callbacks.size === 0`）時自動 disconnect
 *    並設 null（釋放原生資源），cache 物件本身保留，下次 observe 進來時自動重建。
 * 4. **SSR / 舊瀏覽器 safe** —— 不支援時回 no-op handle（**不寫入 cache**，避免 server bundle
 *    把 no-op 鎖進 cache 後，在 SSR + client share-module-state 的測試環境誤拿到 no-op）。
 */

type CallbackFn = () => void
type ObserveFn = (element: Element, callback: CallbackFn) => () => void

export interface SingletonObserverHandle {
  /**
   * 觀察一個 element，事件發生時觸發 callback，回傳 unobserve 函式。
   *
   * 呼叫端責任：在元件卸載 / scope dispose 時呼叫回傳的 unobserve，
   * 否則 callback 引用會留在 module-level Map 內。
   */
  observe: ObserveFn
}

/** 原生 observer 的最小共通介面（ResizeObserver / IntersectionObserver 皆符合）。 */
interface NativeObserver {
  observe: (target: Element) => void
  unobserve: (target: Element) => void
  disconnect: () => void
}

/**
 * 建立一個「取得共享 observer handle」的函式（呼叫它永遠回傳同一個 handle）。
 *
 * @param isSupported 於「呼叫時」判斷環境是否支援（SSR / 舊瀏覽器回 false）。
 *                    刻意在呼叫時而非 module load 時判斷，確保 client hydration 後拿得到真實 observer。
 * @param create      給定 `notify(target)` 派發器，建構原生 observer。
 *                    原生 observer 自己的 entries callback 決定「何時」對某個 target 呼叫 `notify`
 *                    —— 這是 Resize 與 Intersection 唯一的差異點（IO 需額外判斷可見性）。
 *
 * @example
 * // createResizeObserver.ts
 * export default createSingletonObserver(
 *   () => typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined',
 *   notify => new ResizeObserver(entries => entries.forEach(e => notify(e.target))),
 * )
 */
export default function createSingletonObserver(
  isSupported: () => boolean,
  create: (notify: (target: Element) => void) => NativeObserver,
): () => SingletonObserverHandle {
  // 每呼叫一次 createSingletonObserver 得到獨立的 module-level cache
  // （resize 與 intersection 各自一份，互不干擾）。
  let cache: SingletonObserverHandle | undefined

  return function getHandle(): SingletonObserverHandle {
    // ── SSR / 舊瀏覽器 fallback：回 no-op，不寫入 cache ──
    if (!isSupported()) return { observe: () => () => {} }

    // 已建過就直接回（同一個 app 內所有呼叫共享）
    if (cache) return cache

    // ── 共享狀態（被 cache 鎖在 closure 內）──
    let observer: NativeObserver | null = null

    /**
     * 用 `Map` 而非 `WeakMap` —— 需要 `.size` 做 auto-disconnect 判斷（WeakMap 不提供 size）。
     * 強引用不會 leak：呼叫端透過 unobserve 主動 delete；原生 observer 對 target 本身是 weak ref。
     */
    const callbacks = new Map<Element, CallbackFn>()

    // 原生 observer entries callback 決定觸發時機後，統一走這支派發給對應 callback。
    const notify = (target: Element) => {
      callbacks.get(target)?.()
    }

    const observe: ObserveFn = (element, callback) => {
      // Lazy 建立；auto-disconnect 後若有人再 observe，這裡也會重建。
      observer ||= create(notify)

      callbacks.set(element, callback)
      observer.observe(element)

      // 回傳 unobserve closure。Idempotent：重複呼叫安全（`callbacks.has` guard，
      // 避免 observer 已被 auto-disconnect 設 null 後再呼叫 `.unobserve` 而 NPE）。
      return () => {
        if (!callbacks.has(element)) return

        callbacks.delete(element)
        observer?.unobserve(element)

        // 最後一個解除 → 釋放原生 observer（不留閒置），cache 本身保留供下次重建。
        if (callbacks.size === 0) {
          observer?.disconnect()
          observer = null
        }
      }
    }

    cache = { observe }
    return cache
  }
}
