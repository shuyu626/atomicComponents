import { describe, it, expect, vi } from 'vitest'
import { nextTick, ref } from 'vue'

import useComposingModel from '~/composables/useComposingModel'

type Modifiers = Record<string, true | undefined>

/** 建立掛在 document 上的 input 與 composable 接線，回傳操作工具。 */
function setup(options: {
  modifiers?: Modifiers
  castToNumber?: boolean
  onAfterInput?: () => void
  initial?: string | number
} = {}) {
  const model = ref<string | number | undefined>(options.initial)
  const input = document.createElement('input')
  document.body.appendChild(input)
  const inputRef = ref<HTMLInputElement | null>(input)

  const handlers = useComposingModel(model, options.modifiers ?? {}, inputRef, {
    castToNumber: options.castToNumber,
    onAfterInput: options.onAfterInput,
  })
  input.addEventListener('compositionstart', handlers.onCompositionStart)
  input.addEventListener('compositionend', handlers.onCompositionEnd)
  input.addEventListener('input', handlers.onInput)
  input.addEventListener('change', handlers.onChange)

  /** 模擬使用者輸入：改 DOM 值並派發 input 事件。 */
  const type = (text: string) => {
    input.value = text
    input.dispatchEvent(new Event('input'))
  }

  return { model, input, type, cleanup: () => input.remove() }
}

describe('useComposingModel — 基本輸入', () => {
  it('一般輸入即時更新 model', () => {
    const { model, type, cleanup } = setup()
    type('hello')
    expect(model.value).toBe('hello')
    cleanup()
  })

  it('model 程式化變動時回寫到 input（undefined 收斂為空字串）', async () => {
    const { model, input, cleanup } = setup({ initial: 'init' })
    expect(input.value).toBe('init') // watchEffect 首次執行即同步

    model.value = 'changed'
    await nextTick()
    expect(input.value).toBe('changed')

    model.value = undefined
    await nextTick()
    expect(input.value).toBe('')
    cleanup()
  })
})

describe('useComposingModel — IME 組字', () => {
  it('組字期間不更新 model，compositionend 才提交最終值', () => {
    const { model, input, type, cleanup } = setup()

    input.dispatchEvent(new Event('compositionstart'))
    type('ㄋ')
    type('ㄋㄧ')
    expect(model.value).toBeUndefined() // 組字中不提交中途值

    input.value = '你'
    input.dispatchEvent(new Event('compositionend'))
    expect(model.value).toBe('你')

    // 組字結束後恢復逐字提交
    type('你好')
    expect(model.value).toBe('你好')
    cleanup()
  })

  it('未經 compositionstart 的 compositionend 不提交（守衛）', () => {
    const { model, input, cleanup } = setup()
    input.value = 'stray'
    input.dispatchEvent(new Event('compositionend'))
    expect(model.value).toBeUndefined()
    cleanup()
  })

  it('組字中聚焦時，model 外部變動不覆寫使用者正在輸入的字', async () => {
    const { model, input, cleanup } = setup()
    input.focus()
    input.dispatchEvent(new Event('compositionstart'))
    input.value = 'ㄋㄧ'

    model.value = 'external'
    await nextTick()
    expect(input.value).toBe('ㄋㄧ') // 組字守衛：不覆寫
    cleanup()
  })
})

describe('useComposingModel — modifiers', () => {
  it('`.lazy`：input 不更新，change 才提交；組字結束也不提早提交', () => {
    const { model, input, type, cleanup } = setup({ modifiers: { lazy: true } })

    type('abc')
    expect(model.value).toBeUndefined()

    input.dispatchEvent(new Event('compositionstart'))
    input.value = '你'
    input.dispatchEvent(new Event('compositionend'))
    expect(model.value).toBeUndefined() // lazy：留待 change

    input.dispatchEvent(new Event('change'))
    expect(model.value).toBe('你')
    cleanup()
  })

  it('`.trim`：提交前去前後空白，change 後把顯示值正規化', () => {
    const { model, input, type, cleanup } = setup({ modifiers: { trim: true } })

    type('  abc  ')
    expect(model.value).toBe('abc')
    expect(input.value).toBe('  abc  ') // input 階段不動顯示值

    input.dispatchEvent(new Event('change'))
    expect(model.value).toBe('abc')
    expect(input.value).toBe('abc') // change 後同步為正規化字串
    cleanup()
  })

  it('`.trim`：聚焦中「修整後與 model 相等」時不覆寫尾隨空白', async () => {
    const { model, input, type, cleanup } = setup({ modifiers: { trim: true } })
    input.focus()

    type('abc ')
    expect(model.value).toBe('abc')
    await nextTick()
    expect(input.value).toBe('abc ') // 守衛：使用者還在打字，不吃掉尾隨空白
    cleanup()
  })

  it('castToNumber：可解析時轉數字，無法解析保留原字串', () => {
    const { model, type, cleanup } = setup({ castToNumber: true })

    type('42')
    expect(model.value).toBe(42)

    type('abc')
    expect(model.value).toBe('abc') // 對齊 looseToNumber：不硬塞 NaN
    cleanup()
  })

  it('castToNumber：change 後把顯示值正規化為數字字串', () => {
    const { model, input, cleanup } = setup({ castToNumber: true })

    input.value = '1.50'
    input.dispatchEvent(new Event('change'))
    expect(model.value).toBe(1.5)
    expect(input.value).toBe('1.5')
    cleanup()
  })

  it('castToNumber：聚焦中「解析後與 model 相等」時不覆寫（如 "1."）', async () => {
    const { model, input, type, cleanup } = setup({ castToNumber: true })
    input.focus()

    type('1.')
    expect(model.value).toBe(1)
    await nextTick()
    expect(input.value).toBe('1.') // 守衛：不打斷小數點輸入
    cleanup()
  })
})

describe('useComposingModel — onAfterInput 掛鉤', () => {
  it('一般輸入與組字中的 input 都會呼叫（供 autosize 即時量測）', () => {
    const onAfterInput = vi.fn()
    const { input, type, cleanup } = setup({ onAfterInput })

    type('a')
    expect(onAfterInput).toHaveBeenCalledTimes(1)

    input.dispatchEvent(new Event('compositionstart'))
    type('ㄋ')
    expect(onAfterInput).toHaveBeenCalledTimes(2) // 組字中也呼叫
    cleanup()
  })
})
