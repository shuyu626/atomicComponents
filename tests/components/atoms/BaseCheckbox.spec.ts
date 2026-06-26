import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import type { ValidationRule } from '~/utils/validators'

function mountCheckbox(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(BaseCheckbox, { props, slots, attachTo: document.body })
}

function inputEl(wrapper: ReturnType<typeof mountCheckbox>) {
  return wrapper.find('input[type="checkbox"]')
}

describe('BaseCheckbox (standalone)', () => {
  // ── 渲染 ─────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders a checkbox input and the label text', () => {
      const wrapper = mountCheckbox({ label: '同意條款' })
      expect(inputEl(wrapper).exists()).toBe(true)
      expect(wrapper.find('.base-checkbox__label').text()).toBe('同意條款')
    })

    it('renders label via default slot', () => {
      const wrapper = mountCheckbox({}, { default: () => '自訂標籤' })
      expect(wrapper.find('.base-checkbox__label').text()).toBe('自訂標籤')
    })

    it('applies color and label-placement modifier classes', () => {
      const wrapper = mountCheckbox({ color: 'success', labelPlacement: 'left' })
      expect(wrapper.classes()).toContain('base-checkbox--success')
      expect(wrapper.classes()).toContain('base-checkbox--label-left')
    })

    it('associates the label with the input (clicking label toggles)', async () => {
      const wrapper = mountCheckbox({ label: 'x', modelValue: false })
      await wrapper.find('label').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    })
  })

  // ── v-model（boolean）────────────────────────────────────────────────────────
  describe('v-model (boolean)', () => {
    it('reflects modelValue into the input checked state', async () => {
      const wrapper = mountCheckbox({ modelValue: true })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(true)
      expect(inputEl(wrapper).attributes('aria-checked')).toBe('true')
    })

    it('emits true / false on toggle', async () => {
      const wrapper = mountCheckbox({ modelValue: false })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
      await wrapper.setProps({ modelValue: true })
      await inputEl(wrapper).setValue(false)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('emits a change event', async () => {
      const wrapper = mountCheckbox({ modelValue: false })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('change')).toBeTruthy()
    })
  })

  // ── trueValue / falseValue ────────────────────────────────────────────────────
  describe('trueValue / falseValue', () => {
    it('emits the custom true / false values', async () => {
      const wrapper = mountCheckbox({ modelValue: 'no', trueValue: 'yes', falseValue: 'no' })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['yes'])
    })

    it('is checked when modelValue equals trueValue', () => {
      const wrapper = mountCheckbox({ modelValue: 'yes', trueValue: 'yes', falseValue: 'no' })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(true)
    })
  })

  // ── indeterminate ─────────────────────────────────────────────────────────────
  describe('indeterminate', () => {
    it('sets the DOM indeterminate property and aria-checked="mixed"', () => {
      const wrapper = mountCheckbox({ modelValue: false, indeterminate: true })
      expect((inputEl(wrapper).element as HTMLInputElement).indeterminate).toBe(true)
      expect(inputEl(wrapper).attributes('aria-checked')).toBe('mixed')
      expect(wrapper.classes()).toContain('base-checkbox--indeterminate')
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('marks the input disabled and applies the modifier class', () => {
      const wrapper = mountCheckbox({ disabled: true })
      expect(inputEl(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('base-checkbox--disabled')
    })
  })

  // ── 驗證（rules）──────────────────────────────────────────────────────────────
  describe('validation', () => {
    const mustAccept: ValidationRule<unknown> = (v) => v === true || '必須勾選'

    it('does not show an error before being touched', () => {
      const wrapper = mountCheckbox({ modelValue: false, rules: [mustAccept] })
      expect(wrapper.find('.base-checkbox--error').exists()).toBe(false)
    })

    it('shows the error after change (touch)', async () => {
      const wrapper = mountCheckbox({ modelValue: false, rules: [mustAccept] })
      await inputEl(wrapper).setValue(false) // 觸發 change（仍未勾）→ touched
      // setValue(false) 不一定改變值，改用 blur 觸發 touch
      await inputEl(wrapper).trigger('blur')
      expect(wrapper.text()).toContain('必須勾選')
    })

    it('exposes validate() and reset()', async () => {
      const wrapper = mountCheckbox({ modelValue: false, rules: [mustAccept] })
      const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
      expect(vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('必須勾選')
      vm.reset()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.base-checkbox--error').exists()).toBe(false)
    })
  })
})
