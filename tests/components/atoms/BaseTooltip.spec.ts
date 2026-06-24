import { describe, it, expect, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import BaseTooltip from '~/components/atoms/BaseTooltip.vue'
import type { BasePopoverTrigger, BasePopoverPlacement } from '~/components/atoms/BasePopover.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MountOptions {
  content?: string
  trigger?: BasePopoverTrigger | BasePopoverTrigger[]
  placement?: BasePopoverPlacement
  disabled?: boolean
  default?: () => unknown
  contentSlot?: () => unknown
}

function mountTooltip(options: MountOptions = {}) {
  const {
    default: defaultSlot = () => h('button', { class: 'trigger', type: 'button' }, 'hover me'),
    contentSlot,
    ...props
  } = options

  const slots: Record<string, unknown> = { default: defaultSlot }
  if (contentSlot) slots.content = contentSlot

  return mount(BaseTooltip, {
    props,
    slots: slots as never,
    attachTo: document.body,
  })
}

/** 提示泡泡被 Teleport 到 body，需直接查 document。 */
function tooltipEl(): HTMLElement | null {
  return document.body.querySelector('.base-tooltip')
}

function isOpen(): boolean {
  return tooltipEl() !== null
}

let active: ReturnType<typeof mountTooltip> | null = null

function track(wrapper: ReturnType<typeof mountTooltip>) {
  active = wrapper
  return wrapper
}

afterEach(() => {
  active?.unmount()
  active = null
  document.body.querySelectorAll('.base-popover').forEach((el) => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseTooltip', () => {
  // ── reference & a11y ─────────────────────────────────────────────────────────
  describe('reference & a11y', () => {
    it('renders the trigger from the default slot', () => {
      const wrapper = track(mountTooltip())
      expect(wrapper.find('.trigger').exists()).toBe(true)
    })

    it('does not set aria-haspopup (tooltip role)', () => {
      const wrapper = track(mountTooltip())
      expect(wrapper.find('.trigger').attributes('aria-haspopup')).toBeUndefined()
    })

    it('applies role="tooltip" to the floating element', async () => {
      const wrapper = track(mountTooltip({ content: 'hi' }))
      await wrapper.find('.trigger').trigger('mouseenter')
      expect(document.body.querySelector('.base-popover')?.getAttribute('role')).toBe('tooltip')
    })

    // tooltip 的正確 ARIA 語意：用 aria-describedby 連結提示，不標 aria-expanded / aria-controls
    // （那些是 disclosure widget 的語意，會讓螢幕閱讀器誤念「已摺疊」）。
    it('describes the trigger via aria-describedby, not aria-controls/expanded', async () => {
      const wrapper = track(mountTooltip({ content: 'hi' }))
      const trigger = wrapper.find('.trigger')

      // disclosure 語意不該出現在 tooltip 觸發元素上
      expect(trigger.attributes('aria-expanded')).toBeUndefined()
      expect(trigger.attributes('aria-controls')).toBeUndefined()

      // describedby 指向提示浮層 id（開啟後 id 對得上）
      await trigger.trigger('mouseenter')
      const describedby = trigger.attributes('aria-describedby')
      expect(describedby).toBeTruthy()
      expect(document.body.querySelector('.base-popover')?.id).toBe(describedby)
    })
  })

  // ── hover trigger (default) ───────────────────────────────────────────────────
  describe('hover trigger (default)', () => {
    it('opens on mouseenter and teleports content to body', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text' }))
      expect(isOpen()).toBe(false)
      await wrapper.find('.trigger').trigger('mouseenter')
      expect(isOpen()).toBe(true)
      expect(tooltipEl()?.textContent).toContain('tip text')
    })

    it('opens on focus (keyboard accessibility)', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text' }))
      await wrapper.find('.trigger').trigger('focus')
      expect(isOpen()).toBe(true)
    })

    it('does not open on click (hover/focus only by default)', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text' }))
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(false)
    })

    it('closes on blur', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text' }))
      const trigger = wrapper.find('.trigger')
      await trigger.trigger('focus')
      expect(isOpen()).toBe(true)
      await trigger.trigger('blur')
      await nextTick()
      expect(isOpen()).toBe(false)
    })
  })

  // ── content ───────────────────────────────────────────────────────────────────
  describe('content', () => {
    it('renders the content slot over the content prop', async () => {
      const wrapper = track(
        mountTooltip({
          content: 'prop text',
          contentSlot: () => h('strong', { class: 'rich' }, 'slot text'),
        }),
      )
      await wrapper.find('.trigger').trigger('mouseenter')
      expect(tooltipEl()?.querySelector('.rich')).toBeTruthy()
      expect(tooltipEl()?.textContent).toContain('slot text')
      expect(tooltipEl()?.textContent).not.toContain('prop text')
    })

    it('never renders a tooltip when there is no content', async () => {
      const wrapper = track(mountTooltip())
      await wrapper.find('.trigger').trigger('mouseenter')
      await flushPromises()
      expect(isOpen()).toBe(false)
    })

    it('renders an arrow element alongside the content', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text' }))
      await wrapper.find('.trigger').trigger('mouseenter')
      const arrow = tooltipEl()?.querySelector('.base-tooltip__arrow')
      expect(arrow).toBeTruthy()
      expect(arrow?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  // ── trigger override ──────────────────────────────────────────────────────────
  describe('trigger override', () => {
    it('opens on click when trigger is set to click', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text', trigger: 'click' }))
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('does not open when disabled', async () => {
      const wrapper = track(mountTooltip({ content: 'tip text', disabled: true }))
      await wrapper.find('.trigger').trigger('mouseenter')
      expect(isOpen()).toBe(false)
    })
  })
})
