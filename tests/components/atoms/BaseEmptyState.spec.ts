import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseEmptyState from '~/components/atoms/BaseEmptyState.vue'

function mountEmptyState(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseEmptyState, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountEmptyState>) => w.find('.base-empty-state')

describe('BaseEmptyState', () => {
  // ── title / description ─────────────────────────────────────────────────────
  describe('title & description', () => {
    it('renders the default title when no props are given', () => {
      const w = mountEmptyState()
      expect(w.find('.base-empty-state__title').text()).toBe('目前沒有資料')
    })

    it('renders title / description from props', () => {
      const w = mountEmptyState({
        title: '找不到結果',
        description: '請調整篩選條件後再試一次',
      })
      expect(w.find('.base-empty-state__title').text()).toBe('找不到結果')
      expect(w.find('.base-empty-state__description').text()).toBe('請調整篩選條件後再試一次')
    })

    it('omits the description block when not provided', () => {
      const w = mountEmptyState()
      expect(w.find('.base-empty-state__description').exists()).toBe(false)
    })
  })

  // ── icon ────────────────────────────────────────────────────────────────────
  describe('icon', () => {
    it('hides the icon block when icon=false', () => {
      const w = mountEmptyState({ icon: false })
      expect(w.find('.base-empty-state__icon').exists()).toBe(false)
    })
  })

  // ── size ────────────────────────────────────────────────────────────────────
  describe('size', () => {
    it('defaults to md and supports every size (sm / md / lg)', () => {
      expect(rootOf(mountEmptyState()).classes()).toContain('base-empty-state--md')

      const sizes = ['sm', 'md', 'lg'] as const
      for (const size of sizes) {
        expect(rootOf(mountEmptyState({ size })).classes()).toContain(`base-empty-state--${size}`)
      }
    })
  })

  // ── slots ───────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders a custom #icon slot in place of the built-in glyph', () => {
      const w = mountEmptyState({}, { icon: () => h('i', { class: 'my-icon' }) })
      expect(w.find('.base-empty-state__icon .my-icon').exists()).toBe(true)
      expect(w.find('.base-empty-state__glyph').exists()).toBe(false)
    })

    it('lets #title / #description slots override the props, receiving scoped props', () => {
      const w = mountEmptyState(
        { title: 'prop-title', description: 'prop-desc' },
        {
          title: (props: { title: string }) => `slot:${props.title}`,
          description: (props: { description?: string }) => `slot:${props.description}`,
        },
      )
      expect(w.find('.base-empty-state__title').text()).toBe('slot:prop-title')
      expect(w.find('.base-empty-state__description').text()).toBe('slot:prop-desc')
    })

    it('renders #default between description and actions as __extra', () => {
      const w = mountEmptyState({}, { default: () => 'extra detail' })
      expect(w.find('.base-empty-state__extra').text()).toBe('extra detail')
    })

    it('renders the #actions slot when provided', () => {
      const w = mountEmptyState({}, { actions: () => h('button', '重新整理') })
      expect(w.find('.base-empty-state__actions button').text()).toBe('重新整理')
    })

    it('omits the actions block when no #actions slot is given', () => {
      expect(mountEmptyState().find('.base-empty-state__actions').exists()).toBe(false)
    })
  })

  // ── a11y ────────────────────────────────────────────────────────────────────
  describe('a11y', () => {
    it('marks the icon container aria-hidden and the root has no role', () => {
      const w = mountEmptyState()
      expect(w.find('.base-empty-state__icon').attributes('aria-hidden')).toBe('true')
      expect(rootOf(w).attributes('role')).toBeUndefined()
    })
  })
})
