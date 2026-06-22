/**
 * 是否為「數值或可被解析成數值的字串」（型別守衛）。
 *
 * 用於分辨像 `size` 這種 union（`'small' | 'medium' | \`${number}\` | number`）：
 * 數字 / 數字字串（`48`、`'48'`）走「自訂尺寸」分支，具名字串（`'small'`）走 class 分支。
 *
 * @example
 * isNumberish(48)      // true
 * isNumberish('48')    // true
 * isNumberish('small') // false
 * isNumberish('')      // false
 * isNumberish(NaN)     // false
 */
export default function isNumberish(value: unknown): value is number | `${number}` {
  if (typeof value === 'number') return !Number.isNaN(value)
  if (typeof value !== 'string' || value.trim() === '') return false
  return !Number.isNaN(Number(value))
}
