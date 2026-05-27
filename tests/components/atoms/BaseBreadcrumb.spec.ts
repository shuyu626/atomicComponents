import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import BaseBreadcrumb from '~/components/atoms/BaseBreadcrumb.vue'
import type { BreadcrumbItem } from '~/components/atoms/BaseBreadcrumb.vue'

// ── Link stub: rendered as plain <a> ───────────────────────────────────────
//
// BaseBreadcrumb 內部委派 BaseLink；BaseLink 依 fallback chain 解析為
// NuxtLink / RouterLink / `<a>`。單元測試環境無 router，雙重 stub 攔截兩條
// 內部分支都退回 `<a>`，避免依賴下游元件實作細節。
const LinkStub = {
  name: 'LinkStub',
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : undefined"><slot /></a>',
}

function createWrapper(
  props: { items: BreadcrumbItem[]; separator?: unknown; ariaLabel?: string },
  slots: Record<string, string> = {},
) {
  return mount(BaseBreadcrumb, {
    props,
    slots,
    global: {
      components: { NuxtLink: LinkStub },
      stubs: { NuxtLink: LinkStub, RouterLink: LinkStub },
    },
  })
}

// ── Test fixtures ──────────────────────────────────────────────────────────

const ItemsThreeLevels: BreadcrumbItem[] = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { label: 'Detail' },
]

const ChevronIcon = {
  name: 'ChevronIcon',
  template: '<svg class="chevron-icon" aria-hidden="true"></svg>',
}

const StarIcon = {
  name: 'StarIcon',
  render: () => h('span', { class: 'star-icon' }, '★'),
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BaseBreadcrumb', () => {
  // ── Structure & semantics ─────────────────────────────────────────────────
  describe('structure & semantics', () => {
    it('renders as <nav> with default aria-label="Breadcrumb"', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      expect(wrapper.element.tagName).toBe('NAV')
      expect(wrapper.attributes('aria-label')).toBe('Breadcrumb')
    })

    it('respects custom ariaLabel prop', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels, ariaLabel: '麵包屑' })
      expect(wrapper.attributes('aria-label')).toBe('麵包屑')
    })

    it('renders items inside an ordered list <ol>', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const list = wrapper.find('ol')
      expect(list.exists()).toBe(true)
      expect(list.findAll('li')).toHaveLength(3)
    })
  })

  // ── Item rendering ───────────────────────────────────────────────────────
  describe('item rendering', () => {
    it('renders BaseLink for items with `to`', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      // 前兩項是 link，第三項是 span（無 to）
      const links = wrapper.findAllComponents(LinkStub)
      expect(links).toHaveLength(2)
      expect(links[0].props('to')).toBe('/')
      expect(links[1].props('to')).toBe('/products')
    })

    it('renders <span> (not link) for items without `to`', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const current = wrapper.find('.base-breadcrumb__current')
      expect(current.exists()).toBe(true)
      expect(current.text()).toBe('Detail')
    })

    it('renders each item label as text by default', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const labels = wrapper.findAll('.base-breadcrumb__label')
      expect(labels.map((n) => n.text())).toEqual(['Home', 'Products', 'Detail'])
    })

    it('renders single-item breadcrumb (only current page)', () => {
      const wrapper = createWrapper({ items: [{ label: 'Home' }] })
      expect(wrapper.findAll('li')).toHaveLength(1)
      expect(wrapper.findAllComponents(LinkStub)).toHaveLength(0)
      expect(wrapper.find('.base-breadcrumb__current').text()).toBe('Home')
    })
  })

  // ── aria-current (a11y) ──────────────────────────────────────────────────
  describe('aria-current', () => {
    it('sets aria-current="page" on the last item (span, no `to`)', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const current = wrapper.find('.base-breadcrumb__current')
      expect(current.attributes('aria-current')).toBe('page')
    })

    it('does NOT set aria-current on non-last items', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const links = wrapper.findAllComponents(LinkStub)
      // BaseLink 透傳 aria-current 到 <a>；無就沒有屬性
      expect(links[0].attributes('aria-current')).toBeUndefined()
      expect(links[1].attributes('aria-current')).toBeUndefined()
    })

    it('sets aria-current="page" on the last item even when it is a link', () => {
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home' },
        { to: '/current', label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      const links = wrapper.findAllComponents(LinkStub)
      // 第二項（最後一項）的 BaseLink 應該收到 aria-current="page"
      expect(links[1].attributes('aria-current')).toBe('page')
    })
  })

  // ── Separator ────────────────────────────────────────────────────────────
  describe('separator', () => {
    it('renders default "/" separator between items', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const seps = wrapper.findAll('.base-breadcrumb__separator')
      // 3 個項目 → 2 個分隔符
      expect(seps).toHaveLength(2)
      expect(seps[0].text()).toBe('/')
    })

    it('renders custom string separator', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels, separator: '>' })
      expect(wrapper.find('.base-breadcrumb__separator').text()).toBe('>')
    })

    it('renders component separator', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels, separator: ChevronIcon })
      // 2 個分隔符 → 2 個 chevron icon
      expect(wrapper.findAll('.chevron-icon')).toHaveLength(2)
    })

    it('does NOT render separator after the last item', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      const items = wrapper.findAll('li')
      // 最後一個 li 內不該有 separator
      expect(items[items.length - 1].find('.base-breadcrumb__separator').exists()).toBe(false)
    })

    it('marks separator as aria-hidden', () => {
      const wrapper = createWrapper({ items: ItemsThreeLevels })
      expect(wrapper.find('.base-breadcrumb__separator').attributes('aria-hidden')).toBe('true')
    })

    it('does not render any separator for single-item breadcrumb', () => {
      const wrapper = createWrapper({ items: [{ label: 'Home' }] })
      expect(wrapper.findAll('.base-breadcrumb__separator')).toHaveLength(0)
    })
  })

  // ── Icon support ─────────────────────────────────────────────────────────
  describe('icon', () => {
    it('renders item icon when provided', () => {
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home', icon: StarIcon },
        { label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      expect(wrapper.find('.star-icon').exists()).toBe(true)
    })

    it('does NOT apply sr-only when icon is set but iconOnly is false', () => {
      // 負向案例：避免未來把 `item.icon && item.iconOnly` 改寫成 `||` 而沒被測試攔下
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home', icon: StarIcon }, // iconOnly 預設 false
        { label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      const homeLabel = wrapper.findAllComponents(LinkStub)[0].find('.base-breadcrumb__label')
      expect(homeLabel.classes()).not.toContain('base-breadcrumb__label--sr-only')
      expect(homeLabel.text()).toBe('Home')
    })

    it('applies sr-only class to label when icon + iconOnly', () => {
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home', icon: StarIcon, iconOnly: true },
        { label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      const homeLabel = wrapper.findAllComponents(LinkStub)[0].find('.base-breadcrumb__label')
      expect(homeLabel.classes()).toContain('base-breadcrumb__label--sr-only')
      // 文字仍存在（給 SR 讀），只是視覺上隱藏
      expect(homeLabel.text()).toBe('Home')
    })

    it('does NOT apply sr-only when iconOnly is set but icon is missing', () => {
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home', iconOnly: true },
        { label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      const homeLabel = wrapper.findAllComponents(LinkStub)[0].find('.base-breadcrumb__label')
      expect(homeLabel.classes()).not.toContain('base-breadcrumb__label--sr-only')
    })

    it('marks icon wrapper as aria-hidden (icon is decorative)', () => {
      const items: BreadcrumbItem[] = [
        { to: '/', label: 'Home', icon: StarIcon },
        { label: 'Current' },
      ]
      const wrapper = createWrapper({ items })
      expect(wrapper.find('.base-breadcrumb__icon').attributes('aria-hidden')).toBe('true')
    })
  })

  // ── Slot overrides ───────────────────────────────────────────────────────
  describe('slot overrides', () => {
    it('renders custom item slot content', () => {
      const wrapper = createWrapper(
        { items: ItemsThreeLevels },
        { item: '<span class="custom-item">CUSTOM</span>' },
      )
      // 3 項目都會用 item slot
      expect(wrapper.findAll('.custom-item')).toHaveLength(3)
      // 預設 label 不該再被渲染
      expect(wrapper.find('.base-breadcrumb__label').exists()).toBe(false)
    })

    it('renders custom separator slot content', () => {
      const wrapper = createWrapper(
        { items: ItemsThreeLevels },
        { separator: '<span class="custom-sep">|</span>' },
      )
      expect(wrapper.findAll('.custom-sep')).toHaveLength(2)
    })
  })
})
