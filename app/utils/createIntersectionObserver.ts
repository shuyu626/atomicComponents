import createSingletonObserver from '~/utils/createSingletonObserver'

import type { SingletonObserverHandle } from '~/utils/createSingletonObserver'

/**
 * Singleton IntersectionObserver wrapper.
 *
 * 提供：
 * 1. SSR / 舊瀏覽器支援檢查
 * 2. IntersectionObserver 建構，元素進入 viewport 時觸發 callback
 *
 * Safari 9-15 的 `isIntersecting` 可能誤判，
 * 因此使用 `intersectionRatio > 0` 作為 fallback。
 *
 * 注意：
 * - 不支援自訂 IntersectionObserver options（root / rootMargin / threshold），
 *   因單例 observer 只能維持一組設定。
 * - 不暴露 disconnect()，observer 生命週期由 createSingletonObserver 自動管理。
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
        // 判斷元素是否進入畫面
        // Safari 9-15: isIntersecting 偶發 false negative，用 ratio 兜底
        const isVisible = entry.isIntersecting || entry.intersectionRatio > 0
        if (isVisible) notify(entry.target)
      }
    }),
)

export default createIntersectionObserver
