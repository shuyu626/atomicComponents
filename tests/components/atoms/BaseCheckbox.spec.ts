import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import { BASE_CHECKBOX_GROUP_INJECT_KEY } from '~/components/atoms/BaseCheckboxGroup.vue'
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

    // ── 半受控：使用者實際點擊後離開半選（對齊原生 DOM 行為），即使父層 prop 仍為 true ──
    it('leaves the indeterminate state after a real user click, even if the prop is still true', async () => {
      const wrapper = mountCheckbox({ modelValue: false, indeterminate: true })
      await inputEl(wrapper).setValue(true)

      expect((inputEl(wrapper).element as HTMLInputElement).indeterminate).toBe(false)
      expect(inputEl(wrapper).attributes('aria-checked')).not.toBe('mixed')
      // dash（半選橫線）圖示的 path 消失，改繪 check（勾勾）圖示的 path。
      expect(wrapper.find('.base-checkbox__mark path[d="M3.5 8h9"]').exists()).toBe(false)
      expect(wrapper.find('.base-checkbox__mark path[d="M3.5 8.5l3 3 6-6.5"]').exists()).toBe(true)
      expect(wrapper.classes()).not.toContain('base-checkbox--indeterminate')
    })

    it('re-enters the indeterminate state once the prop changes again after a click', async () => {
      const wrapper = mountCheckbox({ modelValue: false, indeterminate: true })
      await inputEl(wrapper).setValue(true) // 使用者點擊 → 內部狀態清為 false

      // 父層之後重新把 prop 設為 true（即使先經過 false，或直接再設一次 true）都應重新進入半選。
      await wrapper.setProps({ indeterminate: false })
      await wrapper.setProps({ indeterminate: true })

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

// ── 群組模式：rules 交給群組，子元件不建立 / 不暴露 child-level validation ──────────
describe('BaseCheckbox (group mode)', () => {
  function mountInGroup(props: Record<string, unknown> = {}) {
    return mount(BaseCheckbox, {
      props,
      attachTo: document.body,
      global: {
        provide: {
          [BASE_CHECKBOX_GROUP_INJECT_KEY as symbol]: {
            isSelected: () => false,
            toggle: () => {},
            touch: () => {},
            name: ref('group'),
            color: ref('primary'),
            disabled: ref(false),
          },
        },
      },
    })
  }

  it('does not expose validate() / reset() (rules handled by the group)', () => {
    const wrapper = mountInGroup({ value: 'a', rules: [() => '必須勾選'] })
    const vm = wrapper.vm as unknown as { validate?: unknown; reset?: unknown }
    expect(vm.validate).toBeUndefined()
    expect(vm.reset).toBeUndefined()
  })

  it('does not surface its own error / message in group mode', () => {
    const wrapper = mountInGroup({ value: 'a', message: '個別訊息', error: true })
    expect(wrapper.find('.base-checkbox--error').exists()).toBe(false)
    // 訊息區常駐 DOM（v-show），但群組模式下隱藏且無內容。
    expect(wrapper.find('.base-checkbox__message').isVisible()).toBe(false)
  })
})
