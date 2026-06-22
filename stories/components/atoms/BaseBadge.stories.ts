import type { StoryObj } from '@storybook/vue3-vite'
import BaseBadge from '~/components/atoms/BaseBadge.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseBadge 是徽章元件：把數字計數或紅點疊在錨點（icon / 按鈕 / 頭像…）的角落。
// 數字超過 max 收斂成 `${max}+`；content 為 0 預設隱藏（showZero 強制顯示）。
// 顏色 / 尺寸全走 --badge-* token，覆寫 --badge-bg 即可完全自訂顏色。

// 共用的方框錨點（讓徽章有東西可以掛角）。
const ANCHOR =
  '<span style="display:inline-flex;width:40px;height:40px;border-radius:8px;background:#e5e7eb"></span>'

const meta = {
  title: 'Atoms/BaseBadge',
  component: BaseBadge,
  tags: ['autodocs'],
  argTypes: {
    content: { control: { type: 'text' }, description: '徽章內容（數字會套 max，文字原樣顯示）' },
    overlap: {
      control: { type: 'select' },
      options: ['circular', 'rectangular'],
      description: '錨點外形 → 角落內縮量。預設 circular',
    },
    max: { control: { type: 'number' }, description: '數字上限，超過顯示 `${max}+`。預設 99' },
    placement: {
      control: { type: 'select' },
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      description: '定位角落。預設 top-right',
    },
    size: {
      control: { type: 'select' },
      options: ['dot', 'medium', 'large'],
      description: 'dot 為純紅點（不顯示內容）。預設 medium',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'success', 'warning', 'danger', 'info'],
      description: '語意色（作為 --badge-bg 預設）。預設 danger',
    },
    showZero: { control: { type: 'boolean' }, description: 'content 為 0 時是否仍顯示。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    content: 5,
    overlap: 'circular',
    max: 99,
    placement: 'top-right',
    size: 'medium',
    color: 'danger',
    showZero: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseBadge },
    setup() {
      return { args }
    },
    template: `
      <div style="padding:32px;font-family:system-ui">
        <BaseBadge v-bind="args">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Numbers —— 數字計數
// ─────────────────────────────────────────────────────────────────────────────

export const Numbers: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseBadge :content="1">${ANCHOR}</BaseBadge>
        <BaseBadge :content="8">${ANCHOR}</BaseBadge>
        <BaseBadge :content="42">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Max —— 超過上限收斂成 99+
// ─────────────────────────────────────────────────────────────────────────────

export const Max: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseBadge :content="99" :max="99">${ANCHOR}</BaseBadge>
        <BaseBadge :content="120" :max="99">${ANCHOR}</BaseBadge>
        <BaseBadge :content="1200" :max="999">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),
  parameters: {
    docs: { description: { story: '數字 `> max` 時顯示 `${max}+`（如 `99+`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Dot —— 純紅點（存在感提示）
// ─────────────────────────────────────────────────────────────────────────────

export const Dot: Story = {
  args: {
    content: "55"
  },

  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseBadge size="dot" color="danger">${ANCHOR}</BaseBadge>
        <BaseBadge size="dot" color="success">${ANCHOR}</BaseBadge>
        <BaseBadge size="dot" color="primary">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),

  parameters: {
    docs: { description: { story: 'dot 尺寸只顯示紅點、不渲染內容，常用於「有新內容」提示。' } },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Placements —— 四個角落
// ─────────────────────────────────────────────────────────────────────────────

export const Placements: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:36px;padding:36px;font-family:system-ui">
        <BaseBadge :content="3" placement="top-right">${ANCHOR}</BaseBadge>
        <BaseBadge :content="3" placement="top-left">${ANCHOR}</BaseBadge>
        <BaseBadge :content="3" placement="bottom-right">${ANCHOR}</BaseBadge>
        <BaseBadge :content="3" placement="bottom-left">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 語意色
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseBadge :content="5" color="primary">${ANCHOR}</BaseBadge>
        <BaseBadge :content="5" color="success">${ANCHOR}</BaseBadge>
        <BaseBadge :content="5" color="warning">${ANCHOR}</BaseBadge>
        <BaseBadge :content="5" color="danger">${ANCHOR}</BaseBadge>
        <BaseBadge :content="5" color="info">${ANCHOR}</BaseBadge>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Overlap —— 圓形 vs 方形錨點的角落內縮
// ─────────────────────────────────────────────────────────────────────────────

export const Overlap: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:36px;padding:36px;font-family:system-ui">
        <BaseBadge :content="3" overlap="rectangular">
          <span style="display:inline-flex;width:40px;height:40px;border-radius:8px;background:#e5e7eb"></span>
        </BaseBadge>
        <BaseBadge :content="3" overlap="circular">
          <span style="display:inline-flex;width:40px;height:40px;border-radius:9999px;background:#e5e7eb"></span>
        </BaseBadge>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '`rectangular` 貼齊方形錨點角落；`circular` 往內縮，貼合圓形錨點（頭像）的切線。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --badge-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseBadge },
    template: `
      <div style="display:flex;align-items:center;gap:28px;padding:32px;font-family:system-ui">
        <BaseBadge :content="9" class="t-a">${ANCHOR}</BaseBadge>
        <BaseBadge content="NEW" class="t-b">${ANCHOR}</BaseBadge>
        <style>
          .t-a { --badge-bg:#8b5cf6; --badge-color:#fff; }
          .t-b { --badge-bg:#111827; --badge-color:#f9fafb; }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--badge-bg` / `--badge-color` 完全自訂顏色，蓋過語意色 preset。' },
    },
  },
}
