import type { StoryObj } from '@storybook/vue3-vite'
import BaseChip from '~/components/atoms/BaseChip.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseChip 是標籤 / 籌碼元件：緊湊呈現分類、狀態、篩選條件或可移除的 token。
// contained / outlined / text 三種 variant，語意色與任意自訂 CSS color 共用同一
// --chip-accent 顏色模型（底色 / 邊框由 color-mix 推導）。deletable 時尾端帶刪除鈕。

const WRAP = (inner: string) =>
  `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:32px;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseChip',
  component: BaseChip,
  tags: ['autodocs'],
  argTypes: {
    as: { control: { type: 'text' }, description: '根元素標籤或元件（多型）。預設 span' },
    variant: {
      control: { type: 'select' },
      options: ['filled', 'contained', 'outlined', 'text'],
      description: '外觀。預設 contained',
    },
    color: {
      control: { type: 'text' },
      description: '語意色（primary/success/warning/danger/info）或任意 CSS color。預設 primary',
    },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium'],
      description: '尺寸。預設 medium',
    },
    label: { control: { type: 'text' }, description: '標籤文字；有 default slot 時以 slot 為準' },
    deletable: { control: { type: 'boolean' }, description: '是否顯示刪除鈕。預設 false' },
    deleteAriaLabel: {
      control: { type: 'text' },
      description: '刪除鈕無障礙標籤。預設 Delete',
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
    variant: 'contained',
    color: 'primary',
    size: 'medium',
    label: 'Chip',
    deletable: false,
    deleteAriaLabel: 'Delete',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseChip },
    setup() {
      return { args }
    },
    template: WRAP('<BaseChip v-bind="args" />'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— contained / outlined / text
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseChip },
    template: WRAP(`
      <BaseChip variant="filled" color="primary">Filled</BaseChip>
      <BaseChip variant="contained" color="primary">Contained</BaseChip>
      <BaseChip variant="outlined" color="primary">Outlined</BaseChip>
      <BaseChip variant="text" color="primary">Text</BaseChip>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 語意色 × variant
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseChip },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;font-family:system-ui">
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <BaseChip variant="filled" color="primary">Primary</BaseChip>
          <BaseChip variant="filled" color="success">Success</BaseChip>
          <BaseChip variant="filled" color="warning">Warning</BaseChip>
          <BaseChip variant="filled" color="danger">Danger</BaseChip>
          <BaseChip variant="filled" color="info">Info</BaseChip>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <BaseChip color="primary">Primary</BaseChip>
          <BaseChip color="success">Success</BaseChip>
          <BaseChip color="warning">Warning</BaseChip>
          <BaseChip color="danger">Danger</BaseChip>
          <BaseChip color="info">Info</BaseChip>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px">
          <BaseChip variant="outlined" color="primary">Primary</BaseChip>
          <BaseChip variant="outlined" color="success">Success</BaseChip>
          <BaseChip variant="outlined" color="warning">Warning</BaseChip>
          <BaseChip variant="outlined" color="danger">Danger</BaseChip>
          <BaseChip variant="outlined" color="info">Info</BaseChip>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '上排 `filled` 飽和實心底（白字），下排 `outlined`。語意色 preset 皆採深色調，飽和底白字與淡底文字對比皆 ≥ WCAG AA。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— small / medium
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseChip },
    template: WRAP(`
      <BaseChip size="small" color="info">Small</BaseChip>
      <BaseChip size="medium" color="info">Medium</BaseChip>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom color —— 任意 CSS color
// ─────────────────────────────────────────────────────────────────────────────

export const CustomColor: Story = {
  render: () => ({
    components: { BaseChip },
    template: WRAP(`
      <BaseChip color="#8b5cf6">#8b5cf6</BaseChip>
      <BaseChip color="rebeccapurple" variant="outlined">rebeccapurple</BaseChip>
      <BaseChip color="rgb(13 148 136)" variant="text">rgb(13 148 136)</BaseChip>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '非語意色字串一律灌進 `--chip-accent`，底色 / 邊框由 `color-mix` 推導，支援 hex / rgb / hsl / 具名色。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Deletable —— 受控移除（tag input 場景）
// ─────────────────────────────────────────────────────────────────────────────

export const Deletable: Story = {
  render: () => ({
    components: { BaseChip },
    setup() {
      const tags = ['設計', '前端', 'Vue', 'a11y']
      const list = [...tags]
      const remove = (tag: string) => {
        const i = list.indexOf(tag)
        if (i > -1) list.splice(i, 1)
      }
      return { list, remove }
    },
    template: `
      <div style="display:flex;flex-wrap:wrap;gap:8px;padding:32px;font-family:system-ui">
        <BaseChip
          v-for="tag in list"
          :key="tag"
          :label="tag"
          color="primary"
          deletable
          :delete-aria-label="'移除「' + tag + '」標籤'"
          @delete="remove(tag)"
        />
        <span v-if="!list.length" style="color:#6b7280">（已全部移除）</span>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '`deletable` 點擊 emit `delete`，是否真的移除由父層決定（受控）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With slots —— prepend / append
// ─────────────────────────────────────────────────────────────────────────────

const DOT = (color: string) =>
  `<span style="display:inline-block;width:8px;height:8px;border-radius:9999px;background:${color}"></span>`

export const WithSlots: Story = {
  render: () => ({
    components: { BaseChip },
    template: WRAP(`
      <BaseChip color="success">
        <template #prepend>${DOT('#15803d')}</template>
        線上
      </BaseChip>
      <BaseChip color="info" variant="outlined">
        v1.2.0
        <template #append>↗</template>
      </BaseChip>
      <BaseChip color="primary" deletable delete-aria-label="移除 Alice">
        <template #prepend>${DOT('#1d4ed8')}</template>
        Alice
      </BaseChip>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#prepend` / `#append` 放小圖示、狀態點或頭像。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --chip-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseChip },
    template: `
      <div style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding:32px;font-family:system-ui">
        <BaseChip class="t-pill" color="primary">膠囊圓角</BaseChip>
        <BaseChip class="t-brand">品牌色</BaseChip>
        <style>
          .t-pill { --chip-radius: 9999px; }
          .t-brand { --chip-accent: #db2777; --chip-radius: 9999px; }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--chip-accent` / `--chip-radius` 等 token 即可主題化。' },
    },
  },
}
