import type { StoryObj } from '@storybook/vue3-vite'
import BaseSpinner from '~/components/atoms/BaseSpinner.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseSpinner 是不確定型載入指示：旋轉環表達「處理中、無確定進度」。
// size 具名（sm/md/lg）走 token，數字走自訂像素；color 可選，未指定時吃
// currentColor（放進按鈕 / 文字即繼承色）。粗細 / 速度 / 顏色全走 --spinner-* token。

const meta = {
  title: 'Atoms/BaseSpinner',
  component: BaseSpinner,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '尺寸：具名走 token（16/24/40px），數字走自訂像素。預設 md',
    },
    color: {
      control: { type: 'select' },
      options: [undefined, 'primary', 'success', 'warning', 'danger', 'info', 'neutral'],
      description: '語意色。未指定時吃 currentColor（繼承父層文字色）',
    },
    label: {
      control: { type: 'text' },
      description: '無障礙標籤（aria-label + sr-only 文字）。預設「載入中」',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    size: 'md',
    color: 'primary',
    label: '載入中',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSpinner },
    setup() {
      return { args }
    },
    template: `
      <div style="padding:32px;font-family:system-ui">
        <BaseSpinner v-bind="args" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— sm / md / lg + 自訂像素
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;color:#3b82f6;font-family:system-ui">
        <BaseSpinner size="sm" />
        <BaseSpinner size="md" />
        <BaseSpinner size="lg" />
        <BaseSpinner :size="64" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '具名尺寸 `sm`(16) / `md`(24) / `lg`(40) 走 token；傳數字（此排最後一顆 64）走自訂像素。此排未指定 color，故繼承容器的藍色文字。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 六種語意色
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseSpinner color="primary" />
        <BaseSpinner color="success" />
        <BaseSpinner color="warning" />
        <BaseSpinner color="danger" />
        <BaseSpinner color="info" />
        <BaseSpinner color="neutral" />
      </div>
    `,
  }),
  parameters: {
    docs: { description: { story: '六種語意色 preset，對齊 Base* 色彩家族。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// InheritColor —— 未指定 color 時繼承文字 / 按鈕色
// ─────────────────────────────────────────────────────────────────────────────

export const InheritColor: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display:flex;flex-direction:column;gap:20px;padding:32px;font-family:system-ui">
        <!-- 放在有色文字內：spinner 隨文字色 -->
        <p style="display:inline-flex;align-items:center;gap:8px;color:#7c3aed;margin:0">
          <BaseSpinner size="sm" /> 資料載入中…
        </p>

        <!-- 放在按鈕內：spinner 隨按鈕文字色（白） -->
        <button
          type="button"
          disabled
          style="display:inline-flex;align-items:center;gap:8px;padding:8px 16px;font:inherit;
                 color:#fff;background:#2563eb;border:0;border-radius:8px;cursor:progress;width:fit-content"
        >
          <BaseSpinner size="sm" /> 送出中
        </button>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '不指定 `color` 時 `--spinner-color` 吃 `currentColor`：放進有色文字或按鈕即自動繼承色，無需額外設定。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomLabel —— i18n / 情境化無障礙標籤
// ─────────────────────────────────────────────────────────────────────────────

export const CustomLabel: Story = {
  args: {
    label: 'Loading dashboard…',
    color: 'primary',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSpinner },
    setup() {
      return { args }
    },
    template: `
      <div style="padding:32px;font-family:system-ui">
        <BaseSpinner v-bind="args" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`label` 同時作為 `aria-label` 與 sr-only 文字，供螢幕閱讀器播報；為 i18n 覆寫點（此例改為英文）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --spinner-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseSpinner },
    template: `
      <div style="display:flex;align-items:center;gap:32px;padding:32px;font-family:system-ui">
        <BaseSpinner :size="48" class="t-a" />
        <BaseSpinner :size="48" class="t-b" />
        <style>
          .t-a { --spinner-color:#8b5cf6; --spinner-thickness:6px; --spinner-speed:1.2s; }
          .t-b {
            --spinner-color:#111827;
            --spinner-track-color:#e5e7eb;
            --spinner-thickness:4px;
          }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '覆寫 `--spinner-color` / `--spinner-thickness` / `--spinner-speed` / `--spinner-track-color` 完全自訂外觀（自訂尺寸時建議一併調整 thickness）。',
      },
    },
  },
}
