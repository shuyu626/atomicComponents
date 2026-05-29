import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import usePagination from '~/composables/usePagination'
import type { PaginationItem, PaginationItemType } from '~/composables/usePagination'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * 簡化斷言：把 items 攤平成 `[type, page, selected?, disabled?]` 元組陣列。
 * `selected` / `disabled` 為 false 時省略，讓 expected 陣列更易讀。
 */
function shape(items: PaginationItem[]) {
  return items.map((i) => {
    const base: [PaginationItemType, number | null] = [i.type, i.page]
    const extras: Record<string, boolean> = {}
    if (i.selected) extras.selected = true
    if (i.disabled) extras.disabled = true
    return Object.keys(extras).length ? { shape: base, ...extras } : { shape: base }
  })
}

function types(items: PaginationItem[]): PaginationItemType[] {
  return items.map((i) => i.type)
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('usePagination', () => {
  // ── 基本演算法 ────────────────────────────────────────────────────────
  describe('algorithm', () => {
    it('renders all pages without ellipsis when count is small', () => {
      const items = usePagination(() => ({ page: 1, count: 5 })).value
      // 預設 boundaryCount=1, siblingCount=1, prev + 1..5 + next
      expect(types(items)).toEqual([
        'previous',
        'page',
        'page',
        'page',
        'page',
        'page',
        'next',
      ])
    })

    it('marks the current page as selected with aria-current="page"', () => {
      const items = usePagination(() => ({ page: 3, count: 5 })).value
      const current = items.find((i) => i.selected)
      expect(current?.type).toBe('page')
      expect(current?.page).toBe(3)
      expect(current?.ariaCurrent).toBe('page')
    })

    it('inserts start-ellipsis when there is a gap before sibling pages', () => {
      // page=5 / count=10 → 預期：prev, 1, …, 4, 5, 6, …, 10, next
      const items = usePagination(() => ({ page: 5, count: 10 })).value
      const result = items.map((i) => (i.type === 'page' ? i.page : i.type))
      expect(result).toEqual(['previous', 1, 'start-ellipsis', 4, 5, 6, 'end-ellipsis', 10, 'next'])
    })

    it('uses a single page number instead of ellipsis when only one slot is skipped', () => {
      // page=4 / count=10：前段 sibling 起點剛好接 boundary（5→4），不應放 ellipsis 而是放「3」
      const items = usePagination(() => ({ page: 4, count: 10 })).value
      // prev, 1, 2 (or 3 等), 3, 4, 5, …, 10, next 之類；確認前段沒 start-ellipsis 即可
      expect(types(items)).not.toContain('start-ellipsis')
      // 後段仍應有 end-ellipsis（page=4 距 last=10 還有 5 格以上）
      expect(types(items)).toContain('end-ellipsis')
    })

    it('respects siblingCount when expanded', () => {
      // siblingCount=2：當前頁前後各兩個兄弟
      const items = usePagination(() => ({ page: 5, count: 20, siblingCount: 2 })).value
      const pages = items.filter((i) => i.type === 'page').map((i) => i.page)
      expect(pages).toEqual(expect.arrayContaining([3, 4, 5, 6, 7]))
    })

    it('respects boundaryCount when expanded', () => {
      // boundaryCount=2：開頭 / 結尾各兩個頁碼
      const items = usePagination(() => ({ page: 10, count: 20, boundaryCount: 2 })).value
      const pages = items.filter((i) => i.type === 'page').map((i) => i.page)
      // 開頭應有 1, 2；結尾應有 19, 20
      expect(pages).toEqual(expect.arrayContaining([1, 2, 19, 20]))
    })
  })

  // ── 邊界 ────────────────────────────────────────────────────────────────
  describe('edge cases', () => {
    it('returns empty array when count is 0', () => {
      const items = usePagination(() => ({ page: 1, count: 0 })).value
      expect(items).toEqual([])
    })

    it('returns empty array when count is negative', () => {
      const items = usePagination(() => ({ page: 1, count: -3 })).value
      expect(items).toEqual([])
    })

    it('handles count=1 correctly (single page, no ellipsis)', () => {
      const items = usePagination(() => ({ page: 1, count: 1 })).value
      expect(types(items)).toEqual(['previous', 'page', 'next'])
      // prev / next 都應該 disabled
      expect(items[0]?.disabled).toBe(true)
      expect(items[items.length - 1]?.disabled).toBe(true)
    })

    it('never emits ellipsis with count=1', () => {
      // 防迴歸：count=1 時頁碼演算法的所有區段應該收斂
      const items = usePagination(() => ({ page: 1, count: 1, boundaryCount: 3 })).value
      expect(types(items)).not.toContain('start-ellipsis')
      expect(types(items)).not.toContain('end-ellipsis')
    })
  })

  // ── 控制按鈕（first / prev / next / last） ─────────────────────────────
  describe('control buttons', () => {
    it('hides previous button when hidePrevButton is true', () => {
      const items = usePagination(() => ({ page: 1, count: 5, hidePrevButton: true })).value
      expect(types(items)).not.toContain('previous')
    })

    it('hides next button when hideNextButton is true', () => {
      const items = usePagination(() => ({ page: 1, count: 5, hideNextButton: true })).value
      expect(types(items)).not.toContain('next')
    })

    it('shows first/last button when configured', () => {
      const items = usePagination(() => ({
        page: 5,
        count: 10,
        showFirstButton: true,
        showLastButton: true,
      })).value
      expect(types(items)).toContain('first')
      expect(types(items)).toContain('last')
      // first 在最前面，last 在最後面
      expect(items[0]?.type).toBe('first')
      expect(items[items.length - 1]?.type).toBe('last')
    })

    it('disables previous/first when on first page', () => {
      const items = usePagination(() => ({
        page: 1,
        count: 10,
        showFirstButton: true,
      })).value
      const first = items.find((i) => i.type === 'first')
      const prev = items.find((i) => i.type === 'previous')
      expect(first?.disabled).toBe(true)
      expect(prev?.disabled).toBe(true)
    })

    it('disables next/last when on last page', () => {
      const items = usePagination(() => ({
        page: 10,
        count: 10,
        showLastButton: true,
      })).value
      const last = items.find((i) => i.type === 'last')
      const next = items.find((i) => i.type === 'next')
      expect(last?.disabled).toBe(true)
      expect(next?.disabled).toBe(true)
    })

    it('control button page maps to the target page', () => {
      const items = usePagination(() => ({
        page: 5,
        count: 10,
        showFirstButton: true,
        showLastButton: true,
      })).value
      expect(items.find((i) => i.type === 'first')?.page).toBe(1)
      expect(items.find((i) => i.type === 'previous')?.page).toBe(4)
      expect(items.find((i) => i.type === 'next')?.page).toBe(6)
      expect(items.find((i) => i.type === 'last')?.page).toBe(10)
    })
  })

  // ── disabled prop ───────────────────────────────────────────────────────
  describe('disabled', () => {
    it('disables every interactive item when disabled=true', () => {
      const items = usePagination(() => ({ page: 3, count: 10, disabled: true })).value
      const interactive = items.filter(
        (i) => i.type !== 'start-ellipsis' && i.type !== 'end-ellipsis',
      )
      expect(interactive.every((i) => i.disabled)).toBe(true)
    })

    it('does not invoke onChange when disabled', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 3, count: 10, disabled: true, onChange })).value
      items.find((i) => i.type === 'page' && i.page === 5)?.onClick()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  // ── onChange callback ───────────────────────────────────────────────────
  describe('onChange', () => {
    it('invokes onChange with the page number when a page item is clicked', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 3, count: 10, onChange })).value
      items.find((i) => i.type === 'page' && i.page === 5)?.onClick()
      expect(onChange).toHaveBeenCalledWith(5)
    })

    it('invokes onChange with current+1 when next is clicked', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 3, count: 10, onChange })).value
      items.find((i) => i.type === 'next')?.onClick()
      expect(onChange).toHaveBeenCalledWith(4)
    })

    it('invokes onChange with current-1 when previous is clicked', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 3, count: 10, onChange })).value
      items.find((i) => i.type === 'previous')?.onClick()
      expect(onChange).toHaveBeenCalledWith(2)
    })

    it('does not invoke onChange when clicking the current page', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 3, count: 10, onChange })).value
      items.find((i) => i.selected)?.onClick()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not invoke onChange when clicking ellipsis', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 5, count: 20, onChange })).value
      items.find((i) => i.type === 'start-ellipsis')?.onClick()
      items.find((i) => i.type === 'end-ellipsis')?.onClick()
      expect(onChange).not.toHaveBeenCalled()
    })

    it('does not invoke onChange when clicking disabled prev on first page', () => {
      const onChange = vi.fn()
      const items = usePagination(() => ({ page: 1, count: 10, onChange })).value
      items.find((i) => i.type === 'previous')?.onClick()
      expect(onChange).not.toHaveBeenCalled()
    })
  })

  // ── Reactivity ──────────────────────────────────────────────────────────
  describe('reactivity', () => {
    it('recomputes when reactive source changes', () => {
      const page = ref(1)
      const itemsRef = usePagination(() => ({ page: page.value, count: 10 }))

      const firstSelected = itemsRef.value.find((i) => i.selected)
      expect(firstSelected?.page).toBe(1)

      page.value = 5
      const secondSelected = itemsRef.value.find((i) => i.selected)
      expect(secondSelected?.page).toBe(5)
    })
  })

  // ── Shape regression（防演算法被改壞）─────────────────────────────────────
  describe('shape regression', () => {
    it('produces expected shape for page=1 / count=10', () => {
      // page=1, count=10, sibling=1, boundary=1
      //   startPages = [1]
      //   siblingsStart=3, siblingsEnd=5 → 中段 sibling = [3, 4, 5]
      //   前段 gap=1 → 不放 start-ellipsis,改放單一頁碼 [2]
      //   後段 gap=2 → 放 end-ellipsis
      const items = usePagination(() => ({ page: 1, count: 10 })).value
      expect(shape(items)).toEqual([
        { shape: ['previous', 0], disabled: true },
        { shape: ['page', 1], selected: true },
        { shape: ['page', 2] },
        { shape: ['page', 3] },
        { shape: ['page', 4] },
        { shape: ['page', 5] },
        { shape: ['end-ellipsis', null], disabled: true },
        { shape: ['page', 10] },
        { shape: ['next', 2] },
      ])
    })
  })
})
