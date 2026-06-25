import { computed, toValue } from 'vue'

import type { ComputedRef, MaybeRefOrGetter } from 'vue'

import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import pick from '~/utils/pick'

/**
 * BaseFormField 的「欄位語意」prop key。抽成常數供 pick 使用，新增欄位 prop 時集中於此維護。
 * 含 `id`：讓封裝端（BaseInput…）的呼叫者傳入 `id` 能一路轉發給 field（未傳則 field 自動產生）。
 */
const FIELD_PROP_KEYS = [
  'id',
  'label',
  'labelPlacement',
  'labelWidth',
  'hideLabel',
  'message',
  'error',
  'required',
  'disabled',
  'readonly',
] as const satisfies readonly (keyof BaseFormFieldProps)[]

/**
 * 從「父控制項的完整 props」中收斂出 BaseFormField 需要的欄位子集。
 *
 * 用於封裝型表單控制項（如 BaseInput / BaseSelect）：控制項把自身 props 上的欄位語意
 * （label / error / required…）抽出來，直接 `v-bind` 轉發給內部的 `<BaseFormField>`，
 * 不必逐一手寫透傳。回傳 `computed`，控制項 props 變動時自動同步。
 *
 * @example
 * // 在 BaseInput.vue 內：
 * const fieldProps = useFormFieldProps(props)
 * // <BaseFormField v-bind="fieldProps"> <input v-slot...> </BaseFormField>
 */
export default function useFormFieldProps(
  props: MaybeRefOrGetter<BaseFormFieldProps>,
): ComputedRef<BaseFormFieldProps> {
  return computed<BaseFormFieldProps>(() => pick(toValue(props), FIELD_PROP_KEYS))
}
