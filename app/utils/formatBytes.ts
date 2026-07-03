const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/**
 * 位元組轉人類可讀字串(1024 進位)。小數尾隨 0 會被去掉:`2048 → "2 KB"`。
 * 非有限數 / 負數視為 0。
 */
export default function formatBytes(bytes: number, fractionDigits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  // 整數不顯示小數;否則取 fractionDigits 並去尾隨 0。
  const rounded = Number(value.toFixed(fractionDigits))
  return `${rounded} ${UNITS[unit]}`
}
