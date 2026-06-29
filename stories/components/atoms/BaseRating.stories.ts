import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseRating from '~/components/atoms/BaseRating.vue'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseRating 是星級評分：每顆星 = 底層未選取圖示 + 上層填色圖示（以寬度裁切呈現比例），
// 互動模式再疊透明命中區（__hit）對應 sr-only 原生 <input type=radio>，免費取得方向鍵巡覽、
// 表單語意與 role="radiogroup"。支援 allowHalf 半星、clearable 點同顆歸零、hover 預覽、
// readonly（role=img）、disabled、size、color 與 rules 驗證。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseRating',
  component: BaseRating,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'number' }, description: '評分值（v-model）；allowHalf 時可為 .5' },
    max: { control: { type: 'number' }, description: '星數上限。預設 5' },
    allowHalf: { control: { type: 'boolean' }, description: '允許半星（0.5 級距）。預設 false' },
    clearable: { control: { type: 'boolean' }, description: '點已選取的同顆星可歸零。預設 true' },
    readonly: { control: { type: 'boolean' }, description: '唯讀（呈現分數、role=img）。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    size: { control: { type: 'inline-radio' }, options: ['small', 'medium', 'large'], description: '尺寸。預設 medium' },
    color: { control: { type: 'select' }, options: ['primary', 'success', 'warning', 'danger', 'info'], description: '評分色；未指定時用金色預設 token' },
    label: { control: { type: 'text' }, description: '標籤文字；也可用 #default / #label slot' },
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
    label: '滿意度',
    max: 5,
    allowHalf: false,
    clearable: true,
    readonly: false,
    disabled: false,
    size: 'medium',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseRating },
    setup() {
      const value = ref(3)
      return { args, value }
    },
    template: WRAP(`<BaseRating v-bind="args" v-model="value" /><p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— 各種分數
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      return { a: ref(0), b: ref(3), c: ref(5) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRating v-model="a" label="未評分" />
        <BaseRating v-model="b" label="三顆星" />
        <BaseRating v-model="c" label="滿分" />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// AllowHalf —— 半星
// ─────────────────────────────────────────────────────────────────────────────

export const AllowHalf: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      const value = ref(2.5)
      return { value }
    },
    template: WRAP(`
      <BaseRating v-model="value" allow-half label="半星評分" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`allowHalf` 後每顆星拆成左右兩個命中區（0.5 / 1），hover 與點擊皆支援半星。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Clearable —— 點同顆歸零
// ─────────────────────────────────────────────────────────────────────────────

export const Clearable: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      return { a: ref(3), b: ref(3) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRating v-model="a" label="可清除（點第 3 顆歸零）" />
        <BaseRating v-model="b" label="不可清除" :clearable="false" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`clearable`（預設開）：再次點擊已選取的同一顆星即歸零。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Readonly —— 唯讀（支援任意小數）
// ─────────────────────────────────────────────────────────────────────────────

export const Readonly: Story = {
  render: () => ({
    components: { BaseRating },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRating :model-value="3.7" readonly label="平均分 3.7" />
        <BaseRating :model-value="4.2" readonly label="平均分 4.2" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`readonly` 以 `role="img"` + `aria-label` 朗讀分數，填色層用寬度裁切呈現任意小數（如 3.7 → 70%）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseRating },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRating :model-value="3" size="small" label="small" />
        <BaseRating :model-value="3" size="medium" label="medium" />
        <BaseRating :model-value="3" size="large" label="large" />
      </div>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseRating },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:12px">
        <BaseRating :model-value="4" label="預設（金色）" />
        <BaseRating :model-value="4" label="primary" color="primary" />
        <BaseRating :model-value="4" label="success" color="success" />
        <BaseRating :model-value="4" label="danger" color="danger" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '未指定 `color` 用金色預設 `--rating-color`；指定語意色則覆寫之，亦可直接覆寫 token 主題化。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BaseRating },
    template: WRAP(`<BaseRating :model-value="3" disabled label="停用" />`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules（必填評分）
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      const value = ref(0)
      const rules: ValidationRule<number | undefined>[] = [(v) => (!!v && v > 0) || '請給予評分']
      return { value, rules }
    },
    template: WRAP(`<BaseRating v-model="value" label="請評分" :rules="rules" />`),
  }),
  parameters: {
    docs: { description: { story: '`rules` 採 touched-gated（change / blur 後顯示）。必填評分用 `v => (!!v && v > 0) || \'...\'`。父層可用模板 ref 呼叫 `validate()`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomIcon —— 自訂圖示 slot
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      return { value: ref(3) }
    },
    template: WRAP(`
      <BaseRating v-model="value" label="愛心評分" style="--rating-color:#e11d48;font-size:0">
        <template #icon:selected>
          <span style="font-size:1.5rem;line-height:1;color:#e11d48">❤</span>
        </template>
        <template #icon:unselected>
          <span style="font-size:1.5rem;line-height:1;color:#e0e0e0">❤</span>
        </template>
      </BaseRating>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#icon:selected` / `#icon:unselected` slot 可替換為任意圖示（emoji、icon component…），填滿比例仍由元件裁切控制。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseRating },
    setup() {
      return { value: ref(4) }
    },
    template: WRAP(`
      <BaseRating class="t-rating" v-model="value" label="主題色 + 大尺寸" />
      <style>.t-rating { --rating-color: #7c3aed; --rating-size: 2.25rem; --rating-gap: 8px; }</style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--rating-color` / `--rating-size` / `--rating-gap` 等 token 即可主題化。' } },
  },
}
