/**
 * 從物件挑出指定的 key，回傳僅含這些 key 的新物件（淺拷貝）。
 *
 * 只複製「物件自身」且實際存在的屬性（`hasOwnProperty` 守衛），
 * 來源沒有的 key 不會以 `undefined` 補上，繼承自原型鏈的屬性也會略過。
 * 用於把「父元件收到的完整 props」收斂成「要轉發給子元件的子集」，
 * 例如 form 控制項把欄位相關 props 抽出來轉發給 BaseFormField。
 *
 * 參考實作使用 `Record<string, any>`，此處改用 `T extends object` + 泛型 key，
 * 維持回傳型別精確（`Pick<T, K>`）且不違反專案禁用 `any` 的規範。
 *
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
 * pick({ a: 1 } as { a: number; b?: number }, ['a', 'b']) // { a: 1 }（b 不存在 → 略過）
 */
export default function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: readonly K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key]
    }
  }

  return result
}
