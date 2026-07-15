import { describe, it, expect, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import type { VNode } from 'vue'

import BasePopover from '~/components/atoms/BasePopover.vue'
import type { BasePopoverTrigger } from '~/components/atoms/BasePopover.vue'
import { usePopupsManager } from '~/composables/usePopupsManager'

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
      // 關閉時浮層尚未渲染 → 不輸出 aria-controls（避免指向不存在的元素）
      expect(trigger.attributes('aria-controls')).toBeUndefined()

      await trigger.trigger('click')
      expect(trigger.attributes('aria-expanded')).toBe('true')
      // 開啟後 aria-controls 才指向實際渲染的浮層 id
      const controls = trigger.attributes('aria-controls')
      expect(controls).toBeTruthy()
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

    // tooltip role 走 describedby 語意（而非 disclosure 的 controls/expanded）；
    // describedby 僅在開啟（浮層實際渲染）時輸出，關閉時不得指向不存在的 id。
    it('wires aria-describedby and omits controls/expanded for a tooltip role', async () => {
      const wrapper = track(mountPopover({ role: 'tooltip', trigger: 'hover' }))
      const trigger = wrapper.find('.trigger')
      expect(trigger.attributes('aria-controls')).toBeUndefined()
      expect(trigger.attributes('aria-expanded')).toBeUndefined()

      await trigger.trigger('mouseenter')
      const describedby = trigger.attributes('aria-describedby')
      expect(describedby).toBeTruthy()
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

    it('Escape closes only the top-most popover when several are open', async () => {
      // 兩個浮層同時開啟（用 v-model 程式化開啟，避免點擊互相關閉），按 Esc 一次只關最上層。
      // 鎖住「一次全關」舊 bug 的回歸。
      const StackHost = defineComponent({
        setup() {
          const openA = ref(true)
          const openB = ref(true)
          return () =>
            h('div', [
              h(
                BasePopover,
                {
                  modelValue: openA.value,
                  'onUpdate:modelValue': (v: boolean) => { openA.value = v },
                  disableFocusTrap: true,
                },
                {
                  reference: () => h('button', { class: 'ra', type: 'button' }, 'a'),
                  default: () => h('div', { class: 'pa' }, 'A'),
                },
              ),
              h(
                BasePopover,
                {
                  modelValue: openB.value,
                  'onUpdate:modelValue': (v: boolean) => { openB.value = v },
                  disableFocusTrap: true,
                },
                {
                  reference: () => h('button', { class: 'rb', type: 'button' }, 'b'),
                  default: () => h('div', { class: 'pb' }, 'B'),
                },
              ),
            ])
        },
      })
      const host = mount(StackHost)
      await flushPromises()
      expect(document.body.querySelectorAll('.base-popover').length).toBe(2)

      // 第一次 Esc：只關後掛載的 B（最上層），A 仍在。
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(document.body.querySelector('.pb')).toBeNull()
      expect(document.body.querySelector('.pa')).not.toBeNull()

      // 第二次 Esc：才關 A。
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(document.body.querySelector('.pa')).toBeNull()

      host.unmount()
    })

    it('a disabled popover stays unregistered even when open=true (no phantom on the stack)', async () => {
      // disabled + v-model open=true 是矛盾狀態：浮層不該渲染，也就不會佔據堆疊頂層、
      // 不會吃掉 Esc 而卡死下層浮層。
      const wrapper = track(mountPopover({ disabled: true, modelValue: true }))
      await flushPromises()
      expect(isOpen()).toBe(false)
      // Esc 不應有任何作用、也不應拋錯（沒有 phantom 監聽殘留）
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

    // 回歸：在浮層內按住選取文字、滑到浮層外放開，觸發的 click 不應誤關；
    // 只有「按下與放開都在外部」才算點擊外部。
    it('does not close when the press starts inside the popover and releases outside', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)

      // mousedown 起始於浮層內 → 之後落在外部的 click 不關
      const content = popoverEl()!.querySelector('.popover-content') as HTMLElement
      content.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()
      expect(isOpen()).toBe(true)

      // 起點狀態不殘留：下一次「按下與放開都在外部」仍正常關閉
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
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

  // ── z-index：依開啟順序派發（與 Modal 家族同一堆疊體系）────────────────────
  describe('z-index stacking', () => {
    it('z 依 popups 堆疊索引派發（1100 + index），後開的浮層疊在先開的浮層之上', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(popoverEl()!.style.getPropertyValue('--popover-z-auto')).toBe('1100')

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()
      expect(isOpen()).toBe(false)

      // 底下墊一層（模擬先開啟的 Modal / Dialog），Popover 後開 → 應疊在其上
      const under = Symbol('modal')
      usePopupsManager().add(under)
      await wrapper.find('.trigger').trigger('click')
      expect(popoverEl()!.style.getPropertyValue('--popover-z-auto')).toBe('1101')
      usePopupsManager().remove(under)
    })
  })

  // ── 關閉時的焦點歸還 ─────────────────────────────────────────────────────────
  describe('focus return on close', () => {
    it('Esc 關閉且焦點仍在浮層內 → 還焦給 reference', async () => {
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)

      const inner = popoverEl()!.querySelector<HTMLElement>('.close-btn')!
      inner.focus()
      expect(document.activeElement).toBe(inner)

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await flushPromises()

      expect(isOpen()).toBe(false)
      expect(document.activeElement?.className).toContain('trigger')
    })

    it('點擊外部關閉且焦點已在外部 → 不搶焦（維持外部焦點）', async () => {
      const outside = document.createElement('input')
      document.body.appendChild(outside)
      const wrapper = track(mountPopover())
      await wrapper.find('.trigger').trigger('click')
      expect(isOpen()).toBe(true)

      outside.focus() // 模擬使用者點擊頁面上其他輸入框
      outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flushPromises()

      expect(isOpen()).toBe(false)
      expect(document.activeElement).toBe(outside)
      outside.remove()
    })
  })

  // ── touch 觸發 ───────────────────────────────────────────────────────────────
  describe('touch trigger', () => {
    it("trigger 含 ['click','touch'] 時，一次點按不因合成 click 而雙重 toggle", async () => {
      const wrapper = track(mountPopover({ trigger: ['click', 'touch'] }))
      const trigger = wrapper.find('.trigger')

      // 行動裝置一次點按的事件序：touchstart →（touchend）→ 合成 click
      await trigger.trigger('touchstart')
      await trigger.trigger('click')
      expect(isOpen()).toBe(true)
    })

    it('touch 點按之後的獨立滑鼠 click 仍可正常 toggle（抑制旗標不殘留）', async () => {
      const wrapper = track(mountPopover({ trigger: ['click', 'touch'] }))
      const trigger = wrapper.find('.trigger')

      await trigger.trigger('touchstart')
      await trigger.trigger('click') // 合成 click：被抑制
      expect(isOpen()).toBe(true)

      await trigger.trigger('click') // 之後真正的滑鼠 click
      expect(isOpen()).toBe(false)
    })

    // timer 覆蓋防護：前一次 touchstart 的 500ms timer 若未先 clear，會在到期時
    // 把「第二次點按」的抑制旗標一併清掉，讓合成 click 漏過造成雙重 toggle。
    it('連續兩次 touch 點按（間隔 <500ms）時，第二次的合成 click 仍被抑制', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = track(mountPopover({ trigger: ['click', 'touch'] }))
        const trigger = wrapper.find('.trigger')

        await trigger.trigger('touchstart') // t=0 開啟（此次沒有合成 click：滑走取消）
        expect(isOpen()).toBe(true)

        vi.advanceTimersByTime(400)
        await trigger.trigger('touchstart') // t=400 關閉
        expect(isOpen()).toBe(false)

        vi.advanceTimersByTime(150) // t=550：第一次的 timer 到期點已過
        await trigger.trigger('click') // 第二次點按的合成 click → 仍須被抑制
        expect(isOpen()).toBe(false)

        vi.advanceTimersByTime(1000) // 旗標過期後，獨立滑鼠 click 恢復正常
        await trigger.trigger('click')
        expect(isOpen()).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  // ── tooltip 的 aria-describedby 生命週期 ────────────────────────────────────
  describe('tooltip aria-describedby lifecycle', () => {
    it('關閉時不輸出 aria-describedby（避免指向不存在的 id），開啟時才指向浮層', async () => {
      const wrapper = track(mountPopover({ role: 'tooltip', trigger: 'hover' }))
      const trigger = wrapper.find('.trigger')

      expect(trigger.attributes('aria-describedby')).toBeUndefined()

      await trigger.trigger('mouseenter')
      expect(isOpen()).toBe(true)
      expect(trigger.attributes('aria-describedby')).toBe(popoverEl()!.id)
    })
  })
})

describe('BasePopover — IME 組字與 Esc', () => {
  it('組字中的 Esc（isComposing）不關閉浮層', async () => {
    const wrapper = track(mountPopover())
    await wrapper.find('.trigger').trigger('click')
    expect(isOpen()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true }))
    await flushPromises()
    expect(isOpen()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await flushPromises()
    expect(isOpen()).toBe(false)
  })
})
