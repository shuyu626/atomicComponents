import { describe, it, expect } from 'vitest'

import isSet from '~/utils/isSet'

describe('isSet', () => {
  it('returns true for a Set instance', () => {
    expect(isSet(new Set())).toBe(true)
    expect(isSet(new Set([1, 2, 3]))).toBe(true)
  })

  it('returns false for WeakSet (not a value Set)', () => {
    expect(isSet(new WeakSet())).toBe(false)
  })

  it('returns false for arrays', () => {
    expect(isSet([])).toBe(false)
    expect(isSet([1, 2])).toBe(false)
  })

  it('returns false for Map / plain objects', () => {
    expect(isSet(new Map())).toBe(false)
    expect(isSet({})).toBe(false)
  })

  it('returns false for null / undefined / primitives', () => {
    expect(isSet(null)).toBe(false)
    expect(isSet(undefined)).toBe(false)
    expect(isSet('set')).toBe(false)
    expect(isSet(0)).toBe(false)
  })
})
