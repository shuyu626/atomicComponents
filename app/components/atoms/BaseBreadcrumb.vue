<template>
  <nav :aria-label="ariaLabel" class="base-breadcrumb">
    <ol class="base-breadcrumb__list">
      <li
        v-for="(item, index) in items"
        :key="`${index}-${item.label}`"
        class="base-breadcrumb__item"
      >
        <!--
          當前頁判斷：最後一項一律視為 current（WAI-ARIA Breadcrumb 慣例）
          - 有 to  → 渲染為 BaseLink + aria-current="page"（最後一項）
          - 無 to  → 渲染為 <span> + aria-current="page"
          兩條分支共用同一段內容，用 `<component :is>` 統一掉
        -->
        <component
          :is="item.to != null ? BaseLink : 'span'"
          :to="item.to"
          :class="item.to != null ? 'base-breadcrumb__link' : 'base-breadcrumb__current'"
          :aria-current="isCurrent(index) ? 'page' : undefined"
        >
          <slot
            name="item"
            :item="item"
            :index="index"
            :is-current="isCurrent(index)"
          >
            <span v-if="item.icon" class="base-breadcrumb__icon" aria-hidden="true">
              <component :is="item.icon" />
            </span>
            <span
              class="base-breadcrumb__label"
              :class="{ 'base-breadcrumb__label--sr-only': item.icon && item.iconOnly }"
            >
              {{ item.label }}
            </span>
          </slot>
        </component>

        <!-- 分隔符 -->
        <span
          v-if="index < items.length - 1"
          class="base-breadcrumb__separator"
          aria-hidden="true"
        >
          <slot name="separator" :index="index">
            <!-- 字串走文字節點、Component 走動態元件 -->
            <component :is="separator" v-if="typeof separator !== 'string'" />
            <template v-else>{{ separator }}</template>
          </slot>
        </span>
      </li>
    </ol>
  </nav>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import BaseLink from '~/components/atoms/BaseLink.vue'

// ── Public types ─────────────────────────────────────────

export interface BreadcrumbItem {
  /** route 目標；不提供時渲染為 `<span>`（通常用於當前頁） */
  to?: RouteLocationRaw
  /** 顯示文字。同時作為 a11y 名稱，iconOnly 模式下用 sr-only 隱藏 */
  label: string
  /** 可選 icon（任意 Vue Component），渲染在 label 前 */
  icon?: Component
  /** 是否只顯示 icon（僅在 `icon` 存在時生效），label 改用 sr-only 給 SR 讀 */
  iconOnly?: boolean
}

export interface BaseBreadcrumbProps {
  /** 麵包屑路徑（由起點到當前頁；最後一項通常不傳 `to`） */
  items: BreadcrumbItem[]
  /** 分隔符。字串直接渲染，傳入 Component 則渲染該元件 @default '/' */
  separator?: string | Component
  /** `<nav>` 的 aria-label @default 'Breadcrumb' */
  ariaLabel?: string
}

const props = withDefaults(defineProps<BaseBreadcrumbProps>(), {
  separator: '/',
  ariaLabel: 'Breadcrumb',
})

defineSlots<{
  /** 自訂單一項目內容；預設渲染 icon + label */
  item(props: { item: BreadcrumbItem; index: number; isCurrent: boolean }): unknown
  /** 自訂分隔符；預設使用 `separator` prop */
  separator(props: { index: number }): unknown
}>()

// ── Internal helpers ─────────────────────────────────────

/**
 * 是否為當前頁 —— 採 WAI-ARIA Breadcrumb 慣例：最後一項一律為當前頁。
 * 不額外提供 `current` prop，避免「使用者忘了標」導致 SR 找不到當前位置。
 */
function isCurrent(index: number): boolean {
  return index === props.items.length - 1
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseBreadcrumb — CSS 自訂屬性（token）系統
 *
 * 樣式客製化方式：
 *   1. 覆蓋 --bc-* 變數（推薦，最小侵入）
 *   2. 直接覆蓋 .base-breadcrumb 的 BEM class
 *
 * 範例 — 換主色：
 *   .base-breadcrumb { --bc-link-hover-color: #e11d48; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-breadcrumb {
  // ── CSS tokens ──────────────────────────────────────────
  --bc-gap: 6px;
  --bc-icon-gap: 4px;
  --bc-font-size: 0.875rem;
  --bc-color: #4b5563;             // gray-600
  --bc-link-color: inherit;
  --bc-link-hover-color: #1d4ed8;  // blue-700，與 BaseButton primary 同色系
  --bc-current-color: #111827;     // gray-900
  --bc-separator-color: #9ca3af;   // gray-400
  --bc-focus-ring-color: var(--bc-link-hover-color);

  font-size: var(--bc-font-size);
  color: var(--bc-color);
  line-height: 1.5;
}

.base-breadcrumb__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--bc-gap);
  row-gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.base-breadcrumb__item {
  display: inline-flex;
  align-items: center;
  column-gap: var(--bc-gap);
  min-width: 0; // 允許 label truncate 不撐爆 list
}

// 共享版面（link / current 兩種根節點都用）
.base-breadcrumb__link,
.base-breadcrumb__current {
  display: inline-flex;
  align-items: center;
  column-gap: var(--bc-icon-gap);
}

.base-breadcrumb__link {
  color: var(--bc-link-color);
  text-decoration: none;
  border-radius: 2px;
  transition: color 0.15s ease;

  &:hover {
    color: var(--bc-link-hover-color);
    text-decoration: underline;
    text-underline-offset: 2px;
  }

  &:focus-visible {
    outline: 2px solid var(--bc-focus-ring-color);
    outline-offset: 2px;
  }

  // 當前頁的 link（罕見：使用者把最後一項仍設為 link）
  &[aria-current='page'] {
    color: var(--bc-current-color);
    font-weight: 500;
    pointer-events: none;
    text-decoration: none;
  }
}

.base-breadcrumb__current {
  color: var(--bc-current-color);
  font-weight: 500;
}

.base-breadcrumb__icon {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  // icon 跟字級對齊
  font-size: 1em;
  line-height: 0;
}

.base-breadcrumb__label {
  // 預設不截斷：caller 想截斷可外層加 max-width + overflow 控制
  &--sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}

.base-breadcrumb__separator {
  display: inline-flex;
  align-items: center;
  color: var(--bc-separator-color);
  user-select: none;
}
</style>
