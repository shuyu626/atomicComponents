<template>
  <div
    ref="root"
    class="base-accordion"
    @keydown="onKeydown"
  >
    <slot />
  </div>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey, ToRef } from 'vue'

/** 合法的標題層級（summary 會包進對應的 `<h2>`～`<h6>`） */
export type BaseAccordionHeadingLevel = 2 | 3 | 4 | 5 | 6

/** BaseAccordion 透過 provide 傳給 BaseAccordionPanel 的共享 context */
export interface BaseAccordionContext<Value = unknown> {
  /** 目前展開中的 value 陣列（唯讀；單開模式下最多一個元素） */
  active: ToRef<Value[]>
  /** 切換某個 panel 的展開狀態（依 multiple 決定累加或互斥） */
  toggle: (value: Value) => void
  /** 是否允許同時展開多個 panel */
  multiple: ComputedRef<boolean>
  /** summary 要包裹的標題層級 */
  headingLevel: ComputedRef<BaseAccordionHeadingLevel>
  /** 整體禁用（所有 panel 不可點 / 不可聚焦） */
  disabled: ComputedRef<boolean>
}

/** provide / inject 用的 key（BaseAccordionPanel 會 import） */
export const BASE_ACCORDION_INJECT_KEY: InjectionKey<BaseAccordionContext> =
  Symbol('BaseAccordion')
</script>

<script setup lang="ts" generic="T extends string | number | symbol">
import { computed, provide, ref, toRef, watch } from 'vue'

import toArray from '~/utils/toArray'

interface BaseAccordionProps {
  /**
   * 是否允許同時展開多個 panel。
   * - `false`（預設）：互斥，展開新的會收合其它；`v-model` 進出皆為單值。
   * - `true`：可同時展開多個；`v-model` 進出皆為陣列。
   * @default false
   */
  multiple?: boolean
  /**
   * summary 包裹的標題層級。每個 accordion header 依 WAI-ARIA 應為 heading，
   * 依文件結構選對層級（避免跳級）。
   * @default 3
   */
  headingLevel?: BaseAccordionHeadingLevel
  /**
   * 整體禁用：所有 panel 的 summary 不可點、不可聚焦。
   * @default false
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseAccordionProps>(), {
  multiple: false,
  headingLevel: 3,
  disabled: false,
})

/**
 * 展開中的 value（`v-model`）。單開模式進出皆為單值、多開模式為陣列；內部一律收斂成
 * 陣列處理，commit 時依 `multiple` 寫回對應型別（無展開為 `undefined`）。
 */
const model = defineModel<T | T[]>()

// 內部一律以陣列保存展開中的 value，省去到處 Array.isArray 分支。
const active = ref(toArray(model.value ?? [])) as ToRef<T[]>

// 外部 v-model 變動時同步回內部（受控情境）。
watch(
  model,
  (value) => {
    const next = toArray(value ?? [])
    // 跳過 v-model echo-back：點擊已先更新 active 並 emit，父層回寫同內容時不必再重建陣列，
    // 省掉一輪所有 panel 的 isActive 重算。
    if (
      next.length === active.value.length &&
      next.every((item, index) => item === active.value[index])
    ) {
      return
    }
    active.value = next
  },
)

// 寫回時依 multiple 決定 emit 單值或陣列：對齊 caller 傳入的型別語意。
function commit(next: T[]) {
  active.value = next
  model.value = props.multiple ? next : next[0]
}

function toggle(value: T) {
  if (props.disabled) return

  const index = active.value.indexOf(value)

  if (props.multiple) {
    if (index === -1) {
      commit([...active.value, value])
      return
    }
    const next = [...active.value]
    next.splice(index, 1)
    commit(next)
    return
  }

  // 單開：點已開的收合（清空），否則只留這一個。
  commit(index === -1 ? [value] : [])
}

// header 夾在各 panel 內、彼此非兄弟節點，無法用 dom.ts 的 sibling roving，
// 改在 root 蒐集所有未禁用的 summary 按鈕後移動焦點。
const root = ref<HTMLElement | null>(null)

function getSummaries() {
  if (!root.value) return []
  return Array.from(
    root.value.querySelectorAll<HTMLButtonElement>(
      'button[data-accordion-summary]:not(:disabled)',
    ),
  )
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement | null
  // 只在焦點落在 summary 按鈕時接管方向鍵；面板內容的鍵盤操作不受影響。
  if (!target?.matches('button[data-accordion-summary]')) return

  const summaries = getSummaries()
  if (summaries.length === 0) return

  const currentIndex = summaries.indexOf(target as HTMLButtonElement)

  let nextIndex: number
  switch (event.key) {
    case 'ArrowDown':
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % summaries.length
      break
    case 'ArrowUp':
      nextIndex =
        currentIndex === -1
          ? summaries.length - 1
          : (currentIndex - 1 + summaries.length) % summaries.length
      break
    case 'Home':
      nextIndex = 0
      break
    case 'End':
      nextIndex = summaries.length - 1
      break
    default:
      return
  }

  event.preventDefault()
  summaries[nextIndex]?.focus()
}

provide(BASE_ACCORDION_INJECT_KEY, {
  active: toRef(() => active.value),
  toggle: toggle as (value: unknown) => void,
  multiple: computed(() => props.multiple),
  headingLevel: computed(() => props.headingLevel),
  disabled: computed(() => props.disabled),
} as BaseAccordionContext)

defineSlots<{
  /** 預設 slot：放 `<BaseAccordionPanel>` */
  default(props: Record<string, never>): unknown
}>()
</script>

<style scoped lang="scss">
// 通用元件家族的 design token 集中於此宣告（custom property 會 cascade 給內部 panel）。
// standalone 使用 BaseAccordionPanel 時，panel 端的 var() fallback 提供同一組預設值。
.base-accordion {
  // 結構
  --accordion-border-color: #e5e7eb;
  --accordion-radius: 0.5rem;

  // summary（標題列）
  --accordion-summary-color: #1f2937;
  --accordion-summary-bg-hover: #f9fafb;
  --accordion-summary-bg-active: #f3f4f6;
  --accordion-summary-padding-y: 0.9rem;
  --accordion-summary-padding-x: 1.125rem;
  --accordion-summary-font-size: 1rem;
  --accordion-summary-font-weight: 500;

  // marker（展開指示）
  --accordion-marker-color: #9ca3af;
  --accordion-marker-size: 1.25rem;

  // 內容區
  --accordion-content-color: #4b5563;
  --accordion-content-padding-x: 1.125rem;
  --accordion-content-padding-bottom: 1rem;

  // 狀態
  --accordion-focus-ring: #2563eb;
  --accordion-disabled-opacity: 0.45;

  // 動畫（高度 / 內容淡入 / marker 旋轉共用，JS 會讀同一組值保持同步）
  --accordion-transition-duration: 300ms;
  --accordion-transition-easing: cubic-bezier(0.4, 0, 0.2, 1);

  border: 1px solid var(--accordion-border-color);
  border-radius: var(--accordion-radius);
  // 讓內層第一/最後一個 item 的圓角被裁切吻合容器
  overflow: hidden;
}
</style>
