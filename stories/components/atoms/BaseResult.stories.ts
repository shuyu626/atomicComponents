import type { StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BaseResult from '~/components/atoms/BaseResult.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseModal from '~/components/atoms/BaseModal.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseResult 是結果 / 狀態回饋面板：置中的狀態圓標 + 標題 + 說明 + 動作。
// 可單獨用在頁面（成功頁 / 空狀態 / 404），或塞進 BaseModal / BaseDialog 當結果彈窗
// （彈窗 ✕ 由 Modal 提供、主要動作放 #actions）。外觀走 --result-* token。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:420px;background:#f3f4f6">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px">${inner}</div>
  </div>`

const meta = {
  title: 'Atoms/BaseResult',
  component: BaseResult,
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: { type: 'inline-radio' },
      options: ['success', 'info', 'warning', 'error'],
      description: '狀態（圓標顏色 + 內建字符）。預設 info',
    },
    title: { control: { type: 'text' }, description: '主標題' },
    description: { control: { type: 'text' }, description: '說明文字' },
    icon: { control: { type: 'boolean' }, description: '是否顯示狀態圖示。預設 true' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    status: 'success',
    title: '您已駁回該筆融資案件',
    description: '',
    icon: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseResult, BaseButton },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseResult v-bind="args">
        <template #actions><BaseButton variant="outline" color="neutral">關閉</BaseButton></template>
      </BaseResult>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Statuses —— success / info / warning / error
// ─────────────────────────────────────────────────────────────────────────────

export const Statuses: Story = {
  render: () => ({
    components: { BaseResult },
    template: `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:32px;font-family:system-ui;background:#f3f4f6">
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px">
          <BaseResult status="success" title="操作成功" description="您已駁回該筆融資案件" />
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px">
          <BaseResult status="info" title="提示" description="資料已排入處理佇列" />
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px">
          <BaseResult status="warning" title="發生非預期的錯誤" description="欄位值不一致，請檢查並重新提交。" />
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px">
          <BaseResult status="error" title="提交失敗" description="連線逾時，請稍後再試。" />
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: { description: { story: '四種狀態：success（綠勾）/ info（藍 i）/ warning（琥珀驚嘆號）/ error（紅叉）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WithActions —— 動作按鈕
// ─────────────────────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: () => ({
    components: { BaseResult, BaseButton },
    template: WRAP(`
      <BaseResult status="error" title="發生非預期的錯誤" description="欄位值不一致，請檢查並重新提交。">
        <template #actions>
          <BaseButton variant="outline" color="neutral">返回</BaseButton>
          <BaseButton color="primary">重試</BaseButton>
        </template>
      </BaseResult>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#actions` 放一到多個按鈕（返回 / 重試 / 關閉…）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// InModal —— 塞進 BaseModal 當結果彈窗（對應設計稿）
// ─────────────────────────────────────────────────────────────────────────────

export const InModal: Story = {
  render: () => ({
    components: { BaseResult, BaseButton, BaseModal },
    setup() {
      const open = ref(true)
      return { open }
    },
    template: `
      <div style="padding:32px;font-family:system-ui">
        <BaseButton @click="open = true">顯示結果彈窗</BaseButton>
        <BaseModal v-model="open" :hide-close-button="false">
          <BaseResult status="success" title="您已駁回該筆融資案件">
            <template #actions>
              <BaseButton variant="outline" color="neutral" @click="open = false">關閉</BaseButton>
            </template>
          </BaseResult>
        </BaseModal>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '把 BaseResult 放進 BaseModal 即為結果彈窗：Modal 提供遮罩 / ✕ / focus trap，Result 負責置中的狀態內容。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomIcon —— 覆寫圖示
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => ({
    components: { BaseResult, BaseButton },
    template: WRAP(`
      <BaseResult title="已送出申請" description="我們會在 3 個工作天內回覆">
        <template #icon><span style="font-size:56px" aria-hidden="true">🎉</span></template>
        <template #actions><BaseButton color="primary">我知道了</BaseButton></template>
      </BaseResult>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#icon` slot 覆寫成任意圖示（emoji / 品牌插畫 / 自訂 SVG）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --result-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseResult, BaseButton },
    template: WRAP(`
      <BaseResult class="t-brand" status="success" title="付款完成" description="收據已寄至您的信箱">
        <template #actions><BaseButton>完成</BaseButton></template>
        <style>
          .t-brand { --result-accent: #7c3aed; --result-icon-size: 72px; --result-title-color: #4c1d95; }
        </style>
      </BaseResult>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--result-accent` / `--result-icon-size` / `--result-title-color` 等 token 主題化。' } },
  },
}
