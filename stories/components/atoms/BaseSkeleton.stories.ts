import type { StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BaseSkeleton from '~/components/atoms/BaseSkeleton.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseSkeleton 是「載入佔位骨架」：首次載入時用形狀相符的靜態色塊佔用「未來內容」
// 的版位，避免內容到位瞬間 layout shift。text / circular / rectangular / rounded
// 四種形狀 + pulse / wave / none 三種動畫；loading=false 時只渲染 default slot
// （無 wrapper），與短暫、無形狀語意的 BaseSpinner 互補。

const meta = {
  title: 'Atoms/BaseSkeleton',
  component: BaseSkeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['text', 'circular', 'rectangular', 'rounded'],
      description: '形狀。預設 text',
    },
    width: { control: { type: 'text' }, description: '寬度；數字補 px，字串原樣使用' },
    height: { control: { type: 'text' }, description: '高度；數字補 px，字串原樣使用' },
    animation: {
      control: { type: 'select' },
      options: ['pulse', 'wave', 'none'],
      description: '動畫。預設 pulse',
    },
    loading: {
      control: { type: 'boolean' },
      description: '載入中；false 時直接渲染 default slot（無 wrapper）。預設 true',
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
    variant: 'text',
    width: '100%',
    height: '',
    animation: 'pulse',
    loading: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSkeleton },
    setup() {
      return { args }
    },
    template: `
      <div style="padding:32px;max-width:24rem;font-family:system-ui">
        <BaseSkeleton v-bind="args" />
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants —— text / circular / rectangular / rounded
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseSkeleton },
    template: `
      <div style="display:flex;align-items:center;gap:24px;padding:32px;font-family:system-ui">
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <BaseSkeleton variant="text" width="120px" />
          <span style="font-size:12px;color:#6b7280">text</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <BaseSkeleton variant="circular" :width="56" :height="56" />
          <span style="font-size:12px;color:#6b7280">circular</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <BaseSkeleton variant="rectangular" :width="96" :height="56" />
          <span style="font-size:12px;color:#6b7280">rectangular</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <BaseSkeleton variant="rounded" :width="96" :height="56" />
          <span style="font-size:12px;color:#6b7280">rounded</span>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '四種形狀對應常見內容輪廓：`text`（文字列）、`circular`（頭像）、`rectangular`（圖片）、`rounded`（卡片）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Animations —— pulse / wave / none
// ─────────────────────────────────────────────────────────────────────────────

export const Animations: Story = {
  render: () => ({
    components: { BaseSkeleton },
    template: `
      <div style="display:flex;flex-direction:column;gap:16px;padding:32px;max-width:20rem;font-family:system-ui">
        <div>
          <BaseSkeleton variant="rounded" width="100%" :height="48" animation="pulse" />
          <span style="font-size:12px;color:#6b7280">pulse（預設）：透明度脈動</span>
        </div>
        <div>
          <BaseSkeleton variant="rounded" width="100%" :height="48" animation="wave" />
          <span style="font-size:12px;color:#6b7280">wave：掃光</span>
        </div>
        <div>
          <BaseSkeleton variant="rounded" width="100%" :height="48" animation="none" />
          <span style="font-size:12px;color:#6b7280">none：靜態色塊</span>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`pulse`（預設）為透明度脈動、`wave` 為線性漸層掃光、`none` 為靜態色塊。`prefers-reduced-motion: reduce` 下 pulse / wave 皆會停用動畫。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// TextLines —— 多行文字骨架組合
// ─────────────────────────────────────────────────────────────────────────────

export const TextLines: Story = {
  render: () => ({
    components: { BaseSkeleton },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:32px;max-width:20rem;font-family:system-ui">
        <BaseSkeleton variant="text" width="60%" />
        <BaseSkeleton variant="text" width="100%" />
        <BaseSkeleton variant="text" width="80%" />
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          'atom 不內建 rows / 行數 preset，多行文字骨架由使用端疊多顆 `variant="text"`、搭配不同 `width` 自行組合出自然的段落輪廓。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// WithContent —— loading 切換 + 卡片內容
// ─────────────────────────────────────────────────────────────────────────────

export const WithContent: Story = {
  render: () => ({
    components: { BaseSkeleton },
    setup() {
      const loading = ref(true)
      return { loading }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:20rem;font-family:system-ui">
        <div :aria-busy="loading ? 'true' : undefined" style="display:flex;flex-direction:column;gap:8px">
          <BaseSkeleton :loading="loading" variant="rounded" width="100%" :height="120">
            <img
              src="https://placehold.co/320x120"
              alt="卡片封面"
              width="320"
              height="120"
              style="width:100%;height:120px;border-radius:6px;object-fit:cover"
            />
          </BaseSkeleton>
          <BaseSkeleton :loading="loading" variant="text" width="70%">
            <strong>卡片標題</strong>
          </BaseSkeleton>
          <BaseSkeleton :loading="loading" variant="text" width="100%">
            <span style="font-size:14px;color:#374151">這是卡片的說明文字，載入完成後顯示。</span>
          </BaseSkeleton>
        </div>
        <button
          type="button"
          style="align-self:flex-start;font:inherit;padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer"
          @click="loading = !loading"
        >
          {{ loading ? '完成載入' : '重新載入' }}
        </button>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`loading` 切換：`true` 時顯示骨架佔位，`false` 時無縫換成實際卡片內容（圖片 + 標題 + 說明），容器層以 `aria-busy` 表達載入語意。點擊按鈕可切換觀察效果。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --skeleton-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseSkeleton },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:32px;max-width:20rem;font-family:system-ui">
        <BaseSkeleton class="t-brand" variant="rounded" width="100%" :height="80" />
        <style>
          .t-brand { --skeleton-color: #1f2937; --skeleton-speed: 1s; }
        </style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--skeleton-color` / `--skeleton-speed` 等 token 即可主題化。' },
    },
  },
}
