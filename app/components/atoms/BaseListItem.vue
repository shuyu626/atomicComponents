<template>
  <!--
    列表項目。根一律是 <li>。內容區 __content 為 flex row：prepend + body + append。
    有 to / href → __content 用 <BaseLink> 包整列（鍵盤 / 焦點 / 安全性交給 BaseLink）；
    無 → 用 <div>。size / divided 由父層 BaseList 注入，standalone 時降級為 md / 不分隔。
  -->
  <li
    class="base-list-item"
    :class="rootClass"
    role="listitem"
  >
    <component
      :is="isInteractive ? BaseLink : 'div'"
      class="base-list-item__content"
      :to="isInteractive ? linkTarget : undefined"
      :aria-current="isInteractive && active ? 'true' : undefined"
      :aria-disabled="isInteractive && disabled ? 'true' : undefined"
      :tabindex="isInteractive && disabled ? -1 : undefined"
    >
      <span
        v-if="slots.prepend"
        class="base-list-item__prepend"
      >
        <slot name="prepend" />
      </span>

      <span class="base-list-item__body">
        <!-- 有 #subtitle → 兩行（標題 + 次要說明）；否則維持單行（default slot 直接放，不變 DOM）。 -->
        <template v-if="slots.subtitle">
          <span class="base-list-item__title"><slot /></span>
          <span class="base-list-item__subtitle"><slot name="subtitle" /></span>
        </template>
        <slot v-else />
      </span>

      <span
        v-if="slots.append"
        class="base-list-item__append"
      >
        <slot name="append" />
      </span>
    </component>
  </li>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { VNode } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import BaseLink from '~/components/atoms/BaseLink.vue'
import { BASE_LIST_INJECT_KEY } from '~/components/atoms/BaseList.vue'

export interface BaseListItemProps {
  /** router 目標（內部連結）；有 `to` 或 `href` 其一則整列可點 */
  to?: string | Record<string, unknown>
  /** 外部連結 URL；有 `to` 或 `href` 其一則整列可點 */
  href?: string
  /**
   * 目前 / 選中高亮。連結項時對連結加 `aria-current="true"`。
   * @default false
   */
  active?: boolean
  /**
   * 禁用：連結項不可點（aria-disabled + pointer-events:none + 移出 tab 順序）。
   * @default false
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseListItemProps>(), {
  to: undefined,
  href: undefined,
  active: false,
  disabled: false,
})

const slots = defineSlots<{
  /** 前置區（icon / avatar / checkbox…） */
  prepend?: () => VNode[]
  /** 主要內容（有 `#subtitle` 時作為標題行） */
  default?: () => VNode[]
  /** 次要說明行；提供時項目變兩行（標題 + 副標） */
  subtitle?: () => VNode[]
  /** 後置區（次要文字 / 操作 / chevron…） */
  append?: () => VNode[]
}>()

// 父層 BaseList context；standalone（無 context）時降級為 size 'md'、divided false、square。
const context = inject(BASE_LIST_INJECT_KEY, null)
const size = computed(() => context?.size.value ?? 'md')
const itemShape = computed(() => context?.itemShape.value ?? 'square')
// 分隔線僅 square 形狀有效（rounded / shaped 用間距分隔，不畫線）。
const divided = computed(() => (context?.divided.value ?? false) && itemShape.value === 'square')

// 有 to 或 href → 整列可點（用 BaseLink 渲染）。
const isInteractive = computed(() => props.to != null || props.href != null)

// to / href 收斂成單一目標交給 BaseLink：內部 / 外部由 BaseLink 依 protocol 自行判斷。
const linkTarget = computed<RouteLocationRaw | undefined>(
  () => (props.to ?? props.href) as RouteLocationRaw | undefined,
)

/** 組裝 BEM modifier：尺寸（來自 context）/ 高亮 / 禁用 / 可點 / 分隔線 / 形狀。 */
const rootClass = computed(() => [
  `base-list-item--${size.value}`,
  {
    'base-list-item--active': props.active,
    'base-list-item--disabled': props.disabled,
    'base-list-item--interactive': isInteractive.value,
    'base-list-item--divided': divided.value,
    // square 為預設，不輸出形狀 class（維持既有 DOM）。
    [`base-list-item--shape-${itemShape.value}`]: itemShape.value !== 'square',
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseListItem — 列表項目
 *
 * 內距 / 字級隨 size modifier（sm / md / lg，來自 BaseList context）切換；
 * 外觀走 --list-item-* token，覆寫即可主題化：
 *
 *   .base-list-item { --list-item-active-bg: #dbeafe; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。
 * standalone 使用時，--list-color / --list-divider-color 未定義由 var() fallback 補上。
 */
:where(.base-list-item) {
  --list-item-padding-y: 10px;
  --list-item-padding-x: 12px;
  --list-item-font-size: 0.875rem;
  --list-item-gap: 0.75rem;
  --list-item-hover-bg: #f9fafb; // gray-50
  --list-item-active-bg: #eff6ff; // blue-50
  --list-item-active-color: #1d4ed8; // blue-700
  --list-item-radius: 8px; // rounded / shaped 導覽模式的藥丸圓角
  --list-item-subtitle-color: #6b7280; // gray-500，副標次要色

  font-size: var(--list-item-font-size);
  color: var(--list-color, #1f2937);
}

/* ── 尺寸級距（padding 對齊 BaseTable cell 級距）──────── */
:where(.base-list-item--sm) {
  --list-item-padding-y: 6px;
  --list-item-padding-x: 10px;
  --list-item-font-size: 0.8125rem;
}

:where(.base-list-item--md) {
  --list-item-padding-y: 10px;
  --list-item-padding-x: 12px;
  --list-item-font-size: 0.875rem;
}

:where(.base-list-item--lg) {
  --list-item-padding-y: 14px;
  --list-item-padding-x: 16px;
  --list-item-font-size: 1rem;
}

/* ── 分隔線：相鄰兩個 divided item 之間畫 border-top（第一項前不畫）── */
.base-list-item--divided + .base-list-item--divided {
  border-top: 1px solid var(--list-divider-color, #e5e7eb);
}

/* ── 內容區（flex row）──────────────────────────────── */
.base-list-item__content {
  display: flex;
  align-items: center;
  gap: var(--list-item-gap);
  padding: var(--list-item-padding-y) var(--list-item-padding-x);
  color: inherit;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--list-item-active-color, #1d4ed8);
    outline-offset: -2px;
  }
}

.base-list-item__prepend,
.base-list-item__append {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.base-list-item__body {
  // 撐滿中間、允許內容 truncate 不撐爆列。
  flex: 1 1 auto;
  min-width: 0;
}

/* ── 兩行：標題 + 副標 ─────────────────────────────────── */
.base-list-item__title {
  display: block;
}

.base-list-item__subtitle {
  display: block;
  margin-top: 2px;
  font-size: 0.85em;
  line-height: 1.3;
  color: var(--list-item-subtitle-color, #6b7280);
}

/* ── 可點（有 to / href）────────────────────────────── */
.base-list-item--interactive {
  cursor: pointer;
}

.base-list-item--interactive .base-list-item__content {
  transition: background-color 0.15s ease;
}

.base-list-item--interactive:not(.base-list-item--disabled)
  .base-list-item__content:hover {
  background-color: var(--list-item-hover-bg, #f9fafb);
}

/* ── 高亮（active）──────────────────────────────────── */
.base-list-item--active .base-list-item__content {
  background-color: var(--list-item-active-bg, #eff6ff);
  color: var(--list-item-active-color, #1d4ed8);
}

/* ── 禁用 ───────────────────────────────────────────── */
.base-list-item--disabled {
  cursor: not-allowed;
  opacity: 0.5;

  .base-list-item__content {
    pointer-events: none;
  }
}

/* ── 導覽形狀：圓角 / 單邊藥丸高亮（來自 BaseList itemShape）─────── */
.base-list-item--shape-rounded .base-list-item__content {
  border-radius: var(--list-item-radius, 8px);
}

.base-list-item--shape-shaped .base-list-item__content {
  // 單邊藥丸：leading 端平齊、trailing 端全圓（logical 屬性，RTL 友善）。
  // 註：Vuetify 的 `shaped` 是對角圓角，本元件為單邊藥丸，語意不同、勿混淆。
  border-start-start-radius: 0;
  border-end-start-radius: 0;
  border-start-end-radius: 9999px;
  border-end-end-radius: 9999px;
}

@media (prefers-reduced-motion: reduce) {
  .base-list-item--interactive .base-list-item__content {
    transition: none;
  }
}
</style>
