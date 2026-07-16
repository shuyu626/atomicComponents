import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseDropdown from '~/components/atoms/BaseDropdown.vue'
import type { BaseDropdownItem } from '~/components/atoms/BaseDropdown.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseDropdown 是資料驅動的 menu 元件：傳入 items + 一個 #reference 觸發錨點，
// 彈出 role="menu" 的選項清單，內建 WAI-ARIA 鍵盤導覽（↑↓ / Home / End / Enter /
// Space / Esc / Tab）。定位、開關、focus-trap、Esc、click-outside 全委派 BasePopover。

const REF_BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseDropdown',
  component: BaseDropdown,
  tags: ['autodocs'],
  argTypes: {
    items: { control: false, description: '選單項清單（label / value / onClick / closeOnClick / disabled / context）' },
    trigger: {
      control: { type: 'select' },
      options: ['click', 'hover', 'focus', 'touch'],
      description: '觸發方式（透傳 BasePopover，可單選或陣列複選）。預設 click',
    },
    placement: {
      control: { type: 'select' },
      options: [
        'top', 'top-start', 'top-end',
        'right', 'right-start', 'right-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end',
      ],
      description: '首選位置；空間不足時 flip / shift 自動調整。預設 bottom-start',
    },
    offset: {
      control: { type: 'number' },
      description: '選單與 reference 的間距（px）',
    },
    disabled: {
      control: { type: 'boolean' },
      description: '整體禁用：不可觸發、所有項目視為 disabled',
    },
    autoFit: {
      control: { type: 'boolean' },
      description: '垂直放置時讓選單寬度貼齊 reference（select 風格）',
    },
    modelValue: { control: false, description: '開關狀態（v-model，可不綁）' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板可互動 trigger / placement / offset…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    trigger: 'click',
    placement: 'bottom-start',
    offset: 8,
    disabled: false,
    autoFit: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseDropdown },
    setup() {
      const last = ref('')
      const items: BaseDropdownItem<string>[] = [
        { label: '編輯', value: 'edit', onClick: (v) => (last.value = v) },
        { label: '複製', value: 'copy', onClick: (v) => (last.value = v) },
        { label: '封存', value: 'archive', onClick: (v) => (last.value = v) },
        { label: '刪除', value: 'delete', disabled: true },
      ]
      return { args, items, last, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <BaseDropdown v-bind="args" :items="items">
          <template #reference>
            <button :style="REF_BTN">動作選單 ▾</button>
          </template>
        </BaseDropdown>
        <p style="color:#6b7280;font-size:0.875rem">最後選擇：{{ last || '（尚未選擇）' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// BasicMenu —— 最常見用法：點擊開啟、選取後自動關閉
// ─────────────────────────────────────────────────────────────────────────────

export const BasicMenu: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const last = ref('')
      const items: BaseDropdownItem<string>[] = [
        { label: '編輯', value: 'edit', onClick: (v) => (last.value = v) },
        { label: '複製', value: 'copy', onClick: (v) => (last.value = v) },
        { label: '刪除', value: 'delete', onClick: (v) => (last.value = v) },
      ]
      return { items, last, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <BaseDropdown :items="items">
          <template #reference>
            <button :style="REF_BTN">操作 ▾</button>
          </template>
        </BaseDropdown>
        <p style="color:#6b7280;font-size:0.875rem">最後選擇：{{ last || '（尚未選擇）' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomItem —— 用 #menuitem slot 自訂單項（icon + 危險動作配色）
// ─────────────────────────────────────────────────────────────────────────────

interface ActionContext {
  icon: string
  danger?: boolean
}

export const CustomItem: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const items: BaseDropdownItem<string, ActionContext>[] = [
        { label: '重新命名', value: 'rename', context: { icon: '✏️' } },
        { label: '分享', value: 'share', context: { icon: '🔗' } },
        { label: '刪除', value: 'delete', context: { icon: '🗑️', danger: true } },
      ]
      return { items }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BaseDropdown :items="items">
          <template #reference>
            <button :style="REF_BTN">更多 ⋯</button>
          </template>
          <template #menuitem="{ label, context }">
            <span
              style="display:flex;align-items:center;gap:8px"
              :style="{ color: context?.danger ? '#dc2626' : '#1f2937' }"
            >
              <span>{{ context?.icon }}</span>{{ label }}
            </span>
          </template>
        </BaseDropdown>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// DisabledItems —— 含禁用項：鍵盤 ↑↓ 自動跳過
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledItems: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const items: BaseDropdownItem<string>[] = [
        { label: '可用一', value: 'a' },
        { label: '禁用（跳過）', value: 'b', disabled: true },
        { label: '可用二', value: 'c' },
        { label: '禁用（跳過）', value: 'd', disabled: true },
        { label: '可用三', value: 'e' },
      ]
      return { items, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:8px">
        <BaseDropdown :items="items">
          <template #reference>
            <button :style="REF_BTN">含禁用項 ▾</button>
          </template>
        </BaseDropdown>
        <p style="color:#6b7280;font-size:0.8125rem">開啟後用 ↑ ↓ 導覽，禁用項會被略過</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// AsyncAction —— closeOnClick: false：await 完成後才呼叫收到的 close() 手動關閉
// ─────────────────────────────────────────────────────────────────────────────

export const AsyncAction: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const status = ref('待命')
      const items: BaseDropdownItem<string>[] = [
        {
          label: '存檔並關閉',
          value: 'save',
          // closeOnClick: false → 元件不自動關閉，等模擬請求完成再呼叫收到的 close()
          closeOnClick: false,
          onClick: async (_value, close) => {
            status.value = '儲存中…'
            await new Promise((r) => setTimeout(r, 800))
            status.value = '已儲存'
            close()
          },
        },
      ]
      return { items, status, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <BaseDropdown :items="items">
          <template #reference>
            <button :style="REF_BTN">非同步動作 ▾</button>
          </template>
        </BaseDropdown>
        <p style="color:#6b7280;font-size:0.875rem">狀態：{{ status }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoFit —— 選單寬度貼齊 reference（select 風格）
// ─────────────────────────────────────────────────────────────────────────────

export const AutoFit: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const selected = ref('請選擇城市')
      const items: BaseDropdownItem<string>[] = [
        { label: '台北', value: '台北', onClick: (v) => (selected.value = v) },
        { label: '台中高鐵特區', value: '台中高鐵特區', onClick: (v) => (selected.value = v) },
        { label: '高雄', value: '高雄', onClick: (v) => (selected.value = v) },
      ]
      return { items, selected }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BaseDropdown :items="items" auto-fit>
          <template #reference>
            <button style="min-width:240px;display:flex;justify-content:space-between;padding:8px 12px;font:0.875rem system-ui;color:#1f2937;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">
              <span>{{ selected }}</span><span>▾</span>
            </button>
          </template>
        </BaseDropdown>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Controlled —— 外部 v-model 控制開關
// ─────────────────────────────────────────────────────────────────────────────

export const Controlled: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const openState = ref(false)
      const items: BaseDropdownItem<string>[] = [
        { label: '選項一', value: 'a' },
        { label: '選項二', value: 'b' },
      ]
      return { openState, items, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <button :style="REF_BTN" @click="openState = !openState">外部切換（目前：{{ openState ? '開' : '關' }}）</button>
        <BaseDropdown v-model="openState" :items="items">
          <template #reference>
            <button style="padding:8px 14px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">錨點（點此也可切換）</button>
          </template>
        </BaseDropdown>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled —— 禁用：不可觸發
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BaseDropdown },
    setup() {
      const items: BaseDropdownItem<string>[] = [{ label: '不會顯示', value: 'x' }]
      return { items, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BaseDropdown :items="items" disabled>
          <template #reference>
            <button :style="REF_BTN" style="opacity:0.5;cursor:not-allowed">已禁用（點擊無反應）</button>
          </template>
        </BaseDropdown>
      </div>
    `,
  }),
}
