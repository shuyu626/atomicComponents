import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseList from '~/components/atoms/BaseList.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'

function mountList(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {
    default: () => [h(BaseListItem, () => 'A'), h(BaseListItem, () => 'B')],
  },
) {
  return mount(BaseList, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountList>) => w.find('.base-list')

describe('BaseList', () => {
  // ── 根元素（as）────────────────────────────────────────────────────────────────
  describe('root element', () => {
    it('renders a <ul> by default', () => {
      expect(rootOf(mountList()).element.tagName).toBe('UL')
    })

    it('renders an <ol> via the as prop', () => {
      expect(rootOf(mountList({ as: 'ol' })).element.tagName).toBe('OL')
    })

    it('exposes role="list" so list semantics survive list-style:none in Safari', () => {
      expect(rootOf(mountList()).attributes('role')).toBe('list')
    })
  })

  // ── size ─────────────────────────────────────────────────────────────────────
  describe('size', () => {
    it('defaults to md', () => {
      expect(rootOf(mountList()).classes()).toContain('base-list--md')
    })

    it('reflects sm / lg', () => {
      expect(rootOf(mountList({ size: 'sm' })).classes()).toContain('base-list--sm')
      expect(rootOf(mountList({ size: 'lg' })).classes()).toContain('base-list--lg')
    })
  })

  // ── divided ──────────────────────────────────────────────────────────────────
  describe('divided', () => {
    it('is off by default', () => {
      expect(rootOf(mountList()).classes()).not.toContain('base-list--divided')
    })

    it('adds the modifier when enabled', () => {
      expect(rootOf(mountList({ divided: true })).classes()).toContain('base-list--divided')
    })
  })

  // ── slot / context 傳遞 ──────────────────────────────────────────────────────
  describe('context provide', () => {
    it('renders the default slot items', () => {
      const w = mountList()
      expect(w.findAll('.base-list-item')).toHaveLength(2)
    })

    it('passes size down to child items via context', () => {
      const w = mountList({ size: 'lg' })
      const items = w.findAll('.base-list-item')
      expect(items[0]!.classes()).toContain('base-list-item--lg')
      expect(items[1]!.classes()).toContain('base-list-item--lg')
    })

    it('passes divided down to child items via context', () => {
      const w = mountList({ divided: true })
      const items = w.findAll('.base-list-item')
      expect(items[0]!.classes()).toContain('base-list-item--divided')
      expect(items[1]!.classes()).toContain('base-list-item--divided')
    })

    it('passes itemShape down to child items via context', () => {
      const w = mountList({ itemShape: 'shaped' })
      const items = w.findAll('.base-list-item')
      expect(items[0]!.classes()).toContain('base-list-item--shape-shaped')
    })
  })

  // ── itemShape ────────────────────────────────────────────────────────────────
  describe('itemShape', () => {
    it('defaults to square (no shape class)', () => {
      const classes = rootOf(mountList()).classes()
      expect(classes.some((c) => c.startsWith('base-list--shape-'))).toBe(false)
    })

    it('adds the shape modifier for rounded / shaped', () => {
      expect(rootOf(mountList({ itemShape: 'rounded' })).classes()).toContain('base-list--shape-rounded')
      expect(rootOf(mountList({ itemShape: 'shaped' })).classes()).toContain('base-list--shape-shaped')
    })

    it('suppresses divided when itemShape is not square', () => {
      // 導覽形狀用間距分隔，不畫線：list 不掛 divided、item 也不掛 divided。
      const w = mountList({ divided: true, itemShape: 'rounded' })
      expect(rootOf(w).classes()).not.toContain('base-list--divided')
      expect(w.find('.base-list-item').classes()).not.toContain('base-list-item--divided')
    })
  })
})
