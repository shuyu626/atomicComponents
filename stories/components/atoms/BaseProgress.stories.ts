import { onUnmounted, ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseProgress from '~/components/atoms/BaseProgress.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseProgress 是進度指示元件：linear（橫條）與 circular（環形）兩種型態，
// 支援 determinate（確定百分比）與 indeterminate（進度未知的持續動畫）。
// 顏色 / 粗細 / 尺寸 / 圓角全走 --progress-* token，可跨專案主題化。

const WRAP = (inner: string) =>
  `<div style="display:flex;flex-direction:column;gap:20px;padding:32px;font-family:system-ui;max-width:420px">${inner}</div>`

const ROW = (inner: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:24px;padding:32px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseProgress',
  component: BaseProgress,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'inline-radio' },
      options: ['linear', 'circular'],
      description: '型態：橫條 / 環形。預設 linear',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'danger', 'info'],
      description: '語意色。預設 primary',
    },
    value: { control: { type: 'range', min: 0, max: 100, step: 1 }, description: '當前進度值' },
    max: { control: { type: 'number' }, description: '最大值。預設 100' },
    thickness: { control: { type: 'number' }, description: '軌道粗細（px）。預設 8' },
    size: { control: { type: 'number' }, description: '環形尺寸（px）；僅 circular。預設 64' },
    indeterminate: { control: { type: 'boolean' }, description: '進度未知的持續動畫。預設 false' },
    indicator: {
      control: { type: 'select' },
      options: [false, true, 'percentage', 'value'],
      description: '指示文字：true/percentage 顯示百分比、value 顯示原始值。預設 false',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    variant: 'linear',
    color: 'primary',
    value: 40,
    max: 100,
    thickness: 8,
    size: 64,
    indeterminate: false,
    indicator: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseProgress },
    setup() {
      return { args }
    },
    template: WRAP('<BaseProgress v-bind="args" />'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— linear / circular
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseProgress },
    template: ROW(`
      <BaseProgress :value="60" indicator style="width:240px" />
      <BaseProgress variant="circular" :value="60" indicator />
    `),
  }),
  parameters: {
    docs: { description: { story: 'linear（橫條）與 circular（環形），皆可選配指示文字。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 語意色
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseProgress },
    template: WRAP(`
      <BaseProgress color="primary" :value="70" indicator />
      <BaseProgress color="success" :value="70" indicator />
      <BaseProgress color="warning" :value="70" indicator />
      <BaseProgress color="danger" :value="70" indicator />
      <BaseProgress color="info" :value="70" indicator />
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Indicator —— percentage / value / slot
// ─────────────────────────────────────────────────────────────────────────────

export const Indicators: Story = {
  render: () => ({
    components: { BaseProgress },
    template: WRAP(`
      <BaseProgress :value="40" indicator="percentage" />
      <BaseProgress :value="3" :max="5" indicator="value" />
      <BaseProgress :value="80">
        <template #default="{ percentage }">
          <strong>{{ percentage }}</strong><small>%</small>
        </template>
      </BaseProgress>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`indicator="percentage"` 顯示百分比、`"value"` 顯示原始值（搭配 `max`）；或用 `#default` scoped slot 自訂呈現（`{ percentage, value }`）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— 環形尺寸 / 粗細
// ─────────────────────────────────────────────────────────────────────────────

export const CircularSizes: Story = {
  render: () => ({
    components: { BaseProgress },
    template: ROW(`
      <BaseProgress variant="circular" :value="75" :size="40" :thickness="4" />
      <BaseProgress variant="circular" :value="75" :size="64" :thickness="8" indicator />
      <BaseProgress variant="circular" :value="75" :size="96" :thickness="10" indicator />
    `),
  }),
  parameters: {
    docs: { description: { story: '`size` 控制環形直徑、`thickness` 控制圈線寬。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Indeterminate —— 進度未知的持續動畫
// ─────────────────────────────────────────────────────────────────────────────

export const Indeterminate: Story = {
  render: () => ({
    components: { BaseProgress },
    template: ROW(`
      <BaseProgress indeterminate style="width:240px" />
      <BaseProgress variant="circular" indeterminate />
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`indeterminate` 忽略 `value`，以持續動畫表示「處理中」。尊重 `prefers-reduced-motion`：使用者關閉動態效果時改為靜態呈現。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Live —— 模擬載入進度
// ─────────────────────────────────────────────────────────────────────────────

export const Live: Story = {
  render: () => ({
    components: { BaseProgress },
    setup() {
      const value = ref(0)
      const timer = setInterval(() => {
        value.value = value.value >= 100 ? 0 : value.value + 5
      }, 600)
      onUnmounted(() => clearInterval(timer))
      return { value }
    },
    template: ROW(`
      <BaseProgress :value="value" indicator style="width:240px" />
      <BaseProgress variant="circular" :value="value" indicator />
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: 'determinate 進度改變時，linear 以 transform、circular 以 stroke-dasharray 平滑過渡。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --progress-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseProgress },
    template: `
      <div style="display:flex;flex-direction:column;gap:20px;padding:32px;font-family:system-ui;max-width:420px">
        <BaseProgress class="t-square" :value="60" indicator />
        <BaseProgress class="t-brand" :value="60" indicator />
        <BaseProgress class="t-thick" :value="60" />
        <style>
          .t-square { --progress-radius: 0; }
          .t-brand { --progress-color: #8b5cf6; --progress-rail-color: #ede9fe; }
          .t-thick { --progress-thickness: 16px; --progress-color: #db2777; }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '覆寫 `--progress-color` / `--progress-rail-color` / `--progress-radius` / `--progress-thickness` 等 token 即可主題化（`thickness` prop 亦會注入 `--progress-thickness`）。',
      },
    },
  },
}
