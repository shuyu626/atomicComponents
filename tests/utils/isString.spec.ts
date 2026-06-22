import { describe, it, expect } from 'vitest'

import isString from '~/utils/isString'

describe('isString', () => {
  it('true for strings (incl. empty)', () => {
    expect(isString('')).toBe(true)
    expect(isString('hello')).toBe(true)
  })

  it('false for non-strings', () => {
    expect(isString(0)).toBe(false)
    expect(isString(null)).toBe(false)
    expect(isString(undefined)).toBe(false)
    expect(isString({})).toBe(false)
    expect(isString(['a'])).toBe(false)
  })
})
