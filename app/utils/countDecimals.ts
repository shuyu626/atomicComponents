/**
 * 取數字的小數位數；科學記號（1e-7）也正確計算。非有限數（`Infinity` / `NaN`）回傳 0。
 *
 * 供 BaseInputNumber 推導步進運算的有效精度——未設 `precision` 時，以
 * `step` 與目前值兩者小數位的較大者捨入，修正 `0.1 + 0.2` 類浮點誤差。
 *
 * 實作走 `toExponential()` 字串解析而非 `String(value).split('.')`，
 * 因為極小數（如 `1e-7`）的 `String()` 會輸出科學記號、直接切 `.` 會算錯。
 *
 * @example
 * countDecimals(1)       // 0
 * countDecimals(0.25)    // 2
 * countDecimals(1e-7)    // 7（科學記號也正確）
 * countDecimals(NaN)     // 0
 */
export default function countDecimals(value: number): number {
  if (!Number.isFinite(value)) return 0
  const [mantissa = '', exponent = '0'] = value.toExponential().split('e')
  const mantissaDecimals = mantissa.split('.')[1]?.length ?? 0
  return Math.max(0, mantissaDecimals - Number(exponent))
}
