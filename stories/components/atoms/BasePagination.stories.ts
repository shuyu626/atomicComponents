import { ref, h } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BasePagination from '~/components/atoms/BasePagination.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BasePagination 內部委派 BaseButton 渲染按鈕（純 `<button>`，不走 BaseLink），
// 因此不需要 NuxtLink stub。資料模型為 `page (v-model) + perPage + total`，
// 與大多數後端分頁回傳結構對齊。

const meta = {
  title: 'Atoms/BasePagination',
  component: BasePagination,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: { type: 'number', min: 1 },
      description: '當前頁碼（1-based）',
    },
    perPage: {
      control: { type: 'number', min: 1 },
      description: '每頁筆數',
    },
    total: {
      control: { type: 'number', min: 0 },
      description: '總筆數',
    },
    siblingCount: {
      control: { type: 'number', min: 0 },
      description: '當前頁前後兄弟頁碼數',
    },
    boundaryCount: {
      control: { type: 'number', min: 0 },
      description: '頭尾固定頁碼數',
    },
    variant: {
      control: { type: 'select' },
      options: ['outline', 'text', 'soft'],
      description: '視覺風格;預設 outline(描邊),text 為純文字、soft 為淺灰填色',
    },
    size: { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
    color: {
      control: { type: 'select' },
      options: ['primary', 'danger', 'success', 'warning', 'info', 'neutral'],
    },
    shape: { control: { type: 'select' }, options: ['square', 'circle'] },
    showFirstButton: { control: { type: 'boolean' } },
    showLastButton: { control: { type: 'boolean' } },
    hidePrevButton: { control: { type: 'boolean' } },
    hideNextButton: { control: { type: 'boolean' } },
    disabled: { control: { type: 'boolean' } },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— 可在 Controls 面板互動所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    modelValue: 5,
    perPage: 10,
    total: 100,
    siblingCount: 1,
    boundaryCount: 1,
    variant: 'outline',
    size: 'md',
    color: 'primary',
    shape: 'square',
  },
  render: (args: Record<string, unknown>) => ({
    components: { BasePagination },
    setup() {
      const page = ref((args.modelValue as number) ?? 1)
      return { args, page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-bind="args" v-model="page" />
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">當前頁：{{ page }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 預設外觀（prev / 1..10 / next）
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(1)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="100" :per-page="10" />
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">當前頁：{{ page }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Many pages with ellipsis —— 大筆數 + 兩側省略
// ─────────────────────────────────────────────────────────────────────────────

export const ManyPages: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(15)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="500" :per-page="10" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// First / Last buttons —— 顯示跳至第一頁 / 最後一頁
// ─────────────────────────────────────────────────────────────────────────────

export const FirstLastButtons: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(10)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination
          v-model="page"
          :total="500"
          :per-page="10"
          show-first-button
          show-last-button
        />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sibling / Boundary count —— 控制顯示密度
// ─────────────────────────────────────────────────────────────────────────────

export const SiblingAndBoundary: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(10)
      return { page }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;font-family:system-ui">
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">siblingCount=0, boundaryCount=1</p>
          <BasePagination v-model="page" :total="200" :per-page="10" :sibling-count="0" />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">siblingCount=2, boundaryCount=1（預設 boundary）</p>
          <BasePagination v-model="page" :total="200" :per-page="10" :sibling-count="2" />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">siblingCount=1, boundaryCount=2</p>
          <BasePagination v-model="page" :total="200" :per-page="10" :boundary-count="2" />
        </div>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— outline(預設)/ text / soft
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(3)
      return { page }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:24px;padding:16px;font-family:system-ui">
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">variant="outline"(預設) — 描邊非選中、實心選中</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="outline" />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">variant="text" — 純文字,僅選中態以主色標示</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="text" />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">variant="soft" — 淺灰填色,選中態主色填色</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="soft" />
        </div>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants × Disabled —— 三種 variant 在 disabled 狀態下都應呈現全灰
// ─────────────────────────────────────────────────────────────────────────────

export const VariantsDisabled: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(3)
      return { page }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:24px;padding:16px;font-family:system-ui">
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">outline + disabled</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="outline" disabled />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">text + disabled</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="text" disabled />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">soft + disabled</p>
          <BasePagination v-model="page" :total="50" :per-page="10" variant="soft" disabled />
        </div>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(3)
      return { page }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="100" :per-page="10" size="sm" />
        <BasePagination v-model="page" :total="100" :per-page="10" size="md" />
        <BasePagination v-model="page" :total="100" :per-page="10" size="lg" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(3)
      return { page }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="100" :per-page="10" color="primary" />
        <BasePagination v-model="page" :total="100" :per-page="10" color="danger" />
        <BasePagination v-model="page" :total="100" :per-page="10" color="success" />
        <BasePagination v-model="page" :total="100" :per-page="10" color="neutral" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Circle shape
// ─────────────────────────────────────────────────────────────────────────────

export const CircleShape: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(5)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="100" :per-page="10" shape="circle" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(3)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="100" :per-page="10" disabled />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Localized labels —— 繁體中文 a11y
// ─────────────────────────────────────────────────────────────────────────────

export const LocalizedLabels: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(5)
      const labels = {
        first: '跳至第一頁',
        previous: '上一頁',
        next: '下一頁',
        last: '跳至最後一頁',
        page: (n: number) => `前往第 ${n} 頁`,
        current: (n: number) => `目前位於第 ${n} 頁`,
      }
      return { page, labels }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination
          v-model="page"
          :total="200"
          :per-page="10"
          aria-label="分頁導覽"
          :labels="labels"
          show-first-button
          show-last-button
        />
        <p style="margin-top:12px;color:#6b7280;font-size:0.875rem">
          試試將滑鼠停在按鈕上,或用 VoiceOver / NVDA 朗讀。
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom icons (slot)
// ─────────────────────────────────────────────────────────────────────────────

const TextArrow = (text: string) =>
  h('span', { style: 'font-weight:600' }, text)

export const CustomIcons: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(10)
      return {
        page,
        prevIcon: () => TextArrow('←'),
        nextIcon: () => TextArrow('→'),
        firstIcon: () => TextArrow('«'),
        lastIcon: () => TextArrow('»'),
      }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination
          v-model="page"
          :total="500"
          :per-page="10"
          show-first-button
          show-last-button
        >
          <template #first-icon><component :is="firstIcon" /></template>
          <template #prev-icon><component :is="prevIcon" /></template>
          <template #next-icon><component :is="nextIcon" /></template>
          <template #last-icon><component :is="lastIcon" /></template>
        </BasePagination>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom ellipsis
// ─────────────────────────────────────────────────────────────────────────────

export const CustomEllipsis: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const page = ref(10)
      return { page }
    },
    template: `
      <div style="padding:16px;font-family:system-ui">
        <BasePagination v-model="page" :total="500" :per-page="10">
          <template #ellipsis>
            <span style="color:#9ca3af;font-weight:700">···</span>
          </template>
        </BasePagination>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

export const EdgeCases: Story = {
  render: () => ({
    components: { BasePagination },
    setup() {
      const single = ref(1)
      const empty = ref(1)
      const two = ref(1)
      return { single, empty, two }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:24px;padding:16px;font-family:system-ui">
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">total=0:不渲染 nav</p>
          <BasePagination v-model="empty" :total="0" :per-page="10" />
          <p style="color:#9ca3af;font-style:italic">↑ 上方應為空</p>
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">total=5, perPage=10:單頁,prev/next 都 disabled</p>
          <BasePagination v-model="single" :total="5" :per-page="10" />
        </div>
        <div>
          <p style="margin:0 0 8px;color:#6b7280;font-size:0.875rem">total=15, perPage=10:剛好兩頁</p>
          <BasePagination v-model="two" :total="15" :per-page="10" />
        </div>
      </div>
    `,
  }),
}
