<template>
  <div
    class="base-radio"
    :class="rootClass"
  >
    <!-- 控制項：<label> 包住 sr-only 原生 radio + 自繪圓圈 + 標籤文字，點 label 即選取。 -->
    <label class="base-radio__control">
      <input
        :id="fieldId"
        class="base-radio__input"
        type="radio"
        :name="effectiveName"
        :value="value"
        :disabled="isDisabled"
        :checked="isChecked"
        :aria-describedby="displayMessage ? messageId : undefined"
        :aria-invalid="displayError || undefined"
        @change="onChange"
        @blur="onBlur"
      >

      <span
        class="base-radio__circle"
        aria-hidden="true"
      >
        <span class="base-radio__dot" />
      </span>

      <span
        v-if="label || $slots.default || $slots.label"
        class="base-radio__label"
      >
        <slot name="label"><slot>{{ label }}</slot></slot>
      </span>
    </label>

    <!--
      訊息區（獨立模式）：驗證錯誤優先、否則 message prop。
      以 v-show 常駐 DOM（而非 v-if 動態插入）+ aria-atomic，
      讓動態出現 / 變動的驗證訊息整段被螢幕閱讀器朗讀（對齊 BaseFormField）。
    -->
    <div
      v-show="displayMessage"
      :id="messageId"
      class="base-radio__message"
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
/** 選取色（與 BaseChip / BaseCheckbox 語意色一致）。 */
export type BaseRadioColor = 'primary' | 'success' | 'warning' | 'danger' | 'info'
</script>

<script setup lang="ts" generic="Value = string | number">
import { computed, inject, useId } from 'vue'

import { BASE_RADIO_GROUP_INJECT_KEY } from '~/components/atoms/BaseRadioGroup.vue'
import useValidation from '~/composables/useValidation'
import type { ValidationRule } from '~/utils/validators'

interface BaseRadioProps<V> {
  /** 此選項代表的值（群組模式必填；獨立模式為選中時 v-model 的值）。 */
  value?: V
  /** 標籤文字（或用 `#default` / `#label` slot）。 */
  label?: string
  /** 標籤相對選圈的位置。 @default 'right' */
  labelPlacement?: 'right' | 'left' | 'top' | 'bottom'
  /** 選取色（群組模式未指定時繼承群組）。 @default 'primary' */
  color?: BaseRadioColor
  /** 停用。 @default false */
  disabled?: boolean
  /** 原生 name（群組模式未指定時繼承群組）。 */
  name?: string
  /** 控制項 id；未提供自動產生。 */
  id?: string
  /** 輔助 / 驗證訊息（獨立模式）。 */
  message?: string
  /** 錯誤狀態（獨立模式）。 @default false */
  error?: boolean
  /** 驗證規則（獨立模式；touched-gated，change / blur 後顯示）。 */
  rules?: ValidationRule<Value | undefined>[]
}

const props = withDefaults(defineProps<BaseRadioProps<Value>>(), {
  value: undefined,
  label: undefined,
  labelPlacement: 'right',
  color: undefined,
  disabled: false,
  name: undefined,
  id: undefined,
  message: undefined,
  error: false,
  rules: undefined,
})

const emit = defineEmits<{
  /** 選取變動時觸發（轉發原生 change 事件）。 */
  change: [event: Event]
}>()

defineSlots<{
  /** 標籤內容（取代 `label` prop）。 */
  default?: () => unknown
  /** 標籤內容（同 default，語意命名）。 */
  label?: () => unknown
  /** 訊息內容（取代 `message` prop）。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** v-model：獨立模式的選取值（選中時等於 `value`）。 */
const model = defineModel<Value>()

const _id = useId()
const fieldId = computed(() => props.id || `radio-${_id}`)
const messageId = computed(() => `${fieldId.value}-message`)

/** 群組 context（在 BaseRadioGroup 內才有）；存在即進入「群組模式」。 */
const group = inject(BASE_RADIO_GROUP_INJECT_KEY, null)

/** name / color 群組模式繼承群組（個別 prop 可覆寫）。 */
const effectiveName = computed(() => props.name ?? group?.name.value)
const effectiveColor = computed(() => props.color ?? group?.color.value ?? 'primary')

const isDisabled = computed(() => props.disabled || (group?.disabled.value ?? false))
// 群組模式：選中 = value === 群組值；獨立模式：model === value。
// 無 value 的 radio 不可能被選中（避免 undefined === undefined 誤判為選中）。
const isChecked = computed(() =>
  props.value !== undefined &&
  (group ? group.isSelected(props.value) : model.value === props.value),
)

// 只有 standalone（非群組）模式才建立 child-level validation；
// 群組模式 rules 由 BaseRadioGroup 統一處理，子元件不另建驗證（否則回傳無意義且誤導的結果）。
const validation = group
  ? null
  : useValidation<Value | undefined>(
      () => model.value,
      () => props.rules,
    )

function onChange(event: Event) {
  // radio 只在「變成選中」時觸發 change，故一律 select（無法靠點擊取消）。
  if (group) {
    group.select(props.value)
  } else {
    model.value = props.value
    validation?.touch()
  }
  emit('change', event)
}

function onBlur() {
  // 群組模式：touch 群組（rules 設在群組層），讓未選取就離開也顯示錯誤；獨立模式 touch 自己。
  if (group) group.touch()
  else validation?.touch()
}

// 群組模式不暴露 validate / reset（rules 由群組處理，子層驗證無意義）；standalone 模式才暴露。
defineExpose(
  validation
    ? {
        /** 強制驗證（即使尚未 touch 也顯示錯誤）；回傳是否通過。 */
        validate: validation.validate,
        /** 重置驗證顯示狀態（不動值）。 */
        reset: validation.reset,
      }
    : {},
)

// 訊息 / 錯誤只在獨立模式呈現；群組模式由 BaseRadioGroup 統一處理。
const displayError = computed(() => !group && (props.error || (validation?.error.value ?? false)))
const displayMessage = computed(() =>
  group ? undefined : (validation?.message.value ?? props.message),
)

const rootClass = computed(() => [
  `base-radio--${effectiveColor.value}`,
  `base-radio--label-${props.labelPlacement}`,
  {
    'base-radio--disabled': isDisabled.value,
    'base-radio--checked': isChecked.value,
    'base-radio--error': displayError.value,
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseRadio — 單選圈
 *
 * <label> 包住 sr-only 原生 <input type=radio> + 自繪圓圈（__circle）+ 內點（__dot）+ 標籤文字。
 * 選取色用 --radio-color（語意色預設），錯誤 / 停用讀 BaseFormField 系列的
 * --field-danger-color 等慣例色；元件自包含，scoped。
 *
 * 對齊 BaseCheckbox 的視覺與 token 命名，僅形狀（圓形）與「不可取消」語意不同。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:where(.base-radio) {
  --radio-color: #1d4ed8; // primary（對齊 BaseChip / BaseCheckbox）
  --radio-size: 18px;
  --radio-dot-scale: 0.62; // 內點相對選圈直徑的比例
  --radio-border: #c6c7cb;
  --radio-gap: 8px;
  --radio-label-color: #374151;
  --radio-danger-color: #dc2626;
}

:where(.base-radio--primary) { --radio-color: #1d4ed8; }
:where(.base-radio--success) { --radio-color: #15803d; }
:where(.base-radio--warning) { --radio-color: #b45309; }
:where(.base-radio--danger)  { --radio-color: #b91c1c; }
:where(.base-radio--info)    { --radio-color: #0369a1; }

.base-radio {
  display: inline-flex;
  flex-direction: column;
  row-gap: 4px;

  &__control {
    display: inline-flex;
    align-items: center;
    column-gap: var(--radio-gap);
    cursor: pointer;
    user-select: none;
  }

  // 標籤位置：right（預設）/ left / top / bottom，調整 flex 方向與順序。
  &--label-left &__control { flex-direction: row-reverse; }
  &--label-top &__control { flex-direction: column-reverse; align-items: flex-start; }
  &--label-bottom &__control { flex-direction: column; align-items: flex-start; }

  // sr-only：視覺隱藏原生 input，但保留可聚焦 / 可點 / 表單語意與方向鍵巡覽。
  &__input {
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

  &__circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--radio-size);
    height: var(--radio-size);
    background: #fff;
    border: 1.6px solid var(--radio-border);
    border-radius: 9999px;
    transition: border-color 0.15s ease;
  }

  &__dot {
    width: calc(var(--radio-size) * var(--radio-dot-scale));
    height: calc(var(--radio-size) * var(--radio-dot-scale));
    background: var(--radio-color);
    border-radius: 9999px;
    transform: scale(0);
    transition: transform 0.15s ease;
  }

  &--checked &__circle { border-color: var(--radio-color); }
  &--checked &__dot { transform: scale(1); }

  // 鍵盤聚焦：在自繪圈外畫 focus ring（input 為 sr-only，靠相鄰選擇器套用）。
  &__input:focus-visible + &__circle {
    outline: 2px solid var(--radio-color);
    outline-offset: 2px;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--radio-label-color);
    line-height: 1.4;
  }

  // ── 狀態 ──────────────────────────────────────────────
  &--disabled {
    --radio-color: #aaadb3;
    --radio-border: #d1d5db;
    --radio-label-color: #9ca3af;
  }

  &--disabled &__control {
    cursor: not-allowed;
  }

  &--error {
    --radio-border: var(--radio-danger-color);
    --radio-color: var(--radio-danger-color);
  }

  &__message {
    font-size: 0.75rem;
    color: var(--radio-danger-color);
  }

  // 粗指標裝置加大觸控目標（WCAG 2.5.5）。
  @media (pointer: coarse) {
    &__control {
      min-height: 44px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-radio__circle,
  .base-radio__dot {
    transition: none;
  }
}
</style>
