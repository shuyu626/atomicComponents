<template>
  <BaseFormField
    class="base-radio-group"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <!--
      控制項：一組 radio。role="radiogroup" 把它們語意化為單選群；標籤 / 描述關聯由 BaseFormField 傳入。
      錯誤狀態時於群組容器補 aria-invalid（不只靠視覺色傳達），非錯誤時省略屬性。
    -->
    <template #default="{ labelledby, describedby }">
      <div
        class="base-radio-group__items"
        role="radiogroup"
        :aria-labelledby="labelledby"
        :aria-describedby="describedby"
        :aria-invalid="displayError || undefined"
      >
        <slot />
      </div>
    </template>

    <template
      v-if="displayMessage || $slots.message"
      #message="{ error }"
    >
      <slot
        name="message"
        :error="error"
        :message="displayMessage"
      >{{ displayMessage }}</slot>
    </template>
  </BaseFormField>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

import type { BaseRadioColor } from '~/components/atoms/BaseRadio.vue'

/** BaseRadioGroup 透過 provide 傳給子 BaseRadio 的共享 context。 */
export interface BaseRadioGroupContext<Value = unknown> {
  /** 某值是否為目前選取（單選）。 */
  isSelected: (value: Value) => boolean
  /** 選取某值（單選；無法取消，再選別項才會改變）。 */
  select: (value: Value) => void
  /** 標記群組為「碰過」（供子圈失焦時呼叫，讓未選取就離開也顯示驗證錯誤）。 */
  touch: () => void
  /** 廣播給子圈的 name（含自動 fallback，確保原生 radio 同組可方向鍵巡覽）。 */
  name: ComputedRef<string | undefined>
  /** 廣播給子圈的選取色（子圈可自行覆寫）。 */
  color: ComputedRef<BaseRadioColor | undefined>
  /** 廣播給子圈的停用狀態。 */
  disabled: ComputedRef<boolean>
}

/** provide / inject 用的 key（BaseRadio 會 import）。 */
export const BASE_RADIO_GROUP_INJECT_KEY: InjectionKey<BaseRadioGroupContext> =
  Symbol('BaseRadioGroup')
</script>

<script setup lang="ts" generic="Value = string | number">
import { computed, provide, useId } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import type { ValidationRule } from '~/utils/validators'

export interface BaseRadioGroupProps<Value = string | number> extends BaseFormFieldProps {
  /** 廣播給所有子圈的 name（未指定時自動產生，仍能讓原生 radio 同組）。 */
  name?: string
  /** 廣播給所有子圈的選取色（子圈可自行覆寫）。 */
  color?: BaseRadioColor
  /** 驗證規則（套在選取值上，如「必選」）；touched 於每次 select。 */
  rules?: ValidationRule<Value | undefined>[]
}

const props = withDefaults(defineProps<BaseRadioGroupProps<Value>>(), {
  name: undefined,
  color: undefined,
  rules: undefined,
})

defineSlots<{
  /** 標籤內容，取代 `label` prop。 */
  label?: () => unknown
  /** 子 radio。 */
  default?: () => unknown
  /** 訊息內容，取代 `message` prop。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** v-model：目前選取的單一值。 */
const model = defineModel<Value>()

const _id = useId()
/** name fallback：原生 radio 必須共用 name 才能以方向鍵在同組間巡覽。 */
const effectiveName = computed(() => props.name ?? `radio-group-${_id}`)

function isSelected(value: Value): boolean {
  return model.value === value
}

function select(value: Value) {
  model.value = value
  validation.touch()
}

const validation = useValidation<Value | undefined>(
  () => model.value,
  () => props.rules,
)

defineExpose({
  /** 強制驗證（即使尚未 touch 也顯示錯誤）；回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態（不動值）。 */
  reset: validation.reset,
})

/** 合併「外部 props」與「驗證結果」後轉發給 BaseFormField，詳見 `useFieldValidation`。 */
const { displayError, displayMessage, fieldProps } = useFieldValidation(() => props, validation)

provide(BASE_RADIO_GROUP_INJECT_KEY, {
  isSelected: isSelected as (value: unknown) => boolean,
  select: select as (value: unknown) => void,
  touch: validation.touch,
  name: effectiveName,
  color: computed(() => props.color),
  disabled: computed(() => !!props.disabled),
})
</script>

<style scoped lang="scss">
/*
 * BaseRadioGroup — 一組 radio（單選）。標籤 / 訊息 / 驗證複用 BaseFormField；
 * 透過 provide 把選取狀態與廣播屬性（name / color / disabled）傳給子 BaseRadio。
 * 容器標 role="radiogroup" 並接 BaseFormField 的 aria-labelledby / aria-describedby。
 */
.base-radio-group {
  &__items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }
}
</style>
