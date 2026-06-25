import { describe, it, expect } from 'vitest'

import pick from '~/utils/pick'

describe('pick', () => {
  it('picks only the listed keys', () => {
    expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 })
  })

  it('skips keys that are absent on the source (hasOwnProperty guard)', () => {
    const source = { a: 1 } as { a: number; b?: number }
    const result = pick(source, ['a', 'b'])
    expect(result).toEqual({ a: 1 })
    expect('b' in result).toBe(false)
  })

  it('does not include keys outside the list', () => {
    expect(pick({ a: 1, b: 2 }, ['a'])).toEqual({ a: 1 })
  })

  it('returns a new object (shallow copy, does not mutate the source)', () => {
    const source = { a: 1, b: 2 }
    const result = pick(source, ['a'])
    expect(result).not.toBe(source)
    expect(source).toEqual({ a: 1, b: 2 })
  })

  it('ignores inherited (prototype-chain) properties', () => {
    const proto = { inherited: 'x' }
    const source = Object.create(proto) as { inherited: string; own?: number }
    source.own = 1
    expect(pick(source, ['inherited', 'own'])).toEqual({ own: 1 })
  })

  it('returns an empty object when no keys are requested', () => {
    expect(pick({ a: 1 }, [])).toEqual({})
  })
})
