import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseRadio from '~/components/atoms/BaseRadio.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseRadio 是單選圈：<label> 包住 sr-only 原生 <input type=radio> + 自繪圓圈（外環 + 內點）+ 標籤。
// 獨立模式 v-model 綁 value（選中 = model === value），支援 rules 驗證；放進 BaseRadioGroup
// 時自動切換為群組成員（選中 = value === 群組值，由群組統一管理選取與驗證）。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseRadio',
  component: BaseRadio,
  tags: ['autodocs'],
  argTypes: {
    value: { control: { type: 'text' }, description: '此選項代表的值（選中時 v-model 的值）' },
    label: { control: { type: 'text' }, description: '標籤文字；也可用 #default / #label slot' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['right', 'left', 'top', 'bottom'], description: '標籤相對選圈位置。預設 right' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '選取色。預設 primary' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息（獨立模式）' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態（獨立模式）。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    value: 'a',
    label: '選項 A',
    labelPlacement: 'right',
    color: 'primary',
    disabled: false,
    error: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseRadio },
    setup() {
      const value = ref<string>()
      return { args, value }
    },
    template: WRAP(`<BaseRadio v-bind="args" v-model="value" /><p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— checked / unchecked / disabled
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseRadio },
    setup() {
      return { picked: ref('a') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRadio v-model="picked" value="a" label="已選取" />
        <BaseRadio v-model="picked" value="b" label="未選取" />
        <BaseRadio :model-value="'x'" value="x" label="停用（已選）" disabled />
        <BaseRadio :model-value="'y'" value="z" label="停用（未選）" disabled />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: 'radio 為單選且無法靠點擊取消；同一 v-model 下選取互斥（此處示範以 value 區分）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Label placement —— right / left / top / bottom
// ─────────────────────────────────────────────────────────────────────────────

export const LabelPlacement: Story = {
  render: () => ({
    components: { BaseRadio },
    setup() {
      return { picked: ref('right') }
    },
    template: WRAP(`
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <BaseRadio v-model="picked" value="right" label="right" label-placement="right" />
        <BaseRadio v-model="picked" value="left" label="left" label-placement="left" />
        <BaseRadio v-model="picked" value="top" label="top" label-placement="top" />
        <BaseRadio v-model="picked" value="bottom" label="bottom" label-placement="bottom" />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseRadio },
    template: WRAP(`
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <BaseRadio :model-value="'on'" value="on" label="primary" color="primary" />
        <BaseRadio :model-value="'on'" value="on" label="success" color="success" />
        <BaseRadio :model-value="'on'" value="on" label="warning" color="warning" />
        <BaseRadio :model-value="'on'" value="on" label="danger" color="danger" />
        <BaseRadio :model-value="'on'" value="on" label="info" color="info" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`color` 對齊 BaseChip / BaseCheckbox 語意色，透過 `--radio-color` 呈現，可覆寫主題化。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules（如「必選」）
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseRadio },
    setup() {
      const value = ref<string>()
      const rules: ValidationRule<string | undefined>[] = [(v) => v != null || '此選項為必選']
      return { value, rules }
    },
    template: WRAP(`<BaseRadio v-model="value" value="agree" label="我已閱讀並同意" :rules="rules" />`),
  }),
  parameters: {
    docs: { description: { story: '`rules` 採 touched-gated（change / blur 後顯示）。多個 radio 的「必選一項」建議改用 BaseRadioGroup 的群組驗證。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseRadio },
    setup() {
      return { v: ref('on') }
    },
    template: WRAP(`
      <BaseRadio class="t-radio" v-model="v" value="on" label="主題色 + 大尺寸" />
      <style>.t-radio { --radio-color: #db2777; --radio-size: 24px; }</style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--radio-color` / `--radio-size` 等 token 即可主題化。' } },
  },
}
