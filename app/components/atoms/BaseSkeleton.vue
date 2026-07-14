<template>
  <div
    v-if="loading"
    class="base-skeleton"
    :class="[`base-skeleton--${variant}`, `base-skeleton--${animation}`]"
    :style="sizeStyle"
    aria-hidden="true"
  />
  <slot v-else />
</template>

<script setup lang="ts">
// loading 中渲染骨架（純裝飾，aria-hidden）；完成後只渲染 slot，無 wrapper 不影響版面。
//
// 註：本元件根節點為 v-if / v-else 雙分支（無包覆元素），刻意不在 template 根層級放置
// 說明註解 —— Vue 會把它併入 root Fragment 的子節點，導致 @vue/test-utils 的
// wrapper.element 解析到該註解節點而非實際渲染的分支（wrapper.classes() /
// .attributes() 因而回傳空值）。此取捨對齊 BaseLink.vue 同為多分支根節點的既有寫法
// （皆無 template 層級註解）。
import { computed } from 'vue'

import type { CSSProperties } from 'vue'

import toUnit from '~/utils/toUnit'

export interface BaseSkeletonProps {
  /** 形狀：text（1em 文字列）/ circular（圓）/ rectangular（直角矩形）/ rounded（圓角矩形）。 @default 'text' */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded'
  /** 寬度；數字補 px。text 預設 100%、其餘 100%。 */
  width?: string | number
  /** 高度；數字補 px。text 跟隨字級預設 1em，其餘 variant 同樣預設 1em，建議依內容自行指定尺寸。 */
  height?: string | number
  /** 動畫：pulse（透明度脈動）/ wave（掃光）/ none。 @default 'pulse' */
  animation?: 'pulse' | 'wave' | 'none'
  /** 載入中；false 時直接渲染 default slot（無 wrapper）。 @default true */
  loading?: boolean
}

const props = withDefaults(defineProps<BaseSkeletonProps>(), {
  variant: 'text',
  width: undefined,
  height: undefined,
  animation: 'pulse',
  loading: true,
})

defineSlots<{
  /** 載入完成後的實際內容；loading=false 時原樣渲染。 */
  default?: () => unknown
}>()

/** 尺寸走 CSS 變數（非直接 width/height），讓 variant 預設值與使用端覆寫共用同一套 token。 */
const sizeStyle = computed<CSSProperties | undefined>(() => {
  const style: Record<string, string> = {}
  if (props.width !== undefined) style['--skeleton-width'] = toUnit(props.width)
  if (props.height !== undefined) style['--skeleton-height'] = toUnit(props.height)
  return Object.keys(style).length ? style : undefined
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseSkeleton — 載入佔位骨架
 *
 * 首次載入時佔用「未來內容」的版位（形狀 + 尺寸），避免內容到位瞬間 layout
 * shift / 版面跳動。四種形狀（text / circular / rectangular / rounded）對應
 * 常見內容輪廓（文字列 / 頭像 / 圖片 / 卡片），多行文字骨架由使用端疊多顆
 * variant="text" 自行組合（atom 不內建 rows preset）。所有外觀抽成 --skeleton-*
 * token，覆寫即可主題化：
 *
 *   .base-skeleton { --skeleton-color: #1f2937; --skeleton-speed: 1s; }
 *
 * 動畫僅為視覺提示（非 essential motion），故 prefers-reduced-motion 下直接
 * 關閉，退回靜態色塊，與 BaseSpinner「放慢而非停止」的取捨不同。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 的 [data-v-xxx]
 * 會高於使用端覆寫 class，導致 --skeleton-* 改不動。
 */
:where(.base-skeleton) {
  --skeleton-color: #e5e7eb;
  --skeleton-highlight: rgba(255, 255, 255, 0.6);
  --skeleton-radius: 6px;
  --skeleton-speed: 1.6s;
  --skeleton-width: 100%;
  --skeleton-height: 1em;
}

.base-skeleton {
  position: relative;
  display: block;
  width: var(--skeleton-width);
  height: var(--skeleton-height);
  overflow: hidden;
  background-color: var(--skeleton-color);

  // ── 形狀（圓角軸）───────────────────────────────────────
  &--text { border-radius: calc(var(--skeleton-radius) * 2 / 3); }
  &--circular { border-radius: 50%; }
  &--rectangular { border-radius: 0; }
  &--rounded { border-radius: var(--skeleton-radius); }

  // ── 動畫 ─────────────────────────────────────────────
  &--pulse { animation: base-skeleton-pulse var(--skeleton-speed) ease-in-out infinite; }

  &--wave::after {
    position: absolute;
    inset: 0;
    content: '';
    background: linear-gradient(90deg, transparent, var(--skeleton-highlight), transparent);
    transform: translateX(-100%);
    animation: base-skeleton-wave var(--skeleton-speed) linear infinite;
  }
}

@keyframes base-skeleton-pulse {
  50% { opacity: 0.55; }
}
@keyframes base-skeleton-wave {
  100% { transform: translateX(100%); }
}

/* 減少動態偏好：動畫完全停用，維持靜態色塊（對齊 component-design-spec a11y checklist）。 */
@media (prefers-reduced-motion: reduce) {
  .base-skeleton--pulse { animation: none; }
  .base-skeleton--wave::after { animation: none; content: none; }
}
</style>
