import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'

function mountField(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseFormField, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountField>) => w.find('.base-form-field')

describe('BaseFormField', () => {
  // ── 標籤 ───────────────────────────────────────────────────────────────────────
  describe('label', () => {
    it('renders the label prop', () => {
      const w = mountField({ label: 'Email' })
      expect(w.find('.base-form-field__label-content').text()).toBe('Email')
    })

    it('does not render the label block when neither label prop nor #label slot is given', () => {
      expect(mountField().find('.base-form-field__label').exists()).toBe(false)
    })

    it('prefers the #label slot over the label prop', () => {
      const w = mountField({ label: 'Email' }, { label: () => 'Custom' })
      expect(w.find('.base-form-field__label-content').text()).toBe('Custom')
    })

    it('associates <label for> with the control id', () => {
      const w = mountField(
        { label: 'Email' },
        { default: (p: { id: string }) => h('input', { id: p.id }) },
      )
      const forAttr = w.find('label').attributes('for')
      const inputId = w.find('input').attributes('id')
      expect(forAttr).toBeTruthy()
      expect(forAttr).toBe(inputId)
    })
  })

  // ── id ────────────────────────────────────────────────────────────────────────
  describe('id', () => {
    it('auto-generates a `field-*` id when none is provided', () => {
      const w = mountField(
        {},
        { default: (p: { id: string }) => h('input', { id: p.id }) },
      )
      expect(w.find('input').attributes('id')).toMatch(/^field-/)
    })

    it('uses the provided id', () => {
      const w = mountField(
        { id: 'email' },
        { default: (p: { id: string }) => h('input', { id: p.id }) },
      )
      expect(w.find('input').attributes('id')).toBe('email')
    })
  })

  // ── modifier classes ────────────────────────────────────────────────────────────
  describe('modifier classes', () => {
    it('defaults to label-left placement', () => {
      expect(rootOf(mountField()).classes()).toContain('base-form-field--label-left')
    })

    it('reflects label-top placement', () => {
      expect(
        rootOf(mountField({ labelPlacement: 'top' })).classes(),
      ).toContain('base-form-field--label-top')
    })

    it('reflects error / disabled / readonly states', () => {
      const w = mountField({ error: true, disabled: true, readonly: true })
      expect(rootOf(w).classes()).toEqual(
        expect.arrayContaining([
          'base-form-field--error',
          'base-form-field--disabled',
          'base-form-field--readonly',
        ]),
      )
    })

    it('applies the required modifier when required and label is visible', () => {
      expect(
        rootOf(mountField({ label: 'x', required: true })).classes(),
      ).toContain('base-form-field--required')
    })

    it('does NOT apply the required modifier when the label is hidden', () => {
      const w = mountField({ label: 'x', required: true, hideLabel: true })
      expect(rootOf(w).classes()).not.toContain('base-form-field--required')
      expect(rootOf(w).classes()).toContain('base-form-field--hide-label')
    })
  })

  // ── label width 樣式 ────────────────────────────────────────────────────────────
  describe('label width style', () => {
    it('converts a numeric labelWidth to px', () => {
      const w = mountField({ label: 'x', labelWidth: 120 })
      expect(rootOf(w).attributes('style')).toContain('--field-label-width: 120px')
    })

    it('passes a string labelWidth through untouched', () => {
      const w = mountField({ label: 'x', labelWidth: '6rem' })
      expect(rootOf(w).attributes('style')).toContain('--field-label-width: 6rem')
    })

    it('does not set the label-width variable when the label is hidden', () => {
      const w = mountField({ label: 'x', labelWidth: 120, hideLabel: true })
      expect(rootOf(w).attributes('style')).toBeUndefined()
    })
  })

  // ── 訊息 ───────────────────────────────────────────────────────────────────────
  describe('message', () => {
    it('renders the message prop', () => {
      const w = mountField({ message: 'Required field' })
      expect(w.find('.base-form-field__message').text()).toBe('Required field')
    })

    it('gives the message element a `{id}-message` id and a live region', () => {
      const w = mountField(
        { id: 'email', message: 'help' },
        { default: (p: { describedby?: string }) => h('input', { 'aria-describedby': p.describedby }) },
      )
      const msg = w.find('.base-form-field__message')
      expect(msg.attributes('id')).toBe('email-message')
      expect(msg.attributes('aria-live')).toBe('polite')
      expect(msg.attributes('aria-atomic')).toBe('true')
    })

    it('prefers the #message slot over the message prop', () => {
      const w = mountField({ message: 'prop' }, { message: () => 'slotted' })
      expect(w.find('.base-form-field__message').text()).toBe('slotted')
    })
  })

  // ── default slot 的 a11y scoped props ───────────────────────────────────────────
  describe('default slot scoped props', () => {
    it('passes describedby only when a message exists', () => {
      const withMsg = mountField(
        { id: 'a', message: 'help' },
        { default: (p: { describedby?: string }) => h('input', { 'aria-describedby': p.describedby }) },
      )
      expect(withMsg.find('input').attributes('aria-describedby')).toBe('a-message')

      const noMsg = mountField(
        { id: 'a' },
        { default: (p: { describedby?: string }) => h('input', { 'aria-describedby': p.describedby }) },
      )
      expect(noMsg.find('input').attributes('aria-describedby')).toBeUndefined()
    })

    it('passes describedby when only the #message slot is provided (slot-driven)', () => {
      const w = mountField(
        { id: 'a' },
        {
          default: (p: { describedby?: string }) => h('input', { 'aria-describedby': p.describedby }),
          message: () => 'slotted help',
        },
      )
      expect(w.find('input').attributes('aria-describedby')).toBe('a-message')
    })

    it('passes invalid / required / disabled / readonly flags reflecting props', () => {
      const w = mountField(
        { error: true, required: true, disabled: true, readonly: true },
        {
          default: (p: {
            invalid?: true
            required?: true
            disabled?: true
            readonly?: true
          }) =>
            h('input', {
              'aria-invalid': p.invalid,
              'aria-required': p.required,
              disabled: p.disabled,
              readonly: p.readonly,
            }),
        },
      )
      const input = w.find('input')
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-required')).toBe('true')
      expect(input.attributes('disabled')).toBeDefined()
      expect(input.attributes('readonly')).toBeDefined()
    })

    it('passes undefined flags when the corresponding props are false', () => {
      const w = mountField(
        {},
        {
          default: (p: { invalid?: true }) =>
            h('input', { 'aria-invalid': p.invalid }),
        },
      )
      expect(w.find('input').attributes('aria-invalid')).toBeUndefined()
    })
  })
})
