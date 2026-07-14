import type { StoryObj } from '@storybook/vue3-vite'
import BaseEmptyState from '~/components/atoms/BaseEmptyState.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseTable from '~/components/atoms/BaseTable.vue'
import type { TableColumn } from '~/components/atoms/BaseTable.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseEmptyState 是「區塊內無資料狀態」：置中呈現 inbox 圖示 + 標題 + 說明 + 動作，
// 是 BaseResult 的「無狀態色」表親——版面相同但統一走中性灰階，不帶 success/error
// 等狀態語意色。用於列表 / 表格 / 搜尋結果為空的情境。

const WRAP = (inner: string) =>
  `<div style="display:flex;flex-direction:column;gap:24px;padding:32px;max-width:36rem;font-family:system-ui">${inner}</div>`

const meta = {
  title: 'Atoms/BaseEmptyState',
  component: BaseEmptyState,
  tags: ['autodocs'],
  argTypes: {
    title: { control: { type: 'text' }, description: '標題文字。預設「目前沒有資料」' },
    description: { control: { type: 'text' }, description: '補充說明；亦可用 #description slot 覆寫' },
    icon: { control: { type: 'boolean' }, description: '是否顯示內建 inbox 圖示。預設 true' },
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'],
      description: '尺寸：控制圖示大小與容器留白。預設 md',
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
    title: '目前沒有資料',
    description: '',
    icon: true,
    size: 'md',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseEmptyState },
    setup() {
      return { args }
    },
    template: WRAP('<BaseEmptyState v-bind="args" />'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— sm / md / lg
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseEmptyState },
    template: WRAP(`
      <BaseEmptyState size="sm" title="尚無留言" />
      <BaseEmptyState size="md" title="目前沒有資料" />
      <BaseEmptyState size="lg" title="購物車是空的" />
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`size` 切換 `--empty-icon-size` / `--empty-padding`（sm 40px/24px、md 56px/40px、lg 72px/56px），不影響顏色。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With actions —── #actions 放操作按鈕
// ─────────────────────────────────────────────────────────────────────────────

export const WithActions: Story = {
  render: () => ({
    components: { BaseEmptyState, BaseButton },
    template: WRAP(`
      <BaseEmptyState title="連線逾時" description="無法取得最新資料，請重新整理。">
        <template #actions>
          <BaseButton variant="outline" color="neutral" size="sm">重新整理</BaseButton>
        </template>
      </BaseEmptyState>
      <BaseEmptyState title="尚未新增任何項目">
        <template #actions>
          <BaseButton color="primary" size="sm">新增資料</BaseButton>
        </template>
      </BaseEmptyState>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#actions` slot 放於說明之後，用於重新整理 / 新增資料等操作按鈕。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom icon —── #icon slot 覆寫內建 inbox
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => ({
    components: { BaseEmptyState },
    template: WRAP(`
      <BaseEmptyState title="搜尋不到相關結果" description="試試其他關鍵字。">
        <template #icon>
          <svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M20 20l-4.8-4.8" />
          </svg>
        </template>
      </BaseEmptyState>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#icon` slot 覆寫內建 inbox 圖示，可放任意自訂插圖 / 品牌 SVG。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With table —── 搭配 BaseTable 的 #empty slot
// ─────────────────────────────────────────────────────────────────────────────

interface User {
  id: number
  name: string
  email: string
}

const COLUMNS: TableColumn<User>[] = [
  { key: 'name', label: '姓名' },
  { key: 'email', label: 'Email' },
]

export const WithTable: Story = {
  render: () => ({
    components: { BaseEmptyState, BaseButton, BaseTable },
    setup() {
      return { columns: COLUMNS, items: [] as User[] }
    },
    template: `
      <div style="padding:32px;font-family:system-ui;max-width:720px">
        <BaseTable :columns="columns" :items="items">
          <template #empty>
            <BaseEmptyState
              size="sm"
              title="尚無使用者資料"
              description="目前沒有符合條件的紀錄。"
            >
              <template #actions>
                <BaseButton size="sm" variant="outline" color="neutral">清除篩選</BaseButton>
              </template>
            </BaseEmptyState>
          </template>
        </BaseTable>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: 'BaseTable 的 `items` 為空時渲染 `#empty` slot，塞入 BaseEmptyState 即可取代原本的純文字空狀態。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —── 覆寫 --empty-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseEmptyState },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseEmptyState class="t-brand" title="尚無收藏項目" description="收藏喜歡的商品，方便下次查看。" />
        <style>
          .t-brand {
            --empty-icon-color: #a78bfa;
            --empty-title-color: #4c1d95;
            --empty-description-color: #7c3aed;
          }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--empty-icon-color` / `--empty-title-color` 等 token 即可主題化。' },
    },
  },
}
