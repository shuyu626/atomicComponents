import type { StoryObj } from '@storybook/vue3-vite'
import BaseDivider from '~/components/atoms/BaseDivider.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseDivider 是分隔線元件：未給 slot 渲染純線 <hr>，給 default slot 則渲染帶文字的
// <div role="separator">（兩段線夾住中央內容）。支援 horizontal / vertical 方向、
// solid / dashed / dotted 線型（lineStyle），文字可 start / center / end 對齊。外觀全走 --divider-* token。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:480px">${inner}</div>`

const meta = {
  title: 'Atoms/BaseDivider',
  component: BaseDivider,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: { type: 'inline-radio' },
      options: ['horizontal', 'vertical'],
      description: '方向。預設 horizontal',
    },
    lineStyle: {
      control: { type: 'inline-radio' },
      options: ['solid', 'dashed', 'dotted'],
      description: '線型。預設 solid',
    },
    textAlign: {
      control: { type: 'inline-radio' },
      options: ['start', 'center', 'end'],
      description: '文字位置（僅帶文字時生效）。預設 center',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props（帶文字版本）
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    orientation: 'horizontal',
    lineStyle: 'solid',
    textAlign: 'center',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseDivider },
    setup() {
      return { args }
    },
    template: WRAP('<BaseDivider v-bind="args">或</BaseDivider>'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 純線
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseDivider },
    template: WRAP(`
      <p style="margin:0 0 12px">上方內容</p>
      <BaseDivider />
      <p style="margin:12px 0 0">下方內容</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '未給 slot 時渲染純線 `<hr>`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— solid / dashed / dotted
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseDivider },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseDivider line-style="solid" />
        <BaseDivider line-style="dashed" />
        <BaseDivider line-style="dotted" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`lineStyle` 對應 CSS `border-style`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With text —— 帶文字 + 文字對齊
// ─────────────────────────────────────────────────────────────────────────────

export const WithText: Story = {
  render: () => ({
    components: { BaseDivider },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseDivider text-align="start">靠左（start）</BaseDivider>
        <BaseDivider text-align="center">置中（center）</BaseDivider>
        <BaseDivider text-align="end">靠右（end）</BaseDivider>
      </div>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`textAlign` 調整兩側線段佔比：`start` 10% / 90%、`center` 50% / 50%、`end` 90% / 10%。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical —— 垂直分隔（需放在有高度的 flex 容器中）
// ─────────────────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => ({
    components: { BaseDivider },
    template: WRAP(`
      <nav style="display:flex;align-items:center;gap:12px;height:24px">
        <a href="#">首頁</a>
        <BaseDivider orientation="vertical" />
        <a href="#">關於</a>
        <BaseDivider orientation="vertical" />
        <a href="#">聯絡</a>
      </nav>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '垂直分隔放進 `display:flex; align-items:center` 的容器，`align-self: stretch` 會自動撐到與兄弟元素同高。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --divider-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseDivider },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseDivider class="t-brand" />
        <BaseDivider class="t-brand">品牌色分隔</BaseDivider>
        <style>
          .t-brand {
            --divider-color: #8b5cf6;
            --divider-thickness: 2px;
            --divider-text-color: #6d28d9;
          }
        </style>
      </div>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '覆寫 `--divider-color` / `--divider-thickness` / `--divider-text-color` 等 token 即可主題化。',
      },
    },
  },
}
