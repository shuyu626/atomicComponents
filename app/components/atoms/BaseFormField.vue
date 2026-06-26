<template>
  <div
    class="base-form-field"
    :class="rootClass"
    :style="rootStyle"
  >
    <div class="base-form-field__container">
      <!-- 標籤：有 label prop 或 #label slot 才渲染；`for` 綁定下方控制項的 id。 -->
      <div
        v-if="label || $slots.label"
        class="base-form-field__label"
      >
        <label
          :id="labelId"
          class="base-form-field__label-content"
          :for="fieldId"
        >
          <slot
            name="label"
            :label="label"
          >
            <span>{{ label }}</span>
          </slot>
        </label>
      </div>

      <div class="base-form-field__content">
        <!--
          控制項插槽：把 a11y 接線資訊（id / aria-describedby / aria-invalid…）
          以 scoped slot props 暴露給使用端，由使用端綁到實際的 input / select 上。
        -->
        <div class="base-form-field__control">
          <slot
            :id="fieldId"
            :labelledby="(label || $slots.label) ? labelId : undefined"
            :describedby="(message || $slots.message) ? messageId : undefined"
            :invalid="error || undefined"
            :required="required || undefined"
            :disabled="disabled || undefined"
            :readonly="readonly || undefined"
          />
        </div>

        <!--
          訊息區：以 v-show 常駐 DOM，讓 aria-describedby 參照穩定；
          aria-live="polite" + aria-atomic 讓動態出現 / 變動的驗證訊息整段被朗讀。
          「是否有訊息」直接讀 template 的 $slots.message（響應式），slot 動態增減也正確。
        -->
        <div
          v-show="message || $slots.message"
          :id="messageId"
          class="base-form-field__message"
          aria-live="polite"
          aria-atomic="true"
        >
          <slot
            name="message"
            :error="error"
            :message="message"
          >
            {{ message }}
          </slot>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'

import type { CSSProperties } from 'vue'

import toUnit from '~/utils/toUnit'

export interface BaseFormFieldProps {
  /** 控制項 id；未提供時自動產生 `field-{useId}`，並同步給 `<label for>` 與 default slot。 */
  id?: string
  /** 標籤文字；提供 `#label` slot 時以 slot 為準。 */
  label?: string
  /**
   * 標籤位置：`left`（與控制項並排）或 `top`（置於控制項上方）。
   * @default 'left'
   */
  labelPlacement?: 'left' | 'top'
  /**
   * `labelPlacement="left"` 時的標籤寬度；數字補 `px`，字串原樣帶入（如 `'6rem'`、`'fit-content'`）。
   * @default 'fit-content'
   */
  labelWidth?: string | number
  /**
   * 視覺隱藏標籤但保留給螢幕閱讀器（sr-only）；版面不再保留標籤欄。
   * @default false
   */
  hideLabel?: boolean
  /** 輔助 / 驗證訊息文字；提供 `#message` slot 時以 slot 為準。 */
  message?: string
  /**
   * 錯誤狀態：套用錯誤色 token、訊息轉紅，並透過 slot prop `invalid` 提示使用端綁 `aria-invalid`。
   * @default false
   */
  error?: boolean
  /**
   * 必填：在標籤後顯示 `*`，並透過 slot prop `required` 提示使用端綁 `aria-required`。
   * @default false
   */
  required?: boolean
  /**
   * 停用：套用停用樣式 token，並透過 slot prop `disabled` 傳遞給控制項。
   * @default false
   */
  disabled?: boolean
  /**
   * 唯讀：套用唯讀 modifier，並透過 slot prop `readonly` 傳遞給控制項。
   * @default false
   */
  readonly?: boolean
}

const props = withDefaults(defineProps<BaseFormFieldProps>(), {
  id: undefined,
  label: undefined,
  labelPlacement: 'left',
  labelWidth: 'fit-content',
  hideLabel: false,
  message: undefined,
  error: false,
  required: false,
  disabled: false,
  readonly: false,
})

defineSlots<{
  /** 標籤內容，取代 `label` prop。scoped prop：`label`。 */
  label?: (props: { label?: string }) => unknown
  /**
   * 控制項插槽。scoped props：`id`（綁到控制項）、`describedby`（綁 `aria-describedby`）、
   * `invalid` / `required` / `disabled` / `readonly`（對應綁 `aria-invalid` / `aria-required` / `disabled` / `readonly`）。
   */
  default?: (props: {
    id: string
    labelledby: string | undefined
    describedby: string | undefined
    invalid: true | undefined
    required: true | undefined
    disabled: true | undefined
    readonly: true | undefined
  }) => unknown
  /** 訊息內容，取代 `message` prop。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

const _id = useId()
const fieldId = computed(() => props.id || `field-${_id}`)

/** 標籤元素 id；供 div 型控制項（如 BaseSelect 的 combobox）以 `aria-labelledby` 取名。 */
const labelId = computed(() => `${fieldId.value}-label`)

/** 訊息容器 id；同時給控制項的 aria-describedby 參照（見 template）。 */
const messageId = computed(() => `${fieldId.value}-message`)

const rootClass = computed(() => [
  `base-form-field--label-${props.labelPlacement}`,
  {
    'base-form-field--error': props.error,
    'base-form-field--readonly': props.readonly,
    'base-form-field--disabled': props.disabled,
    // 隱藏標籤時不顯示必填星號（星號掛在標籤上）。
    'base-form-field--required': !props.hideLabel && props.required,
    'base-form-field--hide-label': props.hideLabel,
  },
])

/** 標籤寬度只在有標籤欄時注入；hideLabel 時版面不保留標籤欄，無需設定。 */
const rootStyle = computed<CSSProperties | undefined>(() =>
  props.hideLabel ? undefined : { '--field-label-width': toUnit(props.labelWidth) },
)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseFormField — 表單欄位容器
 *
 * 負責「標籤 + 控制項 + 訊息」三段式版面與狀態（error / disabled / readonly /
 * required）的統一呈現，本身不含任何 input。控制項以 default slot 傳入，
 * 並透過 scoped slot props 取得 a11y 接線（id / describedby / invalid…）。
 *
 * 所有外觀抽成 --field-* token，取代參考實作對全域 SCSS $color-map 與
 * sr-only mixin 的相依；覆寫 token 即可主題化，元件可獨立運作。
 *
 *   .base-form-field { --field-height: 44px; --field-active-color: #db2777; }
 *
 * --field-color / --field-active-color / --field-background / --field-radius 是「狀態傳遞
 * token」，供包在 default slot 內的控制項讀取（如 input 邊框 / 圓角跟著 error 轉紅）。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/* 預設 token 用 :where()（specificity 0），確保使用端 class 覆寫得動。 */
:where(.base-form-field) {
  --field-background: transparent;
  --field-color: #d1d5db; // 控制項預設邊框 / 輪廓色（供子控制項讀取）
  --field-active-color: #1d4ed8; // focus / active（= primary blue-700，對齊 BaseButton --btn-accent）
  --field-radius: 6px; // 控制項圓角（供子控制項讀取，對齊 BaseButton --btn-radius）
  --field-height: 36px; // 對齊 BaseButton --btn-height，並排時等高
  --field-label-gap-x: 8px; // label-left：標籤與控制項水平間距
  --field-label-gap-y: 6px; // label-top：標籤與控制項垂直間距
  --field-label-font-size: 0.875rem;
  --field-label-color: #374151; // 標籤文字色（gray-700，對齊庫內文字色）
  --field-message-font-size: 0.75rem;
  --field-message-color: #6b7280;
  --field-message-gap-y: 6px; // 控制項與訊息列的垂直間距
  --field-danger-color: #dc2626;
}

.base-form-field {
  // ── 狀態：停用 ────────────────────────────────────────
  &--disabled {
    --field-background: rgba(239, 239, 239, 0.3);
    --field-color: #d1d5db;
    --field-active-color: #d1d5db;
  }

  // ── 狀態：錯誤（邊框 / active / 訊息全轉紅，供子控制項讀取）──
  &--error {
    --field-color: var(--field-danger-color);
    --field-active-color: var(--field-danger-color);
    --field-message-color: var(--field-danger-color);
  }

  &__container {
    display: flex;
    width: 100%;
  }

  &--label-left &__container {
    align-items: stretch;
    column-gap: var(--field-label-gap-x);
  }

  &--label-top &__container {
    flex-direction: column;
    row-gap: var(--field-label-gap-y);
  }

  &__label {
    flex-shrink: 0;
    font-size: var(--field-label-font-size);
    color: var(--field-label-color);
    user-select: none;
  }

  &--label-left &__label {
    width: var(--field-label-width);
    line-height: var(--field-height);
  }

  // sr-only：視覺隱藏但保留給螢幕閱讀器（取代參考實作的全域 @include sr-only）。
  &--hide-label &__label {
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

  &--required &__label-content::after {
    padding-left: 4px;
    color: var(--field-danger-color);
    content: '*';
  }

  &__content {
    width: 100%;
    // min-width: 0 讓 content 在 flex（label-left）下能縮，控制項內超長內容才不會撐破。
    min-width: 0;
  }

  &__control {
    flex-grow: 1;
    display: flex;
    align-items: center;
    min-height: var(--field-height);

    // 粗指標裝置（手機 / 平板）撐到 44px 觸控目標，對齊 BaseButton（WCAG 2.5.5）。
    @media (pointer: coarse) {
      min-height: max(var(--field-height), 44px);
    }
  }

  &__message {
    display: flex;
    margin-top: var(--field-message-gap-y);
    padding-right: 4px;
    padding-left: 4px;
    font-size: var(--field-message-font-size);
    color: var(--field-message-color);
  }
}
</style>
