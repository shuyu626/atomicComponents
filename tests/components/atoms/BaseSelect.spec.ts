import { describe, it, expect, afterEach, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { renderToString } from '@vue/server-renderer'

import BaseSelect from '~/components/atoms/BaseSelect.vue'
import type { BaseSelectOption } from '~/components/atoms/BaseSelect.vue'
import { computeComboboxAriaAttrs } from '~/components/atoms/BaseSelect.vue'
import { required } from '~/utils/validators'

// ── Helpers ──────────────────────────────────────────────────────────────────
//
// 浮層內容（.base-select__menu）由 BasePopover Teleport 到 <body>，需直接查 document。
// 控制項（reference，role="combobox"）就地渲染，可用 wrapper.find。
// happy-dom 無版面 → tabbable 視元素不可見回空陣列 → focus-trap 不啟用；
// 因此鍵盤焦點測試採「手動 focus + 同步 dispatch 方向鍵」。

const defaultOptions: BaseSelectOption<string>[] = [
  { label: '蘋果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '櫻桃', value: 'cherry' },
]

// chips 收斂測試用：需要多於 3 個選項才能驗證 +N。
const manyOptions: BaseSelectOption<string>[] = [
  { label: '蘋果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '櫻桃', value: 'cherry' },
  { label: '葡萄', value: 'grape' },
  { label: '芒果', value: 'mango' },
]

interface MountOptions {
  options?: BaseSelectOption<string>[]
  modelValue?: unknown
  multiple?: boolean
  filterable?: boolean
  chips?: boolean
  maxCollapseTags?: number
  placeholder?: string
  label?: string
  name?: string
  disabled?: boolean
  required?: boolean
  error?: boolean
  message?: string
  emptyText?: string
  clearable?: boolean
  clearLabel?: string
  removeLabel?: string | ((label: string) => string)
  rules?: unknown
  slots?: Record<string, unknown>
}

function mountSelect(options: MountOptions = {}) {
  const { slots, ...props } = options
  return mount(BaseSelect, {
    props: { options: defaultOptions, ...props } as never,
    slots: slots as never,
    attachTo: document.body,
  })
}

function controlEl(wrapper: ReturnType<typeof mountSelect>) {
  return wrapper.find('.base-select__control')
}

function menuEl(): HTMLElement | null {
  return document.body.querySelector('.base-select__menu')
}

function searchEl(): HTMLInputElement | null {
  return document.body.querySelector('.base-select__search')
}

function optionEls(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.base-select__option'))
}

/** 在 teleport 出去的搜尋框上輸入（wrapper.find 觸不到 teleport 內容）。 */
async function typeSearch(value: string) {
  const el = searchEl()
  if (!el) throw new Error('searchbox not found')
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

function isOpen(): boolean {
  return menuEl() !== null
}

function fireKeydown(el: HTMLElement, key: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

function fireClick(el: HTMLElement) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

async function open(wrapper: ReturnType<typeof mountSelect>) {
  await controlEl(wrapper).trigger('click')
  await nextTick()
}

let active: ReturnType<typeof mountSelect> | null = null

function track(wrapper: ReturnType<typeof mountSelect>) {
  active = wrapper
  return wrapper
}

afterEach(() => {
  active?.unmount()
  active = null
  document.body.querySelectorAll('.base-popover').forEach((el) => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseSelect', () => {
  // ── 渲染與開合 ────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders a role="combobox" control', () => {
      const wrapper = track(mountSelect())
      expect(controlEl(wrapper).attributes('role')).toBe('combobox')
    })

    it('shows the placeholder when there is no value', () => {
      const wrapper = track(mountSelect({ placeholder: '請選擇' }))
      expect(wrapper.find('.base-select__placeholder').text()).toBe('請選擇')
    })

    it('does not render the menu until opened, then teleports it to <body>', async () => {
      const wrapper = track(mountSelect())
      expect(isOpen()).toBe(false)
      await open(wrapper)
      expect(isOpen()).toBe(true)
      expect(menuEl()?.closest('.base-popover')).toBeTruthy()
    })

    it('renders options with role="option" and labels', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      const els = optionEls()
      expect(els).toHaveLength(3)
      expect(els.map((el) => el.getAttribute('role'))).toEqual(['option', 'option', 'option'])
      expect(els.map((el) => el.textContent?.trim())).toEqual(['蘋果', '香蕉', '櫻桃'])
    })

    it('reflects open state via aria-expanded on the control', async () => {
      const wrapper = track(mountSelect())
      expect(controlEl(wrapper).attributes('aria-expanded')).toBe('false')
      await open(wrapper)
      expect(controlEl(wrapper).attributes('aria-expanded')).toBe('true')
    })
  })

  // ── 單選 ──────────────────────────────────────────────────────────────────────
  describe('single select', () => {
    it('emits update:modelValue with the option value on click', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      fireClick(optionEls()[1])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['banana'])
    })

    it('closes the menu after selecting', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      fireClick(optionEls()[0])
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('displays the selected label', () => {
      const wrapper = track(mountSelect({ modelValue: 'cherry' }))
      expect(wrapper.find('.base-select__value').text()).toBe('櫻桃')
    })

    it('marks the selected option with aria-selected', async () => {
      const wrapper = track(mountSelect({ modelValue: 'banana' }))
      await open(wrapper)
      const els = optionEls()
      expect(els.map((el) => el.getAttribute('aria-selected'))).toEqual(['false', 'true', 'false'])
    })
  })

  // ── 多選（Array）──────────────────────────────────────────────────────────────
  describe('multiple (array)', () => {
    it('adds a value to the array and keeps the menu open', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: [] }))
      await open(wrapper)
      fireClick(optionEls()[0])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['apple']])
      expect(isOpen()).toBe(true)
    })

    it('toggles an already-selected value off', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: ['apple', 'banana'] }))
      await open(wrapper)
      fireClick(optionEls()[0])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['banana']])
    })

    it('displays selected labels joined by a comma', () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: ['apple', 'cherry'] }))
      expect(wrapper.find('.base-select__value').text()).toBe('蘋果, 櫻桃')
    })

    // 設計準則：Array model 的選中值依 options 順序排列（新增時不能直接 push）。
    it('rebuilds the array in options order when selecting out of order', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: [] }))
      await open(wrapper)
      // 先選第 3 個（cherry）
      fireClick(optionEls()[2])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['cherry']])
      // 模擬父層回寫 v-model 後，再選第 1 個（apple）→ 依 options 順序重建
      await wrapper.setProps({ modelValue: ['cherry'] })
      fireClick(optionEls()[0])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['apple', 'cherry']])
    })

    it('keeps options order when re-selecting a value after removal', async () => {
      // 已有頭尾兩項（apple、cherry），補選中間的 banana → 應插回中間而非尾端
      const wrapper = track(mountSelect({ multiple: true, modelValue: ['apple', 'cherry'] }))
      await open(wrapper)
      fireClick(optionEls()[1])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['apple', 'banana', 'cherry']])
    })

    it('keeps values missing from options at the tail in their original relative order', async () => {
      // 防禦情境：model 內有不存在於 options 的殘值 → 保留在尾端、維持原相對順序
      const wrapper = track(mountSelect({ multiple: true, modelValue: ['stale-b', 'cherry', 'stale-a'] }))
      await open(wrapper)
      fireClick(optionEls()[0])
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
        ['apple', 'cherry', 'stale-b', 'stale-a'],
      ])
    })
  })

  // ── 多選（Set）────────────────────────────────────────────────────────────────
  describe('multiple (set)', () => {
    it('keeps the container a Set when the model is a Set', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: new Set(['apple']) }))
      await open(wrapper)
      fireClick(optionEls()[1])
      await nextTick()
      const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
      expect(emitted).toBeInstanceOf(Set)
      expect([...(emitted as Set<string>)]).toEqual(['apple', 'banana'])
    })

    it('keeps Set insertion order (no options-order rebuild) when selecting out of order', async () => {
      // Set 本身無序語意 → 不做 options 順序重建，維持插入順序即可
      const wrapper = track(mountSelect({ multiple: true, modelValue: new Set(['cherry']) }))
      await open(wrapper)
      fireClick(optionEls()[0])
      await nextTick()
      const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
      expect(emitted).toBeInstanceOf(Set)
      expect([...(emitted as Set<string>)]).toEqual(['cherry', 'apple'])
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('does not open when the whole select is disabled', async () => {
      const wrapper = track(mountSelect({ disabled: true }))
      await open(wrapper)
      expect(isOpen()).toBe(false)
    })

    it('does not select a disabled option', async () => {
      const options: BaseSelectOption<string>[] = [
        { label: '可選', value: 'a' },
        { label: '停用', value: 'b', disabled: true },
      ]
      const wrapper = track(mountSelect({ options }))
      await open(wrapper)
      const [, disabled] = optionEls()
      expect(disabled.getAttribute('aria-disabled')).toBe('true')
      fireClick(disabled)
      await nextTick()
      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })
  })

  // ── filterable（搜尋欄在浮層上方、選項在下方）──────────────────────────────────
  describe('filterable', () => {
    it('does not render the searchbox in the control before opening', () => {
      const wrapper = track(mountSelect({ filterable: true }))
      expect(wrapper.find('.base-select__search').exists()).toBe(false)
    })

    it('renders the searchbox inside the panel above the options after opening', async () => {
      const wrapper = track(mountSelect({ filterable: true }))
      await open(wrapper)
      const search = searchEl()
      expect(search?.getAttribute('role')).toBe('searchbox')
      // 搜尋框與選單都在 teleport 出去的浮層內
      expect(search?.closest('.base-popover')).toBeTruthy()
      expect(menuEl()?.closest('.base-popover')).toBeTruthy()
      // 搜尋框在選單之前（上方）
      const panel = search?.closest('.base-popover') as HTMLElement
      const nodes = Array.from(panel.querySelectorAll('.base-select__search, .base-select__menu'))
      expect(nodes[0]?.classList.contains('base-select__search')).toBe(true)
    })

    it('filters options by label (case-insensitive)', async () => {
      const options: BaseSelectOption<string>[] = [
        { label: 'Apple', value: 'a' },
        { label: 'Banana', value: 'b' },
        { label: 'Apricot', value: 'c' },
      ]
      const wrapper = track(mountSelect({ options, filterable: true }))
      await open(wrapper)
      await typeSearch('ap')
      expect(optionEls().map((el) => el.textContent?.trim())).toEqual(['Apple', 'Apricot'])
    })

    it('keys options by value so filtering does not reuse nodes by position', async () => {
      const wrapper = track(mountSelect({ filterable: true }))
      await open(wrapper)
      // 標記「香蕉」（原本位於 index 1）的 DOM 節點
      const banana = optionEls()[1]
      expect(banana.textContent?.trim()).toBe('香蕉')
      banana.dataset.marker = 'kept'
      // 過濾掉「蘋果」「櫻桃」，只剩「香蕉」（位置由 index 1 → 0）
      await typeSearch('香')
      const remaining = optionEls()
      expect(remaining).toHaveLength(1)
      expect(remaining[0].textContent?.trim()).toBe('香蕉')
      // 以 value 當 key → 香蕉的節點被保留（沿用同一 DOM）；若用 index 當 key 會錯位重用蘋果節點
      expect(remaining[0].dataset.marker).toBe('kept')
    })

    it('shows the empty text when nothing matches', async () => {
      const wrapper = track(mountSelect({ filterable: true, emptyText: '沒有結果' }))
      await open(wrapper)
      await typeSearch('zzz')
      expect(optionEls()).toHaveLength(0)
      expect(menuEl()?.querySelector('.base-select__empty')?.textContent?.trim()).toBe('沒有結果')
    })

    it('does not pre-highlight any option on open (no active descendant until navigation)', async () => {
      const wrapper = track(mountSelect({ filterable: true, modelValue: 'banana' }))
      await open(wrapper)
      expect(searchEl()!.getAttribute('aria-activedescendant')).toBeNull()
    })

    it('sets aria-activedescendant and selects the active option on Enter', async () => {
      const wrapper = track(mountSelect({ filterable: true }))
      await open(wrapper)
      const search = searchEl()!
      // 開啟時沒有作用中項，方向鍵後才出現
      expect(search.getAttribute('aria-activedescendant')).toBeNull()
      fireKeydown(search, 'ArrowDown')
      await nextTick()
      const activeId = search.getAttribute('aria-activedescendant')
      expect(activeId).toBeTruthy()
      expect(document.getElementById(activeId as string)).toBeTruthy()
      fireKeydown(search, 'Enter')
      await nextTick()
      expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    })
  })

  // ── clearable（叉叉清除）──────────────────────────────────────────────────────
  describe('clearable', () => {
    it('renders a clear button when there is a value', () => {
      const wrapper = track(mountSelect({ modelValue: 'apple' }))
      expect(wrapper.find('.base-select__clear').exists()).toBe(true)
    })

    it('does not render the clear button when empty', () => {
      const wrapper = track(mountSelect())
      expect(wrapper.find('.base-select__clear').exists()).toBe(false)
    })

    it('clears a single value to undefined', async () => {
      const wrapper = track(mountSelect({ modelValue: 'apple' }))
      await wrapper.find('.base-select__clear').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([undefined])
    })

    it('clears a multiple array to an empty array', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: ['apple', 'banana'] }))
      await wrapper.find('.base-select__clear').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[]])
    })

    it('clears a multiple set to an empty Set', async () => {
      const wrapper = track(mountSelect({ multiple: true, modelValue: new Set(['apple']) }))
      await wrapper.find('.base-select__clear').trigger('click')
      const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
      expect(value).toBeInstanceOf(Set)
      expect((value as Set<string>).size).toBe(0)
    })

    it('does not open the popover when clicking clear', async () => {
      const wrapper = track(mountSelect({ modelValue: 'apple' }))
      await wrapper.find('.base-select__clear').trigger('click')
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('hides the clear button when disabled', () => {
      const wrapper = track(mountSelect({ modelValue: 'apple', disabled: true }))
      expect(wrapper.find('.base-select__clear').exists()).toBe(false)
    })

    it('can be turned off via clearable=false', () => {
      const wrapper = track(mountSelect({ modelValue: 'apple', clearable: false }))
      expect(wrapper.find('.base-select__clear').exists()).toBe(false)
    })

    it('uses the default Chinese clear aria-label, overridable for i18n', () => {
      const def = track(mountSelect({ modelValue: 'apple' }))
      expect(def.find('.base-select__clear').attributes('aria-label')).toBe('清除')
      const en = track(mountSelect({ modelValue: 'apple', clearLabel: 'Clear' }))
      expect(en.find('.base-select__clear').attributes('aria-label')).toBe('Clear')
    })

    it('keeps the clear button keyboard-focusable (not tabindex -1)', () => {
      const wrapper = track(mountSelect({ modelValue: 'apple' }))
      expect(wrapper.find('.base-select__clear').attributes('tabindex')).not.toBe('-1')
    })
  })

  // ── a11y / 表單 ───────────────────────────────────────────────────────────────
  describe('a11y & form', () => {
    it('names the focusable combobox via aria-labelledby pointing at the field label', () => {
      const wrapper = track(mountSelect({ label: '水果', required: true }))
      const control = controlEl(wrapper)
      const labelledby = control.attributes('aria-labelledby')
      expect(labelledby).toBeTruthy()
      // aria-labelledby 指向實際 label 元素，文字為「水果」（單一名稱來源，無重複代理）
      expect(wrapper.find(`#${labelledby}`).text()).toBe('水果')
      expect(control.attributes('aria-required')).toBe('true')
      // 不再用 aria-label（名稱改由 labelledby 提供）
      expect(control.attributes('aria-label')).toBeUndefined()
    })

    it('marks the combobox aria-invalid on error', () => {
      const wrapper = track(mountSelect({ label: '水果', error: true }))
      expect(controlEl(wrapper).attributes('aria-invalid')).toBe('true')
    })

    it('keeps aria-describedby pointing at the message despite BasePopover fallthrough', () => {
      // BasePopover 的 fallthrough 會把 reference 上的 aria-describedby 覆蓋成 undefined，
      // 故 describedby 改由 v-combobox-aria 指令於 patch 後寫入；此測試鎖住該行為避免回歸。
      const wrapper = track(mountSelect({ label: '水果', error: true, message: '必填' }))
      const control = controlEl(wrapper)
      const describedby = control.attributes('aria-describedby')
      expect(describedby).toBeTruthy()
      // 指向實際存在的訊息節點，且內容為錯誤訊息
      expect(wrapper.find(`#${describedby}`).text()).toContain('必填')
    })

    it('associates the combobox with the listbox via aria-haspopup and aria-controls', async () => {
      const wrapper = track(mountSelect())
      const control = controlEl(wrapper)
      // 控制項自身明確設定 aria-haspopup="listbox"（覆蓋 BasePopover fallthrough 帶下的泛用 true）
      expect(control.attributes('aria-haspopup')).toBe('listbox')
      // 收合時 listbox <ul> 尚未渲染，不輸出 aria-controls（避免指向不存在的元素）
      expect(control.attributes('aria-controls')).toBeUndefined()
      await open(wrapper)
      const listbox = menuEl()!
      expect(listbox.getAttribute('role')).toBe('listbox')
      // 展開時 aria-controls 指向實際的 listbox <ul> id（非 BasePopover 浮層容器）
      expect(control.attributes('aria-controls')).toBe(listbox.id)
      expect(control.attributes('aria-haspopup')).toBe('listbox')
    })

    it('does not render a focusable proxy input in the a11y tree', () => {
      const wrapper = track(mountSelect({ name: 'fruit', modelValue: 'apple' }))
      expect(wrapper.find('.base-select__proxy').exists()).toBe(false)
    })

    it('submits the serialized value via a hidden input (single)', () => {
      const wrapper = track(mountSelect({ name: 'fruit', modelValue: 'apple' }))
      const hidden = wrapper.find('input[type="hidden"]')
      expect(hidden.attributes('name')).toBe('fruit')
      expect((hidden.element as HTMLInputElement).value).toBe('apple')
    })

    it('serializes multiple values comma-joined', () => {
      const wrapper = track(mountSelect({ name: 'fruit', multiple: true, modelValue: ['apple', 'banana'] }))
      expect((wrapper.find('input[type="hidden"]').element as HTMLInputElement).value).toBe('apple,banana')
    })
  })

  // ── chips（多選 chip 顯示）────────────────────────────────────────────────────
  describe('chips (multiple display)', () => {
    it('renders selected options as deletable chips in the control', () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: ['apple', 'banana'] }))
      const chips = wrapper.findAll('.base-select__control .base-chip')
      expect(chips).toHaveLength(2)
      expect(chips.map((c) => c.text())).toEqual(['蘋果', '香蕉'])
      expect(wrapper.find('.base-select__control .base-chip__delete').exists()).toBe(true)
    })

    it('renders chips at BaseChip size "sm"', () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: ['apple'] }))
      const chip = wrapper.find('.base-select__control .base-chip')
      expect(chip.classes()).toContain('base-chip--sm')
      expect(chip.classes()).not.toContain('base-chip--small')
    })

    it('removes a single value when its chip delete is clicked', async () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: ['apple', 'banana'] }))
      await wrapper.findAll('.base-select__control .base-chip__delete')[0].trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['banana']])
    })

    it('labels the chip delete with the default Chinese, overridable for i18n', () => {
      // 預設：函式插入該項 label
      const def = track(mountSelect({ multiple: true, chips: true, modelValue: ['apple'] }))
      expect(def.find('.base-select__control .base-chip__delete').attributes('aria-label'))
        .toBe('移除 蘋果')
      // 覆寫：函式
      const fn = track(mountSelect({
        multiple: true,
        chips: true,
        modelValue: ['apple'],
        removeLabel: (label: string) => `Remove ${label}`,
      }))
      expect(fn.find('.base-select__control .base-chip__delete').attributes('aria-label'))
        .toBe('Remove 蘋果')
      // 覆寫：字串（原樣使用）
      const str = track(mountSelect({
        multiple: true,
        chips: true,
        modelValue: ['apple'],
        removeLabel: 'Remove item',
      }))
      expect(str.find('.base-select__control .base-chip__delete').attributes('aria-label'))
        .toBe('Remove item')
    })

    it('keeps the Set container when removing a chip', async () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: new Set(['apple', 'banana']) }))
      await wrapper.findAll('.base-select__control .base-chip__delete')[0].trigger('click')
      const value = wrapper.emitted('update:modelValue')?.at(-1)?.[0]
      expect(value).toBeInstanceOf(Set)
      expect([...(value as Set<string>)]).toEqual(['banana'])
    })

    it('does not open the popover when deleting a chip', async () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: ['apple'] }))
      await wrapper.find('.base-select__control .base-chip__delete').trigger('click')
      await nextTick()
      expect(isOpen()).toBe(false)
    })

    it('shows the placeholder (no chips) when empty', () => {
      const wrapper = track(mountSelect({ multiple: true, chips: true, modelValue: [], placeholder: '請選擇' }))
      expect(wrapper.find('.base-select__placeholder').text()).toBe('請選擇')
      expect(wrapper.find('.base-chip').exists()).toBe(false)
    })

    it('ignores chips for single select (falls back to text)', () => {
      const wrapper = track(mountSelect({ chips: true, modelValue: 'apple' }))
      expect(wrapper.find('.base-chip').exists()).toBe(false)
      expect(wrapper.find('.base-select__value').text()).toBe('蘋果')
    })
  })

  // ── maxCollapseTags（chips 收斂成 +N，避免多選破版）────────────────────────────
  describe('chips collapse (maxCollapseTags)', () => {
    it('collapses selected chips beyond the limit into a single +N chip', () => {
      const wrapper = track(mountSelect({
        options: manyOptions,
        multiple: true,
        chips: true,
        maxCollapseTags: 2,
        modelValue: ['apple', 'banana', 'cherry', 'grape'],
      }))
      // 前 2 顆一般 chip + 1 顆收斂 chip = 3 顆
      const chips = wrapper.findAll('.base-select__control .base-chip')
      expect(chips).toHaveLength(3)
      // 前 2 顆為前兩個已選（options 順序）
      const visible = wrapper.findAll('.base-select__control .base-chip:not(.base-select__collapse)')
      expect(visible.map((c) => c.text())).toEqual(['蘋果', '香蕉'])
      // 收斂 chip 顯示剩餘數量 +2
      const collapse = wrapper.find('.base-select__collapse')
      expect(collapse.exists()).toBe(true)
      expect(collapse.text()).toBe('+2')
    })

    it('does not collapse when the selection count is within the limit', () => {
      const wrapper = track(mountSelect({
        options: manyOptions,
        multiple: true,
        chips: true,
        maxCollapseTags: 3,
        modelValue: ['apple', 'banana'],
      }))
      expect(wrapper.find('.base-select__collapse').exists()).toBe(false)
      expect(wrapper.findAll('.base-select__control .base-chip')).toHaveLength(2)
    })

    it('defaults to no collapse (renders every chip) when maxCollapseTags is 0', () => {
      const wrapper = track(mountSelect({
        options: manyOptions,
        multiple: true,
        chips: true,
        modelValue: ['apple', 'banana', 'cherry', 'grape'],
      }))
      expect(wrapper.find('.base-select__collapse').exists()).toBe(false)
      expect(wrapper.findAll('.base-select__control .base-chip')).toHaveLength(4)
    })

    it('makes the +N chip non-deletable and lists the hidden labels in its title', () => {
      const wrapper = track(mountSelect({
        options: manyOptions,
        multiple: true,
        chips: true,
        maxCollapseTags: 1,
        modelValue: ['apple', 'banana', 'cherry'],
      }))
      const collapse = wrapper.find('.base-select__collapse')
      expect(collapse.text()).toBe('+2')
      expect(collapse.attributes('title')).toBe('香蕉, 櫻桃')
      expect(collapse.find('.base-chip__delete').exists()).toBe(false)
    })

    it('ignores maxCollapseTags without chips (comma text stays intact)', () => {
      const wrapper = track(mountSelect({
        options: manyOptions,
        multiple: true,
        maxCollapseTags: 1,
        modelValue: ['apple', 'banana', 'cherry'],
      }))
      expect(wrapper.find('.base-chip').exists()).toBe(false)
      expect(wrapper.find('.base-select__value').text()).toBe('蘋果, 香蕉, 櫻桃')
    })
  })

  // ── 選中打勾 ──────────────────────────────────────────────────────────────────
  describe('selected check mark', () => {
    it('renders a check icon on the selected option only', async () => {
      const wrapper = track(mountSelect({ modelValue: 'banana' }))
      await open(wrapper)
      const els = optionEls()
      expect(els[0].querySelector('.base-select__check')).toBeNull()
      expect(els[1].querySelector('.base-select__check')).toBeTruthy()
      expect(els[2].querySelector('.base-select__check')).toBeNull()
    })
  })

  // ── 鍵盤導覽（非 filterable）───────────────────────────────────────────────────
  describe('keyboard navigation', () => {
    it('gives each option tabindex=0', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      expect(optionEls().map((el) => el.getAttribute('tabindex'))).toEqual(['0', '0', '0'])
    })

    it('ArrowDown / ArrowUp move focus between options', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      const els = optionEls()
      els[0].focus()
      fireKeydown(menuEl()!, 'ArrowDown')
      expect(document.activeElement).toBe(els[1])
      fireKeydown(menuEl()!, 'ArrowUp')
      expect(document.activeElement).toBe(els[0])
    })

    it('selects the focused option on Enter', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      const els = optionEls()
      els[2].focus()
      fireKeydown(els[2], 'Enter')
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['cherry'])
    })

    it('closes on Escape and Tab', async () => {
      const wrapper = track(mountSelect())
      await open(wrapper)
      fireKeydown(menuEl()!, 'Escape')
      await nextTick()
      expect(isOpen()).toBe(false)

      await open(wrapper)
      fireKeydown(menuEl()!, 'Tab')
      await nextTick()
      expect(isOpen()).toBe(false)
    })
  })

  // ── scrollIntoView rAF 清理 ───────────────────────────────────────────────────
  describe('scroll rAF cleanup', () => {
    it('cancels the pending scrollIntoView rAF on unmount', async () => {
      // happy-dom 的元素沒有 scrollIntoView，補 stub 讓 rAF 排程路徑生效
      const originalScroll = HTMLElement.prototype.scrollIntoView
      HTMLElement.prototype.scrollIntoView = vi.fn()
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42)
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame')
      try {
        const wrapper = mountSelect({ filterable: true })
        await open(wrapper)
        // 方向鍵改變 activeIndex → watch 於 nextTick 後排程 scrollIntoView rAF
        fireKeydown(searchEl()!, 'ArrowDown')
        await nextTick()
        await nextTick()
        expect(rafSpy).toHaveBeenCalled()
        wrapper.unmount()
        // rAF 尚未 fire（mock 不執行 callback）→ 卸載時應取消，避免對已卸載節點操作
        expect(cancelSpy).toHaveBeenCalledWith(42)
      } finally {
        HTMLElement.prototype.scrollIntoView = originalScroll
        rafSpy.mockRestore()
        cancelSpy.mockRestore()
      }
    })
  })

  // ── 驗證 ──────────────────────────────────────────────────────────────────────
  describe('validation', () => {
    it('does not show an error before being touched', () => {
      const wrapper = track(mountSelect({ rules: [required('必選')] }))
      expect(wrapper.find('.base-form-field--error').exists()).toBe(false)
    })

    it('shows the error after the menu closes (touch)', async () => {
      const wrapper = track(mountSelect({ rules: [required('必選')] }))
      await open(wrapper)
      // 關閉但未選任何值 → touch 後顯示錯誤
      fireKeydown(menuEl()!, 'Escape')
      await nextTick()
      await nextTick()
      expect(wrapper.text()).toContain('必選')
    })

    it('exposes validate() and reset()', async () => {
      const wrapper = track(mountSelect({ rules: [required('必選')] }))
      const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
      expect(vm.validate()).toBe(false)
      await nextTick()
      expect(wrapper.text()).toContain('必選')
      vm.reset()
      await nextTick()
      expect(wrapper.find('.base-form-field--error').exists()).toBe(false)
    })
  })

  // ── slots ─────────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders a custom option slot', async () => {
      const wrapper = track(
        mountSelect({
          slots: {
            option: (props: { label: string; selected: boolean }) =>
              h('span', { class: 'custom-option' }, `${props.label}${props.selected ? '*' : ''}`),
          },
        }),
      )
      await open(wrapper)
      expect(menuEl()?.querySelector('.custom-option')?.textContent).toBe('蘋果')
    })

    it('renders a custom display slot', () => {
      const wrapper = track(
        mountSelect({
          modelValue: 'apple',
          slots: {
            display: (props: { selected: BaseSelectOption<string> }) =>
              h('span', { class: 'custom-display' }, `已選：${props.selected.label}`),
          },
        }),
      )
      expect(wrapper.find('.custom-display').text()).toBe('已選：蘋果')
    })

    it('renders a custom empty slot', async () => {
      const wrapper = track(
        mountSelect({
          options: [],
          slots: { empty: () => h('span', { class: 'custom-empty' }, '空空如也') },
        }),
      )
      await open(wrapper)
      expect(menuEl()?.querySelector('.custom-empty')?.textContent).toBe('空空如也')
    })
  })

  // ── v-for key 穩定性 ──────────────────────────────────────────────────────────
  // `String(option.value)` 不可作 key：`1` 與 `'1'` 撞 key、物件 value 全數收斂成
  // "[object Object]"。key 改用選項在 options 陣列中的原始索引。
  describe('option keys', () => {
    it('value 1 與 "1" 並存時，選取更新不產生 duplicate key 警告', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const wrapper = track(mountSelect({
        multiple: true,
        chips: true,
        modelValue: [],
        options: [
          { label: 'num', value: 1 },
          { label: 'str', value: '1' },
        ],
      }))

      await open(wrapper)
      expect(optionEls()).toHaveLength(2)

      // 依序選取兩個選項：chips 與 option 兩條 v-for 都走 keyed patch 更新路徑
      fireClick(optionEls()[0]!)
      await nextTick()
      fireClick(optionEls()[1]!)
      await nextTick()

      expect(wrapper.findAll('.base-chip')).toHaveLength(2)
      const dupWarned = warn.mock.calls.some((args) => String(args[0]).includes('Duplicate keys'))
      expect(dupWarned).toBe(false)
      warn.mockRestore()
    })
  })
})

// ── combobox aria 自訂指令 SSR (v-combobox-aria) ──────────────────────────────
//
// applyComboboxAria 原本只掛 mounted/updated，SSR 首渲 HTML 水合前缺
// aria-haspopup / aria-controls / aria-describedby，改用 getSSRProps 補上。
// aria-haspopup 不受 expanded 狀態影響，可用 renderToString 直接驗證真實輸出。
// aria-controls / aria-describedby 綁在 BaseSelect 內部的 `active` ref（預設
// false，元件未提供可在掛載前強制展開的 prop），renderToString 對整個元件
// 無法把它推進「展開」狀態，因此改為直接呼叫 getSSRProps 依賴的共用純函式
// computeComboboxAriaAttrs 驗證該分支，兩者呼叫的是同一份計算，等同覆蓋。
describe('combobox aria 自訂指令 SSR', () => {
  it('SSR 首渲即輸出 aria-haspopup="listbox"（水合前既有語意）', async () => {
    const html = await renderToString(createSSRApp(BaseSelect, { options: defaultOptions }))
    expect(html).toContain('aria-haspopup="listbox"')
  })

  it('computeComboboxAriaAttrs：collapsed 且無 describedby 時只有 aria-haspopup', () => {
    expect(computeComboboxAriaAttrs({ listboxId: 'x-listbox', expanded: false })).toEqual({
      'aria-haspopup': 'listbox',
    })
  })

  it('computeComboboxAriaAttrs：expanded 時帶 aria-controls 指向 listboxId', () => {
    expect(computeComboboxAriaAttrs({ listboxId: 'x-listbox', expanded: true })).toEqual({
      'aria-haspopup': 'listbox',
      'aria-controls': 'x-listbox',
    })
  })

  it('computeComboboxAriaAttrs：有 describedby 時一併帶出 aria-describedby', () => {
    expect(
      computeComboboxAriaAttrs({ listboxId: 'x-listbox', expanded: true, describedby: 'x-desc' }),
    ).toEqual({
      'aria-haspopup': 'listbox',
      'aria-controls': 'x-listbox',
      'aria-describedby': 'x-desc',
    })
  })
})
