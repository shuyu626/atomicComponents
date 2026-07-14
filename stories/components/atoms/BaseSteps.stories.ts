import type { StoryObj } from '@storybook/vue3-vite'
import { computed, ref } from 'vue'
import BaseSteps from '~/components/atoms/BaseSteps.vue'
import BaseButton from '~/components/atoms/BaseButton.vue'
import type { BaseStepItem } from '~/components/atoms/BaseSteps.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseSteps 是「線性流程的步驟指示器」：只畫節點 + 標題 + 說明 + 連接線，不含
// 內容面板 —— 使用端依 v-model:current 自行 v-if / v-show 切換各步內容
// （見 WizardDemo）。狀態（wait/process/finish/error）依 current 位置自動推導，
// 也可用 item.status 逐步覆寫。

const WRAP = (inner: string) =>
  `<div style="display:flex;flex-direction:column;gap:24px;padding:32px;max-width:36rem;font-family:system-ui">${inner}</div>`

const BASIC_ITEMS: BaseStepItem[] = [
  { title: '填寫資料' },
  { title: '確認內容' },
  { title: '完成' },
]

const meta = {
  title: 'Atoms/BaseSteps',
  component: BaseSteps,
  tags: ['autodocs'],
  argTypes: {
    items: { control: false, description: '步驟資料（BaseStepItem[]，本 story 固定提供）' },
    current: { control: { type: 'number' }, description: '目前所在步驟（0-based，v-model:current）' },
    direction: {
      control: { type: 'inline-radio' },
      options: ['horizontal', 'vertical'],
      description: '排列方向。預設 horizontal',
    },
    clickable: {
      control: { type: 'boolean' },
      description: '步驟可點擊切換（渲染為 button 並更新 v-model:current）。預設 false',
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
    current: 1,
    direction: 'horizontal',
    clickable: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSteps },
    setup() {
      const current = ref((args.current as number) ?? 0)
      return { args, current, items: BASIC_ITEMS }
    },
    template: WRAP(
      '<BaseSteps v-bind="args" v-model:current="current" :items="items" />',
    ),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical —— 縱向排列
// ─────────────────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(1)
      return { current, items: BASIC_ITEMS }
    },
    template: WRAP(
      '<BaseSteps direction="vertical" v-model:current="current" :items="items" />',
    ),
  }),
  parameters: {
    docs: {
      description: {
        story: '`direction="vertical"`：節點在左、文字在右，連接線改走節點正下方的垂直段。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Clickable —— 可點擊回頭修改
// ─────────────────────────────────────────────────────────────────────────────

export const Clickable: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(2)
      return { current, items: BASIC_ITEMS }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseSteps clickable v-model:current="current" :items="items" />
        <p style="margin:0;color:#6b7280;font-size:0.875rem">目前所在步驟：{{ current }}（點擊任一節點可直接跳過去）</p>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '`clickable` 讓步驟渲染為真正的 `<button>`，點擊非目前 / 非 disabled 的步驟會同步更新 `v-model:current` 並 emit `change`。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With error —— 第 2 步 status: 'error'
// ─────────────────────────────────────────────────────────────────────────────

export const WithError: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(2)
      const items: BaseStepItem[] = [
        { title: '填寫資料' },
        { title: '確認內容', status: 'error' },
        { title: '完成' },
      ]
      return { current, items }
    },
    template: WRAP('<BaseSteps v-model:current="current" :items="items" />'),
  }),
  parameters: {
    docs: {
      description: {
        story: '第 2 步以 `item.status: \'error\'` 覆寫推導結果——即使位置上已「路過」（應為 finish），仍優先顯示 error（✕ 圖示 + 錯誤色）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// With description —— 每步附補充說明
// ─────────────────────────────────────────────────────────────────────────────

export const WithDescription: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(1)
      const items: BaseStepItem[] = [
        { title: '填寫資料', description: '基本資料與聯絡方式' },
        { title: '確認內容', description: '請再次確認送出內容' },
        { title: '完成', description: '收到結果通知' },
      ]
      return { current, items }
    },
    template: WRAP('<BaseSteps v-model:current="current" :items="items" />'),
  }),
  parameters: {
    docs: {
      description: { story: '`item.description` 顯示於標題下方，提供每步的補充說明。' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom icon —— #icon scoped slot 覆寫節點
// ─────────────────────────────────────────────────────────────────────────────

export const CustomIcon: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(1)
      const items: BaseStepItem[] = [
        { title: '購物車' },
        { title: '付款' },
        { title: '出貨' },
      ]
      // MDI（Material Design Icons，Apache-2.0）path data，inline 引用避免新增 icon 套件依賴。
      // 依序：mdi-cart / mdi-credit-card-outline / mdi-package-variant-closed。
      // fill="currentColor" 讓圖示自動吃節點狀態色（wait 灰 / process·finish 實心底上白色）。
      const mdiPaths = [
        'M17,18C15.89,18 15,18.89 15,20A2,2 0 0,0 17,22A2,2 0 0,0 19,20C19,18.89 18.1,18 17,18M1,2V4H3L6.6,11.59L5.25,14.04C5.09,14.32 5,14.65 5,15A2,2 0 0,0 7,17H19V15H7.42A0.25,0.25 0 0,1 7.17,14.75C7.17,14.7 7.18,14.66 7.2,14.63L8.1,13H15.55C16.3,13 16.96,12.59 17.3,11.97L20.88,5.5C20.96,5.34 21,5.17 21,5A1,1 0 0,0 20,4H5.21L4.27,2M7,18C5.89,18 5,18.89 5,20A2,2 0 0,0 7,22A2,2 0 0,0 9,20C9,18.89 8.1,18 7,18Z',
        'M20,8H4V6H20M20,18H4V12H20M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z',
        'M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L10.11,5.22L16,8.61L17.96,7.5L12,4.15M6.04,7.5L12,10.85L13.96,9.75L8.08,6.35L6.04,7.5M5,15.91L11,19.29V12.58L5,9.21V15.91M19,15.91V9.21L13,12.58V19.29L19,15.91Z',
      ]
      return { current, items, mdiPaths }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseSteps v-model:current="current" :items="items">
          <template #icon="{ index }">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="display:block">
              <path :d="mdiPaths[index]" />
            </svg>
          </template>
        </BaseSteps>
        <p style="margin:0;color:#6b7280;font-size:0.875rem">#icon scoped slot 收到 { item, index, status }，可完全取代內建的 ✓ / ✕ / 編號——此例改用 MDI 圖示（inline path，零依賴）。</p>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '`#icon` slot 覆寫節點內容，收到 `{ item, index, status }`。此例以 inline MDI path（mdi-cart / mdi-credit-card-outline / mdi-package-variant-closed）示範，`fill="currentColor"` 自動跟隨節點狀態色，無需安裝 icon 套件。' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Wizard demo —— 完整三步表單流程
// ─────────────────────────────────────────────────────────────────────────────

export const WizardDemo: Story = {
  render: () => ({
    components: { BaseSteps, BaseButton },
    setup() {
      const current = ref(0)
      const items: BaseStepItem[] = [
        { title: '填寫資料' },
        { title: '確認內容' },
        { title: '完成' },
      ]
      const isLast = computed(() => current.value === items.length - 1)
      const isFirst = computed(() => current.value === 0)

      function prev() {
        if (!isFirst.value) current.value -= 1
      }
      function next() {
        if (!isLast.value) current.value += 1
      }

      return { current, items, isFirst, isLast, prev, next }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:24px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseSteps v-model:current="current" :items="items" />

        <section style="min-height:96px;padding:16px;border:1px dashed #d1d5db;border-radius:8px;font-size:0.875rem;color:#374151">
          <div v-if="current === 0">
            <p style="margin:0 0 8px;font-weight:600">第一步：填寫資料</p>
            <p style="margin:0;color:#6b7280">假設這裡放姓名 / Email 等表單欄位。</p>
          </div>
          <div v-else-if="current === 1">
            <p style="margin:0 0 8px;font-weight:600">第二步：確認內容</p>
            <p style="margin:0;color:#6b7280">請再次確認上一步填寫的內容是否正確。</p>
          </div>
          <div v-else>
            <p style="margin:0 0 8px;font-weight:600">第三步：完成</p>
            <p style="margin:0;color:#6b7280">已成功送出，感謝您的填寫。</p>
          </div>
        </section>

        <div style="display:flex;gap:8px;justify-content:flex-end">
          <BaseButton variant="outline" color="neutral" :disabled="isFirst" @click="prev">上一步</BaseButton>
          <BaseButton :disabled="isLast" @click="next">下一步</BaseButton>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '完整 wizard 範例：`v-model:current` 驅動 BaseSteps 的進度顯示，內容區用 `v-if` 依 `current` 切換，上一步 / 下一步按鈕由使用端自行控制邊界（BaseSteps 本身不內建這些邏輯）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --steps-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseSteps },
    setup() {
      const current = ref(1)
      return { current, items: BASIC_ITEMS }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:36rem;font-family:system-ui">
        <BaseSteps class="t-brand" v-model:current="current" :items="items" />
        <style>
          .t-brand {
            --steps-accent: #7c3aed;
            --steps-icon-size: 32px;
            --steps-title-color: #4c1d95;
          }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--steps-accent` / `--steps-icon-size` 等 token 即可主題化。' },
    },
  },
}
