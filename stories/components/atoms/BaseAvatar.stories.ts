import type { StoryObj } from '@storybook/vue3-vite'
import BaseAvatar from '~/components/atoms/BaseAvatar.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseAvatar 是頭像元件：優先顯示 src 圖片，載入失敗時自動退回 #fallback /
// #default（縮寫 / icon），不給 src 則直接渲染縮寫。size / rounded / 顏色全走
// CSS token，可主題化。priority 一鍵將首屏關鍵頭像設為 eager + 高抓取優先序。

const SRC = 'https://i.pravatar.cc/120?img=12'

const meta = {
  title: 'Atoms/BaseAvatar',
  component: BaseAvatar,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 64],
      description: '具名（sm/md/lg）走 token；數字 / 數字字串走自訂像素。預設 md',
    },
    rounded: {
      control: { type: 'select' },
      options: ['full', 0, 8, 16],
      description: 'full 為圓形；其餘為像素圓角。預設 full',
    },
    src: { control: { type: 'text' }, description: '圖片來源；不給則只渲染縮寫 / slot' },
    alt: { control: { type: 'text' }, description: '替代文字。有 src 時必填（亦作 aria-label 與失敗 fallback）' },
    loading: {
      control: { type: 'select' },
      options: ['lazy', 'eager'],
      description: '圖片載入策略。預設 lazy',
    },
    priority: {
      control: { type: 'boolean' },
      description: '首屏關鍵頭像捷徑：eager + fetchpriority=high（覆寫 loading）。預設 false',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { src: SRC, alt: 'Alex Chen', size: 'md', rounded: 'full', priority: false },
  render: (args: Record<string, unknown>) => ({
    components: { BaseAvatar },
    setup() {
      return { args }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseAvatar v-bind="args" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— small / medium / large / 自訂像素
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseAvatar },
    setup() {
      return { src: SRC }
    },
    template: `
      <div style="display:flex;align-items:center;gap:16px;padding:24px;font-family:system-ui">
        <BaseAvatar :src="src" alt="Small" size="sm" />
        <BaseAvatar :src="src" alt="Medium" size="md" />
        <BaseAvatar :src="src" alt="Large" size="lg" />
        <BaseAvatar :src="src" alt="Custom 72" :size="72" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Rounded —— 圓形 vs 像素圓角
// ─────────────────────────────────────────────────────────────────────────────

export const Rounded: Story = {
  render: () => ({
    components: { BaseAvatar },
    setup() {
      return { src: SRC }
    },
    template: `
      <div style="display:flex;align-items:center;gap:16px;padding:24px;font-family:system-ui">
        <BaseAvatar :src="src" alt="Circle" size="lg" rounded="full" />
        <BaseAvatar :src="src" alt="Rounded 16" size="lg" :rounded="16" />
        <BaseAvatar :src="src" alt="Rounded 8" size="lg" :rounded="8" />
        <BaseAvatar :src="src" alt="Square" size="lg" :rounded="0" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Initials —— 無 src，純縮寫頭像
// ─────────────────────────────────────────────────────────────────────────────

export const Initials: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display:flex;align-items:center;gap:16px;padding:24px;font-family:system-ui">
        <BaseAvatar alt="Alex Chen" size="lg">AC</BaseAvatar>
        <BaseAvatar alt="Mira Yu" size="lg" class="brand">MY</BaseAvatar>
        <BaseAvatar alt="Ben Ko" size="lg" :rounded="12">BK</BaseAvatar>
        <style>.brand { --avatar-bg:#dbeafe; --avatar-color:#1e40af; }</style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '不給 `src` 時直接渲染 `#default`（縮寫）。顏色用 `--avatar-bg` / `--avatar-color` 客製。' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback —— 圖片載入失敗自動退回縮寫
// ─────────────────────────────────────────────────────────────────────────────

export const Fallback: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display:flex;align-items:center;gap:16px;padding:24px;font-family:system-ui">
        <BaseAvatar src="https://invalid.example/broken.jpg" alt="Alex Chen" size="lg">AC</BaseAvatar>
        <BaseAvatar src="https://invalid.example/broken.jpg" alt="Mira Yu" size="lg">
          <template #fallback>MY</template>
        </BaseAvatar>
        <BaseAvatar src="https://invalid.example/broken.jpg" alt="No Slot" size="lg" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '`src` 載入失敗（@error）時依序退回 `#fallback` → `#default` → `alt` 文字。' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --avatar-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseAvatar },
    template: `
      <div style="display:flex;align-items:center;gap:16px;padding:24px;font-family:system-ui">
        <BaseAvatar alt="Theme A" size="lg" class="t-a">TA</BaseAvatar>
        <BaseAvatar alt="Theme B" size="lg" class="t-b">TB</BaseAvatar>
        <style>
          .t-a { --avatar-bg:#fee2e2; --avatar-color:#b91c1c; --avatar-font-weight:800; }
          .t-b { --avatar-bg:#111827; --avatar-color:#f9fafb; }
        </style>
      </div>
    `,
  }),
}
