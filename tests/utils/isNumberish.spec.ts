import { describe, it, expect } from 'vitest'

import isNumberish from '~/utils/isNumberish'

describe('isNumberish', () => {
  it('true for finite numbers', () => {
    expect(isNumberish(0)).toBe(true)
    expect(isNumberish(48)).toBe(true)
    expect(isNumberish(-4)).toBe(true)
    expect(isNumberish(1.5)).toBe(true)
  })

  it('false for NaN / non-finite', () => {
    expect(isNumberish(Number.NaN)).toBe(false)
  })

  it('true for numeric strings', () => {
    expect(isNumberish('48')).toBe(true)
    expect(isNumberish('0')).toBe(true)
    expect(isNumberish('1.5')).toBe(true)
  })

  it('false for non-numeric / blank strings', () => {
    expect(isNumberish('small')).toBe(false)
    expect(isNumberish('48px')).toBe(false)
    expect(isNumberish('')).toBe(false)
    expect(isNumberish('   ')).toBe(false)
  })

  it('false for non number/string types', () => {
    expect(isNumberish(null)).toBe(false)
    expect(isNumberish(undefined)).toBe(false)
    expect(isNumberish(true)).toBe(false)
    expect(isNumberish({})).toBe(false)
    expect(isNumberish([])).toBe(false)
  })
})
