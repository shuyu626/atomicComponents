import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseTextField from '~/components/atoms/BaseTextField.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTextField 是包在 BaseFormField 內的文字輸入控制項：補上實際的 <input> 與
// prepend / append、字數計數，並把 label / message / error / required… 等欄位語意
// 透過 useFormFieldProps 一鍵轉發給 BaseFormField。v-model 用 defineModel，支援
// .trim / .number / .lazy modifier。所有狀態色走 --field-* token。

// 統一容器：對齊其他 story 的純 padding + system-ui。
const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseTextField',
  component: BaseTextField,
  tags: ['autodocs'],
  argTypes: {
    modelValue: { control: { type: 'text' }, description: '輸入值（v-model）；支援 .trim / .number / .lazy modifier' },
    type: {
      control: { type: 'select' },
      options: ['text', 'password', 'email', 'tel', 'url', 'search', 'number'],
      description: '輸入框型別。number 會自動轉數字並停用計數。預設 text',
    },
    placeholder: { control: { type: 'text' }, description: 'placeholder 文字' },
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
    label: '電子郵件',
    labelPlacement: 'top',
    type: 'email',
    placeholder: 'you@example.com',
    message: '我們不會公開你的信箱',
    showCount: false,
    error: false,
    required: false,
    disabled: false,
    readonly: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTextField },
    setup() {
      const value = ref('')
      return { args, value }
    },
    template: WRAP(`<BaseTextField v-bind="args" v-model="value" />`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Types —— text / password / email / number…
// ─────────────────────────────────────────────────────────────────────────────

export const Types: Story = {
  render: () => ({
    components: { BaseTextField },
    setup() {
      return { text: ref('Alice'), pwd: ref('secret'), num: ref(42) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextField v-model="text" label="文字" label-placement="top" placeholder="一般文字" />
        <BaseTextField v-model="pwd" label="密碼" label-placement="top" type="password" />
        <BaseTextField v-model="num" label="數量" label-placement="top" type="number" message="type=number 自動轉數字" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`type` 對應原生 input 型別；`number` 會把值轉成數字（等同 `.number` modifier）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Prepend / Append —— 字串前後綴
// ─────────────────────────────────────────────────────────────────────────────

export const PrependAppend: Story = {
  render: () => ({
    components: { BaseTextField },
    setup() {
      return { price: ref(''), domain: ref('') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextField v-model="price" label="金額" label-placement="top" prepend="$" append="USD" type="number" />
        <BaseTextField v-model="domain" label="網址" label-placement="top" prepend="https://" append=".com" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`prepend` / `append` 接受字串（顯示為文字）或 Vue 元件（以 `<component :is>` 渲染），也可用 `#prepend` / `#append` slot。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Show count —— 字數計數（含 maxlength）
// ─────────────────────────────────────────────────────────────────────────────

export const ShowCount: Story = {
  render: () => ({
    components: { BaseTextField },
    setup() {
      return { bio: ref('Hello 世界 👨‍👩‍👧‍👦') }
    },
    template: WRAP(`
      <BaseTextField
        v-model="bio"
        label="自我介紹"
        label-placement="top"
        :maxlength="20"
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
    components: { BaseTextField },
    setup() {
      return {
        account: ref(''),
        email: ref('not-an-email'),
        invite: ref(''),
        memberId: ref('M-2024-0001'),
      }
    },
    template: WRAP(`
      <form style="display:flex;flex-direction:column;gap:20px" @submit.prevent>
        <BaseTextField v-model="account" label="帳號" label-placement="top" required message="此欄位為必填" />
        <BaseTextField v-model="email" label="電子郵件" label-placement="top" error message="電子郵件格式不正確" />
        <BaseTextField v-model="invite" label="邀請碼" label-placement="top" disabled message="目前不開放輸入" />
        <BaseTextField v-model="memberId" label="會員編號" label-placement="top" readonly message="系統自動產生" />
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
    components: { BaseTextField },
    setup() {
      return { a: ref(''), b: ref('') }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseTextField v-model="a" label="姓名" label-placement="left" label-width="72px" placeholder="並排標籤" />
        <BaseTextField v-model="b" label="姓名" label-placement="top" placeholder="置頂標籤" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`labelPlacement` 由 BaseFormField 提供：`left`（並排，寬度 `labelWidth`）/ `top`（置頂）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --field-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseTextField },
    setup() {
      return { value: ref('') }
    },
    template: WRAP(`
      <BaseTextField class="t-field" v-model="value" label="主題色欄位" label-placement="top" placeholder="點一下看 focus outline" />
      <style>
        .t-field { --field-height: 44px; --field-active-color: #db2777; --field-radius: 10px; }
      </style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--field-height` / `--field-active-color` / `--field-radius` 等 token 即可主題化（input 外框與 focus outline 自動跟著變）。' } },
  },
}
