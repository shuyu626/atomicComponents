import type { StoryObj } from '@storybook/vue3-vite'
import BaseCard from '~/components/atoms/BaseCard.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseCard 是內容容器卡片：media（滿版）/ header / body / footer 四個區段，皆由對應
// slot 控制是否渲染。外觀走表面樣式軸（elevated / outlined / filled），內距 padding
// 控制 header / body / footer（media 一律滿版）。外觀全走 --card-* token。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:360px;background:#f3f4f6">${inner}</div>`

// 用漸層方塊當示意媒體（避免外部圖片相依）。
const MEDIA =
  '<div style="height:120px;background:linear-gradient(135deg,#6366f1,#8b5cf6)"></div>'

const meta = {
  title: 'Atoms/BaseCard',
  component: BaseCard,
  tags: ['autodocs'],
  argTypes: {
    as: {
      control: { type: 'inline-radio' },
      options: ['div', 'section', 'article'],
      description: '根元素語意標籤。預設 div',
    },
    variant: {
      control: { type: 'inline-radio' },
      options: ['elevated', 'outlined', 'filled'],
      description: '外觀（表面樣式）。預設 elevated',
    },
    padding: {
      control: { type: 'inline-radio' },
      options: ['none', 'sm', 'md', 'lg'],
      description: 'header / body / footer 內距。預設 md',
    },
    hoverable: {
      control: { type: 'boolean' },
      description: '滑入時陰影抬升（純視覺）。預設 false',
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
    as: 'div',
    variant: 'elevated',
    padding: 'md',
    hoverable: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseCard },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseCard v-bind="args">
        <template #header><strong>卡片標題</strong></template>
        這是卡片的主要內容，可放任何元素。
        <template #footer><span style="color:#6b7280">頁尾資訊</span></template>
      </BaseCard>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— elevated / outlined / filled
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseCard variant="elevated">elevated（陰影浮起）</BaseCard>
        <BaseCard variant="outlined">outlined（描邊）</BaseCard>
        <BaseCard variant="filled">filled（淺色填底）</BaseCard>
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '卡片的外觀軸為「表面樣式」：陰影 / 邊框 / 填色。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Padding —— none / sm / md / lg
// ─────────────────────────────────────────────────────────────────────────────

export const Padding: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseCard variant="outlined" padding="none"><div style="background:#eef2ff">padding none</div></BaseCard>
        <BaseCard variant="outlined" padding="sm">padding sm</BaseCard>
        <BaseCard variant="outlined" padding="md">padding md（預設）</BaseCard>
        <BaseCard variant="outlined" padding="lg">padding lg</BaseCard>
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: 'padding 控制 header / body / footer 內距；media 不受影響。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Composed —— media + header + body + footer
// ─────────────────────────────────────────────────────────────────────────────

export const Composed: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <BaseCard variant="elevated">
        <template #media>${MEDIA}</template>
        <template #header>
          <h3 style="margin:0;font-size:1rem">產品名稱</h3>
        </template>
        <p style="margin:0;color:#4b5563">完整卡片：滿版媒體在最上方、頁首標題、主內容、頁尾操作。</p>
        <template #footer>
          <div style="display:flex;gap:8px;justify-content:flex-end">
            <button>取消</button>
            <button>確認</button>
          </div>
        </template>
      </BaseCard>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '四區段組合：`#media` 滿版貼邊，`#header` / `#footer` 自帶分隔線，標題階層由 caller 決定。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Hoverable —— 滑入抬升（純視覺）
// ─────────────────────────────────────────────────────────────────────────────

export const Hoverable: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <BaseCard hoverable>
        <template #media>${MEDIA}</template>
        <strong>可懸停卡片</strong>
        <p style="margin:4px 0 0;color:#6b7280">滑鼠移入時陰影抬升；要真正可點擊請在內容放連結 / 按鈕。</p>
      </BaseCard>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`hoverable` 僅提供視覺回饋，不賦予互動語意（無 cursor pointer / 鍵盤焦點）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Clickable —— 整張卡片可點（stretched link，鍵盤 / SR 正確）
// ─────────────────────────────────────────────────────────────────────────────

export const Clickable: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <BaseCard hoverable style="position:relative">
        <template #media>${MEDIA}</template>
        <h3 style="margin:0;font-size:1rem">
          <a href="#target" class="stretched">整張卡片可點的標題</a>
        </h3>
        <p style="margin:4px 0 0;color:#6b7280">連結的 ::after 覆蓋整張卡片，點任意處都進此連結，但只有一個可聚焦元素。</p>
        <style>
          .stretched { text-decoration:none; color:#3730a3 }
          .stretched::after { content:''; position:absolute; inset:0 }
        </style>
      </BaseCard>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '整張卡片導向同一連結的正確做法：在卡內放真正的連結並用 ::after 覆蓋整卡（stretched link）。鍵盤可達、SR 只看到一個連結。卡內不要再放其他連結 / 按鈕。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --card-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseCard },
    template: WRAP(`
      <BaseCard class="t-brand" variant="filled">
        <template #header><strong>品牌主題卡片</strong></template>
        覆寫 --card-* token 即可主題化。
        <style>
          .t-brand {
            --card-fill-bg: #eef2ff;
            --card-border-color: #c7d2fe;
            --card-radius: 1rem;
            --card-color: #3730a3;
          }
        </style>
      </BaseCard>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '覆寫 `--card-radius` / `--card-fill-bg` / `--card-border-color` / `--card-color` 等 token 主題化。',
      },
    },
  },
}
