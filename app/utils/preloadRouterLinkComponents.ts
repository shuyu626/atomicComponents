import type { RouteLocationRaw, Router } from 'vue-router'

import isFunction from './isFunction'

/**
 * 私有 cache 介面 — `_routePreloaded` 是附加在 router 實例上的去重 set，
 * 對外（呼叫端）不需要知道，所以放函式內部 cast，不污染公開 signature。
 */
type RouterWithPreloadCache = Router & { _routePreloaded?: Set<string> }

/**
 * 預載指定路由的 matched components chunks，行為對齊 NuxtLink 內建 prefetch。
 *
 * 命名刻意使用 `preloadRouterLinkComponents`：
 * 避免與 Nuxt 內建同名 utility 衝突，確保在 Nuxt auto-import 環境下使用自己的實作。
 *
 *   1. `router.resolve(to)` 拿出 matched route records
 *   2. 對每個 record 的 default lazy component 觸發載入（function 形式才是 lazy import）
 *   3. 用 `router._routePreloaded` set 記錄已預載的 path，
 *      跨多個 BaseLink 共享，避免同一個 route 被重複預載
 *
 * 失敗策略：個別 component import 失敗時：
 *   - 吞掉錯誤（預載本身就是 best-effort，失敗不應影響 UX）
 *   - dev 模式 `console.warn` 提示，方便定位 chunk 路徑錯誤
 *   - 把該 path 從 `_routePreloaded` 移除，讓下次有機會重試
 *     （否則網路抖動失敗後這條 route 會永久卡在 set 中，再也不會 preload）
 *
 * @param to 目標路由（同 `<RouterLink to>` 接受的型別）
 * @param router 由 `useRouter()` 取得的 router 實例（標準 `Router` 型別即可，
 *               函式內部自行處理私有 cache 屬性，呼叫端不需要 cast）
 *
 * @example
 * import { useRouter } from 'vue-router'
 * import preloadRouterLinkComponents from '~/utils/preloadRouterLinkComponents'
 *
 * const router = useRouter()
 * preloadRouterLinkComponents('/products/123', router)
 */
export default async function preloadRouterLinkComponents(
  to: RouteLocationRaw,
  router: Router,
): Promise<void> {
  // 空字串視為「不導航」，跳過
  if (typeof to === 'string' && to === '') return

  const { path, matched } = router.resolve(to)
  if (!matched.length) return

  // 內部 cast：把私有 cache 屬性的細節封裝在函式內，呼叫端用標準 Router 即可
  const cache = router as RouterWithPreloadCache

  // 共享 cache：同一個 router 實例的多個 BaseLink 共用
  cache._routePreloaded ||= new Set()
  if (cache._routePreloaded.has(path)) return
  cache._routePreloaded.add(path)

  // 只有 function 形式才是 lazy import（已載入的 component 是 object）
  const components = matched
    .map(record => record.components?.default)
    .filter(component => isFunction(component))

  await Promise.all(
    components.map(component =>
      Promise.resolve((component as () => unknown)()).catch((error) => {
        // 失敗時從 cache 移除，下次仍有機會重試（避免永久卡死）
        cache._routePreloaded?.delete(path)

        if (import.meta.env.DEV) {
          console.warn('[preloadRouterLinkComponents] chunk load failed:', path, error)
        }
      }),
    ),
  )
}
