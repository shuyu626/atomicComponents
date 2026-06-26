import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseRadioGroup from '~/components/atoms/BaseRadioGroup.vue'
import BaseRadio from '~/components/atoms/BaseRadio.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseRadioGroup 管理一組 BaseRadio：v-model 綁單一值，透過 provide/inject 廣播
// name（含自動 fallback，讓原生 radio 同組可方向鍵巡覽）/ color / disabled，並複用
// BaseFormField 呈現群組標籤、訊息與驗證（如「必選一項」），容器標 role="radiogroup"。

const WRAP = (inner: string) =>
  `<div style="max-width:520px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseRadioGroup',
  component: BaseRadioGroup,
  tags: ['autodocs'],
  argTypes: {
    label: { control: { type: 'text' }, description: '群組標籤；也可用 #label slot' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '群組標籤位置（由 BaseFormField 提供）。預設 left' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '廣播給子圈的選取色' },
    disabled: { control: { type: 'boolean' }, description: '整組停用。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填（標籤後顯示 *）。預設 false' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
  },
}

export default meta
type Story = StoryObj

const plans = [
  { value: 'free', label: '免費' },
  { value: 'pro', label: '專業' },
  { value: 'team', label: '團隊' },
  { value: 'enterprise', label: '企業' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '選擇方案',
    labelPlacement: 'top',
    color: 'primary',
    disabled: false,
    required: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseRadioGroup, BaseRadio },
    setup() {
      const value = ref('pro')
      return { args, value, plans }
    },
    template: WRAP(`
      <BaseRadioGroup v-bind="args" v-model="value">
        <BaseRadio v-for="p in plans" :key="p.value" :value="p.value" :label="p.label" />
      </BaseRadioGroup>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled —— 整組停用
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BaseRadioGroup, BaseRadio },
    setup() {
      const value = ref('free')
      return { value, plans }
    },
    template: WRAP(`
      <BaseRadioGroup v-model="value" label="停用群組" label-placement="top" disabled>
        <BaseRadio v-for="p in plans" :key="p.value" :value="p.value" :label="p.label" />
      </BaseRadioGroup>
    `),
  }),
  parameters: {
    docs: { description: { story: '群組 `disabled` 透過 provide 廣播給所有子圈（個別 radio 仍可單獨 `disabled`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— 必選一項
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseRadioGroup, BaseRadio },
    setup() {
      const value = ref<string>()
      const rules: ValidationRule<string | undefined>[] = [(v) => v != null || '請選擇一個方案']
      return { value, rules, plans }
    },
    template: WRAP(`
      <BaseRadioGroup v-model="value" label="方案" label-placement="top" required :rules="rules">
        <BaseRadio v-for="p in plans" :key="p.value" :value="p.value" :label="p.label" />
      </BaseRadioGroup>
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 套在選取值上（touched 於每次 select）。「必選一項」用自訂規則檢查是否為 null。' } },
  },
}
