import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseSwitch from '~/components/atoms/BaseSwitch.vue'
import type { ValidationRule } from '~/utils/validators'

function mountSwitch(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(BaseSwitch, { props, slots, attachTo: document.body })
}

function inputEl(wrapper: ReturnType<typeof mountSwitch>) {
  return wrapper.find('input[type="checkbox"]')
}

describe('BaseSwitch', () => {
  // ── 渲染 ─────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders a switch input with role="switch" and the label text', () => {
      const wrapper = mountSwitch({ label: '深色模式' })
      expect(inputEl(wrapper).exists()).toBe(true)
      expect(inputEl(wrapper).attributes('role')).toBe('switch')
      expect(wrapper.find('.base-switch__label').text()).toBe('深色模式')
    })

    it('renders label via default slot', () => {
      const wrapper = mountSwitch({}, { default: () => '自訂標籤' })
      expect(wrapper.find('.base-switch__label').text()).toBe('自訂標籤')
    })

    it('renders active / inactive text', () => {
      const wrapper = mountSwitch({ modelValue: true, activeText: '開', inactiveText: '關' })
      expect(wrapper.find('.base-switch__text--active').text()).toBe('開')
      expect(wrapper.find('.base-switch__text--inactive').text()).toBe('關')
    })

    it('applies color and label-placement modifier classes', () => {
      const wrapper = mountSwitch({ color: 'success', labelPlacement: 'right' })
      expect(wrapper.classes()).toContain('base-switch--success')
      expect(wrapper.classes()).toContain('base-switch--label-right')
    })

    it('toggles when clicking the label', async () => {
      const wrapper = mountSwitch({ label: 'x', modelValue: false })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    })
  })

  // ── v-model（boolean）────────────────────────────────────────────────────────
  describe('v-model (boolean)', () => {
    it('reflects modelValue into the native checked state (role=switch maps it automatically)', () => {
      const wrapper = mountSwitch({ modelValue: true })
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(true)
      // 不加冗餘 aria-checked；checked 由瀏覽器映射。
      expect(inputEl(wrapper).attributes('aria-checked')).toBeUndefined()
      // 選中態視覺改由原生 :checked 偽類驅動（狀態來源單一＝DOM），不再輸出 JS 的 --checked class。
      expect(wrapper.classes()).not.toContain('base-switch--checked')
    })

    it('emits true / false on toggle', async () => {
      const wrapper = mountSwitch({ modelValue: false })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
      await wrapper.setProps({ modelValue: true })
      await inputEl(wrapper).setValue(false)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('emits a change event', async () => {
      const wrapper = mountSwitch({ modelValue: false })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('change')).toBeTruthy()
    })
  })

  // ── activeValue / inactiveValue ───────────────────────────────────────────────
  describe('activeValue / inactiveValue', () => {
    it('emits the custom active / inactive values', async () => {
      const wrapper = mountSwitch({ modelValue: 'off', activeValue: 'on', inactiveValue: 'off' })
      await inputEl(wrapper).setValue(true)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['on'])
    })

    it('is checked when modelValue equals activeValue', () => {
      const wrapper = mountSwitch({ modelValue: 'on', activeValue: 'on', inactiveValue: 'off' })
      // 選中態以原生 input.checked 為準（視覺由 :checked 偽類驅動，無 JS class）。
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(true)
    })

    // 只給 inactiveValue（不給 activeValue）：truthy 的初始值不可被誤判為開啟。
    it('treats a truthy inactiveValue as unchecked when only inactiveValue is set', () => {
      const wrapper = mountSwitch({ modelValue: 'off', inactiveValue: 'off' })
      // 選中態以原生 input.checked 為準（視覺由 :checked 偽類驅動，無 JS class）。
      expect((inputEl(wrapper).element as HTMLInputElement).checked).toBe(false)
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('marks the input disabled and applies the modifier class', () => {
      const wrapper = mountSwitch({ disabled: true })
      expect(inputEl(wrapper).attributes('disabled')).toBeDefined()
      expect(wrapper.classes()).toContain('base-switch--disabled')
    })

    it('does not emit when disabled', async () => {
      const wrapper = mountSwitch({ disabled: true, modelValue: false })
      await inputEl(wrapper).trigger('change')
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  // ── 驗證（rules）──────────────────────────────────────────────────────────────
  describe('validation', () => {
    const mustEnable: ValidationRule<unknown> = (v) => v === true || '必須開啟'

    it('does not show an error before being touched', () => {
      const wrapper = mountSwitch({ modelValue: false, rules: [mustEnable] })
      expect(wrapper.find('.base-switch--error').exists()).toBe(false)
    })

    it('shows the error after blur (touch)', async () => {
      const wrapper = mountSwitch({ modelValue: false, rules: [mustEnable] })
      await inputEl(wrapper).trigger('blur')
      expect(wrapper.text()).toContain('必須開啟')
    })

    it('exposes validate() and reset()', async () => {
      const wrapper = mountSwitch({ modelValue: false, rules: [mustEnable] })
      const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
      expect(vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('必須開啟')
      vm.reset()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.base-switch--error').exists()).toBe(false)
    })

    it('wires aria-describedby / aria-invalid when a message shows', async () => {
      const wrapper = mountSwitch({ modelValue: false, message: '請開啟', error: true })
      expect(inputEl(wrapper).attributes('aria-invalid')).toBe('true')
      const describedby = inputEl(wrapper).attributes('aria-describedby')
      expect(describedby).toBeTruthy()
      const messageEl = wrapper.find(`#${describedby}`)
      expect(messageEl.text()).toBe('請開啟')
      // live region 常駐 DOM（v-show）+ aria-atomic，整段被朗讀（對齊 BaseFormField）。
      expect(messageEl.attributes('aria-live')).toBe('polite')
      expect(messageEl.attributes('aria-atomic')).toBe('true')
    })
  })
})
