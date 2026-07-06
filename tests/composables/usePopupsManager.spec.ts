import { describe, it, expect, afterEach } from 'vitest'
import { computed } from 'vue'

import { createPopupsManager, usePopupsManager } from '~/composables/usePopupsManager'

// 每個 token 只需是穩定的唯一參考；測試用 Symbol 當作各 popup 的身分。
function token(label: string) {
  return Symbol(label)
}

afterEach(() => {
  // 還原可能被 scroll-lock 改動的 body 樣式，避免測試互相污染。
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

describe('createPopupsManager', () => {
  // ── 堆疊與 isTop ──────────────────────────────────────────────────────────
  describe('stack & isTop', () => {
    it('treats the most recently added popup as the top', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')

      m.add(a)
      expect(m.isTop(a)).toBe(true)

      m.add(b)
      expect(m.isTop(b)).toBe(true)
      expect(m.isTop(a)).toBe(false)
    })

    it('restores the previous popup as top after the top is removed', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')
      m.add(a)
      m.add(b)

      m.remove(b)
      expect(m.isTop(a)).toBe(true)
    })

    it('does not add the same popup twice', () => {
      const m = createPopupsManager()
      const a = token('a')
      m.add(a)
      m.add(a)

      // 加兩次只會在堆疊出現一次：移除一次後堆疊應為空。
      m.remove(a)
      expect(m.isTop(a)).toBe(false)
    })

    it('isTop is false when the stack is empty', () => {
      const m = createPopupsManager()
      expect(m.isTop(token('a'))).toBe(false)
    })

    // 元件需用 computed(() => isTop(token)) 來反應「自己是否最上層」（決定要不要畫遮罩），
    // 因此堆疊變動必須觸發響應式更新。
    it('isTop is reactive to stack changes', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')
      const aIsTop = computed(() => m.isTop(a))

      m.add(a)
      expect(aIsTop.value).toBe(true)

      m.add(b)
      expect(aIsTop.value).toBe(false)

      m.remove(b)
      expect(aIsTop.value).toBe(true)
    })

    it('removing an unknown popup is a no-op', () => {
      const m = createPopupsManager()
      const a = token('a')
      m.add(a)
      m.remove(token('ghost'))
      expect(m.isTop(a)).toBe(true)
    })

    // isBottom 用來決定「誰渲染遮罩」：只有最底層畫遮罩，堆疊時不動它 → 不閃、不疊暗。
    it('treats the earliest added popup as the bottom', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')
      m.add(a)
      m.add(b)
      expect(m.isBottom(a)).toBe(true)
      expect(m.isBottom(b)).toBe(false)
    })

    it('a lone popup is both top and bottom', () => {
      const m = createPopupsManager()
      const a = token('a')
      m.add(a)
      expect(m.isTop(a)).toBe(true)
      expect(m.isBottom(a)).toBe(true)
    })

    it('isBottom is false when the stack is empty', () => {
      const m = createPopupsManager()
      expect(m.isBottom(token('a'))).toBe(false)
    })

    it('isBottom is reactive to stack changes', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')
      const bIsBottom = computed(() => m.isBottom(b))

      m.add(b)
      expect(bIsBottom.value).toBe(true) // b 單獨在堆疊 → 同時是最底層

      m.add(a) // a 後加，但 a 在 b 之上；b 仍是最底層？不，先加的才是底層
      expect(bIsBottom.value).toBe(true)

      m.remove(b)
      expect(bIsBottom.value).toBe(false) // b 移除後不再是最底層
    })
  })

  // ── scroll lock ───────────────────────────────────────────────────────────
  describe('scroll lock', () => {
    it('locks body scroll on the first lock', () => {
      const m = createPopupsManager()
      m.lock(token('a'))
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('keeps the body locked while any lock remains, releasing only on the last', () => {
      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')
      m.lock(a)
      m.lock(b)

      m.unlock(a)
      expect(document.body.style.overflow).toBe('hidden')

      m.unlock(b)
      expect(document.body.style.overflow).toBe('')
    })

    it('does not double-count the same popup lock', () => {
      const m = createPopupsManager()
      const a = token('a')
      m.lock(a)
      m.lock(a)

      // 同一 token 鎖兩次只算一次，解鎖一次就應釋放。
      m.unlock(a)
      expect(document.body.style.overflow).toBe('')
    })

    it('unlocking an unknown popup is a no-op and does not release the lock', () => {
      const m = createPopupsManager()
      m.lock(token('a'))
      m.unlock(token('ghost'))
      expect(document.body.style.overflow).toBe('hidden')
    })

    // 宿主 App 可能自己在 body 設了 inline 樣式：解鎖不能直接清成 ''，
    // 必須還原鎖定前保存的原值。
    it('restores pre-existing body inline styles after the last unlock', () => {
      document.body.style.overflow = 'scroll'
      document.body.style.paddingRight = '12px'

      const m = createPopupsManager()
      const a = token('a')
      const b = token('b')

      m.lock(a)
      m.lock(b)
      expect(document.body.style.overflow).toBe('hidden')

      // 中間層解鎖不還原。
      m.unlock(a)
      expect(document.body.style.overflow).toBe('hidden')

      // 最後解鎖 → 還原宿主原本的 inline 樣式。
      m.unlock(b)
      expect(document.body.style.overflow).toBe('scroll')
      expect(document.body.style.paddingRight).toBe('12px')
    })
  })
})

describe('usePopupsManager', () => {
  it('returns the same singleton instance across calls', () => {
    expect(usePopupsManager()).toBe(usePopupsManager())
  })
})
