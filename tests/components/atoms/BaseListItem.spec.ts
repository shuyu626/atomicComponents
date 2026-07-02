import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseList from '~/components/atoms/BaseList.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'

// ── Link stub: rendered as plain <a> ───────────────────────────────────────
//
// BaseListItem 內部委派 BaseLink；BaseLink 依 fallback chain 解析為
// NuxtLink / RouterLink / `<a>`。單元測試環境無 router，雙重 stub 攔截兩條
// 內部分支都退回 `<a>`，避免依賴下游元件實作細節。
const LinkStub = {
  name: 'LinkStub',
  props: ['to'],
  template: '<a :href="typeof to === \'string\' ? to : undefined"><slot /></a>',
}

function mountItem(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = { default: () => 'Item' },
) {
  return mount(BaseListItem, {
    props,
    slots,
    global: {
      components: { NuxtLink: LinkStub },
      stubs: { NuxtLink: LinkStub, RouterLink: LinkStub },
    },
  })
}

const rootOf = (w: ReturnType<typeof mountItem>) => w.find('.base-list-item')

describe('BaseListItem', () => {
  // ── 根元素 ─────────────────────────────────────────────────────────────────────
  it('renders an <li> root with role="listitem"', () => {
    const root = rootOf(mountItem())
    expect(root.element.tagName).toBe('LI')
    expect(root.attributes('role')).toBe('listitem')
  })

  // ── standalone 降級 ─────────────────────────────────────────────────────────────
  describe('standalone (no context)', () => {
    it('falls back to size md and no divider when used without BaseList', () => {
      const w = mountItem()
      expect(rootOf(w).classes()).toContain('base-list-item--md')
      expect(rootOf(w).classes()).not.toContain('base-list-item--divided')
    })
  })

  // ── size 來自 context ───────────────────────────────────────────────────────────
  describe('size from context', () => {
    it('inherits size from the parent BaseList', () => {
      const w = mount(BaseList, {
        props: { size: 'sm' },
        slots: { default: () => h(BaseListItem, () => 'X') },
      })
      expect(w.find('.base-list-item').classes()).toContain('base-list-item--sm')
    })
  })

  // ── slots ─────────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders the default slot inside __body', () => {
      const w = mountItem({}, { default: () => 'Body text' })
      expect(w.find('.base-list-item__body').text()).toBe('Body text')
    })

    it('renders prepend / append only when their slots are provided', () => {
      const bare = mountItem()
      expect(bare.find('.base-list-item__prepend').exists()).toBe(false)
      expect(bare.find('.base-list-item__append').exists()).toBe(false)

      const full = mountItem({}, {
        prepend: () => 'P',
        default: () => 'B',
        append: () => 'A',
      })
      expect(full.find('.base-list-item__prepend').text()).toBe('P')
      expect(full.find('.base-list-item__body').text()).toBe('B')
      expect(full.find('.base-list-item__append').text()).toBe('A')
    })

    it('stays single-line (no title/subtitle wrappers) without a subtitle slot', () => {
      const w = mountItem({}, { default: () => 'Solo' })
      expect(w.find('.base-list-item__subtitle').exists()).toBe(false)
      expect(w.find('.base-list-item__title').exists()).toBe(false)
      expect(w.find('.base-list-item__body').text()).toBe('Solo')
    })

    it('renders title + subtitle as two lines when #subtitle is given', () => {
      const w = mountItem({}, { default: () => 'Title', subtitle: () => 'Secondary' })
      expect(w.find('.base-list-item__title').text()).toBe('Title')
      expect(w.find('.base-list-item__subtitle').text()).toBe('Secondary')
    })
  })

  // ── interactive: to / href → BaseLink ──────────────────────────────────────────
  describe('interactive (to / href)', () => {
    it('renders a <div> content when not interactive', () => {
      const w = mountItem()
      expect(w.find('div.base-list-item__content').exists()).toBe(true)
      expect(w.find('a').exists()).toBe(false)
      expect(rootOf(w).classes()).not.toContain('base-list-item--interactive')
    })

    it('renders BaseLink and marks interactive when `to` is set', () => {
      const w = mountItem({ to: '/settings' })
      const link = w.findComponent(LinkStub)
      expect(link.exists()).toBe(true)
      expect(link.props('to')).toBe('/settings')
      expect(link.classes()).toContain('base-list-item__content')
      expect(rootOf(w).classes()).toContain('base-list-item--interactive')
    })

    it('renders a link for external `href`', () => {
      const w = mountItem({ href: 'https://example.com' })
      // external → BaseLink 直接渲染原生 <a>
      const anchor = w.find('a.base-list-item__content')
      expect(anchor.exists()).toBe(true)
      expect(anchor.attributes('href')).toBe('https://example.com')
      expect(rootOf(w).classes()).toContain('base-list-item--interactive')
    })
  })

  // ── active ────────────────────────────────────────────────────────────────────
  describe('active', () => {
    it('adds the active modifier', () => {
      expect(rootOf(mountItem({ active: true })).classes()).toContain('base-list-item--active')
    })

    it('sets aria-current="true" on the link when active + interactive', () => {
      const w = mountItem({ to: '/x', active: true })
      expect(w.find('a').attributes('aria-current')).toBe('true')
    })

    it('does not set aria-current on a non-interactive active item', () => {
      const w = mountItem({ active: true })
      expect(w.find('.base-list-item__content').attributes('aria-current')).toBeUndefined()
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('adds the disabled modifier', () => {
      expect(rootOf(mountItem({ disabled: true })).classes()).toContain('base-list-item--disabled')
    })

    it('sets aria-disabled and tabindex=-1 on the link when disabled + interactive', () => {
      const w = mountItem({ to: '/x', disabled: true })
      const anchor = w.find('a')
      expect(anchor.attributes('aria-disabled')).toBe('true')
      expect(anchor.attributes('tabindex')).toBe('-1')
    })
  })
})
