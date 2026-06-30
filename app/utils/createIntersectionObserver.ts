import createSingletonObserver from '~/utils/createSingletonObserver'

import type { SingletonObserverHandle } from '~/utils/createSingletonObserver'

/**
 * Singleton IntersectionObserver 包裝。共用骨架見 {@link createSingletonObserver}
 *（Singleton / Lazy / Auto-disconnect / SSR-safe 的設計重點都在那裡）。
 *
 * 這裡只提供 IntersectionObserver 專屬的兩件事：
 *   1. 支援判斷 —— 需要 `window` 與 `IntersectionObserver`
 *   2. observer 建構 —— 進入 viewport 才觸發 callback；
 *      Safari 9-15 對 `entry.isIntersecting` 偶發 false negative
 *      （bug ref: https://bugs.webkit.org/show_bug.cgi?id=160101），用 `intersectionRatio > 0` 兜底。
 *
 * ## Trade-off（沿用單例設計的限制）
 * - **不接受 `IntersectionObserverInit` options**：單例不能讓不同呼叫端要求不同的
 *   `root` / `rootMargin` / `threshold`（會互相覆蓋）。若需不同設定，另開一個工廠，不要改這個。
 * - **不暴露公開 `disconnect()`**：生命週期由 size===0 自動管理；呼叫端只能透過 unobserve
 *   退出自己那個 element，不能強制清空全 app 的觀察。
 *
 * @example
 * const { observe } = createIntersectionObserver()
 * const unobserve = observe(el, () => { console.log('進入 viewport'); unobserve() })
 * onBeforeUnmount(() => unobserve?.())
 */
const createIntersectionObserver: () => SingletonObserverHandle = createSingletonObserver(
  () => typeof window !== 'undefined' && typeof IntersectionObserver !== 'undefined',
  notify =>
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        // Safari 9-15: isIntersecting 偶發 false negative，用 ratio 兜底
        const isVisible = entry.isIntersecting || entry.intersectionRatio > 0
        if (isVisible) notify(entry.target)
      }
    }),
)

export default createIntersectionObserver
