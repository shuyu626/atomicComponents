<template>
  <!-- novalidate：驗證由庫內 rules 統一呈現（BaseFormField 訊息區 + aria-live），不走原生泡泡。 -->
  <form
    ref="formRef"
    class="base-form"
    novalidate
    @submit.prevent="onSubmit"
  >
    <slot />
  </form>
</template>

<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'

import { provideFormContext } from '~/composables/useFormContext'

export interface BaseFormProps {
  /** 驗證失敗時捲動並聚焦第一個錯誤欄位。 @default true */
  scrollToError?: boolean
}

const props = withDefaults(defineProps<BaseFormProps>(), {
  scrollToError: true,
})

const emit = defineEmits<{
  /** 全部欄位驗證通過後觸發（原生 submit 已被 prevent，事件供讀取 submitter 等資訊）。 */
  submit: [event: SubmitEvent]
  /** 任一欄位驗證失敗時觸發。 */
  invalid: []
}>()

defineSlots<{
  /** 表單內容；內含的表單控制項（有 rules 者）會自動註冊進整表驗證。 */
  default?: () => unknown
}>()

const formRef = useTemplateRef<HTMLFormElement>('formRef')
const { fields } = provideFormContext()

/** 驗證全部欄位；全跑不短路，讓每個錯誤欄位同時顯示訊息。 */
function validate(): boolean {
  return [...fields].map((field) => field.validate()).every(Boolean)
}

/** 清除全部欄位驗證狀態（touched）；不重設值 — 值由使用端 v-model 持有。 */
function resetValidation(): void {
  fields.forEach((field) => field.reset())
}

/**
 * 錯誤欄位內可聚焦控制項的查詢選擇器。
 * 注意：刻意不對齊 BaseFormField onLabelClick 的群組 fallback 清單——本選擇器的查詢範圍
 * 涵蓋整個 BaseFormField 系控制項（如 BaseInputNumber），節點內可能混著 tabindex="-1" +
 * aria-hidden="true" 的純指標裝置 ± 按鈕；BaseFormField 的群組 fallback 只服務 radio /
 * checkbox 群組內部，不會出現這類節點，兩份清單的過濾條件本來就該不同。
 */
const FOCUSABLE_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 從候選節點中找出「使用者實際能感知」的第一個可聚焦元素。
 * aria-hidden="true" 的節點（如 BaseInputNumber 的 ± 按鈕，pointer-only affordance）即使
 * 技術上可呼叫 focus()，對 AT 使用者形同不存在——程式化 focus 絕不能落在這種元素上，
 * 否則會佔走焦點但欄位的 aria-describedby 錯誤訊息永遠不會被朗讀。tabindex="-1" 的節點
 * 同理排除（非鍵盤可達）。
 */
function firstPerceivableFocusable(container: HTMLElement): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(
    (el) => el.getAttribute('aria-hidden') !== 'true' && el.getAttribute('tabindex') !== '-1',
  )
}

/** 捲動並聚焦第一個錯誤欄位；nextTick 等 --error class 渲染後以 DOM 序取「第一個」。 */
async function scrollToFirstError(): Promise<void> {
  await nextTick()
  const errorField = formRef.value?.querySelector<HTMLElement>('.base-form-field--error')
  if (!errorField) return
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  errorField.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  firstPerceivableFocusable(errorField)?.focus({ preventScroll: true })
}

async function onSubmit(event: Event): Promise<void> {
  if (validate()) {
    emit('submit', event as SubmitEvent)
    return
  }
  emit('invalid')
  if (props.scrollToError) await scrollToFirstError()
}

defineExpose({ validate, resetValidation })
</script>

<style scoped lang="scss">
/* BaseForm 是行為容器，無視覺 token；display: block 維持原生 form 版面行為。 */
.base-form {
  display: block;
}
</style>
