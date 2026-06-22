import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseAccordion from '~/components/atoms/BaseAccordion.vue'
import BaseAccordionPanel from '~/components/atoms/BaseAccordionPanel.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseAccordion 走 slot 組合 + provide/inject：在預設 slot 放 <BaseAccordionPanel>，
// 各 panel 以 value 對應 v-model。單開模式（預設）v-model 為單值、多開模式為陣列。
// summary 依 headingLevel 包進對應的 <h2>~<h6>（WAI-ARIA），鍵盤 ↑/↓/Home/End 可在
// 標題間移動焦點。useId() 在 Storybook 純 Vue 環境同樣可用，不需 Nuxt context。

const PANEL_STYLE = 'font-size:0.9rem;color:#374151;line-height:1.7'

const meta = {
  title: 'Atoms/BaseAccordion',
  component: BaseAccordion,
  subcomponents: { BaseAccordionPanel },
  tags: ['autodocs'],
  argTypes: {
    multiple: {
      control: { type: 'boolean' },
      description: '是否允許同時展開多個 panel（true 時 v-model 為陣列）',
    },
    headingLevel: {
      control: { type: 'inline-radio' },
      options: [2, 3, 4, 5, 6],
      description: 'summary 包裹的標題層級（WAI-ARIA：header 應為 heading）',
    },
    disabled: {
      control: { type: 'boolean' },
      description: '整體禁用：所有 panel 不可點 / 不可聚焦',
    },
    modelValue: {
      control: false,
      description: '展開中的 value（v-model）。單開為單值、多開為陣列',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— 可在 Controls 面板互動 multiple / headingLevel / disabled
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    multiple: false,
    headingLevel: 3,
    disabled: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      return { args, current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-bind="args" v-model="current">
          <BaseAccordionPanel value="a" summary="什麼是 Accordion？">
            <p :style="panelStyle">一組可展開 / 收合的標題與內容區，常用於 FAQ、設定分區。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="支援哪些鍵盤操作？">
            <p :style="panelStyle">焦點在標題時：↑/↓ 移動、Home/End 跳首尾、Enter/Space 展開收合。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="c" summary="可以多開嗎？">
            <p :style="panelStyle">把 multiple 打開即可同時展開多個，v-model 改綁陣列。</p>
          </BaseAccordionPanel>
        </BaseAccordion>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">當前展開：{{ current ?? '（無）' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Single —— 單開（預設，互斥）
// ─────────────────────────────────────────────────────────────────────────────

export const Single: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      return { current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-model="current">
          <BaseAccordionPanel value="a" summary="第一段">
            <p :style="panelStyle">展開新的會自動收合其它（互斥）。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="第二段">
            <p :style="panelStyle">再次點擊已展開的標題會收合，v-model 變為 undefined。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="c" summary="第三段">
            <p :style="panelStyle">內容可放任意 HTML 或元件。</p>
          </BaseAccordionPanel>
        </BaseAccordion>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple —— 多開（v-model 綁陣列）
// ─────────────────────────────────────────────────────────────────────────────

export const Multiple: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string[]>(['a', 'c'])
      return { current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-model="current" multiple>
          <BaseAccordionPanel value="a" summary="第一段">
            <p :style="panelStyle">多開模式可同時展開多個 panel。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="第二段">
            <p :style="panelStyle">各標題彼此獨立累加 / 移除。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="c" summary="第三段">
            <p :style="panelStyle">v-model 進出皆為陣列。</p>
          </BaseAccordionPanel>
        </BaseAccordion>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">展開中：{{ current.join(', ') || '（無）' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom summary slot —— 用 #summary 加 icon / 副標
// ─────────────────────────────────────────────────────────────────────────────

export const CustomSummarySlot: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      return { current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-model="current">
          <BaseAccordionPanel value="a">
            <template #summary="{ active }">
              <span style="display:inline-flex;align-items:center;gap:8px">
                <strong>運送方式</strong>
                <span style="font-size:0.75rem;color:#6b7280">{{ active ? '展開中' : '點擊查看' }}</span>
              </span>
            </template>
            <p :style="panelStyle">宅配、超商取貨、面交…</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b">
            <template #summary="{ active }">
              <span style="display:inline-flex;align-items:center;gap:8px">
                <strong>付款方式</strong>
                <span style="font-size:0.75rem;color:#6b7280">{{ active ? '展開中' : '點擊查看' }}</span>
              </span>
            </template>
            <p :style="panelStyle">信用卡、ATM、貨到付款…</p>
          </BaseAccordionPanel>
        </BaseAccordion>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled panel —— 單一 panel 禁用（鍵盤導覽會跳過）
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledPanel: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      return { current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-model="current">
          <BaseAccordionPanel value="a" summary="可用區塊">
            <p :style="panelStyle">這段可正常展開。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="停用區塊" disabled>
            <p :style="panelStyle">無法點開。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="c" summary="可用區塊">
            <p :style="panelStyle">用 ↑/↓ 移動焦點時會自動跳過停用的標題。</p>
          </BaseAccordionPanel>
        </BaseAccordion>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone —— 無父層，單一可收合區塊（自管 v-model）
// ─────────────────────────────────────────────────────────────────────────────

export const Standalone: Story = {
  render: () => ({
    components: { BaseAccordionPanel },
    setup() {
      const expanded = ref(false)
      return { expanded, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <div style="border:1px solid #e5e7eb;border-radius:0.5rem;overflow:hidden">
          <BaseAccordionPanel v-model="expanded" summary="獨立可收合區塊（無 BaseAccordion）">
            <p :style="panelStyle">不需要父層 BaseAccordion，透過自身 v-model:modelValue 控制展開；外框由使用端容器提供。</p>
          </BaseAccordionPanel>
        </div>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">展開狀態：{{ expanded ? '展開' : '收合' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy —— 面板首次展開後才掛載內容（重內容省初次渲染）
// ─────────────────────────────────────────────────────────────────────────────

export const Lazy: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      // 在 setup 時印 log，示範「展開後才建立」
      const HeavyContent = {
        props: { label: { type: String, default: '' } },
        setup(props: { label: string }) {
          if (import.meta.env.DEV) console.log(`[lazy] 建立：${props.label}`)
          return () => props.label
        },
      }
      return { current, HeavyContent, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:520px">
        <BaseAccordion v-model="current">
          <BaseAccordionPanel value="a" summary="第一段（一開始就建立）">
            <p :style="panelStyle"><component :is="HeavyContent" label="A 內容" /></p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="第二段（lazy，展開才建立）" lazy>
            <p :style="panelStyle"><component :is="HeavyContent" label="B 內容（切到才建立）" /></p>
          </BaseAccordionPanel>
        </BaseAccordion>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">
          開 console：B 面板加上 <code>lazy</code>，第一次展開才會建立內容；之後收合仍保留。
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom theme —— 透過 --accordion-* token 覆寫
// ─────────────────────────────────────────────────────────────────────────────

export const CustomTheme: Story = {
  render: () => ({
    components: { BaseAccordion, BaseAccordionPanel },
    setup() {
      const current = ref<string>('a')
      return { current, panelStyle: PANEL_STYLE }
    },
    template: `
      <div
        style="padding:16px;font-family:system-ui;max-width:520px;
               --accordion-border-color:#c7d2fe;--accordion-focus-ring:#4f46e5;
               --accordion-radius:0.75rem;--accordion-summary-color:#312e81;
               --accordion-summary-bg-hover:#eef2ff;--accordion-marker-color:#6366f1;
               --accordion-transition-duration:450ms"
      >
        <BaseAccordion v-model="current">
          <BaseAccordionPanel value="a" summary="第一段">
            <p :style="panelStyle">覆寫 --accordion-* token 即可換色、圓角與動畫時長。</p>
          </BaseAccordionPanel>
          <BaseAccordionPanel value="b" summary="第二段">
            <p :style="panelStyle">本例把 --accordion-transition-duration 調成 450ms，展開更舒緩；高度、淡入、旋轉同步變慢。</p>
          </BaseAccordionPanel>
        </BaseAccordion>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">動畫時長已調為 450ms（預設 300ms）。</p>
      </div>
    `,
  }),
}
