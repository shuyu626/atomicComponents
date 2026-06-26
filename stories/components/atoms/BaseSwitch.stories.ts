import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseSwitch from '~/components/atoms/BaseSwitch.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseSwitch 是開關：<label> 包住 sr-only 原生 <input type=checkbox role=switch> + 自繪
// 軌道（__track）+ 滑塊（__thumb）。v-model 綁 boolean（或 activeValue/inactiveValue 自訂
// 值），可選兩側狀態文字（activeText / inactiveText）與 rules 驗證。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseSwitch',
  component: BaseSwitch,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'boolean' }, description: '開關狀態（v-model）；可搭 activeValue/inactiveValue' },
    label: { control: { type: 'text' }, description: '標籤文字；也可用 #default / #label slot' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'right', 'top', 'bottom'], description: '標籤相對開關位置。預設 left' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '開啟色。預設 primary' },
    activeText: { control: { type: 'text' }, description: '開啟時顯示於軌道旁的文字' },
    inactiveText: { control: { type: 'text' }, description: '關閉時顯示於軌道旁的文字' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '深色模式',
    labelPlacement: 'left',
    color: 'primary',
    disabled: false,
    error: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSwitch },
    setup() {
      const value = ref(false)
      return { args, value }
    },
    template: WRAP(`<BaseSwitch v-bind="args" v-model="value" /><p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— on / off / disabled
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      return { a: ref(true), b: ref(false), c: ref(true), d: ref(false) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseSwitch v-model="a" label="開啟" />
        <BaseSwitch v-model="b" label="關閉" />
        <BaseSwitch v-model="c" label="停用（開）" disabled />
        <BaseSwitch v-model="d" label="停用（關）" disabled />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Active / Inactive text —— 兩側狀態文字
// ─────────────────────────────────────────────────────────────────────────────

export const StateText: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      return { v: ref(true) }
    },
    template: WRAP(`<BaseSwitch v-model="v" active-text="啟用" inactive-text="停用" />`),
  }),
  parameters: {
    docs: { description: { story: '`activeText` / `inactiveText` 顯示於軌道兩側，啟用側隨狀態上色，未啟用側標 `aria-hidden`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Label placement —— left / right / top / bottom
// ─────────────────────────────────────────────────────────────────────────────

export const LabelPlacement: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      return { a: ref(true), b: ref(true), c: ref(true), d: ref(true) }
    },
    template: WRAP(`
      <div style="display:flex;gap:24px;flex-wrap:wrap">
        <BaseSwitch v-model="a" label="left" label-placement="left" />
        <BaseSwitch v-model="b" label="right" label-placement="right" />
        <BaseSwitch v-model="c" label="top" label-placement="top" />
        <BaseSwitch v-model="d" label="bottom" label-placement="bottom" />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseSwitch },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseSwitch :model-value="true" label="primary" color="primary" />
        <BaseSwitch :model-value="true" label="success" color="success" />
        <BaseSwitch :model-value="true" label="warning" color="warning" />
        <BaseSwitch :model-value="true" label="danger" color="danger" />
        <BaseSwitch :model-value="true" label="info" color="info" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`color` 對齊 BaseCheckbox 語意色，透過 `--switch-color` 呈現，可覆寫主題化。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Active / Inactive value —— 自訂開關值
// ─────────────────────────────────────────────────────────────────────────────

export const ActiveInactiveValue: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      return { status: ref('off') }
    },
    template: WRAP(`
      <BaseSwitch v-model="status" label="狀態" active-value="on" inactive-value="off" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ status }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`activeValue` / `inactiveValue` 讓 v-model 綁非 boolean 值（如 `"on"` / `"off"`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules（如「必須開啟」）
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      const agree = ref(false)
      const rules: ValidationRule<boolean | undefined>[] = [(v) => v === true || '必須開啟才能繼續']
      return { agree, rules }
    },
    template: WRAP(`<BaseSwitch v-model="agree" label="啟用通知" :rules="rules" />`),
  }),
  parameters: {
    docs: { description: { story: '`rules` 採 touched-gated（change / blur 後顯示）。布林必填用自訂規則 `v => v === true || \'...\'`。父層可用模板 ref 呼叫 `validate()`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseSwitch },
    setup() {
      return { v: ref(true) }
    },
    template: WRAP(`
      <BaseSwitch class="t-sw" v-model="v" label="主題色 + 大尺寸" />
      <style>.t-sw { --switch-color: #db2777; --switch-width: 60px; --switch-height: 32px; }</style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--switch-color` / `--switch-width` / `--switch-height` 等 token 即可主題化。' } },
  },
}
