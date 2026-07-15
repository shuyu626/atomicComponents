<template>
  <BaseFormField
    class="base-text-field"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <!--
      控制項：BaseFormField 透過 scoped slot props 把 a11y 接線（id / describedby /
      invalid / required / disabled / readonly）傳進來，這裡綁到實際的 <input> 上。
      input 本身無邊框，外框與狀態色由 __container 讀 --field-* token 呈現。
    -->
    <template #default="{ id, describedby, invalid, required, disabled, readonly }">
      <div class="base-text-field__container">
        <span
          v-if="prepend || $slots.prepend"
          class="base-text-field__affix base-text-field__prepend"
        >
          <slot name="prepend">
            <component
              :is="prepend"
              v-if="isComponent(prepend)"
            />
            <template v-else>{{ prepend }}</template>
          </slot>
        </span>

        <input
          :id="id"
          ref="inputRef"
          class="base-text-field__input"
          :type="type"
          :value="inputRef?.value ?? initialModelValue"
          :name="name"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :minlength="minlength"
          :autocomplete="autocomplete"
          :inputmode="inputmode"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :aria-describedby="describedby"
          :aria-invalid="invalid"
          :aria-required="required"
          @input="onInput"
          @change="onChange"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          @focus="emit('focus', $event)"
          @blur="onBlur"
        >

        <span
          v-if="append || $slots.append"
          class="base-text-field__affix base-text-field__append"
        >
          <slot name="append">
            <component
              :is="append"
              v-if="isComponent(append)"
            />
            <template v-else>{{ append }}</template>
          </slot>
        </span>
      </div>
    </template>

    <!--
      訊息列：訊息（slot 優先於 prop）+ 字數計數。任一存在才渲染，讓 BaseFormField
      的訊息區（含 aria-describedby 參照）只在有內容時出現。計數為裝飾性資訊，標 aria-hidden。
    -->
    <template
      v-if="displayMessage || $slots.message || shouldShowCount"
      #message="{ error }"
    >
      <span class="base-text-field__message">
        <slot
          name="message"
          :error="error"
          :message="displayMessage"
        >{{ displayMessage }}</slot>
      </span>
      <span
        v-if="shouldShowCount"
        class="base-text-field__count"
        aria-hidden="true"
      >{{ count }}<template v-if="maxlength">/{{ maxlength }}</template></span>
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type { Component, InputHTMLAttributes } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useComposingModel from '~/composables/useComposingModel'
import useFieldValidation from '~/composables/useFieldValidation'
import useStringLength from '~/composables/useStringLength'
import useValidation from '~/composables/useValidation'
import isComponent from '~/utils/isComponent'
import type { ValidationRule } from '~/utils/validators'

export interface BaseTextFieldProps extends BaseFormFieldProps {
  /** 輸入框型別。`number` 會自動把值轉成數字（等同 `.number` modifier），並停用字數計數。 @default 'text' */
  type?: 'text' | 'password' | 'email' | 'tel' | 'url' | 'search' | 'number'
  /** placeholder 文字。 */
  placeholder?: string
  /** 前綴：字串直接顯示為文字；傳入 Vue 元件則以 `<component :is>` 渲染。也可改用 `#prepend` slot。 */
  prepend?: string | Component
  /** 後綴：字串直接顯示為文字；傳入 Vue 元件則以 `<component :is>` 渲染。也可改用 `#append` slot。 */
  append?: string | Component
  /** input `name`（送出表單 / 自動填入用）。 */
  name?: string
  /** 最大字元數（HTML `maxlength`）；搭配 `showCount` 會顯示 `count/maxlength`。 */
  maxlength?: number
  /** 最小字元數（HTML `minlength`）。 */
  minlength?: number
  /** input `autocomplete`（如 `'email'`、`'current-password'`、`'off'`）。 */
  autocomplete?: string
  /** input `inputmode`（行動裝置鍵盤型別，如 `'numeric'`、`'tel'`）。 */
  inputmode?: InputHTMLAttributes['inputmode']
  /** 顯示字數計數（以 grapheme cluster 計，emoji / 中日韓算 1 字）；`type="number"` 或 `.number` modifier 時自動關閉。 @default false */
  showCount?: boolean
  /**
   * 驗證規則陣列；每條規則回傳 `true`（通過）或字串（錯誤訊息）。採 touched-gated：
   * 第一次 blur 後才開始逐字即時驗證。常用規則見 `~/utils/validators`（`required` / `email`…）。
   * 父層可透過模板 ref 呼叫 `validate()` / `reset()`（如表單 submit 時強制驗證）。
   */
  rules?: ValidationRule<string | number>[]
}

const props = withDefaults(defineProps<BaseTextFieldProps>(), {
  type: 'text',
  placeholder: undefined,
  prepend: undefined,
  append: undefined,
  name: undefined,
  maxlength: undefined,
  minlength: undefined,
  autocomplete: undefined,
  inputmode: undefined,
  showCount: false,
  rules: undefined,
})

defineSlots<{
  /** 標籤內容，取代 `label` prop。 */
  label?: () => unknown
  /** 前綴內容，取代 `prepend` prop。 */
  prepend?: () => unknown
  /** 後綴內容，取代 `append` prop。 */
  append?: () => unknown
  /** 訊息內容，取代 `message` prop。scoped prop：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

const emit = defineEmits<{
  /** input 取得焦點時觸發（原生 FocusEvent 直接轉發，供失焦驗證等場景使用）。 */
  focus: [event: FocusEvent]
  /** input 失去焦點時觸發（原生 FocusEvent 直接轉發）。 */
  blur: [event: FocusEvent]
}>()

/**
 * v-model：用 `defineModel` 取代參考實作的 `useControlled` + `vModelText` 內部 API。
 * defineModel 原生處理受控 / 非受控（父層綁 v-model 才受控），`modifiers` 取得
 * `.trim` / `.number` / `.lazy` 等修飾符，行為對齊原生 v-model。
 */
const [model, modifiers] = defineModel<string | number>()

/**
 * SSR 首渲值：useComposingModel 只在 client 端把 model 同步進 DOM（且聚焦中刻意不覆寫，
 * 以保留 `.trim` 打字時的尾隨空白等行為），SSR 因此渲不出 value。
 *
 * 綁定寫成 `inputRef?.value ?? initialModelValue`：server / 首次 client render 時
 * inputRef 尚未掛上 → 用初始快照輸出值；掛載後改鏡射「render 當下的 DOM 值」——
 * Vue renderer 對 `value` prop 不做同值跳過（每次 re-render 都強制 re-patch），
 * 若綁常數快照，父層綁 v-model 時任何 re-render 都會把使用者輸入蓋回初值。
 * 鏡射 DOM 現值讓強制 re-patch 恆為 no-op，DOM 值的唯一管理者維持是 useComposingModel。
 */
const initialModelValue = model.value

// 對齊原生 vModelText：`.number` 或 `type="number"` 都把值轉成數字。
const castToNumber = computed(() => !!modifiers.number || props.type === 'number')

const inputRef = ref<HTMLInputElement | null>(null)

/**
 * IME 組字 + v-model 同步（`.trim` / `.number` / `.lazy` modifiers、組字期間不提交、
 * model → input 回寫守衛）抽至共用 composable，詳見 `useComposingModel`。
 * `castToNumber` 已合併 `.number` modifier 與 `type="number"` 兩個來源。
 */
const { onCompositionStart, onCompositionEnd, onInput, onChange } = useComposingModel(
  model,
  modifiers,
  inputRef,
  { castToNumber },
)

/**
 * 驗證：用 `useValidation` 把 `rules` 套在目前值上（touched-gated）。值以 `?? ''` 收斂，
 * 讓未輸入時走規則的「空值」分支（如 required 報錯、其餘規則放行）。
 */
const validation = useValidation<string | number>(
  () => model.value ?? '',
  () => props.rules,
)

// blur 標記 touched（之後逐字即時驗），再轉發原生 blur 事件。
function onBlur(event: FocusEvent) {
  validation.touch()
  emit('blur', event)
}

// 對外暴露：讓父表單 submit 時能強制驗證 / 重置此欄位。
defineExpose({
  /** 強制驗證（會顯示錯誤即使尚未 blur）；回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態（清掉錯誤，不動值）。 */
  reset: validation.reset,
})

/**
 * 合併「外部 props」與「驗證結果」（error 任一為真即錯誤、驗證訊息優先）後
 * 轉發給 BaseFormField，詳見 `useFieldValidation`。
 */
const { displayMessage, fieldProps } = useFieldValidation(() => props, validation)

// 數字輸入沒有「字數」概念，停用計數（對齊參考實作）。
const shouldShowCount = computed(
  () => props.showCount && !castToNumber.value,
)

const count = useStringLength(() =>
  shouldShowCount.value ? String(model.value ?? '') : '',
)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseTextField — 文字輸入控制項
 *
 * 包在 BaseFormField 內，補上實際的 <input> 與 prepend / append 外觀。
 * 所有狀態色（邊框 / focus / error / disabled）都讀 BaseFormField 對外傳遞的
 * --field-* token，不自帶一套狀態邏輯；focus 採「邊框轉 active 色 + 同色柔光 ring」
 * 的單一視覺（box-shadow），並保留透明 outline 作為 forced-colors 模式的焦點後備。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-text-field {
  &__container {
    display: flex;
    align-items: center;
    column-gap: 6px;
    overflow: hidden;
    width: 100%;
    min-height: var(--field-height);
    background: var(--field-background, #fff);
    border: 1px solid var(--field-color);
    border-radius: var(--field-radius);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: var(--field-active-color);
    }

    // 鍵盤聚焦：邊框轉 active 色 + 同色柔光 ring，單一視覺（不再與邊框形成兩條線），
    // ring 跟著 --field-active-color 走（error 狀態自動轉紅）。
    // 透明 outline 作為 forced-colors（高對比）模式的焦點後備——該模式會移除 box-shadow，
    // 系統則會把透明 outline 渲染成可見色，確保鍵盤焦點不消失。
    &:has(.base-text-field__input:focus-visible) {
      border-color: var(--field-active-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--field-active-color) 22%, transparent);
    }
  }

  &__input {
    flex: 1 1 auto;
    min-width: 0;
    height: calc(var(--field-height) - 2px);
    padding: 0 12px;
    font-size: 0.875rem;
    line-height: 1;
    color: #111827;
    background: transparent;
    border: 0;
    outline: none;

    &::placeholder {
      color: #9ca3af;
    }

    &:disabled {
      cursor: not-allowed;
      color: #9ca3af;
      // 部分瀏覽器停用態文字會再變淡，明確指定維持一致。
      -webkit-text-fill-color: #9ca3af;
    }

    &[readonly] {
      color: #6b7280;
    }
  }

  // prepend / append 已自帶 padding，input 該側不再補，避免雙重間距。
  &__prepend {
    padding-left: 12px;
  }

  &__prepend + &__input {
    padding-left: 0;
  }

  &__append {
    padding-right: 12px;
  }

  &__container:has(&__append) &__input {
    padding-right: 0;
  }

  &__affix {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    font-size: 0.875rem;
    color: #6b7280;
    user-select: none;
    white-space: nowrap;
  }

  &__message {
    flex-grow: 1;
  }

  &__count {
    flex-shrink: 0;
    // 等寬數字，計數跳動時不左右抖動。
    font-variant-numeric: tabular-nums;
  }
}
</style>
