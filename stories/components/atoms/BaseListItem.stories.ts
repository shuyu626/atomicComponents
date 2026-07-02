import type { StoryObj } from '@storybook/vue3-vite'
import BaseList from '~/components/atoms/BaseList.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseListItem 是 BaseList 的子元件：根一律 <li>，內容區為 flex row（prepend + body
// + append）。有 to / href 時整列用 <BaseLink> 包起變成可點列；active / disabled 控制
// 狀態。size / divided 由父層 BaseList 注入，也可 standalone（降級 md / 不分隔）。
//
// ⚠️ Story 內請用 string `to`（走 NuxtLink stub），避免無 router context 的 route object 解析。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:360px;background:#f3f4f6">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">${inner}</div>
  </div>`

const meta = {
  title: 'Atoms/BaseListItem',
  component: BaseListItem,
  tags: ['autodocs'],
  argTypes: {
    to: { control: { type: 'text' }, description: '內部 router 目標（設定後整列可點）' },
    href: { control: { type: 'text' }, description: '外部連結 URL（設定後整列可點）' },
    active: { control: { type: 'boolean' }, description: '高亮目前項目（連結項加 aria-current）。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '禁用（連結項不可點）。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— 單一 item（放進 BaseList 以顯示正確 size / 語意）
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    to: '/inbox',
    active: false,
    disabled: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseList, BaseListItem },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseList>
        <BaseListItem v-bind="args">
          <template #prepend><span aria-hidden="true">📥</span></template>
          收件匣
          <template #append><span style="color:#6b7280;font-size:12px">12</span></template>
        </BaseListItem>
      </BaseList>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Slots —— prepend / default / append
// ─────────────────────────────────────────────────────────────────────────────

export const Slots: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem>只有內文</BaseListItem>
        <BaseListItem>
          <template #prepend><span aria-hidden="true">👤</span></template>
          有前置 icon
        </BaseListItem>
        <BaseListItem>
          有後置操作
          <template #append><button>編輯</button></template>
        </BaseListItem>
        <BaseListItem>
          <template #prepend><span aria-hidden="true">🔔</span></template>
          前後皆有
          <template #append><span style="color:#6b7280;font-size:12px">99+</span></template>
        </BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#prepend` / `#default` / `#append` 三段式版面，各自可選。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— active / disabled
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem to="/a">一般項目</BaseListItem>
        <BaseListItem to="/b" active>高亮項目（active）</BaseListItem>
        <BaseListItem to="/c" disabled>禁用項目（disabled）</BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`active` 高亮並加 `aria-current="true"`；`disabled` 移出 tab 順序、pointer-events:none。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone —— 無 BaseList context（降級 md / 不分隔）
// ─────────────────────────────────────────────────────────────────────────────

export const Standalone: Story = {
  render: () => ({
    components: { BaseListItem },
    template: WRAP(`
      <ul style="margin:0;padding:0;list-style:none">
        <BaseListItem to="/x">
          <template #prepend><span aria-hidden="true">⚙️</span></template>
          單獨使用（無 BaseList）→ 尺寸降級為 md
        </BaseListItem>
      </ul>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '未包在 BaseList 內時 BaseListItem 仍可用，size 降級為 md、divided 為 false。',
      },
    },
  },
}
