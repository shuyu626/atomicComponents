import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseCheckbox 是勾選框：<label> 包住 sr-only 原生 <input type=checkbox> + 自繪框 + 標籤。
// 獨立模式 v-model 綁 boolean（或 trueValue/falseValue 自訂值）、支援 indeterminate 與
// rules 驗證；放進 BaseCheckboxGroup 時自動切換為群組成員（勾選 = value ∈ 群組值）。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseCheckbox',
  component: BaseCheckbox,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'boolean' }, description: '勾選狀態（v-model）；可搭 trueValue/falseValue' },
    label: { control: { type: 'text' }, description: '標籤文字；也可用 #default / #label slot' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['right', 'left', 'top', 'bottom'], description: '標籤相對勾選框位置。預設 right' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '勾選色。預設 primary' },
    indeterminate: { control: { type: 'boolean' }, description: '半選（aria-checked="mixed"）。預設 false' },
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
    label: '訂閱電子報',
    labelPlacement: 'right',
    color: 'primary',
    indeterminate: false,
    disabled: false,
    error: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseCheckbox },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: WRAP(`<BaseCheckbox v-bind="args" v-model="value" /><p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— checked / indeterminate / disabled
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      return { a: ref(true), b: ref(false), c: ref(false), d: ref(true) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseCheckbox v-model="a" label="已勾選" />
        <BaseCheckbox v-model="b" label="未勾選" />
        <BaseCheckbox v-model="c" label="半選 indeterminate" indeterminate />
        <BaseCheckbox v-model="d" label="停用（已勾）" disabled />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`indeterminate` 以 DOM property + `aria-checked="mixed"` 呈現（常用於「全選」父框的部分選取狀態）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Label placement —— right / left / top / bottom
// ─────────────────────────────────────────────────────────────────────────────

export const LabelPlacement: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      return { a: ref(true), b: ref(true), c: ref(true), d: ref(true) }
    },
    template: WRAP(`
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <BaseCheckbox v-model="a" label="right" label-placement="right" />
        <BaseCheckbox v-model="b" label="left" label-placement="left" />
        <BaseCheckbox v-model="c" label="top" label-placement="top" />
        <BaseCheckbox v-model="d" label="bottom" label-placement="bottom" />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      return { v: ref(true) }
    },
    template: WRAP(`
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <BaseCheckbox :model-value="true" label="primary" color="primary" />
        <BaseCheckbox :model-value="true" label="success" color="success" />
        <BaseCheckbox :model-value="true" label="warning" color="warning" />
        <BaseCheckbox :model-value="true" label="danger" color="danger" />
        <BaseCheckbox :model-value="true" label="info" color="info" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`color` 對齊 BaseChip 語意色，透過 `--checkbox-color` 呈現，可覆寫主題化。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// True / False value —— 自訂勾選值
// ─────────────────────────────────────────────────────────────────────────────

export const TrueFalseValue: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      return { consent: ref('no') }
    },
    template: WRAP(`
      <BaseCheckbox v-model="consent" label="我同意" true-value="yes" false-value="no" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ consent }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`trueValue` / `falseValue` 讓 v-model 綁非 boolean 值（如 `"yes"` / `"no"`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules（如「必須勾選」）
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      const agree = ref(false)
      const rules: ValidationRule<boolean | undefined>[] = [(v) => v === true || '必須同意條款才能繼續']
      return { agree, rules }
    },
    template: WRAP(`<BaseCheckbox v-model="agree" label="我已閱讀並同意服務條款" :rules="rules" />`),
  }),
  parameters: {
    docs: { description: { story: '`rules` 採 touched-gated（change / blur 後顯示）。布林必填用自訂規則 `v => v === true || \'...\'`（`required` 不會把 `false` 視為空）。父層可用模板 ref 呼叫 `validate()`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseCheckbox },
    setup() {
      return { v: ref(true) }
    },
    template: WRAP(`
      <BaseCheckbox class="t-cbx" v-model="v" label="主題色 + 大尺寸" />
      <style>.t-cbx { --checkbox-color: #db2777; --checkbox-size: 22px; --checkbox-radius: 9999px; }</style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--checkbox-color` / `--checkbox-size` / `--checkbox-radius` 等 token 即可主題化。' } },
  },
}
