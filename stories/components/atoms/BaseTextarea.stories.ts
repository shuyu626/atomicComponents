import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseTextarea from '~/components/atoms/BaseTextarea.vue'
import { required, minLength, maxLength } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTextarea 是包在 BaseFormField 內的多行文字輸入控制項：補上實際的 <textarea> 與
// prepend / append、字數計數、autosize 自動高度，並把 label / message / error / required…
// 等欄位語意透過 useFormFieldProps 一鍵轉發給 BaseFormField。v-model 用 defineModel，
// 支援 .trim / .lazy modifier。所有狀態色走 --field-* token。

// 統一容器：對齊其他 story 的純 padding + system-ui。
const WRAP = (inner: string) =>
  `<div style="max-width:480px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseTextarea',
  component: BaseTextarea,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'text' }, description: '輸入值（v-model）；支援 .trim / .lazy modifier' },
    placeholder: { control: { type: 'text' }, description: 'placeholder 文字' },
    rows: { control: { type: 'number' }, description: '初始 / 最小可見行數。預設 2' },
    maxRows: { control: { type: 'number' }, description: 'autosize 時的最大行數上界；未設則不限制' },
    autosize: { control: { type: 'boolean' }, description: '隨內容自動調整高度。預設 false' },
    prepend: { control: { type: 'text' }, description: '前綴（字串或元件）；也可用 #prepend slot' },
    append: { control: { type: 'text' }, description: '後綴（字串或元件）；也可用 #append slot' },
    showCount: { control: { type: 'boolean' }, description: '顯示字數計數（grapheme 計）。預設 false' },
    maxlength: { control: { type: 'number' }, description: '最大字元數；搭配 showCount 顯示 count/maxlength' },
    // 欄位語意（轉發給 BaseFormField）
    label: { control: { type: 'text' }, description: '標籤文字；有 #label slot 時以 slot 為準' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '標籤位置。預設 left' },
    labelWidth: { control: { type: 'text' }, description: 'label-left 時的標籤寬度。預設 fit-content' },
    hideLabel: { control: { type: 'boolean' }, description: '視覺隱藏標籤（保留 sr-only）。預設 false' },
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
    label: '自我介紹',
    labelPlacement: 'top',
    placeholder: '說說你自己…',
    rows: 3,
    message: '最多 200 字',
    autosize: false,
    showCount: false,
    error: false,
    required: false,
    disabled: false,
    readonly: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTextarea },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: WRAP(`<BaseTextarea v-bind="args" v-model="value" />`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Rows —— 固定行數
// ─────────────────────────────────────────────────────────────────────────────

export const Rows: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return { a: ref(''), b: ref('') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextarea v-model="a" label="2 行" label-placement="top" :rows="2" placeholder="預設高度" />
        <BaseTextarea v-model="b" label="5 行" label-placement="top" :rows="5" placeholder="較高的輸入框" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`rows` 控制初始 / 最小可見行數；未開 `autosize` 時可由使用者手動拖拉調整高度（`resize: vertical`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Autosize —— 隨內容自動長高
// ─────────────────────────────────────────────────────────────────────────────

export const Autosize: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return { grow: ref(''), capped: ref('') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextarea v-model="grow" label="無上限" label-placement="top" autosize :rows="2" placeholder="打字看它長高…" />
        <BaseTextarea v-model="capped" label="最多 6 行" label-placement="top" autosize :rows="2" :max-rows="6" placeholder="超過 6 行後內部捲動" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`autosize` 隨內容調整高度，下界為 `rows`、上界為 `maxRows`（未設則不限制）；達上界後改內部捲動。`autosize` 時停用手動拖拉。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Show count —— 字數計數（含 maxlength）
// ─────────────────────────────────────────────────────────────────────────────

export const ShowCount: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return { bio: ref('Hello 世界 👨‍👩‍👧‍👦') }
    },
    template: WRAP(`
      <BaseTextarea
        v-model="bio"
        label="留言"
        label-placement="top"
        :rows="3"
        :maxlength="100"
        show-count
        message="emoji / 中日韓 都正確算 1 字"
      />
    `),
  }),
  parameters: {
    docs: { description: { story: '`showCount` 以 grapheme cluster 計數（原生 `Intl.Segmenter`），emoji（含 ZWJ 組合）算 1 字；有 `maxlength` 時顯示 `count/maxlength`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— required / error / disabled / readonly
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return {
        feedback: ref(''),
        reason: ref('太短'),
        note: ref(''),
        terms: ref('本服務條款自 2026 年起生效…'),
      }
    },
    template: WRAP(`
      <form style="display:flex;flex-direction:column;gap:20px" @submit.prevent>
        <BaseTextarea v-model="feedback" label="意見回饋" label-placement="top" :rows="3" required message="此欄位為必填" />
        <BaseTextarea v-model="reason" label="退貨原因" label-placement="top" :rows="3" error message="請至少輸入 10 個字" />
        <BaseTextarea v-model="note" label="備註" label-placement="top" :rows="3" disabled message="目前不開放輸入" />
        <BaseTextarea v-model="terms" label="服務條款" label-placement="top" :rows="3" readonly message="僅供閱讀" />
      </form>
    `),
  }),
  parameters: {
    docs: { description: { story: '狀態透過 --field-* token 傳遞：`error` 邊框 / focus / 訊息轉紅、`disabled` 變淡、`readonly` 改字色；`required` 標籤後加 `*` 並綁 `aria-required`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Label placement —— left / top
// ─────────────────────────────────────────────────────────────────────────────

export const LabelPlacement: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return { a: ref(''), b: ref('') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextarea v-model="a" label="備註" label-placement="left" label-width="72px" :rows="3" placeholder="並排標籤" />
        <BaseTextarea v-model="b" label="備註" label-placement="top" :rows="3" placeholder="置頂標籤" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`labelPlacement` 由 BaseFormField 提供：`left`（並排，寬度 `labelWidth`，標籤對齊頂端）/ `top`（置頂）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules + touched-gated 即時驗證
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      const feedback = ref('')
      const rules: ValidationRule<string>[] = [
        required('請填寫意見'),
        minLength(10, '至少需 10 個字'),
        maxLength(200, '不可超過 200 個字'),
      ]
      return { feedback, rules }
    },
    template: WRAP(`
      <BaseTextarea
        v-model="feedback"
        label="意見回饋"
        label-placement="top"
        :rows="4"
        :rules="rules"
        show-count
        :maxlength="200"
        placeholder="先 blur 一次,之後逐字即時驗"
      />
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 為規則陣列(每條回傳 `true` 或錯誤字串);採 **touched-gated**——第一次 blur 後才開始逐字即時驗證。可與 `showCount` 並用。常用規則 helper 見 `~/utils/validators`(`required` / `minLength` / `maxLength` / `pattern`…)。父層可用模板 ref 呼叫 `validate()` 在 submit 時強制驗證。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --field-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseTextarea },
    setup() {
      return { value: ref('') }
    },
    template: WRAP(`
      <BaseTextarea class="t-area" v-model="value" label="主題色欄位" label-placement="top" :rows="3" placeholder="點一下看 focus outline" />
      <style>
        .t-area { --field-active-color: #db2777; --field-radius: 10px; }
      </style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--field-active-color` / `--field-radius` 等 token 即可主題化（textarea 外框與 focus outline 自動跟著變）。' } },
  },
}
