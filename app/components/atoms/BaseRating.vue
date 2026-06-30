<template>
  <div
    class="base-rating"
    :class="rootClass"
  >
    <!-- 標籤：互動模式以 aria-labelledby 連到評分群組，唯讀模式由 __stars 的 aria-label 傳達。 -->
    <span
      v-if="hasLabel"
      :id="labelId"
      class="base-rating__label"
    >
      <slot name="label"><slot>{{ label }}</slot></slot>
    </span>

    <!--
      評分群組：互動模式為 role="radiogroup"（內含 sr-only 原生 radio，方向鍵巡覽 + 表單語意），
      唯讀模式為 role="img" 並以 aria-label 朗讀「N / max 顆星」。
    -->
    <div
      class="base-rating__stars"
      :role="readonly ? 'img' : 'radiogroup'"
      :aria-label="groupAriaLabel"
      :aria-labelledby="groupAriaLabelledby"
      :aria-describedby="!readonly && displayMessage ? messageId : undefined"
      :aria-invalid="(!readonly && displayError) || undefined"
      @mouseleave="onMouseleave"
    >
      <!-- 未評分（清除）radio：讓鍵盤可達 0、並在值為 0 時有對應的 checked 選項。 -->
      <input
        v-if="renderInputs"
        :id="`${fieldId}:0`"
        class="base-rating__input base-rating__input--empty"
        type="radio"
        :name="effectiveName"
        :value="0"
        :checked="currentValue === 0"
        :disabled="disabled"
        :aria-label="emptyLabel"
        @change="onChange(0)"
        @blur="onBlur"
      >

      <span
        v-for="v in starCount"
        :key="v"
        class="base-rating__star"
        :class="starClass(v)"
      >
        <!-- 底層：未選取圖示（定義星格尺寸）。 -->
        <span
          class="base-rating__icon base-rating__icon--empty"
          aria-hidden="true"
        >
          <slot
            name="icon:unselected"
            :value="v"
          >
            <svg
              class="base-rating__svg"
              viewBox="0 0 24 24"
              focusable="false"
            ><path :d="STAR_PATH" /></svg>
          </slot>
        </span>

        <!-- 上層：填色圖示，以寬度裁切呈現填滿比例（支援任意小數的唯讀顯示）。 -->
        <span
          class="base-rating__icon base-rating__icon--fill"
          :style="fillStyle(v)"
          aria-hidden="true"
        >
          <slot
            name="icon:selected"
            :value="v"
          >
            <svg
              class="base-rating__svg"
              viewBox="0 0 24 24"
              focusable="false"
            ><path :d="STAR_PATH" /></svg>
          </slot>
        </span>

        <!-- 互動層：透明命中區（label）+ sr-only 原生 radio；input 置於星格內以利 focus ring 與 :for 連動。 -->
        <template v-if="renderInputs">
          <input
            v-if="allowHalf"
            :id="`${fieldId}:${v - 0.5}`"
            class="base-rating__input"
            type="radio"
            :name="effectiveName"
            :value="v - 0.5"
            :checked="currentValue === v - 0.5"
            :disabled="disabled"
            @change="onChange(v - 0.5)"
            @click="onClick(v - 0.5, $event)"
            @blur="onBlur"
          >
          <label
            v-if="allowHalf"
            class="base-rating__hit base-rating__hit--half"
            :for="`${fieldId}:${v - 0.5}`"
            @mouseenter="onMouseenter(v - 0.5)"
          >
            <span class="base-rating__sr">{{ ratingLabel(v - 0.5) }}</span>
          </label>

          <input
            :id="`${fieldId}:${v}`"
            class="base-rating__input"
            type="radio"
            :name="effectiveName"
            :value="v"
            :checked="currentValue === v"
            :disabled="disabled"
            @change="onChange(v)"
            @click="onClick(v, $event)"
            @blur="onBlur"
          >
          <label
            class="base-rating__hit"
            :class="{ 'base-rating__hit--full': allowHalf }"
            :for="`${fieldId}:${v}`"
            @mouseenter="onMouseenter(v)"
          >
            <span class="base-rating__sr">{{ ratingLabel(v) }}</span>
          </label>
        </template>
      </span>
    </div>

    <!--
      訊息區（互動模式）：驗證錯誤優先、否則 message prop。
      以 v-show 常駐 DOM（而非 v-if 動態插入）+ aria-atomic，
      讓動態出現 / 變動的驗證訊息整段被螢幕閱讀器朗讀（對齊 BaseFormField）。
    -->
    <div
      v-show="!readonly && displayMessage"
      :id="messageId"
      class="base-rating__message"
      aria-live="polite"
      aria-atomic="true"
    >
      <slot
        name="message"
        :error="displayError"
        :message="displayMessage"
      >{{ displayMessage }}</slot>
    </div>
  </div>
</template>

<script lang="ts">
/** 評分色（與 BaseChip / BaseCheckbox 語意色一致；未指定時用金色預設 token）。 */
export type BaseRatingColor = 'primary' | 'success' | 'warning' | 'danger' | 'info'

/** 預設星形路徑（Material Design star，24×24 viewBox）。 */
const STAR_PATH = 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'
</script>

<script setup lang="ts">
import { computed, ref, useId, useSlots } from 'vue'

import useValidation from '~/composables/useValidation'
import type { ValidationRule } from '~/utils/validators'

interface BaseRatingProps {
  /** 星數上限。 @default 5 */
  max?: number
  /** 允許半星（0.5 級距）。 @default false */
  allowHalf?: boolean
  /** 點擊已選取的同一顆星可歸零。 @default true */
  clearable?: boolean
  /** 唯讀（呈現分數、不可互動，role="img"）。 @default false */
  readonly?: boolean
  /** 停用。 @default false */
  disabled?: boolean
  /** 尺寸。 @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** 評分色（未指定時用金色預設 token）。 */
  color?: BaseRatingColor
  /** 標籤文字（或用 `#default` / `#label` slot）。 */
  label?: string
  /** 群組無障礙標籤（未提供 label / slot 時的 fallback）。 @default '評分' */
  ariaLabel?: string
  /** 原生 name；未提供時用自動 id。 */
  name?: string
  /** 控制項 id；未提供自動產生。 */
  id?: string
  /** 輔助 / 驗證訊息。 */
  message?: string
  /** 錯誤狀態。 @default false */
  error?: boolean
  /** 驗證規則（touched-gated，change / blur 後顯示）。 */
  rules?: ValidationRule<number | undefined>[]
}

const props = withDefaults(defineProps<BaseRatingProps>(), {
  max: 5,
  allowHalf: false,
  clearable: true,
  readonly: false,
  disabled: false,
  size: 'md',
  color: undefined,
  label: undefined,
  ariaLabel: '評分',
  name: undefined,
  id: undefined,
  message: undefined,
  error: false,
  rules: undefined,
})

const emit = defineEmits<{
  /** 評分變動時觸發，帶新分數（點同顆星歸零時為 0）。 */
  change: [value: number]
}>()

defineSlots<{
  /** 標籤內容（取代 `label` prop）。 */
  default?: () => unknown
  /** 標籤內容（同 default，語意命名）。 */
  label?: () => unknown
  /** 自訂「已選取」圖示。scoped prop：`value`（此星序號）。 */
  'icon:selected'?: (props: { value: number }) => unknown
  /** 自訂「未選取」圖示。scoped prop：`value`（此星序號）。 */
  'icon:unselected'?: (props: { value: number }) => unknown
  /** 訊息內容（取代 `message` prop）。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** v-model：評分值（0 ~ max，allowHalf 時可為 .5）。 */
const model = defineModel<number>()

const slots = useSlots()

const _id = useId()
const fieldId = computed(() => props.id || `rating-${_id}`)
const labelId = computed(() => `${fieldId.value}-label`)
const messageId = computed(() => `${fieldId.value}-message`)

const effectiveName = computed(() => props.name ?? fieldId.value)

/** 實際星數：max 取下界整數且不為負，避免傳入小數 / 負值時渲染異常。 */
const starCount = computed(() => Math.max(0, Math.floor(props.max)))

/** 目前已提交的分數（undefined / 非數字一律視為 0）。 */
const currentValue = computed(() => {
  const n = Number(model.value)
  return Number.isFinite(n) ? n : 0
})

/** 滑鼠 hover 預覽值（0 表示無預覽）。 */
const hover = ref(0)
/** 顯示用值：hover 優先、否則目前分數。 */
const displayValue = computed(() => (hover.value > 0 ? hover.value : currentValue.value))

const hasLabel = computed(() => !!(props.label || slots.label || slots.default))
/** 互動模式才渲染原生 radio 與命中區（唯讀模式僅呈現分數、不渲染 input）。 */
const renderInputs = computed(() => !props.readonly)
/** 可實際互動（非唯讀且非停用）。 */
const isInteractive = computed(() => !props.readonly && !props.disabled)

const ratingLabel = (v: number) => `${v} 顆星`
const emptyLabel = computed(() => '未評分')

/** 每顆星的填滿比例（0~100%），依 displayValue 線性計算，支援任意小數。 */
const fillStyle = (v: number) => {
  const fraction = Math.max(0, Math.min(1, displayValue.value - (v - 1)))
  // 四捨五入到小數兩位，避免浮點誤差產生 70.00000000000001% 這類醜值。
  const percent = Math.round(fraction * 100 * 100) / 100
  return { width: `${percent}%` }
}

/** 以「目前已提交分數」（非 hover）標記狀態 class，供樣式與測試使用。 */
const starClass = (v: number) => ({
  'base-rating__star--full': currentValue.value >= v,
  'base-rating__star--half': currentValue.value >= v - 0.5 && currentValue.value < v,
})

const validation = useValidation<number | undefined>(
  () => model.value,
  () => props.rules,
)

function setValue(value: number) {
  model.value = value
  emit('change', value)
  validation.touch()
}

function onChange(value: number) {
  if (!isInteractive.value) return
  setValue(value)
}

// 點擊「已選取的同一顆」歸零：原生 radio 重複點擊不會觸發 change，故靠 click 偵測。
// 只認滑鼠點擊（event.detail >= 1）；鍵盤觸發的 click（Space / Enter，detail 為 0）不歸零，
// 避免方向鍵選取後按 Space 確認時意外清除（鍵盤清除請改用群組內的「未評分」選項）。
function onClick(value: number, event: MouseEvent) {
  if (!isInteractive.value) return
  if (event.detail === 0) return
  if (props.clearable && currentValue.value === value) setValue(0)
}

function onMouseenter(value: number) {
  if (!isInteractive.value) return
  hover.value = value
}

function onMouseleave() {
  hover.value = 0
}

function onBlur() {
  validation.touch()
}

defineExpose({
  /** 強制驗證（即使尚未 touch 也顯示錯誤）；回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態（不動值）。 */
  reset: validation.reset,
})

const displayError = computed(() => props.error || validation.error.value)
const displayMessage = computed(() => validation.message.value ?? props.message)

/** 唯讀以 aria-label 朗讀分數；互動模式無 label 時用 ariaLabel fallback，有 label 則用 labelledby。 */
const groupAriaLabel = computed(() => {
  if (props.readonly) return `${currentValue.value} / ${starCount.value} 顆星`
  return hasLabel.value ? undefined : props.ariaLabel
})
const groupAriaLabelledby = computed(() =>
  !props.readonly && hasLabel.value ? labelId.value : undefined,
)

const rootClass = computed(() => [
  `base-rating--${props.size}`,
  props.color ? `base-rating--${props.color}` : null,
  {
    'base-rating--readonly': props.readonly,
    'base-rating--disabled': props.disabled,
    'base-rating--error': !props.readonly && displayError.value,
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseRating — 星級評分
 *
 * 視覺與互動分層：每顆星 = 底層未選取圖示（__icon--empty，定義星格尺寸）+ 上層填色
 * 圖示（__icon--fill，以寬度裁切呈現填滿比例）。互動模式再疊一層透明命中區（__hit）
 * 對應 sr-only 原生 <input type=radio>，免費取得方向鍵巡覽、表單送出與 role="radiogroup"。
 * 評分色用 --rating-color（預設金色），可用語意 color 或覆寫 token 主題化；元件自包含，scoped。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:where(.base-rating) {
  --rating-color: #faaf00; // 預設金色
  --rating-empty-color: #e0e0e0;
  --rating-size: 1.5rem; // md
  --rating-gap: 4px;
  --rating-label-color: #374151;
  --rating-danger-color: #dc2626;
}

:where(.base-rating--primary) { --rating-color: #1d4ed8; }
:where(.base-rating--success) { --rating-color: #15803d; }
:where(.base-rating--warning) { --rating-color: #b45309; }
:where(.base-rating--danger)  { --rating-color: #b91c1c; }
:where(.base-rating--info)    { --rating-color: #0369a1; }

:where(.base-rating--sm) { --rating-size: 1.125rem; }
:where(.base-rating--md) { --rating-size: 1.5rem; }
:where(.base-rating--lg) { --rating-size: 2rem; }

.base-rating {
  display: inline-flex;
  flex-direction: column;
  row-gap: 4px;

  &__label {
    font-size: 0.875rem;
    color: var(--rating-label-color);
    line-height: 1.4;
  }

  &__stars {
    display: inline-flex;
    align-items: center;
    column-gap: var(--rating-gap);
    width: min-content;
  }

  // 單顆星：相對定位容器，疊放空 / 填色圖示與命中區。
  &__star {
    position: relative;
    display: inline-block;
    width: var(--rating-size);
    height: var(--rating-size);
    line-height: 0;
  }

  &__icon {
    display: block;

    &--empty {
      color: var(--rating-empty-color);
    }

    // 填色層：靠左裁切，width 由 inline style 控制（0 ~ 100%）。
    &--fill {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      overflow: hidden;
      width: 0;
      color: var(--rating-color);
    }
  }

  &__svg {
    display: block;
    width: var(--rating-size);
    height: var(--rating-size);
    max-width: none; // 填色層裁切時，svg 仍維持整顆星寬度
    fill: currentColor;
  }

  // sr-only：視覺隱藏原生 input / 朗讀文字，但保留可聚焦 / 表單語意 / 方向鍵巡覽。
  &__input,
  &__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    white-space: nowrap;
    clip: rect(0, 0, 0, 0);
    clip-path: inset(50%);
    border: 0;
  }

  // 透明命中區：覆蓋星格、捕捉點擊與 hover；半星時左右各半。
  &__hit {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    cursor: pointer;
    z-index: 1;

    &--half {
      width: 50%;
      z-index: 2; // 半星命中區疊在整星之上，確保左半可選 0.5
    }

    &--full {
      left: 50%;
      width: 50%;
    }
  }

  // 鍵盤聚焦：原生 input 為 sr-only 且置於星格內，靠 :has 對該星畫 focus ring。
  &__star:has(.base-rating__input:focus-visible) {
    outline: 2px solid var(--rating-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  // 「未評分」(0) radio 不在任何星格內，聚焦時改於整個群組畫 focus ring，避免無焦點指示。
  &__stars:has(.base-rating__input--empty:focus-visible) {
    outline: 2px solid var(--rating-color);
    outline-offset: 2px;
    border-radius: 4px;
  }

  &__message {
    font-size: 0.75rem;
    color: var(--rating-danger-color);
  }

  // ── 狀態 ──────────────────────────────────────────────
  &--readonly &__star,
  &--readonly &__hit {
    cursor: default;
  }

  &--disabled {
    --rating-color: #d1d5db;
    --rating-empty-color: #ebecee;
  }

  &--disabled &__hit {
    cursor: not-allowed;
  }

  &--disabled &__label {
    color: #9ca3af;
  }

  &--error {
    --rating-empty-color: #f3c2c2;
  }

  // 粗指標裝置加大觸控目標（WCAG 2.5.5）。
  @media (pointer: coarse) {
    &__star {
      min-width: 44px;
      min-height: 44px;
    }
  }
}
</style>
