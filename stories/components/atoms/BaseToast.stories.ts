import type { StoryObj } from '@storybook/vue3-vite'

import BaseToast from '~/components/atoms/BaseToast.vue'
import BaseToastContainer from '~/components/atoms/BaseToastContainer.vue'
import { createToastManager } from '~/composables/useToast'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseToast 是「非阻斷式輕量通知」，採命令式 API：
//   useToast().success('已儲存')
// 畫面由掛在 app 根層的單一 <BaseToastContainer /> 渲染。
//
// 為了 Storybook 隔離，各 story 以 createToastManager() 建立獨立佇列並傳給容器，
// 不污染其他 story。argTypes 控制 Playground 推送的 toast 設定。

const BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'
const BTN_GHOST
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#374151;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer'

const meta = {
  title: 'Atoms/BaseToast',
  component: BaseToast,
  tags: ['autodocs'],
  argTypes: {
    message: { control: { type: 'text' }, description: '主要訊息' },
    title: { control: { type: 'text' }, description: '選填標題' },
    type: {
      control: { type: 'select' },
      options: ['info', 'success', 'warning', 'error'],
      description: '語意類型（圖示 / 顏色 / 播報優先度）',
    },
    duration: { control: { type: 'number' }, description: '自動消失 ms / timeout（0 = 常駐）' },
    closable: { control: { type: 'boolean' }, description: '是否顯示關閉鈕' },
    progress: { control: { type: 'boolean' }, description: '是否顯示倒數進度條' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 調整 type / title / duration / closable，按鈕推送
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    message: '已成功儲存變更',
    title: 'Success',
    type: 'success',
    duration: 3000,
    closable: true,
    progress: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      const push = () =>
        manager.show({
          message: args.message as string,
          title: (args.title as string) || undefined,
          type: args.type as never,
          duration: args.duration as number,
          closable: args.closable as boolean,
          progress: args.progress as boolean,
        })
      return { manager, push, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px">
        <button :style="BTN" @click="push">推送 Toast</button>
        <button :style="BTN_GHOST" @click="manager.clear()">清空</button>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Types —— 四種語意類型
// ─────────────────────────────────────────────────────────────────────────────

export const Types: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      return { manager, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px;flex-wrap:wrap">
        <button :style="BTN" @click="manager.success('The list has been saved.', { title: 'Success' })">success</button>
        <button :style="BTN" @click="manager.warning('Warning message.', { title: 'Warning' })">warning</button>
        <button :style="BTN" @click="manager.error('Error message.', { title: 'Error' })">error</button>
        <button :style="BTN" @click="manager.info('Info message.', { title: 'Info' })">info</button>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// WithProgress —— 倒數進度條（hover 暫停）
// ─────────────────────────────────────────────────────────────────────────────

export const WithProgress: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      const push = () =>
        manager.info('5 秒後自動關閉，滑入可暫停倒數。', {
          title: '處理中',
          duration: 5000,
          progress: true,
        })
      return { manager, push, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="push">推送（含進度條）</button>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomIconAndAction —— 宣告式：自訂前置圖示 + 後置動作 + 深色變體
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIconAndAction: Story = {
  render: () => ({
    components: { BaseToast },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;flex-direction:column;gap:16px;align-items:flex-start">
        <!-- #icon 換成 emoji / 任意圖示元件（如 v-icon）；#action 放「復原」 -->
        <BaseToast type="success" title="已刪除" :duration="0">
          清單項目已移除
          <template #icon>🗑️</template>
          <template #action="{ close }">
            <button :style="'background:none;border:none;color:inherit;font-weight:600;cursor:pointer'" @click="close">復原</button>
          </template>
        </BaseToast>

        <!-- 深色「Custom Toast」變體：覆寫 --toast-* token 即可（對齊參考圖一最後一張） -->
        <BaseToast
          title="Custom Toast Title"
          :duration="0"
          :style="'--toast-surface:#3f3f46;--toast-accent:#6b7280;--toast-title-color:#f9fafb;--toast-message-color:#d1d5db'"
        >
          Value here Value here Value here Value
        </BaseToast>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// WithTitle —— 帶標題
// ─────────────────────────────────────────────────────────────────────────────

export const WithTitle: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      const push = () =>
        manager.success('個人資料已更新，重新整理後生效。', { title: '儲存成功' })
      return { manager, push, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="push">推送（含標題）</button>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Placements —— 6 種角落各自獨立堆疊
// ─────────────────────────────────────────────────────────────────────────────

export const Placements: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      const placements = [
        'top-start', 'top', 'top-end',
        'bottom-start', 'bottom', 'bottom-end',
      ] as const
      const push = (placement: typeof placements[number]) =>
        manager.info(placement, { placement })
      return { manager, placements, push, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:grid;grid-template-columns:repeat(3,auto);gap:8px;justify-content:start">
        <button v-for="p in placements" :key="p" :style="BTN" @click="push(p)">{{ p }}</button>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Persistent —— duration:0 常駐，需手動關閉
// ─────────────────────────────────────────────────────────────────────────────

export const Persistent: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager()
      const push = () =>
        manager.error('連線中斷，請檢查網路後重試。', { title: '錯誤', duration: 0 })
      return { manager, push, BTN, BTN_GHOST }
    },
    template: `
      <div style="padding:40px;font-family:system-ui;display:flex;gap:8px">
        <button :style="BTN" @click="push">推送常駐錯誤</button>
        <button :style="BTN_GHOST" @click="manager.clear()">清空</button>
        <p style="flex-basis:100%;color:#6b7280;font-size:0.875rem;margin:12px 0 0">duration:0 不會自動消失，需點關閉鈕或呼叫 clear()。</p>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// MaxLimit —— 超過上限擠掉最舊（此處 max:3）
// ─────────────────────────────────────────────────────────────────────────────

export const MaxLimit: Story = {
  render: () => ({
    components: { BaseToastContainer },
    setup() {
      const manager = createToastManager({ max: 3 })
      let n = 0
      const push = () => manager.info(`第 ${++n} 筆通知`)
      return { manager, push, BTN }
    },
    template: `
      <div style="padding:40px;font-family:system-ui">
        <button :style="BTN" @click="push">連續推送（max:3）</button>
        <p style="color:#6b7280;font-size:0.875rem;margin:12px 0 0">同時最多顯示 3 筆，超過時最舊的會被擠掉。</p>
        <BaseToastContainer :manager="manager" />
      </div>
    `,
  }),
}
