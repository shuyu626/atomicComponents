/**
 * 把數值補上 CSS 單位；若已是字串則原樣回傳。
 *
 * 純數字 → `${value}px`（或指定 `unit`）；字串視為使用者已自帶單位（如 `'1rem'`、`'50%'`），
 * 不再加工。用於把 floating-ui 計算出的座標（number）轉成可塞進 style 的字串。
 *
 * @example
 * toUnit(8)        // '8px'
 * toUnit(8, 'rem') // '8rem'
 * toUnit('50%')    // '50%'
 */
export default function toUnit(value: number | string, unit = 'px'): string {
  return typeof value === 'number' ? `${value}${unit}` : value
}
