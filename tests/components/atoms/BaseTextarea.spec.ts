import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'

import BaseTextarea from '~/components/atoms/BaseTextarea.vue'

function mountField(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  return mount(BaseTextarea, { props, ...options })
}

const lastEmit = (
  w: ReturnType<typeof mountField>,
  event = 'update:modelValue',
) => w.emitted(event)?.at(-1)

describe('BaseTextarea', () => {
  // ── 結構 / 欄位轉發 ───────────────────────────────────────────────────────────
  describe('structure & field forwarding', () => {
    it('renders a <textarea> inside a BaseFormField', () => {
      const w = mountField()
      expect(w.find('.base-form-field').exists()).toBe(true)
      expect(w.find('textarea.base-textarea__input').exists()).toBe(true)
    })

    it('forwards the label to BaseFormField', () => {
      const w = mountField({ label: '自我介紹' })
      expect(w.find('.base-form-field__label-content').text()).toBe('自我介紹')
    })

    it('forwards the error state (root modifier + message)', () => {
      const w = mountField({ error: true, message: '內容過長' })
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('內容過長')
    })

    it('associates the label with the textarea via a generated id', () => {
      const w = mountField({ label: '備註' })
      const forAttr = w.find('label').attributes('for')
      expect(forAttr).toBeTruthy()
      expect(w.find('textarea').attributes('id')).toBe(forAttr)
    })
  })

  // ── 原生屬性透傳 ─────────────────────────────────────────────────────────────
  describe('native attributes', () => {
    it('defaults rows to 2 and reflects a custom rows', () => {
      expect(mountField().find('textarea').attributes('rows')).toBe('2')
      expect(mountField({ rows: 5 }).find('textarea').attributes('rows')).toBe('5')
    })

    it('passes placeholder / name / maxlength / autocomplete to the textarea', () => {
      const w = mountField({
        placeholder: '請輸入',
        name: 'bio',
        maxlength: 200,
        autocomplete: 'off',
      })
      const el = w.find('textarea')
      expect(el.attributes('placeholder')).toBe('請輸入')
      expect(el.attributes('name')).toBe('bio')
      expect(el.attributes('maxlength')).toBe('200')
      expect(el.attributes('autocomplete')).toBe('off')
    })
  })

  // ── v-model ─────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('reflects modelValue onto the textarea element', async () => {
      const w = mountField({ modelValue: 'abc' })
      await nextTick()
      expect(w.find('textarea').element.value).toBe('abc')
    })

    it('emits update:modelValue on input', async () => {
      const w = mountField()
      await w.find('textarea').setValue('hello\nworld')
      expect(lastEmit(w)).toEqual(['hello\nworld'])
    })

    it('trims the value with the .trim modifier', async () => {
      const w = mountField({ modelModifiers: { trim: true } })
      await w.find('textarea').setValue('  spaced  ')
      expect(lastEmit(w)).toEqual(['spaced'])
    })

    it('does not commit intermediate IME composition values, then commits on compositionend', async () => {
      const w = mountField()
      const el = w.find('textarea')

      await el.trigger('compositionstart')
      el.element.value = 'ㄋㄧˇ' // 組字中（注音）
      await el.trigger('input')
      expect(w.emitted('update:modelValue')).toBeUndefined()

      el.element.value = '你' // 選字完成
      await el.trigger('compositionend')
      expect(lastEmit(w)).toEqual(['你'])
    })

    it('normalizes the displayed value on blur with .trim (drops trailing space)', async () => {
      const w = mountField({ modelModifiers: { trim: true } }, { attachTo: document.body })
      const el = w.find('textarea')

      el.element.focus()
      el.element.value = 'abc '
      await el.trigger('input')
      // 聚焦中：model 已 trim，但顯示值保留尾隨空白（避免吃字）
      expect(lastEmit(w)).toEqual(['abc'])
      expect(el.element.value).toBe('abc ')

      // 失焦（change）後顯示值正規化
      await el.trigger('change')
      expect(el.element.value).toBe('abc')
    })

    it('with .lazy, emits on change but NOT on input', async () => {
      const w = mountField({ modelModifiers: { lazy: true } }, { attachTo: document.body })
      const el = w.find('textarea')

      el.element.focus()
      el.element.value = 'typed'
      await el.trigger('input')
      expect(w.emitted('update:modelValue')).toBeUndefined()

      await el.trigger('change')
      expect(lastEmit(w)).toEqual(['typed'])
    })

    it('forwards native focus / blur events from the textarea', async () => {
      const w = mountField({}, { attachTo: document.body })
      const el = w.find('textarea')

      await el.trigger('focus')
      await el.trigger('blur')

      expect(w.emitted('focus')).toHaveLength(1)
      expect(w.emitted('blur')).toHaveLength(1)
      expect(w.emitted('focus')?.[0][0]).toBeInstanceOf(Event)
    })
  })

  // ── prepend / append ─────────────────────────────────────────────────────────
  describe('prepend / append', () => {
    it('renders string prepend / append as text', () => {
      const w = mountField({ prepend: '#', append: '字' })
      expect(w.find('.base-textarea__prepend').text()).toBe('#')
      expect(w.find('.base-textarea__append').text()).toBe('字')
    })

    it('renders a component passed to prepend via <component :is>', () => {
      const Icon = defineComponent({ render: () => h('i', { class: 'my-icon' }) })
      const w = mountField({ prepend: Icon })
      expect(w.find('.base-textarea__prepend .my-icon').exists()).toBe(true)
    })

    it('prefers the #prepend slot over the prepend prop', () => {
      const w = mountField(
        { prepend: '#' },
        { slots: { prepend: () => h('span', { class: 'slotted' }, '@') } },
      )
      expect(w.find('.base-textarea__prepend .slotted').exists()).toBe(true)
      expect(w.find('.base-textarea__prepend').text()).toBe('@')
    })
  })

  // ── showCount ─────────────────────────────────────────────────────────────────
  describe('showCount', () => {
    it('shows the character count', async () => {
      const w = mountField({ showCount: true, modelValue: 'hello' })
      await nextTick()
      expect(w.find('.base-textarea__count').text()).toBe('5')
    })

    it('shows count / maxlength when maxlength is set', async () => {
      const w = mountField({ showCount: true, maxlength: 100, modelValue: 'hi' })
      await nextTick()
      expect(w.find('.base-textarea__count').text()).toBe('2/100')
    })

    it('does not render the count by default', () => {
      expect(mountField({ modelValue: 'hi' }).find('.base-textarea__count').exists()).toBe(false)
    })

    it('counts grapheme clusters, not UTF-16 units', async () => {
      const w = mountField({ showCount: true, modelValue: '😀😀' })
      await nextTick()
      expect(w.find('.base-textarea__count').text()).toBe('2')
    })
  })

  // ── autosize ──────────────────────────────────────────────────────────────────
  describe('autosize', () => {
    it('keeps resize:vertical (manual) when autosize is off', () => {
      const w = mountField()
      expect(w.find('.base-textarea').classes()).not.toContain('base-textarea--autosize')
    })

    it('applies the autosize modifier class when enabled', () => {
      const w = mountField({ autosize: true })
      expect(w.find('.base-textarea').classes()).toContain('base-textarea--autosize')
    })
  })

  // ── resize ────────────────────────────────────────────────────────────────────
  describe('resize', () => {
    it('defaults to vertical', () => {
      const w = mountField()
      expect(w.find('textarea').attributes('style')).toContain('--textarea-resize: vertical')
    })

    it.each(['none', 'vertical', 'horizontal', 'both'] as const)(
      'reflects resize=%s onto --textarea-resize',
      (value) => {
        const w = mountField({ resize: value })
        expect(w.find('textarea').attributes('style')).toContain(`--textarea-resize: ${value}`)
      },
    )

    it('forces none when autosize is enabled, overriding the resize prop', () => {
      const w = mountField({ autosize: true, resize: 'both' })
      expect(w.find('textarea').attributes('style')).toContain('--textarea-resize: none')
    })
  })

  // ── a11y 接線 ─────────────────────────────────────────────────────────────────
  describe('a11y wiring', () => {
    it('wires aria-describedby to the message when a message exists', () => {
      const w = mountField({ id: 'bio', message: 'help text' })
      expect(w.find('textarea').attributes('aria-describedby')).toBe('bio-message')
    })

    it('leaves aria-describedby unset when there is no message', () => {
      const w = mountField({ id: 'bio' })
      expect(w.find('textarea').attributes('aria-describedby')).toBeUndefined()
    })

    it('sets aria-invalid / aria-required from error / required', () => {
      const w = mountField({ error: true, required: true })
      const el = w.find('textarea')
      expect(el.attributes('aria-invalid')).toBe('true')
      expect(el.attributes('aria-required')).toBe('true')
      expect(el.attributes('required')).toBeDefined()
    })

    it('passes disabled / readonly to the textarea', () => {
      const w = mountField({ disabled: true, readonly: true })
      const el = w.find('textarea')
      expect(el.attributes('disabled')).toBeDefined()
      expect(el.attributes('readonly')).toBeDefined()
    })
  })

  // ── validation (rules) ─────────────────────────────────────────────────────────
  describe('validation (rules)', () => {
    const minLen = (n: number, msg = '太短') => (v: string) =>
      String(v).length >= n || msg

    it('does not show an error before the first blur (touched-gated)', async () => {
      const w = mountField({ rules: [minLen(5)], modelValue: 'ab' })
      await nextTick()
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    })

    it('shows the rule error after blur when invalid', async () => {
      const w = mountField({ rules: [minLen(5, '至少 5 字')], modelValue: 'ab' })
      await w.find('textarea').trigger('blur')
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('至少 5 字')
    })

    it('re-validates live on input once touched', async () => {
      const w = mountField({ rules: [minLen(5, '太短')], modelValue: 'ab' })
      await w.find('textarea').trigger('blur')
      expect(w.find('.base-form-field__message').text()).toContain('太短')

      await w.find('textarea').setValue('hello world')
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    })

    it('surfaces the rule error over a static helper message, then falls back to the hint when valid', async () => {
      const w = mountField({ rules: [minLen(5, 'rule msg')], message: 'hint', modelValue: 'ab' })
      expect(w.find('.base-form-field__message').text()).toContain('hint')

      await w.find('textarea').trigger('blur')
      expect(w.find('.base-form-field__message').text()).toContain('rule msg')
      expect(w.find('.base-form-field__message').text()).not.toContain('hint')

      await w.find('textarea').setValue('hello world')
      expect(w.find('.base-form-field__message').text()).toContain('hint')
    })

    it('exposes validate() / reset()', async () => {
      const w = mountField({ rules: [minLen(5, '太短')], modelValue: 'ab' })
      const vm = w.vm as unknown as { validate: () => boolean; reset: () => void }

      expect(vm.validate()).toBe(false)
      await nextTick()
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')

      vm.reset()
      await nextTick()
      expect(w.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    })
  })

  // ── 父層綁定 v-model（受控模式）──────────────────────────────────────────────
  // 與 BaseTextField 同型的守護：SSR 快照 :value 不得在父層驅動的 re-render 蓋掉輸入
  //（Vue renderer 對 value prop 不做同值跳過）。
  describe('controlled v-model (parent-bound)', () => {
    it('keeps typed text on parent-driven re-render (no stomp back to the SSR snapshot)', async () => {
      const Host = defineComponent({
        components: { BaseTextarea },
        setup() {
          const text = ref('old')
          return { text }
        },
        template: '<BaseTextarea v-model="text" />',
      })
      const w = mount(Host, { attachTo: document.body })
      const textarea = w.find<HTMLTextAreaElement>('textarea')

      textarea.element.focus()
      await textarea.setValue('ab')
      await nextTick()

      expect(w.vm.text).toBe('ab')
      expect(textarea.element.value).toBe('ab')
      w.unmount()
    })
  })
})
