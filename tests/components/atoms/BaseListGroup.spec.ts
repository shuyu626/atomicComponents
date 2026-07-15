import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseList from '~/components/atoms/BaseList.vue'
import BaseListGroup from '~/components/atoms/BaseListGroup.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'

function mountGroup(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = { default: () => [h(BaseListItem, () => 'A'), h(BaseListItem, () => 'B')] },
) {
  return mount(BaseListGroup, { props, slots })
}

const headerOf = (w: ReturnType<typeof mountGroup>) => w.find('.base-list-group__header')
const itemsOf = (w: ReturnType<typeof mountGroup>) => w.find('.base-list-group__items')
// v-show 收合時會設 inline `display: none`；此環境 isVisible() 對 v-show 偵測不準，改判 style。
const isPanelOpen = (w: ReturnType<typeof mountGroup>) =>
  !(itemsOf(w).attributes('style') ?? '').includes('display: none')

describe('BaseListGroup', () => {
  // ── 結構 / a11y ──────────────────────────────────────────────────────────────
  describe('structure & a11y', () => {
    // 子清單必須是 role="list"：ARIA 規定 listitem 的 owner 必須是 list，
    // role="group" 內放 listitem 是 invalid ARIA（axe: aria-required-parent）。
    it('renders an <li role="listitem"> with a button header and a role="list" panel', () => {
      const w = mountGroup({ title: '後台主檔資料管理' })
      expect(w.find('.base-list-group').element.tagName).toBe('LI')
      expect(w.find('.base-list-group').attributes('role')).toBe('listitem')
      expect(headerOf(w).element.tagName).toBe('BUTTON')
      expect(headerOf(w).text()).toContain('後台主檔資料管理')
      expect(itemsOf(w).element.tagName).toBe('UL')
      expect(itemsOf(w).attributes('role')).toBe('list')
    })

    it('links header to panel via aria-controls / aria-expanded', () => {
      const w = mountGroup({ title: 'G' })
      const controls = headerOf(w).attributes('aria-controls')
      expect(controls).toBeTruthy()
      expect(itemsOf(w).attributes('id')).toBe(controls)
      expect(headerOf(w).attributes('aria-expanded')).toBe('false')
    })
  })

  // ── open / toggle ────────────────────────────────────────────────────────────
  describe('open state', () => {
    it('is collapsed by default (panel hidden)', () => {
      const w = mountGroup()
      expect(isPanelOpen(w)).toBe(false)
    })

    it('toggles open on header click and reflects aria-expanded + v-model', async () => {
      const w = mountGroup({ title: 'G' })
      await headerOf(w).trigger('click')
      expect(isPanelOpen(w)).toBe(true)
      expect(headerOf(w).attributes('aria-expanded')).toBe('true')
      expect(w.emitted('update:open')?.at(-1)).toEqual([true])

      await headerOf(w).trigger('click')
      expect(isPanelOpen(w)).toBe(false)
      expect(w.emitted('update:open')?.at(-1)).toEqual([false])
    })

    it('respects the open v-model prop', () => {
      const w = mountGroup({ open: true })
      expect(isPanelOpen(w)).toBe(true)
      expect(headerOf(w).attributes('aria-expanded')).toBe('true')
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('does not toggle when disabled', async () => {
      const w = mountGroup({ title: 'G', disabled: true })
      expect(headerOf(w).attributes('disabled')).toBeDefined()
      await headerOf(w).trigger('click')
      expect(isPanelOpen(w)).toBe(false)
      expect(w.emitted('update:open')).toBeUndefined()
    })
  })

  // ── slots / children ────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders prepend and #title slots', () => {
      const w = mountGroup({}, {
        prepend: () => h('span', { class: 'g-icon' }, '📁'),
        title: () => 'Slot title',
        default: () => h(BaseListItem, () => 'child'),
      })
      expect(w.find('.base-list-group__prepend .g-icon').exists()).toBe(true)
      expect(w.find('.base-list-group__title').text()).toBe('Slot title')
    })

    it('renders child BaseListItems inside the panel', () => {
      const w = mountGroup({ open: true })
      expect(itemsOf(w).findAll('.base-list-item')).toHaveLength(2)
    })
  })

  // ── context ───────────────────────────────────────────────────────────────────
  describe('size from context', () => {
    it('inherits size from the parent BaseList', () => {
      const w = mount(BaseList, {
        props: { size: 'lg' },
        slots: {
          default: () => h(BaseListGroup, { title: 'G' }, () => h(BaseListItem, () => 'x')),
        },
      })
      expect(w.find('.base-list-group').classes()).toContain('base-list-group--lg')
    })
  })
})
