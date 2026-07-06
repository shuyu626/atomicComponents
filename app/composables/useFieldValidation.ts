import { computed, toValue } from 'vue'

import type { ComputedRef, MaybeRefOrGetter } from 'vue'

import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFormFieldProps from '~/composables/useFormFieldProps'

/**
 * 驗證來源的最小子集：`useValidation` 的回傳值即符合此形狀（結構相容），
 * 抽成獨立介面讓本 composable 不與 `useValidation` 綁死。
 */
export interface FieldValidationSource {
  /** 驗證是否失敗（touched-gated）。 */
  error: ComputedRef<boolean>
  /** 第一條失敗規則的訊息；全過或未 touched 時為 `undefined`。 */
  message: ComputedRef<string | undefined>
}

export interface UseFieldValidationReturn {
  /** 合併後的錯誤狀態：`props.error` 或驗證失敗任一為真即錯誤。 */
  displayError: ComputedRef<boolean>
  /** 合併後的訊息：驗證錯誤訊息優先，無則退回 `props.message`。 */
  displayMessage: ComputedRef<string | undefined>
  /** 已套用合併結果、可直接 `v-bind` 給 BaseFormField 的欄位 props。 */
  fieldProps: ComputedRef<BaseFormFieldProps>
}

/**
 * 合併「外部 props」與「驗證結果」後轉發給 BaseFormField 的共用樣板：
 * - error：`props.error` 或驗證失敗任一為真即錯誤（讓父層仍可用 error prop 強制錯誤，如 server 端驗證）。
 * - message：驗證**錯誤訊息優先**（讓使用者看到「為何不合規」）；無驗證錯誤時退回 `props.message`
 *   靜態提示（如說明文字）。沒有 rules 時 validation.message 恆為 undefined，等同只顯示 `props.message`。
 * - fieldProps：以合併後的 error / message 覆寫完整 props，經 `useFormFieldProps` 收斂出
 *   欄位語意子集（label / required…），供控制項直接 `v-bind` 給內部的 `<BaseFormField>`。
 *
 * @param props 控制項的完整 props（getter / ref / 純值皆可；多餘的控制項自有 key 會被 pick 濾掉）
 * @param validation 驗證來源（通常是 `useValidation` 的回傳值）
 *
 * @example
 * const validation = useValidation(() => model.value, () => props.rules)
 * const { displayMessage, fieldProps } = useFieldValidation(() => props, validation)
 */
export default function useFieldValidation(
  props: MaybeRefOrGetter<BaseFormFieldProps>,
  validation: FieldValidationSource,
): UseFieldValidationReturn {
  const displayError = computed<boolean>(
    () => toValue(props).error || validation.error.value,
  )
  const displayMessage = computed<string | undefined>(
    () => validation.message.value ?? toValue(props).message,
  )

  const fieldProps = useFormFieldProps(() => ({
    ...toValue(props),
    error: displayError.value,
    message: displayMessage.value,
  }))

  return { displayError, displayMessage, fieldProps }
}
