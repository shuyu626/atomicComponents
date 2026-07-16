/**
  * Generic Singleton Observer factory.
  *
  * 提供 ResizeObserver / IntersectionObserver 共用的管理邏輯：
  *
  * - Singleton：多個呼叫端共享同一個原生 observer instance
  * - Lazy create：第一次 observe 時才建立原生 observer
  * - Auto cleanup：最後一個 element unobserve 後自動 disconnect
  * - SSR safe：不支援 observer API 時回傳 no-op handle
  *
  * 呼叫端只需要提供：
  *   1. 要觀察的 element
  *   2. 事件發生時執行的 callback
  *   3. 元件卸載時呼叫 unobserve
  *
  * 原生 observer 的差異由 create() 負責：
  *   - ResizeObserver：元素尺寸變化時通知 callback
  *   - IntersectionObserver：元素進入 viewport 時通知 callback
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
  isSupported: () => boolean,  // 判斷目前環境是否支援原生 Observer API
  create: (notify: (target: Element) => void) => NativeObserver,  // 建立真正的原生 Observer 實例
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

    // Lazy create：
    // 第一次 observe 時建立 NativeObserver。
    const observe: ObserveFn = (element, callback) => {
      // Lazy 建立；auto-disconnect 後若有人再 observe，這裡也會重建。
      observer ||= create(notify)

      callbacks.set(element, callback)
      observer.observe(element)

      // 回傳解除監控函式。
      // 使用 closure 記住目前 element。
      return () => {
        if (!callbacks.has(element)) return // 防止重複 unobserve

        callbacks.delete(element)
        observer?.unobserve(element)

        // 如果已經沒有任何 element 被觀察：
        // 釋放原生 observer（不留閒置），cache 本身保留供下次重建。
        if (callbacks.size === 0) {
          observer?.disconnect()
          observer = null
        }
      }
    }

    // 建立 singleton handle 並快取
    cache = { observe }
    return cache
  }
}
