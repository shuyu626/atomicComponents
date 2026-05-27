import { h } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseBreadcrumb from '~/components/atoms/BaseBreadcrumb.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// 注意：BaseBreadcrumb 內部透過 BaseLink 渲染連結，BaseLink 在 Storybook 預覽
// 環境會走 NuxtLink stub 分支（見 .storybook/preview.ts），最終渲染為最小 <a>。
// Stories 內請用 string `to`，避免在無 router context 觸發 route object 解析。

const HomeIcon = {
  name: 'HomeIcon',
  render: () =>
    h(
      'svg',
      { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'aria-hidden': 'true' },
      [h('path', { d: 'M3 11l9-8 9 8M5 10v10h14V10' })],
    ),
}

const ChevronRightIcon = {
  name: 'ChevronRightIcon',
  render: () =>
    h(
      'svg',
      { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'aria-hidden': 'true' },
      [h('path', { d: 'M9 6l6 6-6 6' })],
    ),
}

const meta = {
  title: 'Atoms/BaseBreadcrumb',
  component: BaseBreadcrumb,
  tags: ['autodocs'],
  argTypes: {
    items: {
      control: { type: 'object' },
      description: '麵包屑路徑陣列，最後一項通常不傳 `to`',
    },
    separator: {
      control: { type: 'text' },
      description: '分隔符（字串或 Component）',
    },
    ariaLabel: {
      control: { type: 'text' },
      description: 'nav 的 aria-label',
    },
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseBreadcrumb },
    setup() { return { args } },
    template: '<BaseBreadcrumb v-bind="args" />',
  }),
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    items: [
      { to: '/', label: '首頁' },
      { to: '/products', label: '產品' },
      { label: 'BaseBreadcrumb' },
    ],
    separator: '/',
    ariaLabel: 'Breadcrumb',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic — 預設分隔符 `/`
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: '首頁' },
        { to: '/blog', label: '部落格' },
        { to: '/blog/vue', label: 'Vue 主題' },
        { label: '麵包屑元件設計' },
      ]
      return { items }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom string separator
// ─────────────────────────────────────────────────────────────────────────────

export const StringSeparator: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: 'Home' },
        { to: '/library', label: 'Library' },
        { label: 'Data' },
      ]
      return { items }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" separator="/" />
        <BaseBreadcrumb :items="items" separator=">" />
        <BaseBreadcrumb :items="items" separator="·" />
        <BaseBreadcrumb :items="items" separator="→" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Component separator — 自訂 SVG icon
// ─────────────────────────────────────────────────────────────────────────────

export const ComponentSeparator: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: 'Home' },
        { to: '/docs', label: 'Docs' },
        { to: '/docs/components', label: 'Components' },
        { label: 'Breadcrumb' },
      ]
      return { items, separator: ChevronRightIcon }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" :separator="separator" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// With icons — 第一項用 home icon，其餘文字
// ─────────────────────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: '首頁', icon: HomeIcon },
        { to: '/products', label: '產品' },
        { label: '購物車' },
      ]
      return { items }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon only — 首頁只顯示 icon（label 進 sr-only）
// ─────────────────────────────────────────────────────────────────────────────

export const IconOnly: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: '首頁', icon: HomeIcon, iconOnly: true },
        { to: '/products', label: '產品' },
        { label: '商品詳情' },
      ]
      return { items, separator: ChevronRightIcon }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" :separator="separator" />
      </div>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot override — 完全自訂 item 內容
// ─────────────────────────────────────────────────────────────────────────────

export const SlotOverride: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: '首頁' },
        { to: '/orders', label: '訂單' },
        { label: '#A20260526001' },
      ]
      return { items }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items">
          <template #item="{ item, isCurrent }">
            <span :style="{ fontWeight: isCurrent ? 700 : 400, fontFamily: isCurrent ? 'monospace' : 'inherit' }">
              {{ item.label }}
            </span>
          </template>
          <template #separator>
            <span style="color:#d4d4d8">|</span>
          </template>
        </BaseBreadcrumb>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Single item — 邊界情況：只有當前頁
// ─────────────────────────────────────────────────────────────────────────────

export const SingleItem: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [{ label: '首頁' }]
      return { items }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BaseBreadcrumb :items="items" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Long path — 多層路徑驗證 wrap 行為
// ─────────────────────────────────────────────────────────────────────────────

export const LongPath: Story = {
  render: () => ({
    components: { BaseBreadcrumb },
    setup() {
      const items = [
        { to: '/', label: '首頁' },
        { to: '/category', label: '分類' },
        { to: '/category/electronics', label: '電子產品' },
        { to: '/category/electronics/laptops', label: '筆電' },
        { to: '/category/electronics/laptops/macbook', label: 'MacBook 系列' },
        { label: 'MacBook Pro 14" 2024 (M4 Pro)' },
      ]
      return { items }
    },
    template: `
      <div style="padding:16px;max-width:600px;font-family:system-ui;border:1px dashed #d4d4d8">
        <BaseBreadcrumb :items="items" />
      </div>
    `,
  }),
}
