import { computed, ref, toValue } from 'vue'

import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

import type { ValidationRule } from '~/utils/validators'

interface UseValidationReturn {
  /** 是否顯示錯誤（= `message` 有值）；`touched` 前恆為 `false`。 */
  error: ComputedRef<boolean>
  /** 第一條失敗規則的訊息；全過或未 `touched` 時為 `undefined`。 */
  message: ComputedRef<string | undefined>
  /** 是否已被使用者「碰過」（blur 一次或呼叫 validate 後為 true）。 */
  touched: Readonly<Ref<boolean>>
  /** 標記為碰過：之後值一變動就即時反映錯誤（供 blur 時呼叫）。 */
  touch: () => void
  /** 強制驗證（會 set touched，讓未碰過的欄位也顯示錯誤）；回傳是否全部通過。供表單 submit 用。 */
  validate: () => boolean
  /** 重置：清掉 touched 與錯誤顯示（值不變）。 */
  reset: () => void
}

/**
 * 把「值 + 規則」轉成響應式的 `error` / `message`，並以 **touched-gated** 控制顯示時機。
 *
 * 設計重點：`firstError` 是純 computed（永遠反映「目前值是否合規」），對外的 `message` 再
 * 疊一層 `touched` 閘門——`touched=false` 時不顯示錯誤；使用者 blur（呼叫 {@link touch}）後
 * `touched` 轉 true，由於 `message` 追 `firstError`、`firstError` 追 `value`，**此後每次輸入
 * 就自動即時重驗**，達成「碰過才逐字驗證」的體驗（避免使用者還沒打完就滿江紅）。
 *
 * 規則本身（{@link ValidationRule}）是 utils 的純函式；本 composable 只負責「何時跑、何時顯示」。
 *
 * @param value 受驗的值，可為 ref / getter / 純值
 * @param rules 規則陣列，可為 ref / getter（動態規則）；空 / undefined 視為無規則（恆通過）
 *
 * @example
 * const { error, message, touch, validate } = useValidation(
 *   () => model.value,
 *   () => props.rules,
 * )
 * // blur 時 touch()；submit 時 validate()
 */
export default function useValidation<T>(
  value: MaybeRefOrGetter<T>,
  rules: MaybeRefOrGetter<ValidationRule<T>[] | undefined>,
): UseValidationReturn {
  const touched = ref(false)

  // 純驗證結果：跑所有規則，回第一條失敗的訊息（全過 → undefined）。不看 touched。
  const firstError = computed<string | undefined>(() => {
    const list = toValue(rules)
    if (!list || list.length === 0) return undefined

    const val = toValue(value)
    for (const rule of list) {
      const result = rule(val)
      if (result !== true) return result
    }
    return undefined
  })

  // 對外顯示：疊上 touched 閘門。
  const message = computed(() => (touched.value ? firstError.value : undefined))
  const error = computed(() => message.value != null)

  const touch = () => {
    touched.value = true
  }

  const reset = () => {
    touched.value = false
  }

  const validate = () => {
    touched.value = true
    return firstError.value == null
  }

  return { error, message, touched, touch, validate, reset }
}
