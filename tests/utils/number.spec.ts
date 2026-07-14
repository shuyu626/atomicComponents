import { describe, expect, it } from 'vitest'

import countDecimals from '~/utils/countDecimals'
import roundToPrecision from '~/utils/roundToPrecision'

describe('countDecimals', () => {
  it.each([
    [1, 0], [0.1, 1], [0.25, 2], [1e-7, 7], [123.456, 3], [Infinity, 0], [Number.NaN, 0],
  ])('countDecimals(%s) = %s', (input, expected) => {
    expect(countDecimals(input)).toBe(expected)
  })
})

describe('roundToPrecision', () => {
  it.each([
    [1.005, 2, 1.01],          // 經典 IEEE754 陷阱：1.005*100=100.49999…
    [0.30000000000000004, 1, 0.3],
    [123.456, 0, 123],
    [1.2345, 2, 1.23],
    [-1.005, 2, -1],           // Math.round 向 +∞ 捨入語意
    [0.0000001, 2, 0],
  ])('roundToPrecision(%s, %s) = %s', (value, precision, expected) => {
    expect(roundToPrecision(value, precision)).toBe(expected)
  })
  it('returns non-finite values as-is', () => {
    expect(roundToPrecision(Infinity, 2)).toBe(Infinity)
  })
})
