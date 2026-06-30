import { describe, it, expect, afterEach } from 'vitest'
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
  width?: number | string
  fullscreen?: boolean
  draggable?: boolean
  transition?: 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  hideBackdrop?: boolean
  hideCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  lockScroll?: boolean
  default?: (props: { close: () => void }) => unknown
  title_?: () => unknown
  footer?: (props: { close: () => void }) => unknown
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
})
