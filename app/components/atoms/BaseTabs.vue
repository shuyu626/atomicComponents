<template>
  <div class="base-tabs" :class="[`base-tabs--${orientation}`, `base-tabs--${color}`]">
    <div
      class="base-tabs__tablist"
      role="tablist"
      :aria-label="ariaLabel || undefined"
      :aria-orientation="orientation"
      @keydown="onTabKeydown"
    >
      <button
        v-for="tab in tabs"
        :id="tab.id"
        :key="tab.id"
        type="button"
        role="tab"
        class="base-tabs__tab"
        :class="{ 'base-tabs__tab--selected': tab.selected }"
        :aria-selected="tab.selected ? 'true' : 'false'"
        :aria-controls="tab.tabpanelId"
        :disabled="tab.disabled"
        :tabindex="tab.tabindex"
        @click="onTabClick(tab.value)"
      >
        <slot name="tab" :item="tab">{{ tab.label }}</slot>
      </button>
    </div>

    <!-- 面板區：包一層讓 vertical 時可 flex:1 撐滿 tablist 旁的空間 -->
    <div class="base-tabs__panels">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey, ToRef } from 'vue'

/** 單一 tab 的資料（caller 傳入 `items` 的元素） */
export interface BaseTabsItem<Value> {
  /** 唯一值，也是 `v-model` 綁定值。同組內不可重複，建議用 string / number */
  value: Value
  /** 顯示文字（可被 `#tab` slot 覆寫） */
  label: string
  /** 是否禁用此 tab @default false */
  disabled?: boolean
}

/** BaseTabs 透過 provide 傳給 BaseTabPanel 的共享資料 */
export interface BaseTabsContext {
  /** 目前選中值（唯讀） */
  current: ToRef<unknown>
  /** value → { tab id, panel id } 對照表 */
  lookup: ComputedRef<Map<unknown, { id: string; tabpanelId: string }>>
}

/** provide / inject 用的 key（BaseTabPanel 會 import） */
export const BASE_TABS_INJECT_KEY: InjectionKey<BaseTabsContext> = Symbol('BaseTabs')
</script>

<script setup lang="ts" generic="T">
import { computed, provide, toRef, useId } from 'vue'

import { moveFocus, nextItem, previousItem } from '~/utils/dom'
import isNullOrUndefined from '~/utils/isNullOrUndefined'

interface BaseTabsProps {
  /** tabs 列表 */
  items: BaseTabsItem<T>[]
  /** 整體禁用（所有 tab 不可點 / 不可聚焦） @default false */
  disabled?: boolean
  /**
   * 排列方向。vertical 時 tablist 在左、面板在右，方向鍵改用 ↑/↓。
   * 會一併設定 `aria-orientation`。
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   * 啟用方式。
   * - `manual`（預設）：方向鍵只移動焦點，按 Enter / Space 或點擊才切換。面板內容重時較合適。
   * - `automatic`：方向鍵移到哪就切到哪（選中跟著焦點走）。
   * @default 'manual'
   */
  activation?: 'manual' | 'automatic'
  /**
   * 語意色彩，一次切換選中態的文字 / 底線 / 淺色底 / focus ring（由 `--tabs-accent` 驅動）。
   * @default 'primary'
   */
  color?: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral'
  /** tablist 的無障礙名稱，同頁多組 tabs 時建議填 */
  ariaLabel?: string
  /**
   * 切換前攔截。回傳 `false` 取消切換；回傳 `true` / `undefined` 或不回傳則照常切換。
   * hook 內若拋錯或 Promise reject → 一律取消切換（dev 會 console.error）。
   * @example 同步
   * onBeforeChange: (value) => window.confirm(`切到 ${value}？`)
   * @example 非同步
   * onBeforeChange: async () => await canLeave()
   */
  onBeforeChange?: (value: T) => boolean | void | Promise<boolean | void>
}

const props = withDefaults(defineProps<BaseTabsProps>(), {
  disabled: false,
  orientation: 'horizontal',
  activation: 'manual',
  color: 'primary',
  ariaLabel: undefined,
  onBeforeChange: undefined,
})

/** 目前選中的 tab value */
const model = defineModel<T>()

const id = useId()

// 把 items 加工成畫面用資料：補上 selected / disabled / tabindex / id。
const tabs = computed(() => {
  // roving tabindex：只一顆是 0（Tab 入口），其餘 -1。
  // 選中項若被 disabled 就不算入口，改給第一顆可聚焦的當保底。
  const hasFocusableSelected = props.items.some(
    (item) => item.value === model.value && !(props.disabled || item.disabled),
  )
  let fallbackAssigned = false

  return props.items.map((item, index) => {
    const disabled = props.disabled || item.disabled || false
    const selected = item.value === model.value

    let tabindex = -1
    if (selected && !disabled) {
      tabindex = 0
    } else if (!hasFocusableSelected && !disabled && !fallbackAssigned) {
      tabindex = 0
      fallbackAssigned = true
    }

    return {
      ...item,
      disabled,
      selected,
      tabindex,
      // id 用 index 不用 value：value 可能是物件 / 含特殊字元。
      id: `base-tabs-${id}-tab-${index}`,
      tabpanelId: `base-tabs-${id}-panel-${index}`,
    }
  })
})

// 給 BaseTabPanel 用 value 反查 id；用 Map 才能支援任意型別 value。
const lookup = computed(() => {
  const map = new Map<unknown, { id: string; tabpanelId: string }>()
  for (const tab of tabs.value) {
    map.set(tab.value, { id: tab.id, tabpanelId: tab.tabpanelId })
  }
  return map
})

// hook 拋錯 / Promise reject 時的處理：取消切換，dev 印出錯誤方便除錯。
function reportGuardError(error: unknown) {
  if (import.meta.env.DEV) {
    console.error('[BaseTabs] onBeforeChange 發生錯誤，已取消切換：', error)
  }
}

// 連點時用遞增編號丟掉「過期的非同步確認」（先點 B 再點 C，B 較慢 resolve 不該蓋掉 C）。
let changeRequestId = 0

function onTabClick(value: T) {
  // 點當前 tab 不處理，避免 v-model 白更新。
  if (model.value === value) return

  const requestId = ++changeRequestId
  const { onBeforeChange } = props

  // 沒有攔截 hook → 直接切。
  if (!onBeforeChange) {
    model.value = value
    return
  }

  // 呼叫 hook；用回傳值決定，不靠參數個數。同步拋錯就在這裡攔下。
  let result: boolean | void | Promise<boolean | void>
  try {
    result = onBeforeChange(value)
  } catch (error) {
    reportGuardError(error)
    return
  }

  // 回傳 Promise → 非同步路徑：等 resolve，期間有更新請求則作廢，reject 則取消。
  if (result instanceof Promise) {
    result
      .then((allowed) => {
        if (allowed === false || requestId !== changeRequestId) return
        model.value = value
      })
      .catch(reportGuardError)
    return
  }

  // 同步路徑：回傳 false 才取消，其餘照切。
  if (result === false) return
  model.value = value
}

function onTabKeydown(event: KeyboardEvent) {
  const tablist = event.currentTarget as HTMLElement | null
  const currentFocus = document.activeElement as HTMLElement | null

  if (isNullOrUndefined(tablist)) return

  // 方向鍵軸向跟著 orientation：橫排 ←/→、直排 ↑/↓；另一軸不攔截。Home / End 兩向通用。
  const isVertical = props.orientation === 'vertical'
  const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight'
  const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft'

  let moved = false
  switch (event.key) {
    case nextKey:
      event.preventDefault()
      moved = moveFocus(tablist, currentFocus, nextItem)
      break
    case prevKey:
      event.preventDefault()
      moved = moveFocus(tablist, currentFocus, previousItem)
      break
    case 'Home':
      event.preventDefault()
      moved = moveFocus(tablist, null, nextItem)
      break
    case 'End':
      event.preventDefault()
      moved = moveFocus(tablist, null, previousItem)
      break
    default:
      return
  }

  // automatic：選中跟著焦點走 —— 找出剛聚焦到的 tab 並切換。
  if (moved && props.activation === 'automatic') {
    const focusedId = (document.activeElement as HTMLElement | null)?.id
    const focusedTab = tabs.value.find((tab) => tab.id === focusedId)
    if (focusedTab) onTabClick(focusedTab.value)
  }
}

// 把選中值與對照表傳給所有 BaseTabPanel。
provide(BASE_TABS_INJECT_KEY, {
  current: toRef(() => model.value),
  lookup,
})

defineSlots<{
  /** 自訂單一 tab 按鈕內容，預設顯示 `label` */
  tab(props: {
    item: BaseTabsItem<T> & { selected: boolean; disabled: boolean }
  }): unknown
  /** 預設 slot：放 `<BaseTabPanel>` */
  default(props: Record<string, never>): unknown
}>()
</script>

<style scoped lang="scss">
/* 底線型：tablist 底部一條灰線，選中項用主色底線。客製覆寫 --tabs-* token，見 docs。 */
.base-tabs {
  // 間距 / 尺寸
  --tabs-gap: 0.5rem; // tab 之間間距
  --tabs-vertical-gap: 1.5rem; // 直排時 tablist 與面板區的間距
  --tabs-tab-padding-y: 0.625rem;
  --tabs-tab-padding-x: 0.875rem;
  --tabs-tab-font-size: 0.875rem;
  --tabs-tab-radius: 0.375rem; // 只用於 focus ring 圓角

  // 主色：換色唯一開關，下面選中文字 / 底線 / focus ring / 淺色底都從它推導。
  --tabs-accent: #1d4ed8; // blue-700（primary）

  // 文字色
  --tabs-tab-color: #6b7280; // 非選中
  --tabs-tab-color-hover: #1f2937; // hover
  --tabs-tab-color-selected: var(--tabs-accent);
  // 淺色底：從主色自動調 10% 淡色，換 color 一起變。
  --tabs-tab-bg-selected: color-mix(in srgb, var(--tabs-accent) 10%, transparent);
  --tabs-tab-bg-radius: 0.375rem; // 淺色底圓角（橫排上緣 / 直排左緣）

  // 軌道線（tablist 底線）
  --tabs-track-color: #e5e7eb;
  --tabs-track-width: 1px;

  // 選中指示底線
  --tabs-indicator-color: var(--tabs-accent);
  --tabs-indicator-width: 2px;
  --tabs-indicator-radius: 2px;

  --tabs-focus-ring: var(--tabs-accent);
  --tabs-disabled-opacity: 0.45;
}

// 換色只覆寫 --tabs-accent。色票對齊 BaseButton，但 tabs 把主色當文字 / 線條用，
// 故 warning 用較深的 amber-700（amber-400 當文字對比不足）。
.base-tabs--danger {
  --tabs-accent: #dc2626; // red-600
}
.base-tabs--success {
  --tabs-accent: #15803d; // green-700
}
.base-tabs--warning {
  --tabs-accent: #b45309; // amber-700
}
.base-tabs--info {
  --tabs-accent: #0284c7; // sky-600
}
.base-tabs--neutral {
  --tabs-accent: #4b5563; // gray-600
}

.base-tabs__tablist {
  display: flex;
  align-items: center;
  gap: var(--tabs-gap);
  // tab 過多時水平捲動，不擠壓。
  overflow-x: auto;
  // 軌道線改用 inset 陰影（不是 border）：overflow 捲動時不會被裁切，
  // 且固定在容器底緣、永遠滿寬，選中指示線會疊在它上面。
  box-shadow: inset 0 calc(-1 * var(--tabs-track-width)) 0 0 var(--tabs-track-color);
}

.base-tabs__tab {
  position: relative;
  flex-shrink: 0; // 捲動情境下不被壓窄
  padding: var(--tabs-tab-padding-y) var(--tabs-tab-padding-x);
  font-size: var(--tabs-tab-font-size);
  font-weight: 500;
  line-height: 1.4;
  color: var(--tabs-tab-color);
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.15s ease;

  // 選中指示底線：貼在 tab 底緣（蓋住軌道線），平常 scaleX(0) 收起，選中時展開。
  &::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: var(--tabs-indicator-width);
    background-color: var(--tabs-indicator-color);
    border-radius: var(--tabs-indicator-radius);
    transform: scaleX(0);
    transition: transform 0.18s ease;
  }

  &:hover:not(:disabled) {
    color: var(--tabs-tab-color-hover);
  }

  // 只在鍵盤聚焦時顯示外框。
  &:focus-visible {
    outline: 2px solid var(--tabs-focus-ring);
    outline-offset: -2px;
    border-radius: var(--tabs-tab-radius);
  }

  &:disabled {
    opacity: var(--tabs-disabled-opacity);
    cursor: not-allowed;
  }

  &--selected {
    color: var(--tabs-tab-color-selected);
    font-weight: 600;
    // 淺色底只圓上緣，下緣接指示線。
    background-color: var(--tabs-tab-bg-selected);
    border-top-left-radius: var(--tabs-tab-bg-radius);
    border-top-right-radius: var(--tabs-tab-bg-radius);

    &::after {
      transform: scaleX(1);
    }
  }
}

// 直排：tablist 在左、面板在右；指示線改貼 tab 右側。
.base-tabs--vertical {
  display: flex;
  align-items: flex-start;
  gap: var(--tabs-vertical-gap);

  .base-tabs__tablist {
    flex-direction: column;
    align-items: stretch;
    // 直排不需水平捲動，且要讓右側指示線可超出（不裁切）。
    overflow: visible;
    // 軌道線改成右側直線。
    box-shadow: none;
    border-inline-end: var(--tabs-track-width) solid var(--tabs-track-color);
  }

  .base-tabs__panels {
    flex: 1;
    min-width: 0; // 內容過長不撐爆。
  }

  .base-tabs__tab {
    text-align: start;

    // 指示線改貼右側、垂直滿高，動畫改 scaleY。
    &::after {
      top: 0;
      right: calc(-1 * var(--tabs-track-width));
      bottom: 0;
      left: auto;
      width: var(--tabs-indicator-width);
      height: auto;
      transform: scaleY(0);
    }

    &--selected {
      // 淺色底改圓左緣。
      border-radius: var(--tabs-tab-bg-radius) 0 0 var(--tabs-tab-bg-radius);
    }

    &--selected::after {
      transform: scaleY(1);
    }
  }
}

// 使用者要求減少動態時關掉過場。
@media (prefers-reduced-motion: reduce) {
  .base-tabs__tab,
  .base-tabs__tab::after {
    transition: none;
  }
}
</style>
