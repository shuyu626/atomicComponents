import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseBadge from '~/components/atoms/BaseBadge.vue'

function mountBadge(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseBadge, { props, slots })
}

const contentOf = (w: ReturnType<typeof mountBadge>) =>
  w.find('.base-badge__content')

describe('BaseBadge', () => {
  // ── 錨點（default slot）────────────────────────────────────────────────────────
  describe('anchor', () => {
    it('renders the default slot (anchor) inside the wrapper', () => {
      const w = mountBadge({ content: 1 }, { default: () => 'ICON' })
      expect(w.find('.base-badge').exists()).toBe(true)
      expect(w.text()).toContain('ICON')
    })
  })

  // ── content 渲染 ───────────────────────────────────────────────────────────────
  describe('content', () => {
    it('renders numeric content', () => {
      expect(contentOf(mountBadge({ content: 5 })).text()).toBe('5')
    })

    it('renders text content as-is', () => {
      expect(contentOf(mountBadge({ content: 'NEW' })).text()).toBe('NEW')
    })

    it('renders nothing when content is null/undefined and no #content slot', () => {
      expect(contentOf(mountBadge({ content: null })).text()).toBe('')
      expect(contentOf(mountBadge()).text()).toBe('')
    })
  })

  // ── max 收斂 ──────────────────────────────────────────────────────────────────
  describe('max', () => {
    it('converges numbers above max to `${max}+`', () => {
      expect(contentOf(mountBadge({ content: 120, max: 99 })).text()).toBe('99+')
    })

    it('shows the number unchanged when at or below max', () => {
      expect(contentOf(mountBadge({ content: 99, max: 99 })).text()).toBe('99')
    })

    it('does not apply max to non-numeric content', () => {
      expect(contentOf(mountBadge({ content: 'NEW', max: 2 })).text()).toBe('NEW')
    })
  })

  // ── 0 與 showZero ─────────────────────────────────────────────────────────────
  describe('zero handling', () => {
    it('hides a numeric 0 by default (invisible + aria-hidden)', () => {
      const c = contentOf(mountBadge({ content: 0 }))
      expect(c.classes()).toContain('base-badge__content--invisible')
      expect(c.attributes('aria-hidden')).toBe('true')
    })

    it('shows 0 when showZero is true', () => {
      const c = contentOf(mountBadge({ content: 0, showZero: true }))
      expect(c.classes()).not.toContain('base-badge__content--invisible')
      expect(c.attributes('aria-hidden')).toBeUndefined()
      expect(c.text()).toBe('0')
    })

    it('does not misjudge null/undefined/text as numeric 0', () => {
      // dot 不受「空內容收合」影響，可單獨驗證「不被當成 0 隱藏」。
      expect(contentOf(mountBadge({ content: null, size: 'dot' })).classes()).not.toContain(
        'base-badge__content--invisible',
      )
      expect(
        contentOf(mountBadge({ content: undefined, size: 'dot' })).classes(),
      ).not.toContain('base-badge__content--invisible')
      // 文字內容（非 dot）有內容、非 0 → 維持顯示。
      expect(contentOf(mountBadge({ content: 'NEW' })).classes()).not.toContain(
        'base-badge__content--invisible',
      )
    })
  })

  // ── 無內容收合 ─────────────────────────────────────────────────────────────────
  describe('empty collapse', () => {
    it('collapses a non-dot badge with no content (invisible + aria-hidden)', () => {
      const c = contentOf(mountBadge({ size: 'medium' }))
      expect(c.classes()).toContain('base-badge__content--invisible')
      expect(c.attributes('aria-hidden')).toBe('true')
    })

    it('stays visible for a non-dot badge once it has content', () => {
      const c = contentOf(mountBadge({ size: 'medium', content: 1 }))
      expect(c.classes()).not.toContain('base-badge__content--invisible')
    })

    it('keeps a dot visible even without content (presence indicator)', () => {
      const c = contentOf(mountBadge({ size: 'dot' }))
      expect(c.classes()).not.toContain('base-badge__content--invisible')
      expect(c.attributes('aria-hidden')).toBeUndefined()
    })
  })

  // ── dot 尺寸 ──────────────────────────────────────────────────────────────────
  describe('dot', () => {
    it('never renders content in dot size', () => {
      const c = contentOf(mountBadge({ content: 5, size: 'dot' }))
      expect(c.text()).toBe('')
      expect(c.classes()).toContain('base-badge__content--dot')
    })
  })

  // ── modifier classes ──────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('applies default placement/overlap/size/color modifiers', () => {
      const c = contentOf(mountBadge({ content: 1 }))
      expect(c.classes()).toEqual(
        expect.arrayContaining([
          'base-badge__content--top-right',
          'base-badge__content--circular',
          'base-badge__content--medium',
          'base-badge__content--danger',
        ]),
      )
    })

    it('reflects custom placement/overlap/size/color', () => {
      const c = contentOf(
        mountBadge({
          content: 1,
          placement: 'bottom-left',
          overlap: 'rectangular',
          size: 'large',
          color: 'primary',
        }),
      )
      expect(c.classes()).toEqual(
        expect.arrayContaining([
          'base-badge__content--bottom-left',
          'base-badge__content--rectangular',
          'base-badge__content--large',
          'base-badge__content--primary',
        ]),
      )
    })
  })

  // ── #content slot ─────────────────────────────────────────────────────────────
  describe('content slot', () => {
    it('renders #content slot in place of the content prop', () => {
      const c = contentOf(mountBadge({ content: 5 }, { content: () => 'HOT' }))
      expect(c.text()).toBe('HOT')
    })

    it('renders #content even without a content prop (non-dot)', () => {
      const c = contentOf(mountBadge({}, { content: () => 'HOT' }))
      expect(c.text()).toBe('HOT')
    })

    it('does not render #content in dot size', () => {
      const c = contentOf(mountBadge({ size: 'dot' }, { content: () => 'HOT' }))
      expect(c.text()).toBe('')
    })
  })
})
