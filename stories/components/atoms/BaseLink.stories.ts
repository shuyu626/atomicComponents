import type { StoryObj } from '@storybook/vue3-vite'
import BaseLink from '~/components/atoms/BaseLink.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// 注意：Storybook 預覽環境（.storybook/preview.ts）內已註冊 NuxtLink stub，
// BaseLink 走 NuxtLink 分支會渲染成最小 <a>。Stories 內部請用 string `to`，
// 避免在無 router context 觸發 `router.resolve(routeObject)` 邊界 case。

const meta = {
  title: 'Atoms/BaseLink',
  component: BaseLink,
  tags: ['autodocs'],
  argTypes: {
    to: {
      control: { type: 'text' },
      description: '路由位置（內部）或 URL 字串（外部）',
    },
    target: {
      control: { type: 'select' },
      options: [undefined, '_self', '_blank', '_parent', '_top'],
      description: '連結開啟目標，_blank 自動補 rel="noopener noreferrer"',
    },
    external: {
      control: 'boolean',
      description: '強制視為外部連結（即使 to 是相對路徑）',
    },
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseLink },
    setup() { return { args } },
    template: '<BaseLink v-bind="args">Link text</BaseLink>',
  }),
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground — 所有 controls 皆可操作
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    to:       '/products',
    target:   undefined,
    external: false,
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal route — 透過 NuxtLink / RouterLink fallback
// ─────────────────────────────────────────────────────────────────────────────

export const Internal: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <BaseLink to="/products">前往產品列表</BaseLink>
        <BaseLink to="/about">關於我們</BaseLink>
        <BaseLink to="/blog/2026-best-practices">深層路徑</BaseLink>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// External URL — 命中 hasProtocol 規則，渲染為 <a>
// ─────────────────────────────────────────────────────────────────────────────

export const External: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <BaseLink to="https://vuejs.org">Vue.js 官網</BaseLink>
        <BaseLink to="https://nuxt.com">Nuxt 官網</BaseLink>
        <BaseLink to="//cdn.example.com/asset">Protocol-relative URL</BaseLink>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// New tab — target="_blank" 自動補 rel="noopener noreferrer"
// ─────────────────────────────────────────────────────────────────────────────

export const NewTab: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <BaseLink to="https://vuejs.org" target="_blank">
          Vue.js（新分頁，自動補 rel）
        </BaseLink>
        <BaseLink to="https://github.com" target="_blank">
          GitHub（新分頁）
        </BaseLink>
        <p style="font-size:12px;color:#6b7280;margin:8px 0 0">
          檢查 DOM：自動附加 rel="noopener noreferrer"，防止 window.opener 攻擊
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Special protocols — mailto / tel
// ─────────────────────────────────────────────────────────────────────────────

export const SpecialProtocols: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <BaseLink to="mailto:hello@example.com">寄信給我們</BaseLink>
        <BaseLink to="tel:+886912345678">+886 912 345 678</BaseLink>
        <BaseLink to="sms:+886912345678">傳簡訊</BaseLink>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Force external — external prop 將相對路徑視為外部
// ─────────────────────────────────────────────────────────────────────────────

export const ForceExternal: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <BaseLink external to="/legacy-page">
          舊版頁面（用 external 強制 full reload）
        </BaseLink>
        <BaseLink external to="/admin">
          Admin 頁面（跳脫 SPA 路由）
        </BaseLink>
        <p style="font-size:12px;color:#6b7280;margin:8px 0 0">
          適用情境：legacy page、跨子網域、需要完整頁面 reload 的特例
        </p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Slot composition — icon + text
// ─────────────────────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:12px;padding:16px;font-family:system-ui;font-size:14px">
        <BaseLink to="https://github.com" target="_blank" style="display:inline-flex;align-items:center;gap:6px;width:fit-content;color:#1d4ed8">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.69-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.67 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18.92-.26 1.91-.39 2.89-.39.98 0 1.97.13 2.89.39 2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.82 1.18 3.07 0 4.4-2.69 5.37-5.25 5.66.41.35.78 1.05.78 2.12v3.15c0 .31.21.67.79.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/>
          </svg>
          GitHub
        </BaseLink>

        <BaseLink to="https://twitter.com" target="_blank" style="display:inline-flex;align-items:center;gap:6px;width:fit-content;color:#1d4ed8">
          Twitter
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
          </svg>
        </BaseLink>

        <BaseLink to="/docs" style="color:#1d4ed8">純文字內部連結（無 icon）</BaseLink>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Default styles — BaseLink 不內建樣式，由 caller 控制
// ─────────────────────────────────────────────────────────────────────────────

export const Unstyled: Story = {
  render: () => ({
    components: { BaseLink },
    template: `
      <div style="display:flex;flex-direction:column;gap:8px;padding:16px;font-family:system-ui">
        <p style="font-size:12px;color:#6b7280;margin:0 0 8px">
          BaseLink 採「最薄適配層」設計，不內建樣式，繼承瀏覽器預設 &lt;a&gt; / NuxtLink 樣式。
          視覺由 caller 或外層元件（如 BaseButton variant="link"）負責。
        </p>
        <BaseLink to="https://vuejs.org" target="_blank">
          預設樣式（瀏覽器藍色底線）
        </BaseLink>
      </div>
    `,
  }),
}
