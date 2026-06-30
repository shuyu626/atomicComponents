import type { StoryObj } from '@storybook/vue3-vite'
import BaseAvatarGroup from '~/components/atoms/BaseAvatarGroup.vue'
import BaseAvatar from '~/components/atoms/BaseAvatar.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseAvatarGroup 把一組 <BaseAvatar> 重疊堆疊，超出 max 的數量收斂成 +N。
// size / rounded 會統一覆寫群組內每個 avatar。重疊量 / 描邊走 --avatar-group-* token。
// 建議由使用端傳 aria-label 給群組命名（role="group"）。

const PEOPLE = [11, 12, 13, 14, 15, 16].map((img, i) => ({
  src: `https://i.pravatar.cc/120?img=${img}`,
  alt: `Member ${i + 1}`,
}))

const meta = {
  title: 'Atoms/BaseAvatarGroup',
  component: BaseAvatarGroup,
  tags: ['autodocs'],
  argTypes: {
    max: {
      control: { type: 'number', min: 1, max: 8 },
      description: '最多顯示幾個，超出收斂成 +N。小於 1 夾為 1。預設 3',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 64],
      description: '統一覆寫每個 avatar 的尺寸。預設 md',
    },
    rounded: {
      control: { type: 'select' },
      options: ['full', 0, 8, 16],
      description: '統一覆寫每個 avatar 的圓角。預設 full',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板調整 max / size / rounded
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: { max: 3, size: 'md', rounded: 'full' },
  render: (args: Record<string, unknown>) => ({
    components: { BaseAvatarGroup, BaseAvatar },
    setup() {
      return { args, people: PEOPLE }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseAvatarGroup v-bind="args" aria-label="專案成員">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Default —— 全部顯示（count <= max）
// ─────────────────────────────────────────────────────────────────────────────

export const Default: Story = {
  render: () => ({
    components: { BaseAvatarGroup, BaseAvatar },
    setup() {
      return { people: PEOPLE.slice(0, 3) }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseAvatarGroup :max="5" aria-label="專案成員">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Overflow —— 超出 max 收斂成 +N
// ─────────────────────────────────────────────────────────────────────────────

export const Overflow: Story = {
  render: () => ({
    components: { BaseAvatarGroup, BaseAvatar },
    setup() {
      return { people: PEOPLE }
    },
    template: `
      <div style="padding:24px;font-family:system-ui">
        <BaseAvatarGroup :max="3" aria-label="專案成員">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '6 人、`max=3`：顯示前 3 個，其餘收斂成 `+3`（DOM 順序＝閱讀順序）。' },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes —— 群組統一尺寸
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseAvatarGroup, BaseAvatar },
    setup() {
      return { people: PEOPLE }
    },
    template: `
      <div style="display:flex;flex-direction:column;gap:20px;padding:24px;font-family:system-ui">
        <BaseAvatarGroup :max="4" size="sm" aria-label="成員 small">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
        <BaseAvatarGroup :max="4" size="md" aria-label="成員 medium">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
        <BaseAvatarGroup :max="4" size="lg" aria-label="成員 large">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --avatar-group-* token（重疊量 / 描邊）
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseAvatarGroup, BaseAvatar },
    setup() {
      return { people: PEOPLE }
    },
    template: `
      <div style="padding:24px;font-family:system-ui;background:#0f172a">
        <BaseAvatarGroup :max="4" size="lg" class="tight" aria-label="成員">
          <BaseAvatar v-for="p in people" :key="p.alt" :src="p.src" :alt="p.alt" />
        </BaseAvatarGroup>
        <style>.tight { --avatar-group-overlap: 1.5rem; --avatar-group-ring: 2px solid #0f172a; }</style>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: { story: '覆寫 `--avatar-group-overlap`（加大重疊）與 `--avatar-group-ring`（描邊配深色底）。' },
    },
  },
}
