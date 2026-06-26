/**
 * 是否為 `Set` 實例（型別守衛）。
 *
 * 用 `instanceof Set` 而非 `Object.prototype.toString`，意圖清楚且 false 分支會把
 * 型別從 union 收斂。`WeakSet` 不算（非可列舉的值集合，多選用不到）。供 BaseSelect
 * 多選模式判斷「v-model 綁定的是 Set 還是 Array」，以維持原容器型別輸出。
 */
export default function isSet<T>(value: unknown): value is Set<T> {
  return value instanceof Set
}
