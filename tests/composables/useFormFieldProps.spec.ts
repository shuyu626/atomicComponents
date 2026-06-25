import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

import useFormFieldProps from '~/composables/useFormFieldProps'

describe('useFormFieldProps', () => {
  it('picks the field-level props (incl. id) and drops control-specific extras', () => {
    const fieldProps = useFormFieldProps({
      // 欄位語意 props + id（應保留並轉發）
      id: 'email',
      label: 'Email',
      labelPlacement: 'top',
      labelWidth: 120,
      hideLabel: false,
      message: 'help',
      error: true,
      required: true,
      disabled: false,
      readonly: false,
      // 控制項自有 props（應被濾掉）
      placeholder: 'you@example.com',
      modelValue: '',
    } as never)

    expect(fieldProps.value).toEqual({
      id: 'email',
      label: 'Email',
      labelPlacement: 'top',
      labelWidth: 120,
      hideLabel: false,
      message: 'help',
      error: true,
      required: true,
      disabled: false,
      readonly: false,
    })
    expect('placeholder' in fieldProps.value).toBe(false)
    expect('modelValue' in fieldProps.value).toBe(false)
  })

  it('accepts a ref / getter source and stays reactive', () => {
    const source = ref({ label: 'A', error: false })
    const fieldProps = useFormFieldProps(source)
    expect(fieldProps.value).toEqual({ label: 'A', error: false })

    source.value = { label: 'B', error: true }
    expect(fieldProps.value).toEqual({ label: 'B', error: true })
  })

  it('only includes keys actually present on the source', () => {
    const fieldProps = useFormFieldProps({ label: 'Only label' })
    expect(fieldProps.value).toEqual({ label: 'Only label' })
  })
})
