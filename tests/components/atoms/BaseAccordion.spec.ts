import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'

import BaseAccordion from '~/components/atoms/BaseAccordion.vue'
import BaseAccordionPanel from '~/components/atoms/BaseAccordionPanel.vue'

// ── Fixtures ─────────────────────────────────────────────────────────────────

interface PanelDef {
  value: string
  summary?: string
  disabled?: boolean
  lazy?: boolean
  content?: string
}

const PANELS: PanelDef[] = [
  { value: 'a', summary: '第一段' },
  { value: 'b', summary: '第二段' },
  { value: 'c', summary: '第三段' },
]

interface MountOptions {
  panels?: PanelDef[]
  modelValue?: string | string[]
  multiple?: boolean
  headingLevel?: 2 | 3 | 4 | 5 | 6
  disabled?: boolean
}

// 組合 BaseAccordion + BaseAccordionPanel 的 host，模擬真實 v-model 使用情境並驗證 inject。
function mountAccordion(options: MountOptions = {}) {
  const { panels = PANELS, multiple, headingLevel, disabled, modelValue } = options
  // 蒐集 emit 出來的值，驗證單開送單值、多開送陣列。
  const emitted: Array<string | string[] | undefined> = []

  const Host = defineComponent({
    components: { BaseAccordion, BaseAccordionPanel },
    data() {
      return { current: modelValue as string | string[] | undefined }
    },
    render() {
      return h(
        BaseAccordion,
        {
          'multiple': multiple,
          'headingLevel': headingLevel,
          'disabled': disabled,
          'modelValue': this.current,
          'onUpdate:modelValue': (value: string | string[] | undefined) => {
            this.current = value
            emitted.push(value)
          },
        },
        () =>
          panels.map((panel) =>
            h(
              BaseAccordionPanel,
              {
                value: panel.value,
                summary: panel.summary,
                disabled: panel.disabled,
                lazy: panel.lazy,
              },
              () => panel.content ?? `content-${panel.value}`,
            ),
          ),
      )
    },
  })

  // attachTo document.body：鍵盤導覽測試需元素連上 document，focus() 才會更新 activeElement
  const wrapper = mount(Host, { attachTo: document.body })
  return { wrapper, emitted }
}

const summaries = (wrapper: ReturnType<typeof mountAccordion>['wrapper']) =>
  wrapper.findAll('button[data-accordion-summary]')

const regions = (wrapper: ReturnType<typeof mountAccordion>['wrapper']) =>
  wrapper.findAll('[role="region"]')

// ── Tests ────────────────────────────────────────────────────────────────────

describe('BaseAccordion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── Structure & a11y ───────────────────────────────────────────────────────
  describe('structure & a11y', () => {
    it('renders one summary button per panel as <button type="button">', () => {
      const { wrapper } = mountAccordion()
      const btns = summaries(wrapper)
      expect(btns).toHaveLength(3)
      btns.forEach((b) => {
        expect(b.element.tagName).toBe('BUTTON')
        expect(b.attributes('type')).toBe('button')
      })
    })

    it('wraps each summary in the default heading level (h3)', () => {
      const { wrapper } = mountAccordion()
      const headings = wrapper.findAll('.base-accordion__heading')
      expect(headings).toHaveLength(3)
      headings.forEach((h3) => expect(h3.element.tagName).toBe('H3'))
    })

    it('honors a custom headingLevel', () => {
      const { wrapper } = mountAccordion({ headingLevel: 2 })
      wrapper
        .findAll('.base-accordion__heading')
        .forEach((h2) => expect(h2.element.tagName).toBe('H2'))
    })

    it('wires summary aria-controls to the content region aria-labelledby', () => {
      const { wrapper } = mountAccordion()
      const btn = summaries(wrapper)[0]
      const region = regions(wrapper)[0]
      expect(btn.attributes('aria-controls')).toBe(region.attributes('id'))
      expect(region.attributes('aria-labelledby')).toBe(btn.attributes('id'))
    })

    it('reflects expanded state via aria-expanded', () => {
      const { wrapper } = mountAccordion({ modelValue: 'b' })
      expect(summaries(wrapper).map((b) => b.attributes('aria-expanded'))).toEqual([
        'false',
        'true',
        'false',
      ])
    })

    it('hides collapsed regions and shows the active one on initial render', () => {
      const { wrapper } = mountAccordion({ modelValue: 'a' })
      // 初始靜止態用 [hidden] 宣告式控制（無動畫介入），確定性可斷言。
      expect(regions(wrapper).map((r) => r.attributes('hidden') !== undefined)).toEqual([
        false,
        true,
        true,
      ])
    })
  })

  // ── Single mode (default, exclusive) ───────────────────────────────────────
  describe('single mode', () => {
    it('opening another panel closes the previously open one (exclusive)', async () => {
      const { wrapper, emitted } = mountAccordion({ modelValue: 'a' })
      await summaries(wrapper)[1].trigger('click')
      expect(summaries(wrapper).map((b) => b.attributes('aria-expanded'))).toEqual([
        'false',
        'true',
        'false',
      ])
      // 單開模式 emit 單值
      expect(emitted.at(-1)).toBe('b')
    })

    it('clicking the open panel collapses it and emits undefined', async () => {
      const { wrapper, emitted } = mountAccordion({ modelValue: 'a' })
      await summaries(wrapper)[0].trigger('click')
      expect(summaries(wrapper)[0].attributes('aria-expanded')).toBe('false')
      expect(emitted.at(-1)).toBeUndefined()
    })
  })

  // ── Multiple mode ──────────────────────────────────────────────────────────
  describe('multiple mode', () => {
    it('keeps multiple panels open and emits an array', async () => {
      const { wrapper, emitted } = mountAccordion({ multiple: true, modelValue: ['a'] })
      await summaries(wrapper)[2].trigger('click')
      expect(summaries(wrapper).map((b) => b.attributes('aria-expanded'))).toEqual([
        'true',
        'false',
        'true',
      ])
      expect(emitted.at(-1)).toEqual(['a', 'c'])
    })

    it('toggling an open panel removes only that value from the array', async () => {
      const { wrapper, emitted } = mountAccordion({ multiple: true, modelValue: ['a', 'c'] })
      await summaries(wrapper)[0].trigger('click')
      expect(summaries(wrapper).map((b) => b.attributes('aria-expanded'))).toEqual([
        'false',
        'false',
        'true',
      ])
      expect(emitted.at(-1)).toEqual(['c'])
    })
  })

  // ── Disabled ───────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('disables an individual panel and ignores its clicks', async () => {
      const panels: PanelDef[] = [
        { value: 'a', summary: 'A' },
        { value: 'b', summary: 'B', disabled: true },
      ]
      const { wrapper, emitted } = mountAccordion({ panels, modelValue: 'a' })
      const btn = summaries(wrapper)[1]
      expect((btn.element as HTMLButtonElement).disabled).toBe(true)
      await btn.trigger('click')
      expect(emitted).toHaveLength(0)
    })

    it('disables every summary when the whole accordion is disabled', () => {
      const { wrapper } = mountAccordion({ disabled: true })
      expect(
        summaries(wrapper).every((b) => (b.element as HTMLButtonElement).disabled),
      ).toBe(true)
    })
  })

  // ── Keyboard navigation ────────────────────────────────────────────────────
  describe('keyboard navigation', () => {
    it('ArrowDown / ArrowUp move focus between summaries with wrap-around', async () => {
      const { wrapper } = mountAccordion()
      const btns = summaries(wrapper)
      ;(btns[0].element as HTMLButtonElement).focus()

      await btns[0].trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(btns[1].element)

      await btns[1].trigger('keydown', { key: 'ArrowUp' })
      expect(document.activeElement).toBe(btns[0].element)

      // 從第一個往上 → 繞回最後一個
      await btns[0].trigger('keydown', { key: 'ArrowUp' })
      expect(document.activeElement).toBe(btns[2].element)
    })

    it('Home / End jump to the first / last summary', async () => {
      const { wrapper } = mountAccordion()
      const btns = summaries(wrapper)
      ;(btns[1].element as HTMLButtonElement).focus()

      await btns[1].trigger('keydown', { key: 'End' })
      expect(document.activeElement).toBe(btns[2].element)

      await btns[2].trigger('keydown', { key: 'Home' })
      expect(document.activeElement).toBe(btns[0].element)
    })

    it('skips disabled summaries when moving focus', async () => {
      const panels: PanelDef[] = [
        { value: 'a', summary: 'A' },
        { value: 'b', summary: 'B', disabled: true },
        { value: 'c', summary: 'C' },
      ]
      const { wrapper } = mountAccordion({ panels })
      const btns = summaries(wrapper)
      ;(btns[0].element as HTMLButtonElement).focus()
      // b 被禁用 → ArrowDown 應略過直接到 c
      await btns[0].trigger('keydown', { key: 'ArrowDown' })
      expect(document.activeElement).toBe(btns[2].element)
    })

    it('ignores unrelated keys', async () => {
      const { wrapper } = mountAccordion()
      const btns = summaries(wrapper)
      ;(btns[0].element as HTMLButtonElement).focus()
      await btns[0].trigger('keydown', { key: 'ArrowRight' })
      expect(document.activeElement).toBe(btns[0].element)
    })
  })

  // ── prefers-reduced-motion（確定性收合）────────────────────────────────────
  describe('reduced motion', () => {
    it('toggles the region [hidden] state synchronously without animation', async () => {
      // happy-dom 不會觸發 transitionend，改走 reduce 路徑驗證收合隱藏的確定性切換。
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList)

      const { wrapper } = mountAccordion({ modelValue: 'a' })
      const region = () => regions(wrapper)[1]
      expect(region().attributes('hidden')).not.toBeUndefined()

      // 開 b
      await summaries(wrapper)[1].trigger('click')
      expect(region().attributes('hidden')).toBeUndefined()

      // 再點 b 收合 → 立即隱藏（無需 transitionend）
      await summaries(wrapper)[1].trigger('click')
      expect(region().attributes('hidden')).not.toBeUndefined()
    })
  })

  // ── Lazy mounting ──────────────────────────────────────────────────────────
  describe('lazy', () => {
    it('defers content until first expanded, then keeps it mounted', async () => {
      const panels: PanelDef[] = [
        { value: 'a', summary: 'A' },
        { value: 'b', summary: 'B', lazy: true },
      ]
      const { wrapper } = mountAccordion({ panels, modelValue: 'a' })
      const bRegion = () => regions(wrapper)[1]

      // b 尚未展開過 → 內容未渲染
      expect(bRegion().text()).toBe('')

      // 展開 b → 內容渲染
      await summaries(wrapper)[1].trigger('click')
      expect(bRegion().text()).toContain('content-b')

      // 切回 a（單開互斥收合 b）→ b 已顯示過，內容保留
      await summaries(wrapper)[0].trigger('click')
      expect(bRegion().text()).toContain('content-b')
    })

    it('renders immediately when a lazy panel starts expanded', () => {
      const panels: PanelDef[] = [{ value: 'a', summary: 'A', lazy: true }]
      const { wrapper } = mountAccordion({ panels, modelValue: 'a' })
      expect(regions(wrapper)[0].text()).toContain('content-a')
    })
  })

  // ── 零高度內容守衛 ──────────────────────────────────────────────────────────
  describe('zero-height content guard', () => {
    it('opening an empty panel leaves no stuck inline height (no transitionend would fire)', async () => {
      // 空內容 + padding 量到 0 時，0→0 不會有過場、transitionend 不觸發；
      // 守衛應直接呈現、不殘留 height:0 / overflow:hidden inline 樣式。
      const panels: PanelDef[] = [{ value: 'a', summary: 'A', content: '' }]
      const { wrapper } = mountAccordion({ panels })
      await summaries(wrapper)[0].trigger('click')
      await flushPromises()

      const region = regions(wrapper)[0].element as HTMLElement
      expect(region.style.height).toBe('')
      expect(region.style.overflow).toBe('')
      // 仍視為展開
      expect(summaries(wrapper)[0].attributes('aria-expanded')).toBe('true')
    })
  })

  // ── BaseAccordionPanel standalone（無父層）──────────────────────────────────
  describe('standalone panel', () => {
    it('works with its own v-model when used without BaseAccordion', async () => {
      const wrapper = mount(BaseAccordionPanel, {
        props: { modelValue: false, summary: '獨立區塊' },
        slots: { default: () => 'standalone-content' },
        attachTo: document.body,
      })
      const btn = wrapper.find('button[data-accordion-summary]')
      expect(btn.attributes('aria-expanded')).toBe('false')

      await btn.trigger('click')
      expect(btn.attributes('aria-expanded')).toBe('true')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([true])
    })

    it('reacts to external v-model changes (controlled open from parent)', async () => {
      // 守住 defineModel 遷移：isActive 直接讀 model，外部改 modelValue 應驅動展開，
      // 不再依賴已移除的 sync watch。
      const wrapper = mount(BaseAccordionPanel, {
        props: { modelValue: false, summary: '受控區塊' },
        slots: { default: () => 'controlled-content' },
        attachTo: document.body,
      })
      const btn = wrapper.find('button[data-accordion-summary]')
      expect(btn.attributes('aria-expanded')).toBe('false')

      await wrapper.setProps({ modelValue: true })
      expect(btn.attributes('aria-expanded')).toBe('true')

      await wrapper.setProps({ modelValue: false })
      expect(btn.attributes('aria-expanded')).toBe('false')
    })

    it('still wires summary / region a11y relationship', () => {
      const wrapper = mount(BaseAccordionPanel, {
        props: { summary: 'S' },
        slots: { default: () => 'c' },
      })
      const btn = wrapper.find('button[data-accordion-summary]')
      const region = wrapper.find('[role="region"]')
      expect(btn.attributes('aria-controls')).toBe(region.attributes('id'))
      expect(region.attributes('aria-labelledby')).toBe(btn.attributes('id'))
    })
  })
})
