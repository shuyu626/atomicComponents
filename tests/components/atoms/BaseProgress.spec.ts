import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseProgress from '~/components/atoms/BaseProgress.vue'

function mountProgress(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseProgress, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountProgress>) => w.find('.base-progress')

describe('BaseProgress', () => {
  // ── 結構（variant）─────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders the linear rail/track by default (no svg)', () => {
      const w = mountProgress({ value: 50 })
      expect(rootOf(w).classes()).toContain('base-progress--linear')
      expect(w.find('.base-progress__rail').exists()).toBe(true)
      expect(w.find('.base-progress__track').exists()).toBe(true)
      expect(w.find('svg').exists()).toBe(false)
    })

    it('renders an <svg> with two circles for the circular variant', () => {
      const w = mountProgress({ variant: 'circular', value: 50 })
      expect(rootOf(w).classes()).toContain('base-progress--circular')
      expect(w.find('svg.base-progress__circular').exists()).toBe(true)
      expect(w.find('.base-progress__circular-rail').exists()).toBe(true)
      expect(w.find('.base-progress__circular-track').exists()).toBe(true)
    })

    it('omits the circular track when value is 0 (arcLength = 0)', () => {
      const w = mountProgress({ variant: 'circular', value: 0 })
      expect(w.find('.base-progress__circular-track').exists()).toBe(false)
    })
  })

  // ── modifier classes ──────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('applies default variant/color modifiers', () => {
      expect(rootOf(mountProgress()).classes()).toEqual(
        expect.arrayContaining(['base-progress--linear', 'base-progress--primary']),
      )
    })

    it('reflects custom variant/color', () => {
      const w = mountProgress({ variant: 'circular', color: 'success' })
      expect(rootOf(w).classes()).toEqual(
        expect.arrayContaining(['base-progress--circular', 'base-progress--success']),
      )
    })

    it('adds the indeterminate modifier only when set', () => {
      expect(rootOf(mountProgress()).classes()).not.toContain('base-progress--indeterminate')
      expect(rootOf(mountProgress({ indeterminate: true })).classes()).toContain(
        'base-progress--indeterminate',
      )
    })
  })

  // ── ARIA ───────────────────────────────────────────────────────────────────────
  describe('a11y', () => {
    it('exposes the progressbar role with min/max/now/valuetext', () => {
      const root = rootOf(mountProgress({ value: 30, max: 100 }))
      expect(root.attributes('role')).toBe('progressbar')
      expect(root.attributes('aria-valuemin')).toBe('0')
      expect(root.attributes('aria-valuemax')).toBe('100')
      expect(root.attributes('aria-valuenow')).toBe('30')
      expect(root.attributes('aria-valuetext')).toBe('30%')
    })

    it('reflects a custom max in aria-valuemax and valuetext', () => {
      const root = rootOf(mountProgress({ value: 3, max: 5 }))
      expect(root.attributes('aria-valuemax')).toBe('5')
      expect(root.attributes('aria-valuenow')).toBe('3')
      expect(root.attributes('aria-valuetext')).toBe('60%')
    })

    it('omits aria-valuenow / aria-valuetext when indeterminate', () => {
      const root = rootOf(mountProgress({ value: 30, indeterminate: true }))
      expect(root.attributes('aria-valuenow')).toBeUndefined()
      expect(root.attributes('aria-valuetext')).toBeUndefined()
      // max 仍應提供
      expect(root.attributes('aria-valuemax')).toBe('100')
    })

    it('marks the circular svg as decorative', () => {
      const w = mountProgress({ variant: 'circular', value: 50 })
      expect(w.find('svg').attributes('aria-hidden')).toBe('true')
    })
  })

  // ── 百分比換算與 clamp ───────────────────────────────────────────────────────────
  describe('percentage clamping', () => {
    it('clamps value above max to 100%', () => {
      expect(rootOf(mountProgress({ value: 150, max: 100 })).attributes('aria-valuetext')).toBe(
        '100%',
      )
    })

    it('clamps negative value to 0%', () => {
      expect(rootOf(mountProgress({ value: -20 })).attributes('aria-valuetext')).toBe('0%')
    })

    it('falls back to 0% when max <= 0 (no Infinity / NaN)', () => {
      expect(rootOf(mountProgress({ value: 50, max: 0 })).attributes('aria-valuetext')).toBe('0%')
    })

    it('accepts numeric-string value / max', () => {
      expect(rootOf(mountProgress({ value: '25', max: '50' })).attributes('aria-valuetext')).toBe(
        '50%',
      )
    })
  })

  // ── 指示文字 ─────────────────────────────────────────────────────────────────────
  describe('indicator', () => {
    it('hides the indicator by default', () => {
      expect(mountProgress({ value: 40 }).find('.base-progress__indicator').exists()).toBe(false)
    })

    it('shows percentage when indicator is true', () => {
      const w = mountProgress({ value: 40, indicator: true })
      expect(w.find('.base-progress__indicator').text()).toBe('40%')
    })

    it('shows percentage when indicator="percentage"', () => {
      const w = mountProgress({ value: 40, indicator: 'percentage' })
      expect(w.find('.base-progress__indicator').text()).toBe('40%')
    })

    it('shows the raw value when indicator="value"', () => {
      const w = mountProgress({ value: 3, max: 5, indicator: 'value' })
      expect(w.find('.base-progress__indicator').text()).toBe('3')
    })

    it('rounds the displayed percentage', () => {
      // 1/3 → 33.33% → 顯示 33
      const w = mountProgress({ value: 1, max: 3, indicator: true })
      expect(w.find('.base-progress__indicator').text()).toBe('33%')
    })

    it('uses the circular indicator class for the circular variant', () => {
      const w = mountProgress({ variant: 'circular', value: 40, indicator: true })
      expect(w.find('.base-progress__circular-indicator').exists()).toBe(true)
      expect(w.find('.base-progress__indicator').exists()).toBe(false)
    })

    it('never shows the indicator when indeterminate', () => {
      const w = mountProgress({ value: 40, indicator: true, indeterminate: true })
      expect(w.find('.base-progress__indicator').exists()).toBe(false)
    })
  })

  // ── default scoped slot ─────────────────────────────────────────────────────────
  describe('default slot', () => {
    it('passes rounded percentage and raw value to the slot', () => {
      const w = mountProgress(
        { value: 1, max: 4 },
        { default: (p: { percentage: number; value: number }) => `${p.percentage}/${p.value}` },
      )
      // 1/4 = 25%，value 原始 1
      expect(w.find('.base-progress__indicator').text()).toBe('25/1')
    })

    it('renders the slot even when indicator is false', () => {
      const w = mountProgress({ value: 50 }, { default: () => 'custom' })
      expect(w.find('.base-progress__indicator').text()).toBe('custom')
    })

    it('does not render the slot when indeterminate', () => {
      const w = mountProgress({ value: 50, indeterminate: true }, { default: () => 'custom' })
      expect(w.find('.base-progress__indicator').exists()).toBe(false)
    })
  })

  // ── inline style token ───────────────────────────────────────────────────────────
  describe('style tokens', () => {
    it('injects --progress-thickness / --progress-size from props', () => {
      const style = rootOf(mountProgress({ thickness: 6, size: 80 })).attributes('style')
      expect(style).toContain('--progress-thickness: 6px')
      expect(style).toContain('--progress-size: 80px')
    })
  })
})
