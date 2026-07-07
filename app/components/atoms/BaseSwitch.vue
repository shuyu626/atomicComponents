<template>
  <div
    class="base-switch"
    :class="rootClass"
  >
    <!-- 控制項：<label> 包住標籤 + （inactiveText）+ sr-only 原生 checkbox + 自繪軌道 + （activeText），點 label 即切換。 -->
    <label class="base-switch__control">
      <span
        v-if="label || $slots.default || $slots.label"
        class="base-switch__label"
      >
        <slot name="label"><slot>{{ label }}</slot></slot>
      </span>

      <span class="base-switch__field">
        <span
          v-if="inactiveText"
          class="base-switch__text base-switch__text--inactive"
          aria-hidden="true"
        >
          {{ inactiveText }}
        </span>

        <!--
          原生 <input type=checkbox role=switch>：checked 狀態由瀏覽器自動映射到無障礙樹，
          毋須再加冗餘的 aria-checked（避免兩處狀態來源不同步）。
        -->
        <input
          :id="fieldId"
          ref="inputRef"
          class="base-switch__input"
          type="checkbox"
          role="switch"
          :name="name"
          :disabled="isDisabled"
          :checked="isChecked"
          :aria-describedby="displayMessage ? messageId : undefined"
          :aria-invalid="displayError || undefined"
          @change="onChange"
          @blur="onBlur"
        >

        <span
          class="base-switch__track"
          aria-hidden="true"
        >
          <span class="base-switch__thumb" />
        </span>

        <span
          v-if="activeText"
          class="base-switch__text base-switch__text--active"
          aria-hidden="true"
        >
          {{ activeText }}
        </span>
      </span>
    </label>

    <!--
      訊息區：驗證錯誤優先、否則 message prop。
      以 v-show 常駐 DOM（而非 v-if 動態插入）+ aria-atomic，
      讓動態出現 / 變動的驗證訊息整段被螢幕閱讀器朗讀（對齊 BaseFormField）。
    -->
    <div
      v-show="displayMessage"
      :id="messageId"
      class="base-switch__message"
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
/** 開啟色（與 BaseCheckbox / BaseChip 語意色一致）。 */
export type BaseSwitchColor = 'primary' | 'success' | 'warning' | 'danger' | 'info'
</script>

<script setup lang="ts" generic="Value = boolean">
import { computed, useId, useTemplateRef } from 'vue'

import useValidation from '~/composables/useValidation'
import type { ValidationRule } from '~/utils/validators'

export interface BaseSwitchProps<V> {
  /** 開啟時 v-model 的值。 @default true */
  activeValue?: V | boolean
  /** 關閉時 v-model 的值。 @default false */
  inactiveValue?: V | boolean
  /** 標籤文字（或用 `#default` / `#label` slot）。 */
  label?: string
  /** 標籤相對開關的位置。 @default 'left' */
  labelPlacement?: 'right' | 'left' | 'top' | 'bottom'
  /** 開啟色。 @default 'primary' */
  color?: BaseSwitchColor
  /** 開啟時顯示於軌道旁的文字。 */
  activeText?: string
  /** 關閉時顯示於軌道旁的文字。 */
  inactiveText?: string
  /** 停用。 @default false */
  disabled?: boolean
  /** 原生 name。 */
  name?: string
  /** 控制項 id；未提供自動產生。 */
  id?: string
  /** 輔助 / 驗證訊息。 */
  message?: string
  /** 錯誤狀態。 @default false */
  error?: boolean
  /** 驗證規則（touched-gated，change / blur 後顯示）。 */
  rules?: ValidationRule<V | boolean | undefined>[]
}

const props = withDefaults(defineProps<BaseSwitchProps<Value>>(), {
  activeValue: undefined,
  inactiveValue: undefined,
  label: undefined,
  labelPlacement: 'left',
  color: 'primary',
  activeText: undefined,
  inactiveText: undefined,
  disabled: false,
  name: undefined,
  id: undefined,
  message: undefined,
  error: false,
  rules: undefined,
})

const emit = defineEmits<{
  /** 切換時觸發（轉發原生 change 事件）。 */
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

/** v-model：開關值（boolean 或 activeValue/inactiveValue 自訂值）。 */
const model = defineModel<Value | boolean>()

const _id = useId()
const fieldId = computed(() => props.id || `switch-${_id}`)
const messageId = computed(() => `${fieldId.value}-message`)

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

/** 開 / 關對應的值（預設 boolean）。 */
const resolvedActive = computed<Value | boolean>(() =>
  props.activeValue !== undefined ? props.activeValue : true,
)
const resolvedInactive = computed<Value | boolean>(() =>
  props.inactiveValue !== undefined ? props.inactiveValue : false,
)

const isDisabled = computed(() => props.disabled)
// 有設 activeValue / inactiveValue 任一即進入「自訂值模式」（開啟 = model === activeValue）；
// 兩者皆未設時退回 boolean 真值判斷。只看 activeValue 會讓「僅設 inactiveValue」時誤判（如初始 'off' 被當 truthy）。
const hasCustomValue = computed(
  () => props.activeValue !== undefined || props.inactiveValue !== undefined,
)
const isChecked = computed(() =>
  hasCustomValue.value ? model.value === resolvedActive.value : !!model.value,
)

const validation = useValidation<Value | boolean | undefined>(
  () => model.value,
  () => props.rules,
)

function onChange(event: Event) {
  if (isDisabled.value) return
  const checked = (event.target as HTMLInputElement).checked
  model.value = checked ? resolvedActive.value : resolvedInactive.value
  validation.touch()
  emit('change', event)
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

const rootClass = computed(() => [
  `base-switch--${props.color}`,
  `base-switch--label-${props.labelPlacement}`,
  {
    'base-switch--disabled': isDisabled.value,
    'base-switch--checked': isChecked.value,
    'base-switch--error': displayError.value,
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseSwitch — 開關
 *
 * <label> 包住 sr-only 原生 <input type=checkbox role=switch> + 自繪軌道（__track）
 * + 滑塊（__thumb），可選兩側狀態文字（activeText / inactiveText）與主標籤（label）。
 * 開啟色用 --switch-color（語意色預設），錯誤 / 停用讀慣例色；元件自包含，scoped。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:where(.base-switch) {
  --switch-color: #1d4ed8; // primary（對齊 BaseCheckbox / BaseChip）
  --switch-width: 44px;
  --switch-height: 24px;
  --switch-padding: 3px;
  --switch-track-off: #d1d5db;
  --switch-thumb-color: #fff;
  --switch-gap: 8px;
  --switch-text-gap: 8px;
  --switch-label-color: #374151;
  --switch-danger-color: #dc2626;
}

:where(.base-switch--primary) { --switch-color: #1d4ed8; }
:where(.base-switch--success) { --switch-color: #15803d; }
:where(.base-switch--warning) { --switch-color: #b45309; }
:where(.base-switch--danger)  { --switch-color: #b91c1c; }
:where(.base-switch--info)    { --switch-color: #0369a1; }

.base-switch {
  display: inline-flex;
  flex-direction: column;
  row-gap: 4px;

  &__control {
    display: inline-flex;
    align-items: center;
    column-gap: var(--switch-gap);
    cursor: pointer;
    user-select: none;
  }

  // 標籤位置：left（預設）/ right / top / bottom，調整 flex 方向與順序。
  &--label-right &__control { flex-direction: row-reverse; }
  &--label-top &__control { flex-direction: column; align-items: flex-start; }
  &--label-bottom &__control { flex-direction: column-reverse; align-items: flex-start; }

  &__field {
    display: inline-flex;
    align-items: center;
    column-gap: var(--switch-text-gap);
  }

  // sr-only：視覺隱藏原生 input，但保留可聚焦 / 可點 / 表單語意。
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

  &__track {
    position: relative;
    display: inline-block;
    flex-shrink: 0;
    width: var(--switch-width);
    height: var(--switch-height);
    background-color: var(--switch-track-off);
    border-radius: 9999px;
    transition: background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &__thumb {
    --switch-thumb-size: calc(var(--switch-height) - 2 * var(--switch-padding));

    position: absolute;
    top: var(--switch-padding);
    left: var(--switch-padding);
    width: var(--switch-thumb-size);
    height: var(--switch-thumb-size);
    background-color: var(--switch-thumb-color);
    border-radius: 9999px;
    box-shadow: 1px 1px 2px rgba(0, 0, 0, 0.15);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // 開啟：軌道上色、滑塊平移到右側（位移 = 軌道寬 - 軌道高）。
  &--checked &__track {
    background-color: var(--switch-color);
  }

  &--checked &__thumb {
    transform: translateX(calc(var(--switch-width) - var(--switch-height)));
  }

  // 鍵盤聚焦：在軌道外畫 focus ring（input 為 sr-only，靠相鄰選擇器套用）。
  &__input:focus-visible + &__track {
    outline: 2px solid var(--switch-color);
    outline-offset: 2px;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--switch-label-color);
    line-height: 1.4;
  }

  &__text {
    font-size: 0.875rem;
    color: #9ca3af;
    transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  // 啟用側文字隨狀態上色。
  &--checked &__text--active,
  &:not(&--checked) &__text--inactive {
    color: var(--switch-color);
  }

  // ── 狀態 ──────────────────────────────────────────────
  &--disabled {
    --switch-color: #aaadb3;
    --switch-track-off: #e5e7eb;
    --switch-label-color: #9ca3af;
  }

  &--disabled &__control {
    cursor: not-allowed;
  }

  &--error {
    --switch-color: var(--switch-danger-color);
  }

  &__message {
    font-size: 0.75rem;
    color: var(--switch-danger-color);
  }

  // 粗指標裝置加大觸控目標（WCAG 2.5.5）。
  @media (pointer: coarse) {
    &__control {
      min-height: 44px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-switch__track,
  .base-switch__thumb,
  .base-switch__text {
    transition: none;
  }
}
</style>
