import { describe, it, expect, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { VNode } from 'vue'

import BasePopover from '~/components/atoms/BasePopover.vue'
import type { BasePopoverTrigger } from '~/components/atoms/BasePopover.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountOptions {
  trigger?: BasePopoverTrigger | BasePopoverTrigger[]
  disabled?: boolean
  role?: string
  modelValue?: boolean
  disableFocusTrap?: boolean
  hoverCloseDelay?: number
  reference?: () => unknown
  default?: ((props: { close: () => void }) => unknown) | false
}

// 預設 default slot：放一顆按鈕（有可聚焦內容，貼近真實 popover），並把 close 接上去。
function defaultContent({ close }: { close: () => void }): VNode {
  return h('div', { class: 'popover-content' }, [
    h('button', { class: 'close-btn', type: 'button', onClick: close }, 'close'),
  ])
}

function mountPopover(options: MountOptions = {}) {
  const {
    reference = () => h('button', { class: 'trigger', type: 'button' }, 'open'),
    default: defaultSlot = defaultContent,
    disableFocusTrap = true, // 多數測試不驗 focus-trap，預設關掉避免干擾焦點
    ...props
  } = options

  const slots: Record<string, unknown> = { reference }
  if (defaultSlot !== false) slots.default = defaultSlot

  return mount(BasePopover, {
    props: { disableFocusTrap, ...props },
    slots: slots as never,
    attachTo: document.body,
  })
}

/** 浮層被 Teleport 到 body，不在 wrapper 內，需直接查 document。 */
function popoverEl(): HTMLElement | null {
  return document.body.querySelector('.base-popover')
}

function isOpen(): boolean {
  return popoverEl() !== null
}

let active: ReturnType<typeof mountPopover> | null = null

function track(wrapper: ReturnType<typeof mountPopover>) {
  active = wrapper
  return wrapper
}

afterEach(() => {
  active?.unmount()
  active = null
  // 保險：清掉任何殘留的 teleport 內容
  document.body.querySelectorAll('.base-popover').forEach((el) => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BasePopover', () => {
  // ── reference 與 a11y ───────────────────────────────────────────────────────
  describe('reference & a11y', () => {
    it('renders the reference element from the slot and applies the class', () => {
      const wrapper = track(mountPopover())
      const trigger = wrapper.find('.trigger')
      expect(trigger.exists()).toBe(true)
      // fallthrough：元件的 class 落到使用者傳入的按鈕上
      expect(trigger.classes()).toContain('base-popover__reference')
    })

    it('wires aria-expanded / aria-haspopup / aria-controls on the reference', async () => {
      const wrapper = track(mountPopover())
      const trigger = wrapper.find('.trigger')
      expect(trigger.attributes('aria-expanded')).toBe('false')
      expect(trigger.attributes('aria-haspopup')).toBe('true')
      // aria-controls 指向浮層 id
      const controls = trigger.attributes('aria-controls')
      expect(controls).toBeTruthy()

      await trigger.trigger('click')
      expect(trigger.attributes('aria-expanded')).toBe('true')
      expect(popoverEl()?.id).toBe(controls)
    })

    it('derives aria-haspopup from the role prop', () => {
      const wrapper = track(mountPopover({ role: 'menu' }))
      expect(wrapper.find('.trigger').attributes('aria-haspopup')).toBe('menu')
    })

    it('applies the role to the popover element', async () => {
      const wrapper = track(mountPopover({ role: 'menu' }))
      await wrapper.find('.trigger').trigger('click')
      expect(popoverEl()?.getAttribute('role')).toBe('menu')
    })

    it('wraps plain-text reference into a focusable span[role=button]', () => {
      const wrapper = track(mountPopover({ reference: () => 'just text' }))
      const span = wrapper.find('span[role="button"]')
      expect(span.exists()).toBe(true)
      expect(span.attributes('tabindex')).toBe('0')
      expect(span.text()).toBe('just text')
    })

    // 回歸：svg reference 須包整個 <svg>，不可只包它的子節點。
    it('wraps an <svg> reference into a focusable span, keeping the svg element', () => {
      const wrapper = track(mountPopover({ reference: () => h('svg', { class: 'icon' }) }))
      const span = wrapper.find('span[role="button"]')
      expect(span.exists()).toBe(true)
      expect(span.find('svg.icon').exists()).toBe(true)
    })

    it('does not set aria-haspopup for a tooltip role', () => {
      const wrapper = track(mountPopover({ role: 'tooltip', trigger: 'hover' }))
      expect(wrapper.find('.trigger').attributes('aria-haspopup')).toBeUndefined()
    })

    // tooltip role 走 describedby 語意（而非 disclosure 的 controls/expanded）。
    it('wires aria-describedby and omits controls/expanded for a tooltip role', async () => {
      const wrapper = track(mountPopover({ role: 'tooltip', trigger: 'hover' }))
      const trigger = wrapper.find('.trigger')
      expect(trigger.attributes('aria-controls')).toBeUndefined()
      expect(trigger.attributes('aria-expanded')).toBeUndefined()

      const describedby = trigger.attributes('aria-describedby')
      expect(describedby).toBeTruthy()
      await trigger.trigger('mouseenter')
      expect(popoverEl()?.id).toBe(describedby)
    })
  })

  // ── click trigger ───────────────────────────────────────────────────────────
  describe('click trigger (default)', () => {
    it('opens on click and teleports content to body', async () => {
      const wrapper = track(mountPopover())
      expect(isOpen()).toBe(false)
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)
      expect(popoverEl()?.querySelector('.popover-content')).toBeTruthy()
    })

    it('toggles closed when clicking the reference again', async () => {
      const wrapper = track(mountPopover())
      const trigger = wrapper.find('.trigger')
      await trigger.trigger('click')
      expect(isOpen()).toBe(true)
      await trigger.trigger('click')
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('does not open for non-matching trigger (hover-only) on click', async () => {
      const wrapper = track(mountPopover({ trigger: 'hover' }))
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(false)
    })

    // 非原生可鍵盤啟用的 reference（純文字 → span[role=button]）需靠 onKeydown 處理 Enter/Space。
    it('opens via Enter on a non-native (text) reference', async () => {
      const wrapper = track(mountPopover({ reference: () => 'menu' }))
      await wrapper.find('span[role="button"]').trigger('keydown', { key: 'Enter' })
      expect(isOpen()).toBe(true)
    })

    // 回歸：浮層需先定位才顯示，避免從畫面左上角閃現再跳到 reference 旁邊。
    it('only reveals (--positioned class) after floating-ui has positioned it', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      await flushPromises()
      await nextTick()
      expect(popoverEl()?.classList.contains('base-popover--positioned')).toBe(true)
    })
  })

  // ── close behaviours ────────────────────────────────────────────────────────
  describe('closing', () => {
    it('closes on Escape keydown', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(isOpen()).toBe(false)
    })

    it('closes on outside click', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)

      // 點 body（在 reference / 浮層之外）
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(isOpen()).toBe(false)
    })

    it('does not close when clicking inside the popover', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      const content = popoverEl()!.querySelector('.popover-content') as HTMLElement
      content.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(isOpen()).toBe(true)
    })

    it('closes via the slot-provided close()', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      const closeBtn = popoverEl()!.querySelector('.close-btn') as HTMLElement
      closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(isOpen()).toBe(false)
    })
  })

  // ── hover trigger ───────────────────────────────────────────────────────────
  describe('hover trigger', () => {
    it('opens on mouseenter', async () => {
      const wrapper = track(mountPopover({ trigger: 'hover' }))
      await wrapper.find('.trigger').trigger('mouseenter')
      expect(isOpen()).toBe(true)
    })

    it('delays close on mouseleave (does not close immediately)', async () => {
      const wrapper = track(mountPopover({ trigger: 'hover', hoverCloseDelay: 20 }))
      const trigger = wrapper.find('.trigger')
      await trigger.trigger('mouseenter')
      await trigger.trigger('mouseleave')
      // 延遲未到 → 仍開著
      expect(isOpen()).toBe(true)
      await new Promise((r) => setTimeout(r, 40))
      await flushPromises()
      expect(isOpen()).toBe(false)
    })

    it('cancels the pending close when the pointer moves onto the popover', async () => {
      const wrapper = track(mountPopover({ trigger: 'hover', hoverCloseDelay: 20 }))
      const trigger = wrapper.find('.trigger')
      await trigger.trigger('mouseenter')
      await trigger.trigger('mouseleave')
      // 在延遲到期前滑入浮層 → 取消關閉
      popoverEl()!.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))
      await new Promise((r) => setTimeout(r, 40))
      await flushPromises()
      expect(isOpen()).toBe(true)
    })
  })

  // ── focus trigger ───────────────────────────────────────────────────────────
  describe('focus trigger', () => {
    it('opens on focus and closes on blur', async () => {
      const wrapper = track(mountPopover({ trigger: 'focus' }))
      const trigger = wrapper.find('.trigger')
      await trigger.trigger('focus')
      expect(isOpen()).toBe(true)
      await trigger.trigger('blur')
      await nextTick()
      expect(isOpen()).toBe(false)
    })
  })

  // ── multiple triggers ───────────────────────────────────────────────────────
  describe('multiple triggers', () => {
    it('opens on either hover or focus when both are set', async () => {
      const wrapper = track(mountPopover({ trigger: ['hover', 'focus'] }))
      await wrapper.find('.trigger').trigger('focus')
      expect(isOpen()).toBe(true)
    })
  })

  // ── disabled ────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('does not open when disabled', async () => {
      const wrapper = track(mountPopover({ disabled: true }))
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(false)
      expect(wrapper.find('.trigger').attributes('aria-disabled')).toBe('true')
    })

    it('closes (unmounts the popover) when disabled becomes true while open', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)
      await wrapper.setProps({ disabled: true })
      await nextTick()
      expect(isOpen()).toBe(false)
    })
  })

  // ── no default slot ─────────────────────────────────────────────────────────
  describe('without default slot', () => {
    it('never renders a popover when there is no content', async () => {
      const wrapper = track(mountPopover({ default: false }))
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(false)
    })
  })

  // ── v-model ─────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('emits update:modelValue when toggled', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    })

    it('reflects an externally controlled open state', async () => {
      const wrapper = track(mountPopover({ modelValue: false }))
      expect(isOpen()).toBe(false)
      await wrapper.setProps({ modelValue: true })
      await nextTick()
      expect(isOpen()).toBe(true)
    })

    it('works uncontrolled (no v-model bound)', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)
    })
  })
})
