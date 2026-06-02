import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseTabs from '~/components/atoms/BaseTabs.vue'
import BaseTabPanel from '~/components/atoms/BaseTabPanel.vue'
import type { BaseTabsItem } from '~/components/atoms/BaseTabs.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTabs 走 items 驅動 + provide/inject：tablist 由 `items` 渲染，面板內容放在
// 預設 slot 裡的 <BaseTabPanel>，以 `value` 對應。採「手動啟用」鍵盤模式
// （方向鍵移動 focus、Enter/Space 才切換）。useId() 在 Storybook 的純 Vue 環境
// 同樣可用，不需 Nuxt context。

const ITEMS: BaseTabsItem<string>[] = [
  { value: 'profile', label: '個人資料' },
  { value: 'security', label: '帳號安全' },
  { value: 'billing', label: '帳單' },
]

// 底線版型的面板不需外框，內容直接接在 tablist 下方（留點上方間距、與 tab 左緣對齊）
const PANEL_STYLE = 'padding:16px 4px;font-size:0.9rem;color:#374151;line-height:1.6'

const meta = {
  title: 'Atoms/BaseTabs',
  component: BaseTabs,
  subcomponents: { BaseTabPanel },
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: { type: 'select' },
      options: ITEMS.map((item) => item.value),
      description: '當前選中的 tab value（v-model）',
    },
    disabled: {
      control: { type: 'boolean' },
      description: '整體禁用：所有 tab 不可點 / 不可聚焦',
    },
    orientation: {
      control: { type: 'inline-radio' },
      options: ['horizontal', 'vertical'],
      description: '排列方向：horizontal（橫向，預設）/ vertical（縱向，tablist 在左、面板在右）',
    },
    activation: {
      control: { type: 'inline-radio' },
      options: ['manual', 'automatic'],
      description: 'manual（預設，方向鍵只移焦點）/ automatic（方向鍵移到即切換）',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'danger', 'success', 'warning', 'info', 'neutral'],
      description: '語意色彩，影響選中態的文字 / 指示底線 / 淺色底 / focus ring',
    },
    ariaLabel: {
      control: { type: 'text' },
      description: 'tablist 的無障礙名稱（同頁多組 tabs 時建議填）',
    },
    items: {
      control: false,
      description: 'tab 列表（BaseTabsItem[]，本 story 固定提供）',
    },
    onBeforeChange: {
      control: false,
      description: '切換前 hook，支援同步 / 非同步攔截',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— 可在 Controls 面板互動 disabled / ariaLabel / 當前選中
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    modelValue: 'profile',
    disabled: false,
    orientation: 'horizontal',
    activation: 'manual',
    color: 'primary',
    ariaLabel: '帳號設定',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref((args.modelValue as string) ?? 'profile')
      return { args, current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-bind="args" v-model="current" :items="items">
          <BaseTabPanel value="profile"><div :style="panelStyle">姓名、頭像、自我介紹…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">密碼、兩階段驗證、登入裝置…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">付款方式、發票、訂閱方案…</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">當前選中：{{ current }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 預設外觀
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      return { current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="帳號設定">
          <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
        </BaseTabs>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical —— 縱向排列（tablist 在左、面板在右，方向鍵改用 ↑/↓）
// ─────────────────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      return { current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:560px">
        <BaseTabs v-model="current" :items="items" orientation="vertical" aria-label="帳號設定">
          <BaseTabPanel value="profile"><div :style="panelStyle">姓名、頭像、自我介紹…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">密碼、兩階段驗證、登入裝置…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">付款方式、發票、訂閱方案…</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">縱向時方向鍵改用 ↑ / ↓；選中指示線在 tab 右側。</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors —— 語意色彩切換（對齊 BaseButton 色票）
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const colors = ['primary', 'danger', 'success', 'warning', 'info', 'neutral'] as const
      const current = ref('profile')
      return { colors, current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:20px;padding:16px;font-family:system-ui;max-width:480px">
        <div v-for="c in colors" :key="c">
          <p style="margin:0 0 6px;color:#6b7280;font-size:0.8rem">color="{{ c }}"</p>
          <BaseTabs v-model="current" :items="items" :color="c" :aria-label="c">
            <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
            <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
            <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
          </BaseTabs>
        </div>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom tab slot —— 用 #tab 加 icon / badge
// ─────────────────────────────────────────────────────────────────────────────

export const CustomTabSlot: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('inbox')
      const items: BaseTabsItem<string>[] = [
        { value: 'inbox', label: '收件匣' },
        { value: 'sent', label: '已寄出' },
        { value: 'spam', label: '垃圾郵件' },
      ]
      const badges: Record<string, number> = { inbox: 12, sent: 0, spam: 3 }
      return { current, items, badges, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="信件匣">
          <template #tab="{ item }">
            <span style="display:inline-flex;align-items:center;gap:6px">
              {{ item.label }}
              <span
                v-if="badges[item.value]"
                style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font-size:0.7rem;line-height:1"
              >{{ badges[item.value] }}</span>
            </span>
          </template>
          <BaseTabPanel value="inbox"><div :style="panelStyle">收件匣（12 封未讀）</div></BaseTabPanel>
          <BaseTabPanel value="sent"><div :style="panelStyle">已寄出</div></BaseTabPanel>
          <BaseTabPanel value="spam"><div :style="panelStyle">垃圾郵件（3 封）</div></BaseTabPanel>
        </BaseTabs>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled tab —— 單一 tab 禁用（鍵盤導覽會跳過）
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledTab: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      const items: BaseTabsItem<string>[] = [
        { value: 'profile', label: '個人資料' },
        { value: 'security', label: '帳號安全', disabled: true },
        { value: 'billing', label: '帳單' },
      ]
      return { current, items, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="帳號設定">
          <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">「帳號安全」被禁用 —— 用 ←/→ 會自動跳過它。</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled all —— 整體禁用
// ─────────────────────────────────────────────────────────────────────────────

export const DisabledAll: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      return { current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="帳號設定" disabled>
          <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
        </BaseTabs>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Before change hook —— 非同步確認後才切換
// ─────────────────────────────────────────────────────────────────────────────

export const BeforeChangeConfirm: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('editor')
      const dirty = ref(true)
      const items: BaseTabsItem<string>[] = [
        { value: 'editor', label: '編輯器' },
        { value: 'preview', label: '預覽' },
      ]
      // 回傳值 API：回傳 false 取消切換，其餘照切（也可回傳 Promise 做非同步確認）。
      const onBeforeChange = (value: string): boolean => {
        if (!dirty.value) return true
        // eslint-disable-next-line no-alert
        const ok = window.confirm(`「編輯器」有未儲存變更，確定切換到「${value}」？`)
        if (ok) dirty.value = false
        return ok
      }
      return { current, items, onBeforeChange, dirty, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" :on-before-change="onBeforeChange" aria-label="文件">
          <BaseTabPanel value="editor"><div :style="panelStyle">編輯器（假設有未儲存變更）</div></BaseTabPanel>
          <BaseTabPanel value="preview"><div :style="panelStyle">預覽結果</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">
          切換時會跳出確認對話框；按取消則停留原 tab。未儲存狀態：{{ dirty ? '有變更' : '已儲存' }}
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyboard navigation —— 手動啟用說明
// ─────────────────────────────────────────────────────────────────────────────

export const KeyboardNavigation: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('a')
      const items: BaseTabsItem<string>[] = [
        { value: 'a', label: 'Tab A' },
        { value: 'b', label: 'Tab B' },
        { value: 'c', label: 'Tab C' },
        { value: 'd', label: 'Tab D' },
      ]
      return { current, items, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="鍵盤示範">
          <BaseTabPanel value="a"><div :style="panelStyle">面板 A</div></BaseTabPanel>
          <BaseTabPanel value="b"><div :style="panelStyle">面板 B</div></BaseTabPanel>
          <BaseTabPanel value="c"><div :style="panelStyle">面板 C</div></BaseTabPanel>
          <BaseTabPanel value="d"><div :style="panelStyle">面板 D</div></BaseTabPanel>
        </BaseTabs>
        <ul style="margin-top:12px;color:#6b7280;font-size:0.875rem;padding-left:1.2em;line-height:1.7">
          <li>先用 <kbd>Tab</kbd> 聚焦到選中的分頁</li>
          <li><kbd>←</kbd> / <kbd>→</kbd>：移動 focus（頭尾環繞，手動啟用故不立即切換）</li>
          <li><kbd>Home</kbd> / <kbd>End</kbd>：跳到第一個 / 最後一個分頁</li>
          <li><kbd>Enter</kbd> / <kbd>Space</kbd>：切換到目前 focus 的分頁</li>
        </ul>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Automatic activation —— 方向鍵移到即切換
// ─────────────────────────────────────────────────────────────────────────────

export const AutomaticActivation: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      return { current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" activation="automatic" aria-label="帳號設定">
          <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">
          聚焦分頁後按 ←/→：焦點移到哪就切到哪（選中跟著焦點走）。
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Overflow —— tab 過多時水平捲動，不擠壓
// ─────────────────────────────────────────────────────────────────────────────

export const Overflow: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const items: BaseTabsItem<string>[] = Array.from({ length: 12 }, (_, i) => ({
        value: `t${i + 1}`,
        label: `分頁項目 ${i + 1}`,
      }))
      const current = ref('t1')
      return { current, items, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:360px;border:1px dashed #d1d5db">
        <BaseTabs v-model="current" :items="items" aria-label="很多分頁">
          <BaseTabPanel v-for="item in items" :key="item.value" :value="item.value">
            <div :style="panelStyle">{{ item.label }} 的內容</div>
          </BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">寬度不足時 tablist 可水平捲動，分頁不被壓窄。</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy panel —— 面板首次顯示後才掛載
// ─────────────────────────────────────────────────────────────────────────────

export const LazyPanel: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('a')
      const items: BaseTabsItem<string>[] = [
        { value: 'a', label: '分頁 A' },
        { value: 'b', label: '分頁 B（lazy）' },
      ]
      // 用一個會在 setup 時印 log 的子元件，示範「顯示後才建立」
      const HeavyContent = {
        props: { label: { type: String, default: '' } },
        setup(props: { label: string }) {
          if (import.meta.env.DEV) console.log(`[lazy] 建立：${props.label}`)
          return () => props.label
        },
      }
      return { current, items, HeavyContent, panelStyle: PANEL_STYLE }
    },
    template: `
      <div style="padding:16px;font-family:system-ui;max-width:480px">
        <BaseTabs v-model="current" :items="items" aria-label="lazy 示範">
          <BaseTabPanel value="a"><div :style="panelStyle"><component :is="HeavyContent" label="A 內容（一開始就建立）" /></div></BaseTabPanel>
          <BaseTabPanel value="b" lazy><div :style="panelStyle"><component :is="HeavyContent" label="B 內容（切到才建立）" /></div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">
          開 console：B 面板加上 <code>lazy</code>，第一次切到它才會建立內容；之後切走仍保留。
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom theme —— 透過 --tabs-* token 覆寫品牌色
// ─────────────────────────────────────────────────────────────────────────────

export const CustomTheme: Story = {
  render: () => ({
    components: { BaseTabs, BaseTabPanel },
    setup() {
      const current = ref('profile')
      return { current, items: ITEMS, panelStyle: PANEL_STYLE }
    },
    template: `
      <div
        style="padding:16px;font-family:system-ui;max-width:480px;
               --tabs-tab-color-selected:#e11d48;--tabs-tab-bg-selected:#ffe4e6;
               --tabs-indicator-color:#e11d48;--tabs-indicator-width:3px;
               --tabs-focus-ring:#e11d48;--tabs-tab-color:#9f1239"
      >
        <BaseTabs v-model="current" :items="items" aria-label="帳號設定">
          <BaseTabPanel value="profile"><div :style="panelStyle">個人資料內容…</div></BaseTabPanel>
          <BaseTabPanel value="security"><div :style="panelStyle">帳號安全內容…</div></BaseTabPanel>
          <BaseTabPanel value="billing"><div :style="panelStyle">帳單內容…</div></BaseTabPanel>
        </BaseTabs>
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">在外層覆寫 --tabs-* token 即可換色 / 換圓角。</p>
      </div>
    `,
  }),
}
