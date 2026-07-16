import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseDivider from '~/components/atoms/BaseDivider.vue'

function mountDivider(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseDivider, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountDivider>) => w.find('.base-divider')

describe('BaseDivider', () => {
  // ── 型態自動切換（純線 <hr> vs 帶文字 <div>）──────────────────────────────────
  describe('root element', () => {
    it('renders an <hr> when no default slot is given', () => {
      const root = rootOf(mountDivider())
      expect(root.element.tagName).toBe('HR')
      expect(root.classes()).not.toContain('base-divider--with-text')
    })

    it('renders a <div role="separator"> when a default slot is given', () => {
      const root = rootOf(mountDivider({}, { default: () => '或' }))
      expect(root.element.tagName).toBe('DIV')
      expect(root.attributes('role')).toBe('separator')
      expect(root.classes()).toContain('base-divider--with-text')
    })

    it('renders the slot content inside __text', () => {
      const w = mountDivider({}, { default: () => 'OR' })
      expect(w.find('.base-divider__text').text()).toBe('OR')
    })
  })

  // ── aria-orientation ───────────────────────────────────────────────────────────
  describe('aria-orientation', () => {
    it('defaults to horizontal on the <hr>', () => {
      expect(rootOf(mountDivider()).attributes('aria-orientation')).toBe('horizontal')
    })

    it('reflects vertical orientation on the <hr>', () => {
      expect(
        rootOf(mountDivider({ orientation: 'vertical' })).attributes('aria-orientation'),
      ).toBe('vertical')
    })

    it('reflects orientation on the with-text <div>', () => {
      const root = rootOf(mountDivider({ orientation: 'vertical' }, { default: () => 'x' }))
      expect(root.attributes('aria-orientation')).toBe('vertical')
    })
  })

  // ── modifier classes ───────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('applies default orientation/lineStyle/textAlign modifiers', () => {
      expect(rootOf(mountDivider()).classes()).toEqual(
        expect.arrayContaining([
          'base-divider--horizontal',
          'base-divider--solid',
          'base-divider--center',
        ]),
      )
    })

    it('reflects custom orientation/lineStyle/textAlign', () => {
      const w = mountDivider({
        orientation: 'vertical',
        lineStyle: 'dashed',
        textAlign: 'start',
      })
      expect(rootOf(w).classes()).toEqual(
        expect.arrayContaining([
          'base-divider--vertical',
          'base-divider--dashed',
          'base-divider--start',
        ]),
      )
    })

    it('supports the dotted lineStyle', () => {
      expect(rootOf(mountDivider({ lineStyle: 'dotted' })).classes()).toContain(
        'base-divider--dotted',
      )
    })

    it('applies textAlign modifier on the with-text variant', () => {
      const root = rootOf(mountDivider({ textAlign: 'end' }, { default: () => 'x' }))
      expect(root.classes()).toContain('base-divider--end')
    })
  })

  // ── decorative（純裝飾分隔線對輔助技術隱形）──────────────────────────────────
  describe('decorative', () => {
    it('does not set an explicit role on the <hr> when decorative is false (default)', () => {
      expect(rootOf(mountDivider()).attributes('role')).toBeUndefined()
    })

    it('sets role="none" on the <hr> when decorative is true, overriding the implicit separator role', () => {
      const root = rootOf(mountDivider({ decorative: true }))
      expect(root.attributes('role')).toBe('none')
      expect(root.attributes('aria-orientation')).toBe('horizontal')
    })

    it('keeps role="separator" on the with-text <div> when decorative is false (default)', () => {
      const root = rootOf(mountDivider({}, { default: () => 'x' }))
      expect(root.attributes('role')).toBe('separator')
      expect(root.attributes('aria-orientation')).toBe('horizontal')
    })

    it('sets role="none" and omits aria-orientation on the with-text <div> when decorative is true', () => {
      const root = rootOf(mountDivider({ decorative: true }, { default: () => 'x' }))
      expect(root.attributes('role')).toBe('none')
      expect(root.attributes('aria-orientation')).toBeUndefined()
    })
  })
})
