import { describe, it, expect } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseAlert from '~/components/atoms/BaseAlert.vue'

function mountAlert(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseAlert, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountAlert>) => w.find('.base-alert')

describe('BaseAlert', () => {
  // ── modifier classes ──────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('applies default variant/color modifiers (ghost + info)', () => {
      // 預設 variant 為 ghost（淡色調底，典型 alert 外觀）、color 為 info。
      expect(rootOf(mountAlert({}, { default: () => 'msg' })).classes()).toEqual(
        expect.arrayContaining(['base-alert', 'base-alert--ghost', 'base-alert--info']),
      )
    })

    it('reflects a custom variant/color', () => {
      const w = mountAlert({ variant: 'solid', color: 'success' }, { default: () => 'x' })
      expect(rootOf(w).classes()).toEqual(
        expect.arrayContaining(['base-alert--solid', 'base-alert--success']),
      )
    })

    it('supports every variant', () => {
      const variants = ['solid', 'outline', 'ghost', 'text'] as const
      for (const variant of variants) {
        expect(
          rootOf(mountAlert({ variant }, { default: () => 'x' })).classes(),
        ).toContain(`base-alert--${variant}`)
      }
    })

    it('supports every semantic color (incl. neutral)', () => {
      const colors = ['primary', 'success', 'warning', 'danger', 'info', 'neutral'] as const
      for (const color of colors) {
        expect(
          rootOf(mountAlert({ color }, { default: () => 'x' })).classes(),
        ).toContain(`base-alert--${color}`)
      }
    })
  })

  // ── 標題 ───────────────────────────────────────────────────────────────────────
  describe('title', () => {
    it('renders the title prop', () => {
      const w = mountAlert({ title: '注意' }, { default: () => 'body' })
      expect(w.find('.base-alert__title').text()).toBe('注意')
    })

    it('does not render the title block when neither prop nor slot is given', () => {
      const w = mountAlert({}, { default: () => 'body' })
      expect(w.find('.base-alert__title').exists()).toBe(false)
    })

    it('prefers the #title slot over the title prop', () => {
      const w = mountAlert(
        { title: 'prop' },
        { title: () => h('span', { class: 'custom-title' }, 'slot'), default: () => 'body' },
      )
      expect(w.find('.base-alert__title .custom-title').text()).toBe('slot')
      expect(w.find('.base-alert__title').text()).toBe('slot')
    })
  })

  // ── 前導圖示 ───────────────────────────────────────────────────────────────────
  describe('icon', () => {
    it('renders the built-in icon by default (aria-hidden)', () => {
      const w = mountAlert({}, { default: () => 'x' })
      const icon = w.find('.base-alert__icon')
      expect(icon.exists()).toBe(true)
      expect(icon.attributes('aria-hidden')).toBe('true')
      expect(icon.find('svg').exists()).toBe(true)
    })

    it('does not render the icon block when icon=false', () => {
      const w = mountAlert({ icon: false }, { default: () => 'x' })
      expect(w.find('.base-alert__icon').exists()).toBe(false)
    })

    it('renders a different icon path per color', () => {
      const success = mountAlert({ color: 'success' }, { default: () => 'x' })
      const danger = mountAlert({ color: 'danger' }, { default: () => 'x' })
      const successPath = success.find('.base-alert__icon path').attributes('d')
      const dangerPath = danger.find('.base-alert__icon path').attributes('d')
      expect(successPath).toBeTruthy()
      expect(successPath).not.toBe(dangerPath)
    })

    it('#icon slot overrides the built-in SVG', () => {
      const w = mountAlert(
        {},
        { icon: () => h('i', { class: 'my-icon' }, '★'), default: () => 'x' },
      )
      expect(w.find('.base-alert__icon .my-icon').exists()).toBe(true)
      expect(w.find('.base-alert__icon svg').exists()).toBe(false)
    })
  })

  // ── body / actions slots ──────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders the default slot as the body', () => {
      const w = mountAlert({}, { default: () => '訊息內容' })
      expect(w.find('.base-alert__body').text()).toBe('訊息內容')
    })

    it('renders the #actions slot only when provided', () => {
      expect(mountAlert({}, { default: () => 'x' }).find('.base-alert__actions').exists()).toBe(
        false,
      )
      const w = mountAlert(
        {},
        { default: () => 'x', actions: () => h('button', { class: 'act' }, '重試') },
      )
      expect(w.find('.base-alert__actions .act').exists()).toBe(true)
    })
  })

  // ── 關閉鈕 ─────────────────────────────────────────────────────────────────────
  describe('closable', () => {
    it('does not render the close button by default', () => {
      expect(mountAlert({}, { default: () => 'x' }).find('.base-alert__close').exists()).toBe(
        false,
      )
    })

    it('renders a close <button type="button"> when closable', () => {
      const btn = mountAlert({ closable: true }, { default: () => 'x' }).find(
        '.base-alert__close',
      )
      expect(btn.exists()).toBe(true)
      expect(btn.element.tagName).toBe('BUTTON')
      expect(btn.attributes('type')).toBe('button')
    })

    it('emits `close` on click', async () => {
      const w = mountAlert({ closable: true }, { default: () => 'x' })
      await w.find('.base-alert__close').trigger('click')
      expect(w.emitted('close')).toHaveLength(1)
    })

    it('uses the default close aria-label', () => {
      const btn = mountAlert({ closable: true }, { default: () => 'x' }).find(
        '.base-alert__close',
      )
      expect(btn.attributes('aria-label')).toBe('關閉')
    })

    it('reflects a custom closeLabel', () => {
      const btn = mountAlert(
        { closable: true, closeLabel: 'Dismiss' },
        { default: () => 'x' },
      ).find('.base-alert__close')
      expect(btn.attributes('aria-label')).toBe('Dismiss')
    })
  })

  // ── 無障礙 role ────────────────────────────────────────────────────────────────
  describe('a11y role', () => {
    it('danger / warning use role=alert + aria-live=assertive', () => {
      const danger = rootOf(mountAlert({ color: 'danger' }, { default: () => 'x' }))
      expect(danger.attributes('role')).toBe('alert')
      expect(danger.attributes('aria-live')).toBe('assertive')

      const warning = rootOf(mountAlert({ color: 'warning' }, { default: () => 'x' }))
      expect(warning.attributes('role')).toBe('alert')
      expect(warning.attributes('aria-live')).toBe('assertive')
    })

    it('primary / success / info / neutral use role=status + aria-live=polite', () => {
      const colors = ['primary', 'success', 'info', 'neutral'] as const
      for (const color of colors) {
        const root = rootOf(mountAlert({ color }, { default: () => 'x' }))
        expect(root.attributes('role')).toBe('status')
        expect(root.attributes('aria-live')).toBe('polite')
      }
    })
  })
})
