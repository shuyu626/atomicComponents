import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseInputNumber from '~/components/atoms/BaseInputNumber.vue'
import { required } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseInputNumber 是包在 BaseFormField 內的數字步進輸入控制項：APG spinbutton
// pattern（type=text + inputmode=decimal + role=spinbutton）+ ± 步進按鈕（長按
// 連發）+ 鍵盤步進（方向鍵 / Home / End）。輸入採 draft / commit 兩段式——
// 中間態（"1."、"-"）不寫 model，blur / Enter / 步進才 parse → clamp → 捨入。
// model 是 number | null（null = 空值），狀態色全走 --field-* token。

// 統一容器：對齊其他 story 的純 padding + system-ui。
const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseInputNumber',
  component: BaseInputNumber,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'number' }, description: '數值（v-model）；null 表空值' },
    min: { control: { type: 'number' }, description: '最小值；commit 時 clamp、Home 跳至此' },
    max: { control: { type: 'number' }, description: '最大值；commit 時 clamp、End 跳至此' },
    step: { control: { type: 'number' }, description: '步進量（方向鍵 / ± 按鈕）。預設 1' },
    precision: { control: { type: 'number' }, description: '小數位數：顯示 toFixed、commit 捨入到此位數' },
    controls: { control: { type: 'boolean' }, description: '顯示 ± 步進按鈕。預設 true' },
    controlsPosition: {
      control: { type: 'inline-radio' },
      options: ['both', 'right'],
      description: '按鈕位置：± 兩側 / 右側疊排。預設 both',
    },
    placeholder: { control: { type: 'text' }, description: 'placeholder 文字' },
    // 欄位語意（轉發給 BaseFormField）
    label: { control: { type: 'text' }, description: '標籤文字；有 #label slot 時以 slot 為準' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '標籤位置。預設 left' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息；有 #message slot 時以 slot 為準' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填（標籤後顯示 *）。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    readonly: { control: { type: 'boolean' }, description: '唯讀。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '數量',
    labelPlacement: 'top',
    min: 0,
    max: 99,
    step: 1,
    controls: true,
    controlsPosition: 'both',
    message: '方向鍵可步進，Home / End 跳至邊界',
    error: false,
    required: false,
    disabled: false,
    readonly: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseInputNumber },
    setup() {
      const value = ref<number | null>(1)
      return { args, value }
    },
    template: WRAP(`<BaseInputNumber v-bind="args" v-model="value" />`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// MinMaxStep —— 邊界 clamp 與步進量
// ─────────────────────────────────────────────────────────────────────────────

export const MinMaxStep: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { qty: ref<number | null>(1), bulk: ref<number | null>(50) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseInputNumber v-model="qty" label="數量" label-placement="top" :min="1" :max="10" message="1–10：到界時對應按鈕停用" />
        <BaseInputNumber v-model="bulk" label="批量" label-placement="top" :min="0" :max="500" :step="50" message="step=50：鍵入 137 會被保留,步進則以 50 為單位" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`min` / `max` 在 commit 時 clamp（鍵入超界值會被夾回），到達邊界時對應 ± 鈕 `disabled`；`step` 只影響步進量，不限制鍵入值。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Precision —— 小數步進 + 固定位數
// ─────────────────────────────────────────────────────────────────────────────

export const Precision: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { rate: ref<number | null>(0.5), free: ref<number | null>(0) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseInputNumber v-model="rate" label="費率" label-placement="top" :step="0.1" :precision="2" :min="0" :max="1" message="顯示固定兩位；鍵入 0.125 會捨入為 0.13" />
        <BaseInputNumber v-model="free" label="無 precision" label-placement="top" :step="0.1" message="步進 0.1 三次 = 0.3(浮點誤差已修),鍵入值不捨入" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`precision` 設定時顯示以 `toFixed` 格式化、commit 一律捨入；未設時鍵入值不捨入（尊重輸入），步進仍以 `step` 與目前值的小數位推導精度——`0.1` 連按三次得 `0.3` 而非 `0.30000000000000004`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ControlsPosition —— ± 兩側 / 右側疊排
// ─────────────────────────────────────────────────────────────────────────────

export const ControlsPosition: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { a: ref<number | null>(5), b: ref<number | null>(5) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseInputNumber v-model="a" label="both（預設）" label-placement="top" message="± 分列兩側,數字置中" />
        <BaseInputNumber v-model="b" label="right" label-placement="top" controls-position="right" message="按鈕右側上下疊排,數字靠左" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`controlsPosition="both"`（預設）± 分列兩側、數字置中；`"right"` 上下疊排於右側、數字靠左。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NoControls —— 無按鈕（純鍵盤 / 鍵入）
// ─────────────────────────────────────────────────────────────────────────────

export const NoControls: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { amount: ref<number | null>(null) }
    },
    template: WRAP(`
      <BaseInputNumber v-model="amount" label="金額" label-placement="top" :controls="false" placeholder="請輸入金額" message="無按鈕仍可用方向鍵步進" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`controls=false` 隱藏 ± 按鈕；spinbutton 鍵盤操作（方向鍵 / Home / End）不受影響。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WithValidation —— rules（required + 範圍規則）
// ─────────────────────────────────────────────────────────────────────────────

export const WithValidation: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      const stock = ref<number | null>(null)
      // 規則作用於 commit 後的數值；空值以 NaN 收斂,非必填規則自行放行空值。
      const stockRules: ValidationRule<number>[] = [
        required('請輸入庫存量'),
        value => Number.isNaN(value) || value >= 10 || '庫存量至少 10',
      ]
      return { stock, stockRules }
    },
    template: WRAP(`
      <BaseInputNumber v-model="stock" label="庫存量" label-placement="top" :rules="stockRules" :min="0" placeholder="先 blur 一次,之後即時驗證" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 作用於 **commit 後的數值**（輸入中間態不觸發驗證）；空值以 `NaN` 收斂——`required` 因此報錯,自訂規則以 `Number.isNaN(value) ||` 開頭即可放行空值。採 touched-gated:第一次 blur 後才開始即時驗證。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DisabledReadonly —— 停用 / 唯讀
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledReadonly: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { a: ref<number | null>(3), b: ref<number | null>(7) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseInputNumber v-model="a" label="停用" label-placement="top" disabled message="input 與 ± 按鈕全面停用" />
        <BaseInputNumber v-model="b" label="唯讀" label-placement="top" readonly message="可聚焦複製,但不可改值 / 步進" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`disabled` / `readonly` 皆停用 ± 按鈕與鍵盤步進；`readonly` 仍可聚焦與選取複製。狀態樣式由 `--field-*` token 傳遞。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --field-* 與 --input-number-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseInputNumber },
    setup() {
      return { value: ref<number | null>(5) }
    },
    template: WRAP(`
      <BaseInputNumber class="t-number" v-model="value" label="主題色" label-placement="top" :min="0" :max="10" message="覆寫 token 即可主題化" />
      <style>
        .t-number {
          --field-height: 44px;
          --field-active-color: #db2777;
          --field-radius: 10px;
          --input-number-button-width: 40px;
          --input-number-button-color: #db2777;
          --input-number-button-hover-bg: #fdf2f8;
        }
      </style>
    `),
  }),
  parameters: {
    docs: { description: { story: '外觀主體走 BaseFormField 的 `--field-*` token；按鈕另有 `--input-number-button-width` / `--input-number-button-color` / `--input-number-button-hover-bg` 三個自有 token。' } },
  },
}
