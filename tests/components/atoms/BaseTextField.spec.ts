import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'

import BaseTextField from '~/components/atoms/BaseTextField.vue'

function mountField(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  return mount(BaseTextField, { props, ...options })
}

const lastEmit = (
  w: ReturnType<typeof mountField>,
  event = 'update:modelValue',
) => w.emitted(event)?.at(-1)

describe('BaseTextField', () => {
  // ── 結構 / 欄位轉發 ───────────────────────────────────────────────────────────
  describe('structure & field forwarding', () => {
    it('renders an <input> inside a BaseFormField', () => {
      const w = mountField()
      expect(w.find('.base-form-field').exists()).toBe(true)
      expect(w.find('input.base-text-field__input').exists()).toBe(true)
    })

    it('forwards the label to BaseFormField', () => {
      const w = mountField({ label: 'Email' })
      expect(w.find('.base-form-field__label-content').text()).toBe('Email')
    })

    it('forwards the error state (root modifier + message)', () => {
      const w = mountField({ error: true, message: 'bad email' })
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('bad email')
    })

    it('associates the label with the input via a generated id', () => {
      const w = mountField({ label: 'Name' })
      const forAttr = w.find('label').attributes('for')
      expect(forAttr).toBeTruthy()
      expect(w.find('input').attributes('id')).toBe(forAttr)
    })
  })

  // ── 原生屬性透傳 ─────────────────────────────────────────────────────────────
  describe('native attributes', () => {
    it('defaults to type="text" and reflects a custom type', () => {
      expect(mountField().find('input').attributes('type')).toBe('text')
      expect(mountField({ type: 'password' }).find('input').attributes('type')).toBe('password')
    })

    it('passes placeholder / name / maxlength / autocomplete / inputmode to the input', () => {
      const w = mountField({
        placeholder: '請輸入',
        name: 'email',
        maxlength: 20,
        autocomplete: 'email',
        inputmode: 'email',
      })
      const input = w.find('input')
      expect(input.attributes('placeholder')).toBe('請輸入')
      expect(input.attributes('name')).toBe('email')
      expect(input.attributes('maxlength')).toBe('20')
      expect(input.attributes('autocomplete')).toBe('email')
      expect(input.attributes('inputmode')).toBe('email')
    })
  })

  // ── v-model ─────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('reflects modelValue onto the input element', async () => {
      const w = mountField({ modelValue: 'abc' })
      await nextTick()
      expect(w.find('input').element.value).toBe('abc')
    })

    it('emits update:modelValue on input', async () => {
      const w = mountField()
      await w.find('input').setValue('hello')
      expect(lastEmit(w)).toEqual(['hello'])
    })

    it('trims the value with the .trim modifier', async () => {
      const w = mountField({ modelModifiers: { trim: true } })
      await w.find('input').setValue('  spaced  ')
      expect(lastEmit(w)).toEqual(['spaced'])
    })

    it('casts to a number with the .number modifier', async () => {
      const w = mountField({ modelModifiers: { number: true } })
      await w.find('input').setValue('42')
      const value = lastEmit(w)?.[0]
      expect(value).toBe(42)
      expect(typeof value).toBe('number')
    })

    it('keeps a non-numeric string as-is under .number (looseToNumber)', async () => {
      const w = mountField({ modelModifiers: { number: true } })
      await w.find('input').setValue('abc')
      expect(lastEmit(w)).toEqual(['abc'])
    })

    it('does not commit intermediate IME composition values, then commits on compositionend', async () => {
      const w = mountField()
      const input = w.find('input')

      await input.trigger('compositionstart')
      input.element.value = 'ㄋㄧˇ' // 組字中（注音）
      await input.trigger('input')
      expect(w.emitted('update:modelValue')).toBeUndefined()

      input.element.value = '你' // 選字完成
      await input.trigger('compositionend')
      expect(lastEmit(w)).toEqual(['你'])
    })

    it('normalizes the displayed value on blur with .trim (drops trailing space)', async () => {
      const w = mountField({ modelModifiers: { trim: true } }, { attachTo: document.body })
      const input = w.find('input')

      input.element.focus()
      input.element.value = 'abc '
      await input.trigger('input')
      // 聚焦中：model 已 trim，但顯示值保留尾隨空白（避免吃字）
      expect(lastEmit(w)).toEqual(['abc'])
      expect(input.element.value).toBe('abc ')

      // 失焦（change）後顯示值正規化
      await input.trigger('change')
      expect(input.element.value).toBe('abc')
    })

    it('with .lazy, emits on change but NOT on input', async () => {
      const w = mountField({ modelModifiers: { lazy: true } }, { attachTo: document.body })
      const input = w.find('input')

      // 真實情境輸入中 input 處於 focus，watcher 的 focus 守衛會保留使用者輸入。
      input.element.focus()
      input.element.value = 'typed'
      await input.trigger('input')
      expect(w.emitted('update:modelValue')).toBeUndefined()

      await input.trigger('change')
      expect(lastEmit(w)).toEqual(['typed'])
    })

    it('forwards native focus / blur events from the input', async () => {
      const w = mountField({}, { attachTo: document.body })
      const input = w.find('input')

      await input.trigger('focus')
      await input.trigger('blur')

      expect(w.emitted('focus')).toHaveLength(1)
      expect(w.emitted('blur')).toHaveLength(1)
      // 轉發的是原生事件物件
      expect(w.emitted('focus')?.[0][0]).toBeInstanceOf(Event)
    })
  })

  // ── prepend / append ─────────────────────────────────────────────────────────
  describe('prepend / append', () => {
    it('renders string prepend / append as text', () => {
      const w = mountField({ prepend: '$', append: 'USD' })
      expect(w.find('.base-text-field__prepend').text()).toBe('$')
      expect(w.find('.base-text-field__append').text()).toBe('USD')
    })

    it('renders a component passed to prepend via <component :is>', () => {
      const Icon = defineComponent({ render: () => h('i', { class: 'my-icon' }) })
      const w = mountField({ prepend: Icon })
      expect(w.find('.base-text-field__prepend .my-icon').exists()).toBe(true)
    })

    it('prefers the #prepend slot over the prepend prop', () => {
      const w = mountField(
        { prepend: '$' },
        { slots: { prepend: () => h('span', { class: 'slotted' }, '€') } },
      )
      expect(w.find('.base-text-field__prepend .slotted').exists()).toBe(true)
      expect(w.find('.base-text-field__prepend').text()).toBe('€')
    })
  })

  // ── showCount ─────────────────────────────────────────────────────────────────
  describe('showCount', () => {
    it('shows the character count', async () => {
      const w = mountField({ showCount: true, modelValue: 'hello' })
      await nextTick()
      expect(w.find('.base-text-field__count').text()).toBe('5')
    })

    it('shows count / maxlength when maxlength is set', async () => {
      const w = mountField({ showCount: true, maxlength: 10, modelValue: 'hi' })
      await nextTick()
      expect(w.find('.base-text-field__count').text()).toBe('2/10')
    })

    it('does not render the count by default', () => {
      expect(mountField({ modelValue: 'hi' }).find('.base-text-field__count').exists()).toBe(false)
    })

    it('disables the count for type="number"', () => {
      const w = mountField({ showCount: true, type: 'number', modelValue: 123 })
      expect(w.find('.base-text-field__count').exists()).toBe(false)
    })

    it('counts grapheme clusters, not UTF-16 units', async () => {
      const w = mountField({ showCount: true, modelValue: '😀😀' })
      await nextTick()
      expect(w.find('.base-text-field__count').text()).toBe('2')
    })
  })

  // ── a11y 接線 ─────────────────────────────────────────────────────────────────
  describe('a11y wiring', () => {
    it('wires aria-describedby to the message when a message exists', () => {
      const w = mountField({ id: 'email', message: 'help text' })
      expect(w.find('input').attributes('aria-describedby')).toBe('email-message')
    })

    it('leaves aria-describedby unset when there is no message', () => {
      const w = mountField({ id: 'email' })
      expect(w.find('input').attributes('aria-describedby')).toBeUndefined()
    })

    it('sets aria-invalid / aria-required from error / required', () => {
      const w = mountField({ error: true, required: true })
      const input = w.find('input')
      expect(input.attributes('aria-invalid')).toBe('true')
      expect(input.attributes('aria-required')).toBe('true')
      expect(input.attributes('required')).toBeDefined()
    })

    it('passes disabled / readonly to the input', () => {
      const w = mountField({ disabled: true, readonly: true })
      const input = w.find('input')
      expect(input.attributes('disabled')).toBeDefined()
      expect(input.attributes('readonly')).toBeDefined()
    })
  })

  // ── validation (rules) ─────────────────────────────────────────────────────────
  describe('validation (rules)', () => {
    const required = (msg = '必填') => (v: string | number) =>
      (v != null && String(v).trim() !== '') || msg

    it('does not show an error before the first blur (touched-gated)', async () => {
      const w = mountField({ rules: [required()], modelValue: '' })
      await nextTick()
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toBe('')
    })

    it('shows the rule error after blur when invalid', async () => {
      const w = mountField({ rules: [required('此欄位必填')], modelValue: '' })
      await w.find('input').trigger('blur')
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('此欄位必填')
    })

    it('re-validates live on input once touched', async () => {
      const w = mountField({ rules: [required('必填')], modelValue: '' })
      await w.find('input').trigger('blur')
      expect(w.find('.base-form-field__message').text()).toContain('必填')

      await w.find('input').setValue('hello')
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    })

    it('an explicit error prop forces the error state regardless of rules', () => {
      const w = mountField({ error: true, message: 'server says no' })
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('server says no')
    })

    it('surfaces the rule error over a static helper message, then falls back to the hint when valid', async () => {
      const w = mountField({ rules: [required('rule msg')], message: 'hint', modelValue: '' })
      // 未碰過：顯示靜態提示
      expect(w.find('.base-form-field__message').text()).toContain('hint')

      // blur 後失敗：驗證訊息取代提示
      await w.find('input').trigger('blur')
      expect(w.find('.base-form-field__message').text()).toContain('rule msg')
      expect(w.find('.base-form-field__message').text()).not.toContain('hint')

      // 修正後通過：退回靜態提示
      await w.find('input').setValue('ok')
      expect(w.find('.base-form-field__message').text()).toContain('hint')
    })

    it('exposes validate() that forces errors and reports validity', async () => {
      const w = mountField({ rules: [required('必填')], modelValue: '' })
      const vm = w.vm as unknown as { validate: () => boolean; reset: () => void }

      expect(vm.validate()).toBe(false)
      await nextTick()
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')

      vm.reset()
      await nextTick()
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    })
  })
})
