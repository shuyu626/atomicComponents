import { describe, it, expect } from 'vitest'
import {
  parseISO, toISO, isSameDay, startOfDay, isBefore, isAfter,
  daysInMonth, buildMonthMatrix,
} from '~/utils/date'

describe('parseISO', () => {
  it('parses a valid YYYY-MM-DD to local midnight', () => {
    const d = parseISO('2026-07-02')!
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(6) // July = 6
    expect(d.getDate()).toBe(2)
    expect(d.getHours()).toBe(0)
  })
  it('returns null for malformed or out-of-range input', () => {
    expect(parseISO('2026-7-2')).toBeNull()
    expect(parseISO('2026-13-01')).toBeNull()
    expect(parseISO('2026-02-30')).toBeNull()
    expect(parseISO('nope')).toBeNull()
    expect(parseISO('')).toBeNull()
  })
})

describe('toISO', () => {
  it('formats a Date as zero-padded YYYY-MM-DD', () => {
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISO(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
  it('round-trips with parseISO', () => {
    expect(toISO(parseISO('2026-07-02')!)).toBe('2026-07-02')
  })
})

describe('day comparisons', () => {
  it('isSameDay ignores time', () => {
    expect(isSameDay(new Date(2026, 6, 2, 9), new Date(2026, 6, 2, 18))).toBe(true)
    expect(isSameDay(new Date(2026, 6, 2), new Date(2026, 6, 3))).toBe(false)
  })
  it('startOfDay zeroes the time', () => {
    const d = startOfDay(new Date(2026, 6, 2, 13, 45))
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })
  it('isBefore / isAfter compare by day', () => {
    expect(isBefore(new Date(2026, 6, 1), new Date(2026, 6, 2))).toBe(true)
    expect(isAfter(new Date(2026, 6, 3), new Date(2026, 6, 2))).toBe(true)
    expect(isBefore(new Date(2026, 6, 2, 23), new Date(2026, 6, 2, 1))).toBe(false)
  })
})

describe('daysInMonth', () => {
  it('handles month lengths and leap years', () => {
    expect(daysInMonth(2026, 1)).toBe(28) // Feb 2026
    expect(daysInMonth(2028, 1)).toBe(29) // Feb 2028 (leap)
    expect(daysInMonth(2026, 3)).toBe(30) // April
    expect(daysInMonth(2026, 0)).toBe(31) // Jan
  })
})

describe('buildMonthMatrix', () => {
  it('returns 6 rows of 7 days including padding', () => {
    const m = buildMonthMatrix(2026, 6, 0) // July 2026, week starts Sunday
    expect(m).toHaveLength(6)
    m.forEach((row) => expect(row).toHaveLength(7))
    // July 1 2026 is a Wednesday → first cell is Sun Jun 28
    expect(toISO(m[0][0])).toBe('2026-06-28')
    expect(toISO(m[0][3])).toBe('2026-07-01')
  })
  it('respects firstDayOfWeek=1 (Monday)', () => {
    const m = buildMonthMatrix(2026, 6, 1)
    // Week starts Monday → first cell is Mon Jun 29
    expect(toISO(m[0][0])).toBe('2026-06-29')
  })
})
