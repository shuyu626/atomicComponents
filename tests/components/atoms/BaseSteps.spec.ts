import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseSteps from '~/components/atoms/BaseSteps.vue'

import type { BaseStepItem } from '~/components/atoms/BaseSteps.vue'

const THREE_STEPS: BaseStepItem[] = [
  { title: '填寫資料' },
  { title: '確認內容' },
  { title: '完成' },
]

function mountSteps(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseSteps, {
    props: { items: THREE_STEPS, ...props },
    slots,
  })
}

const rootOf = (w: ReturnType<typeof mountSteps>) => w.find('.base-steps')
const itemsOf = (w: ReturnType<typeof mountSteps>) => w.findAll('.base-steps__item')

describe('BaseSteps', () => {
  // ── 結構 ─────────────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders an <ol> root with items.length <li> children', () => {
      const w = mountSteps()
      expect(rootOf(w).element.tagName).toBe('OL')
      const items = itemsOf(w)
      expect(items).toHaveLength(3)
      items.forEach((item) => expect(item.element.tagName).toBe('LI'))
    })
  })

  // ── 狀態推導 ──────────────────────────────────────────────────────────────────
  describe('status derivation', () => {
    it('derives finish / process / wait from current position', () => {
      const w = mountSteps({ current: 1 })
      const items = itemsOf(w)
      expect(items[0]!.classes()).toContain('base-steps__item--finish')
      expect(items[1]!.classes()).toContain('base-steps__item--process')
      expect(items[2]!.classes()).toContain('base-steps__item--wait')
    })

    it('item.status overrides the derived status (error at a finish position)', () => {
      const w = mountSteps({
        current: 2,
        items: [
          { title: '填寫資料', status: 'error' },
          { title: '確認內容' },
          { title: '完成' },
        ],
      })
      const items = itemsOf(w)
      expect(items[0]!.classes()).toContain('base-steps__item--error')
      expect(items[0]!.classes()).not.toContain('base-steps__item--finish')
    })
  })

  // ── 節點圖示 ──────────────────────────────────────────────────────────────────
  describe('node icon', () => {
    it('finish renders a ✓ svg, error renders a ✕ svg, wait/process render the step number', () => {
      const w = mountSteps({
        current: 1,
        items: [
          { title: 'A' },
          { title: 'B' },
          { title: 'C', status: 'error' },
        ],
      })
      const items = itemsOf(w)

      // index 0 → finish
      expect(items[0]!.find('.base-steps__node svg').exists()).toBe(true)
      expect(items[0]!.find('.base-steps__node').text()).toBe('')

      // index 1 → process（顯示編號）
      expect(items[1]!.find('.base-steps__node svg').exists()).toBe(false)
      expect(items[1]!.find('.base-steps__node').text()).toBe('2')

      // index 2 → error（status 覆寫）
      expect(items[2]!.find('.base-steps__node svg').exists()).toBe(true)
      expect(items[2]!.find('.base-steps__node').text()).toBe('')
    })

    it('wait step renders its 1-based step number', () => {
      const w = mountSteps({ current: 0 })
      const items = itemsOf(w)
      expect(items[2]!.find('.base-steps__node').text()).toBe('3')
    })
  })

  // ── aria-current ─────────────────────────────────────────────────────────────
  describe('aria-current', () => {
    it('sets aria-current="step" only on the current step', () => {
      const w = mountSteps({ current: 1 })
      const items = itemsOf(w)
      expect(items[0]!.attributes('aria-current')).toBeUndefined()
      expect(items[1]!.attributes('aria-current')).toBe('step')
      expect(items[2]!.attributes('aria-current')).toBeUndefined()
    })
  })

  // ── sr-only 文字 ──────────────────────────────────────────────────────────────
  describe('sr-only text', () => {
    it('includes "第 n 步，共 N 步" for every step, plus status suffix for finish/error', () => {
      const w = mountSteps({
        current: 1,
        items: [
          { title: 'A' },
          { title: 'B' },
          { title: 'C', status: 'error' },
        ],
      })
      const items = itemsOf(w)

      expect(items[0]!.find('.base-steps__sr-only').text()).toBe('第 1 步，共 3 步（已完成）')
      expect(items[1]!.find('.base-steps__sr-only').text()).toBe('第 2 步，共 3 步（進行中）')
      expect(items[2]!.find('.base-steps__sr-only').text()).toBe('第 3 步，共 3 步（發生錯誤）')
    })
  })

  // ── 連接線 ────────────────────────────────────────────────────────────────────
  describe('connector lines', () => {
    it('renders items.length - 1 aria-hidden connector lines', () => {
      const w = mountSteps()
      const lines = w.findAll('.base-steps__line')
      expect(lines).toHaveLength(2)
      lines.forEach((line) => expect(line.attributes('aria-hidden')).toBe('true'))
    })
  })

  // ── direction ────────────────────────────────────────────────────────────────
  describe('direction', () => {
    it('defaults to base-steps--horizontal', () => {
      expect(rootOf(mountSteps()).classes()).toContain('base-steps--horizontal')
    })

    it('applies base-steps--vertical when direction="vertical"', () => {
      expect(rootOf(mountSteps({ direction: 'vertical' })).classes()).toContain(
        'base-steps--vertical',
      )
    })
  })

  // ── clickable ────────────────────────────────────────────────────────────────
  describe('clickable', () => {
    it('renders a <div> header (no button) when not clickable', () => {
      const w = mountSteps()
      const header = itemsOf(w)[0]!.find('.base-steps__header')
      expect(header.element.tagName).toBe('DIV')
      expect(w.find('button.base-steps__header').exists()).toBe(false)
    })

    it('renders a <button type="button"> header when clickable, and clicking a step emits update:current + change', async () => {
      const w = mountSteps({ clickable: true })
      const header = itemsOf(w)[2]!.find('.base-steps__header')
      expect(header.element.tagName).toBe('BUTTON')
      expect(header.attributes('type')).toBe('button')

      await header.trigger('click')
      expect(w.emitted('update:current')?.at(-1)).toEqual([2])
      expect(w.emitted('change')?.at(-1)).toEqual([2])
    })

    it('disables the button for item.disabled and does not emit on click', async () => {
      const w = mountSteps({
        clickable: true,
        items: [
          { title: 'A' },
          { title: 'B', disabled: true },
          { title: 'C' },
        ],
      })
      const header = itemsOf(w)[1]!.find('.base-steps__header')
      expect(header.attributes('disabled')).toBeDefined()

      await header.trigger('click')
      expect(w.emitted('update:current')).toBeUndefined()
      expect(w.emitted('change')).toBeUndefined()
    })

    it('does not emit change when clicking the current step itself', async () => {
      const w = mountSteps({ clickable: true, current: 0 })
      const header = itemsOf(w)[0]!.find('.base-steps__header')

      await header.trigger('click')
      expect(w.emitted('update:current')).toBeUndefined()
      expect(w.emitted('change')).toBeUndefined()
    })
  })

  // ── scoped slots ─────────────────────────────────────────────────────────────
  describe('scoped slots', () => {
    it('passes { item, index, status } to #icon / #title / #description', () => {
      const received: Array<{ slot: string; item: BaseStepItem; index: number; status: string }> = []

      mountSteps(
        {
          current: 1,
          items: [
            { title: 'A', description: 'desc-a' },
            { title: 'B', description: 'desc-b' },
          ],
        },
        {
          icon: (props: { item: BaseStepItem; index: number; status: string }) => {
            received.push({ slot: 'icon', ...props })
            return h('span', { class: 'slot-icon' }, String(props.index))
          },
          title: (props: { item: BaseStepItem; index: number; status: string }) => {
            received.push({ slot: 'title', ...props })
            return h('span', { class: 'slot-title' }, props.item.title)
          },
          description: (props: { item: BaseStepItem; index: number; status: string }) => {
            received.push({ slot: 'description', ...props })
            return h('span', { class: 'slot-description' }, props.item.description)
          },
        },
      )

      expect(received).toEqual(
        expect.arrayContaining([
          { slot: 'icon', item: { title: 'A', description: 'desc-a' }, index: 0, status: 'finish' },
          { slot: 'title', item: { title: 'A', description: 'desc-a' }, index: 0, status: 'finish' },
          { slot: 'description', item: { title: 'A', description: 'desc-a' }, index: 0, status: 'finish' },
          { slot: 'icon', item: { title: 'B', description: 'desc-b' }, index: 1, status: 'process' },
          { slot: 'title', item: { title: 'B', description: 'desc-b' }, index: 1, status: 'process' },
          { slot: 'description', item: { title: 'B', description: 'desc-b' }, index: 1, status: 'process' },
        ]),
      )
    })
  })
})
