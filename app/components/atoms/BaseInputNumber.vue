<template>
  <BaseFormField
    class="base-input-number"
    :class="rootClass"
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
      採 APG spinbutton pattern：type="text" + inputmode="decimal" + role="spinbutton"，
      不用原生 type="number"（滾輪誤觸、e/E 字元、無效值不可偵測——詳見 docs §5）。
      ± 按鈕是指標裝置專用 affordance：tabindex=-1 + aria-hidden，鍵盤與 AT 使用者
      走 spinbutton 本體方向鍵；@pointerdown.prevent 避免按鈕搶走 input 焦點。
    -->
    <template #default="{ id, describedby, invalid, required, disabled, readonly }">
      <div class="base-input-number__container">
        <button
          v-if="controls && controlsPosition === 'both'"
          class="base-input-number__button base-input-number__button--decrease"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          :disabled="disabled || readonly || atMin"
          @pointerdown.prevent="startRepeat(-1)"
          @pointerup="stopRepeat"
          @pointerleave="stopRepeat"
          @pointercancel="stopRepeat"
        >
          <svg
            class="base-input-number__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M5 12h14" />
          </svg>
        </button>

        <input
          :id="id"
          class="base-input-number__input"
          type="text"
          role="spinbutton"
          inputmode="decimal"
          autocomplete="off"
          :value="displayValue"
          :name="name"
          :placeholder="placeholder"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :aria-valuemin="ariaValueMin"
          :aria-valuemax="ariaValueMax"
          :aria-valuenow="model ?? undefined"
          :aria-describedby="describedby"
          :aria-invalid="invalid"
          :aria-required="required"
          @input="onInput"
          @keydown="onKeydown"
          @focus="emit('focus', $event)"
          @blur="onBlur"
        >

        <button
          v-if="controls && controlsPosition === 'both'"
          class="base-input-number__button base-input-number__button--increase"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          :disabled="disabled || readonly || atMax"
          @pointerdown.prevent="startRepeat(1)"
          @pointerup="stopRepeat"
          @pointerleave="stopRepeat"
          @pointercancel="stopRepeat"
        >
          <svg
            class="base-input-number__icon"
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        <span
          v-if="controls && controlsPosition === 'right'"
          class="base-input-number__stack"
        >
          <button
            class="base-input-number__button base-input-number__button--increase"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled || readonly || atMax"
            @pointerdown.prevent="startRepeat(1)"
            @pointerup="stopRepeat"
            @pointerleave="stopRepeat"
            @pointercancel="stopRepeat"
          >
            <svg
              class="base-input-number__icon"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            class="base-input-number__button base-input-number__button--decrease"
            type="button"
            tabindex="-1"
            aria-hidden="true"
            :disabled="disabled || readonly || atMin"
            @pointerdown.prevent="startRepeat(-1)"
            @pointerup="stopRepeat"
            @pointerleave="stopRepeat"
            @pointercancel="stopRepeat"
          >
            <svg
              class="base-input-number__icon"
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
        </span>
      </div>
    </template>

    <!--
      訊息列：訊息（slot 優先於 prop）。任一存在才渲染，讓 BaseFormField
      的訊息區（含 aria-describedby 參照）只在有內容時出現。
    -->
    <template
      v-if="displayMessage || $slots.message"
      #message="{ error }"
    >
      <span class="base-input-number__message">
        <slot
          name="message"
          :error="error"
          :message="displayMessage"
        >{{ displayMessage }}</slot>
      </span>
    </template>
  </BaseFormField>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import clamp from '~/utils/clamp'
import countDecimals from '~/utils/countDecimals'
import roundToPrecision from '~/utils/roundToPrecision'
import type { ValidationRule } from '~/utils/validators'

export interface BaseInputNumberProps extends BaseFormFieldProps {
  /** 最小值。 @default undefined（無下限） */
  min?: number
  /** 最大值。 @default undefined（無上限） */
  max?: number
  /** 步進量（方向鍵 / ± 按鈕每次增減的量）。 @default 1 */
  step?: number
  /**
   * 小數位數：顯示以 `toFixed(precision)` 格式化、commit 一律捨入到此位數。
   * 未設時鍵入值不捨入（尊重使用者輸入），步進則由 `step` 與目前值的小數位推導
   * 有效精度（避免 0.1+0.2 浮點誤差）。 @default undefined
   */
  precision?: number
  /** 顯示 ± 步進按鈕。 @default true */
  controls?: boolean
  /** 按鈕位置：`both`（± 分列兩側）/ `right`（右側上下疊排）。 @default 'right' */
  controlsPosition?: 'both' | 'right'
  /** placeholder 文字。 */
  placeholder?: string
  /** input `name`（送出表單 / 自動填入用）。 */
  name?: string
  /**
   * 驗證規則陣列；作用於 **commit 後的數值**（空值以 `NaN` 收斂，讓 `required` 報錯、
   * 其餘規則自行放行空值）。採 touched-gated：第一次 blur 後才開始即時驗證。
   * 父層可透過模板 ref 呼叫 `validate()` / `reset()`（如表單 submit 時強制驗證）。
   */
  rules?: ValidationRule<number>[]
}

const props = withDefaults(defineProps<BaseInputNumberProps>(), {
  min: undefined,
  max: undefined,
  step: 1,
  precision: undefined,
  controls: true,
  controlsPosition: 'right',
  placeholder: undefined,
  name: undefined,
  rules: undefined,
})

defineSlots<{
  /** 標籤內容，取代 `label` prop。 */
  label?: () => unknown
  /** 訊息內容，取代 `message` prop。scoped prop：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

const emit = defineEmits<{
  /** input 取得焦點時觸發（原生 FocusEvent 直接轉發，供失焦驗證等場景使用）。 */
  focus: [event: FocusEvent]
  /** input 失去焦點時觸發（原生 FocusEvent 直接轉發）。 */
  blur: [event: FocusEvent]
  /** 值 commit（blur / Enter / 步進）且**有變動**時觸發，帶 commit 後的值。 */
  change: [value: number | null]
}>()

/** v-model：`null` 表空值（清空輸入框），不使用 NaN。 */
const model = defineModel<number | null>()

/** 輸入中的暫存字串；`null` = 非編輯中，顯示 formatted model。中間態（"1."、"-"）只進這裡，不寫 model。 */
const draft = ref<string | null>(null)

/** 顯示值：draft 優先；否則 model 依 precision 格式化（SSR 首渲同樣走這條，input :value 綁定）。 */
const displayValue = computed<string>(() => {
  if (draft.value !== null) return draft.value
  if (model.value === null || model.value === undefined) return ''
  return props.precision !== undefined ? model.value.toFixed(props.precision) : String(model.value)
})

/** 步進運算的有效精度：precision 優先，否則取 step 與目前值小數位的較大者（修 0.1+0.2）。 */
const stepPrecision = computed(() =>
  props.precision ?? Math.max(countDecimals(props.step), countDecimals(model.value ?? 0)),
)

// aria-valuemin / aria-valuemax 只在有限值時輸出（APG spinbutton：無界時省略）。
const ariaValueMin = computed(() =>
  props.min !== undefined && Number.isFinite(props.min) ? props.min : undefined,
)
const ariaValueMax = computed(() =>
  props.max !== undefined && Number.isFinite(props.max) ? props.max : undefined,
)

// 邊界偵測：到達（或超出）界時對應 ± 鈕 disabled；空值不算在界上。
const atMin = computed(() =>
  model.value != null && props.min !== undefined && model.value <= props.min,
)
const atMax = computed(() =>
  model.value != null && props.max !== undefined && model.value >= props.max,
)

/**
 * Commit：parse → clamp → 捨入 → 寫 model → 清 draft → change。
 * 鍵入 commit 只在 precision 有設時捨入（尊重使用者輸入）；步進 commit 恆以 stepPrecision 捨入（修浮點）。
 */
function commit(next: number | null, { round }: { round: boolean }) {
  let value = next
  if (value !== null) {
    value = clamp(value, props.min ?? Number.NEGATIVE_INFINITY, props.max ?? Number.POSITIVE_INFINITY)
    if (round || props.precision !== undefined) value = roundToPrecision(value, stepPrecision.value)
  }
  const changed = value !== (model.value ?? null)
  model.value = value
  draft.value = null
  if (changed) emit('change', value)
}

/** 解析 draft：`''` → null（清空）；非數字 → undefined（還原顯示、不動 model）。 */
function parseDraft(text: string): number | null | undefined {
  const trimmed = text.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

function commitDraft() {
  if (draft.value === null) return
  const parsed = parseDraft(draft.value)
  if (parsed === undefined) draft.value = null // 還原顯示
  else commit(parsed, { round: false })
}

function stepBy(direction: 1 | -1) {
  if (props.disabled || props.readonly) return
  // 步進也是 commit 時機（spec §3.2）：先 commit 未定案的 draft（鍵入 "7" 後直接按
  // 方向鍵 → 以 7 為基準步進得 8，不默默丟棄輸入），再從 commit 後的 model 起算 ±step。
  commitDraft()
  commit((model.value ?? 0) + direction * props.step, { round: true })
}

// 輸入中只更新 draft（允許 "-"、"1." 等中間態），commit 時機見 onKeydown / onBlur。
function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
}

/**
 * 鍵盤（APG spinbutton pattern）：ArrowUp / ArrowDown = ±step、Home / End = 跳至
 * 有限的 min / max；Enter commit 但**不** preventDefault，保留表單隱式送出
 * （BaseForm 依賴此行為：先 commit 再驗證）。
 */
function onKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowUp':
      event.preventDefault() // 避免游標移動 / 頁面捲動
      stepBy(1)
      break
    case 'ArrowDown':
      event.preventDefault()
      stepBy(-1)
      break
    case 'Home':
      if (props.min !== undefined && Number.isFinite(props.min) && !props.disabled && !props.readonly) {
        event.preventDefault()
        commit(props.min, { round: true })
      }
      break
    case 'End':
      if (props.max !== undefined && Number.isFinite(props.max) && !props.disabled && !props.readonly) {
        event.preventDefault()
        commit(props.max, { round: true })
      }
      break
    case 'Enter':
      commitDraft()
      break
  }
}

/**
 * 長按連發：pointerdown 先立即步進一次，500ms 後開始每 80ms 連發；
 * pointerup / pointerleave / pointercancel 或 unmount 時清 timer。
 * 另在 tick 內自我了斷：連發途中到界會讓按鈕轉 disabled，部分瀏覽器（WebKit）
 * 會抑制 disabled 元素的 pointer 事件、pointerup 永遠不來——若這次步進值未變
 * （已在界上），立即 stopRepeat，避免 timer 孤兒與之後的幽靈步進。
 */
let repeatTimer: ReturnType<typeof setTimeout> | null = null

function startRepeat(direction: 1 | -1) {
  stepBy(direction)
  const tick = (delay: number) => {
    repeatTimer = setTimeout(() => {
      const before = model.value ?? null
      stepBy(direction)
      if ((model.value ?? null) === before) {
        stopRepeat() // 到界（值不再變動）→ 停止連發
        return
      }
      tick(80)
    }, delay)
  }
  tick(500) // 首次延遲 500ms，之後每 80ms
}

function stopRepeat() {
  if (repeatTimer !== null) {
    clearTimeout(repeatTimer)
    repeatTimer = null
  }
}

onUnmounted(stopRepeat)

/**
 * 驗證：用 `useValidation` 把 `rules` 套在 commit 後的數值上（touched-gated）。
 * 空值以 `NaN` 收斂——`validators.isEmpty` 視 NaN 為空，讓 `required` 報錯、
 * 其餘規則自行放行空值，且型別維持 `number`（rules 作用於數值）。
 */
const validation = useValidation<number>(
  () => model.value ?? Number.NaN,
  () => props.rules,
)

// blur：先 commit draft（讓規則驗的是 commit 後的值），標記 touched，再轉發原生 blur 事件。
function onBlur(event: FocusEvent) {
  commitDraft()
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

// 佈局 modifier：± 兩側（both）/ 右側疊排（right）；controls=false 時不加。
const rootClass = computed(() => ({
  'base-input-number--controls-both': props.controls && props.controlsPosition === 'both',
  'base-input-number--controls-right': props.controls && props.controlsPosition === 'right',
}))
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseInputNumber — 數字步進輸入控制項
 *
 * 包在 BaseFormField 內，補上 spinbutton <input> 與 ± 步進按鈕。
 * 所有狀態色（邊框 / focus / error / disabled）都讀 BaseFormField 對外傳遞的
 * --field-* token，不自帶一套狀態邏輯；focus 採「邊框轉 active 色 + 同色柔光 ring」
 * 的單一視覺（box-shadow），並保留透明 outline 作為 forced-colors 模式的焦點後備。
 * 自有 token 只有按鈕三件：寬度 / 圖示色 / hover 底色。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/* 預設 token 用 :where()（specificity 0），確保使用端 class 覆寫得動。 */
:where(.base-input-number) {
  --input-number-button-width: 32px; // 步進鈕寬
  --input-number-button-color: #6b7280; // 步進鈕圖示色
  --input-number-button-hover-bg: #f3f4f6; // 步進鈕 hover 底色
}

.base-input-number {
  &__container {
    display: flex;
    align-items: stretch;
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
    &:has(.base-input-number__input:focus-visible) {
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

  // ± 兩側時數字置中（左右等寬按鈕夾住，置中最平衡）；right 疊排維持靠左。
  &--controls-both &__input {
    text-align: center;
  }

  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: var(--input-number-button-width);
    padding: 0;
    color: var(--input-number-button-color);
    background: transparent;
    border: 0;
    cursor: pointer;
    // 長按連發時避免選字 / 觸控長按選單干擾。
    user-select: none;
    touch-action: manipulation;
    transition: background-color 0.15s ease;

    &:hover:not(:disabled) {
      background: var(--input-number-button-hover-bg);
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5; // 對齊 BaseButton disabled
    }
  }

  // ── 佈局：both（± 分列兩側，以邊線與 input 分隔）──────────
  &--controls-both &__button--decrease {
    border-right: 1px solid var(--field-color);
  }

  &--controls-both &__button--increase {
    border-left: 1px solid var(--field-color);
  }

  // ── 佈局：right（右側上下疊排）──────────────────────────
  &__stack {
    display: flex;
    flex-direction: column;
    align-self: stretch;
    flex-shrink: 0;
    border-left: 1px solid var(--field-color);
  }

  &__stack &__button {
    flex: 1 1 50%;
  }

  &__stack &__button + &__button {
    border-top: 1px solid var(--field-color);
  }

  &__icon {
    pointer-events: none;
  }

  &__message {
    flex-grow: 1;
  }
}
</style>
