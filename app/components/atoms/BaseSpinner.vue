<template>
  <!--
    不確定型載入指示。root 為 `role="status"`（live region）+ `aria-label` 提供載入語意
    （對齊 BaseProgress 的 aria-only 做法，避免與內部文字重複命名）；旋轉環純視覺、aria-hidden。
  -->
  <span
    class="base-spinner"
    :class="rootClass"
    :style="rootStyle"
    role="status"
    :aria-label="label"
  >
    <span
      class="base-spinner__ring"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { CSSProperties } from 'vue'

import isNumberish from '~/utils/isNumberish'

export interface BaseSpinnerProps {
  /**
   * 尺寸：具名（`sm` / `md` / `lg`）走預設 token（16 / 24 / 40 px）；
   * 數字 / 數字字串走自訂像素。
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | `${number}` | number
  /**
   * 語意色。**可選**：未指定時吃 `currentColor`（方便放在按鈕 / 文字內繼承色）；
   * 指定時用該語意色 token（作為 `--spinner-color` 來源）。
   * 要完全自訂顏色請覆寫 `--spinner-color` token。
   */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  /**
   * 無障礙標籤：作為根節點 `role="status"` 的 `aria-label`，供螢幕閱讀器播報
   *（不另放重複的 sr-only 文字以免雙重命名）。i18n 覆寫點。
   * @default '載入中'
   */
  label?: string
}

const props = withDefaults(defineProps<BaseSpinnerProps>(), {
  size: 'md',
  color: undefined,
  label: '載入中',
})

/** 具名尺寸走 modifier class（token 提供 px）；自訂尺寸為 `null`（改用 inline CSS var）。 */
const sizeClass = computed(() =>
  isNumberish(props.size) ? null : `base-spinner--${props.size}`,
)

/**
 * 指定 color 才加語意色 modifier；未指定 → 不加 → `--spinner-color` 維持
 * 預設的 `currentColor`，隨父層文字色繼承。
 */
const colorClass = computed(() =>
  props.color ? `base-spinner--${props.color}` : null,
)

const rootClass = computed(() => [sizeClass.value, colorClass.value])

/** 自訂尺寸寫進 CSS var；具名尺寸由 class 內的 token 提供。 */
const rootStyle = computed<CSSProperties | undefined>(() =>
  isNumberish(props.size) ? { '--spinner-size': `${Number(props.size)}px` } : undefined,
)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseSpinner — 不確定型載入指示
 *
 * 旋轉環（border-based）：整圈為淡色軌道 + 頂端一段 accent 色，持續旋轉表達
 * 「處理中、無確定進度」。所有外觀抽成 --spinner-* token，覆寫即可主題化：
 *
 *   .base-spinner { --spinner-color: #8b5cf6; --spinner-thickness: 3px; }
 *
 * 顏色預設吃 currentColor（放進按鈕 / 文字即繼承色），傳 color prop 走語意色 preset。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 的 [data-v-xxx]
 * 會高於使用端覆寫 class，導致 --spinner-* 改不動。
 */
:where(.base-spinner) {
  --spinner-size: 24px; // = md
  --spinner-color: currentColor; // 未指定 color 時繼承父層文字色
  // 軌道底色：預設取 accent 色的淡化版（同樣繼承 currentColor），維持單色協調。
  --spinner-track-color: color-mix(in srgb, var(--spinner-color) 25%, transparent);
  --spinner-thickness: 3px; // 環線寬（px）；自訂尺寸時建議一併覆寫
  --spinner-speed: 0.6s; // 旋轉一圈秒數
}

.base-spinner {
  display: inline-flex;
  flex: none;
  vertical-align: middle;
}

/* 語意色 preset（specificity 0，使用端 --spinner-color 一律蓋得過）。 */
:where(.base-spinner--primary) { --spinner-color: #3b82f6; }
:where(.base-spinner--success) { --spinner-color: #22c55e; }
:where(.base-spinner--warning) { --spinner-color: #f59e0b; }
:where(.base-spinner--danger)  { --spinner-color: #ef4444; }
:where(.base-spinner--info)    { --spinner-color: #06b6d4; }
:where(.base-spinner--neutral) { --spinner-color: #6b7280; }

/* 具名尺寸：環大小與線寬一併調校，維持粗細比例協調。 */
:where(.base-spinner--sm) { --spinner-size: 16px; --spinner-thickness: 2px; }
:where(.base-spinner--md) { --spinner-size: 24px; --spinner-thickness: 3px; }
:where(.base-spinner--lg) { --spinner-size: 40px; --spinner-thickness: 4px; }

/* 旋轉環：整圈淡色軌道 + 頂端 accent 色，rotate 動畫。 */
.base-spinner__ring {
  box-sizing: border-box;
  width: var(--spinner-size);
  height: var(--spinner-size);
  border: var(--spinner-thickness) solid var(--spinner-track-color);
  border-top-color: var(--spinner-color);
  border-radius: 50%;
  animation: base-spinner-rotate var(--spinner-speed) linear infinite;
}

@keyframes base-spinner-rotate {
  to { transform: rotate(360deg); }
}

/*
 * 尊重「減少動態效果」偏好：旋轉是本元件的「載入中」語意核心（essential motion），
 * 完全移除會失去語意，故不停轉、改大幅放慢（3×）以降低前庭不適。
 */
@media (prefers-reduced-motion: reduce) {
  .base-spinner__ring {
    animation-duration: calc(var(--spinner-speed) * 3);
  }
}
</style>
