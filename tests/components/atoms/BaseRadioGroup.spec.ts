import { describe, it, expect } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BaseRadioGroup from '~/components/atoms/BaseRadioGroup.vue'
import BaseRadio from '~/components/atoms/BaseRadio.vue'
import type { ValidationRule } from '~/utils/validators'

const plans = [
  { value: 'free', label: '免費' },
  { value: 'pro', label: '專業' },
  { value: 'team', label: '團隊' },
]

function mountGroup(props: Record<string, unknown> = {}, childProps: Record<string, unknown> = {}) {
  return mount(BaseRadioGroup, {
    props,
    slots: {
      default: () => plans.map((p) => h(BaseRadio, { value: p.value, label: p.label, ...childProps })),
    },
    attachTo: document.body,
  })
}

function radios(wrapper: ReturnType<typeof mountGroup>) {
  return wrapper.findAll('input[type="radio"]')
}

describe('BaseRadioGroup', () => {
  it('renders the child radios from the default slot', () => {
    const wrapper = mountGroup({ modelValue: undefined })
    expect(radios(wrapper)).toHaveLength(3)
    expect(wrapper.findAll('.base-radio__label').map((l) => l.text())).toEqual(['免費', '專業', '團隊'])
  })

  it('reflects the group modelValue into child checked state', () => {
    const wrapper = mountGroup({ modelValue: 'pro' })
    expect(radios(wrapper).map((r) => (r.element as HTMLInputElement).checked)).toEqual([false, true, false])
  })

  it('sets the model to the selected value', async () => {
    const wrapper = mountGroup({ modelValue: undefined })
    await radios(wrapper)[0].setValue()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['free'])
  })

  it('replaces the previous selection when another is chosen (single select)', async () => {
    const wrapper = mountGroup({ modelValue: 'free' })
    await radios(wrapper)[2].setValue()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['team'])
  })

  it('shares one auto-generated name across all radios (native arrow-key grouping)', () => {
    const wrapper = mountGroup({ modelValue: undefined })
    const names = radios(wrapper).map((r) => r.attributes('name'))
    expect(names[0]).toBeTruthy()
    expect(new Set(names).size).toBe(1)
  })

  it('broadcasts an explicit name to children', () => {
    const wrapper = mountGroup({ modelValue: undefined, name: 'plan' })
    expect(radios(wrapper).every((r) => r.attributes('name') === 'plan')).toBe(true)
  })

  it('broadcasts disabled to children', () => {
    const wrapper = mountGroup({ modelValue: undefined, disabled: true })
    expect(radios(wrapper).every((r) => r.attributes('disabled') !== undefined)).toBe(true)
  })

  it('broadcasts color to children', () => {
    const wrapper = mountGroup({ modelValue: undefined, color: 'success' })
    expect(wrapper.findAll('.base-radio').every((c) => c.classes().includes('base-radio--success'))).toBe(true)
  })

  it('marks the items container as a radiogroup', () => {
    const wrapper = mountGroup({ modelValue: undefined })
    expect(wrapper.find('[role="radiogroup"]').exists()).toBe(true)
  })

  it('renders the group label via BaseFormField', () => {
    const wrapper = mountGroup({ modelValue: undefined, label: '選擇方案' })
    expect(wrapper.find('.base-form-field__label').text()).toContain('選擇方案')
  })

  it('marks the radiogroup container aria-invalid on error', () => {
    const wrapper = mountGroup({ modelValue: undefined, error: true })
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-invalid')).toBe('true')
  })

  it('omits aria-invalid when there is no error', () => {
    const wrapper = mountGroup({ modelValue: undefined })
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-invalid')).toBeUndefined()
  })

  it('marks the radiogroup container aria-invalid when a rule fails (touch)', async () => {
    const required: ValidationRule<unknown> = (v) => v != null || '請選擇一項'
    const wrapper = mountGroup({ modelValue: undefined, rules: [required] })
    const vm = wrapper.vm as unknown as { validate: () => boolean }
    vm.validate()
    await nextTick()
    expect(wrapper.find('[role="radiogroup"]').attributes('aria-invalid')).toBe('true')
  })

  it('shows a group-level validation error after select (touch)', async () => {
    const required: ValidationRule<unknown> = (v) => v != null || '請選擇一項'
    const wrapper = mountGroup({ modelValue: undefined, rules: [required] })
    const vm = wrapper.vm as unknown as { validate: () => boolean }
    expect(vm.validate()).toBe(false)
    await nextTick()
    expect(wrapper.text()).toContain('請選擇一項')
  })

  it('shows the group error when a child is blurred without selecting (touch)', async () => {
    const required: ValidationRule<unknown> = (v) => v != null || '請選擇一項'
    const wrapper = mountGroup({ modelValue: undefined, rules: [required] })
    await radios(wrapper)[0].trigger('blur')
    await nextTick()
    expect(wrapper.text()).toContain('請選擇一項')
  })

  it('exposes validate() and reset()', async () => {
    const required: ValidationRule<unknown> = (v) => v != null || '請選擇一項'
    const wrapper = mountGroup({ modelValue: undefined, rules: [required] })
    const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
    expect(vm.validate()).toBe(false)
    await nextTick()
    expect(wrapper.text()).toContain('請選擇一項')
    vm.reset()
    await nextTick()
    expect(wrapper.find('.base-form-field--error').exists()).toBe(false)
  })

  it('per-child color overrides the group color', () => {
    const wrapper = mountGroup({ modelValue: undefined, color: 'success' }, { color: 'danger' })
    expect(wrapper.findAll('.base-radio').every((c) => c.classes().includes('base-radio--danger'))).toBe(true)
  })
})
