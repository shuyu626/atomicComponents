/**
 * Singleton ResizeObserver 包裝（與 `createIntersectionObserver` 同款架構）。
 *
 * 為什麼需要這個工具：直接 `new ResizeObserver` 有 3 個常見痛點 ——
 *   1. 每個呼叫端各建一個 observer，多元件場景下記憶體與排程開銷高
 *   2. 沒人管釋放，元件 unmount 後 observer 殘留
 *   3. SSR / 舊瀏覽器需要呼叫端自己寫 typeof guard
 * 本檔解掉這三件事，呼叫端只負責「element + callback」與「unobserve」。
 */

type CallbackFn = () => void
type ObserveFn = (element: Element, callback: CallbackFn) => () => void

interface ResizeObserverHandle {
  /**
   * 觀察一個 element。尺寸變化時觸發 callback，回傳 unobserve 函式。
   *
   * 呼叫端責任：在元件卸載 / scope dispose 時呼叫回傳的 unobserve，
   * 否則 callback 引用會留在 module-level Map 內。
   */
  observe: ObserveFn
}

/**
 * Module-level cache。整個 app 共享同一份 handle，
 * 透過 closure 內的 `observer` / `callbacks` 共用同一個 ResizeObserver 實例。
 *
 * 注意：當 callbacks 清零時，內部 `observer` 會 disconnect 並設 null（釋放原生資源），
 * 但 `cache` 物件本身保留 —— 下次 observe 進來時透過 `observer ||=` 自動重建一個新的。
 */
let cache: ResizeObserverHandle | undefined

/**
 * 取得共享的 ResizeObserver handle。多次呼叫永遠回傳同一個 handle。
 *
 * ## 設計重點
 *
 * 1. **Singleton（單例）** —— N 個 BaseScrollbar 只會有 1 個 ResizeObserver 實例，
 *    瀏覽器把所有 target 的尺寸量測批次在同一次排程處理。
 * 2. **Lazy 建立** —— `observer` 延遲到首次 `observe()` 才 `new`，引入但未使用時零成本。
 * 3. **Auto-disconnect** —— 最後一個 unobserve 解除時自動 disconnect 並設 null，永不留閒置；
 *    下次有人 observe 進來會自動重建。
 * 4. **SSR / 舊瀏覽器 safe** —— 無 `ResizeObserver` 時回 no-op handle（不寫入 cache）。
 *
 * @example
 * const { observe } = createResizeObserver()
 * const unobserve = observe(el, () => recompute())
 * onScopeDispose(() => unobserve())
 */
export default function createResizeObserver(): ResizeObserverHandle {
  // ── SSR / 舊瀏覽器 fallback ──────────────────────────────────────
  // 回 no-op handle 並 return，不寫入 cache（避免 server bundle 把 no-op 鎖進 cache）。
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') {
    return { observe: () => () => {} }
  }

  // 已建過就直接回（同一個 app 內所有呼叫共享）
  if (cache) return cache

  // ── 共享狀態（被 cache 鎖在 closure 內）──────────────────────────
  let observer: ResizeObserver | null = null

  /**
   * 用 `Map` 而非 `WeakMap` —— 需要 `.size` 做 auto-disconnect 判斷
   * （WeakMap 不提供 size）。強引用不會 leak：呼叫端透過 unobserve 主動 delete。
   */
  const callbacks = new Map<Element, CallbackFn>()

  const observe: ObserveFn = (element, callback) => {
    // Lazy 建立；auto-disconnect 後若有人再 observe，這裡也會重建。
    observer ||= new ResizeObserver((entries) => {
      for (const entry of entries) {
        callbacks.get(entry.target)?.()
      }
    })

    callbacks.set(element, callback)
    observer.observe(element)

    // 回傳 unobserve closure。Idempotent：重複呼叫安全（`callbacks.has` guard）。
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
