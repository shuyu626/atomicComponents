import { describe, it, expect } from 'vitest'

import toUnit from '~/utils/toUnit'

describe('toUnit', () => {
  it('appends px to a number by default', () => {
    expect(toUnit(8)).toBe('8px')
    expect(toUnit(0)).toBe('0px')
    expect(toUnit(-4)).toBe('-4px')
  })

  it('uses a custom unit when provided', () => {
    expect(toUnit(8, 'rem')).toBe('8rem')
    expect(toUnit(50, '%')).toBe('50%')
  })

  it('returns a string value unchanged (assumed already unit-bearing)', () => {
    expect(toUnit('50%')).toBe('50%')
    expect(toUnit('1.5rem')).toBe('1.5rem')
    expect(toUnit('auto')).toBe('auto')
  })
})
