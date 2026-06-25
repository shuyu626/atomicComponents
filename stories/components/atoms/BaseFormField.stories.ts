import type { StoryObj } from '@storybook/vue3-vite'
import BaseFormField from '~/components/atoms/BaseFormField.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseFormField 是表單欄位容器：統一「標籤 + 控制項 + 訊息」的三段式版面與狀態
// （error / disabled / readonly / required）。本身不含 input，控制項以 default slot
// 傳入；a11y 接線（id / aria-describedby / aria-invalid…）以 scoped slot props 暴露，
// 由使用端綁到實際控制項上。所有外觀走 --field-* token，可覆寫主題化。

// 共用 demo 樣式：一支對齊本元件 / 整個元件庫視覺語言的示範 input。
// 圓角吃 --field-radius（6px，對齊 BaseButton）、focus 採全庫一致的 outline: 2px solid，
// 邊框吃 --field-color / --field-active-color，error → 紅、disabled → 灰，皆自動跟著欄位狀態變化。
const STYLE = `
  <style>
    .bff-input {
      width: 100%;
      height: var(--field-height);
      padding: 0 12px;
      box-sizing: border-box;
      font-size: 0.875rem;
      line-height: 1;
      color: #111827;
      background: var(--field-background, #fff);
      border: 1px solid var(--field-color, #d1d5db);
      border-radius: var(--field-radius, 6px);
      outline-offset: 2px;
      transition: border-color 0.15s ease;
    }
    .bff-input::placeholder { color: #9ca3af; }
    .bff-input:focus-visible {
      border-color: var(--field-active-color);
      outline: 2px solid var(--field-active-color);
    }
    .bff-input:disabled { cursor: not-allowed; color: #9ca3af; background: #f3f4f6; }
    .bff-input[readonly] { background: #f9fafb; color: #6b7280; }
    .bff-cap { font-size: 12px; color: #6b7280; margin-bottom: 8px; letter-spacing: 0.02em; }
  </style>
`

const DEMO_INPUT = `
  <input
    class="bff-input"
    :id="slot.id"
    :aria-describedby="slot.describedby"
    :aria-invalid="slot.invalid"
    :aria-required="slot.required"
    :disabled="slot.disabled"
    :readonly="slot.readonly"
    :value="slot.readonly ? 'read-only value' : ''"
    placeholder="請輸入…"
  />
`

// 統一容器：對齊其他 story 的純 padding + system-ui（無底色面板）。
const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${STYLE}${inner}</div>`

const meta = {
  title: 'Atoms/BaseFormField',
  component: BaseFormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: { type: 'text' }, description: '標籤文字；有 #label slot 時以 slot 為準' },
    labelPlacement: {
      control: { type: 'inline-radio' },
      options: ['left', 'top'],
      description: '標籤位置。預設 left',
    },
    labelWidth: {
      control: { type: 'text' },
      description: 'label-left 時的標籤寬度（數字補 px / 字串原樣）。預設 fit-content',
    },
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
    labelWidth: 'fit-content',
    hideLabel: false,
    message: '我們不會公開你的信箱',
    error: false,
    required: false,
    disabled: false,
    readonly: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseFormField },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseFormField v-bind="args">
        <template #default="slot">${DEMO_INPUT}</template>
      </BaseFormField>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Label placement —— left / top
// ─────────────────────────────────────────────────────────────────────────────

export const LabelPlacement: Story = {
  render: () => ({
    components: { BaseFormField },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:24px">
        <div>
          <div class="bff-cap">labelPlacement = "left"</div>
          <BaseFormField label="姓名" label-placement="left" label-width="72px">
            <template #default="slot">${DEMO_INPUT}</template>
          </BaseFormField>
        </div>
        <div>
          <div class="bff-cap">labelPlacement = "top"</div>
          <BaseFormField label="姓名" label-placement="top">
            <template #default="slot">${DEMO_INPUT}</template>
          </BaseFormField>
        </div>
      </div>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`left`（標籤並排，寬度由 `labelWidth` 控制）與 `top`（標籤置頂）兩種版面。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— 一張完整表單裡的 required / error / disabled / readonly
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseFormField },
    template: WRAP(`
      <form style="display:flex;flex-direction:column;gap:20px" @submit.prevent>
        <BaseFormField label="帳號" label-placement="top" required message="此欄位為必填">
          <template #default="slot">${DEMO_INPUT}</template>
        </BaseFormField>
        <BaseFormField label="電子郵件" label-placement="top" error message="電子郵件格式不正確">
          <template #default="slot">${DEMO_INPUT}</template>
        </BaseFormField>
        <BaseFormField label="邀請碼" label-placement="top" disabled message="目前不開放輸入">
          <template #default="slot">${DEMO_INPUT}</template>
        </BaseFormField>
        <BaseFormField label="會員編號" label-placement="top" readonly message="系統自動產生，無法修改">
          <template #default="slot">${DEMO_INPUT}</template>
        </BaseFormField>
      </form>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '狀態透過 --field-* token 傳遞給控制項：`error` 邊框 / focus outline / 訊息轉紅、'
          + '`disabled` 變淡、`readonly` 改底色。`required` 標籤後加 `*`，'
          + '`invalid` / `required` 也以 slot prop 傳出讓控制項綁對應 aria。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Hide label —— sr-only（搭配 placeholder 維持可用性）
// ─────────────────────────────────────────────────────────────────────────────

export const HideLabel: Story = {
  render: () => ({
    components: { BaseFormField },
    template: WRAP(`
      <div class="bff-cap">標籤已視覺隱藏，但螢幕閱讀器仍可讀到</div>
      <BaseFormField label="搜尋關鍵字" hide-label>
        <template #default="slot">${DEMO_INPUT}</template>
      </BaseFormField>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`hideLabel` 視覺上隱藏標籤但保留給螢幕閱讀器（sr-only），版面不再保留標籤欄。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom slots —— #label / #message
// ─────────────────────────────────────────────────────────────────────────────

export const CustomSlots: Story = {
  render: () => ({
    components: { BaseFormField },
    template: WRAP(`
      <BaseFormField label-placement="top" error required>
        <template #label>
          密碼
          <span style="color:#9ca3af;font-weight:400;font-size:0.75rem">（至少 8 碼）</span>
        </template>
        <template #default="slot">${DEMO_INPUT}</template>
        <template #message="{ error }">
          <span style="display:inline-flex;align-items:center;gap:4px"
                :style="{ color: error ? '#dc2626' : '#6b7280' }">
            <span aria-hidden="true">⚠</span> 密碼強度不足
          </span>
        </template>
      </BaseFormField>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`#label` / `#message` slot 可放任意內容；`#message` 取得 `error` scoped prop 自訂樣式。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --field-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseFormField },
    template: WRAP(`
      <div class="bff-cap">--field-height: 44px · --field-active-color: #db2777</div>
      <BaseFormField class="t-field" label="主題色欄位" label-placement="top" message="點一下輸入框看 focus outline">
        <template #default="slot">${DEMO_INPUT}</template>
      </BaseFormField>
      <style>
        .t-field { --field-height: 44px; --field-active-color: #db2777; }
      </style>
    `),
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--field-height` / `--field-active-color` 等 token 即可主題化（focus outline 自動跟著 active-color 變色）。' },
    },
  },
}
