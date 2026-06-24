import type { StoryObj } from '@storybook/vue3-vite'
import BaseTooltip from '~/components/atoms/BaseTooltip.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTooltip 是包裝 BasePopover 的「深色文字提示」薄層：以 default slot 為觸發錨點，
// 預設 hover / focus 觸發，role="tooltip"，並附帶會跟隨翻轉旋轉的箭頭。
// 底座的白底 / 邊框 / 陰影由元件自身樣式中性化，泡泡外觀由 --tooltip-* token 控制。

const REF_BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseTooltip',
  component: BaseTooltip,
  tags: ['autodocs'],
  argTypes: {
    content: {
      control: { type: 'text' },
      description: '提示文字（複雜內容請用 #content slot）',
    },
    trigger: {
      control: { type: 'select' },
      options: ['hover', 'focus', 'click', 'touch'],
      description: '觸發方式（可單選或陣列複選）。預設 [hover, focus]',
    },
    placement: {
      control: { type: 'select' },
      options: [
        'top', 'top-start', 'top-end',
        'right', 'right-start', 'right-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end',
      ],
      description: '首選位置；空間不足時 flip / shift 自動調整。預設 top',
    },
    offset: {
      control: { type: 'number' },
      description: '提示與 reference 的間距（px）',
    },
    disabled: {
      control: { type: 'boolean' },
      description: '整體禁用：不可觸發、不渲染提示',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板可互動 content / trigger / placement…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    content: '這是一段提示文字',
    trigger: ['hover', 'focus'],
    placement: 'top',
    offset: 8,
    disabled: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTooltip },
    setup() {
      return { args, REF_BTN }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip v-bind="args">
          <button :style="REF_BTN">滑鼠移上來 / 鍵盤聚焦</button>
        </BaseTooltip>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Placements —— 各方向（hover 各鈕查看）
// ─────────────────────────────────────────────────────────────────────────────

export const Placements: Story = {
  render: () => ({
    components: { BaseTooltip },
    setup() {
      const placements = ['top', 'right', 'bottom', 'left']
      return { placements }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;gap:24px;justify-content:center">
        <BaseTooltip v-for="p in placements" :key="p" :placement="p" :content="'placement: ' + p">
          <button style="padding:8px 14px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">{{ p }}</button>
        </BaseTooltip>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// IconTrigger —— 以 icon 按鈕為錨點（常見用法）
// ─────────────────────────────────────────────────────────────────────────────

export const IconTrigger: Story = {
  render: () => ({
    components: { BaseTooltip },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip content="更多資訊">
          <button
            type="button"
            aria-label="說明"
            style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;font:600 0.875rem system-ui;color:#6b7280;background:#f3f4f6;border:none;border-radius:9999px;cursor:pointer"
          >?</button>
        </BaseTooltip>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// TouchableHint —— 純資訊「?」圖示，加 touch 讓手機也能點開（見文件 §12）
// ─────────────────────────────────────────────────────────────────────────────
//
// 觸控裝置沒有真正的 hover。對「本身沒有其他動作」的純說明圖示，可加 'touch' 讓手機
// 點按切換提示（點外部關閉由 BasePopover 提供）。⚠️ 有自身動作的按鈕（刪除 / 編輯…）
// 不要這樣做 —— 點一下會同時觸發動作與提示。

export const TouchableHint: Story = {
  render: () => ({
    components: { BaseTooltip },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip content="這是補充說明，手機可點按開啟" :trigger="['hover', 'focus', 'touch']">
          <button
            type="button"
            aria-label="說明"
            style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;font:600 0.875rem system-ui;color:#6b7280;background:#f3f4f6;border:none;border-radius:9999px;cursor:pointer"
          >?</button>
        </BaseTooltip>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '純資訊圖示加上 `touch` 觸發，讓觸控裝置也能點按看提示。有自身動作的按鈕請勿比照辦理（會與點擊動作衝突）——詳見文件「行動裝置策略」。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// RichContent —— 用 #content slot 放結構化內容
// ─────────────────────────────────────────────────────────────────────────────

export const RichContent: Story = {
  render: () => ({
    components: { BaseTooltip },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip placement="bottom">
          <button :style="REF_BTN">查看快捷鍵</button>
          <template #content>
            <div style="display:flex;flex-direction:column;gap:4px">
              <strong style="font-size:0.8125rem">鍵盤快捷鍵</strong>
              <span style="font-size:0.75rem;opacity:0.85">儲存：⌘ + S</span>
              <span style="font-size:0.75rem;opacity:0.85">復原：⌘ + Z</span>
            </div>
          </template>
        </BaseTooltip>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// LongText —— 長文字自動換行（max-width）
// ─────────────────────────────────────────────────────────────────────────────

export const LongText: Story = {
  render: () => ({
    components: { BaseTooltip },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip content="這是一段比較長的提示文字，超過最大寬度時會自動換行，不會無限撐長破壞版面。">
          <button :style="REF_BTN">長提示</button>
        </BaseTooltip>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled —— 禁用：不可觸發
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BaseTooltip },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:flex;justify-content:center">
        <BaseTooltip content="不會顯示" disabled>
          <button :style="REF_BTN" style="opacity:0.5;cursor:not-allowed">已禁用</button>
        </BaseTooltip>
      </div>
    `,
  }),
}
