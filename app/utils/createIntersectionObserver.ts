/**
 * Singleton IntersectionObserver 包裝。
 *
 * 為什麼需要這個工具：直接 `new IntersectionObserver` 有 3 個常見痛點 ——
 *   1. 每個呼叫端各建一個 observer，多元件場景下記憶體與排程開銷高
 *   2. 沒人管釋放，元件 unmount 後 observer 殘留
 *   3. SSR / 舊瀏覽器需要呼叫端自己寫 typeof guard
 * 本檔解掉這三件事，呼叫端只負責「element + callback」與「unobserve」。
 */

type CallbackFn = () => void
type ObserveFn = (element: Element, callback: CallbackFn) => () => void

interface IntersectionObserverHandle {
  /**
   * 觀察一個 element。當其進入 viewport 時觸發 callback，回傳 unobserve 函式。
   *
   * 呼叫端責任：在元件 `onBeforeUnmount` 內呼叫回傳的 unobserve，
   * 否則 callback 引用會留在 module-level Map 內。
   */
  observe: ObserveFn
}

/**
 * Module-level cache。整個 app 共享同一份 handle，
 * 透過 closure 內的 `observer` / `callbacks` 共用同一個 IntersectionObserver 實例。
 *
 * 注意：當 callbacks 清零時，內部 `observer` 會 disconnect 並設 null（釋放原生資源），
 * 但 `cache` 物件本身保留 —— 下次 observe 進來時透過 `observer ||=` 自動重建一個新的。
 */
let cache: IntersectionObserverHandle | undefined

/**
 * 取得共享的 IntersectionObserver handle。多次呼叫永遠回傳同一個 handle。
 *
 * ## 設計重點
 *
 * 1. **Singleton（單例）**
 *    100 個 BaseLink 的列表頁只會有 1 個 IntersectionObserver 實例，
 *    瀏覽器內部排程只跑一次 reflow 檢測批次處理所有 target。
 *
 * 2. **Lazy 建立**
 *    `observer` 延遲到首次 `observe()` 才 `new`。Helper 被引入但未使用時零成本。
 *
 * 3. **Auto-disconnect**
 *    當 `callbacks.size === 0`（最後一個 unobserve 解除），observer 自動
 *    disconnect 並設 null。下次有人 observe 進來會自動重建，**永遠不留閒置**。
 *
 * 4. **Safari 9-15 相容**
 *    這幾版 Safari 對 `entry.isIntersecting` 偶發 false negative
 *    （bug ref: https://bugs.webkit.org/show_bug.cgi?id=160101）。
 *    用 `intersectionRatio > 0` 兜底，避免漏觸發 callback。
 *
 * 5. **SSR / 舊瀏覽器 safe**
 *    無 `IntersectionObserver` 時回 no-op handle，呼叫端不必再寫 typeof guard。
 *    **no-op 不寫入 cache** —— 避免 server bundle 把 no-op 鎖進 cache 後，
 *    在某些 SSR + client share-module-state 的測試環境誤拿到 no-op。
 *
 * ## Trade-off
 *
 * - **不接受 `IntersectionObserverInit` options**：單例模式下不能讓不同呼叫端
 *   要求不同的 `root` / `rootMargin` / `threshold`（會互相覆蓋）。
 *   若未來需要不同設定，另開一個工廠（如 `createImageLazyObserver`），不要改這個。
 *
 * - **不暴露公開 `disconnect()`**：生命週期由 size===0 自動管理；
 *   呼叫端只能透過 unobserve 自己那個 element 來「退出」，不能強制清空全 app 的觀察。
 *
 * @example
 * import createIntersectionObserver from '~/utils/createIntersectionObserver'
 *
 * const { observe } = createIntersectionObserver()
 *
 * const unobserve = observe(el, () => {
 *   console.log('進入 viewport')
 *   unobserve()  // 只想觸發一次的話自己 unobserve
 * })
 *
 * // 元件 unmount 時必須清理
 * onBeforeUnmount(() => unobserve?.())
 */
export default function createIntersectionObserver(): IntersectionObserverHandle {
  // ── SSR / 舊瀏覽器 fallback ──────────────────────────────────────
  // 直接回 no-op handle 並 return，不寫入 cache。
  // observe() 與其回傳的 unobserve 都是空函式，呼叫端不會 throw。
  if (
    typeof window === 'undefined'
    || typeof IntersectionObserver === 'undefined'
  ) {
    return { observe: () => () => {} }
  }

  // 已建過就直接回（同一個 app 內所有呼叫共享）
  if (cache) return cache

  // ── 共享狀態（被 cache 鎖在 closure 內）──────────────────────────
  let observer: IntersectionObserver | null = null

  /**
   * 用 `Map` 而非 `WeakMap` —— 因為需要 `.size` 做 auto-disconnect 判斷
   * （WeakMap 規範不提供 size，無法判斷是否清零）。
   *
   * 強引用不會造成 leak：
   *   - 呼叫端透過 unobserve() 主動 delete callback 與 element
   *   - IntersectionObserver 對 target 本身就是 weak ref（spec 保證），
   *     不會阻礙 element 被 GC
   */
  const callbacks = new Map<Element, CallbackFn>()

  const observe: ObserveFn = (element, callback) => {
    // Lazy 建立：第一次 observe 才 new，零成本啟動；
    // auto-disconnect 後若有人再 observe，這裡也會重建出新的 observer
    observer ||= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const cb = callbacks.get(entry.target)
        if (!cb) continue

        // Safari 9-15: isIntersecting 偶發 false negative，用 ratio 兜底
        const isVisible = entry.isIntersecting || entry.intersectionRatio > 0
        if (isVisible) cb()
      }
    })

    callbacks.set(element, callback)
    observer.observe(element)

    // 回傳 unobserve closure：呼叫端負責在 unmount 時觸發。
    // Idempotent：重複呼叫安全 —— `callbacks.has` guard 攔下「element 已 unobserve」
    // 的情況，避免 observer 已被 auto-disconnect 設 null 後再呼叫 `.unobserve` 而 NPE。
    return () => {
      if (!callbacks.has(element)) return

      callbacks.delete(element)
      observer?.unobserve(element)

      // 最後一個 callback 解除 → 釋放原生 observer（不留閒置）。
      // cache 本身保留，下次 observe 進來透過 `observer ||=` 自動重建。
      if (callbacks.size === 0) {
        observer?.disconnect()
        observer = null
      }
    }
  }

  cache = { observe }
  return cache
}
