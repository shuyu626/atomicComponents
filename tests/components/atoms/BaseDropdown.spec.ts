import { describe, it, expect, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BaseDropdown from '~/components/atoms/BaseDropdown.vue'
import type { BaseDropdownItem } from '~/components/atoms/BaseDropdown.vue'

// ── Helpers ──────────────────────────────────────────────────────────────────
//
// 選單本體（.base-dropdown）由 BasePopover Teleport 到 <body>，不在 wrapper 內，
// 需直接查 document。觸發鈕（reference）則就地渲染，可用 wrapper.find。
//
// 注意：jsdom 無版面，`tabbable` 視所有元素不可見而回空陣列 → BasePopover 的
// focus-trap 不會啟用。因此「開啟時自動聚焦第一項」在此環境不成立，焦點測試一律
// 採「手動 focus + 同步 dispatch 方向鍵」驗證 roving 導覽本身。

type DropdownTrigger = 'click' | 'hover' | 'focus' | 'touch'

interface MountOptions {
  items?: BaseDropdownItem<string>[]
  trigger?: DropdownTrigger | DropdownTrigger[]
  disabled?: boolean
  autoFit?: boolean
  modelValue?: boolean
  reference?: () => unknown
  menuitem?: (props: {
    label: string
    value: string
    context?: unknown
    disabled: boolean
  }) => unknown
}

const defaultItems: BaseDropdownItem<string>[] = [
  { label: '編輯', value: 'edit' },
  { label: '複製', value: 'copy' },
  { label: '刪除', value: 'delete' },
]

function mountDropdown(options: MountOptions = {}) {
  const {
    reference = () => h('button', { class: 'trigger', type: 'button' }, 'open'),
    menuitem,
    items = defaultItems,
    ...props
  } = options

  const slots: Record<string, unknown> = { reference }
  if (menuitem) slots.menuitem = menuitem

  return mount(BaseDropdown, {
    props: { items, ...props },
    slots: slots as never,
    attachTo: document.body,
  })
}

function menuEl(): HTMLElement | null {
  return document.body.querySelector('.base-dropdown')
}

function itemEls(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.base-dropdown__item'))
}

function isOpen(): boolean {
  return menuEl() !== null
}

/** 在 teleport 出去的元素上派發原生事件（wrapper.find 觸不到 teleport 內容）。 */
function fireKeydown(el: HTMLElement, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function fireClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

let active: ReturnType<typeof mountDropdown> | null = null

function track(wrapper: ReturnType<typeof mountDropdown>) {
  active = wrapper
  return wrapper
}

async function open(wrapper: ReturnType<typeof mountDropdown>) {
  await wrapper.find('.trigger').trigger('click')
}

afterEach(() => {
  active?.unmount()
  active = null
  document.body.querySelectorAll('.base-popover').forEach((el) => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseDropdown', () => {
  // ── 渲染與 a11y ──────────────────────────────────────────────────────────────
  describe('rendering & a11y', () => {
    // 刻意不傳 role 給 BasePopover（避免容器 div 與內層 ul 巢狀 menu）。
    // 因此 aria-haspopup 為 "true"（ARIA 規範中 true ≡ menu，語意相同）。
    it('sets aria-haspopup="true" on the reference (true ≡ menu)', () => {
      const wrapper = track(mountDropdown())
      expect(wrapper.find('.trigger').attributes('aria-haspopup')).toBe('true')
    })

    // 唯一的 role="menu" 應在 <ul>，容器 div 不應重複掛 menu 角色。
    it('does not duplicate role="menu" on the popover container', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      expect(menuEl()?.closest('.base-popover')?.getAttribute('role')).toBeNull()
    })

    it('renders a role="menu" container with role="menuitem" entries on open', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)

      expect(menuEl()?.getAttribute('role')).toBe('menu')
      const items = itemEls()
      expect(items).toHaveLength(3)
      expect(items.map((el) => el.getAttribute('role'))).toEqual(['menuitem', 'menuitem', 'menuitem'])
      expect(items.map((el) => el.textContent?.trim())).toEqual(['編輯', '複製', '刪除'])
    })

    it('teleports the menu out to <body>', async () => {
      const wrapper = track(mountDropdown())
      expect(isOpen()).toBe(false)
      await open(wrapper)
      expect(isOpen()).toBe(true)
      expect(menuEl()?.closest('.base-popover')).toBeTruthy()
    })
  })

  // ── roving tabindex ──────────────────────────────────────────────────────────
  describe('roving tabindex', () => {
    it('gives the first item tabindex=0 and the rest -1', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      expect(itemEls().map((el) => el.getAttribute('tabindex'))).toEqual(['0', '-1', '-1'])
    })

    it('moves the tabindex=0 entry to the first non-disabled item', async () => {
      const items: BaseDropdownItem<string>[] = [
        { label: '禁用', value: 'a', disabled: true },
        { label: '可用', value: 'b' },
        { label: '可用2', value: 'c' },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)
      // 首項 disabled → tabindex 0 落到第二項，避免 Tab 卡在禁用項
      expect(itemEls().map((el) => el.getAttribute('tabindex'))).toEqual(['-1', '0', '-1'])
    })

    it('marks disabled items with aria-disabled', async () => {
      const items: BaseDropdownItem<string>[] = [
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)
      const [a, b] = itemEls()
      expect(a.getAttribute('aria-disabled')).toBeNull()
      expect(b.getAttribute('aria-disabled')).toBe('true')
    })
  })

  // ── 點擊行為（onClick 參數契約）───────────────────────────────────────────────
  describe('item click behaviour', () => {
    it('calls onClick with the value and auto-closes for a 0–1 arg handler', async () => {
      let received: string | undefined
      const items: BaseDropdownItem<string>[] = [
        { label: '存檔', value: 'save', onClick: (value) => { received = value } },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)

      fireClick(itemEls()[0])
      await nextTick()

      expect(received).toBe('save')
      expect(isOpen()).toBe(false)
    })

    it('hands close() to a 2-arg handler and does NOT auto-close', async () => {
      let close: (() => void) | undefined
      const items: BaseDropdownItem<string>[] = [
        { label: '非同步', value: 'async', onClick: (_value, c) => { close = c } },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)

      fireClick(itemEls()[0])
      await nextTick()
      // 兩參數 handler → 元件不自動關閉，等使用者呼叫 close
      expect(isOpen()).toBe(true)
      expect(typeof close).toBe('function')

      close?.()
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('just closes when an item has no onClick', async () => {
      const items: BaseDropdownItem<string>[] = [{ label: '純關閉', value: 'x' }]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)
      fireClick(itemEls()[0])
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('ignores clicks on a disabled item (no onClick, stays open)', async () => {
      let called = false
      const items: BaseDropdownItem<string>[] = [
        { label: '禁用', value: 'd', disabled: true, onClick: () => { called = true } },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)
      fireClick(itemEls()[0])
      await nextTick()
      expect(called).toBe(false)
      expect(isOpen()).toBe(true)
    })

    it('triggers onClick via Enter / Space on the item', async () => {
      const seen: string[] = []
      const items: BaseDropdownItem<string>[] = [
        { label: 'a', value: 'a', onClick: (v) => seen.push(v) },
      ]
      const wrapper = track(mountDropdown({ items }))

      await open(wrapper)
      fireKeydown(itemEls()[0], 'Enter')
      await nextTick()
      expect(seen).toEqual(['a'])

      await open(wrapper)
      fireKeydown(itemEls()[0], ' ')
      await nextTick()
      expect(seen).toEqual(['a', 'a'])
    })
  })

  // ── 鍵盤導覽（roving）─────────────────────────────────────────────────────────
  describe('keyboard navigation', () => {
    it('ArrowDown / ArrowUp move focus to the next / previous item', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      const items = itemEls()

      items[0].focus()
      fireKeydown(menuEl()!, 'ArrowDown')
      expect(document.activeElement).toBe(items[1])

      fireKeydown(menuEl()!, 'ArrowUp')
      expect(document.activeElement).toBe(items[0])
    })

    it('wraps around at the edges', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      const items = itemEls()

      items[0].focus()
      fireKeydown(menuEl()!, 'ArrowUp') // 從第一項往上 → 繞回最後一項
      expect(document.activeElement).toBe(items[2])

      fireKeydown(menuEl()!, 'ArrowDown') // 從最後一項往下 → 繞回第一項
      expect(document.activeElement).toBe(items[0])
    })

    it('Home / End jump to the first / last item', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      const items = itemEls()

      items[1].focus()
      fireKeydown(menuEl()!, 'End')
      expect(document.activeElement).toBe(items[2])

      fireKeydown(menuEl()!, 'Home')
      expect(document.activeElement).toBe(items[0])
    })

    it('skips disabled items while navigating', async () => {
      const items: BaseDropdownItem<string>[] = [
        { label: 'a', value: 'a' },
        { label: 'b', value: 'b', disabled: true },
        { label: 'c', value: 'c' },
      ]
      const wrapper = track(mountDropdown({ items }))
      await open(wrapper)
      const els = itemEls()

      els[0].focus()
      fireKeydown(menuEl()!, 'ArrowDown') // 跳過禁用的 b → 落到 c
      expect(document.activeElement).toBe(els[2])
    })

    it('closes the menu on Tab', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      expect(isOpen()).toBe(true)
      fireKeydown(menuEl()!, 'Tab')
      await nextTick()
      expect(isOpen()).toBe(false)
    })
  })

  // ── #menuitem slot ────────────────────────────────────────────────────────────
  describe('menuitem slot', () => {
    it('renders custom item content and exposes slot props', async () => {
      const items: BaseDropdownItem<string, { badge: string }>[] = [
        { label: '編輯', value: 'edit', context: { badge: 'NEW' } },
      ]
      const wrapper = track(
        mountDropdown({
          items: items as BaseDropdownItem<string>[],
          menuitem: ({ label, context }) =>
            h('span', { class: 'custom' }, `${label}:${(context as { badge: string }).badge}`),
        }),
      )
      await open(wrapper)
      const custom = menuEl()!.querySelector('.custom')
      expect(custom?.textContent).toBe('編輯:NEW')
    })
  })

  // ── v-model ─────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('emits update:modelValue when opened', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    })

    it('reflects an externally controlled open state', async () => {
      const wrapper = track(mountDropdown({ modelValue: false }))
      expect(isOpen()).toBe(false)
      await wrapper.setProps({ modelValue: true })
      await nextTick()
      expect(isOpen()).toBe(true)
    })

    it('works uncontrolled (no v-model bound)', async () => {
      const wrapper = track(mountDropdown())
      await open(wrapper)
      expect(isOpen()).toBe(true)
    })
  })

  // ── disabled ────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('does not open when the whole dropdown is disabled', async () => {
      const wrapper = track(mountDropdown({ disabled: true }))
      await open(wrapper)
      expect(isOpen()).toBe(false)
      expect(wrapper.find('.trigger').attributes('aria-disabled')).toBe('true')
    })
  })
})
