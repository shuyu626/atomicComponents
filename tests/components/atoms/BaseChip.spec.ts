import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseChip from '~/components/atoms/BaseChip.vue'

function mountChip(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseChip, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountChip>) => w.find('.base-chip')

describe('BaseChip', () => {
  // ── 根元素（多型）─────────────────────────────────────────────────────────────
  describe('root element', () => {
    it('renders a <span> by default', () => {
      expect(rootOf(mountChip({ label: 'tag' })).element.tagName).toBe('SPAN')
    })

    it('renders a custom tag via `as`', () => {
      const w = mountChip({ label: 'tag', as: 'a' })
      expect(rootOf(w).element.tagName).toBe('A')
    })
  })

  // ── 內容優先序 ─────────────────────────────────────────────────────────────────
  describe('content', () => {
    it('renders the label prop', () => {
      expect(rootOf(mountChip({ label: 'Vue' })).text()).toBe('Vue')
    })

    it('prefers the default slot over the label prop', () => {
      const w = mountChip({ label: 'Vue' }, { default: () => 'Nuxt' })
      expect(rootOf(w).text()).toBe('Nuxt')
    })

    it('renders an empty chip when neither label nor slot is given', () => {
      expect(rootOf(mountChip()).find('.base-chip__label').text()).toBe('')
    })
  })

  // ── modifier classes ──────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('applies default size/variant/color modifiers', () => {
      expect(rootOf(mountChip({ label: 'x' })).classes()).toEqual(
        expect.arrayContaining([
          'base-chip--medium',
          'base-chip--contained',
          'base-chip--primary',
        ]),
      )
    })

    it('reflects custom size/variant/color', () => {
      const w = mountChip({
        label: 'x',
        size: 'small',
        variant: 'outlined',
        color: 'success',
      })
      expect(rootOf(w).classes()).toEqual(
        expect.arrayContaining([
          'base-chip--small',
          'base-chip--outlined',
          'base-chip--success',
        ]),
      )
    })

    it('supports the filled variant', () => {
      expect(
        rootOf(mountChip({ label: 'x', variant: 'filled' })).classes(),
      ).toContain('base-chip--filled')
    })
  })

  // ── 自訂色 ─────────────────────────────────────────────────────────────────────
  describe('custom color', () => {
    it('injects an arbitrary CSS color into --chip-accent (no color modifier class)', () => {
      const w = mountChip({ label: 'x', color: '#8b5cf6' })
      expect(rootOf(w).attributes('style')).toContain('--chip-accent: #8b5cf6')
      // 不應掛任何語意色 modifier
      expect(
        rootOf(w)
          .classes()
          .some(c => /^base-chip--(primary|success|warning|danger|info)$/.test(c)),
      ).toBe(false)
    })

    it('does not inject inline --chip-accent for a theme color', () => {
      const w = mountChip({ label: 'x', color: 'danger' })
      expect(rootOf(w).attributes('style')).toBeUndefined()
      expect(rootOf(w).classes()).toContain('base-chip--danger')
    })
  })

  // ── 刪除鈕 ─────────────────────────────────────────────────────────────────────
  describe('deletable', () => {
    it('does not render the delete button by default', () => {
      expect(rootOf(mountChip({ label: 'x' })).find('.base-chip__delete').exists()).toBe(
        false,
      )
    })

    it('renders a delete <button type="button"> when deletable', () => {
      const btn = rootOf(mountChip({ label: 'x', deletable: true })).find(
        '.base-chip__delete',
      )
      expect(btn.exists()).toBe(true)
      expect(btn.element.tagName).toBe('BUTTON')
      expect(btn.attributes('type')).toBe('button')
    })

    it('emits `delete` with the native event on click', async () => {
      const w = mountChip({ label: 'x', deletable: true })
      await w.find('.base-chip__delete').trigger('click')
      expect(w.emitted('delete')).toHaveLength(1)
      expect(w.emitted('delete')![0][0]).toBeInstanceOf(MouseEvent)
    })

    it('uses the default delete aria-label', () => {
      const btn = rootOf(mountChip({ label: 'x', deletable: true })).find(
        '.base-chip__delete',
      )
      expect(btn.attributes('aria-label')).toBe('Delete')
    })

    it('reflects a custom deleteAriaLabel', () => {
      const btn = rootOf(
        mountChip({ label: 'x', deletable: true, deleteAriaLabel: '移除「Vue」標籤' }),
      ).find('.base-chip__delete')
      expect(btn.attributes('aria-label')).toBe('移除「Vue」標籤')
    })
  })

  // ── 巢狀互動元素的開發警告 ─────────────────────────────────────────────────────
  describe('nested interactive warning (DEV)', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('warns when an interactive `as` is combined with deletable', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountChip({ label: 'x', as: 'a', deletable: true })
      expect(warn).toHaveBeenCalledOnce()
      expect(warn.mock.calls[0][0]).toContain('[BaseChip]')
    })

    it('does not warn for a non-interactive `as` with deletable', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountChip({ label: 'x', as: 'span', deletable: true })
      expect(warn).not.toHaveBeenCalled()
    })
  })

  // ── prepend / append slots ────────────────────────────────────────────────────
  describe('prepend / append slots', () => {
    it('renders the prepend slot only when provided', () => {
      expect(rootOf(mountChip({ label: 'x' })).find('.base-chip__prepend').exists()).toBe(
        false,
      )
      const w = mountChip({ label: 'x' }, { prepend: () => 'P' })
      const prepend = rootOf(w).find('.base-chip__prepend')
      expect(prepend.exists()).toBe(true)
      expect(prepend.text()).toBe('P')
    })

    it('renders the append slot only when provided', () => {
      expect(rootOf(mountChip({ label: 'x' })).find('.base-chip__append').exists()).toBe(
        false,
      )
      const w = mountChip({ label: 'x' }, { append: () => 'A' })
      const append = rootOf(w).find('.base-chip__append')
      expect(append.exists()).toBe(true)
      expect(append.text()).toBe('A')
    })
  })
})
