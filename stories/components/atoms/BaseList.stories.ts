import type { StoryObj } from '@storybook/vue3-vite'
import BaseList from '~/components/atoms/BaseList.vue'
import BaseListItem from '~/components/atoms/BaseListItem.vue'
import BaseListGroup from '~/components/atoms/BaseListGroup.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseList 是語意列表容器（ul / ol），重置原生 list 樣式後由 BaseListItem 排版。
// size / divided 透過 provide 傳給每個 item。搭配 BaseListItem 的 prepend / append
// slot 與 to / href 可組出選單、設定列、導覽清單等。外觀走 --list-* / --list-item-* token。

const WRAP = (inner: string) =>
  `<div style="padding:32px;font-family:system-ui;max-width:360px;background:#f3f4f6">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">${inner}</div>
  </div>`

const meta = {
  title: 'Atoms/BaseList',
  component: BaseList,
  tags: ['autodocs'],
  argTypes: {
    as: {
      control: { type: 'inline-radio' },
      options: ['ul', 'ol'],
      description: '根元素語意標籤。預設 ul',
    },
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'],
      description: '項目內距 / 字級（透過 context 傳給 item）。預設 md',
    },
    divided: {
      control: { type: 'boolean' },
      description: '項目間分隔線（僅 square 有效）。預設 false',
    },
    itemShape: {
      control: { type: 'inline-radio' },
      options: ['square', 'rounded', 'shaped'],
      description: '項目形狀：square（滿版）/ rounded（圓角藥丸）/ shaped（單邊藥丸）。預設 square',
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
    as: 'ul',
    size: 'md',
    divided: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseList, BaseListItem },
    setup() {
      return { args }
    },
    template: WRAP(`
      <BaseList v-bind="args">
        <BaseListItem>收件匣</BaseListItem>
        <BaseListItem>已寄出</BaseListItem>
        <BaseListItem>草稿</BaseListItem>
        <BaseListItem>垃圾桶</BaseListItem>
      </BaseList>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 純文字清單
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList>
        <BaseListItem>第一項</BaseListItem>
        <BaseListItem>第二項</BaseListItem>
        <BaseListItem>第三項</BaseListItem>
      </BaseList>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Divided —— 項目間分隔線
// ─────────────────────────────────────────────────────────────────────────────

export const Divided: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem>帳號設定</BaseListItem>
        <BaseListItem>通知</BaseListItem>
        <BaseListItem>隱私權</BaseListItem>
        <BaseListItem>安全性</BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: { description: { story: '`divided` 在相鄰項目之間畫分隔線（第一項前不畫）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— sm / md / lg
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: `
      <div style="display:flex;gap:16px;padding:32px;font-family:system-ui;background:#f3f4f6">
        <div v-for="s in ['sm','md','lg']" :key="s" style="flex:1;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <div style="padding:8px 12px;font-size:12px;color:#6b7280;border-bottom:1px solid #f0f0f0">size = {{ s }}</div>
          <BaseList :size="s" divided>
            <BaseListItem>項目一</BaseListItem>
            <BaseListItem>項目二</BaseListItem>
            <BaseListItem>項目三</BaseListItem>
          </BaseList>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: { description: { story: 'size 控制每個項目的內距與字級，透過 context 統一套用。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WithIconsAndActions —— prepend / append slot
// ─────────────────────────────────────────────────────────────────────────────

export const WithIconsAndActions: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem>
          <template #prepend><span aria-hidden="true">📥</span></template>
          收件匣
          <template #append><span style="color:#6b7280;font-size:12px">12</span></template>
        </BaseListItem>
        <BaseListItem active>
          <template #prepend><span aria-hidden="true">⭐</span></template>
          已加星號
          <template #append><span style="color:#6b7280;font-size:12px">3</span></template>
        </BaseListItem>
        <BaseListItem>
          <template #prepend><span aria-hidden="true">🗑️</span></template>
          垃圾桶
        </BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`#prepend` 放 icon、`#append` 放次要資訊 / 操作；`active` 高亮目前項目。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Links —— 整列可點（to / href）
// ─────────────────────────────────────────────────────────────────────────────

export const Links: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem to="/dashboard" active>
          <template #prepend><span aria-hidden="true">📊</span></template>
          儀表板
        </BaseListItem>
        <BaseListItem to="/reports">
          <template #prepend><span aria-hidden="true">📄</span></template>
          報表
        </BaseListItem>
        <BaseListItem href="https://example.com" >
          <template #prepend><span aria-hidden="true">🔗</span></template>
          外部連結
          <template #append><span aria-hidden="true">↗</span></template>
        </BaseListItem>
        <BaseListItem to="/archived" disabled>
          <template #prepend><span aria-hidden="true">📦</span></template>
          封存（停用）
        </BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '有 `to`（內部）/ `href`（外部）時整列用 `<BaseLink>` 包起，可點 + 鍵盤可達；`active` 加 `aria-current`、`disabled` 移出 tab 順序。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Ordered —— 有序列表
// ─────────────────────────────────────────────────────────────────────────────

export const Ordered: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList as="ol" divided>
        <BaseListItem>建立帳號</BaseListItem>
        <BaseListItem>驗證電子郵件</BaseListItem>
        <BaseListItem>完成個人資料</BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: { description: { story: '`as="ol"` 渲染有序列表；原生 marker 已重置，語意仍為 `<ol>`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList class="t-brand" divided>
        <BaseListItem to="/a" active>主題化項目（active）</BaseListItem>
        <BaseListItem to="/b">主題化項目</BaseListItem>
        <BaseListItem to="/c">主題化項目</BaseListItem>
        <style>
          .t-brand {
            --list-divider-color: #ddd6fe;
            --list-item-hover-bg: #f5f3ff;
            --list-item-active-bg: #ede9fe;
            --list-item-active-color: #6d28d9;
          }
        </style>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '覆寫 `--list-*` / `--list-item-*` token 即可主題化（分隔線 / hover / active 色）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Nav (rounded) —— 導覽抽屜風格：圓角藥丸 + active 高亮
// ─────────────────────────────────────────────────────────────────────────────

export const Nav: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList item-shape="rounded">
        <BaseListItem to="/" active>🏠 首頁</BaseListItem>
        <BaseListItem to="/inbox">📥 收件匣</BaseListItem>
        <BaseListItem to="/settings">⚙️ 設定</BaseListItem>
        <BaseListItem disabled to="/admin">🔒 管理（停用）</BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`item-shape="rounded"`：項目變圓角藥丸、加間距、active 為圓角高亮——導覽抽屜常見樣式。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Shaped —— 單邊全圓藥丸（trailing 端全圓）
// ─────────────────────────────────────────────────────────────────────────────

export const Shaped: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList item-shape="shaped">
        <BaseListItem to="/" active>🏠 首頁</BaseListItem>
        <BaseListItem to="/inbox">📥 收件匣</BaseListItem>
        <BaseListItem to="/settings">⚙️ 設定</BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '`item-shape="shaped"`：高亮為單邊全圓藥丸（leading 端平齊、trailing 端全圓）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TwoLine —— 標題 + 副標（#subtitle）
// ─────────────────────────────────────────────────────────────────────────────

export const TwoLine: Story = {
  render: () => ({
    components: { BaseList, BaseListItem },
    template: WRAP(`
      <BaseList divided>
        <BaseListItem>
          Alice Chen
          <template #subtitle>alice@example.com</template>
          <template #append><span style="color:#9ca3af">3 分鐘前</span></template>
        </BaseListItem>
        <BaseListItem>
          Bob Wang
          <template #subtitle>bob@example.com</template>
          <template #append><span style="color:#9ca3af">1 小時前</span></template>
        </BaseListItem>
      </BaseList>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story: '提供 `#subtitle` slot 時項目變兩行（標題 + 次要說明），常用於通訊錄 / 通知清單。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NavWithGroups —— 可折疊子群組（BaseListGroup），對應後台側欄設計
// ─────────────────────────────────────────────────────────────────────────────

export const NavWithGroups: Story = {
  render: () => ({
    components: { BaseList, BaseListItem, BaseListGroup },
    template: WRAP(`
      <BaseList item-shape="rounded" size="lg">
        <BaseListItem to="/dashboard">
          <template #prepend><span aria-hidden="true">📊</span></template>
          總覽
        </BaseListItem>

        <BaseListGroup title="後台主檔資料管理" :open="true">
          <template #prepend><span aria-hidden="true">🗄️</span></template>
          <BaseListItem to="/users">
            <template #prepend><span aria-hidden="true">👥</span></template>
            使用者列表管理
          </BaseListItem>
          <BaseListItem to="/staff">
            <template #prepend><span aria-hidden="true">🎓</span></template>
            人員管理
          </BaseListItem>
          <BaseListItem to="/assign" active>
            <template #prepend><span aria-hidden="true">🧑‍💼</span></template>
            助理指派管理
          </BaseListItem>
          <BaseListItem to="/customers">
            <template #prepend><span aria-hidden="true">📄</span></template>
            客戶主檔管理
          </BaseListItem>
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
        story:
          '`BaseListGroup` 為可折疊子群組：`#prepend` 放群組圖示、`title` 為群組名、右側自動渲染收合箭頭（展開時朝上），子項目為縮排的 `BaseListItem`。用 `:open` / `v-model:open` 控制展開。搭配 `item-shape="rounded"` 即為導覽抽屜樣式。',
      },
    },
  },
}
