<template>
  <!--
    role="progressbar" + aria-valuemin/max/now 讓螢幕閱讀器播報進度。
    indeterminate（進度未知）時刻意不給 aria-valuenow / aria-valuetext，
    ARIA 慣例以「缺值」表示不確定狀態。
  -->
  <div
    class="base-progress"
    :class="rootClass"
    role="progressbar"
    aria-valuemin="0"
    :aria-valuemax="maxNumber"
    :aria-valuenow="indeterminate ? undefined : valueNumber"
    :aria-valuetext="indeterminate ? undefined : `${displayPercentage}%`"
    :style="rootStyle"
  >
    <!-- ── 線形（linear）：rail 軌道 + track 填充，track 以 translateX 推進 ── -->
    <template v-if="variant === 'linear'">
      <div class="base-progress__rail">
        <div
          class="base-progress__track"
          :style="indeterminate ? undefined : { transform: `translateX(${percentage - 100}%)` }"
        />
      </div>
    </template>

    <!-- ── 環形（circular）：兩個 circle 疊合，track 以 stroke-dasharray 呈現弧長 ── -->
    <template v-else>
      <svg
        class="base-progress__circular"
        aria-hidden="true"
        :width="sizeNumber"
        :height="sizeNumber"
        :viewBox="`0 0 ${sizeNumber} ${sizeNumber}`"
      >
        <circle
          class="base-progress__circular-rail"
          fill="none"
          :cx="halfSize"
          :cy="halfSize"
          :r="radius"
          :stroke-width="thicknessNumber"
          stroke-linecap="round"
        />
        <circle
          v-if="arcLength > 0"
          class="base-progress__circular-track"
          fill="none"
          :cx="halfSize"
          :cy="halfSize"
          :r="radius"
          :stroke-width="thicknessNumber"
          stroke-linecap="round"
          :stroke-dasharray="`${arcLength} ${circumference}`"
        />
      </svg>
    </template>

    <!-- 指示文字：indeterminate 時不顯示（無確定值可報） -->
    <span
      v-if="!indeterminate && (indicator || slots.default)"
      :class="variant === 'linear'
        ? 'base-progress__indicator'
        : 'base-progress__circular-indicator'"
    >
      <slot
        :percentage="displayPercentage"
        :value="valueNumber"
      >
        {{ indicator === 'value' ? valueNumber : `${displayPercentage}%` }}
      </slot>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { CSSProperties, VNode } from 'vue'

type Numberish = number | `${number}`

export interface BaseProgressProps {
  /**
   * 型態：`linear`（橫條）或 `circular`（環形）。
   * @default 'linear'
   */
  variant?: 'linear' | 'circular'
  /**
   * 語意色，作為 `--progress-color`（填充色）的預設來源；
   * 要完全自訂顏色請覆寫 `--progress-color` token。
   * @default 'primary'
   */
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /**
   * 持續動畫，在載入進度未知時使用；開啟後 `value` / `indicator` 失效。
   * @default false
   */
  indeterminate?: boolean
  /**
   * 當前進度值。
   * @default 0
   */
  value?: Numberish
  /**
   * 進度最大值（`value` 相對於此換算百分比）。
   * @default 100
   */
  max?: Numberish
  /**
   * 軌道粗細（px）。linear 為條高、circular 為圈線寬。
   * @default 8
   */
  thickness?: Numberish
  /**
   * 環形尺寸（px）；僅 `circular` 生效。
   * @default 64
   */
  size?: Numberish
  /**
   * 是否顯示進度指示文字，以及顯示內容：
   * `true` / `'percentage'` 顯示百分比，`'value'` 顯示原始值。
   * @default false
   */
  indicator?: boolean | 'percentage' | 'value'
}

/** default slot 的 scoped props：可拿換算後百分比與原始值自訂呈現。 */
interface BaseProgressSlots {
  default?: (props: { percentage: number; value: number }) => VNode[]
}

const props = withDefaults(defineProps<BaseProgressProps>(), {
  variant: 'linear',
  color: 'primary',
  indeterminate: false,
  value: 0,
  max: 100,
  thickness: 8,
  size: 64,
  indicator: false,
})

const slots = defineSlots<BaseProgressSlots>()

/** 取兩位小數，避免 SVG dasharray 帶過長浮點誤差。 */
const toFixed = (value: number) => Number(value.toFixed(2))

const valueNumber = computed(() => Number(props.value))
const maxNumber = computed(() => Number(props.max))
const thicknessNumber = computed(() => Number(props.thickness))
const sizeNumber = computed(() => Number(props.size))

/**
 * 換算百分比（0–100）。修正參考實作：補 `max <= 0` 與 NaN 防呆
 * （原版直接除以 max，max 為 0 會得到 Infinity / NaN），並 clamp 進有效區間。
 */
const percentage = computed(() => {
  const value = valueNumber.value
  const max = maxNumber.value
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0
  return Math.min(100, Math.max(0, (value / max) * 100))
})

/** 指示文字用的整數百分比（幾何計算仍用未取整的 `percentage`）。 */
const displayPercentage = computed(() => Math.round(percentage.value))

const rootClass = computed(() => [
  `base-progress--${props.variant}`,
  `base-progress--${props.color}`,
  { 'base-progress--indeterminate': props.indeterminate },
])

const rootStyle = computed<CSSProperties>(() => ({
  '--progress-thickness': `${thicknessNumber.value}px`,
  '--progress-size': `${sizeNumber.value}px`,
}))

// ── 環形幾何 ───────────────────────────────────────────────
const halfSize = computed(() => sizeNumber.value / 2)

/** 圈線半徑：內縮半個線寬，讓 stroke 不被 viewBox 裁切。 */
const radius = computed(() => toFixed((sizeNumber.value - thicknessNumber.value) / 2))

const circumference = computed(() => toFixed(2 * Math.PI * radius.value))

/** indeterminate 時固定取 1/3 圈當旋轉弧；否則依百分比。 */
const arcLength = computed(() =>
  props.indeterminate
    ? toFixed(circumference.value * 0.33)
    : toFixed(circumference.value * (percentage.value / 100)),
)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseProgress — 進度指示
 *
 * 兩種型態：linear（橫條）與 circular（環形），皆支援 determinate 與
 * indeterminate（持續動畫）。所有外觀抽成 --progress-* token，取代參考實作
 * 對全域 SCSS $color-map 與寫死色（#F1F1F1 / #1976D2）的相依，覆寫即可主題化：
 *
 *   .base-progress { --progress-color: #8b5cf6; --progress-rail-color: #eee; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 會加上 [data-v-xxx]、
 * specificity 高於使用端覆寫 class，導致 --progress-* 改不動。
 */
:where(.base-progress) {
  --progress-color: #3b82f6; // 預設 = primary（填充 / 弧線色）
  --progress-rail-color: #f1f1f1; // 未完成軌道底色
  --progress-thickness: 8px;
  --progress-radius: 99999px; // linear 軌道圓角（預設膠囊狀）
  --progress-gap: 12px; // linear 條與指示文字間距
  --progress-indicator-color: inherit;
  --progress-indicator-font-size: 1.25rem;
}

/* 語意色 preset（specificity 0，使用端 --progress-color 一律蓋得過）。 */
:where(.base-progress--primary) { --progress-color: #3b82f6; }
:where(.base-progress--success) { --progress-color: #22c55e; }
:where(.base-progress--warning) { --progress-color: #f59e0b; }
:where(.base-progress--danger)  { --progress-color: #ef4444; }
:where(.base-progress--info)    { --progress-color: #06b6d4; }

/* ───────────────────────────────────────────────────────
 * Linear：rail（底軌）內含 track（填充），track 以 translateX 推進
 * ─────────────────────────────────────────────────────── */
.base-progress--linear {
  display: flex;
  align-items: center;
  column-gap: var(--progress-gap);
}

.base-progress__rail {
  overflow: hidden;
  width: 100%;
  height: var(--progress-thickness);
  background-color: var(--progress-rail-color);
  border-radius: var(--progress-radius);
}

.base-progress__track {
  width: 100%;
  height: 100%;
  background-color: var(--progress-color);
  border-radius: var(--progress-radius);
  // determinate：用 transform 平移（不觸發 layout，僅 composite）。
  transition: transform 0.3s ease;
}

/* indeterminate：track 在 rail 內來回掃動（關掉 determinate 的 transform 過渡） */
.base-progress--linear.base-progress--indeterminate .base-progress__track {
  transition: none;
  animation: base-progress-linear 2s ease infinite;
}

/* ───────────────────────────────────────────────────────
 * Circular：兩個 circle 疊合，track 以 dasharray 呈現弧長
 * ─────────────────────────────────────────────────────── */
.base-progress--circular {
  position: relative;
  display: inline-flex;
  width: fit-content;
  height: fit-content;
}

.base-progress__circular-rail {
  stroke: var(--progress-rail-color);
}

.base-progress__circular-track {
  // 起點轉到 12 點鐘方向（SVG circle 預設 3 點鐘起繪）。
  transform: rotate(-90deg);
  transform-origin: center;
  stroke: var(--progress-color);
  transition: stroke-dasharray 0.3s ease;
}

/* indeterminate：整圈持續旋轉 */
.base-progress--circular.base-progress--indeterminate .base-progress__circular-track {
  transition: none;
  animation: base-progress-circular 1s linear infinite;
}

/* ── 指示文字 ─────────────────────────────────────────── */
.base-progress__indicator {
  flex-shrink: 0;
  color: var(--progress-indicator-color);
  font-variant-numeric: tabular-nums; // 數字等寬，跳動時不抖動
}

.base-progress__circular-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--progress-indicator-color);
  font-size: var(--progress-indicator-font-size);
  font-variant-numeric: tabular-nums;
}

/* ── 動畫 ──────────────────────────────────────────────── */
@keyframes base-progress-linear {
  0% { transform: translateX(-100%); }
  60% { transform: translateX(0%); }
  100% { transform: translateX(100%); }
}

@keyframes base-progress-circular {
  /* 明確 from/to（0→360）讓 infinite loop 接縫平滑；起點方向對旋轉動畫無影響。 */
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/*
 * 尊重「減少動態效果」偏好：關閉 indeterminate 掃動 / 旋轉與 determinate 過渡。
 * 必須列出與 indeterminate 規則「相同特異性」的複合選擇器，否則
 * `.base-progress--linear.base-progress--indeterminate .base-progress__track`（高特異性）
 * 會蓋過這裡的單 class 規則，導致動畫關不掉。
 */
@media (prefers-reduced-motion: reduce) {
  .base-progress__track,
  .base-progress__circular-track,
  .base-progress--linear.base-progress--indeterminate .base-progress__track,
  .base-progress--circular.base-progress--indeterminate .base-progress__circular-track {
    transition: none;
    animation: none;
  }
}
</style>
