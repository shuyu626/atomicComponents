<template>
  <BaseFormField
    class="base-textarea"
    :class="{ 'base-textarea--autosize': autosize }"
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
      invalid / required / disabled / readonly）傳進來，這裡綁到實際的 <textarea> 上。
      textarea 本身無邊框，外框與狀態色由 __container 讀 --field-* token 呈現。
    -->
    <template #default="{ id, describedby, invalid, required, disabled, readonly }">
      <div class="base-textarea__container">
        <span
          v-if="prepend || $slots.prepend"
          class="base-textarea__affix base-textarea__prepend"
        >
          <slot name="prepend">
            <component
              :is="prepend"
              v-if="isComponent(prepend)"
            />
            <template v-else>{{ prepend }}</template>
          </slot>
        </span>

        <textarea
          :id="id"
          ref="inputRef"
          class="base-textarea__input"
          :name="name"
          :placeholder="placeholder"
          :maxlength="maxlength"
          :minlength="minlength"
          :autocomplete="autocomplete"
          :rows="rows"
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
        />

        <span
          v-if="append || $slots.append"
          class="base-textarea__affix base-textarea__append"
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
      <span class="base-textarea__message">
        <slot
          name="message"
          :error="error"
          :message="displayMessage"
        >{{ displayMessage }}</slot>
      </span>
      <span
        v-if="shouldShowCount"
        class="base-textarea__count"
        aria-hidden="true"
      >{{ count }}<template v-if="maxlength">/{{ maxlength }}</template></span>
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue'

import type { Component, InputHTMLAttributes } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFormFieldProps from '~/composables/useFormFieldProps'
import useResizeObserver from '~/composables/useResizeObserver'
import useStringLength from '~/composables/useStringLength'
import useValidation from '~/composables/useValidation'
import clamp from '~/utils/clamp'
import isComponent from '~/utils/isComponent'
import type { ValidationRule } from '~/utils/validators'

export interface BaseTextareaProps extends BaseFormFieldProps {
  /** placeholder 文字。 */
  placeholder?: string
  /** 前綴：字串直接顯示為文字；傳入 Vue 元件則以 `<component :is>` 渲染。也可改用 `#prepend` slot。 */
  prepend?: string | Component
  /** 後綴：字串直接顯示為文字；傳入 Vue 元件則以 `<component :is>` 渲染。也可改用 `#append` slot。 */
  append?: string | Component
  /** textarea `name`（送出表單 / 自動填入用）。 */
  name?: string
  /** 最大字元數（HTML `maxlength`）；搭配 `showCount` 會顯示 `count/maxlength`。 */
  maxlength?: number
  /** 最小字元數（HTML `minlength`）。 */
  minlength?: number
  /** textarea `autocomplete`（如 `'off'`、`'on'`）。 */
  autocomplete?: InputHTMLAttributes['autocomplete']
  /** 初始 / 最小可見行數（HTML `rows`）；`autosize` 時作為高度下界。 @default 2 */
  rows?: number
  /** `autosize` 時的最大行數上界；未設則不限制（內容多長就多高）。 */
  maxRows?: number
  /**
   * 隨內容自動調整高度。`true` 每次量測；`'cacheMeasurements'` 快取
   * padding / line-height（樣式不變時較省，但字體 / 行高變動後不會重量）。 @default false
   */
  autosize?: boolean | 'cacheMeasurements'
  /** 顯示字數計數（以 grapheme cluster 計，emoji / 中日韓算 1 字）。 @default false */
  showCount?: boolean
  /**
   * 驗證規則陣列；每條規則回傳 `true`（通過）或字串（錯誤訊息）。採 touched-gated：
   * 第一次 blur 後才開始逐字即時驗證。常用規則見 `~/utils/validators`（`required` / `minLength`…）。
   * 父層可透過模板 ref 呼叫 `validate()` / `reset()`（如表單 submit 時強制驗證）。
   */
  rules?: ValidationRule<string>[]
}

const props = withDefaults(defineProps<BaseTextareaProps>(), {
  placeholder: undefined,
  prepend: undefined,
  append: undefined,
  name: undefined,
  maxlength: undefined,
  minlength: undefined,
  autocomplete: undefined,
  rows: 2,
  maxRows: undefined,
  autosize: false,
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
  /** textarea 取得焦點時觸發（原生 FocusEvent 直接轉發，供失焦驗證等場景使用）。 */
  focus: [event: FocusEvent]
  /** textarea 失去焦點時觸發（原生 FocusEvent 直接轉發）。 */
  blur: [event: FocusEvent]
}>()

/**
 * v-model：用 `defineModel` 取代參考實作的 `useControlled` + `vModelText` 內部 API。
 * defineModel 原生處理受控 / 非受控（父層綁 v-model 才受控），`modifiers` 取得
 * `.trim` / `.lazy` 等修飾符，行為對齊原生 v-model。textarea 值恆為字串，故不支援 `.number`。
 */
const [model, modifiers] = defineModel<string>()

/** 從 DOM 字串套用 `.trim` modifier，轉成最終要寫入 model 的值。 */
function readValue(raw: string): string {
  return modifiers.trim ? raw.trim() : raw
}

const inputRef = ref<HTMLTextAreaElement | null>(null)

// IME 組字狀態：注音 / 拼音 / 日文等組字途中不提交中途值，對齊原生 v-model
// （`vModelText` 內建以 `el.composing` 達成，改用 defineModel 後在此手動補回）。
let composing = false

function onCompositionStart() {
  composing = true
}

function onCompositionEnd(event: Event) {
  if (!composing) return
  composing = false
  // 組字結束才提交最終值；`.lazy` 仍留待 change 提交。
  if (!modifiers.lazy) {
    model.value = readValue((event.target as HTMLTextAreaElement).value)
  }
}

function onInput(event: Event) {
  // 組字中 / `.lazy`（改在 change 提交）期間不更新 model，但仍即時調整高度。
  if (composing || modifiers.lazy) {
    calcTextareaHeight()
    return
  }
  model.value = readValue((event.target as HTMLTextAreaElement).value)
  calcTextareaHeight()
}

function onChange(event: Event) {
  const el = event.target as HTMLTextAreaElement
  // change（blur）一律提交：涵蓋 `.lazy`，也讓 `.trim` 在失焦後把顯示值正規化（去尾隨空白）——
  // 此時 model 可能未變、watchEffect 不會觸發，故在這裡直接把 el.value 同步成正規化後的字串。
  model.value = readValue(el.value)
  const canonical = model.value == null ? '' : String(model.value)
  if (el.value !== canonical) el.value = canonical
}

/**
 * model → textarea 同步：手動指派 `el.value` 並複刻 Vue `vModelText.beforeUpdate` 的守衛——
 * 聚焦中 / 組字中且「修整後的值與 model 相等」時不覆寫，避免吃掉使用者正在輸入的字
 * （如 `.trim` 的尾隨空白）。用模板 ref + watchEffect 取代 `:value` 綁定
 * （`:value` 會在每次 model 變動無條件覆寫，破壞上述輸入體驗）。
 */
watchEffect(() => {
  const el = inputRef.value
  if (!el) return

  const value = model.value
  const next = value == null ? '' : String(value)

  if (typeof document !== 'undefined' && document.activeElement === el) {
    if (composing || modifiers.lazy) return
    if (modifiers.trim && el.value.trim() === value) return
  }

  if (el.value !== next) el.value = next
})

/**
 * 驗證：用 `useValidation` 把 `rules` 套在目前值上（touched-gated）。值以 `?? ''` 收斂，
 * 讓未輸入時走規則的「空值」分支（如 required 報錯、其餘規則放行）。
 */
const validation = useValidation<string>(() => model.value ?? '', () => props.rules)

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
 * 合併「外部 props」與「驗證結果」後再轉發給 BaseFormField：
 * - error：`props.error` 或驗證失敗任一為真即錯誤（讓父層仍可用 error prop 強制錯誤，如 server 端驗證）。
 * - message：驗證**錯誤訊息優先**（讓使用者看到「為何不合規」）；無驗證錯誤時退回 `props.message`
 *   靜態提示（如說明文字）。沒有 rules 時 validation.message 恆為 undefined，等同只顯示 `props.message`。
 */
const displayError = computed(() => props.error || validation.error.value)
const displayMessage = computed(() => validation.message.value ?? props.message)

/** 從完整 props 收斂出欄位語意（label / error / required…），並以合併後的 error / message 覆寫，轉發給 BaseFormField。 */
const fieldProps = useFormFieldProps(() => ({
  ...props,
  error: displayError.value,
  message: displayMessage.value,
}))

const shouldShowCount = computed(() => props.showCount)

const count = useStringLength(() =>
  shouldShowCount.value ? String(model.value ?? '') : '',
)

// ── autosize（自動高度）────────────────────────────────────────────────────────
//
// 改寫自參考實作：以「scrollHeight 扣掉 padding 換算行數」決定 textarea.rows，
// 夾在 rows（下界）與 maxRows（上界）之間。針對參考實作補強：
//   1. line-height 為 'normal'（parseFloat → NaN）時退回 font-size * 1.2，避免高度算崩。
//   2. 不只在 input / resize 時重算——model 變動（程式化賦值）也重算（見下方 watch）。

function getSizingStyle(node: HTMLElement) {
  const style = window.getComputedStyle(node)

  const paddingSize =
    parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)

  let lineHeight = parseFloat(style.lineHeight)
  // line-height: normal → NaN，退回以 font-size 推估（瀏覽器預設約 1.2 倍）。
  if (Number.isNaN(lineHeight)) lineHeight = parseFloat(style.fontSize) * 1.2

  return { paddingSize, lineHeight }
}

let measurementsCache: ReturnType<typeof getSizingStyle> | undefined

function calcTextareaHeight() {
  if (!props.autosize) return

  const node = inputRef.value
  if (!node) return

  // 先還原到下界行數，scrollHeight 才能正確反映「內容需要的」高度（不受上次撐高殘留影響）。
  node.rows = props.rows

  const { paddingSize, lineHeight } =
    props.autosize === 'cacheMeasurements' && measurementsCache
      ? measurementsCache
      : (measurementsCache = getSizingStyle(node))

  node.style.overflow = 'hidden'

  const newRows = clamp(
    Math.ceil((node.scrollHeight - paddingSize) / lineHeight),
    props.rows,
    props.maxRows ?? Infinity,
  )

  node.rows = newRows
  node.style.overflow = ''
}

// 容器尺寸變化（父層 flex 重排、字體載入後撐高…）時重算高度。
useResizeObserver(inputRef, calcTextareaHeight)

// model 程式化變動（非使用者輸入，input 事件不會觸發）時，等 DOM 同步完 el.value 再重算。
watch(
  () => model.value,
  () => {
    if (!props.autosize) return
    nextTick(calcTextareaHeight)
  },
)

// autosize 開關 / 行數上下界變動時重算（含切到 cacheMeasurements 後首次量測）。
watch(
  () => [props.autosize, props.rows, props.maxRows],
  () => nextTick(calcTextareaHeight),
  { immediate: true },
)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseTextarea — 多行文字輸入控制項
 *
 * 包在 BaseFormField 內，補上實際的 <textarea> 與 prepend / append 外觀、字數計數，
 * 並支援 autosize 隨內容自動調整高度。所有狀態色（邊框 / focus / error / disabled）
 * 都讀 BaseFormField 對外傳遞的 --field-* token，不自帶一套狀態邏輯；focus 採
 * 「邊框轉 active 色 + 同色柔光 ring」的單一視覺（box-shadow），並保留透明 outline
 * 作為 forced-colors 模式的焦點後備。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-textarea {
  &__container {
    display: flex;
    // 多行控制項：affix 對齊頂端（而非垂直置中），長文時前後綴不被推到中段。
    align-items: flex-start;
    column-gap: 6px;
    overflow: hidden;
    width: 100%;
    background: var(--field-background, #fff);
    border: 1px solid var(--field-color);
    border-radius: var(--field-radius);
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: var(--field-active-color);
    }

    // 鍵盤聚焦：邊框轉 active 色 + 同色柔光 ring，單一視覺（不再與邊框形成兩條線），
    // ring 跟著 --field-active-color 走（error 狀態自動轉紅）。
    // 透明 outline 作為 forced-colors（高對比）模式的焦點後備。
    &:has(.base-textarea__input:focus-visible) {
      border-color: var(--field-active-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--field-active-color) 22%, transparent);
    }
  }

  &__input {
    flex: 1 1 auto;
    min-width: 0;
    padding: 8px 12px;
    font-family: inherit;
    font-size: 0.875rem;
    line-height: 1.5;
    color: #111827;
    background: transparent;
    border: 0;
    outline: none;
    // 預設可垂直拖拉調整；autosize 時改由 JS 控制高度，停用手動拖拉（見下）。
    resize: vertical;

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

  // autosize：高度由 JS 算出，停用使用者手動拖拉避免衝突。
  &--autosize &__input {
    resize: none;
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
    // affix 與 input 第一行文字對齊（input 有 8px 上 padding）。
    padding-top: 8px;
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
