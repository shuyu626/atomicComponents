import { describe, it, expect } from 'vitest'
import { ref, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BasePagination from '~/components/atoms/BasePagination.vue'

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * 預設用 page=1, perPage=10, total=100 (count=10)。
 * `model` 預設給 ref 物件,測 v-model 更新。
 */
function createWrapper(
  props: Partial<{
    perPage: number
    total: number
    siblingCount: number
    boundaryCount: number
    showFirstButton: boolean
    showLastButton: boolean
    hidePrevButton: boolean
    hideNextButton: boolean
    disabled: boolean
    variant: 'outline' | 'text' | 'soft'
    size: 'sm' | 'md' | 'lg'
    color: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral'
    shape: 'square' | 'circle'
    ariaLabel: string
    ariaControls: string
    labels: Record<string, unknown>
  }> = {},
  initialPage = 1,
  slots: Record<string, unknown> = {},
) {
  const model = ref(initialPage)
  const wrapper = mount(BasePagination, {
    props: {
      total: 100,
      perPage: 10,
      modelValue: model.value,
      'onUpdate:modelValue': (v: number) => {
        model.value = v
      },
      ...props,
    } as Record<string, unknown>,
    slots,
  })
  return { wrapper, model }
}

function pageButtons(wrapper: ReturnType<typeof createWrapper>['wrapper']) {
  return wrapper.findAll('.base-pagination__button--page')
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BasePagination', () => {
  // ── Structure & semantics ────────────────────────────────────────────────
  describe('structure & semantics', () => {
    it('renders as <nav> with default aria-label="Pagination"', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.element.tagName).toBe('NAV')
      expect(wrapper.attributes('aria-label')).toBe('Pagination')
    })

    it('renders items inside an unordered list <ul>', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.find('ul').exists()).toBe(true)
      expect(wrapper.findAll('li').length).toBeGreaterThan(0)
    })

    it('respects custom ariaLabel prop', () => {
      const { wrapper } = createWrapper({ ariaLabel: '分頁' })
      expect(wrapper.attributes('aria-label')).toBe('分頁')
    })

    it('passes ariaControls through to the <nav>', () => {
      const { wrapper } = createWrapper({ ariaControls: 'result-list' })
      expect(wrapper.attributes('aria-controls')).toBe('result-list')
    })

    it('does not render <nav> when total=0', () => {
      const { wrapper } = createWrapper({ total: 0 })
      // pageCount 為 0 時 root v-if 不渲染
      expect(wrapper.find('nav').exists()).toBe(false)
      expect(wrapper.html()).toBe('<!--v-if-->')
    })

    it('does not render <nav> when perPage<=0', () => {
      const { wrapper } = createWrapper({ perPage: 0, total: 50 })
      expect(wrapper.find('nav').exists()).toBe(false)
    })

    it('calculates pageCount via Math.ceil(total / perPage)', () => {
      // 95/10 → 10 頁
      const { wrapper } = createWrapper({ total: 95, perPage: 10 })
      const last = pageButtons(wrapper).at(-1)
      expect(last?.text()).toBe('10')
    })
  })

  // ── aria-current ─────────────────────────────────────────────────────────
  describe('aria-current', () => {
    it('sets aria-current="page" on the selected page button', () => {
      const { wrapper } = createWrapper({}, 3)
      const selected = wrapper.find('.base-pagination__button--page[aria-current="page"]')
      expect(selected.exists()).toBe(true)
      expect(selected.text()).toBe('3')
    })

    it('does not set aria-current on non-selected page buttons', () => {
      const { wrapper } = createWrapper({}, 3)
      const others = pageButtons(wrapper).filter((b) => b.text() !== '3')
      others.forEach((b) => {
        expect(b.attributes('aria-current')).toBeUndefined()
      })
    })
  })

  // ── Page click → v-model ─────────────────────────────────────────────────
  describe('v-model', () => {
    it('updates modelValue when a page is clicked', async () => {
      const { wrapper, model } = createWrapper({}, 1)
      await pageButtons(wrapper).find((b) => b.text() === '3')!.trigger('click')
      expect(model.value).toBe(3)
    })

    it('updates modelValue when next button is clicked', async () => {
      const { wrapper, model } = createWrapper({}, 3)
      await wrapper.find('.base-pagination__button--next').trigger('click')
      expect(model.value).toBe(4)
    })

    it('updates modelValue when previous button is clicked', async () => {
      const { wrapper, model } = createWrapper({}, 5)
      await wrapper.find('.base-pagination__button--previous').trigger('click')
      expect(model.value).toBe(4)
    })

    it('does not update modelValue when clicking the current page', async () => {
      const { wrapper, model } = createWrapper({}, 3)
      const current = pageButtons(wrapper).find((b) => b.text() === '3')!
      await current.trigger('click')
      expect(model.value).toBe(3)
    })

    it('does not update modelValue when previous is clicked on first page', async () => {
      const { wrapper, model } = createWrapper({}, 1)
      await wrapper.find('.base-pagination__button--previous').trigger('click')
      expect(model.value).toBe(1)
    })

    it('re-renders selected state when modelValue changes externally', async () => {
      const { wrapper, model } = createWrapper({}, 1)
      expect(wrapper.find('[aria-current="page"]').text()).toBe('1')

      model.value = 4
      await wrapper.setProps({ modelValue: 4 })
      await nextTick()

      expect(wrapper.find('[aria-current="page"]').text()).toBe('4')
    })
  })

  // ── Control buttons visibility ───────────────────────────────────────────
  describe('control buttons', () => {
    it('shows first/last buttons when configured', () => {
      const { wrapper } = createWrapper({
        showFirstButton: true,
        showLastButton: true,
      })
      expect(wrapper.find('.base-pagination__button--first').exists()).toBe(true)
      expect(wrapper.find('.base-pagination__button--last').exists()).toBe(true)
    })

    it('hides first/last buttons by default', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.find('.base-pagination__button--first').exists()).toBe(false)
      expect(wrapper.find('.base-pagination__button--last').exists()).toBe(false)
    })

    it('hides previous button when hidePrevButton', () => {
      const { wrapper } = createWrapper({ hidePrevButton: true })
      expect(wrapper.find('.base-pagination__button--previous').exists()).toBe(false)
    })

    it('hides next button when hideNextButton', () => {
      const { wrapper } = createWrapper({ hideNextButton: true })
      expect(wrapper.find('.base-pagination__button--next').exists()).toBe(false)
    })
  })

  // ── Ellipsis ─────────────────────────────────────────────────────────────
  describe('ellipsis', () => {
    it('renders ellipsis with aria-hidden when there is a gap', () => {
      // 大頁面 + 中間頁 → 兩側都有 ellipsis
      const { wrapper } = createWrapper({ total: 200 }, 10) // count=20, page=10
      const ellipses = wrapper.findAll('.base-pagination__ellipsis')
      expect(ellipses.length).toBeGreaterThanOrEqual(1)
      ellipses.forEach((e) => {
        expect(e.attributes('aria-hidden')).toBe('true')
      })
    })

    it('uses default `…` character', () => {
      const { wrapper } = createWrapper({ total: 200 }, 10)
      const first = wrapper.find('.base-pagination__ellipsis')
      expect(first.text()).toBe('…')
    })

    it('renders no ellipsis when all pages fit', () => {
      const { wrapper } = createWrapper({ total: 30 }) // count=3
      expect(wrapper.findAll('.base-pagination__ellipsis')).toHaveLength(0)
    })
  })

  // ── Disabled ─────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('disables every interactive button when disabled=true', () => {
      const { wrapper } = createWrapper({ disabled: true })
      const buttons = wrapper.findAll('button')
      expect(buttons.length).toBeGreaterThan(0)
      buttons.forEach((b) => {
        expect(b.attributes('disabled')).toBeDefined()
      })
    })

    it('does not update modelValue when disabled and clicked', async () => {
      const { wrapper, model } = createWrapper({ disabled: true }, 1)
      const target = pageButtons(wrapper).find((b) => b.text() === '3')
      await target?.trigger('click')
      expect(model.value).toBe(1)
    })
  })

  // ── A11y labels ──────────────────────────────────────────────────────────
  describe('aria-label on buttons', () => {
    it('uses default English labels for control buttons', () => {
      const { wrapper } = createWrapper({
        showFirstButton: true,
        showLastButton: true,
      }, 5)
      expect(
        wrapper.find('.base-pagination__button--first').attributes('aria-label'),
      ).toBe('Go to first page')
      expect(
        wrapper.find('.base-pagination__button--previous').attributes('aria-label'),
      ).toBe('Go to previous page')
      expect(
        wrapper.find('.base-pagination__button--next').attributes('aria-label'),
      ).toBe('Go to next page')
      expect(
        wrapper.find('.base-pagination__button--last').attributes('aria-label'),
      ).toBe('Go to last page')
    })

    it('labels page buttons as "Go to page {n}" by default (non-current)', () => {
      const { wrapper } = createWrapper({}, 3)
      const page5 = pageButtons(wrapper).find((b) => b.text() === '5')
      expect(page5?.attributes('aria-label')).toBe('Go to page 5')
    })

    it('labels the current page as "Page {n}" by default', () => {
      const { wrapper } = createWrapper({}, 3)
      const current = pageButtons(wrapper).find((b) => b.text() === '3')
      expect(current?.attributes('aria-label')).toBe('Page 3')
    })

    it('allows overriding labels (i18n use case)', () => {
      const { wrapper } = createWrapper({
        showFirstButton: true,
        labels: {
          first: '跳至第一頁',
          previous: '上一頁',
          next: '下一頁',
          page: (n: number) => `前往第 ${n} 頁`,
          current: (n: number) => `目前在第 ${n} 頁`,
        },
      }, 3)
      expect(
        wrapper.find('.base-pagination__button--first').attributes('aria-label'),
      ).toBe('跳至第一頁')
      expect(
        wrapper.find('.base-pagination__button--previous').attributes('aria-label'),
      ).toBe('上一頁')
      const current = pageButtons(wrapper).find((b) => b.text() === '3')
      expect(current?.attributes('aria-label')).toBe('目前在第 3 頁')
      const page5 = pageButtons(wrapper).find((b) => b.text() === '5')
      expect(page5?.attributes('aria-label')).toBe('前往第 5 頁')
    })
  })

  // ── Variant ──────────────────────────────────────────────────────────────
  describe('variant', () => {
    it('defaults to outline variant', () => {
      const { wrapper } = createWrapper()
      expect(wrapper.classes()).toContain('base-pagination--outline')
    })

    it('applies the modifier class to the root <nav>', () => {
      const { wrapper: textW } = createWrapper({ variant: 'text' })
      const { wrapper: softW } = createWrapper({ variant: 'soft' })
      expect(textW.classes()).toContain('base-pagination--text')
      expect(softW.classes()).toContain('base-pagination--soft')
    })

    it('applies size modifier class to the root <nav>', () => {
      // Size class 用於 size-aware token 推導(例:ellipsis chip 高度跟按鈕同步)
      const { wrapper: smW } = createWrapper({ size: 'sm' })
      const { wrapper: mdW } = createWrapper({ size: 'md' })
      const { wrapper: lgW } = createWrapper({ size: 'lg' })
      expect(smW.classes()).toContain('base-pagination--sm')
      expect(mdW.classes()).toContain('base-pagination--md')
      expect(lgW.classes()).toContain('base-pagination--lg')
    })

    it('outline: non-selected uses BaseButton outline + caller color', () => {
      const { wrapper } = createWrapper({ variant: 'outline', color: 'primary' }, 3)
      const nonSelected = pageButtons(wrapper).find((b) => b.text() === '2')!
      expect(nonSelected.classes()).toContain('base-button--outline')
      expect(nonSelected.classes()).toContain('base-button--primary')
    })

    it('text: non-selected uses BaseButton text + neutral color', () => {
      const { wrapper } = createWrapper({ variant: 'text', color: 'primary' }, 3)
      const nonSelected = pageButtons(wrapper).find((b) => b.text() === '2')!
      expect(nonSelected.classes()).toContain('base-button--text')
      expect(nonSelected.classes()).toContain('base-button--neutral')
    })

    it('text: selected uses BaseButton text + caller color', () => {
      const { wrapper } = createWrapper({ variant: 'text', color: 'danger' }, 3)
      const selected = pageButtons(wrapper).find((b) => b.text() === '3')!
      expect(selected.classes()).toContain('base-button--text')
      expect(selected.classes()).toContain('base-button--danger')
    })

    it('soft: non-selected uses solid + neutral (token overridden via SCSS to light gray)', () => {
      const { wrapper } = createWrapper({ variant: 'soft', color: 'primary' }, 3)
      const nonSelected = pageButtons(wrapper).find((b) => b.text() === '2')!
      // 非選中走 solid + neutral,真正的淺灰來自 .base-pagination--soft 的 token 覆寫
      expect(nonSelected.classes()).toContain('base-button--solid')
      expect(nonSelected.classes()).toContain('base-button--neutral')
    })

    it('soft: selected uses solid + caller color', () => {
      const { wrapper } = createWrapper({ variant: 'soft', color: 'primary' }, 3)
      const selected = pageButtons(wrapper).find((b) => b.text() === '3')!
      expect(selected.classes()).toContain('base-button--solid')
      expect(selected.classes()).toContain('base-button--primary')
    })

    it('adds base-pagination__button--selected modifier to the active button', () => {
      const { wrapper } = createWrapper({}, 3)
      const selected = pageButtons(wrapper).find((b) => b.text() === '3')!
      const others = pageButtons(wrapper).filter((b) => b.text() !== '3')
      expect(selected.classes()).toContain('base-pagination__button--selected')
      others.forEach((b) => {
        expect(b.classes()).not.toContain('base-pagination__button--selected')
      })
    })
  })

  // ── Slots ────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders custom page slot content', () => {
      const { wrapper } = createWrapper({}, 1, {
        page: '<span class="custom-page">P:{{ params.page }}</span>',
      })
      // 上面 slot 的解析依 vue-test-utils 對 slots 的處理
      // 改用 functional slot 確保可用
      const w2 = mount(BasePagination, {
        props: { total: 30, perPage: 10, modelValue: 1 },
        slots: {
          page: ({ page, selected }: { page: number; selected: boolean }) =>
            h('span', { class: 'custom-page' }, `${selected ? '*' : ''}P${page}`),
        },
      })
      const customs = w2.findAll('.custom-page')
      expect(customs.length).toBe(3)
      expect(customs[0]!.text()).toBe('*P1')
      expect(customs[1]!.text()).toBe('P2')
    })

    it('renders custom ellipsis slot content', () => {
      const w = mount(BasePagination, {
        props: { total: 200, perPage: 10, modelValue: 10 },
        slots: {
          ellipsis: () => h('span', { class: 'custom-ellipsis' }, '...'),
        },
      })
      const customs = w.findAll('.custom-ellipsis')
      expect(customs.length).toBeGreaterThan(0)
      expect(customs[0]!.text()).toBe('...')
    })

    it('renders custom prev/next icon via slot', () => {
      const w = mount(BasePagination, {
        props: { total: 50, perPage: 10, modelValue: 3 },
        slots: {
          'prev-icon': () => h('span', { class: 'custom-prev' }, '<'),
          'next-icon': () => h('span', { class: 'custom-next' }, '>'),
        },
      })
      expect(w.find('.base-pagination__button--previous .custom-prev').exists()).toBe(true)
      expect(w.find('.base-pagination__button--next .custom-next').exists()).toBe(true)
    })

    it('renders custom first/last icon via slot', () => {
      const w = mount(BasePagination, {
        props: {
          total: 50,
          perPage: 10,
          modelValue: 3,
          showFirstButton: true,
          showLastButton: true,
        },
        slots: {
          'first-icon': () => h('span', { class: 'custom-first' }, '<<'),
          'last-icon': () => h('span', { class: 'custom-last' }, '>>'),
        },
      })
      expect(w.find('.base-pagination__button--first .custom-first').exists()).toBe(true)
      expect(w.find('.base-pagination__button--last .custom-last').exists()).toBe(true)
    })
  })

  // ── Auto-converge when pageCount shrinks ───────────────────────────────────
  describe('auto-converge on pageCount shrink', () => {
    it('收斂 page 到 pageCount,當 total 縮小使當前頁超出範圍', async () => {
      const { wrapper, model } = createWrapper({ total: 100 }, 8) // count=10, page=8
      await wrapper.setProps({ total: 30 }) // count=3 → page 8 超出
      await nextTick()
      expect(model.value).toBe(3)
    })

    it('當前頁仍在範圍內時不更動 page', async () => {
      const { wrapper, model } = createWrapper({ total: 100 }, 2)
      await wrapper.setProps({ total: 30 }) // count=3 → page 2 仍合法
      await nextTick()
      expect(model.value).toBe(2)
    })

    it('初始 page 超出初始 pageCount 時立即收斂(immediate)', async () => {
      const { model } = createWrapper({ total: 30 }, 10) // count=3, page=10 超出
      await nextTick()
      expect(model.value).toBe(3)
    })

    it('total 變 0(pageCount < 1)時不把 page 收斂成 0', async () => {
      const { wrapper, model } = createWrapper({ total: 100 }, 5)
      await wrapper.setProps({ total: 0 }) // pageCount=0,不渲染也不改 page
      await nextTick()
      expect(model.value).toBe(5)
    })
  })
})
