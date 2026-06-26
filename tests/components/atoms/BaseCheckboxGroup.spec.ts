import { describe, it, expect } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BaseCheckboxGroup from '~/components/atoms/BaseCheckboxGroup.vue'
import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import type { ValidationRule } from '~/utils/validators'

const fruits = [
  { value: 'apple', label: '蘋果' },
  { value: 'banana', label: '香蕉' },
  { value: 'cherry', label: '櫻桃' },
]

function mountGroup(props: Record<string, unknown> = {}, childProps: Record<string, unknown> = {}) {
  return mount(BaseCheckboxGroup, {
    props,
    slots: {
      default: () => fruits.map((f) => h(BaseCheckbox, { value: f.value, label: f.label, ...childProps })),
    },
    attachTo: document.body,
  })
}

function boxes(wrapper: ReturnType<typeof mountGroup>) {
  return wrapper.findAll('input[type="checkbox"]')
}

describe('BaseCheckboxGroup', () => {
  it('renders the child checkboxes from the default slot', () => {
    const wrapper = mountGroup({ modelValue: [] })
    expect(boxes(wrapper)).toHaveLength(3)
    expect(wrapper.findAll('.base-checkbox__label').map((l) => l.text())).toEqual(['蘋果', '香蕉', '櫻桃'])
  })

  it('reflects the group modelValue into child checked state', () => {
    const wrapper = mountGroup({ modelValue: ['banana'] })
    expect(boxes(wrapper).map((b) => (b.element as HTMLInputElement).checked)).toEqual([false, true, false])
  })

  it('adds a value to the array when a child is checked', async () => {
    const wrapper = mountGroup({ modelValue: [] })
    await boxes(wrapper)[0].setValue(true)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['apple']])
  })

  it('removes a value from the array when a child is unchecked', async () => {
    const wrapper = mountGroup({ modelValue: ['apple', 'banana'] })
    await boxes(wrapper)[0].setValue(false)
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['banana']])
  })

  it('keeps a Set container when the model is a Set', async () => {
    const wrapper = mountGroup({ modelValue: new Set(['apple']) })
    await boxes(wrapper)[1].setValue(true)
    const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
    expect(value).toBeInstanceOf(Set)
    expect([...(value as Set<string>)]).toEqual(['apple', 'banana'])
  })

  it('broadcasts disabled to children', () => {
    const wrapper = mountGroup({ modelValue: [], disabled: true })
    expect(boxes(wrapper).every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('broadcasts color to children', () => {
    const wrapper = mountGroup({ modelValue: [], color: 'success' })
    expect(wrapper.findAll('.base-checkbox').every((c) => c.classes().includes('base-checkbox--success'))).toBe(true)
  })

  it('renders the group label via BaseFormField', () => {
    const wrapper = mountGroup({ modelValue: [], label: '選擇水果' })
    expect(wrapper.find('.base-form-field__label').text()).toContain('選擇水果')
  })

  it('shows a group-level validation error after a toggle (touch)', async () => {
    const atLeastOne: ValidationRule<unknown> = (v) =>
      (Array.isArray(v) ? v.length > 0 : (v as Set<unknown>)?.size > 0) || '至少選一項'
    const wrapper = mountGroup({ modelValue: ['apple'], rules: [atLeastOne] })
    // 取消唯一一項 → 空集合 → touched 後顯示錯誤
    await boxes(wrapper)[0].setValue(false)
    await nextTick()
    expect(wrapper.text()).toContain('至少選一項')
  })

  it('shows the group error when a child is blurred without changing (touch)', async () => {
    const atLeastOne: ValidationRule<unknown> = (v) =>
      (Array.isArray(v) ? v.length > 0 : (v as Set<unknown>)?.size > 0) || '至少選一項'
    const wrapper = mountGroup({ modelValue: [], rules: [atLeastOne] })
    await boxes(wrapper)[0].trigger('blur')
    await nextTick()
    expect(wrapper.text()).toContain('至少選一項')
  })

  it('exposes validate() and reset()', async () => {
    const atLeastOne: ValidationRule<unknown> = (v) =>
      (Array.isArray(v) ? v.length > 0 : (v as Set<unknown>)?.size > 0) || '至少選一項'
    const wrapper = mountGroup({ modelValue: [], rules: [atLeastOne] })
    const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
    expect(vm.validate()).toBe(false)
    await nextTick()
    expect(wrapper.text()).toContain('至少選一項')
    vm.reset()
    await nextTick()
    expect(wrapper.find('.base-form-field--error').exists()).toBe(false)
  })

  it('per-child color overrides the group color', () => {
    const wrapper = mountGroup({ modelValue: [], color: 'success' }, { color: 'danger' })
    expect(wrapper.findAll('.base-checkbox').every((c) => c.classes().includes('base-checkbox--danger'))).toBe(true)
  })
})
