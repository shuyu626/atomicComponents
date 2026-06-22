/**
 * 是否為字串（型別守衛）。false 分支會把型別收斂掉 `string`。
 */
export default function isString(value: unknown): value is string {
  return typeof value === 'string'
}
