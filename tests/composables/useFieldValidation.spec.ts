import { describe, it, expect } from 'vitest'
import { computed, ref } from 'vue'

import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import { required } from '~/utils/validators'

/** 以純 ref 假造驗證來源（結構相容 useValidation 的 error / message）。 */
function fakeValidation(initial: { error?: boolean; message?: string } = {}) {
  const error = ref(initial.error ?? false)
  const message = ref<string | undefined>(initial.message)
  return {
    error,
    message,
    source: {
      error: computed(() => error.value),
      message: computed(() => message.value),
    },
  }
}

describe('useFieldValidation — displayError 合併', () => {
  it('props.error 為真時即為錯誤（即使驗證通過）', () => {
    const { source } = fakeValidation({ error: false })
    const { displayError } = useFieldValidation({ error: true }, source)
    expect(displayError.value).toBe(true)
  })

  it('驗證失敗時即為錯誤（即使 props.error 為假 / 未提供）', () => {
    const { source } = fakeValidation({ error: true, message: '必填' })
    const a = useFieldValidation({ error: false }, source)
    const b = useFieldValidation({}, source)
    expect(a.displayError.value).toBe(true)
    expect(b.displayError.value).toBe(true)
  })

  it('兩者皆無錯誤時為 false', () => {
    const { source } = fakeValidation()
    const { displayError } = useFieldValidation({}, source)
    expect(displayError.value).toBe(false)
  })
})

describe('useFieldValidation — displayMessage 優先序', () => {
  it('驗證錯誤訊息優先於 props.message', () => {
    const { source } = fakeValidation({ error: true, message: '必填' })
    const { displayMessage } = useFieldValidation({ message: '說明文字' }, source)
    expect(displayMessage.value).toBe('必填')
  })

  it('無驗證訊息時退回 props.message', () => {
    const { source } = fakeValidation()
    const { displayMessage } = useFieldValidation({ message: '說明文字' }, source)
    expect(displayMessage.value).toBe('說明文字')
  })

  it('兩者皆無時為 undefined', () => {
    const { source } = fakeValidation()
    const { displayMessage } = useFieldValidation({}, source)
    expect(displayMessage.value).toBeUndefined()
  })
})

describe('useFieldValidation — fieldProps', () => {
  it('以合併後的 error / message 覆寫，並濾掉控制項自有 props', () => {
    const { source } = fakeValidation({ error: true, message: '必填' })
    const { fieldProps } = useFieldValidation(
      () => ({
        label: 'Email',
        message: '說明文字',
        error: false,
        required: true,
        // 控制項自有 prop（應被 useFormFieldProps 濾掉）
        placeholder: 'you@example.com',
      } as BaseFormFieldProps),
      source,
    )

    expect(fieldProps.value.label).toBe('Email')
    expect(fieldProps.value.required).toBe(true)
    expect(fieldProps.value.error).toBe(true) // 驗證失敗覆寫 props.error
    expect(fieldProps.value.message).toBe('必填') // 驗證訊息覆寫 props.message
    expect('placeholder' in fieldProps.value).toBe(false)
  })

  it('對 props getter 與驗證來源皆保持響應性', () => {
    const props = ref<BaseFormFieldProps>({ error: false, message: '說明文字' })
    const { error, message, source } = fakeValidation()
    const { displayError, displayMessage, fieldProps } = useFieldValidation(
      () => props.value,
      source,
    )

    expect(displayError.value).toBe(false)
    expect(displayMessage.value).toBe('說明文字')

    // 驗證轉為失敗 → error / message 跟著變
    error.value = true
    message.value = '太短'
    expect(displayError.value).toBe(true)
    expect(displayMessage.value).toBe('太短')
    expect(fieldProps.value.error).toBe(true)
    expect(fieldProps.value.message).toBe('太短')

    // 驗證恢復、改由 props 強制錯誤（如 server 端驗證）
    error.value = false
    message.value = undefined
    props.value = { error: true, message: '伺服器拒絕' }
    expect(displayError.value).toBe(true)
    expect(displayMessage.value).toBe('伺服器拒絕')
  })

  it('與真實 useValidation 組合可用（touched-gated）', () => {
    const value = ref('')
    const validation = useValidation(() => value.value, () => [required('必填')])
    const { displayError, displayMessage } = useFieldValidation(
      { message: '請輸入姓名' },
      validation,
    )

    // 未 touched：顯示靜態提示
    expect(displayError.value).toBe(false)
    expect(displayMessage.value).toBe('請輸入姓名')

    // touch 後：驗證錯誤訊息優先
    validation.touch()
    expect(displayError.value).toBe(true)
    expect(displayMessage.value).toBe('必填')

    // 補上值：恢復靜態提示
    value.value = 'Mira'
    expect(displayError.value).toBe(false)
    expect(displayMessage.value).toBe('請輸入姓名')
  })
})
