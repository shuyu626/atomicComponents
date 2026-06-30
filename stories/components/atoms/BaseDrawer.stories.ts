import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseDrawer from '~/components/atoms/BaseDrawer.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseDrawer 是「側邊抽屜」元件：v-model 控制開關，Teleport 到 <body>，
// 與 BaseModal / BaseDialog 共用 useOverlay（focus-trap 堆疊、Esc / 點外部關閉、
// scroll-lock、遮罩）。由 anchor 決定停靠邊緣與滑入方向，size 控制寬 / 高。

const BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'
const BTN_GHOST
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#374151;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseDrawer',
  component: BaseDrawer,
  tags: ['autodocs'],
  argTypes: {
    title: { control: { type: 'text' }, description: '標題列文字（接 aria-labelledby）' },
    ariaLabel: { control: { type: 'text' }, description: '無 title 時用作 aria-label' },
    anchor: {
      control: { type: 'select' },
      options: ['top', 'right', 'bottom', 'left'],
      description: '停靠邊緣（決定滑入方向）',
    },
    size: { control: { type: 'text' }, description: '寬 / 高（數字補 px，字串原樣）' },
    image: { control: { type: 'text' }, description: '背景圖片網址（純裝飾）' },
    withHeader: { control: { type: 'boolean' }, description: '是否渲染整個 header' },
    hideCloseButton: { control: { type: 'boolean' }, description: '隱藏關閉鈕' },
    hideBackdrop: { control: { type: 'boolean' }, description: '隱藏遮罩' },
    closeOnBackdrop: { control: { type: 'boolean' }, description: '點外部是否關閉' },
    closeOnEscape: { control: { type: 'boolean' }, description: '按 Esc 是否關閉' },
    lockScroll: { control: { type: 'boolean' }, description: '是否鎖定背景捲動' },
    beforeClose: { control: false, description: '關閉前攔截 (done) => void' },
    modelValue: { control: false, description: '開關狀態（v-model）' },
    onOpen: { action: 'open', description: '開始開啟（進場前）' },
    onOpened: { action: 'opened', description: '開啟完成（進場後）' },
    onClose: { action: 'close', description: '開始關閉（離場前）' },
    onClosed: { action: 'closed', description: '關閉完成（離場後）' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 可互動 anchor / size / closeOn…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    title: '篩選條件',
    anchor: 'right',
    size: 320,
    hideBackdrop: false,
    hideCloseButton: false,
    closeOnBackdrop: true,
    closeOnEscape: true,
    lockScroll: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseDrawer },
    setup() {
      const open = ref(false)
      return { args, open, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟抽屜</button>
        <BaseDrawer v-model="open" v-bind="args">
          <p style="margin:0 0 12px;color:#374151">這是抽屜主體內容。改變右側 Controls 的 anchor / size 即時預覽。</p>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">取消</button>
            <button :style="BTN" @click="close">套用</button>
          </template>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Anchors —— 四個停靠方向
// ─────────────────────────────────────────────────────────────────────────────

export const Anchors: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const current = ref<'top' | 'right' | 'bottom' | 'left' | null>(null)
      const anchors = ['top', 'right', 'bottom', 'left'] as const
      return { current, anchors, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <p style="color:#6b7280;font-size:0.875rem;margin:0 0 12px;flex-basis:100%">抽屜會從對應的邊緣滑入。</p>
        <button v-for="a in anchors" :key="a" :style="BTN" @click="current = a">{{ a }}</button>
        <BaseDrawer
          :model-value="current !== null"
          :anchor="current ?? 'right'"
          :title="current ? 'anchor: ' + current : ''"
          @update:model-value="(val) => { if (!val) current = null }"
        >
          <p style="margin:0;color:#374151">從 <b>{{ current }}</b> 邊緣滑入的抽屜。</p>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomSize —— 自訂寬度 / 字串尺寸
// ─────────────────────────────────────────────────────────────────────────────

export const CustomSize: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const openWide = ref(false)
      const openPercent = ref(false)
      return { openWide, openPercent, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <button :style="BTN" @click="openWide = true">寬 480px</button>
        <button :style="BTN" @click="openPercent = true">寬 50%</button>
        <BaseDrawer v-model="openWide" title="寬版抽屜" :size="480">
          <p style="margin:0;color:#374151">size 傳數字（480）會補上 px。</p>
        </BaseDrawer>
        <BaseDrawer v-model="openPercent" title="半寬抽屜" size="50%">
          <p style="margin:0;color:#374151">size 傳字串（'50%'）原樣套用。</p>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// WithForm —— 表單抽屜（footer 動作區）
// ─────────────────────────────────────────────────────────────────────────────

export const WithForm: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const open = ref(false)
      const LABEL = 'display:block;font:500 0.8125rem system-ui;color:#374151;margin:0 0 4px'
      const INPUT = 'width:100%;box-sizing:border-box;padding:8px 10px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px'
      return { open, BTN, BTN_GHOST, LABEL, INPUT }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">編輯個人資料</button>
        <BaseDrawer v-model="open" title="編輯個人資料" :size="400">
          <div style="display:flex;flex-direction:column;gap:16px">
            <div>
              <label :style="LABEL">姓名</label>
              <input :style="INPUT" value="王小明" />
            </div>
            <div>
              <label :style="LABEL">電子郵件</label>
              <input :style="INPUT" value="wang@example.com" />
            </div>
          </div>
          <template #footer="{ close }">
            <button :style="BTN_GHOST" @click="close">取消</button>
            <button :style="BTN" @click="close">儲存</button>
          </template>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// BackgroundImage —— 背景圖片（Vuetify 風格）
// ─────────────────────────────────────────────────────────────────────────────

export const BackgroundImage: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const openImage = ref(false)
      const openSlot = ref(false)
      // 內聯 SVG data-URI 當背景圖：離線 / CSP 受限環境也能正常顯示，不依賴外部網路。
      const svg
        = '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="960">'
          + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
          + '<stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>'
          + '</linearGradient></defs><rect width="640" height="960" fill="url(#g)"/></svg>'
      const image = `data:image/svg+xml,${encodeURIComponent(svg)}`
      // 疊一層深色遮罩讓白字在圖片上仍清晰（覆寫 --drawer-image-overlay）。
      const STYLE = '--drawer-image-overlay: rgba(0,0,0,0.45); --drawer-color: #fff'
      return { openImage, openSlot, image, STYLE, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <button :style="BTN" @click="openImage = true">image prop（data-URI）</button>
        <button :style="BTN" @click="openSlot = true">#image slot（漸層）</button>

        <BaseDrawer v-model="openImage" title="個人檔案" :image="image" :style="STYLE" anchor="left">
          <p style="margin:0">image prop 帶背景圖，墊在內容後方；用 --drawer-image-overlay 疊深色遮罩確保文字可讀。</p>
        </BaseDrawer>

        <BaseDrawer v-model="openSlot" title="活動" :style="STYLE">
          <template #image>
            <div style="width:100%;height:100%;background:linear-gradient(160deg,#0ea5e9,#22c55e)" />
          </template>
          <p style="margin:0">需要漸層 / &lt;picture&gt; / 多層背景時改用 #image slot。</p>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// BeforeClose —— 關閉前攔截確認（Element Plus 風格）
// ─────────────────────────────────────────────────────────────────────────────

export const BeforeClose: Story = {
  render: () => ({
    components: { BaseDrawer },
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
        <BaseDrawer v-model="open" title="編輯中" :before-close="beforeClose">
          <p style="margin:0;color:#374151">試著按 Esc、點遮罩或關閉鈕 —— 都會先跳確認框，按確定才關閉。</p>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// WithoutHeader —— 不渲染 header（自訂版型）
// ─────────────────────────────────────────────────────────────────────────────

export const WithoutHeader: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const open = ref(false)
      return { open, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟（無 header）</button>
        <BaseDrawer v-model="open" aria-label="自訂面板" :with-header="false" anchor="left" :size="280">
          <p style="margin:0 0 16px;color:#374151">withHeader=false 完全不渲染標題列；版型自理（記得給 aria-label）。</p>
          <button :style="BTN" @click="open = false">自訂關閉</button>
        </BaseDrawer>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// NoBackdrop —— 隱藏遮罩（非阻斷式情境）
// ─────────────────────────────────────────────────────────────────────────────

export const NoBackdrop: Story = {
  render: () => ({
    components: { BaseDrawer },
    setup() {
      const open = ref(false)
      return { open, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="open = true">開啟（無遮罩）</button>
        <BaseDrawer v-model="open" title="通知" hide-backdrop>
          <p style="margin:0;color:#374151">hideBackdrop 隱藏半透明遮罩，但仍可點面板外部關閉。</p>
        </BaseDrawer>
      </div>
    `,
  }),
}
