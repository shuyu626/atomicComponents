import { describe, it, expect } from 'vitest'

import toArray from '~/utils/toArray'

describe('toArray', () => {
  it('wraps a single value into a one-element array', () => {
    expect(toArray('click')).toEqual(['click'])
    expect(toArray(1)).toEqual([1])
  })

  it('returns the array as-is when already an array', () => {
    const input = ['click', 'hover']
    expect(toArray(input)).toEqual(['click', 'hover'])
    // 同一參考回傳，不額外複製
    expect(toArray(input)).toBe(input)
  })

  it('wraps falsy non-array values too', () => {
    expect(toArray(0)).toEqual([0])
    expect(toArray('')).toEqual([''])
    expect(toArray(false)).toEqual([false])
  })

  it('keeps an empty array empty', () => {
    expect(toArray([])).toEqual([])
  })
})
