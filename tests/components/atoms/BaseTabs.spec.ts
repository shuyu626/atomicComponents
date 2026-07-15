import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import BaseTabs from '~/components/atoms/BaseTabs.vue'
import BaseTabPanel from '~/components/atoms/BaseTabPanel.vue'
import type { BaseTabsItem } from '~/components/atoms/BaseTabs.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const Items: BaseTabsItem<string>[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

// 組合 BaseTabs + BaseTabPanel 的 host，模擬真實使用情境並驗證 inject。
function mountTabs(
  options: {
    modelValue?: string
    items?: BaseTabsItem<string>[]
    disabled?: boolean
    orientation?: 'horizontal' | 'vertical'
    activation?: 'manual' | 'automatic'
    color?: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral'
    ariaLabel?: string
    onBeforeChange?: (value: string) => boolean | void | Promise<boolean | void>
    lazy?: boolean
  } = {},
) {
  const { items = Items, ...rest } = options
  const Host = defineComponent({
    components: { BaseTabs, BaseTabPanel },
    data() {
      return { current: options.modelValue ?? 'a' }
    },
    render() {
      return h(
        BaseTabs,
        {
          'items': items,
          'modelValue': this.current,
          'onUpdate:modelValue': (value: string) => (this.current = value),
          'disabled': rest.disabled,
          'orientation': rest.orientation,
          'activation': rest.activation,
          'color': rest.color,
          'ariaLabel': rest.ariaLabel,
          'onBeforeChange': rest.onBeforeChange,
        },
        () =>
          items.map((item) =>
            h(BaseTabPanel, { value: item.value, lazy: rest.lazy }, () => `panel-${item.value}`),
          ),
      )
    },
  })
  // attachTo document.body：鍵盤導覽測試需要元素連上 document，focus() 才會更新 activeElement
  return mount(Host, { attachTo: document.body })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BaseTabs', () => {
  // ── Structure & a11y roles ───────────────────────────────────────────────
  describe('structure & a11y', () => {
    it('renders a tablist with one tab button per item', () => {
      const wrapper = mountTabs()
      expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs).toHaveLength(3)
      expect(tabs.map((t) => t.text())).toEqual(['Alpha', 'Beta', 'Gamma'])
    })

    it('renders tabs as native <button type="button">', () => {
      const wrapper = mountTabs()
      const tab = wrapper.find('[role="tab"]')
      expect(tab.element.tagName).toBe('BUTTON')
      expect(tab.attributes('type')).toBe('button')
    })

    it('applies aria-label to the tablist when provided', () => {
      const wrapper = mountTabs({ ariaLabel: 'Account sections' })
      expect(wrapper.find('[role="tablist"]').attributes('aria-label')).toBe('Account sections')
    })

    it('wires aria-controls (tab) to aria-labelledby (panel) and shares ids', () => {
      const wrapper = mountTabs()
      const firstTab = wrapper.findAll('[role="tab"]')[0]
      const firstPanel = wrapper.findAll('[role="tabpanel"]')[0]
      expect(firstTab.attributes('aria-controls')).toBe(firstPanel.attributes('id'))
      expect(firstPanel.attributes('aria-labelledby')).toBe(firstTab.attributes('id'))
    })
  })

  // ── Selection state ──────────────────────────────────────────────────────
  describe('selection', () => {
    it('marks the selected tab with aria-selected="true" and the rest false', () => {
      const wrapper = mountTabs({ modelValue: 'b' })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.map((t) => t.attributes('aria-selected'))).toEqual(['false', 'true', 'false'])
    })

    it('uses roving tabindex: selected tab is 0, the rest -1', () => {
      const wrapper = mountTabs({ modelValue: 'b' })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.map((t) => t.attributes('tabindex'))).toEqual(['-1', '0', '-1'])
    })

    it('falls back tabindex=0 to the first enabled tab when nothing is selected', () => {
      const wrapper = mountTabs({ modelValue: 'none-matches' })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.map((t) => t.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    })

    it('keeps the tablist keyboard-reachable when the selected tab is disabled', () => {
      // 選中項被 disabled → 不能拿 tabindex=0（聚焦不到），須 fallback 給第一個啟用 tab
      const items: BaseTabsItem<string>[] = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta', disabled: true },
        { value: 'c', label: 'Gamma' },
      ]
      const wrapper = mountTabs({ items, modelValue: 'b' })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.map((t) => t.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    })

    it('shows only the selected panel and hides the others', () => {
      const wrapper = mountTabs({ modelValue: 'b' })
      const panels = wrapper.findAll('.base-tab-panel')
      expect(panels.map((p) => p.attributes('hidden') !== undefined)).toEqual([true, false, true])
    })
  })

  // ── Switching (v-model) ──────────────────────────────────────────────────
  describe('switching', () => {
    it('emits update:modelValue when clicking another tab', async () => {
      const wrapper = mountTabs({ modelValue: 'a' })
      await wrapper.findAll('[role="tab"]')[2].trigger('click')
      expect(wrapper.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')
      expect(wrapper.findAll('.base-tab-panel')[2].attributes('hidden')).toBeUndefined()
    })

    it('does not switch when clicking the already-selected tab', async () => {
      const onBeforeChange = vi.fn()
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[0].trigger('click')
      expect(onBeforeChange).not.toHaveBeenCalled()
    })
  })

  // ── Disabled ─────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('disables an individual tab via item.disabled', () => {
      const items: BaseTabsItem<string>[] = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta', disabled: true },
      ]
      const wrapper = mountTabs({ items })
      const tabs = wrapper.findAll('[role="tab"]')
      expect((tabs[1].element as HTMLButtonElement).disabled).toBe(true)
    })

    it('disables every tab when the whole component is disabled', () => {
      const wrapper = mountTabs({ disabled: true })
      const tabs = wrapper.findAll('[role="tab"]')
      expect(tabs.every((t) => (t.element as HTMLButtonElement).disabled)).toBe(true)
    })
  })

  // ── onBeforeChange hook（回傳值 API）──────────────────────────────────────
  describe('onBeforeChange', () => {
    it('switches when the hook returns nothing (undefined)', async () => {
      const onBeforeChange = vi.fn((_value: string) => {})
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      expect(onBeforeChange).toHaveBeenCalledWith('b')
      expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
    })

    it('cancels the switch when the hook returns false', async () => {
      const onBeforeChange = (_value: string) => false
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
    })

    it('defers switching until the returned promise resolves (not false)', async () => {
      let resolve!: (valid?: boolean) => void
      const onBeforeChange = (_value: string) =>
        new Promise<boolean | void>((r) => (resolve = r))
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      // promise 尚未 resolve → 仍停在原 tab
      expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')

      resolve(true)
      await flushPromises()
      expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true')
    })

    it('cancels the switch when the returned promise resolves false', async () => {
      const onBeforeChange = (_value: string) => Promise.resolve(false)
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
    })

    it('discards a stale async confirmation when a newer switch is requested', async () => {
      // 連點 B 再點 C：B 的 promise 較慢 resolve，不該覆蓋使用者最後選的 C
      const resolvers: Array<(v: boolean) => void> = []
      const onBeforeChange = (_value: string) =>
        new Promise<boolean>((r) => resolvers.push(r))
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      const tabs = () => wrapper.findAll('[role="tab"]')

      await tabs()[1].trigger('click') // 請求切到 b（requestId 1）
      await tabs()[2].trigger('click') // 請求切到 c（requestId 2）

      resolvers[1](true) // c 先 resolve → 切到 c
      await flushPromises()
      expect(tabs()[2].attributes('aria-selected')).toBe('true')

      resolvers[0](true) // b 後 resolve → 過期，應被捨棄
      await flushPromises()
      expect(tabs()[2].attributes('aria-selected')).toBe('true')
      expect(tabs()[1].attributes('aria-selected')).toBe('false')
    })

    it('cancels the switch (and does not throw) when the hook throws', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onBeforeChange = (_value: string): boolean => {
        throw new Error('boom')
      }
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
      spy.mockRestore()
    })

    it('cancels the switch when the returned promise rejects', async () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const onBeforeChange = (_value: string) => Promise.reject(new Error('boom'))
      const wrapper = mountTabs({ modelValue: 'a', onBeforeChange })
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      await flushPromises()
      expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
      spy.mockRestore()
    })
  })

  // ── Keyboard navigation ──────────────────────────────────────────────────
  describe('keyboard navigation', () => {
    it('moves focus with ArrowRight (manual activation: focus only, no switch)', async () => {
      const wrapper = mountTabs({ modelValue: 'a' })
      const tabs = wrapper.findAll('[role="tab"]')
      ;(tabs[0].element as HTMLButtonElement).focus()
      await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
      expect(document.activeElement).toBe(tabs[1].element)
      // 手動啟用：移動 focus 不切換選中
      expect(tabs[0].attributes('aria-selected')).toBe('true')
    })

    it('ignores cross-axis arrow keys (ArrowDown does nothing when horizontal)', async () => {
      const wrapper = mountTabs({ modelValue: 'a' })
      const tabs = wrapper.findAll('[role="tab"]')
      ;(tabs[0].element as HTMLButtonElement).focus()
      await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowDown' })
      // 水平方向不處理 ↓，focus 應停在原位
      expect(document.activeElement).toBe(tabs[0].element)
    })
  })

  // ── Activation ─────────────────────────────────────────────────────────────
  describe('activation', () => {
    it('manual (default): ArrowRight moves focus but does not switch', async () => {
      const wrapper = mountTabs({ modelValue: 'a' })
      const tabs = wrapper.findAll('[role="tab"]')
      ;(tabs[0].element as HTMLButtonElement).focus()
      await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
      expect(tabs[0].attributes('aria-selected')).toBe('true')
    })

    it('automatic: ArrowRight moves focus and switches selection', async () => {
      const wrapper = mountTabs({ modelValue: 'a', activation: 'automatic' })
      const tabs = () => wrapper.findAll('[role="tab"]')
      ;(tabs()[0].element as HTMLButtonElement).focus()
      await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
      expect(document.activeElement).toBe(tabs()[1].element)
      expect(tabs()[1].attributes('aria-selected')).toBe('true')
    })
  })

  // ── Lazy panel (BaseTabPanel) ────────────────────────────────────────────
  describe('lazy panel', () => {
    it('does not render lazy panel content until first shown, then keeps it', async () => {
      const wrapper = mountTabs({ modelValue: 'a', lazy: true })
      const panelText = () => wrapper.findAll('.base-tab-panel').map((p) => p.text())

      // 初始只顯示 a；b / c 尚未顯示過 → 內容未渲染（空字串）
      expect(panelText()).toEqual(['panel-a', '', ''])

      // 切到 b → b 內容渲染
      await wrapper.findAll('[role="tab"]')[1].trigger('click')
      expect(panelText()).toEqual(['panel-a', 'panel-b', ''])

      // 切回 a → b 已顯示過，內容保留（仍渲染）
      await wrapper.findAll('[role="tab"]')[0].trigger('click')
      expect(panelText()).toEqual(['panel-a', 'panel-b', ''])
    })
  })

  // ── Orientation ──────────────────────────────────────────────────────────
  describe('orientation', () => {
    it('defaults to horizontal: aria-orientation + root class', () => {
      const wrapper = mountTabs()
      expect(wrapper.find('[role="tablist"]').attributes('aria-orientation')).toBe('horizontal')
      expect(wrapper.find('.base-tabs').classes()).toContain('base-tabs--horizontal')
    })

    it('vertical: sets aria-orientation="vertical" and modifier class', () => {
      const wrapper = mountTabs({ orientation: 'vertical' })
      expect(wrapper.find('[role="tablist"]').attributes('aria-orientation')).toBe('vertical')
      expect(wrapper.find('.base-tabs').classes()).toContain('base-tabs--vertical')
    })
  })

  // ── Color ──────────────────────────────────────────────────────────────────
  describe('color', () => {
    it('defaults to primary modifier class', () => {
      const wrapper = mountTabs()
      expect(wrapper.find('.base-tabs').classes()).toContain('base-tabs--primary')
    })

    it('applies the semantic color modifier class', () => {
      const wrapper = mountTabs({ color: 'danger' })
      expect(wrapper.find('.base-tabs').classes()).toContain('base-tabs--danger')
    })

    it('vertical: navigates with ArrowDown / ArrowUp instead of left / right', async () => {
      const wrapper = mountTabs({ modelValue: 'a', orientation: 'vertical' })
      const tabs = wrapper.findAll('[role="tab"]')
      const tablist = wrapper.find('[role="tablist"]')
      ;(tabs[0].element as HTMLButtonElement).focus()

      await tablist.trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(tabs[1].element)

      await tablist.trigger('keydown', { key: 'ArrowUp' })
      expect(document.activeElement).toBe(tabs[0].element)

      // 垂直方向不處理 →，focus 不動
      await tablist.trigger('keydown', { key: 'ArrowRight' })
      expect(document.activeElement).toBe(tabs[0].element)
    })
  })

  // ── BaseTabPanel tabindex 自動判斷 ────────────────────────────────────────
  describe('panel focusability (auto tabindex)', () => {
    function mountWithPanels(panelSlots: Record<string, () => unknown>) {
      const items: BaseTabsItem<string>[] = [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
      ]
      const Host = defineComponent({
        components: { BaseTabs, BaseTabPanel },
        render() {
          return h(
            BaseTabs,
            { 'items': items, 'modelValue': 'a', 'onUpdate:modelValue': () => {} },
            () => [
              h(BaseTabPanel, { value: 'a' }, panelSlots.a),
              h(BaseTabPanel, { value: 'b' }, panelSlots.b),
            ],
          )
        },
      })
      return mount(Host, { attachTo: document.body })
    }

    it('adds tabindex=0 to a visible text-only panel (no focusable children)', async () => {
      const wrapper = mountWithPanels({ a: () => 'just text', b: () => 'other' })
      await flushPromises()
      // a 是選中、純文字 → 面板自身可被 Tab 聚焦
      expect(wrapper.findAll('.base-tab-panel')[0].attributes('tabindex')).toBe('0')
    })

    it('does not add tabindex when the visible panel already has focusable content', async () => {
      const wrapper = mountWithPanels({ a: () => h('button', 'inside'), b: () => 'other' })
      await flushPromises()
      // a 內已有 button → 面板自身不該再吃一個 Tab 停靠點
      expect(wrapper.findAll('.base-tab-panel')[0].attributes('tabindex')).toBeUndefined()
    })
  })

  // ── BaseTabPanel standalone ──────────────────────────────────────────────
  describe('BaseTabPanel standalone', () => {
    it('renders as a plain div without tab roles when used without BaseTabs', () => {
      const wrapper = mount(BaseTabPanel, {
        props: { value: 'x' },
        slots: { default: 'content' },
      })
      expect(wrapper.attributes('role')).toBeUndefined()
      expect(wrapper.attributes('hidden')).toBeUndefined()
      expect(wrapper.text()).toBe('content')
    })

    it('does not become a dangling tabpanel when its value matches no tab', () => {
      // value 對不到任何 tab → 不該掛 role="tabpanel"（否則是無 id / 無 aria-labelledby 的孤兒）
      const Host = defineComponent({
        components: { BaseTabs, BaseTabPanel },
        render() {
          return h(
            BaseTabs,
            { 'items': Items, 'modelValue': 'a', 'onUpdate:modelValue': () => {} },
            () => h(BaseTabPanel, { value: 'does-not-exist' }, () => 'orphan'),
          )
        },
      })
      const wrapper = mount(Host)
      const panel = wrapper.find('.base-tab-panel')
      expect(panel.attributes('role')).toBeUndefined()
      expect(panel.attributes('id')).toBeUndefined()
      expect(panel.attributes('tabindex')).toBeUndefined()
    })
  })
})

describe('BaseTabPanel — 可聚焦性偵測', () => {
  it('面板內只有 disabled 按鈕（不可被 Tab）時，面板自身取得 tabindex=0', async () => {
    const Host = defineComponent({
      components: { BaseTabs, BaseTabPanel },
      data: () => ({ tab: 'a' }),
      template: `
        <BaseTabs v-model="tab" :items="[{ label: 'A', value: 'a' }]" aria-label="tabs">
          <BaseTabPanel value="a">
            <button disabled>disabled action</button>
          </BaseTabPanel>
        </BaseTabs>`,
    })
    const w = mount(Host, { attachTo: document.body })
    await flushPromises()
    expect(w.find('[role="tabpanel"]').attributes('tabindex')).toBe('0')
    w.unmount()
  })
})
