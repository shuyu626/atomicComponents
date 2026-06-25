/**
 * 表單驗證規則與常用規則 helper。
 *
 * 規則是純函式：吃一個值，回傳 `true`（通過）或字串（錯誤訊息）。供 `useValidation`
 * 逐一執行、取第一條失敗的訊息呈現。本檔不含任何 Vue API（符合 utils 規範），規則的
 * 響應式重算由 `useValidation` 在 computed 內呼叫達成。
 *
 * @see ~/composables/useValidation
 */

/** 驗證規則：回傳 `true` 表通過；回傳字串表錯誤，該字串即錯誤訊息。 */
export type ValidationRule<T = string> = (value: T) => true | string

/**
 * 是否為「空值」：`null` / `undefined` / `NaN` / 純空白字串都算空。
 *
 * 用於讓「非必填類」規則（email / minLength…）在空值時**自動通過**——空值的「必填與否」
 * 交給 {@link required} 判斷，其餘規則不該對空欄位報錯（對齊 vee-validate 慣例）。
 * 數字 `0` 不算空（是有效輸入）。
 */
function isEmpty(value: unknown): boolean {
  if (value == null) return true
  if (typeof value === 'number') return Number.isNaN(value)
  return String(value).trim() === ''
}

/**
 * 必填：值不可為空（空字串 / 純空白 / null / undefined / NaN）。數字 `0` 視為有效。
 *
 * @example required()            // '此欄位為必填'
 * @example required('請輸入帳號')
 */
export function required(message = '此欄位為必填'): ValidationRule<string | number> {
  return value => !isEmpty(value) || message
}

/**
 * 電子郵件格式（簡易 `local@domain.tld`）。空值自動通過（交給 {@link required}）。
 */
export function email(message = '電子郵件格式不正確'): ValidationRule<string | number> {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return value => isEmpty(value) || re.test(String(value)) || message
}

/**
 * 最小長度。長度以 `String(value).length`（UTF-16 code unit）計，與原生 `maxlength` 一致；
 * 注意這與 `showCount` 的 grapheme 計數不同（emoji / astral 字元會佔 2）。空值自動通過（交給
 * {@link required}）。未傳 `message` 時用預設 `至少需 N 個字`。
 */
export function minLength(min: number, message?: string): ValidationRule<string | number> {
  return value =>
    isEmpty(value)
    || String(value).length >= min
    || (message ?? `至少需 ${min} 個字`)
}

/**
 * 最大長度。計數單位同 {@link minLength}（UTF-16 code unit，與原生 `maxlength` 一致）。
 * 空值自動通過。未傳 `message` 時用預設 `不可超過 N 個字`。
 */
export function maxLength(max: number, message?: string): ValidationRule<string | number> {
  return value =>
    isEmpty(value)
    || String(value).length <= max
    || (message ?? `不可超過 ${max} 個字`)
}

/**
 * 自訂正規表示式比對。空值自動通過（交給 {@link required}）。
 *
 * @example pattern(/^\d+$/, '只能輸入數字')
 */
export function pattern(regex: RegExp, message = '格式不正確'): ValidationRule<string | number> {
  return value => isEmpty(value) || regex.test(String(value)) || message
}

/**
 * 與另一欄位相等（如「再次輸入密碼」）。`other` 傳 getter，規則執行時即時讀取，
 * 故另一欄位變動時也會重新比對。空值**不**自動通過（空的確認欄位與已填的原欄位視為不一致）。
 *
 * @example sameAs(() => password.value, '兩次密碼不一致')
 */
export function sameAs(
  other: () => unknown,
  message = '兩次輸入不一致',
): ValidationRule<string | number> {
  return value => value === other() || message
}
