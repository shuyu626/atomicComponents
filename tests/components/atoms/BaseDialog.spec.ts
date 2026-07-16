import { describe, it, expect, afterEach, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { VNode } from 'vue'

import BaseDialog from '~/components/atoms/BaseDialog.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountOptions {
  modelValue?: boolean
  title?: string
  ariaLabel?: string
  closeLabel?: string
  beforeClose?: (done: () => void) => void
  width?: number | string
  fullscreen?: boolean
  draggable?: boolean
  transition?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  hideBackdrop?: boolean
  hideCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  lockScroll?: boolean
  confirmText?: string
  cancelText?: string
  confirmColor?: string
  confirmVariant?: string
  confirmLoading?: boolean
  confirmDisabled?: boolean
  default?: (props: { close: () => void }) => unknown
  title_?: () => unknown
  footer?: (props: { close: () => void; confirm: () => void; cancel: () => void }) => unknown
}

function defaultContent(): VNode {
  return h('div', { class: 'dialog-content' }, [
    h('button', { class: 'inner-btn', type: 'button' }, 'inner'),
  ])
}

function mountDialog(options: MountOptions = {}) {
  const {
    modelValue = true,
    default: defaultSlot = defaultContent,
    title_,
    footer,
    ...props
  } = options

  const slots: Record<string, unknown> = { default: defaultSlot }
  if (title_) slots.title = title_
  if (footer) slots.footer = footer

  return mount(BaseDialog, {
    props: { modelValue, ...props },
    slots: slots as never,
    attachTo: document.body,
    global: { stubs: { transition: true } },
  })
}

function wrapperEl(): HTMLElement | null {
  return document.body.querySelector('.base-dialog__wrapper')
}

function overlayEl(): HTMLElement | null {
  return document.body.querySelector('.base-dialog')
}

function sensors(): NodeListOf<HTMLElement> {
  return document.body.querySelectorAll('.base-dialog__sensor')
}

function isOpen(): boolean {
  return wrapperEl() !== null
}

let active: ReturnType<typeof mountDialog> | null = null
function track(wrapper: ReturnType<typeof mountDialog>) {
  active = wrapper
  return wrapper
}

afterEach(() => {
  active?.unmount()
  active = null
  document.body.querySelectorAll('.base-dialog').forEach((el) => el.remove())
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseDialog', () => {
  describe('render & a11y', () => {
    it('renders nothing when closed', () => {
      track(mountDialog({ modelValue: false }))
      expect(isOpen()).toBe(false)
    })

    it('teleports the dialog to body when open', () => {
      track(mountDialog())
      expect(isOpen()).toBe(true)
      expect(wrapperEl()?.querySelector('.dialog-content')).toBeTruthy()
    })

    it('marks the wrapper as a modal dialog', () => {
      track(mountDialog())
      const wrapper = wrapperEl()!
      expect(wrapper.getAttribute('role')).toBe('dialog')
      expect(wrapper.getAttribute('aria-modal')).toBe('true')
    })

    it('renders the title and links it via aria-labelledby', () => {
      track(mountDialog({ title: '編輯' }))
      const wrapper = wrapperEl()!
      const titleEl = wrapper.querySelector('.base-dialog__title') as HTMLElement
      expect(titleEl.textContent?.trim()).toBe('編輯')
      expect(wrapper.getAttribute('aria-labelledby')).toBe(titleEl.id)
    })

    it('renders a #title slot and links it via aria-labelledby', () => {
      track(mountDialog({ title_: () => h('span', { class: 'custom-title' }, '自訂') }))
      const wrapper = wrapperEl()!
      expect(wrapper.querySelector('.custom-title')).toBeTruthy()
      expect(wrapper.getAttribute('aria-labelledby')).toBeTruthy()
    })

    it('uses ariaLabel as the accessible name when there is no title', () => {
      track(mountDialog({ ariaLabel: '設定' }))
      const wrapper = wrapperEl()!
      expect(wrapper.getAttribute('aria-label')).toBe('設定')
      expect(wrapper.getAttribute('aria-labelledby')).toBeNull()
    })

    it('links the content via aria-describedby', () => {
      track(mountDialog({ title: 'x' }))
      const wrapper = wrapperEl()!
      const content = wrapper.querySelector('.base-dialog__content') as HTMLElement
      expect(wrapper.getAttribute('aria-describedby')).toBe(content.id)
    })

    it('renders the footer slot', () => {
      track(mountDialog({ footer: () => h('div', { class: 'my-footer' }, 'F') }))
      expect(wrapperEl()!.querySelector('.my-footer')).toBeTruthy()
    })

    it('defaults the close button aria-label to 關閉', () => {
      track(mountDialog({ title: '編輯' }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement
      expect(closeBtn.getAttribute('aria-label')).toBe('關閉')
    })

    it('overrides the close button aria-label via closeLabel', () => {
      track(mountDialog({ title: '編輯', closeLabel: 'Close' }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement
      expect(closeBtn.getAttribute('aria-label')).toBe('Close')
    })
  })

  describe('width', () => {
    it('applies a numeric width as px via the --dialog-width token', () => {
      track(mountDialog({ width: 480 }))
      expect(overlayEl()!.style.getPropertyValue('--dialog-width')).toBe('480px')
    })

    it('passes a string width through unchanged', () => {
      track(mountDialog({ width: '60%' }))
      expect(overlayEl()!.style.getPropertyValue('--dialog-width')).toBe('60%')
    })
  })

  describe('fullscreen', () => {
    it('adds the fullscreen modifier class', () => {
      track(mountDialog({ fullscreen: true }))
      expect(overlayEl()!.classList.contains('base-dialog--fullscreen')).toBe(true)
    })

    it('renders a close button and closes on click', async () => {
      const wrapper = track(mountDialog({ fullscreen: true }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement
      expect(closeBtn).toBeTruthy()
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not render drag sensors in fullscreen even when draggable', () => {
      track(mountDialog({ fullscreen: true, draggable: true }))
      expect(sensors()).toHaveLength(0)
    })
  })

  describe('built-in confirm / cancel actions', () => {
    const footerBtns = () =>
      Array.from(document.body.querySelectorAll('.base-dialog__footer button')) as HTMLElement[]

    it('renders no footer without a slot or confirm/cancel text', () => {
      track(mountDialog())
      expect(document.body.querySelector('.base-dialog__footer')).toBeNull()
    })

    it('renders built-in confirm / cancel buttons from props', () => {
      track(mountDialog({ confirmText: '確認', cancelText: '取消' }))
      const labels = footerBtns().map((b) => b.textContent?.trim())
      expect(labels).toEqual(['取消', '確認'])
    })

    it('confirm emits confirm and does NOT close (caller controls)', async () => {
      const wrapper = track(mountDialog({ confirmText: '確認' }))
      footerBtns()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('confirm')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('cancel emits cancel and closes', async () => {
      const wrapper = track(mountDialog({ cancelText: '取消' }))
      footerBtns()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('a #footer slot overrides the built-in buttons', () => {
      track(mountDialog({
        confirmText: '確認',
        cancelText: '取消',
        footer: () => h('button', { class: 'custom-footer-btn' }, '自訂'),
      }))
      expect(document.body.querySelector('.custom-footer-btn')).toBeTruthy()
      // 內建按鈕不應出現（slot 覆寫 fallback）
      expect(footerBtns().map((b) => b.textContent?.trim())).toEqual(['自訂'])
    })
  })

  describe('draggable', () => {
    it('renders no sensors by default', () => {
      track(mountDialog())
      expect(sensors()).toHaveLength(0)
    })

    // 無標題列：退回四邊感應區拖曳（內容仍可選取）。
    it('renders four edge sensors when draggable without a header', () => {
      track(mountDialog({ draggable: true }))
      expect(sensors()).toHaveLength(4)
    })

    it('translates the wrapper when dragging a sensor', async () => {
      track(mountDialog({ draggable: true }))
      const sensor = sensors()[0]
      sensor.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }),
      )
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 140 }))
      await nextTick()
      const transform = wrapperEl()!.style.transform
      expect(transform).toContain('50px')
      expect(transform).toContain('40px')
      window.dispatchEvent(new MouseEvent('pointerup', {}))
    })

    it('marks the overlay with the dragging modifier while dragging', async () => {
      track(mountDialog({ draggable: true }))
      const sensor = sensors()[0]
      sensor.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true }),
      )
      await nextTick()
      expect(overlayEl()!.classList.contains('base-dialog--dragging')).toBe(true)
      window.dispatchEvent(new MouseEvent('pointerup', {}))
    })

    // 有標題列：改用 header 當把手（避開右側捲軸 / 底部按鈕），不渲染感應區。
    it('uses the header as the drag handle when a title is present (no sensors)', async () => {
      track(mountDialog({ draggable: true, title: '可拖曳' }))
      expect(sensors()).toHaveLength(0)

      const header = wrapperEl()!.querySelector('.base-dialog__header') as HTMLElement
      expect(header.classList.contains('base-dialog__header--draggable')).toBe(true)

      header.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }),
      )
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 130, clientY: 120 }))
      await nextTick()
      const transform = wrapperEl()!.style.transform
      expect(transform).toContain('30px')
      expect(transform).toContain('20px')
      window.dispatchEvent(new MouseEvent('pointerup', {}))
    })

    // 按關閉鈕不應誤判為拖曳起點（@pointerdown.stop），且仍能正常關閉。
    it('does not start a drag from the close button', async () => {
      const wrapper = track(mountDialog({ draggable: true, title: '可拖曳' }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement

      closeBtn.dispatchEvent(
        new MouseEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true }),
      )
      await nextTick()
      expect(overlayEl()!.classList.contains('base-dialog--dragging')).toBe(false)
      window.dispatchEvent(new MouseEvent('pointermove', { clientX: 80, clientY: 80 }))
      await nextTick()
      expect(wrapperEl()!.style.transform).toBe('')

      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not render a draggable header when not draggable', () => {
      track(mountDialog({ title: '一般' }))
      const header = wrapperEl()!.querySelector('.base-dialog__header') as HTMLElement
      expect(header.classList.contains('base-dialog__header--draggable')).toBe(false)
    })
  })

  describe('closing', () => {
    it('closes on Escape', async () => {
      const wrapper = track(mountDialog())
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not close on Escape when closeOnEscape is false', async () => {
      const wrapper = track(mountDialog({ closeOnEscape: false }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('closes when pressing and releasing outside the wrapper', async () => {
      const wrapper = track(mountDialog())
      const overlay = overlayEl()!
      overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not close when clicking inside the wrapper', async () => {
      const wrapper = track(mountDialog())
      const content = wrapperEl()!.querySelector('.dialog-content') as HTMLElement
      content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('does not close on backdrop click when closeOnBackdrop is false', async () => {
      const wrapper = track(mountDialog({ closeOnBackdrop: false }))
      const overlay = overlayEl()!
      overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('exposes close() through the default slot', async () => {
      const wrapper = track(
        mountDialog({
          default: ({ close }) =>
            h('button', { class: 'slot-close', type: 'button', onClick: close }, 'x'),
        }),
      )
      const btn = wrapperEl()!.querySelector('.slot-close') as HTMLElement
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })
  })

  describe('backdrop & scroll lock', () => {
    it('renders a backdrop by default', () => {
      track(mountDialog())
      expect(overlayEl()!.querySelector('.base-dialog__backdrop')).toBeTruthy()
    })

    it('omits the backdrop with hideBackdrop', () => {
      track(mountDialog({ hideBackdrop: true }))
      expect(overlayEl()!.querySelector('.base-dialog__backdrop')).toBeNull()
    })

    it('locks body scroll while open and restores it on close', async () => {
      const wrapper = track(mountDialog())
      expect(document.body.style.overflow).toBe('hidden')
      await wrapper.setProps({ modelValue: false })
      await flushPromises()
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('focus management', () => {
    it('moves focus into the dialog when opened', async () => {
      track(mountDialog())
      await flushPromises()
      await nextTick()
      expect(wrapperEl()!.contains(document.activeElement)).toBe(true)
    })
  })

  // ── beforeClose hook（對齊 BaseModal / BaseDrawer：done-callback 契約）────────────
  describe('beforeClose', () => {
    it('intercepts the close button: calls beforeClose, does not close yet', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(mountDialog({ title: '編輯', beforeClose }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('closes only after beforeClose invokes done()', async () => {
      const beforeClose = vi.fn((done: () => void) => done())
      const wrapper = track(mountDialog({ title: '編輯', beforeClose }))
      const closeBtn = wrapperEl()!.querySelector('.base-dialog__close') as HTMLElement
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('gates the Esc close path through beforeClose', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(mountDialog({ beforeClose }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('gates the backdrop close path through beforeClose', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(mountDialog({ beforeClose }))
      const overlay = overlayEl()!
      overlay.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('gates the built-in cancel button: cancel is emitted but the dialog stays open', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(mountDialog({ cancelText: '取消', beforeClose }))
      const cancelBtn = document.body.querySelector('.base-dialog__footer button') as HTMLElement
      cancelBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('cancel')).toHaveLength(1)
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('gates the slot close() through beforeClose', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(
        mountDialog({
          beforeClose,
          default: ({ close }) =>
            h('button', { class: 'slot-close', type: 'button', onClick: close }, 'x'),
        }),
      )
      const btn = wrapperEl()!.querySelector('.slot-close') as HTMLElement
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('does not run beforeClose on programmatic (v-model) close', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(mountDialog({ beforeClose }))
      await wrapper.setProps({ modelValue: false })
      await flushPromises()
      expect(beforeClose).not.toHaveBeenCalled()
    })

    // 非同步流程：resolve 後呼叫 done() → 關閉；reject（不呼叫 done）→ 取消關閉、維持開啟。
    it('closes when an async beforeClose resolves and calls done()', async () => {
      const beforeClose = vi.fn((done: () => void) => {
        void Promise.resolve(true).then(() => done())
      })
      const wrapper = track(mountDialog({ beforeClose }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('stays open when an async beforeClose rejects (done never called)', async () => {
      const beforeClose = vi.fn((done: () => void) => {
        Promise.reject(new Error('unsaved changes')).then(
          () => done(),
          () => { /* 使用者取消離開 → 不呼叫 done()，對話框維持開啟 */ },
        )
      })
      const wrapper = track(mountDialog({ beforeClose }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
      expect(isOpen()).toBe(true)
    })
  })

  // ── 生命週期事件（對齊 BaseModal / BaseDrawer）─────────────────────────────────
  // open / close（動畫「前」）由 watch(open) 發出，不依賴 transition；掛載即開啟者另由
  // onMounted 補發 open。opened / closed（動畫「後」）由 <Transition> after-hook 發出，需真實 transition。
  describe('lifecycle events', () => {
    const mountReal = (props: Record<string, unknown>) =>
      mount(BaseDialog, {
        props: { ...props },
        slots: { default: defaultContent } as never,
        attachTo: document.body,
        global: { stubs: { transition: false } },
      })

    it('emits open when it starts opening', async () => {
      const wrapper = track(mountDialog({ modelValue: false }))
      await wrapper.setProps({ modelValue: true })
      expect(wrapper.emitted('open')).toHaveLength(1)
    })

    it('emits close when it starts closing', async () => {
      const wrapper = track(mountDialog({ modelValue: true }))
      await wrapper.setProps({ modelValue: false })
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits open on mount when already open (no opened-without-open asymmetry)', () => {
      const wrapper = track(mountDialog({ modelValue: true }))
      expect(wrapper.emitted('open')).toHaveLength(1)
    })

    it('emits opened after the open transition finishes', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = mountReal({ modelValue: false })
        active = wrapper
        await wrapper.setProps({ modelValue: true })
        await vi.advanceTimersByTimeAsync(1000)
        expect(wrapper.emitted('opened')).toBeTruthy()
      }
      finally {
        vi.useRealTimers()
      }
    })

    it('emits open → opened → close → closed in order across a full cycle', async () => {
      vi.useFakeTimers()
      try {
        const order: string[] = []
        const wrapper = mountReal({
          modelValue: false,
          onOpen: () => order.push('open'),
          onOpened: () => order.push('opened'),
          onClose: () => order.push('close'),
          onClosed: () => order.push('closed'),
        })
        active = wrapper
        await wrapper.setProps({ modelValue: true })
        await vi.advanceTimersByTimeAsync(1000)
        await wrapper.setProps({ modelValue: false })
        await vi.advanceTimersByTimeAsync(1000)
        expect(order).toEqual(['open', 'opened', 'close', 'closed'])
      }
      finally {
        vi.useRealTimers()
      }
    })
  })

  // ── 拖曳位移 reset 時機：關閉指令當下不 reset，離場動畫結束（after-leave）才歸零 ──
  describe('drag reset timing', () => {
    it('keeps the drag translate during the leave transition and resets it after leave', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = mount(BaseDialog, {
          props: { modelValue: true, draggable: true },
          slots: { default: defaultContent } as never,
          attachTo: document.body,
          global: { stubs: { transition: false } },
        })
        active = wrapper
        await vi.advanceTimersByTimeAsync(1000)

        // 拖曳位移
        const sensor = sensors()[0]
        sensor.dispatchEvent(
          new MouseEvent('pointerdown', { clientX: 100, clientY: 100, bubbles: true }),
        )
        window.dispatchEvent(new MouseEvent('pointermove', { clientX: 150, clientY: 140 }))
        window.dispatchEvent(new MouseEvent('pointerup', {}))
        await nextTick()
        expect(wrapperEl()!.style.transform).toContain('50px')

        // 關閉指令當下：離場動畫進行中，translate 樣式必須仍在（避免起點跳回置中的一幀跳位）。
        await wrapper.setProps({ modelValue: false })
        expect(wrapperEl()).not.toBeNull()
        expect(wrapperEl()!.style.transform).toContain('50px')

        // 離場動畫結束（after-leave）：發出 closed、位移歸零並卸載。
        await vi.advanceTimersByTimeAsync(1000)
        expect(wrapper.emitted('closed')).toBeTruthy()
        expect(wrapperEl()).toBeNull()

        // 重新開啟：回到置中（無 inline transform）。
        await wrapper.setProps({ modelValue: true })
        await vi.advanceTimersByTimeAsync(1000)
        expect(wrapperEl()!.style.transform).toBe('')
      }
      finally {
        vi.useRealTimers()
      }
    })
  })
})
