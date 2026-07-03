/**
 * 原生 Date 的 ISO 日期工具(不依賴任何日期函式庫)。
 * 全部以「本地時區、日 granularity」運作:parseISO 產生本地午夜的 Date,toISO 取本地年月日。
 */

/** 嚴格解析 `YYYY-MM-DD`(本地午夜);格式或日期非法回 null。 */
export function parseISO(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  // 反查:JS Date 會把 2026-02-30 溢位成 3 月,借此擋掉非法日。
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null
  }
  return date
}

/** 以本地年月日格式化為零補位的 `YYYY-MM-DD`。 */
export function toISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 回傳同日零時的新 Date(不改動輸入)。 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** 兩個 Date 是否為同一日(忽略時間)。 */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** a 是否早於 b(以日比較)。 */
export function isBefore(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() < startOfDay(b).getTime()
}

/** a 是否晚於 b(以日比較)。 */
export function isAfter(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() > startOfDay(b).getTime()
}

/** 指定年月的天數(`month` 0-indexed);day 0 = 上個月最後一天。 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * 產生 6×7 的月曆矩陣(含前後月補位),讓 grid 高度固定。
 * `firstDayOfWeek` 0=週日 ... 6=週六。
 */
export function buildMonthMatrix(year: number, month: number, firstDayOfWeek: number): Date[][] {
  const first = new Date(year, month, 1)
  // 第一格要往前補幾天:讓 first 落在正確的星期欄。
  const lead = (first.getDay() - firstDayOfWeek + 7) % 7
  const start = new Date(year, month, 1 - lead)

  const weeks: Date[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < 6; w++) {
    const row: Date[] = []
    for (let d = 0; d < 7; d++) {
      row.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(row)
  }
  return weeks
}
