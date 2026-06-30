import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseModal from '~/components/atoms/BaseModal.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseModal 是「置中對話框」元件：v-model 控制開關，Teleport 到 <body> 脫離裁切，
// 半透明遮罩 + focus-trap 鎖焦，並用 usePopupsManager 管理多層堆疊與背景捲動鎖定。
// 內建結構化外殼（標題 / 關閉鈕 / 主體 / 底部動作），內容仍可用 slot 完全自訂。

const BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'
const BTN_GHOST
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#374151;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseModal',
  component: BaseModal,
  tags: ['autodocs'],
  argTypes: {
    title: {
      control: { type: 'text' },
      description: '標題列文字，設定後自動接 aria-labelledby',
    },
    ariaLabel: {
      control: { type: 'text' },
      description: '無 title 時用作 aria-label（對話框無障礙名稱）',
    },
    closeLabel: {
      control: { type: 'text' },
      description: '關閉鈕 aria-label（多語系可覆寫，預設「關閉」）',
    },
    beforeClose: { control: false, description: '關閉前攔截 (done) => void' },
    hideBackdrop: {
      control: { type: 'boolean' },
      description: '隱藏半透明遮罩（仍可點外部關閉）',
    },
    hideCloseButton: {
      control: { type: 'boolean' },
      description: '隱藏右上角關閉鈕',
    },
    closeOnBackdrop: {
      control: { type: 'boolean' },
      description: '點擊面板外部是否關閉',
    },
    closeOnEscape: {
      control: { type: 'boolean' },
      description: '按 Esc 是否關閉（僅最上層 modal 回應）',
    },
    lockScroll: {
      control: { type: 'boolean' },
      description: '開啟時是否鎖定背景捲動',
    },
    modelValue: { control: false, description: '開關狀態（v-model）' },
    onOpen: { action: 'open', description: '開始開啟（進場前）' },
    onOpened: { action: 'opened', description: '開啟完成（進場後）' },
    onClose: { action: 'close', description: '開始關閉（離場前）' },
    onClosed: { action: 'closed', description: '關閉完成（離場後）' },
  },
}

export default meta
type Story = StoryObj

// 長內容區塊，用來展示背景捲動鎖定 / 面板內捲動。
const FILLER = Array.from({ length: 12 }, (_, i) => `段落 ${i + 1}：捲動內容示意。`)

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板可互動 title / closeOnXxx…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    title: '編輯個人資料',
    hideBackdrop: false,
    hideCloseButton: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    lockScroll: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      return { args, open, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟對話框</button>
        <BaseModal v-model="open" v-bind="args">
          <p style="margin:0;color:#374151">這是對話框主體，可放任意 HTML / 元件 / 表單。</p>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">取消</button>
            <button :style="BTN" @click="close">儲存</button>
          </template>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 標題 + 主體 + 底部動作（最常見用法）
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      return { open, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟</button>
        <BaseModal v-model="open" title="訂閱電子報">
          <p style="margin:0 0 12px;color:#374151">輸入 Email 即可接收最新消息。</p>
          <input
            placeholder="you@example.com"
            style="width:100%;padding:8px 10px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px;box-sizing:border-box"
          />
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">取消</button>
            <button :style="BTN" @click="close">訂閱</button>
          </template>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Confirm —— 確認框：鎖外部 / Esc，隱藏關閉鈕，只能由按鈕決策
// ─────────────────────────────────────────────────────────────────────────────

export const Confirm: Story = {
  render: () => ({
    components: { BaseModal },
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
        <BaseModal
          v-model="open"
          title="確認刪除"
          hide-close-button
          :close-on-backdrop="false"
          :close-on-escape="false"
        >
          <p style="margin:0;color:#374151">刪除後無法復原，確定要刪除這筆資料嗎？</p>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="result = '已取消'; close()">取消</button>
            <button :style="BTN_DANGER" @click="result = '已刪除'; close()">確認刪除</button>
          </template>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// ScrollLock —— 長內容對話框：背景鎖捲動、面板內可捲動
// ─────────────────────────────────────────────────────────────────────────────

export const ScrollLock: Story = {
  render: () => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      return { open, filler: FILLER, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <p style="color:#6b7280;font-size:0.875rem;margin:0 0 12px">開啟後背景無法捲動；對話框主體過長則內部捲動。</p>
        <div style="height:60px"></div>
        <button :style="BTN" @click="open = true">開啟長內容</button>
        <BaseModal v-model="open" title="服務條款">
          <p v-for="line in filler" :key="line" style="margin:0 0 12px;color:#374151">{{ line }}</p>
          <template #footer="{ close }">
            <button :style="BTN" @click="close">我已詳閱</button>
          </template>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Stacked —— 多層堆疊：Esc / 點外部只關最上層
// ─────────────────────────────────────────────────────────────────────────────

export const Stacked: Story = {
  args: {
    closeOnBackdrop: true,
    closeOnEscape: true
  },

  render: () => ({
    components: { BaseModal },
    setup() {
      const first = ref(false)
      const second = ref(false)
      return { first, second, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="first = true">開啟第一層</button>
        <BaseModal v-model="first" title="第一層">
          <p style="margin:0 0 12px;color:#374151">這是第一層對話框。</p>
          <button :style="BTN" @click="second = true">在上面再開一層</button>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">關閉第一層</button>
          </template>
        </BaseModal>
        <BaseModal v-model="second" title="第二層（最上層）">
          <p style="margin:0;color:#374151">按 Esc 或點遮罩只會關掉這一層，第一層仍開著。</p>
          <template #footer="{ close }">
            <button :style="BTN" @click="close">關閉第二層</button>
          </template>
        </BaseModal>
      </div>
    `,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomHeader —— 用 #header 完全接管標題列
// ─────────────────────────────────────────────────────────────────────────────

export const CustomHeader: Story = {
  render: () => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      return { open, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟自訂外殼</button>
        <!-- 自訂 #header 不會自動連結 aria-labelledby，改用 ariaLabel 提供無障礙名稱 -->
        <BaseModal v-model="open" hide-close-button aria-label="自訂標題列">
          <template #header="{ close }">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <h2 style="margin:0;font:600 1.125rem system-ui;color:#1d4ed8">🎉 自訂標題列</h2>
              <button :style="BTN_GHOST" @click="close">✕</button>
            </div>
          </template>
          <p style="margin:0;color:#374151">標題列完全由 #header slot 接管。</p>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// NoBackdrop —— 隱藏遮罩（仍可點外部關閉）
// ─────────────────────────────────────────────────────────────────────────────

export const NoBackdrop: Story = {
  render: () => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      return { open, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟（無遮罩）</button>
        <BaseModal v-model="open" title="無遮罩對話框" hide-backdrop>
          <p style="margin:0;color:#374151">沒有半透明遮罩，但點擊面板外部仍會關閉。</p>
        </BaseModal>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// BeforeClose —— 關閉前攔截確認（對齊 BaseDrawer / Element Plus 風格）
// ─────────────────────────────────────────────────────────────────────────────

export const BeforeClose: Story = {
  render: () => ({
    components: { BaseModal },
    setup() {
      const open = ref(false)
      // 回傳一個 beforeClose：跳出原生 confirm，確認後才呼叫 done() 真正關閉。
      const beforeClose = (done: () => void) => {
        if (window.confirm('表單尚未儲存，確定要關閉嗎？')) done()
      }
      return { open, beforeClose, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟（關閉需確認）</button>
        <BaseModal v-model="open" title="編輯中" :before-close="beforeClose">
          <p style="margin:0;color:#374151">試著按 Esc、點遮罩或關閉鈕 —— 都會先跳確認框，按確定才關閉。</p>
        </BaseModal>
      </div>
    `,
  }),
}
