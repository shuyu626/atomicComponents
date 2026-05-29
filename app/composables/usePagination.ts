import { computed, toValue } from 'vue'
import type { ComputedRef, MaybeRefOrGetter } from 'vue'

import noop from '~/utils/noop'

/**
 * Pagination 渲染項目的 type。
 * - `page`            一般頁碼按鈕
 * - `first` / `last`  跳至第一頁 / 最後一頁
 * - `previous` / `next` 上一頁 / 下一頁
 * - `start-ellipsis` / `end-ellipsis` 省略符（前段 / 後段）
 *
 * 區分 start / end ellipsis 而非統一一個 `ellipsis` —— 兩者語意不同
 * （前段省略代表中間到開頭有空缺；後段反之），caller 真的要做點擊跳轉
 * 「往回 / 往前 N 頁」時可以靠 type 分辨方向。
 */
export type PaginationItemType =
  | 'page'
  | 'first'
  | 'previous'
  | 'next'
  | 'last'
  | 'start-ellipsis'
  | 'end-ellipsis'

export interface PaginationItem {
  /** 此項目的功能類型 */
  type: PaginationItemType
  page: number | null
  /** 是否為當前頁（僅 type='page' 時可能為 true） */
  selected: boolean
  /**
   * 是否禁用。`first` / `previous` 在第一頁時 disabled；
   * `next` / `last` 在最後一頁時 disabled；
   * 整體 disabled prop 為 true 時所有可點按鈕一律 disabled。
   */
  disabled: boolean
  /** 給 selected 頁的 aria-current 屬性值（WAI-ARIA 慣例用 `'page'`） */
  ariaCurrent: 'page' | undefined
  /** 點擊時觸發。ellipsis 為 noop，可安全綁定 */
  onClick: () => void
}

export interface UsePaginationOptions {
  /** 當前頁碼（1-based） */
  page: number
  /** 總頁數 */
  count: number
  /** 當前頁前後各顯示幾個兄弟頁碼 @default 1 */
  siblingCount?: number
  /** 開頭 / 結尾固定顯示幾個頁碼。 @default 1 */
  boundaryCount?: number
  /** 是否顯示「跳至第一頁」按鈕 @default false */
  showFirstButton?: boolean
  /** 是否顯示「跳至最後一頁」按鈕 @default false */
  showLastButton?: boolean
  /** 是否隱藏「上一頁」按鈕 @default false */
  hidePrevButton?: boolean
  /** 是否隱藏「下一頁」按鈕 @default false */
  hideNextButton?: boolean
  /** 整體禁用（所有按鈕變 disabled） @default false */
  disabled?: boolean
  /** 任一按鈕被點擊、頁碼變動時觸發 */
  onChange?: (page: number) => void
}

/**
 * `[start, end]` 閉區間的整數陣列；`end < start` 回傳空陣列。
 * 保留此安全行為，演算法在 boundary 退化時（例：count = 1）才不會炸。
 */
function range(start: number, end: number): number[] {
  if (end < start) return []
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

/**
 * 把 `first` / `previous` / `next` / `last` 對應到目標頁碼。
 * 不會 clamp（呼叫端透過 `disabled` 防止越界觸發），page 為 0 / count+1 時，
 * 配合 disabled 判斷會被攔下不會 emit。
 */
function controlButtonTargetPage(
  type: PaginationItemType,
  page: number,
  count: number,
): number | null {
  switch (type) {
    case 'first':
      return 1
    case 'previous':
      return page - 1
    case 'next':
      return page + 1
    case 'last':
      return count
    default:
      return null
  }
}

/**
 * 依當前頁 / 總頁數 / sibling / boundary 計算出 pagination 渲染所需的 items 陣列。
 *
 * 演算法參照 MUI `usePagination` 結構（startPages / endPages / siblingsStart-End
 * 收斂、ellipsis vs 單一頁碼的替換），保留 `start-ellipsis` 與 `end-ellipsis` 分離。
 *
 * @example
 * const items = usePagination(() => ({ page: page.value, count: 10 }))
 * // → [{ type: 'previous', ... }, { type: 'page', page: 1, ... }, ...]
 */
export default function usePagination(
  options: MaybeRefOrGetter<UsePaginationOptions>,
): ComputedRef<PaginationItem[]> {
  return computed(() => {
    const {
      page,
      count,
      siblingCount = 1,
      boundaryCount = 1,
      showFirstButton = false,
      showLastButton = false,
      hidePrevButton = false,
      hideNextButton = false,
      disabled = false,
      onChange = noop,
    } = toValue(options)

    // count <= 0 視為「沒有資料」，回傳空陣列；caller 自行決定要不要渲染 nav。
    if (count <= 0) return []

    // ── 演算開頭 / 結尾固定頁碼區段 ─────────────────────────────
    const startPages = range(1, Math.min(boundaryCount, count))
    const endPages = range(
      Math.max(count - boundaryCount + 1, boundaryCount + 1),
      count,
    )

    // ── 演算當前頁兩側兄弟頁碼區段 ─────────────────────────────
    const siblingsStart = Math.max(
      Math.min(
        page - siblingCount,
        count - boundaryCount - siblingCount * 2 - 1,
      ),
      boundaryCount + 2,
    )

    const siblingsEnd = Math.min(
      Math.max(
        page + siblingCount,
        boundaryCount + siblingCount * 2 + 2,
      ),
      // endPages 起點前一格；endPages 為空時退化為 count - 1
      endPages.length > 0 ? endPages[0]! - 2 : count - 1,
    )

    // ── 組裝 raw items（type 字串 / 頁碼數字混排） ─────────────────
    const rawItems: Array<number | PaginationItemType> = [
      ...(showFirstButton ? (['first'] as const) : []),
      ...(hidePrevButton ? [] : (['previous'] as const)),
      ...startPages,

      // 前段：siblingsStart 與 startPages 之間有 2 格以上空隙 → 放 ellipsis；
      // 剛好差 1 格 → 直接放那個頁碼，不放 ellipsis（避免 [1, …, 2] 這種怪畫面）。
      ...(siblingsStart > boundaryCount + 2
        ? (['start-ellipsis'] as const)
        : boundaryCount + 1 < count - boundaryCount
          ? [boundaryCount + 1]
          : []),

      ...range(siblingsStart, siblingsEnd),

      // 後段：同理
      ...(siblingsEnd < count - boundaryCount - 1
        ? (['end-ellipsis'] as const)
        : count - boundaryCount > boundaryCount
          ? [count - boundaryCount]
          : []),

      ...endPages,
      ...(hideNextButton ? [] : (['next'] as const)),
      ...(showLastButton ? (['last'] as const) : []),
    ]

    // ── 轉成 PaginationItem ─────────────────────────────────────
    return rawItems.map<PaginationItem>((item) => {
      if (typeof item === 'number') {
        return {
          type: 'page',
          page: item,
          selected: item === page,
          disabled,
          ariaCurrent: item === page ? 'page' : undefined,
          onClick: () => {
            if (disabled || item === page) return
            onChange(item)
          },
        }
      }

      const targetPage = controlButtonTargetPage(item, page, count)
      const isEllipsis = item === 'start-ellipsis' || item === 'end-ellipsis'

      // 邊界判斷：
      //   - first / previous 在第一頁時 disabled
      //   - next / last      在最後一頁時 disabled
      //   - ellipsis 永遠 disabled（純視覺）
      const isAtStart = page <= 1
      const isAtEnd = page >= count
      const controlDisabled =
        isEllipsis ||
        (item === 'first' || item === 'previous' ? isAtStart : isAtEnd)

      return {
        type: item,
        page: targetPage,
        selected: false,
        disabled: disabled || controlDisabled,
        ariaCurrent: undefined,
        onClick: () => {
          if (disabled || controlDisabled || targetPage == null) return
          onChange(targetPage)
        },
      }
    })
  })
}
