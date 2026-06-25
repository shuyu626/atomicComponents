import { describe, it, expect, vi } from 'vitest'

import { createToastManager, useToast } from '~/composables/useToast'

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useToast', () => {
  describe('show', () => {
    it('字串參數會正規化為帶預設值的 item', () => {
      const manager = createToastManager()
      const id = manager.show('hello')

      expect(manager.toasts).toHaveLength(1)
      expect(manager.toasts[0]).toMatchObject({
        id,
        message: 'hello',
        type: 'info',
        duration: 3000,
        closable: true,
        progress: false,
        placement: 'top-end',
      })
    })

    it('progress 預設 false，可逐筆開啟', () => {
      const manager = createToastManager()
      manager.show({ message: 'a' })
      manager.show({ message: 'b', progress: true })

      expect(manager.toasts.map(t => t.progress)).toEqual([false, true])
    })

    it('採用建立管理器時的 progress 預設', () => {
      const manager = createToastManager({ progress: true })
      manager.show('hi')

      expect(manager.toasts[0].progress).toBe(true)
    })

    it('物件參數可覆寫各欄位', () => {
      const manager = createToastManager()
      manager.show({
        message: 'saved',
        title: '成功',
        type: 'success',
        duration: 5000,
        closable: false,
        placement: 'bottom',
      })

      expect(manager.toasts[0]).toMatchObject({
        message: 'saved',
        title: '成功',
        type: 'success',
        duration: 5000,
        closable: false,
        placement: 'bottom',
      })
    })

    it('duration 明確傳 0 不會被預設值蓋掉（常駐）', () => {
      const manager = createToastManager()
      manager.show({ message: 'stay', duration: 0 })

      expect(manager.toasts[0].duration).toBe(0)
    })

    it('每筆配發唯一遞增 id', () => {
      const manager = createToastManager()
      const a = manager.show('a')
      const b = manager.show('b')

      expect(a).not.toBe(b)
      expect(manager.toasts.map(t => t.id)).toEqual([a, b])
    })

    it('採用建立管理器時的預設值', () => {
      const manager = createToastManager({ duration: 1000, placement: 'bottom-start' })
      manager.show('hi')

      expect(manager.toasts[0]).toMatchObject({ duration: 1000, placement: 'bottom-start' })
    })
  })

  describe('shortcuts', () => {
    it('success / error / warning / info 設定對應 type', () => {
      const manager = createToastManager()
      manager.success('s')
      manager.error('e')
      manager.warning('w')
      manager.info('i')

      expect(manager.toasts.map(t => t.type)).toEqual(['success', 'error', 'warning', 'info'])
    })

    it('捷徑第二參數可帶額外設定', () => {
      const manager = createToastManager()
      manager.error('boom', { duration: 0, placement: 'top' })

      expect(manager.toasts[0]).toMatchObject({ type: 'error', duration: 0, placement: 'top' })
    })
  })

  describe('dismiss', () => {
    it('依 id 移除並觸發 onClose', () => {
      const manager = createToastManager()
      const onClose = vi.fn()
      const id = manager.show({ message: 'x', onClose })

      manager.dismiss(id)

      expect(manager.toasts).toHaveLength(0)
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('移除不存在的 id 為 no-op', () => {
      const manager = createToastManager()
      manager.show('x')

      expect(() => manager.dismiss('not-exist')).not.toThrow()
      expect(manager.toasts).toHaveLength(1)
    })
  })

  describe('clear', () => {
    it('清空全部並逐筆觸發 onClose', () => {
      const manager = createToastManager()
      const onClose = vi.fn()
      manager.show({ message: 'a', onClose })
      manager.show({ message: 'b', onClose })

      manager.clear()

      expect(manager.toasts).toHaveLength(0)
      expect(onClose).toHaveBeenCalledTimes(2)
    })
  })

  describe('max 上限', () => {
    it('超過上限時擠掉最舊的並觸發其 onClose', () => {
      const onClose = vi.fn()
      const manager = createToastManager({ max: 2 })
      manager.show({ message: 'a', onClose })
      manager.show('b')
      manager.show('c')

      expect(manager.toasts).toHaveLength(2)
      expect(manager.toasts.map(t => t.message)).toEqual(['b', 'c'])
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('useToast 單例', () => {
    it('多次呼叫回傳同一實例', () => {
      expect(useToast()).toBe(useToast())
    })
  })
})
