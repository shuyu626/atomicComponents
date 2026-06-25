/**
 * 把數值夾在 `[min, max]` 區間內：小於下界回 `min`、大於上界回 `max`，否則原樣回傳。
 *
 * 供 BaseTextarea 的 autosize 計算用——以內容撐出的行數為基準，夾在 `rows`（下界）與
 * `maxRows`（上界，未設則為 `Infinity`）之間，避免高度小於初始行數或無限長高。
 *
 * 假設 `min <= max`（呼叫端自行保證）；`max` 為 `Infinity` 時等同只設下界。
 *
 * @example
 * clamp(5, 2, 10)        // 5
 * clamp(1, 2, 10)        // 2（夾到下界）
 * clamp(20, 2, 10)       // 10（夾到上界）
 * clamp(20, 2, Infinity) // 20（只設下界）
 */
export default function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
