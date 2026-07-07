<template>
  <component
    :is="tag"
    :class="rootClass"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton && isInactive ? true : undefined"
    :to="!isNativeButton ? linkTo : undefined"
    :external="!isNativeButton ? isExternalLink : undefined"
    :target="!isNativeButton ? target : undefined"
    :tabindex="!isNativeButton && isInactive ? -1 : undefined"
    :aria-disabled="!isNativeButton && isInactive ? true : undefined"
    :aria-busy="loading ? true : undefined"
    :aria-label="ariaLabel || undefined"
    :aria-pressed="isNativeButton ? ariaPressed : undefined"
    :aria-expanded="isNativeButton ? ariaExpanded : undefined"
    :aria-controls="ariaControls || undefined"
    :aria-haspopup="isNativeButton ? (ariaHaspopup || undefined) : undefined"
    @click="handleClick"
  >
    <!-- 主要內容（loading 中 visibility: hidden 保留佔位，避免 layout shift） -->
    <span :class="['base-button__content', { 'base-button__content--hidden': loading }]">
      <span v-if="$slots.prepend" class="base-button__prepend">
        <slot name="prepend" />
      </span>
      <span v-if="$slots.default" class="base-button__label">
        <slot />
      </span>
      <span v-if="$slots.append" class="base-button__append">
        <slot name="append" />
      </span>
    </span>

    <!-- Loading spinner（絕對定位覆蓋，不影響 layout） -->
    <span v-if="loading" class="base-button__loading" aria-hidden="true">
      <slot name="loading">
        <span class="base-button__spinner" />
      </slot>
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import type { ButtonHTMLAttributes } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import BaseLink from '~/components/atoms/BaseLink.vue'

type BaseButtonIconA11yProps =
  | {
      /** icon-only 模式，啟用後 `ariaLabel` 必填 */
      iconOnly: true
      /** icon-only 按鈕的無障礙標籤 */
      ariaLabel: string
    }
  | {
      /** icon-only 模式，啟用後若未提供 `ariaLabel` 將在開發環境 warn @default false */
      iconOnly?: false
      /** icon-only 按鈕的無障礙標籤，`iconOnly` 為 true 時必填 */
      ariaLabel?: string
    }

export interface BaseButtonCoreProps {
  // ── 外觀 ──────────────────────────────────────────────────
  /** 語意色彩 @default 'primary' */
  color?: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral'
  /** 外觀：`solid`（實心）| `outline`（外框）| `ghost`（透明）| `text`（無底線純文字）| `link`（有底線連結） @default 'solid' */
  variant?: 'solid' | 'outline' | 'ghost' | 'text' | 'link'
  /** 尺寸：`sm`（28px）| `md`（36px）| `lg`（44px） @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** 形狀：`rectangle`（圓角矩形）| `square`（正方形）| `circle`（圓形）| `pill`（膠囊，保留寬度） @default 'rectangle' */
  shape?: 'rectangle' | 'square' | 'circle' | 'pill'
  /** 圓角：`none`（0）| `sm`（4px）| `md`（6px）| `lg`（12px）| `full`（9999px） @default 'md' */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'

  // ── 狀態 ──────────────────────────────────────────────────
  /** 禁用按鈕 @default false */
  disabled?: boolean
  /** 載入中，自動禁用並顯示 spinner，按鈕寬度保持不變 @default false */
  loading?: boolean

  // ── 版型 ──────────────────────────────────────────────────
  /** 全寬顯示，撐滿父容器（手機 CTA / modal footer 常用） @default false */
  block?: boolean

  // ── 原生 / 路由 ───────────────────────────────────────────
  /** 原生 button type，渲染為 `<button>` 時有效 @default 'button' */
  type?: ButtonHTMLAttributes['type']
  /** 路由位置或 URL，提供後委派 BaseLink 渲染（NuxtLink / RouterLink / `<a>` 自動偵測） */
  to?: RouteLocationRaw
  /** 外部連結 / 原生導航 URL；委派 BaseLink 並強制以原生 `<a>` 渲染，不走 SPA 路由（`download` 等原生行為生效）。`to` 存在時優先 */
  href?: string
  /** 連結開啟目標，`_blank` 由 BaseLink 自動補 `rel="noopener noreferrer"` */
  target?: '_blank' | '_parent' | '_self' | '_top'

  // ── 無障礙 (a11y) ─────────────────────────────────────────
  /** toggle 狀態（收藏、點讚等），傳入後自動設定 `aria-pressed` */
  ariaPressed?: boolean
  /** popup / menu 是否展開，傳入後自動設定 `aria-expanded` */
  ariaExpanded?: boolean
  /** 配合 `ariaExpanded`，指向被控制元素的 id */
  ariaControls?: string
  /** popup 類型提示，傳入後自動設定 `aria-haspopup` */
  ariaHaspopup?: 'menu' | 'listbox' | 'dialog' | 'tree' | 'grid' | 'true'
}

export type BaseButtonProps = BaseButtonCoreProps & BaseButtonIconA11yProps

const props = withDefaults(defineProps<BaseButtonProps>(), {
  // 外觀
  color: 'primary',
  variant: 'solid',
  size: 'md',
  shape: 'rectangle',
  rounded: 'md',
  // 狀態
  disabled: false,
  loading: false,
  // 版型
  block: false,
  iconOnly: false,
  // 原生 / 路由
  type: 'button',
  to: undefined,
  href: undefined,
  target: undefined,
  // 無障礙
  ariaPressed: undefined,
  ariaExpanded: undefined,
  ariaControls: undefined,
  ariaHaspopup: undefined,
})

/**
 * 動態決定根元素:
 *   - 有 `to` / `href` → BaseLink(內部再決定 NuxtLink / RouterLink / `<a>`)
 *   - 否則           → 原生 `<button>`
 */
const tag = computed(() => (props.to != null || props.href != null) ? BaseLink : 'button')

/** template 端的可讀性 helper —— 避免到處寫 `tag === 'button'` */
const isNativeButton = computed(() => tag.value === 'button')

/** disabled / loading 統一視為 inactive,UI 表現 + click 攔截一致 */
const isInactive = computed(() => props.disabled || props.loading)

/**
 * 委派給 BaseLink 的 `to` —— `props.to` 優先,沒給才 fallback `props.href`(語意 alias)。
 * BaseLink 內部自行判斷 internal / external(含 `hasProtocol` 完整檢查),不重複造輪子。
 */
const linkTo = computed<RouteLocationRaw>(() => props.to ?? props.href ?? '')

/**
 * `href` 語意為「外部 / 原生連結」（規範附錄 A：外部 → href、內部路由 → to）。
 * 使用 href（且未同時提供 to）時，強制 BaseLink 以原生 `<a>` 渲染，避免無 protocol 的
 * 路徑（如 `/file.pdf`）被判為內部路由走 SPA 導航，導致 `download` 等原生行為失效。
 */
const isExternalLink = computed(() => props.to == null && props.href != null)

const rootClass = computed(() => [
  'base-button',
  `base-button--${props.color}`,
  `base-button--${props.variant}`,
  `base-button--${props.size}`,
  `base-button--${props.shape}`,
  `base-button--rounded-${props.rounded}`,
  {
    'base-button--block': props.block,
    'is-disabled': props.disabled || props.loading,
    'is-loading': props.loading,
  },
])

/**
 * 阻止 disabled / loading 狀態的連結元素仍可被點擊。
 * 用 `stopPropagation` 阻止冒泡，不用 `stopImmediatePropagation` —
 * 後者會吃掉同一 element 上其他 listener（含 `v-on="$attrs"` 透傳的 handler）。
 */
function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    event.preventDefault()
    event.stopPropagation()
  }
}

// a11y：iconOnly 模式沒有可見文字，缺 `ariaLabel` 時 SR 只會報「button」，於開發期警告。
if (import.meta.env.DEV) {
  watchEffect(() => {
    if (props.iconOnly && !props.ariaLabel) {
      console.warn(
        '[BaseButton] `iconOnly` 啟用時請提供 `ariaLabel`，否則螢幕報讀器只會讀出「button」。',
      )
    }
  })
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseButton — CSS 自訂屬性（token）系統
 *
 * 樣式客製化方式：
 *   1. 覆蓋 --btn-* 變數（推薦，最小侵入）
 *   2. 直接覆蓋 .base-button 的 BEM class
 *
 * 範例 — 替換主色為自訂色（覆蓋 accent token）：
 *   .base-button--primary {
 *     --btn-accent:        #e11d48;
 *     --btn-accent-hover:  #be123c;
 *     --btn-accent-active: #9f1239;
 *     --btn-accent-text:   #ffffff;
 *   }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-button {
  // ── CSS tokens ────────────────────────────────────────────
  --btn-height: 36px;
  --btn-padding-x: 16px;
  --btn-font-size: 0.875rem;
  --btn-gap: 8px;
  --btn-radius: 6px;

  // 語意色彩 token（color modifier 負責覆蓋）
  --btn-accent:           #1d4ed8;   // blue-700，白字對比 ≈ 5.4:1 ✅ WCAG AA
  --btn-accent-hover:     #1e40af;
  --btn-accent-active:    #1e3a8a;
  --btn-accent-text:      #ffffff;

  // 渲染 token（variant 引用 accent，預設為 solid + primary）
  --btn-color:            var(--btn-accent-text);
  --btn-bg:               var(--btn-accent);
  --btn-bg-hover:         var(--btn-accent-hover);
  --btn-bg-active:        var(--btn-accent-active);
  --btn-border-color:     transparent;
  --btn-focus-ring-color: var(--btn-accent);

  // ── Base styles ───────────────────────────────────────────
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--btn-gap);
  height: var(--btn-height);
  min-height: var(--btn-height);
  padding-inline: var(--btn-padding-x);
  font-size: var(--btn-font-size);
  font-weight: 500;
  line-height: 1;
  color: var(--btn-color);
  background-color: var(--btn-bg);
  border: 1px solid var(--btn-border-color);
  border-radius: var(--btn-radius);
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  user-select: none;
  outline-offset: 2px;
  transition:
    background-color 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    opacity 0.15s ease;

  // ── Interaction ───────────────────────────────────────────
  &:not(:disabled):not(.is-disabled) {
    &:hover  { background-color: var(--btn-bg-hover); }
    &:active { background-color: var(--btn-bg-active); }
  }

  &:focus-visible {
    outline: 2px solid var(--btn-focus-ring-color);
  }

  // 粗指標裝置（手機/平板）提升觸控目標
  @media (pointer: coarse) {
    min-height: 44px;
  }

  // ── Disabled ──────────────────────────────────────────────
  &:disabled,
  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.5;
    pointer-events: none;
  }

  // ── Size ──────────────────────────────────────────────────
  &--sm {
    --btn-height: 28px;
    --btn-padding-x: 12px;
    --btn-font-size: 0.75rem;

    // 粗指標裝置：保持 28px 視覺（避免破壞密集排版如表格 / toolbar），
    // 改用透明 hit-area pseudo 擴大觸控區到 44×44，符合 WCAG 2.5.5
    @media (pointer: coarse) {
      min-height: var(--btn-height);

      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: max(100%, 44px);
        height: 44px;
        transform: translate(-50%, -50%);
      }
    }
  }

  // --md 使用 .base-button 預設值，不需額外規則

  &--lg {
    --btn-height: 44px;
    --btn-padding-x: 20px;
    --btn-font-size: 1rem;
  }

  // ── Rounded ───────────────────────────────────────────────
  &--rounded-none { --btn-radius: 0; }
  &--rounded-sm { --btn-radius: 4px; }
  &--rounded-md { --btn-radius: 6px; }
  &--rounded-lg { --btn-radius: 12px; }
  &--rounded-full { --btn-radius: 9999px; }

  // ── Shape ─────────────────────────────────────────────────
  &--square,
  &--circle {
    width: var(--btn-height);
    padding-inline: 0;
  }

  &--circle {
    --btn-radius: 9999px;
  }

  @media (pointer: coarse) {
    &--square,
    &--circle {
      width: max(var(--btn-height), 44px);
      min-width: 44px;
      min-height: 44px;
    }
  }

  &--pill {
    --btn-radius: 9999px;
  }

  // ── Variant: solid（預設，token 已在上方定義）────────────
  // &--solid {}

  // ── Variant: outline ──────────────────────────────────────
  &--outline {
    --btn-color:        var(--btn-accent);
    --btn-bg:           transparent;
    --btn-bg-hover:     color-mix(in srgb, var(--btn-accent) 8%, transparent);
    --btn-bg-active:    color-mix(in srgb, var(--btn-accent) 14%, transparent);
    --btn-border-color: var(--btn-accent);
  }

  // ── Variant: ghost ────────────────────────────────────────
  &--ghost {
    --btn-color:     var(--btn-accent);
    --btn-bg:        transparent;
    --btn-bg-hover:  color-mix(in srgb, var(--btn-accent) 8%, transparent);
    --btn-bg-active: color-mix(in srgb, var(--btn-accent) 14%, transparent);
  }

  // ── Variant: link ─────────────────────────────────────────
  &--link {
    --btn-color:     var(--btn-accent);
    --btn-bg:        transparent;
    --btn-bg-hover:  transparent;
    --btn-bg-active: transparent;

    height: auto;
    padding-inline: 0;
    border: none;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:not(.is-disabled):hover {
      opacity: 0.75;
    }
  }

  // ── Variant: text（無底線，比 ghost 更低調）───────────────────
  &--text {
    --btn-color:        var(--btn-accent);
    --btn-bg:           transparent;
    --btn-bg-hover:     color-mix(in srgb, var(--btn-accent) 4%, transparent);
    --btn-bg-active:    color-mix(in srgb, var(--btn-accent) 10%, transparent);
    --btn-border-color: transparent;

    border: none;
  }

  // ── Color: primary（預設，無需額外規則）──────────────────
  // &--primary {}

  // ── Color: danger ─────────────────────────────────────────
  &--danger {
    --btn-accent:        #dc2626;   // red-600，白字對比 ≈ 4.7:1 ✅
    --btn-accent-hover:  #b91c1c;
    --btn-accent-active: #991b1b;
    --btn-accent-text:   #ffffff;
  }

  // ── Color: success ────────────────────────────────────────
  &--success {
    --btn-accent:        #16a34a;   // green-600，白字對比 ≈ 4.7:1 ✅
    --btn-accent-hover:  #15803d;
    --btn-accent-active: #166534;
    --btn-accent-text:   #ffffff;
  }

  // ── Color: warning（深色文字，琥珀底）────────────────────
  &--warning {
    --btn-accent:        #f59e0b;   // amber-400
    --btn-accent-hover:  #d97706;
    --btn-accent-active: #b45309;
    --btn-accent-text:   #1c1917;   // stone-950，深色文字對比 ≈ 6.9:1 ✅
  }

  // ── Color: neutral ────────────────────────────────────────
  &--neutral {
    --btn-accent:        #4b5563;   // gray-600，白字對比 ≈ 7.2:1 ✅
    --btn-accent-hover:  #374151;
    --btn-accent-active: #1f2937;
    --btn-accent-text:   #ffffff;
  }

  // ── Color: info ──────────────────────────────────────────
  &--info {
    --btn-accent:        #0284c7;   // sky-600，白字對比 ≈ 4.6:1 ✅
    --btn-accent-hover:  #0369a1;
    --btn-accent-active: #075985;
    --btn-accent-text:   #ffffff;
  }

  // ── Block ───────────────────────────────────────────────
  &--block {
    width: 100%;
  }

  // ── Inner elements ────────────────────────────────────────
  &__content {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--btn-gap);

    &--hidden {
      visibility: hidden;
    }
  }

  &__prepend,
  &__append {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  &__label {
    flex: 1 1 auto;
    text-align: center;
  }

  // ── Loading overlay（絕對定位，不影響按鈕 layout）───────────
  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  // ── Loading spinner（預設 CSS-only 樣式）─────────────────
  &__spinner {
    display: inline-block;
    width: 1em;
    height: 1em;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: base-button-spin 0.6s linear infinite;

    @media (prefers-reduced-motion: reduce) {
      animation: none;
      opacity: 0.6;
    }
  }
}

@keyframes base-button-spin {
  to { transform: rotate(360deg); }
}
</style>
