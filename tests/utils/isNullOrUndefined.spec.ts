import { describe, it, expect } from 'vitest'

import isNullOrUndefined from '~/utils/isNullOrUndefined'

describe('isNullOrUndefined', () => {
  it('returns true for null', () => {
    expect(isNullOrUndefined(null)).toBe(true)
  })

  it('returns true for undefined', () => {
    expect(isNullOrUndefined(undefined)).toBe(true)
  })

  it('returns false for falsy values that are not null / undefined', () => {
    // 0 / '' / false / NaN 都不是「沒有值」，必須回 false，否則會誤殺合法輸入
    expect(isNullOrUndefined(0)).toBe(false)
    expect(isNullOrUndefined('')).toBe(false)
    expect(isNullOrUndefined(false)).toBe(false)
    expect(isNullOrUndefined(Number.NaN)).toBe(false)
  })

  it('returns false for objects, arrays and functions', () => {
    expect(isNullOrUndefined({})).toBe(false)
    expect(isNullOrUndefined([])).toBe(false)
    expect(isNullOrUndefined(() => {})).toBe(false)
  })
})
