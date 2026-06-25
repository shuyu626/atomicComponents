import { describe, it, expect } from 'vitest'
import { ref } from 'vue'

import useStringLength from '~/composables/useStringLength'

describe('useStringLength', () => {
  it('counts plain ASCII characters', () => {
    expect(useStringLength('hello').value).toBe(5)
  })

  it('counts an empty string as 0', () => {
    expect(useStringLength('').value).toBe(0)
  })

  it('counts CJK characters as one each', () => {
    expect(useStringLength('中文字').value).toBe(3)
  })

  it('counts an astral-plane emoji as 1 (not 2 UTF-16 code units)', () => {
    // '😀' is a surrogate pair → String.prototype.length would be 2.
    expect('😀'.length).toBe(2)
    expect(useStringLength('😀').value).toBe(1)
  })

  it('counts a ZWJ emoji sequence as a single grapheme', () => {
    // 👨‍👩‍👧‍👦 is one perceived character built from multiple code points + ZWJ.
    expect(useStringLength('👨‍👩‍👧‍👦').value).toBe(1)
  })

  it('reacts to a ref source', () => {
    const text = ref('ab')
    const count = useStringLength(text)
    expect(count.value).toBe(2)

    text.value = 'abcd'
    expect(count.value).toBe(4)
  })

  it('accepts a getter source', () => {
    const text = ref('xyz')
    const count = useStringLength(() => text.value)
    expect(count.value).toBe(3)
  })
})
