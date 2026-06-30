import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseDialog from '~/components/atoms/BaseDialog.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseDialog 是「可拖曳 / 全螢幕對話框」元件：v-model 控制開關，Teleport 到 <body>，
// 與 BaseModal 共用 useOverlay（focus-trap 堆疊、Esc / 點外部關閉、scroll-lock、遮罩）。
// 額外提供 draggable（拖四邊移動，內容仍可選取）、fullscreen、transition 進出場變體與 width。

const BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'
const BTN_GHOST
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#374151;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseDialog',
  component: BaseDialog,
  tags: ['autodocs'],
  argTypes: {
    title: { control: { type: 'text' }, description: '標題列文字（接 aria-labelledby）' },
    ariaLabel: { control: { type: 'text' }, description: '無 title 時用作 aria-label' },
    closeLabel: { control: { type: 'text' }, description: '關閉鈕 aria-label（多語系可覆寫，預設「關閉」）' },
    width: { control: { type: 'text' }, description: '面板寬度（數字補 px，字串原樣）' },
    fullscreen: { control: { type: 'boolean' }, description: '全螢幕模式' },
    draggable: { control: { type: 'boolean' }, description: '可拖曳移動（拖四邊）' },
    transition: {
      control: { type: 'select' },
      options: ['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right'],
      description: '進出場動畫變體',
    },
    hideBackdrop: { control: { type: 'boolean' }, description: '隱藏遮罩' },
    hideCloseButton: { control: { type: 'boolean' }, description: '隱藏關閉鈕' },
    closeOnBackdrop: { control: { type: 'boolean' }, description: '點外部是否關閉' },
    closeOnEscape: { control: { type: 'boolean' }, description: '按 Esc 是否關閉' },
    lockScroll: { control: { type: 'boolean' }, description: '是否鎖定背景捲動' },
    modelValue: { control: false, description: '開關狀態（v-model）' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 可互動 draggable / fullscreen / transition / width…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    title: '編輯個人資料',
    width: 640,
    fullscreen: false,
    draggable: true,
    transition: 'fade',
    hideBackdrop: false,
    hideCloseButton: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    lockScroll: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseDialog },
    setup() {
      const open = ref(false)
      return { args, open, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟對話框</button>
        <BaseDialog v-model="open" v-bind="args">
          <p style="margin:0;color:#374151">這是對話框主體。draggable 開啟時，拖曳面板四邊可移動位置。</p>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">取消</button>
            <button :style="BTN" @click="close">儲存</button>
          </template>
        </BaseDialog>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Draggable —— 拖四邊移動對話框
// ─────────────────────────────────────────────────────────────────────────────

export const Draggable: Story = {
  render: () => ({
    components: { BaseDialog },
    setup() {
      const open = ref(false)
      const openNoTitle = ref(false)
      return { open, openNoTitle, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <p style="color:#6b7280;font-size:0.875rem;margin:0 0 12px;flex-basis:100%">有標題列時拖「標題列」移動（避開捲軸 / 按鈕）；無標題列時拖面板「四邊」移動。兩者皆不超出視窗。</p>
        <button :style="BTN" @click="open = true">有標題（拖標題列）</button>
        <button :style="BTN" @click="openNoTitle = true">無標題（拖四邊）</button>
        <BaseDialog v-model="open" title="可拖曳對話框" draggable>
          <p style="margin:0;color:#374151">按住上方標題列即可拖曳；中央文字仍可選取。</p>
        </BaseDialog>
        <BaseDialog v-model="openNoTitle" aria-label="可拖曳對話框" draggable>
          <p style="margin:0;color:#374151">沒有標題列，改用面板四邊（cursor 變 move）拖曳。</p>
        </BaseDialog>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Fullscreen —— 全螢幕（撐滿視窗、不可拖曳）
// ─────────────────────────────────────────────────────────────────────────────

export const Fullscreen: Story = {
  render: () => ({
    components: { BaseDialog },
    setup() {
      const open = ref(false)
      return { open, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟全螢幕</button>
        <BaseDialog v-model="open" title="全螢幕對話框" fullscreen>
          <p style="margin:0;color:#374151">面板撐滿視窗，右上角關閉鈕收起。適合圖片檢視 / 編輯器等沉浸式情境。</p>
        </BaseDialog>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Transitions —— 五種進出場變體
// ─────────────────────────────────────────────────────────────────────────────

export const Transitions: Story = {
  render: () => ({
    components: { BaseDialog },
    setup() {
      const current = ref<'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right' | null>(null)
      const variants = ['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right'] as const
      return { current, variants, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <button v-for="v in variants" :key="v" :style="BTN" @click="current = v">{{ v }}</button>
        <BaseDialog
          :model-value="current !== null"
          :transition="current ?? 'fade'"
          :title="current ?? ''"
          @update:model-value="(val) => { if (!val) current = null }"
        >
          <p style="margin:0;color:#374151">transition：<b>{{ current }}</b></p>
        </BaseDialog>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomWidth —— 自訂寬度
// ─────────────────────────────────────────────────────────────────────────────

export const CustomWidth: Story = {
  render: () => ({
    components: { BaseDialog },
    setup() {
      const open = ref(false)
      return { open, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟（寬 420px）</button>
        <BaseDialog v-model="open" title="窄版對話框" :width="420">
          <p style="margin:0;color:#374151">width 可傳數字（補 px）或字串（如 '60%'）。</p>
        </BaseDialog>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm —— 確認框：鎖外部 / Esc
// ─────────────────────────────────────────────────────────────────────────────

export const Confirm: Story = {
  render: () => ({
    components: { BaseDialog },
    setup() {
      const open = ref(false)
      const result = ref('')
      const BTN_DANGER
        = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#dc2626;border:none;border-radius:6px;cursor:pointer'
      return { open, result, BTN, BTN_GHOST, BTN_DANGER }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;flex-direction:column;gap:12px;align-items:flex-start">
        <button :style="BTN" @click="open = true">刪除資料</button>
        <p style="color:#6b7280;font-size:0.875rem">結果：{{ result || '（尚未決定）' }}</p>
        <BaseDialog
          v-model="open"
          title="確認刪除"
          hide-close-button
          :width="420"
          :close-on-backdrop="false"
          :close-on-escape="false"
        >
          <p style="margin:0;color:#374151">刪除後無法復原，確定要刪除這筆資料嗎？</p>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="result = '已取消'; close()">取消</button>
            <button :style="BTN_DANGER" @click="result = '已刪除'; close()">確認刪除</button>
          </template>
        </BaseDialog>
      </div>
    `,
  }),
}
