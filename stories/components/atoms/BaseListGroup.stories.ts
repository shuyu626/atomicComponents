import type { StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BaseList from '~/components/atoms/BaseList.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'
import BaseListGroup from '~/components/atoms/BaseListGroup.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseListGroup 是 BaseList 的子元件：把一組 <BaseListItem> 收進「可展開 / 收合」的子區塊。
// 標題列為 <button>（帶 aria-expanded / aria-controls），右側自動渲染收合箭頭（展開時朝上），
// 子項目縮排顯示。`title` / `#title` 為群組名、`#prepend` 放群組圖示、default slot 放子項。
// 用 `:open` / `v-model:open` 控制展開；size 沿用父層 BaseList 的 context。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:360px;background:#f3f4f6">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">${inner}</div>
  </div>`

const meta = {
  title: 'Atoms/BaseListGroup',
  component: BaseListGroup,
  tags: ['autodocs'],
  argTypes: {
    title: { control: { type: 'text' }, description: '群組標題（也可用 #title slot 覆寫）' },
    open: { control: { type: 'boolean' }, description: '展開狀態（v-model:open）。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '禁用：不可展開 / 收合。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— 單一群組（放進 BaseList 以取得正確 size / context）
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    title: '後台主檔資料管理',
    open: true,
    disabled: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseList, BaseListItem, BaseListGroup },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseList item-shape="rounded">
        <BaseListGroup v-bind="args">
          <template #prepend><span aria-hidden="true">🗄️</span></template>
          <BaseListItem to="/users"><template #prepend><span aria-hidden="true">👥</span></template>使用者列表管理</BaseListItem>
          <BaseListItem to="/staff"><template #prepend><span aria-hidden="true">🎓</span></template>人員管理</BaseListItem>
          <BaseListItem to="/assign" active><template #prepend><span aria-hidden="true">🧑‍💼</span></template>助理指派管理</BaseListItem>
        </BaseListGroup>
      </BaseList>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsed vs Expanded —— 收合 / 展開
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseList, BaseListItem, BaseListGroup },
    template: WRAP(`
      <BaseList divided>
        <BaseListGroup title="收合中（預設）">
          <template #prepend><span aria-hidden="true">📁</span></template>
          <BaseListItem to="/a">子項 A</BaseListItem>
          <BaseListItem to="/b">子項 B</BaseListItem>
        </BaseListGroup>
        <BaseListGroup title="展開中" :open="true">
          <template #prepend><span aria-hidden="true">📂</span></template>
          <BaseListItem to="/c">子項 C</BaseListItem>
          <BaseListItem to="/d">子項 D</BaseListItem>
        </BaseListGroup>
        <BaseListGroup title="停用（不可展開）" disabled>
          <template #prepend><span aria-hidden="true">🔒</span></template>
          <BaseListItem to="/e">子項 E</BaseListItem>
        </BaseListGroup>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '預設收合；`:open="true"` 預先展開；`disabled` 讓標題列成為 disabled button、不可切換。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NavSidebar —— 多群組導覽側欄（對應後台設計稿）
// ─────────────────────────────────────────────────────────────────────────────

export const NavSidebar: Story = {
  render: () => ({
    components: { BaseList, BaseListItem, BaseListGroup },
    template: WRAP(`
      <BaseList item-shape="rounded" size="lg">
        <BaseListItem to="/dashboard"><template #prepend><span aria-hidden="true">📊</span></template>總覽</BaseListItem>

        <BaseListGroup title="後台主檔資料管理" :open="true">
          <template #prepend><span aria-hidden="true">🗄️</span></template>
          <BaseListItem to="/users"><template #prepend><span aria-hidden="true">👥</span></template>使用者列表管理</BaseListItem>
          <BaseListItem to="/staff"><template #prepend><span aria-hidden="true">🎓</span></template>人員管理</BaseListItem>
          <BaseListItem to="/assign" active><template #prepend><span aria-hidden="true">🧑‍💼</span></template>助理指派管理</BaseListItem>
          <BaseListItem to="/customers"><template #prepend><span aria-hidden="true">📄</span></template>客戶主檔管理</BaseListItem>
        </BaseListGroup>

        <BaseListGroup title="報表">
          <template #prepend><span aria-hidden="true">📈</span></template>
          <BaseListItem to="/reports/daily">日報表</BaseListItem>
          <BaseListItem to="/reports/monthly">月報表</BaseListItem>
        </BaseListGroup>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '多個群組組成的導覽側欄：搭配 `item-shape="rounded"`，群組可獨立展開 / 收合。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Controlled —— v-model:open 程式化控制（全部展開 / 收合）
// ─────────────────────────────────────────────────────────────────────────────

export const Controlled: Story = {
  render: () => ({
    components: { BaseList, BaseListItem, BaseListGroup },
    setup() {
      const openA = ref(true)
      const openB = ref(false)
      const expandAll = () => { openA.value = true; openB.value = true }
      const collapseAll = () => { openA.value = false; openB.value = false }
      return { openA, openB, expandAll, collapseAll }
    },
    template: `
      <div style="padding:32px;font-family:system-ui;max-width:360px">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <button @click="expandAll">全部展開</button>
          <button @click="collapseAll">全部收合</button>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <BaseList divided>
            <BaseListGroup v-model:open="openA" title="群組 A（open：{{ openA }}）">
              <BaseListItem to="/a1">A-1</BaseListItem>
              <BaseListItem to="/a2">A-2</BaseListItem>
            </BaseListGroup>
            <BaseListGroup v-model:open="openB" title="群組 B（open：{{ openB }}）">
              <BaseListItem to="/b1">B-1</BaseListItem>
              <BaseListItem to="/b2">B-2</BaseListItem>
            </BaseListGroup>
          </BaseList>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '用 `v-model:open` 綁定外部狀態，即可程式化控制（例如「全部展開 / 收合」或依路由自動展開目前群組）。',
      },
    },
  },
}
