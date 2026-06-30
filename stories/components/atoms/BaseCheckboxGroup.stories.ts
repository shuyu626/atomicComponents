import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseCheckboxGroup from '~/components/atoms/BaseCheckboxGroup.vue'
import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseCheckboxGroup 管理一組 BaseCheckbox：v-model 綁陣列（或 Set），透過 provide/inject
// 廣播 name / color / disabled，並複用 BaseFormField 呈現群組標籤、訊息與驗證（如「至少選一項」）。

const WRAP = (inner: string) =>
  `<div style="max-width:520px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseCheckboxGroup',
  component: BaseCheckboxGroup,
  tags: ['autodocs'],
  argTypes: {
    label: { control: { type: 'text' }, description: '群組標籤；也可用 #label slot' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '群組標籤位置（由 BaseFormField 提供）。預設 left' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '廣播給子框的勾選色' },
    disabled: { control: { type: 'boolean' }, description: '整組停用。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填（標籤後顯示 *）。預設 false' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
  },
}

export default meta
type Story = StoryObj

const fruits = [
  { value: 'apple', label: '蘋果' },
  { value: 'banana', label: '香蕉' },
  { value: 'cherry', label: '櫻桃' },
  { value: 'mango', label: '芒果' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '選擇水果',
    labelPlacement: 'top',
    color: 'primary',
    disabled: false,
    required: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseCheckboxGroup, BaseCheckbox },
    setup() {
      const value = ref<string[]>(['banana'])
      return { args, value, fruits }
    },
    template: WRAP(`
      <BaseCheckboxGroup v-bind="args" v-model="value">
        <BaseCheckbox v-for="f in fruits" :key="f.value" :value="f.value" :label="f.label" />
      </BaseCheckboxGroup>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Set model —— v-model 綁 Set
// ─────────────────────────────────────────────────────────────────────────────

export const SetModel: Story = {
  render: () => ({
    components: { BaseCheckboxGroup, BaseCheckbox },
    setup() {
      const value = ref<Set<string>>(new Set(['apple']))
      return { value, fruits }
    },
    template: WRAP(`
      <BaseCheckboxGroup v-model="value" label="Set 群組" label-placement="top">
        <BaseCheckbox v-for="f in fruits" :key="f.value" :value="f.value" :label="f.label" />
      </BaseCheckboxGroup>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ [...value] }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: 'v-model 傳入 `Set` 時維持 Set 容器（Set 進 Set 出）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled —— 整組停用
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BaseCheckboxGroup, BaseCheckbox },
    setup() {
      const value = ref<string[]>(['apple'])
      return { value, fruits }
    },
    template: WRAP(`
      <BaseCheckboxGroup v-model="value" label="停用群組" label-placement="top" disabled>
        <BaseCheckbox v-for="f in fruits" :key="f.value" :value="f.value" :label="f.label" />
      </BaseCheckboxGroup>
    `),
  }),
  parameters: {
    docs: { description: { story: '群組 `disabled` 透過 provide 廣播給所有子框（個別 checkbox 仍可單獨 `disabled`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— 至少選一項
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseCheckboxGroup, BaseCheckbox },
    setup() {
      const value = ref<string[]>([])
      const rules: ValidationRule<string[] | Set<string>>[] = [
        (v) => (Array.isArray(v) ? v.length > 0 : v.size > 0) || '請至少選擇一項',
      ]
      return { value, rules, fruits }
    },
    template: WRAP(`
      <BaseCheckboxGroup v-model="value" label="興趣" label-placement="top" required :rules="rules">
        <BaseCheckbox v-for="f in fruits" :key="f.value" :value="f.value" :label="f.label" />
      </BaseCheckboxGroup>
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 套在整個集合上（touched 於每次 toggle）。「至少選一項」用自訂規則檢查長度 / size。錯誤狀態（`error` prop 或驗證失敗）時，`role="group"` 容器會補上 `aria-invalid="true"`（不只靠視覺色傳達）。' } },
  },
}
