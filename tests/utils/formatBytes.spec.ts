import { describe, it, expect } from 'vitest'
import formatBytes from '~/utils/formatBytes'

describe('formatBytes', () => {
  it('formats zero and bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(512)).toBe('512 B')
  })
  it('scales to KB / MB / GB', () => {
    expect(formatBytes(1024)).toBe('1 KB')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(1048576)).toBe('1 MB')
    expect(formatBytes(1073741824)).toBe('1 GB')
  })
  it('respects fractionDigits and trims trailing zeros', () => {
    expect(formatBytes(1500, 2)).toBe('1.46 KB')
    expect(formatBytes(2048, 2)).toBe('2 KB')
  })
  it('handles negative / NaN defensively', () => {
    expect(formatBytes(-5)).toBe('0 B')
    expect(formatBytes(Number.NaN)).toBe('0 B')
  })
})
