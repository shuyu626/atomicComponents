import { describe, it, expect } from 'vitest'

import clamp from '~/utils/clamp'

describe('clamp', () => {
  it('returns the value unchanged when within range', () => {
    expect(clamp(5, 2, 10)).toBe(5)
  })

  it('clamps to the lower bound when below min', () => {
    expect(clamp(1, 2, 10)).toBe(2)
    expect(clamp(-99, 0, 10)).toBe(0)
  })

  it('clamps to the upper bound when above max', () => {
    expect(clamp(20, 2, 10)).toBe(10)
  })

  it('returns the bound when the value equals min or max', () => {
    expect(clamp(2, 2, 10)).toBe(2)
    expect(clamp(10, 2, 10)).toBe(10)
  })

  it('treats Infinity max as a lower-bound-only clamp', () => {
    expect(clamp(9999, 2, Infinity)).toBe(9999)
    expect(clamp(1, 2, Infinity)).toBe(2)
  })
})
