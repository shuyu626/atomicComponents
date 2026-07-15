import { describe, it, expect } from 'vitest'

import {
  required,
  email,
  minLength,
  maxLength,
  pattern,
  sameAs,
} from '~/utils/validators'

describe('validators', () => {
  // ── required ──────────────────────────────────────────────────────────────────
  describe('required', () => {
    it('fails on empty / whitespace / null / undefined', () => {
      const rule = required()
      expect(rule('')).toBe('此欄位為必填')
      expect(rule('   ')).toBe('此欄位為必填')
      expect(rule(undefined as unknown as string)).toBe('此欄位為必填')
    })

    it('passes on non-empty strings and the number 0', () => {
      expect(required()('a')).toBe(true)
      expect(required()(0)).toBe(true)
    })

    it('uses a custom message', () => {
      expect(required('請輸入帳號')('')).toBe('請輸入帳號')
    })
  })

  // ── email ─────────────────────────────────────────────────────────────────────
  describe('email', () => {
    it('passes valid addresses', () => {
      expect(email()('a@b.com')).toBe(true)
    })

    it('fails invalid addresses', () => {
      expect(email()('not-an-email')).toBe('電子郵件格式不正確')
      expect(email()('a@b')).toBe('電子郵件格式不正確')
    })

    it('passes empty (defers emptiness to required)', () => {
      expect(email()('')).toBe(true)
    })
  })

  // ── minLength / maxLength ─────────────────────────────────────────────────────
  describe('minLength / maxLength', () => {
    it('enforces a minimum length', () => {
      expect(minLength(3)('ab')).toBe('至少需 3 個字')
      expect(minLength(3)('abc')).toBe(true)
    })

    it('enforces a maximum length', () => {
      expect(maxLength(3)('abcd')).toBe('不可超過 3 個字')
      expect(maxLength(3)('abc')).toBe(true)
    })

    it('passes empty for both', () => {
      expect(minLength(3)('')).toBe(true)
      expect(maxLength(3)('')).toBe(true)
    })

    it('uses a custom message', () => {
      expect(minLength(8, '密碼至少 8 碼')('123')).toBe('密碼至少 8 碼')
    })
  })

  // ── pattern ───────────────────────────────────────────────────────────────────
  describe('pattern', () => {
    it('matches against a regex', () => {
      const digits = pattern(/^\d+$/, '只能輸入數字')
      expect(digits('123')).toBe(true)
      expect(digits('12a')).toBe('只能輸入數字')
    })

    it('passes empty', () => {
      expect(pattern(/^\d+$/)('')).toBe(true)
    })

    // /g /y 旗標的 regex 有 stateful lastIndex：不隔離的話，同一條規則
    // 重複驗證同一值會交替翻轉結果（共用庫經典地雷）。
    it('is stable across repeated validations with a /g regex (no lastIndex leak)', () => {
      const rule = pattern(/^\d+$/g)
      expect(rule('123')).toBe(true)
      expect(rule('123')).toBe(true)
      expect(rule('123')).toBe(true)
    })

    it('is stable across repeated validations with a /y (sticky) regex', () => {
      const rule = pattern(/^\d+$/y)
      expect(rule('123')).toBe(true)
      expect(rule('123')).toBe(true)
    })

    it('does not mutate the caller-provided regex (lastIndex untouched)', () => {
      const re = /^\d+$/g
      re.lastIndex = 0
      const rule = pattern(re)
      rule('123')
      expect(re.lastIndex).toBe(0)
    })
  })

  // ── sameAs ────────────────────────────────────────────────────────────────────
  describe('sameAs', () => {
    it('passes when equal to the other value via getter', () => {
      let other = 'secret'
      const rule = sameAs(() => other)
      expect(rule('secret')).toBe(true)
      other = 'changed'
      expect(rule('secret')).toBe('兩次輸入不一致')
    })

    it('uses a custom message', () => {
      expect(sameAs(() => 'a', '兩次密碼不一致')('b')).toBe('兩次密碼不一致')
    })
  })
})
