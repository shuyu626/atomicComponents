import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseToast from '~/components/atoms/BaseToast.vue'
import type { ToastType } from '~/composables/useToast'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountOptions {
  message?: string
  title?: string
  type?: ToastType
  duration?: number
  closable?: boolean
  progress?: boolean
  slots?: Record<string, unknown>
}

function mountToast(options: MountOptions = {}) {
  const { slots, ...props } = options
  return mount(BaseToast, {
    props: {
      message: 'hello',
      ...props,
    },
    slots: slots as never,
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseToast', () => {
  describe('渲染', () => {
    it('顯示 message 與選填 title', () => {
      const wrapper = mountToast({ message: '已儲存', title: '成功' })

      expect(wrapper.find('.base-toast__message').text()).toBe('已儲存')
      expect(wrapper.find('.base-toast__title').text()).toBe('成功')
    })

    it('未給 title 時不渲染標題', () => {
      const wrapper = mountToast()
      expect(wrapper.find('.base-toast__title').exists()).toBe(false)
    })

    it('依 type 套用 class', () => {
      expect(mountToast({ type: 'success' }).classes()).toContain('base-toast--success')
      expect(mountToast({ type: 'error' }).classes()).toContain('base-toast--error')
    })
  })

  describe('slots', () => {
    it('#icon 取代預設類型徽章', () => {
      const wrapper = mountToast({
        slots: { icon: () => h('i', { class: 'my-icon' }, '★') },
      })

      expect(wrapper.find('.my-icon').exists()).toBe(true)
      expect(wrapper.find('.base-toast__icon').exists()).toBe(false)
    })

    it('#default 取代 message 內文', () => {
      const wrapper = mountToast({
        message: 'fallback',
        slots: { default: () => h('strong', { class: 'custom-body' }, '自訂內容') },
      })

      expect(wrapper.find('.custom-body').text()).toBe('自訂內容')
      expect(wrapper.find('.base-toast__message').text()).toBe('自訂內容')
    })

    it('#action 渲染後置動作區', () => {
      const wrapper = mountToast({
        slots: { action: () => h('button', { class: 'undo' }, '復原') },
      })

      expect(wrapper.find('.base-toast__action .undo').exists()).toBe(true)
    })

    it('未提供 #action 時不渲染後置區', () => {
      expect(mountToast().find('.base-toast__action').exists()).toBe(false)
    })
  })

  describe('進度條', () => {
    it('progress=true 且 duration>0 時渲染', () => {
      expect(mountToast({ progress: true, duration: 3000 }).find('.base-toast__progress').exists()).toBe(true)
    })

    it('progress=false 時不渲染', () => {
      expect(mountToast({ progress: false, duration: 3000 }).find('.base-toast__progress').exists()).toBe(false)
    })

    it('duration=0（常駐）時即使 progress=true 也不渲染', () => {
      expect(mountToast({ progress: true, duration: 0 }).find('.base-toast__progress').exists()).toBe(false)
    })

    it('動畫時長對應 duration', () => {
      const wrapper = mountToast({ progress: true, duration: 4000 })
      expect(wrapper.find('.base-toast__progress').attributes('style')).toContain('4000ms')
    })
  })

  describe('無障礙', () => {
    it('error / warning 用 role=alert + aria-live=assertive', () => {
      const error = mountToast({ type: 'error' })
      expect(error.attributes('role')).toBe('alert')
      expect(error.attributes('aria-live')).toBe('assertive')

      const warning = mountToast({ type: 'warning' })
      expect(warning.attributes('role')).toBe('alert')
    })

    it('success / info 用 role=status + aria-live=polite', () => {
      const info = mountToast({ type: 'info' })
      expect(info.attributes('role')).toBe('status')
      expect(info.attributes('aria-live')).toBe('polite')

      expect(mountToast({ type: 'success' }).attributes('role')).toBe('status')
    })
  })

  describe('關閉按鈕', () => {
    it('closable 預設顯示，點擊 emit close', async () => {
      const wrapper = mountToast()
      const button = wrapper.find('.base-toast__close')
      expect(button.exists()).toBe(true)

      await button.trigger('click')
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('closable=false 不渲染關閉按鈕', () => {
      const wrapper = mountToast({ closable: false })
      expect(wrapper.find('.base-toast__close').exists()).toBe(false)
    })
  })

  describe('自動消失', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('duration 到期後 emit close', () => {
      const wrapper = mountToast({ duration: 3000 })

      vi.advanceTimersByTime(2999)
      expect(wrapper.emitted('close')).toBeUndefined()

      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('duration=0 常駐，永不自動 emit close', () => {
      const wrapper = mountToast({ duration: 0 })

      vi.advanceTimersByTime(100000)
      expect(wrapper.emitted('close')).toBeUndefined()
    })

    it('hover 暫停計時，移開後以剩餘時間續跑', async () => {
      const wrapper = mountToast({ duration: 1000 })

      vi.advanceTimersByTime(600)
      await wrapper.trigger('mouseenter') // 暫停，剩餘 ~400ms

      vi.advanceTimersByTime(1000) // 暫停期間不應觸發
      expect(wrapper.emitted('close')).toBeUndefined()

      await wrapper.trigger('mouseleave') // 續跑剩餘 400ms
      vi.advanceTimersByTime(399)
      expect(wrapper.emitted('close')).toBeUndefined()

      vi.advanceTimersByTime(1)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('鍵盤聚焦中即使滑鼠移開仍維持暫停', async () => {
      const wrapper = mountToast({ duration: 1000 })

      await wrapper.trigger('mouseenter') // hover 暫停
      await wrapper.trigger('focusin') // focus 暫停
      await wrapper.trigger('mouseleave') // 滑鼠移開，但焦點仍在 → 維持暫停

      vi.advanceTimersByTime(2000)
      expect(wrapper.emitted('close')).toBeUndefined()

      await wrapper.trigger('focusout') // 焦點離開 → 以剩餘時間續跑
      vi.advanceTimersByTime(1000)
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('卸載時清除計時器，不再 emit', () => {
      const wrapper = mountToast({ duration: 1000 })
      wrapper.unmount()

      vi.advanceTimersByTime(2000)
      expect(wrapper.emitted('close')).toBeUndefined()
    })
  })
})
