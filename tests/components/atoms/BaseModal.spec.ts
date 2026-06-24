import { describe, it, expect, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { VNode } from 'vue'

import BaseModal from '~/components/atoms/BaseModal.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountOptions {
  modelValue?: boolean
  title?: string
  ariaLabel?: string
  hideBackdrop?: boolean
  hideCloseButton?: boolean
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
  lockScroll?: boolean
  default?: (props: { close: () => void }) => unknown
  header?: (props: { close: () => void }) => unknown
  footer?: (props: { close: () => void }) => unknown
}

function defaultContent(): VNode {
  return h('div', { class: 'modal-content' }, [
    h('button', { class: 'inner-btn', type: 'button' }, 'inner'),
  ])
}

function mountModal(options: MountOptions = {}) {
  const {
    modelValue = true,
    default: defaultSlot = defaultContent,
    header,
    footer,
    ...props
  } = options

  const slots: Record<string, unknown> = { default: defaultSlot }
  if (header) slots.header = header
  if (footer) slots.footer = footer

  return mount(BaseModal, {
    props: { modelValue, ...props },
    slots: slots as never,
    attachTo: document.body,
    // 同步化 Transition：leave 動畫在測試中立即完成，元件可立即卸載。
    global: { stubs: { transition: true } },
  })
}

/** modal 被 Teleport 到 body，需直接查 document。 */
function panelEl(): HTMLElement | null {
  return document.body.querySelector('.base-modal__panel')
}

function overlayEl(): HTMLElement | null {
  return document.body.querySelector('.base-modal')
}

function isOpen(): boolean {
  return panelEl() !== null
}

let active: ReturnType<typeof mountModal> | null = null

function track(wrapper: ReturnType<typeof mountModal>) {
  active = wrapper
  return wrapper
}

afterEach(() => {
  active?.unmount()
  active = null
  document.body.querySelectorAll('.base-modal').forEach((el) => el.remove())
  // 保險：還原 scroll-lock 可能留下的 body 樣式。
  document.body.style.overflow = ''
  document.body.style.paddingRight = ''
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseModal', () => {
  // ── 渲染與 a11y ──────────────────────────────────────────────────────────────
  describe('render & a11y', () => {
    it('renders nothing when closed', () => {
      track(mountModal({ modelValue: false }))
      expect(isOpen()).toBe(false)
    })

    it('teleports the dialog to body when open', () => {
      track(mountModal())
      expect(isOpen()).toBe(true)
      expect(panelEl()?.querySelector('.modal-content')).toBeTruthy()
    })

    it('marks the panel as a modal dialog', () => {
      track(mountModal())
      const panel = panelEl()!
      expect(panel.getAttribute('role')).toBe('dialog')
      expect(panel.getAttribute('aria-modal')).toBe('true')
    })

    it('renders the title and links it via aria-labelledby', () => {
      track(mountModal({ title: '確認刪除' }))
      const panel = panelEl()!
      const titleEl = panel.querySelector('.base-modal__title') as HTMLElement
      expect(titleEl.textContent).toBe('確認刪除')
      expect(panel.getAttribute('aria-labelledby')).toBe(titleEl.id)
      expect(titleEl.id).toBeTruthy()
    })

    it('uses ariaLabel as the dialog accessible name when there is no title', () => {
      track(mountModal({ ariaLabel: '設定' }))
      const panel = panelEl()!
      expect(panel.getAttribute('aria-label')).toBe('設定')
      expect(panel.getAttribute('aria-labelledby')).toBeNull()
    })

    it('prefers the title (aria-labelledby) over ariaLabel', () => {
      track(mountModal({ title: '標題', ariaLabel: '設定' }))
      const panel = panelEl()!
      expect(panel.getAttribute('aria-labelledby')).toBeTruthy()
      expect(panel.getAttribute('aria-label')).toBeNull()
    })

    it('renders header and footer slots', () => {
      track(
        mountModal({
          header: () => h('h2', { class: 'my-header' }, 'Header'),
          footer: () => h('div', { class: 'my-footer' }, 'Footer'),
        }),
      )
      expect(panelEl()!.querySelector('.my-header')).toBeTruthy()
      expect(panelEl()!.querySelector('.my-footer')).toBeTruthy()
    })
  })

  // ── 關閉行為 ──────────────────────────────────────────────────────────────────
  describe('closing', () => {
    it('shows a close button that closes the modal', async () => {
      const wrapper = track(mountModal())
      const closeBtn = panelEl()!.querySelector('.base-modal__close') as HTMLElement
      expect(closeBtn).toBeTruthy()

      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('hides the close button with hideCloseButton', () => {
      track(mountModal({ hideCloseButton: true }))
      expect(panelEl()!.querySelector('.base-modal__close')).toBeNull()
    })

    it('closes on Escape', async () => {
      const wrapper = track(mountModal())
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not close on Escape when closeOnEscape is false', async () => {
      const wrapper = track(mountModal({ closeOnEscape: false }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('closes when pressing and releasing on the backdrop / area outside the panel', async () => {
      const wrapper = track(mountModal())
      const backdrop = overlayEl()!.querySelector('.base-modal__backdrop') as HTMLElement
      backdrop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does not close when clicking inside the panel', async () => {
      const wrapper = track(mountModal())
      const content = panelEl()!.querySelector('.modal-content') as HTMLElement
      content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    // 防誤關：在面板內按住（如選取文字）滑出到外部放開，不應關閉。
    it('does not close when the press starts inside the panel and releases outside', async () => {
      const wrapper = track(mountModal())
      const content = panelEl()!.querySelector('.modal-content') as HTMLElement
      const overlay = overlayEl()!
      content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('does not close on backdrop click when closeOnBackdrop is false', async () => {
      const wrapper = track(mountModal({ closeOnBackdrop: false }))
      const backdrop = overlayEl()!.querySelector('.base-modal__backdrop') as HTMLElement
      backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('exposes close() through the default slot', async () => {
      const wrapper = track(
        mountModal({
          default: ({ close }) =>
            h('button', { class: 'slot-close', type: 'button', onClick: close }, 'x'),
        }),
      )
      const btn = panelEl()!.querySelector('.slot-close') as HTMLElement
      btn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })
  })

  // ── backdrop ──────────────────────────────────────────────────────────────────
  describe('backdrop', () => {
    it('renders a backdrop by default', () => {
      track(mountModal())
      expect(overlayEl()!.querySelector('.base-modal__backdrop')).toBeTruthy()
    })

    it('omits the backdrop with hideBackdrop', () => {
      track(mountModal({ hideBackdrop: true }))
      expect(overlayEl()!.querySelector('.base-modal__backdrop')).toBeNull()
    })

    // 多層疊開時只渲染最上層遮罩，避免半透明黑疊加越來越暗。
    it('renders only the top modal backdrop when two modals are stacked', async () => {
      const first = mountModal()
      const second = mountModal()
      await flushPromises()
      expect(document.body.querySelectorAll('.base-modal__backdrop')).toHaveLength(1)

      // 關掉最上層 → 下層變回最上層並補上遮罩，總數仍為 1。
      second.unmount()
      await flushPromises()
      expect(document.body.querySelectorAll('.base-modal__backdrop')).toHaveLength(1)

      first.unmount()
    })
  })

  // ── scroll lock ───────────────────────────────────────────────────────────────
  describe('scroll lock', () => {
    it('locks body scroll while open and restores it on close', async () => {
      const wrapper = track(mountModal())
      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ modelValue: false })
      await flushPromises()
      expect(document.body.style.overflow).toBe('')
    })

    it('does not lock body scroll when lockScroll is false', () => {
      track(mountModal({ lockScroll: false }))
      expect(document.body.style.overflow).toBe('')
    })
  })

  // ── v-model ───────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('reflects an externally controlled open state', async () => {
      const wrapper = track(mountModal({ modelValue: false }))
      expect(isOpen()).toBe(false)
      await wrapper.setProps({ modelValue: true })
      await nextTick()
      expect(isOpen()).toBe(true)
    })
  })

  // ── focus ──────────────────────────────────────────────────────────────────────
  describe('focus management', () => {
    it('moves focus into the dialog when opened', async () => {
      track(mountModal())
      await flushPromises()
      await nextTick()
      expect(panelEl()!.contains(document.activeElement)).toBe(true)
    })
  })
})
