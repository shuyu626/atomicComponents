import { computed, ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseTable from '~/components/atoms/BaseTable.vue'
import type { TableColumn, TableSort } from '~/components/atoms/BaseTable.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTable 是資料表格元件：支援排序（v-model:sort）、選取（v-model:selected，
// Array / Set）、自訂渲染（render / 具名 slot）、空狀態、sticky header 與 caption。
// 外觀全走 --table-* token，可跨專案主題化。

interface User {
  id: number
  name: string
  email: string
  age: number
  status: 'active' | 'inactive'
}

const USERS: User[] = [
  { id: 1, name: 'Alice Chen', email: 'alice@example.com', age: 30, status: 'active' },
  { id: 2, name: 'Bob Lin', email: 'bob@example.com', age: 25, status: 'inactive' },
  { id: 3, name: 'Cara Wu', email: 'cara@example.com', age: 28, status: 'active' },
  { id: 4, name: 'David Ho', email: 'david@example.com', age: 35, status: 'active' },
]

const COLUMNS: TableColumn<User>[] = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'email', label: 'Email' },
  { key: 'age', label: '年齡', align: 'right', sortable: true, width: 80 },
  { key: 'status', label: '狀態', align: 'center' },
]

const WRAP = (inner: string) =>
  `<div style="padding:24px;font-family:system-ui;max-width:720px">${inner}</div>`

const meta = {
  title: 'Atoms/BaseTable',
  component: BaseTable,
  tags: ['autodocs'],
  argTypes: {
    captionSide: {
      control: { type: 'inline-radio' },
      options: ['top', 'bottom', 'hidden'],
      description: 'caption 位置。預設 top',
    },
    stickyHeader: { control: { type: 'boolean' }, description: '固定表頭。預設 false' },
    caption: { control: { type: 'text' }, description: '表格標題' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    caption: '使用者列表',
    captionSide: 'top',
    stickyHeader: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTable },
    setup() {
      return { args, columns: COLUMNS, items: USERS }
    },
    template: WRAP('<BaseTable v-bind="args" :columns="columns" :items="items" />'),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 純展示
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      return { columns: COLUMNS, items: USERS }
    },
    template: WRAP('<BaseTable :columns="columns" :items="items" />'),
  }),
  parameters: {
    docs: { description: { story: '最基本用法：傳入 `columns` 與 `items` 即可。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable —— v-model:sort
// ─────────────────────────────────────────────────────────────────────────────

export const Sortable: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const sort = ref<TableSort>({ column: 'age', direction: 'asc' })
      // 父層依 sort 狀態自行排序資料（元件只負責 UI 與狀態）。
      const items = computed(() => {
        const { column, direction } = sort.value
        if (!column || !direction) return USERS
        const key = column as keyof User
        return [...USERS].sort((a, b) => {
          const result = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
          return direction === 'asc' ? result : -result
        })
      })
      return { columns: COLUMNS, items, sort }
    },
    template: WRAP(`
      <BaseTable :columns="columns" :items="items" v-model:sort="sort" />
      <pre style="margin-top:12px;font-size:12px;color:#666">sort = {{ sort }}</pre>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '綁定 `v-model:sort` 後，`sortable` 欄位出現排序按鈕，方向循環 asc → desc → 無。排序資料由父層依 `sort` 自行運算（元件只負責 UI 與狀態）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Selectable —— v-model:selected（Array）
// ─────────────────────────────────────────────────────────────────────────────

export const Selectable: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const selected = ref<User[]>([])
      return { columns: COLUMNS, items: USERS, selected }
    },
    template: WRAP(`
      <BaseTable :columns="columns" :items="items" v-model:selected="selected" />
      <pre style="margin-top:12px;font-size:12px;color:#666">已選 {{ selected.length }} 筆：{{ selected.map(u => u.name) }}</pre>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '綁定 `v-model:selected`（`Array` 或 `Set`）後出現選取欄。表頭 checkbox 支援全選 / 取消全選，部分選取時為 indeterminate。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ClickableRows —— click:row + 鍵盤可達性
// ─────────────────────────────────────────────────────────────────────────────

export const ClickableRows: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const lastClicked = ref<string>('（尚未點擊）')
      const onRow = (user: User) => {
        lastClicked.value = `${user.name}（${user.email}）`
      }
      return { columns: COLUMNS, items: USERS, lastClicked, onRow }
    },
    template: WRAP(`
      <BaseTable :columns="columns" :items="items" @click:row="onRow" />
      <pre style="margin-top:12px;font-size:12px;color:#666">最後點擊：{{ lastClicked }}</pre>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '綁定 `@click:row` 後，每列會自動補上 `tabindex="0"`、`role="button"`，並可用 `Tab` 聚焦、`Enter` / `Space` 觸發（等同點擊）。未綁定 `@click:row` 時不會加上這些屬性，維持純展示。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Localized —— labels（i18n 文案覆寫）
// ─────────────────────────────────────────────────────────────────────────────

export const Localized: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const columns: TableColumn<User>[] = [
        { key: 'name', label: 'Name', sortable: true },
        { key: 'email', label: 'Email' },
        { key: 'age', label: 'Age', align: 'right' },
      ]
      const selected = ref<User[]>([])
      const sort = ref<TableSort>({})
      const labels = {
        selectAll: 'Select all rows',
        sortBy: (label: string) => `Sort by ${label}`,
        selectRow: (index: number) => `Select row ${index + 1}`,
        empty: 'No data available',
      }
      return { columns, items: USERS, selected, sort, labels }
    },
    template: WRAP(`
      <BaseTable
        :columns="columns"
        :items="items"
        :labels="labels"
        v-model:selected="selected"
        v-model:sort="sort"
      />
      <p style="margin-top:12px;font-size:12px;color:#666">
        所有 aria-label 與空狀態文字皆來自 <code>labels</code> prop（預設為繁體中文）。
      </p>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '透過 `labels` prop 覆寫無障礙文案與空狀態文字（`selectAll` / `sortBy` / `selectRow` / `empty`）。`sortBy` 可為函式（接收欄位標題）、`selectRow` 可為函式（接收 0-based 列索引）。未傳入時逐欄位 fallback 回預設繁體中文。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomCell —— render 與具名 slot
// ─────────────────────────────────────────────────────────────────────────────

export const CustomCell: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const columns: TableColumn<User>[] = [
        { key: 'name', label: '姓名', sortable: true },
        { key: 'age', label: '年齡', align: 'right', render: (v) => `${v} 歲` },
        { key: 'status', label: '狀態', align: 'center' },
      ]
      return { columns, items: USERS }
    },
    template: WRAP(`
      <BaseTable :columns="columns" :items="items">
        <template #column:status="{ value }">
          <span :style="{
            padding: '2px 10px',
            borderRadius: '999px',
            fontSize: '12px',
            color: value === 'active' ? '#15803d' : '#9ca3af',
            background: value === 'active' ? '#dcfce7' : '#f3f4f6',
          }">{{ value === 'active' ? '啟用' : '停用' }}</span>
        </template>
      </BaseTable>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`render` 適合簡單值轉換（如「30 歲」）；需要 HTML / 元件的複雜內容用 `#column:<key>` slot（此例為狀態徽章）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty —— 空狀態
// ─────────────────────────────────────────────────────────────────────────────

export const Empty: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      return { columns: COLUMNS, items: [] }
    },
    template: WRAP(`
      <BaseTable :columns="columns" :items="items">
        <template #empty>
          <div style="padding:24px;color:#9ca3af">🔍 查無符合條件的使用者</div>
        </template>
      </BaseTable>
    `),
  }),
  parameters: {
    docs: { description: { story: '`items` 為空時顯示 `#empty` slot（預設為「暫無資料」）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// StickyHeader —— 固定表頭
// ─────────────────────────────────────────────────────────────────────────────

export const StickyHeader: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      const items = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        age: 20 + (i % 40),
        status: i % 2 ? 'inactive' : 'active',
      }))
      return { columns: COLUMNS, items }
    },
    template: `
      <div style="padding:24px;font-family:system-ui;max-width:720px">
        <BaseTable
          style="max-height:280px;border:1px solid #eee;border-radius:8px"
          :columns="columns"
          :items="items"
          sticky-header
        />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`sticky-header` 讓表頭在捲動時固定於頂部。元件根節點本身即捲動容器（預設 `overflow:auto`），只需對 `<BaseTable>` 設 `max-height` 即可。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --table-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseTable },
    setup() {
      return { columns: COLUMNS, items: USERS }
    },
    template: `
      <div style="padding:24px;font-family:system-ui;max-width:720px">
        <BaseTable class="t-brand" :columns="columns" :items="items" />
        <style>
          .t-brand {
            --table-head-bg: #eef2ff;
            --table-head-color: #4338ca;
            --table-row-hover-bg: #f5f3ff;
            --table-border-color: #e0e7ff;
            --table-sort-active-color: #4f46e5;
          }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '覆寫 `--table-head-bg` / `--table-head-color` / `--table-row-hover-bg` / `--table-border-color` 等 token 即可主題化。',
      },
    },
  },
}
