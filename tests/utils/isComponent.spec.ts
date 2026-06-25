import { describe, it, expect } from 'vitest'
import { defineComponent, h } from 'vue'

import isComponent from '~/utils/isComponent'

describe('isComponent', () => {
  it('returns true for a functional component (render function)', () => {
    const Functional = () => h('div')
    expect(isComponent(Functional)).toBe(true)
  })

  it('returns true for an options component with a render method', () => {
    expect(isComponent({ render: () => h('div') })).toBe(true)
  })

  it('returns true for a component with a setup function', () => {
    expect(isComponent({ setup: () => () => h('div') })).toBe(true)
  })

  it('returns true for a defineComponent result (setup-based)', () => {
    expect(isComponent(defineComponent({ setup: () => () => h('div') }))).toBe(true)
  })

  it('returns false for a string', () => {
    expect(isComponent('$')).toBe(false)
    expect(isComponent('USD')).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isComponent(42)).toBe(false)
  })

  it('returns false for a plain object without render / setup', () => {
    expect(isComponent({ foo: 'bar' })).toBe(false)
  })

  it('returns false for null / undefined', () => {
    expect(isComponent(null)).toBe(false)
    expect(isComponent(undefined)).toBe(false)
  })
})
