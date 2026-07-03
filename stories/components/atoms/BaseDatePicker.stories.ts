import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseDatePicker from '~/components/atoms/BaseDatePicker.vue'
import { required } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'
import type { BaseDatePickerModel } from '~/components/atoms/BaseDatePicker.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseDatePicker 是包在 BaseFormField 內的日期 / 區間選擇器:控制項為 role="button"
// 的 div,日曆浮層由 BasePopover 負責定位 / focus-trap / Esc / 點外關閉。日期運算全用
// 原生 Date(~/utils/date),不依賴任何日期函式庫。單選 v-model 綁 ISO 字串,區間綁
// [start, end] tuple。所有狀態色走 --field-* token,面板 accent 走 --date-* token。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseDatePicker',
  component: BaseDatePicker,
  tags: ['autodocs'],
  argTypes: {
    range: { control: { type: 'boolean' }, description: '區間模式(雙月,v-model 綁 tuple)。預設 false' },
    placeholder: { control: { type: 'text' }, description: '單選 placeholder' },
    startPlaceholder: { control: { type: 'text' }, description: '區間起始 placeholder' },
    endPlaceholder: { control: { type: 'text' }, description: '區間結束 placeholder' },
    rangeSeparator: { control: { type: 'text' }, description: '區間分隔文字。預設「至」' },
    min: { control: { type: 'text' }, description: '可選日期下界(ISO)' },
    max: { control: { type: 'text' }, description: '可選日期上界(ISO)' },
    clearable: { control: { type: 'boolean' }, description: '有值時顯示清除鈕。預設 true' },
    firstDayOfWeek: { control: { type: 'number' }, description: '每週起始(0=週日)。預設 0' },
    placement: {
      control: { type: 'select' },
      options: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end'],
      description: '浮層位置。預設 bottom-start',
    },
    // 欄位語意(轉發給 BaseFormField)
    label: { control: { type: 'text' }, description: '標籤文字' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '標籤位置。預設 left' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    readonly: { control: { type: 'boolean' }, description: '唯讀。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '日期',
    labelPlacement: 'top',
    placeholder: '請選擇日期',
    range: false,
    clearable: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseDatePicker },
    setup() {
      const value = ref<BaseDatePickerModel>()
      return { args, value }
    },
    template: WRAP(`
      <BaseDatePicker v-bind="args" v-model="value" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Single
// ─────────────────────────────────────────────────────────────────────────────

export const Single: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      return { value: ref<string>('2026-07-10') }
    },
    template: WRAP(`
      <BaseDatePicker v-model="value" label="日期" label-placement="top" placeholder="請選擇" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '單選:點日即更新 v-model(ISO 字串)並關閉浮層;控制項顯示以 `format` 格式化後的文字(預設 `YYYY/MM/DD`)。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Range
// ─────────────────────────────────────────────────────────────────────────────

export const Range: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      return { value: ref<[string, string]>(['2026-07-05', '2026-07-12']) }
    },
    template: WRAP(`
      <BaseDatePicker v-model="value" range label="區間" label-placement="top" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`range`:雙月面板,點起點→終點(自動升冪排序),中間 hover 即時預覽;v-model 綁 `[start, end]` tuple。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MinMax —— 限制可選範圍
// ─────────────────────────────────────────────────────────────────────────────

export const MinMax: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      return { value: ref<string>('2026-07-10') }
    },
    template: WRAP(`
      <BaseDatePicker v-model="value" :min="'2026-07-05'" :max="'2026-07-20'" label="限定範圍" label-placement="top" message="僅 7/5 ~ 7/20 可選" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`min` / `max`(ISO)界外的日以 `disabled` 擋下,不可點也不參與鍵盤選取。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DisabledDate —— 自訂禁用(如週末)
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledDate: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      const value = ref<string>()
      const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6
      return { value, isWeekend }
    },
    template: WRAP(`
      <BaseDatePicker v-model="value" :disabled-date="isWeekend" label="僅平日" label-placement="top" placeholder="週末不可選" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`disabledDate` 回傳 true 的日不可選。此例停用週末。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— required / error / disabled / readonly
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      return {
        a: ref<string>(),
        b: ref<string>('2026-07-10'),
        c: ref<string>('2026-07-10'),
        d: ref<string>('2026-07-10'),
      }
    },
    template: WRAP(`
      <form style="display:flex;flex-direction:column;gap:20px" @submit.prevent>
        <BaseDatePicker v-model="a" label="必填" label-placement="top" required message="此欄位為必選" placeholder="請選擇" />
        <BaseDatePicker v-model="b" label="錯誤" label-placement="top" error message="日期不被允許" />
        <BaseDatePicker v-model="c" label="停用" label-placement="top" disabled />
        <BaseDatePicker v-model="d" label="唯讀" label-placement="top" readonly />
      </form>
    `),
  }),
  parameters: {
    docs: { description: { story: '狀態透過 --field-* token 傳遞:`error` 邊框 / 訊息轉紅;`disabled` / `readonly` 不可開啟;`required` 標籤後加 `*`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules + touched-gated
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      const value = ref<string>()
      const rules: ValidationRule<BaseDatePickerModel | undefined>[] = [
        required('請選擇日期') as unknown as ValidationRule<BaseDatePickerModel | undefined>,
      ]
      return { value, rules }
    },
    template: WRAP(`
      <BaseDatePicker v-model="value" :rules="rules" label="日期" label-placement="top" placeholder="開啟後不選直接關閉看驗證" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 為規則陣列;採 touched-gated——浮層第一次關閉(等同失焦)後才顯示錯誤。父層可用模板 ref 呼叫 `validate()` / `reset()`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseDatePicker },
    setup() {
      return { value: ref<string>('2026-07-10') }
    },
    template: WRAP(`
      <BaseDatePicker class="t-picker" v-model="value" label="主題色" label-placement="top" />
      <style>
        .t-picker { --field-active-color: #db2777; --field-radius: 10px; }
        .t-picker .base-date-picker__panel,
        .base-popover .base-date-picker__panel { --date-accent: #db2777; }
      </style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--field-active-color` / `--field-radius`(控制項)與 `--date-accent`(面板選取 / 區間色)即可主題化。' } },
  },
}
