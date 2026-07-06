import type { StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BaseAlert from '~/components/atoms/BaseAlert.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseAlert 是「常駐的行內狀態訊息」：宣告式、隨內容排版、需使用者知悉的情境訊息
// （表單錯誤摘要、系統公告、操作結果說明…），與短暫、命令式、堆疊的 BaseToast 互補。
// solid / outline / ghost / text 四種 variant + 6 色語意，共用單一 --alert-accent 顏色模型。

const WRAP = (inner: string) =>
  `<div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseAlert',
  component: BaseAlert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outline', 'ghost', 'text'],
      description: '外觀。預設 ghost',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'danger', 'info', 'neutral'],
      description: '語意色。預設 info',
    },
    title: { control: { type: 'text' }, description: '選填標題；亦可用 #title slot 覆寫' },
    icon: { control: { type: 'boolean' }, description: '是否顯示前導狀態圖示。預設 true' },
    closable: { control: { type: 'boolean' }, description: '是否顯示關閉鈕。預設 false' },
    closeLabel: { control: { type: 'text' }, description: '關閉鈕無障礙標籤。預設 關閉' },
    default: { control: { type: 'text' }, description: '訊息主體（default slot）' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    variant: 'ghost',
    color: 'info',
    title: '',
    icon: true,
    closable: false,
    closeLabel: '關閉',
    default: '這是一則行內狀態訊息。',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseAlert },
    setup() {
      return { args }
    },
    template: WRAP('<BaseAlert v-bind="args">{{ args.default }}</BaseAlert>'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— solid / outline / ghost / text
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseAlert },
    template: WRAP(`
      <BaseAlert variant="solid" color="info">Solid：飽和實心底 + 對比字</BaseAlert>
      <BaseAlert variant="outline" color="info">Outline：accent 描邊 + accent 字</BaseAlert>
      <BaseAlert variant="ghost" color="info">Ghost（預設）：淡色調底 + accent 字</BaseAlert>
      <BaseAlert variant="text" color="info">Text：無底無框，僅 accent 字</BaseAlert>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '外觀軸與 BaseChip 一致：`ghost` 淡底（典型 alert 外觀，故為預設）、`solid` 飽和填色、`outline` 描邊、`text` 純文字。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 6 色語意 × ghost
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseAlert },
    template: WRAP(`
      <BaseAlert color="primary">Primary：一般情境訊息</BaseAlert>
      <BaseAlert color="success">Success：操作成功</BaseAlert>
      <BaseAlert color="warning">Warning：需要留意（role=alert）</BaseAlert>
      <BaseAlert color="danger">Danger：發生錯誤（role=alert）</BaseAlert>
      <BaseAlert color="info">Info：補充資訊</BaseAlert>
      <BaseAlert color="neutral">Neutral：中性提示</BaseAlert>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '6 色語意色值對齊 BaseChip（皆深色調，淡底文字 ≥ WCAG AA）。`danger` / `warning` 為 `role="alert"`（assertive），其餘 `role="status"`（polite）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With title —— 標題 + 內文
// ─────────────────────────────────────────────────────────────────────────────

export const WithTitle: Story = {
  render: () => ({
    components: { BaseAlert },
    template: WRAP(`
      <BaseAlert color="danger" title="表單送出失敗">
        請修正下列欄位後再試一次。
      </BaseAlert>
      <BaseAlert color="success" title="已儲存">
        您的變更已成功套用。
      </BaseAlert>
    `),
  }),
  parameters: {
    docs: { description: { story: '`title` prop（或 `#title` slot）渲染在內文上方、字重較粗。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Closable —— 受控關閉
// ─────────────────────────────────────────────────────────────────────────────

export const Closable: Story = {
  render: () => ({
    components: { BaseAlert },
    setup() {
      const visible = ref(true)
      return { visible }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseAlert
          v-if="visible"
          color="warning"
          title="系統維護通知"
          closable
          close-label="關閉通知"
          @close="visible = false"
        >
          系統將於今晚 02:00 進行維護，屆時服務可能短暫中斷。
        </BaseAlert>
        <button v-else style="align-self:flex-start" @click="visible = true">重新顯示</button>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '`closable` 顯示關閉鈕，點擊 emit `close`；是否真的移除由父層決定（受控）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With actions —— 後置動作區
// ─────────────────────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: () => ({
    components: { BaseAlert },
    template: WRAP(`
      <BaseAlert color="danger" title="連線中斷">
        無法連上伺服器，請檢查網路。
        <template #actions>
          <button style="font:inherit;padding:4px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;cursor:pointer">重試</button>
        </template>
      </BaseAlert>
      <BaseAlert color="info" variant="outline">
        有新版本可用。
        <template #actions>
          <button style="font:inherit;padding:4px 10px;border:none;border-radius:6px;background:currentColor;cursor:pointer"><span style="color:#fff;mix-blend-mode:difference">更新</span></button>
        </template>
      </BaseAlert>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#actions` slot 放於訊息後、關閉鈕前，用於操作按鈕。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom icon —— #icon slot 覆寫 / 關閉圖示
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => ({
    components: { BaseAlert },
    template: WRAP(`
      <BaseAlert color="success">
        <template #icon>🎉</template>
        自訂圖示：用 #icon slot 換成任意內容。
      </BaseAlert>
      <BaseAlert color="neutral" :icon="false">
        icon=false：不顯示前導圖示，訊息貼齊左緣。
      </BaseAlert>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`#icon` slot 覆寫內建狀態 SVG；`icon=false` 則整塊不渲染。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --alert-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseAlert },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseAlert class="t-brand" title="品牌色">覆寫 --alert-accent / --alert-radius 即可主題化。</BaseAlert>
        <style>
          .t-brand { --alert-accent: #db2777; --alert-radius: 14px; }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--alert-accent` / `--alert-radius` 等 token 即可主題化。' },
    },
  },
}
