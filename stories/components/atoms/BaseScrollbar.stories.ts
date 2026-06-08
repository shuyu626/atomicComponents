import type { StoryObj } from '@storybook/vue3-vite'
import BaseScrollbar from '~/components/atoms/BaseScrollbar.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseScrollbar 是 overlay 自訂捲軸：隱藏 viewport 的原生捲軸，改用絕對定位的
// track + thumb 呈現，閒置自動淡出。default slot 放任意內容，容器需有固定高度
// （或寬度）才會觸發溢出。native prop 可一鍵退回瀏覽器原生捲軸。

const LOREM = Array.from({ length: 18 }, (_, i) =>
  `第 ${i + 1} 行 —— 這是一段用來撐高內容、觸發捲動的示範文字。Scrollable content line ${i + 1}.`,
)

const WIDE = Array.from({ length: 12 }, (_, i) =>
  `寬欄 ${i + 1}｜這是一段很長、需要水平捲動才看得完的文字內容 horizontal overflow content`,
)

const meta = {
  title: 'Atoms/BaseScrollbar',
  component: BaseScrollbar,
  tags: ['autodocs'],
  argTypes: {
    native: {
      control: { type: 'boolean' },
      description: '退回瀏覽器原生捲軸：不隱藏原生捲軸、不渲染 overlay。預設 false',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板切換 native
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { native: false },
  render: (args: Record<string, unknown>) => ({
    components: { BaseScrollbar },
    setup() {
      return { args, lines: LOREM }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar v-bind="args" style="height:240px;width:360px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <p v-for="line in lines" :key="line" style="margin:0 0 12px;color:#374151;font-size:0.9rem;line-height:1.6">{{ line }}</p>
        </BaseScrollbar>
        <p style="margin-top:12px;color:#6b7280;font-size:0.8125rem">滑入區域捲動，捲軸自動浮現、閒置後淡出。可拖曳 thumb 或點軌道跳轉。</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertical —— 最常見：垂直捲動
// ─────────────────────────────────────────────────────────────────────────────

export const Vertical: Story = {
  render: () => ({
    components: { BaseScrollbar },
    setup() {
      return { lines: LOREM }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar style="height:220px;width:320px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <p v-for="line in lines" :key="line" style="margin:0 0 12px;color:#374151;font-size:0.9rem;line-height:1.6">{{ line }}</p>
        </BaseScrollbar>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal —— 水平捲動（內容用 nowrap 撐寬）
// ─────────────────────────────────────────────────────────────────────────────

export const Horizontal: Story = {
  render: () => ({
    components: { BaseScrollbar },
    setup() {
      return { rows: WIDE }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar style="height:auto;width:360px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <div style="white-space:nowrap">
            <span v-for="row in rows" :key="row" style="display:inline-block;margin-right:16px;color:#374151;font-size:0.9rem">{{ row }}</span>
          </div>
        </BaseScrollbar>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Both —— 同時垂直 + 水平捲動
// ─────────────────────────────────────────────────────────────────────────────

export const Both: Story = {
  render: () => ({
    components: { BaseScrollbar },
    setup() {
      return { lines: LOREM }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar style="height:220px;width:320px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <div style="width:640px">
            <p v-for="line in lines" :key="line" style="margin:0 0 12px;white-space:nowrap;color:#374151;font-size:0.9rem">{{ line }}</p>
          </div>
        </BaseScrollbar>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --scrollbar-* token 客製外觀
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseScrollbar },
    setup() {
      return { lines: LOREM }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar
          class="themed"
          style="height:220px;width:320px;border:1px solid #1e293b;border-radius:8px;padding:12px;background:#0f172a"
        >
          <p v-for="line in lines" :key="line" style="margin:0 0 12px;color:#cbd5e1;font-size:0.9rem;line-height:1.6">{{ line }}</p>
        </BaseScrollbar>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story: '覆寫 `--scrollbar-size` / `--scrollbar-thumb-bg` / `--scrollbar-track-hover-bg` 即可主題化（此例為深色面板 + 藍色加粗 thumb）。',
      },
    },
  },
  decorators: [
    () => ({
      template: '<div><style>.themed { --scrollbar-size: 10px; --scrollbar-thumb-bg: #60a5fa; --scrollbar-track-hover-bg: rgba(148,163,184,0.25); }</style><story /></div>',
    }),
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Native —— 退回原生捲軸
// ─────────────────────────────────────────────────────────────────────────────

export const Native: Story = {
  render: () => ({
    components: { BaseScrollbar },
    setup() {
      return { lines: LOREM }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseScrollbar native style="height:220px;width:320px;border:1px solid #e5e7eb;border-radius:8px;padding:12px">
          <p v-for="line in lines" :key="line" style="margin:0 0 12px;color:#374151;font-size:0.9rem;line-height:1.6">{{ line }}</p>
        </BaseScrollbar>
        <p style="margin-top:12px;color:#6b7280;font-size:0.8125rem">native 模式：使用瀏覽器原生捲軸，不渲染 overlay。</p>
      </div>
    `,
  }),
}
