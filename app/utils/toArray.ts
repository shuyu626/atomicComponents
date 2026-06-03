/**
 * 把「單值或陣列」統一收斂成陣列。
 *
 * 常見用途：props 支援 `T | T[]` 兩種寫法時，內部先 `toArray` 再走同一條邏輯，
 * 不必到處 `Array.isArray` 分支。
 *
 * @example
 * toArray('click')            // ['click']
 * toArray(['click', 'hover']) // ['click', 'hover']
 */
export default function toArray<T>(value: T | T[]): T[] {
  return Array.isArray(value) ? value : [value]
}
