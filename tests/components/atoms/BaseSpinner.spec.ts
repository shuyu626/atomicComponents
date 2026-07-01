import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseSpinner from '~/components/atoms/BaseSpinner.vue'

function mountSpinner(props: Record<string, unknown> = {}) {
  return mount(BaseSpinner, { props })
}

const rootOf = (w: ReturnType<typeof mountSpinner>) => w.find('.base-spinner')

describe('BaseSpinner', () => {
  // ── 結構 ────────────────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders the root and the spinning ring', () => {
      const w = mountSpinner()
      expect(rootOf(w).exists()).toBe(true)
      expect(w.find('.base-spinner__ring').exists()).toBe(true)
    })

    it('marks the ring as decorative (aria-hidden)', () => {
      expect(mountSpinner().find('.base-spinner__ring').attributes('aria-hidden')).toBe('true')
    })
  })

  // ── size（具名 vs 數字）────────────────────────────────────────────────────────
  describe('size', () => {
    it('applies the md size modifier by default (no inline size var)', () => {
      const root = rootOf(mountSpinner())
      expect(root.classes()).toContain('base-spinner--md')
      expect(root.attributes('style')).toBeUndefined()
    })

    it('applies named size modifiers (sm / lg)', () => {
      expect(rootOf(mountSpinner({ size: 'sm' })).classes()).toContain('base-spinner--sm')
      expect(rootOf(mountSpinner({ size: 'lg' })).classes()).toContain('base-spinner--lg')
    })

    it('injects --spinner-size from a numeric size (no size modifier)', () => {
      const root = rootOf(mountSpinner({ size: 48 }))
      expect(root.attributes('style')).toContain('--spinner-size: 48px')
      expect(root.classes().some(c => c.startsWith('base-spinner--'))).toBe(false)
    })

    it('accepts a numeric-string size', () => {
      const root = rootOf(mountSpinner({ size: '32' }))
      expect(root.attributes('style')).toContain('--spinner-size: 32px')
      expect(root.classes()).not.toContain('base-spinner--32')
    })
  })

  // ── color（語意色 vs currentColor 預設）──────────────────────────────────────────
  describe('color', () => {
    it('adds no color modifier by default (inherits currentColor)', () => {
      const classes = rootOf(mountSpinner()).classes()
      for (const c of ['primary', 'success', 'warning', 'danger', 'info', 'neutral']) {
        expect(classes).not.toContain(`base-spinner--${c}`)
      }
    })

    it('applies the semantic color modifier when specified', () => {
      expect(rootOf(mountSpinner({ color: 'primary' })).classes()).toContain(
        'base-spinner--primary',
      )
      expect(rootOf(mountSpinner({ color: 'danger' })).classes()).toContain('base-spinner--danger')
    })

    it('supports the neutral color', () => {
      expect(rootOf(mountSpinner({ color: 'neutral' })).classes()).toContain(
        'base-spinner--neutral',
      )
    })
  })

  // ── a11y（role / label）──────────────────────────────────────────────────────────
  describe('a11y', () => {
    it('exposes role="status" on the root', () => {
      expect(rootOf(mountSpinner()).attributes('role')).toBe('status')
    })

    it('defaults the accessible label to 載入中', () => {
      expect(rootOf(mountSpinner()).attributes('aria-label')).toBe('載入中')
    })

    it('reflects a custom label in aria-label', () => {
      expect(rootOf(mountSpinner({ label: 'Loading data' })).attributes('aria-label')).toBe('Loading data')
    })
  })

  // ── 根 class ─────────────────────────────────────────────────────────────────────
  describe('root class', () => {
    it('always carries the base-spinner class', () => {
      expect(rootOf(mountSpinner()).classes()).toContain('base-spinner')
    })

    it('combines size and color modifiers', () => {
      const classes = rootOf(mountSpinner({ size: 'lg', color: 'success' })).classes()
      expect(classes).toEqual(
        expect.arrayContaining(['base-spinner', 'base-spinner--lg', 'base-spinner--success']),
      )
    })
  })
})
