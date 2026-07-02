import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseResult from '~/components/atoms/BaseResult.vue'

function mountResult(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseResult, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountResult>) => w.find('.base-result')

describe('BaseResult', () => {
  // ── status ────────────────────────────────────────────────────────────────────
  describe('status', () => {
    it('defaults to info', () => {
      expect(rootOf(mountResult()).classes()).toContain('base-result--info')
    })

    it('reflects success / warning / error', () => {
      expect(rootOf(mountResult({ status: 'success' })).classes()).toContain('base-result--success')
      expect(rootOf(mountResult({ status: 'warning' })).classes()).toContain('base-result--warning')
      expect(rootOf(mountResult({ status: 'error' })).classes()).toContain('base-result--error')
    })
  })

  // ── title / description ─────────────────────────────────────────────────────────
  describe('title & description', () => {
    it('renders title / description from props', () => {
      const w = mountResult({ title: '已完成', description: '案件已駁回' })
      expect(w.find('.base-result__title').text()).toBe('已完成')
      expect(w.find('.base-result__description').text()).toBe('案件已駁回')
    })

    it('omits title / description when not provided', () => {
      const w = mountResult()
      expect(w.find('.base-result__title').exists()).toBe(false)
      expect(w.find('.base-result__description').exists()).toBe(false)
    })

    it('lets #title / #description slots override the props', () => {
      const w = mountResult(
        { title: 'prop-title', description: 'prop-desc' },
        { title: () => 'slot-title', description: () => 'slot-desc' },
      )
      expect(w.find('.base-result__title').text()).toBe('slot-title')
      expect(w.find('.base-result__description').text()).toBe('slot-desc')
    })
  })

  // ── icon ────────────────────────────────────────────────────────────────────────
  describe('icon', () => {
    it('shows the built-in status glyph by default (aria-hidden)', () => {
      const w = mountResult({ status: 'success' })
      const svg = w.find('.base-result__glyph')
      expect(svg.exists()).toBe(true)
      expect(svg.attributes('aria-hidden')).toBe('true')
    })

    it('hides the icon when icon=false', () => {
      const w = mountResult({ icon: false })
      expect(w.find('.base-result__icon').exists()).toBe(false)
    })

    it('renders a custom #icon slot in place of the built-in glyph', () => {
      const w = mountResult({}, { icon: () => h('i', { class: 'my-icon' }) })
      expect(w.find('.base-result__icon .my-icon').exists()).toBe(true)
      expect(w.find('.base-result__glyph').exists()).toBe(false)
    })
  })

  // ── body / actions slots ────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders default (body) and #actions only when provided', () => {
      const bare = mountResult()
      expect(bare.find('.base-result__body').exists()).toBe(false)
      expect(bare.find('.base-result__actions').exists()).toBe(false)

      const full = mountResult({}, {
        default: () => 'extra detail',
        actions: () => h('button', '關閉'),
      })
      expect(full.find('.base-result__body').text()).toBe('extra detail')
      expect(full.find('.base-result__actions button').text()).toBe('關閉')
    })
  })
})
