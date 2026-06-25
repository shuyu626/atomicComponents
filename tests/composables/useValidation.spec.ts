import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

import useValidation from '~/composables/useValidation'
import { required, minLength } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

describe('useValidation', () => {
  it('does not surface errors before touched (touched-gated)', () => {
    const value = ref('')
    const { error, message } = useValidation(() => value.value, () => [required()])

    // 規則其實失敗，但未 touched → 不顯示
    expect(error.value).toBe(false)
    expect(message.value).toBeUndefined()
  })

  it('surfaces the first failing rule message after touch()', () => {
    const value = ref('')
    const { error, message, touch } = useValidation(
      () => value.value,
      () => [required('必填'), minLength(3, '太短')],
    )

    touch()
    // required 先失敗 → 顯示其訊息
    expect(error.value).toBe(true)
    expect(message.value).toBe('必填')
  })

  it('re-validates live on value change once touched', () => {
    const value = ref('')
    const { error, message, touch } = useValidation(
      () => value.value,
      () => [required('必填'), minLength(3, '太短')],
    )

    touch()
    expect(message.value).toBe('必填')

    value.value = 'ab' // required 過、minLength 失敗
    expect(message.value).toBe('太短')

    value.value = 'abc' // 全過
    expect(error.value).toBe(false)
    expect(message.value).toBeUndefined()
  })

  it('validate() forces touched and returns validity', () => {
    const value = ref('')
    const { validate, error } = useValidation(() => value.value, () => [required('必填')])

    // 尚未 touch，但 validate 強制驗
    expect(validate()).toBe(false)
    expect(error.value).toBe(true)

    value.value = 'ok'
    expect(validate()).toBe(true)
    expect(error.value).toBe(false)
  })

  it('reset() clears the error display without changing the value', () => {
    const value = ref('')
    const { touch, reset, error, touched } = useValidation(
      () => value.value,
      () => [required()],
    )

    touch()
    expect(error.value).toBe(true)

    reset()
    expect(touched.value).toBe(false)
    expect(error.value).toBe(false)
    expect(value.value).toBe('') // 值不動
  })

  it('treats empty / undefined rules as always valid', () => {
    const value = ref('')
    const a = useValidation(() => value.value, () => [])
    const b = useValidation(() => value.value, () => undefined)

    a.validate()
    b.validate()
    expect(a.error.value).toBe(false)
    expect(b.error.value).toBe(false)
  })

  it('reacts to a dynamic rules source', () => {
    const value = ref('ab')
    const rules = ref<ValidationRule<string>[]>([])
    const { validate, message } = useValidation(() => value.value, () => rules.value)

    expect(validate()).toBe(true)

    rules.value = [minLength(3, '太短')]
    expect(validate()).toBe(false)
    expect(message.value).toBe('太短')
  })
})
