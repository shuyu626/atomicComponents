<template>
  <span class="base-badge">
    <!-- 錨點：被標記的目標（icon / 按鈕 / 頭像…），由 default slot 傳入。 -->
    <slot />

    <!--
      badge 本體：絕對定位疊在錨點角落。
      invisible（數字 0 且未開 showZero）時除了 scale(0) 視覺隱藏，
      也補 aria-hidden 讓螢幕閱讀器不再朗讀被隱藏的內容。
    -->
    <span
      class="base-badge__content"
      :class="contentClass"
      :aria-hidden="invisible || undefined"
    >
      <template v-if="showContent">
        <slot name="content">{{ displayContent }}</slot>
      </template>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { VNode } from 'vue'

import isNullOrUndefined from '~/utils/isNullOrUndefined'
import isNumberish from '~/utils/isNumberish'

export interface BaseBadgeProps {
  /** 徽章內容：數字（會套 `max` 收斂）或文字。不給且無 `#content` slot 時只渲染空徽章 / 紅點。 */
  content?: string | number | null
  /**
   * 錨點外形，決定徽章往角落內縮的偏移量：圓形錨點（如頭像）用 `circular` 內縮，
   * 方形錨點（如卡片 / icon）用 `rectangular` 貼齊角落。
   * @default 'circular'
   */
  overlap?: 'circular' | 'rectangular'
  /**
   * 數字內容的上限；超過時顯示 `${max}+`（如 `99+`）。非數字內容不受影響。
   * @default 99
   */
  max?: number | `${number}`
  /**
   * 徽章相對錨點的定位角落。
   * @default 'top-right'
   */
  placement?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  /**
   * 尺寸：`dot` 為純紅點（不顯示內容）；`medium` / `large` 顯示內容。
   * @default 'medium'
   */
  size?: 'dot' | 'medium' | 'large'
  /**
   * 語意色：作為 `--badge-bg` 的預設來源；要完全自訂顏色請覆寫 `--badge-bg` token。
   * @default 'danger'
   */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /**
   * 內容為數字 `0` 時是否仍顯示。預設 `false`（0 → 隱藏徽章）。
   * @default false
   */
  showZero?: boolean
}

interface BaseBadgeSlots {
  /** 錨點元素（被標記的目標）。 */
  default?: () => VNode[]
  /** 自訂徽章內容（取代 `content` 的文字渲染）；`dot` 尺寸不渲染。 */
  content?: () => VNode[]
}

const props = withDefaults(defineProps<BaseBadgeProps>(), {
  content: undefined,
  overlap: 'circular',
  max: 99,
  placement: 'top-right',
  size: 'medium',
  color: 'danger',
  showZero: false,
})

const slots = defineSlots<BaseBadgeSlots>()

/** 是否帶有可顯示的內容（`content` 或自訂 `#content` slot）。 */
const hasContent = computed(
  () => !isNullOrUndefined(props.content) || !!slots.content,
)

/** 是否渲染文字內容：有內容且非 `dot` 尺寸。 */
const showContent = computed(() => hasContent.value && props.size !== 'dot')

/**
 * 視覺隱藏（scale 0）的時機：
 * 1. 內容為「數字 0」且未開 `showZero`（dot 與非 dot 一致）。
 * 2. 非 `dot` 尺寸卻沒有任何內容 → 避免渲染出空的色塊圓圈；`dot` 為純存在感
 *    紅點、不受此限。
 *
 * > 修正參考實作：(1) 原版用 `Number(content) === 0`，`content=null` 時
 * > `Number(null)===0` 會誤判隱藏，此處加 `isNumberish` 守衛只認真數字 0；
 * > (2) 原版對無內容的非 dot 徽章會留下空色塊，此處一併收合。
 */
const invisible = computed(() => {
  if (!props.showZero && isNumberish(props.content) && Number(props.content) === 0) {
    return true
  }
  if (props.size !== 'dot' && !hasContent.value) {
    return true
  }
  return false
})

/** 數字超過 `max` 時收斂成 `${max}+`；非數字內容原樣顯示（不套 max）。 */
const displayContent = computed(() => {
  const { content, max } = props
  if (isNumberish(content) && Number(content) > Number(max)) {
    return `${max}+`
  }
  return content
})

/** 組裝 BEM modifier：定位 / 錨點外形 / 尺寸 / 顏色 / 隱藏狀態。 */
const contentClass = computed(() => [
  `base-badge__content--${props.placement}`,
  `base-badge__content--${props.overlap}`,
  `base-badge__content--${props.size}`,
  `base-badge__content--${props.color}`,
  invisible.value && 'base-badge__content--invisible',
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseBadge — 徽章
 *
 * 將數字 / 紅點疊在錨點（default slot）的角落。所有外觀抽成 --badge-* token，
 * 取代參考實作對全域 SCSS $color-map / %placeholder 的相依，覆寫即可主題化。
 *
 *   .base-badge { --badge-bg: #8b5cf6; --badge-color: #fff; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 用 :where() 包起來（specificity 0），否則 scoped 會幫選擇器加上
 * [data-v-xxx]、specificity 高於使用端覆寫 class，導致 --badge-* 改不動。
 *
 * 顏色採 fallback chain：背景優先吃使用端覆寫的 --badge-bg，未覆寫時退回語意色
 * preset（--_badge-preset-bg，由 color modifier 提供）。如此「傳 color prop 選預設」
 * 與「覆寫 --badge-bg 完全自訂」兩條路都成立。
 */
:where(.base-badge) {
  --badge-color: #fff;
  --badge-font-size: 0.75rem;
  --_badge-preset-bg: #ef4444;
}

/* 語意色 preset（specificity 0，使用端 --badge-bg 一律蓋得過）。 */
:where(.base-badge__content--primary) { --_badge-preset-bg: #3b82f6; }
:where(.base-badge__content--success) { --_badge-preset-bg: #22c55e; }
:where(.base-badge__content--warning) { --_badge-preset-bg: #f59e0b; }
:where(.base-badge__content--danger) { --_badge-preset-bg: #ef4444; }
:where(.base-badge__content--info) { --_badge-preset-bg: #06b6d4; }

.base-badge {
  position: relative;
  // 自成 stacking context，讓徽章的 z-index 不受錨點內部堆疊影響。
  isolation: isolate;
  display: inline-flex;
  flex: none;
  vertical-align: middle;

  &__content {
    --badge-scale: 1;
    --badge-translate-x: 0;
    --badge-translate-y: 0;
    --badge-offset: 0%; // 預設貼齊角落；由 overlap modifier 覆寫



    position: absolute;
    z-index: 1;
    display: inline-flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    padding-right: 6px;
    padding-left: 6px;
    color: var(--badge-color);
    font-size: var(--badge-font-size);
    font-variant-numeric: tabular-nums;
    line-height: 1;
    white-space: nowrap;
    word-break: keep-all;
    // 使用端 --badge-bg 優先；未設則退回語意色 preset。
    background-color: var(--badge-bg, var(--_badge-preset-bg));
    border-radius: 9999px;
    user-select: none;
    transform: translate(var(--badge-translate-x), var(--badge-translate-y))
      scale(var(--badge-scale));
    transform-origin: center;
    transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);

    // ── 錨點外形 → 角落內縮量 ──────────────────────────────
    &--rectangular { --badge-offset: 0%; }
    &--circular { --badge-offset: 14.65%; } // 圓形錨點切線的經驗值

    // ── 隱藏（數字 0）：縮成 0；a11y 由 template 的 aria-hidden 處理 ──
    &--invisible { --badge-scale: 0; }

    // ── 尺寸 ───────────────────────────────────────────────
    &--dot {
      padding: 0;
      min-width: 9px;
      height: 9px;
    }

    &--medium {
      min-width: 20px;
      height: 20px;
    }

    &--large {
      min-width: 30px;
      height: 30px;
    }

    // ── 定位（角落 + 自我位移對齊角落中心）─────────────────
    &--top-right {
      top: var(--badge-offset);
      right: var(--badge-offset);
      --badge-translate-x: 50%;
      --badge-translate-y: -50%;
    }

    &--top-left {
      top: var(--badge-offset);
      left: var(--badge-offset);
      --badge-translate-x: -50%;
      --badge-translate-y: -50%;
    }

    &--bottom-right {
      right: var(--badge-offset);
      bottom: var(--badge-offset);
      --badge-translate-x: 50%;
      --badge-translate-y: 50%;
    }

    &--bottom-left {
      bottom: var(--badge-offset);
      left: var(--badge-offset);
      --badge-translate-x: -50%;
      --badge-translate-y: 50%;
    }
  }
}

// 尊重「減少動態效果」偏好：關閉 scale 過場。
@media (prefers-reduced-motion: reduce) {
  .base-badge__content {
    transition: none;
  }
}
</style>
