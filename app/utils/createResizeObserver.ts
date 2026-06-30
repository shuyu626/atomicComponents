import createSingletonObserver from '~/utils/createSingletonObserver'

import type { SingletonObserverHandle } from '~/utils/createSingletonObserver'

/**
 * Singleton ResizeObserver 包裝。共用骨架見 {@link createSingletonObserver}
 *（Singleton / Lazy / Auto-disconnect / SSR-safe 的設計重點都在那裡）。
 *
 * 這裡只提供 ResizeObserver 專屬的兩件事：
 *   1. 支援判斷 —— 需要 `window` 與 `ResizeObserver`
 *   2. observer 建構 —— 每個 entry 一律觸發對應 callback（尺寸變化即通知，無額外條件）
 *
 * @example
 * const { observe } = createResizeObserver()
 * const unobserve = observe(el, () => recompute())
 * onScopeDispose(() => unobserve())
 */
const createResizeObserver: () => SingletonObserverHandle = createSingletonObserver(
  () => typeof window !== 'undefined' && typeof ResizeObserver !== 'undefined',
  notify =>
    new ResizeObserver((entries) => {
      for (const entry of entries) notify(entry.target)
    }),
)

export default createResizeObserver
