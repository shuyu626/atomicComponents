/**
 * 以十進位指數位移四捨五入到 `precision` 位小數，避免 IEEE754 浮點誤差
 * （`1.005` → `1.01` 而非直接 `Math.round(1.005 * 100) / 100` 得到的 `1.00`）。
 *
 * 原理：先用 `toExponential()` 取得十進位字串表示，把小數點「以字串方式」右移
 * `precision` 位再 `Math.round`，最後同樣以字串方式移回——全程不做浮點乘除，
 * 不會引入 `1.005 * 100 = 100.49999…` 這類二進位表示誤差。
 *
 * 負數沿用 `Math.round` 向 +∞ 捨入語意（`-1.005` → `-1`）。非有限數原樣回傳。
 *
 * @example
 * roundToPrecision(1.005, 2)                // 1.01
 * roundToPrecision(0.30000000000000004, 1)  // 0.3
 * roundToPrecision(-1.005, 2)               // -1（向 +∞ 捨入）
 * roundToPrecision(Infinity, 2)             // Infinity（原樣回傳）
 */
export default function roundToPrecision(value: number, precision: number): number {
  if (!Number.isFinite(value)) return value
  const [mantissa, exponent = '0'] = value.toExponential().split('e')
  const shifted = Math.round(Number(`${mantissa}e${Number(exponent) + precision}`))
  const [roundedMantissa, roundedExponent = '0'] = shifted.toExponential().split('e')
  return Number(`${roundedMantissa}e${Number(roundedExponent) - precision}`)
}
