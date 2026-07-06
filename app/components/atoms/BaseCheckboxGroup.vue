<template>
  <BaseFormField
    class="base-checkbox-group"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <!--
      控制項：一組 checkbox。role="group" 把它們語意化為同一群；描述關聯由 BaseFormField 傳入。
      錯誤狀態時於群組容器補 aria-invalid（不只靠視覺色傳達），非錯誤時省略屬性。
    -->
    <template #default="{ labelledby, describedby }">
      <div
        class="base-checkbox-group__items"
        role="group"
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

import type { BaseCheckboxColor } from '~/components/atoms/BaseCheckbox.vue'

/** BaseCheckboxGroup 透過 provide 傳給子 BaseCheckbox 的共享 context。 */
export interface BaseCheckboxGroupContext<Value = unknown> {
  /** 某值是否已勾選（封裝 Array / Set 判斷）。 */
  isSelected: (value: Value) => boolean
  /** 切換某值（加入 / 移除，維持原容器型別）。 */
  toggle: (value: Value) => void
  /** 標記群組為「碰過」（供子框失焦時呼叫，讓未變動就離開也顯示驗證錯誤）。 */
  touch: () => void
  /** 廣播給子框的 name。 */
  name: ComputedRef<string | undefined>
  /** 廣播給子框的勾選色（子框可自行覆寫）。 */
  color: ComputedRef<BaseCheckboxColor | undefined>
  /** 廣播給子框的停用狀態。 */
  disabled: ComputedRef<boolean>
}

/** provide / inject 用的 key（BaseCheckbox 會 import）。 */
export const BASE_CHECKBOX_GROUP_INJECT_KEY: InjectionKey<BaseCheckboxGroupContext> =
  Symbol('BaseCheckboxGroup')
</script>

<script setup lang="ts" generic="Value = string | number">
import { computed, provide } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import isSet from '~/utils/isSet'
import type { ValidationRule } from '~/utils/validators'

type GroupModel = Value[] | Set<Value>

interface BaseCheckboxGroupProps extends BaseFormFieldProps {
  /** 廣播給所有子框的 name。 */
  name?: string
  /** 廣播給所有子框的勾選色（子框可自行覆寫）。 */
  color?: BaseCheckboxColor
  /** 驗證規則（套在整個集合上，如「至少選一項」）；touched 於每次 toggle。 */
  rules?: ValidationRule<GroupModel>[]
}

const props = withDefaults(defineProps<BaseCheckboxGroupProps>(), {
  name: undefined,
  color: undefined,
  rules: undefined,
})

defineSlots<{
  /** 標籤內容，取代 `label` prop。 */
  label?: () => unknown
  /** 子 checkbox。 */
  default?: () => unknown
  /** 訊息內容，取代 `message` prop。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** v-model：已勾選值集合（Array 或 Set，Set 進 Set 出）。 */
const model = defineModel<GroupModel>({ default: () => [] })

function isSelected(value: Value): boolean {
  const current = model.value
  if (isSet<Value>(current)) return current.has(value)
  return current.includes(value)
}

function toggle(value: Value) {
  const current = model.value
  if (isSet<Value>(current)) {
    const next = new Set(current)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    model.value = next
  } else {
    model.value = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
  }
  validation.touch()
}

const validation = useValidation<GroupModel>(
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

provide(BASE_CHECKBOX_GROUP_INJECT_KEY, {
  isSelected: isSelected as (value: unknown) => boolean,
  toggle: toggle as (value: unknown) => void,
  touch: validation.touch,
  name: computed(() => props.name),
  color: computed(() => props.color),
  disabled: computed(() => !!props.disabled),
})
</script>

<style scoped lang="scss">
/*
 * BaseCheckboxGroup — 一組 checkbox。標籤 / 訊息 / 驗證複用 BaseFormField；
 * 透過 provide 把選取狀態與廣播屬性（name / color / disabled）傳給子 BaseCheckbox。
 */
.base-checkbox-group {
  &__items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 16px;
  }
}
</style>
