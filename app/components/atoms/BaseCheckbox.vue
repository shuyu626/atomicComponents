<template>
  <div
    class="base-checkbox"
    :class="rootClass"
  >
    <!-- 控制項：<label> 包住 sr-only 原生 checkbox + 自繪框 + 標籤文字，點 label 即切換。 -->
    <label class="base-checkbox__control">
      <input
        :id="fieldId"
        ref="inputRef"
        class="base-checkbox__input"
        type="checkbox"
        :name="effectiveName"
        :disabled="isDisabled"
        :checked="isChecked"
        :aria-checked="ariaChecked"
        :aria-describedby="displayMessage ? messageId : undefined"
        :aria-invalid="displayError || undefined"
        @change="onChange"
        @click.stop
        @blur="onBlur"
      >

      <span
        class="base-checkbox__box"
        aria-hidden="true"
      >
        <svg
          v-if="isIndeterminate"
          class="base-checkbox__mark"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          focusable="false"
        >
          <path
            d="M3.5 8h9"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
        <svg
          v-else-if="isChecked"
          class="base-checkbox__mark"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          focusable="false"
        >
          <path
            d="M3.5 8.5l3 3 6-6.5"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>

      <span
        v-if="label || $slots.default || $slots.label"
        class="base-checkbox__label"
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
      class="base-checkbox__message"
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
/** 勾選色（與 BaseChip 語意色一致）。 */
export type BaseCheckboxColor = 'primary' | 'success' | 'warning' | 'danger' | 'info'
</script>

<script setup lang="ts" generic="Value = boolean">
import { computed, inject, onMounted, useId, useTemplateRef, watch } from 'vue'

import { BASE_CHECKBOX_GROUP_INJECT_KEY } from '~/components/atoms/BaseCheckboxGroup.vue'
import useValidation from '~/composables/useValidation'
import type { ValidationRule } from '~/utils/validators'

export interface BaseCheckboxProps<V> {
  /** 在群組中此框代表的值（群組模式必填；獨立模式忽略）。 */
  value?: V
  /** 勾選時 v-model 的值（獨立模式）。 @default true */
  trueValue?: V | boolean
  /** 未勾選時 v-model 的值（獨立模式）。 @default false */
  falseValue?: V | boolean
  /** 半選狀態（視覺 + `aria-checked="mixed"`）。 @default false */
  indeterminate?: boolean
  /** 標籤文字（或用 `#default` / `#label` slot）。 */
  label?: string
  /** 標籤相對勾選框的位置。 @default 'right' */
  labelPlacement?: 'right' | 'left' | 'top' | 'bottom'
  /** 勾選色（群組模式未指定時繼承群組）。 @default 'primary' */
  color?: BaseCheckboxColor
  /** 停用。 @default false */
  disabled?: boolean
  /** 原生 name。 */
  name?: string
  /** 控制項 id；未提供自動產生。 */
  id?: string
  /** 輔助 / 驗證訊息（獨立模式）。 */
  message?: string
  /** 錯誤狀態（獨立模式）。 @default false */
  error?: boolean
  /** 驗證規則（獨立模式；touched-gated，change / blur 後顯示）。 */
  rules?: ValidationRule<V | boolean | undefined>[]
}

const props = withDefaults(defineProps<BaseCheckboxProps<Value>>(), {
  value: undefined,
  trueValue: undefined,
  falseValue: undefined,
  indeterminate: false,
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
  /** 勾選變動時觸發（轉發原生 change 事件）。 */
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

/** v-model：獨立模式的勾選值（boolean 或 trueValue/falseValue 自訂值）。 */
const model = defineModel<Value | boolean>()

const _id = useId()
const fieldId = computed(() => props.id || `checkbox-${_id}`)
const messageId = computed(() => `${fieldId.value}-message`)

const inputRef = useTemplateRef<HTMLInputElement>('inputRef')

/** 群組 context（在 BaseCheckboxGroup 內才有）；存在即進入「群組模式」。 */
const group = inject(BASE_CHECKBOX_GROUP_INJECT_KEY, null)

/** name / color 群組模式繼承群組（個別 prop 可覆寫）。 */
const effectiveName = computed(() => props.name ?? group?.name.value)
const effectiveColor = computed(() => props.color ?? group?.color.value ?? 'primary')

/** 勾選 / 未勾選對應的值（預設 boolean）。 */
const resolvedTrue = computed<Value | boolean>(() =>
  props.trueValue !== undefined ? props.trueValue : true,
)
const resolvedFalse = computed<Value | boolean>(() =>
  props.falseValue !== undefined ? props.falseValue : false,
)

const isDisabled = computed(() => props.disabled || (group?.disabled.value ?? false))
const isIndeterminate = computed(() => props.indeterminate)
// 群組模式：勾選 = value ∈ 群組值；獨立模式：model === trueValue。
const isChecked = computed(() =>
  group ? group.isSelected(props.value) : model.value === resolvedTrue.value,
)

const ariaChecked = computed(() =>
  isIndeterminate.value ? 'mixed' : isChecked.value ? 'true' : 'false',
)

// indeterminate 只能以 DOM property 設定（沒有對應的 HTML attribute）。
// 用 onMounted（mount 後同步）+ watch，確保掛載當下即正確、之後變動也同步。
function syncIndeterminate() {
  if (inputRef.value) inputRef.value.indeterminate = isIndeterminate.value
}
onMounted(syncIndeterminate)
watch(isIndeterminate, syncIndeterminate)

// 只有 standalone（非群組）模式才建立 child-level validation；
// 群組模式 rules 由 BaseCheckboxGroup 統一處理，子元件不另建驗證（否則回傳無意義且誤導的結果）。
const validation = group
  ? null
  : useValidation<Value | boolean | undefined>(
      () => model.value,
      () => props.rules,
    )

function onChange(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  if (group) {
    // 群組模式必須提供 value（群組 model 記的是各項 value）：漏給時若照常 toggle，
    // undefined 會被靜默推進陣列成為髒資料。改為 no-op + dev 警告，並還原勾選外觀。
    if (props.value === undefined) {
      if (import.meta.env.DEV) {
        console.warn('[BaseCheckbox] 群組模式缺少 value prop，此次變更已被忽略。')
      }
      ;(event.target as HTMLInputElement).checked = false
      return
    }
    // 群組模式：交給群組 toggle（維持容器型別、群組層驗證）。
    group.toggle(props.value)
  } else {
    model.value = checked ? resolvedTrue.value : resolvedFalse.value
    validation?.touch()
  }
  emit('change', event)
}

function onBlur() {
  // 群組模式：touch 群組（rules 設在群組層），讓未變動就離開也顯示錯誤；獨立模式 touch 自己。
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

// 訊息 / 錯誤只在獨立模式呈現；群組模式由 BaseCheckboxGroup 統一處理。
const displayError = computed(() => !group && (props.error || (validation?.error.value ?? false)))
const displayMessage = computed(() =>
  group ? undefined : (validation?.message.value ?? props.message),
)

const rootClass = computed(() => [
  `base-checkbox--${effectiveColor.value}`,
  `base-checkbox--label-${props.labelPlacement}`,
  {
    'base-checkbox--disabled': isDisabled.value,
    'base-checkbox--checked': isChecked.value && !isIndeterminate.value,
    'base-checkbox--indeterminate': isIndeterminate.value,
    'base-checkbox--error': displayError.value,
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseCheckbox — 勾選框
 *
 * <label> 包住 sr-only 原生 <input type=checkbox> + 自繪框（__box）+ 標籤文字。
 * 勾選色用 --checkbox-color（語意色預設），錯誤 / 停用讀 BaseFormField 系列的
 * --field-danger-color 等慣例色；元件自包含，scoped。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:where(.base-checkbox) {
  --checkbox-color: #1d4ed8; // primary（對齊 BaseChip / BaseButton）
  --checkbox-size: 18px;
  --checkbox-radius: 5px;
  --checkbox-border: #c6c7cb;
  --checkbox-gap: 8px;
  --checkbox-label-color: #374151;
  --checkbox-danger-color: #dc2626;
}

:where(.base-checkbox--primary) { --checkbox-color: #1d4ed8; }
:where(.base-checkbox--success) { --checkbox-color: #15803d; }
:where(.base-checkbox--warning) { --checkbox-color: #b45309; }
:where(.base-checkbox--danger)  { --checkbox-color: #b91c1c; }
:where(.base-checkbox--info)    { --checkbox-color: #0369a1; }

.base-checkbox {
  display: inline-flex;
  flex-direction: column;
  row-gap: 4px;

  &__control {
    display: inline-flex;
    align-items: center;
    column-gap: var(--checkbox-gap);
    cursor: pointer;
    user-select: none;
  }

  // 標籤位置：right（預設）/ left / top / bottom，調整 flex 方向與順序。
  &--label-left &__control { flex-direction: row-reverse; }
  &--label-top &__control { flex-direction: column-reverse; align-items: flex-start; }
  &--label-bottom &__control { flex-direction: column; align-items: flex-start; }

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

  &__box {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--checkbox-size);
    height: var(--checkbox-size);
    color: #fff; // 勾勾 / 橫線色
    background: #fff;
    border: 1.4px solid var(--checkbox-border);
    border-radius: var(--checkbox-radius);
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }

  &--checked &__box,
  &--indeterminate &__box {
    background: var(--checkbox-color);
    border-color: var(--checkbox-color);
  }

  // 鍵盤聚焦：在自繪框外畫 focus ring（input 為 sr-only，靠相鄰選擇器套用）。
  &__input:focus-visible + &__box {
    outline: 2px solid var(--checkbox-color);
    outline-offset: 2px;
  }

  &__mark {
    display: block;
  }

  &__label {
    font-size: 0.875rem;
    color: var(--checkbox-label-color);
    line-height: 1.4;
  }

  // ── 狀態 ──────────────────────────────────────────────
  &--disabled {
    --checkbox-color: #aaadb3;
    --checkbox-border: #d1d5db;
    --checkbox-label-color: #9ca3af;
  }

  &--disabled &__control {
    cursor: not-allowed;
  }

  &--error {
    --checkbox-border: var(--checkbox-danger-color);
    --checkbox-color: var(--checkbox-danger-color);
  }

  &__message {
    font-size: 0.75rem;
    color: var(--checkbox-danger-color);
  }

  // 粗指標裝置加大觸控目標（WCAG 2.5.5）。
  @media (pointer: coarse) {
    &__control {
      min-height: 44px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-checkbox__box {
    transition: none;
  }
}
</style>
