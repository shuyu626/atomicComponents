import type { StoryObj } from '@storybook/vue3-vite'
import BaseButton from '~/components/atoms/BaseButton.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Atoms/BaseButton',
  component: BaseButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outline', 'ghost', 'text', 'link'],
      description: '按鈕外觀風格',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'danger', 'success', 'warning', 'info', 'neutral'],
      description: '語意色彩',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: '尺寸',
    },
    shape: {
      control: { type: 'select' },
      options: ['rectangle', 'square', 'circle', 'pill'],
      description: '形狀',
    },
    rounded: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg', 'full'],
      description: '圓角等級',
    },
    disabled: { control: 'boolean' },
    loading:  { control: 'boolean' },
    block:    { control: 'boolean' },
    iconOnly: { control: 'boolean' },
    type: {
      control: { type: 'select' },
      options: ['button', 'submit', 'reset'],
    },
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseButton },
    setup() { return { args } },
    template: '<BaseButton v-bind="args">Button</BaseButton>',
  }),
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground — 所有 controls 皆可操作
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    variant:  'solid',
    color:    'primary',
    size:     'md',
    shape:    'rectangle',
    rounded:  'md',
    disabled: false,
    loading:  false,
    block:    false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Variants — 5 種外觀風格（同一色彩）
// ─────────────────────────────────────────────────────────────────────────────

export const Variants: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px">
        <BaseButton variant="solid">Solid</BaseButton>
        <BaseButton variant="outline">Outline</BaseButton>
        <BaseButton variant="ghost">Ghost</BaseButton>
        <BaseButton variant="text">Text</BaseButton>
        <BaseButton variant="link">Link</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors — 6 種語意色彩（solid variant）
// ─────────────────────────────────────────────────────────────────────────────

export const Colors: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px">
        <BaseButton color="primary">Primary</BaseButton>
        <BaseButton color="danger">Danger</BaseButton>
        <BaseButton color="success">Success</BaseButton>
        <BaseButton color="warning">Warning</BaseButton>
        <BaseButton color="info">Info</BaseButton>
        <BaseButton color="neutral">Neutral</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Colors × Variants matrix
// ─────────────────────────────────────────────────────────────────────────────

export const ColorVariantMatrix: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:grid;grid-template-columns:repeat(5,auto);gap:8px;padding:16px;width:fit-content">
        <BaseButton variant="solid"   color="primary">Solid</BaseButton>
        <BaseButton variant="outline" color="primary">Outline</BaseButton>
        <BaseButton variant="ghost"   color="primary">Ghost</BaseButton>
        <BaseButton variant="text"    color="primary">Text</BaseButton>
        <BaseButton variant="link"    color="primary">Link</BaseButton>

        <BaseButton variant="solid"   color="danger">Solid</BaseButton>
        <BaseButton variant="outline" color="danger">Outline</BaseButton>
        <BaseButton variant="ghost"   color="danger">Ghost</BaseButton>
        <BaseButton variant="text"    color="danger">Text</BaseButton>
        <BaseButton variant="link"    color="danger">Link</BaseButton>

        <BaseButton variant="solid"   color="success">Solid</BaseButton>
        <BaseButton variant="outline" color="success">Outline</BaseButton>
        <BaseButton variant="ghost"   color="success">Ghost</BaseButton>
        <BaseButton variant="text"    color="success">Text</BaseButton>
        <BaseButton variant="link"    color="success">Link</BaseButton>

        <BaseButton variant="solid"   color="warning">Solid</BaseButton>
        <BaseButton variant="outline" color="warning">Outline</BaseButton>
        <BaseButton variant="ghost"   color="warning">Ghost</BaseButton>
        <BaseButton variant="text"    color="warning">Text</BaseButton>
        <BaseButton variant="link"    color="warning">Link</BaseButton>

        <BaseButton variant="solid"   color="info">Solid</BaseButton>
        <BaseButton variant="outline" color="info">Outline</BaseButton>
        <BaseButton variant="ghost"   color="info">Ghost</BaseButton>
        <BaseButton variant="text"    color="info">Text</BaseButton>
        <BaseButton variant="link"    color="info">Link</BaseButton>

        <BaseButton variant="solid"   color="neutral">Solid</BaseButton>
        <BaseButton variant="outline" color="neutral">Outline</BaseButton>
        <BaseButton variant="ghost"   color="neutral">Ghost</BaseButton>
        <BaseButton variant="text"    color="neutral">Text</BaseButton>
        <BaseButton variant="link"    color="neutral">Link</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Sizes
// ─────────────────────────────────────────────────────────────────────────────

export const Sizes: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;padding:16px">
        <BaseButton size="sm">Small (28px)</BaseButton>
        <BaseButton size="md">Medium (36px)</BaseButton>
        <BaseButton size="lg">Large (44px)</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────

export const Shapes: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;padding:16px">
        <BaseButton shape="rectangle" size="lg">Rectangle</BaseButton>
        <BaseButton shape="pill"      size="lg">Pill</BaseButton>
        <BaseButton shape="square"    size="lg">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </BaseButton>
        <BaseButton shape="circle"    size="lg" icon-only aria-label="Add item">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Rounded
// ─────────────────────────────────────────────────────────────────────────────

export const Rounded: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px">
        <BaseButton rounded="none">Rounded none</BaseButton>
        <BaseButton rounded="sm">Rounded sm</BaseButton>
        <BaseButton rounded="md">Rounded md</BaseButton>
        <BaseButton rounded="lg">Rounded lg</BaseButton>
        <BaseButton rounded="full">Rounded full</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// States — disabled / loading
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:24px;flex-wrap:wrap;padding:16px">
        <div style="display:flex;flex-direction:column;gap:8px">
          <span style="font-size:12px;color:#6b7280;margin-bottom:4px">Disabled</span>
          <div style="display:flex;gap:8px;align-items:center">
            <BaseButton disabled>Solid</BaseButton>
            <BaseButton variant="outline" disabled>Outline</BaseButton>
            <BaseButton variant="ghost"   disabled>Ghost</BaseButton>
            <BaseButton variant="text"    disabled>Text</BaseButton>
            <BaseButton variant="link"    disabled>Link</BaseButton>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <span style="font-size:12px;color:#6b7280;margin-bottom:4px">Loading</span>
          <div style="display:flex;gap:8px;align-items:center">
            <BaseButton loading>Solid</BaseButton>
            <BaseButton variant="outline" loading>Outline</BaseButton>
            <BaseButton variant="ghost"   loading>Ghost</BaseButton>
            <BaseButton variant="text"    loading>Text</BaseButton>
          </div>
        </div>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Block — 全寬
// ─────────────────────────────────────────────────────────────────────────────

export const Block: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="padding:16px;max-width:400px;display:flex;flex-direction:column;gap:8px">
        <BaseButton block>Full width button</BaseButton>
        <BaseButton block variant="outline">Full width outline</BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// With icons — prepend / append slots
// ─────────────────────────────────────────────────────────────────────────────

export const WithIcons: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px">
        <BaseButton>
          <template #prepend>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </template>
          New item
        </BaseButton>

        <BaseButton>
          Send
          <template #append>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
          </template>
        </BaseButton>

        <BaseButton variant="outline" color="danger">
          <template #prepend>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
            </svg>
          </template>
          Delete
        </BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Icon only — shape="circle" with ariaLabel
// ─────────────────────────────────────────────────────────────────────────────

export const IconOnly: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;padding:16px">
        <BaseButton shape="circle" size="sm" icon-only aria-label="Add item (small)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </BaseButton>

        <BaseButton shape="circle" size="md" icon-only aria-label="Add item (medium)">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </BaseButton>

        <BaseButton shape="circle" size="lg" icon-only aria-label="Add item (large)">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </BaseButton>

        <BaseButton shape="circle" variant="outline" size="md" icon-only aria-label="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </BaseButton>

        <BaseButton shape="circle" variant="ghost" color="danger" size="md" icon-only aria-label="Delete">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
          </svg>
        </BaseButton>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// As link — renders as <a> with href
// ─────────────────────────────────────────────────────────────────────────────

export const AsLink: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:16px">
        <BaseButton href="https://vuejs.org" target="_blank">
          Vue.js 官網
          <template #append>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
            </svg>
          </template>
        </BaseButton>

        <BaseButton href="https://nuxt.com" target="_blank" variant="outline">
          Nuxt 官網（外開）
        </BaseButton>

        <BaseButton href="/docs" variant="ghost">內部連結</BaseButton>
        <BaseButton href="/learn-more" variant="link">了解更多</BaseButton>
      </div>
    `,
  }),
}
