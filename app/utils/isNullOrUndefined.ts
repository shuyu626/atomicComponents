/**
 * 是否為 `null` 或 `undefined`（型別守衛）。
 * 用嚴格比較而非 `== null`，意圖更清楚；false 分支會把型別收斂成 `T`。
 */
export default function isNullOrUndefined(
  value: unknown,
): value is null | undefined {
  return value === null || value === undefined
}
