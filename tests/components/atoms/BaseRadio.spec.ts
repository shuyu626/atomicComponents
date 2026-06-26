import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseRadio from '~/components/atoms/BaseRadio.vue'
import type { ValidationRule } from '~/utils/validators'

function mountRadio(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(BaseRadio, { props, slots, attachTo: document.body })
}

function inputEl(wrapper: ReturnType<typeof mountRadio>) {
  return wrapper.find('input[type="radio"]')
}

describe('BaseRadio (standalone)', () => {
  // ── 渲染 ─────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders a radio input and the label text', () => {
      const wrapper = mountRadio({ value: 'a', label: '選項 A' })
      expect(inputEl(wrapper).exists()).toBe(true)
      expect(wrapper.find('.base-radio__label').text()).toBe('選項 A')
    })

    it('renders label via default slot', () => {
      const wrapper = mountRadio({ value: 'a' }, { default: () => '自訂標籤' })
      expect(wrapper.find('.base-radio__label').text()).toBe('自訂標籤')
    })

    it('applies color and label-placement modifier classes', () => {
      const wrapper = mountRadio({ value: 'a', color: 'success', labelPlacement: 'left' })
      expect(wrapper.classes()).toContain('base-radio--success')
      expect(wrapper.classes()).toContain('base-radio--label-left')
    })

    it('associates the label with the input (clicking label selects)', async () => {
      const wrapper = mountRadio({ value: 'a', label: 'x', modelValue: undefined })
      await wrapper.find('label').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])
    })
  })

  // ── v-model ──────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('is checked when modelValue equals value', () => {
      const wrapper = mountRadio({ value: 'a', modelValue: 'a' })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(true)
      expect(wrapper.classes()).toContain('base-radio--checked')
    })

    it('is not checked when modelValue differs', () => {
      const wrapper = mountRadio({ value: 'a', modelValue: 'b' })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(false)
    })

    it('is not checked when value is omitted (no undefined === undefined match)', () => {
      const wrapper = mountRadio({ modelValue: undefined })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(false)
      expect(wrapper.classes()).not.toContain('base-radio--checked')
    })

    it('emits its value on select', async () => {
      const wrapper = mountRadio({ value: 'a', modelValue: undefined })
      await inputEl(wrapper).setValue()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['a'])
    })

    it('emits a change event', async () => {
      const wrapper = mountRadio({ value: 'a', modelValue: undefined })
      await inputEl(wrapper).setValue()
      expect(wrapper.emitted('change')).toBeTruthy()
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('marks the input disabled and applies the modifier class', () => {
      const wrapper = mountRadio({ value: 'a', disabled: true })
      expect(inputEl(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('base-radio--disabled')
    })
  })

  // ── 驗證（rules）──────────────────────────────────────────────────────────────
  describe('validation', () => {
    const mustSelect: ValidationRule<unknown> = (v) => v != null || '必選'

    it('does not show an error before being touched', () => {
      const wrapper = mountRadio({ value: 'a', modelValue: undefined, rules: [mustSelect] })
      expect(wrapper.find('.base-radio--error').exists()).toBe(false)
    })

    it('shows the error after blur (touch)', async () => {
      const wrapper = mountRadio({ value: 'a', modelValue: undefined, rules: [mustSelect] })
      await inputEl(wrapper).trigger('blur')
      expect(wrapper.text()).toContain('必選')
    })

    it('exposes validate() and reset()', async () => {
      const wrapper = mountRadio({ value: 'a', modelValue: undefined, rules: [mustSelect] })
      const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
      expect(vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('必選')
      vm.reset()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.base-radio--error').exists()).toBe(false)
    })
  })
})
