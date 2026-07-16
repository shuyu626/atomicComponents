<template>
  <BaseFormField
    class="base-select"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <!--
      控制項：BaseFormField 透過 scoped slot props 傳入 a11y 接線（id / describedby /
      invalid / required / disabled / readonly）。combobox 外框與狀態色讀 --field-* token。
      浮層（listbox）、focus-trap、Esc、點外關閉、定位都交給 BasePopover。
    -->
    <template #default="{ id, labelledby, describedby, invalid, required: isRequired, disabled: isDisabled, readonly: isReadonly }">
      <BasePopover
        v-model="active"
        :placement="placement"
        :disabled="isDisabled || isReadonly"
        auto-fit
        trigger="click"
      >
        <template #reference>
          <!--
            v-combobox-aria：在 combobox 控制項上「自行」明確設定 listbox 關聯——
            aria-haspopup="listbox" 與（展開時）aria-controls 指向實際的 listbox <ul>
            (`${uid}-listbox`)。BasePopover 會透過 fallthrough 帶下泛用的 aria-haspopup="true"
            與指向浮層容器的 aria-controls；fallthrough 在屬性合併時會覆蓋模板上的同名綁定，
            故改用指令在 patch 之後寫入，確保「以控制項自身明確設定為準」。
          -->
          <div
            :id="id"
            v-combobox-aria="{ listboxId: `${uid}-listbox`, expanded: active, describedby }"
            class="base-select__control"
            role="combobox"
            :aria-labelledby="labelledby"
            :aria-invalid="invalid"
            :aria-required="isRequired"
            :aria-disabled="isDisabled || undefined"
            :tabindex="isDisabled ? -1 : 0"
          >
            <span
              v-if="$slots.prepend"
              class="base-select__prepend"
            >
              <slot name="prepend" />
            </span>

            <!-- 顯示區：永遠顯示「已選 / placeholder」（filterable 的搜尋欄改放浮層內）。 -->
            <span class="base-select__selection">
              <!-- chips 模式（多選 + chips，且未自訂 #display）：可刪除的 chip 清單。 -->
              <span
                v-if="chipsEnabled && !$slots.display && hasDisplay"
                class="base-select__chips"
              >
                <BaseChip
                  v-for="opt in visibleChips"
                  :key="optionKeyOf(opt)"
                  size="sm"
                  :label="opt.label"
                  :deletable="!isDisabled && !isReadonly"
                  :delete-aria-label="removeAriaLabel(opt.label)"
                  @delete="onChipDelete($event, opt)"
                />
                <!-- 收斂 chip：超過 maxCollapseTags 的部分合併成不可刪除的 +N（title 列出被收斂項）。
                     不指定 color，與一般已選 chip 統一走 BaseChip 預設色（primary / ghost）。 -->
                <BaseChip
                  v-if="collapsedCount > 0"
                  class="base-select__collapse"
                  size="sm"
                  :label="`+${collapsedCount}`"
                  :title="collapsedTitle"
                />
              </span>

              <!-- 一般顯示：自訂 #display / 逗號串接文字 / placeholder。 -->
              <span
                v-else
                :class="hasDisplay ? 'base-select__value' : 'base-select__placeholder'"
              >
                <slot
                  v-if="hasDisplay"
                  name="display"
                  :selected="selected"
                >{{ display }}</slot>
                <template v-else>{{ placeholder }}</template>
              </span>
            </span>

            <!--
              表單值：以 hidden input 送出序列化後的「值」（非顯示 label）。type=hidden
              不可聚焦、不入 a11y tree，無命名問題；combobox 的名稱由 aria-labelledby 提供。
            -->
            <input
              v-if="name"
              type="hidden"
              :name="name"
              :value="formValue"
              :disabled="isDisabled || undefined"
            >

            <!-- 清除鈕：有選取且可清除時出現（hover / focus 控制項才顯形）；可鍵盤聚焦操作。 -->
            <button
              v-if="showClear && !isDisabled && !isReadonly"
              type="button"
              class="base-select__clear"
              :aria-label="clearLabel"
              @mousedown.prevent
              @click.stop="onClear"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <svg
              class="base-select__arrow"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M6 9l6 6 6-6"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </template>

        <!-- 浮層內容：filterable 時上方搜尋欄、下方選項清單。 -->
        <div class="base-select__panel">
          <div
            v-if="filterable"
            class="base-select__search-wrap"
          >
            <svg
              class="base-select__search-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              aria-hidden="true"
              focusable="false"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M21 21l-4.3-4.3"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
            <input
              ref="searchRef"
              v-model="filter"
              class="base-select__search"
              type="text"
              role="searchbox"
              autocomplete="off"
              :placeholder="searchPlaceholder"
              :aria-controls="`${uid}-listbox`"
              :aria-activedescendant="activedescendant"
              @keydown="onSearchKeydown"
            >
          </div>

          <ul
            :id="`${uid}-listbox`"
            ref="menuRef"
            class="base-select__menu"
            role="listbox"
            :aria-multiselectable="multiple || undefined"
            tabindex="-1"
            @keydown="onMenuKeydown"
          >
            <template v-if="optionViews.length">
              <li
                v-for="item in optionViews"
                :id="item.id"
                :key="optionKeyOf(item.option)"
                class="base-select__option"
                :class="{
                  'base-select__option--selected': item.selected,
                  'base-select__option--disabled': item.option.disabled,
                  'base-select__option--active': filterable && item.index === activeIndex,
                }"
                role="option"
                :tabindex="filterable ? undefined : (item.option.disabled ? -1 : 0)"
                :aria-selected="item.selected"
                :aria-disabled="item.option.disabled || undefined"
                @click="onOptionClick(item.option)"
                @keydown="onOptionKeydown($event, item.option)"
              >
                <span class="base-select__option-label">
                  <slot
                    name="option"
                    :value="item.option.value"
                    :label="item.option.label"
                    :selected="item.selected"
                    :index="item.index"
                  >
                    {{ item.option.label }}
                  </slot>
                </span>

                <!-- 選中打勾：呈現在選項最後方。 -->
                <svg
                  v-if="item.selected"
                  class="base-select__check"
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </li>
            </template>
            <li
              v-else
              class="base-select__empty"
            >
              <slot name="empty">{{ emptyText }}</slot>
            </li>
          </ul>
        </div>
      </BasePopover>
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
/** 單一選項。`T` 為綁定值型別。 */
export interface BaseSelectOption<T = string | number> {
  /** 綁定值 */
  value: T
  /** 顯示文字 */
  label: string
  /** 是否停用（不可選、不參與鍵盤導覽） */
  disabled?: boolean
}

function toLowerCase(value: string) {
  return value.toLowerCase()
}

/** `v-combobox-aria` 指令值（見 `<script setup>` 內指令定義處的說明）。 */
export interface ComboboxAriaValue {
  listboxId: string
  expanded: boolean
  /** BaseFormField 傳入的 describedby（指向訊息 / 說明節點）。 */
  describedby?: string
}

/**
 * 純函式：combobox 指令值 → aria 屬性物件。
 * client 端 mounted/updated（setAttribute 覆蓋 patch）與 SSR 端 getSSRProps
 * （首渲直出）共用同一份計算，避免三份邏輯漂移。
 */
export function computeComboboxAriaAttrs(value: ComboboxAriaValue): Record<string, string> {
  const attrs: Record<string, string> = { 'aria-haspopup': 'listbox' }
  if (value.expanded) attrs['aria-controls'] = value.listboxId
  if (value.describedby) attrs['aria-describedby'] = value.describedby
  return attrs
}

/**
 * 把作用中選項捲入可視範圍；環境（如測試）無 scrollIntoView 時安全略過。
 * 回傳 rAF id 供呼叫端於卸載時取消（避免對已卸載節點操作）。
 */
function scrollIntoView(element: HTMLElement | null | undefined): number | undefined {
  if (!element || typeof element.scrollIntoView !== 'function') return undefined
  return requestAnimationFrame(() => {
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}
</script>

<script setup lang="ts" generic="T = string | number">
import { computed, nextTick, onUnmounted, ref, useId, useTemplateRef, watch } from 'vue'
import type { DirectiveBinding, ObjectDirective } from 'vue'

import BaseChip from '~/components/atoms/BaseChip.vue'
import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import BasePopover from '~/components/atoms/BasePopover.vue'
import type { BasePopoverPlacement } from '~/components/atoms/BasePopover.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import { moveFocus, nextItem, previousItem } from '~/utils/dom'
import isFunction from '~/utils/isFunction'
import isSet from '~/utils/isSet'
import type { ValidationRule } from '~/utils/validators'

/** 多選 v-model 的容器型別：陣列或 Set。 */
type SelectModel = T | T[] | Set<T>

// NOTE: 無法 export —— 前方有依賴元件泛型的 setup 範圍 type alias（SelectModel），
// vue-tsc 在此情境 export 泛型 Props interface 會報 TS1184。維持未 export（B5 例外）。
interface BaseSelectProps<Value> extends BaseFormFieldProps {
  /** 選項清單。 */
  options?: BaseSelectOption<Value>[]
  /** placeholder 文字。 */
  placeholder?: string
  /** 原生 `name`（送出表單用）。 */
  name?: string
  /**
   * 多選：v-model 綁定 `Value[]` 或 `Set<Value>`（依傳入值型別沿用，Set 進 Set 出）。
   * @default false
   */
  multiple?: boolean
  /** 可搜尋：浮層上方顯示 searchbox，依 `label` 不分大小寫即時過濾。 @default false */
  filterable?: boolean
  /** filterable 時搜尋框的 placeholder。 @default '搜尋' */
  searchPlaceholder?: string
  /** 可清除：有選取時顯示叉叉清除鈕（hover / focus 控制項才顯形）。 @default true */
  clearable?: boolean
  /** 清除鈕的 aria-label（i18n 覆寫點）。 @default '清除' */
  clearLabel?: string
  /**
   * 多選時以可刪除的 chip 顯示已選項（取代逗號串接文字）；單選無效。
   * 每個 chip 的 × 可單獨移除該值。複用 BaseChip。 @default false
   */
  chips?: boolean
  /**
   * chip 刪除鈕的 aria-label（i18n 覆寫點）：字串（原樣使用）或接受該項 `label`
   * 回傳字串的函式。 @default (label) => `移除 ${label}`
   */
  removeLabel?: string | ((label: string) => string)
  /**
   * chips 模式的顯示上限：已選數超過此值時，只顯示前 `maxCollapseTags` 顆可刪除 chip，
   * 其餘收斂成一顆不可刪除的 `+N` chip（被收斂項的 label 放入其原生 `title` 供 hover 檢視），
   * 避免多選過多時輸入框高度無限膨脹破版。僅 `multiple` + `chips` 生效。
   * `0`（或負值）表示不限制——維持全部顯示、多行換行。 @default 0
   */
  maxCollapseTags?: number
  /** 浮層位置（`flip` / `shift` 會在空間不足時自動調整）。 @default 'bottom-start' */
  placement?: BasePopoverPlacement
  /** 無選項時的提示文字（可用 `#empty` slot 覆寫）。 @default '查無選項' */
  emptyText?: string
  /**
   * 驗證規則陣列（touched-gated）：每條規則回傳 `true`（通過）或字串（錯誤訊息）。
   * 浮層關閉時觸發 `touch`（等同失焦）。父層可透過模板 ref 呼叫 `validate()` / `reset()`。
   */
  rules?: ValidationRule<Value | Value[] | Set<Value> | undefined>[]
}

const props = withDefaults(defineProps<BaseSelectProps<T>>(), {
  options: undefined,
  placeholder: undefined,
  name: undefined,
  multiple: false,
  filterable: false,
  searchPlaceholder: '搜尋',
  clearable: true,
  clearLabel: '清除',
  chips: false,
  removeLabel: () => (label: string) => `移除 ${label}`,
  maxCollapseTags: 0,
  placement: 'bottom-start',
  emptyText: '查無選項',
  rules: undefined,
})

/** 解析 chip 刪除鈕 aria-label：字串原樣 / 函式接收項目 label。 */
const removeAriaLabel = (label: string): string =>
  isFunction(props.removeLabel) ? props.removeLabel(label) : props.removeLabel

defineSlots<{
  /** 標籤內容，取代 `label` prop。 */
  label?: () => unknown
  /** 控制項前綴。 */
  prepend?: () => unknown
  /** 自訂選取後的顯示內容。scoped prop：`selected`（單選為選項物件、多選為陣列）。 */
  display?: (props: {
    selected: BaseSelectOption<T> | BaseSelectOption<T>[] | undefined
  }) => unknown
  /** 自訂單一選項渲染。scoped props：`value` `label` `selected` `index`。 */
  option?: (props: {
    value: T
    label: string
    selected: boolean
    index: number
  }) => unknown
  /** 無選項時的內容，取代 `emptyText`。 */
  empty?: () => unknown
  /** 訊息內容，取代 `message` prop。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/**
 * v-model：用 `defineModel` 取代參考實作的 `useControlled` + 手動 emit。
 * 單選綁 `T`；多選綁 `T[]` 或 `Set<T>`。
 */
const model = defineModel<SelectModel>()

const uid = useId()

const active = ref(false)
const filter = ref('')
const activeIndex = ref(-1)

const searchRef = useTemplateRef<HTMLInputElement>('searchRef')
const menuRef = useTemplateRef<HTMLElement>('menuRef')

/**
 * 在 combobox 控制項上硬寫 listbox 關聯，覆蓋 BasePopover fallthrough 帶下的泛用值。
 * fallthrough 屬性合併時會勝過模板綁定，故 client 端在 mounted / updated（patch 之後）
 * 以 setAttribute 寫入：aria-haspopup 固定 'listbox'；aria-controls 僅在展開（listbox
 * <ul> 實際存在於 DOM）時指向其 id，收合時移除以免指向不存在的元素。describedby
 * （BaseFormField 傳入，指向訊息 / 說明節點）同樣需走指令於 patch 後寫入 ——
 * BasePopover 的 fallthrough 會把 reference 上的 aria-describedby 覆蓋成 undefined
 * （非 tooltip role 時），純模板綁定會被清掉，導致有錯誤 / 說明訊息時螢幕閱讀器讀不到。
 *
 * SSR：mounted / updated 僅在 client 執行，getSSRProps 讓 server 首渲 HTML 直出相同
 * aria 屬性，水合前即具 combobox 語意。屬性計算集中於 computeComboboxAriaAttrs
 * （一般 <script> 區塊），mounted / updated 與 getSSRProps 共用，避免三份漂移。
 */
const MANAGED_COMBOBOX_ARIA_ATTRS = ['aria-haspopup', 'aria-controls', 'aria-describedby'] as const

function applyComboboxAria(el: HTMLElement, binding: DirectiveBinding<ComboboxAriaValue>) {
  const attrs = computeComboboxAriaAttrs(binding.value)
  for (const name of MANAGED_COMBOBOX_ARIA_ATTRS) {
    const value = attrs[name]
    // 共用計算未給值代表該屬性不應存在（收合時的 aria-controls 等），需主動移除
    if (value != null) el.setAttribute(name, value)
    else el.removeAttribute(name)
  }
}
const vComboboxAria: ObjectDirective<HTMLElement, ComboboxAriaValue> = {
  mounted: applyComboboxAria,
  updated: applyComboboxAria,
  getSSRProps: (binding) => computeComboboxAriaAttrs(binding.value),
}

const allOptions = computed<BaseSelectOption<T>[]>(() => props.options ?? [])

/**
 * option 物件 → 在 `options` 陣列中的原始索引，供 v-for `:key` 使用。
 * `String(option.value)` 不可作 key：`1` 與 `'1'` 會撞 key、物件 value 全數收斂成
 * `"[object Object]"`（違反 Vue key 唯一性契約，keyed patch 會錯配節點）。
 * 原始索引在過濾 / 選取子集下仍穩定且唯一。
 */
const optionIndexKeys = computed(() => {
  const map = new Map<BaseSelectOption<T>, number>()
  allOptions.value.forEach((option, index) => map.set(option, index))
  return map
})

/** v-for `:key`：優先用原始索引；不在 options 內的物件（防禦分支）退回字串化值。 */
function optionKeyOf(option: BaseSelectOption<T>): number | string {
  return optionIndexKeys.value.get(option) ?? `value:${String(option.value)}`
}

/** 過濾後的選項（僅 filterable 且有輸入時過濾）。 */
const filteredOptions = computed<BaseSelectOption<T>[]>(() => {
  const options = allOptions.value
  if (!props.filterable || !filter.value) return options
  const query = toLowerCase(filter.value)
  return options.filter((option) => toLowerCase(option.label).includes(query))
})

/**
 * 目前選取值的集合（單選為 0–1 個）。抽成 Set 讓 `isSelected` 在大量選項下為 O(1)，
 * 避免每個選項對多選陣列做 `.includes`（O(n²)）。
 */
const selectedValues = computed<Set<T>>(() => {
  const current = model.value
  if (props.multiple) {
    if (isSet<T>(current)) return current
    if (Array.isArray(current)) return new Set(current)
    return new Set<T>()
  }
  return current == null ? new Set<T>() : new Set<T>([current as T])
})

/** 某個值在目前 model 中是否為選取狀態（單選 / 多選 Array / 多選 Set 共用）。 */
function isSelected(value: T): boolean {
  return selectedValues.value.has(value)
}

/** 提供 template 的選項視圖（含選取狀態與穩定 id）。 */
const optionViews = computed(() =>
  filteredOptions.value.map((option, index) => ({
    option,
    index,
    selected: isSelected(option.value),
    id: `${uid}-option-${index}`,
  })),
)

/** 目前選取的選項（單選為單一物件、多選為陣列），供 `#display` slot 使用。 */
const selected = computed<BaseSelectOption<T> | BaseSelectOption<T>[] | undefined>(() => {
  if (props.multiple) {
    return allOptions.value.filter((option) => isSelected(option.value))
  }
  return allOptions.value.find((option) => isSelected(option.value))
})

/** 顯示文字：多選串接 label，單選取選項 label。 */
const display = computed<string | undefined>(() => {
  if (props.multiple) {
    const values = selected.value as BaseSelectOption<T>[]
    if (!values.length) return undefined
    return values.map((option) => option.label).join(', ')
  }
  return (selected.value as BaseSelectOption<T> | undefined)?.label
})

const hasDisplay = computed(() => display.value != null && display.value !== '')

/** 是否顯示清除鈕：可清除且目前有選取。 */
const showClear = computed(() => props.clearable && hasDisplay.value)

/** 是否以 chip 顯示已選項（僅多選有效）。 */
const chipsEnabled = computed(() => props.multiple && props.chips)

/** chips 模式下的已選項清單（維持 options 順序，供收斂計算與渲染）。 */
const selectedChips = computed<BaseSelectOption<T>[]>(() =>
  chipsEnabled.value && Array.isArray(selected.value) ? selected.value : [],
)

/** 顯示上限：>0 才收斂，否則不限制（Infinity → 全部顯示）。 */
const collapseLimit = computed(() =>
  props.maxCollapseTags > 0 ? props.maxCollapseTags : Number.POSITIVE_INFINITY,
)

/** 實際渲染的可刪除 chip（前 `collapseLimit` 顆）。 */
const visibleChips = computed<BaseSelectOption<T>[]>(() =>
  selectedChips.value.slice(0, collapseLimit.value),
)

/** 被收斂（隱藏）的數量；0 表示不需要 `+N` chip。 */
const collapsedCount = computed(() =>
  Math.max(0, selectedChips.value.length - collapseLimit.value),
)

/** `+N` chip 的原生 title：被收斂項的 label 以逗號串接，供 hover 檢視。 */
const collapsedTitle = computed(() =>
  selectedChips.value
    .slice(collapseLimit.value)
    .map((option) => option.label)
    .join(', '),
)

/**
 * 送出表單用的序列化值：hidden input 提交「值」而非顯示 label。
 * 單選為值本身；多選以逗號串接各值（依原容器 Array / Set 取出）。
 */
const formValue = computed(() => {
  const current = model.value
  if (props.multiple) {
    const list = isSet<T>(current)
      ? [...current]
      : Array.isArray(current)
        ? (current as T[])
        : []
    return list.map((value) => String(value)).join(',')
  }
  return current == null ? '' : String(current)
})

/** filterable 時作用中選項的 id（給 aria-activedescendant）。 */
const activedescendant = computed<string | undefined>(() => {
  if (!props.filterable || activeIndex.value < 0) return undefined
  return optionViews.value[activeIndex.value]?.id
})

// ── 選取 ────────────────────────────────────────────────────────────────────

function selectOption(option: BaseSelectOption<T>) {
  if (option.disabled) return

  if (!props.multiple) {
    model.value = option.value
    active.value = false
    return
  }

  // 多選：toggle 該值，維持原容器型別（Set 進 Set 出、Array 進 Array 出）。
  const current = model.value
  if (isSet<T>(current)) {
    // Set 本身無序語意 → 不做 options 順序重建，維持插入順序即可。
    const next = new Set(current)
    if (next.has(option.value)) next.delete(option.value)
    else next.add(option.value)
    model.value = next
    return
  }

  const arr = Array.isArray(current) ? (current as T[]) : []
  if (arr.includes(option.value)) {
    model.value = arr.filter((value) => value !== option.value)
    return
  }
  // 設計準則：Array model 的選中值依 options 順序排列 —— 新增時不直接 push，
  // 而是以「加入後的值集合」逐一比對 options 順序重建整個陣列。
  const pending = new Set<T>([...arr, option.value])
  const ordered: T[] = []
  for (const item of allOptions.value) {
    if (pending.has(item.value)) {
      ordered.push(item.value)
      pending.delete(item.value)
    }
  }
  // 防禦情境：不在 options 內的殘值（如父層塞入的過期值）保留在尾端、維持原相對順序。
  for (const value of arr) {
    if (pending.has(value)) {
      ordered.push(value)
      pending.delete(value)
    }
  }
  model.value = ordered
}

/** 清除已選：單選回 undefined；多選依原容器型別回空陣列 / 空 Set。 */
function onClear() {
  if (!props.multiple) {
    model.value = undefined
    return
  }
  model.value = isSet<T>(model.value) ? new Set<T>() : []
}

/** 移除多選中的單一值（chip 的 × 用），維持原容器型別。 */
function removeValue(option: BaseSelectOption<T>) {
  const current = model.value
  if (isSet<T>(current)) {
    const next = new Set(current)
    next.delete(option.value)
    model.value = next
    return
  }
  if (Array.isArray(current)) {
    model.value = (current as T[]).filter((value) => value !== option.value)
  }
}

/** chip 刪除：阻止冒泡（不連帶開合浮層）後移除該值。 */
function onChipDelete(event: MouseEvent, option: BaseSelectOption<T>) {
  event.stopPropagation()
  removeValue(option)
}

// ── 鍵盤：非 filterable（roving focus on options）───────────────────────────────

function onMenuKeydown(event: KeyboardEvent) {
  if (props.filterable) return
  const container = menuRef.value
  if (!container) return
  const current = document.activeElement as HTMLElement | null

  switch (event.key) {
    case ' ':
      event.preventDefault()
      break
    case 'Tab':
    case 'Escape':
      event.preventDefault()
      active.value = false
      break
    case 'ArrowDown':
      event.preventDefault()
      moveFocus(container, current, nextItem)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveFocus(container, current, previousItem)
      break
    case 'Home':
      event.preventDefault()
      moveFocus(container, null, nextItem)
      break
    case 'End':
      event.preventDefault()
      moveFocus(container, null, previousItem)
      break
  }
}

function onOptionClick(option: BaseSelectOption<T>) {
  selectOption(option)
}

function onOptionKeydown(event: KeyboardEvent, option: BaseSelectOption<T>) {
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  selectOption(option)
}

// ── 鍵盤：filterable（activeIndex + aria-activedescendant）───────────────────────

/** 從 `start` 沿方向找下一個非停用選項的索引，到頭尾繞回；全停用回 -1。 */
function nextEnabledIndex(start: number, direction: 1 | -1): number {
  const list = filteredOptions.value
  const n = list.length
  if (!n) return -1
  let idx = start
  for (let i = 0; i < n; i++) {
    idx = (idx + direction + n) % n
    if (!list[idx]?.disabled) return idx
  }
  return -1
}

function onSearchKeydown(event: KeyboardEvent) {
  if (!props.filterable || !active.value) return
  if (event.isComposing) return

  switch (event.key) {
    case 'Enter': {
      event.preventDefault()
      const option = filteredOptions.value[activeIndex.value]
      if (!option || option.disabled) return
      selectOption(option)
      break
    }
    case 'Tab':
    case 'Escape':
      event.preventDefault()
      active.value = false
      break
    case 'ArrowDown':
      event.preventDefault()
      activeIndex.value = nextEnabledIndex(activeIndex.value, 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      activeIndex.value = nextEnabledIndex(activeIndex.value, -1)
      break
    case 'Home':
      event.preventDefault()
      activeIndex.value = nextEnabledIndex(-1, 1)
      break
    case 'End':
      event.preventDefault()
      activeIndex.value = nextEnabledIndex(0, -1)
      break
  }
}

// ── 開合副作用 ──────────────────────────────────────────────────────────────

watch(active, (value) => {
  if (!value) {
    // 關閉 = 失焦：標記 touched 後開始顯示驗證錯誤。
    validation.touch()
    if (props.filterable) {
      nextTick(() => {
        filter.value = ''
        activeIndex.value = -1
      })
    }
    return
  }

  if (props.filterable) {
    nextTick(() => searchRef.value?.focus())
    // 開啟時不預先高亮任何項（避免「無故有一列較深」）；待使用者輸入過濾或按方向鍵，
    // 游標才出現（watch(filter) 會在輸入時把作用中項移到第一個符合項，方便 Enter 選取）。
    activeIndex.value = -1
    return
  }

  // 非 filterable：開啟時聚焦已選項（無則第一項）。happy-dom 無版面時為 best-effort。
  nextTick(() => {
    const selectedEl = menuRef.value?.querySelector<HTMLElement>(
      '.base-select__option[aria-selected="true"]',
    )
    const target = selectedEl ?? menuRef.value?.querySelector<HTMLElement>('.base-select__option')
    target?.focus?.()
  })
})

// filter 變動：作用中索引重置到第一個非停用選項。
watch(filter, () => {
  if (!props.filterable || !active.value) return
  activeIndex.value = filteredOptions.value.findIndex((option) => !option.disabled)
})

// 作用中索引變動：把該選項捲入可視範圍。
// 保存待執行的捲動 rAF id：重排程前先取消舊的，卸載時一併取消（避免對已卸載節點操作）。
let scrollRafId: number | undefined

watch(activeIndex, (index) => {
  if (index < 0) return
  nextTick(() => {
    if (scrollRafId != null) cancelAnimationFrame(scrollRafId)
    const el = menuRef.value?.querySelectorAll<HTMLElement>('.base-select__option')[index]
    scrollRafId = scrollIntoView(el)
  })
})

onUnmounted(() => {
  if (scrollRafId != null) cancelAnimationFrame(scrollRafId)
})

// ── 驗證 ────────────────────────────────────────────────────────────────────

const validation = useValidation<SelectModel | undefined>(
  () => model.value,
  () => props.rules,
)

defineExpose({
  /** 強制驗證（會顯示錯誤即使尚未 touch）；回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態（清掉錯誤，不動值）。 */
  reset: validation.reset,
})

/**
 * 合併「外部 props」與「驗證結果」後轉發給 BaseFormField：error 任一為真即錯誤；
 * message 驗證錯誤優先、無則退回 props.message。詳見 `useFieldValidation`。
 */
const { displayMessage, fieldProps } = useFieldValidation(() => props, validation)
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseSelect — 下拉選擇控制項（單選 / 多選 / 可搜尋）
 *
 * 包在 BaseFormField 內，補上 combobox 控制項與 listbox 浮層（浮層由 BasePopover
 * 負責定位 / focus-trap / Esc / 點外關閉）。所有狀態色（邊框 / focus / error /
 * disabled）讀 BaseFormField 對外的 --field-* token，不自帶狀態邏輯。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-select {
  &__control {
    position: relative;
    display: flex;
    align-items: center;
    column-gap: 6px;
    width: 100%;
    min-height: var(--field-height);
    padding: 0 12px;
    background: var(--field-background, #fff);
    border: 1px solid var(--field-color);
    border-radius: var(--field-radius);
    outline: none;
    cursor: pointer;
    user-select: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: var(--field-active-color);
    }

    // 鍵盤聚焦（含內部 searchbox 聚焦）：邊框轉 active 色 + 同色柔光 ring，
    // 透明 outline 作為 forced-colors 模式的焦點後備（對齊 BaseTextField）。
    &:focus-visible,
    &:has(.base-select__search:focus-visible) {
      border-color: var(--field-active-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--field-active-color) 22%, transparent);
    }

    &[aria-disabled='true'] {
      cursor: not-allowed;
    }
  }

  &__selection {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
  }

  // chips 模式：chip 在控制項內換行排列；控制項補垂直內距、高度自動成長。
  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-width: 0;
  }

  // chips 模式：控制項本身「不」換行——chip 只在內層 .base-select__chips 換行；
  // 清除鈕與箭頭留在同一 flex row，靠 align-items: center 恆定在最右側垂直置中。
  // 控制項高度隨多行 chip 自動成長，故補垂直內距。
  &__control:has(&__chips) {
    padding-top: 4px;
    padding-bottom: 4px;
  }

  &__value,
  &__placeholder {
    display: -webkit-box;
    overflow: hidden;
    font-size: 0.875rem;
    color: #111827;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }

  &__placeholder {
    color: #9ca3af;
  }

  &__prepend {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #6b7280;
  }

  // 清除鈕：預設隱形，hover / focus 控制項才顯形（Element Plus 風格）。
  &__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    color: #9ca3af;
    background: transparent;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, color 0.12s ease, background-color 0.12s ease;

    &:hover {
      color: #4b5563;
      background: #f3f4f6;
    }

    // 鍵盤聚焦時顯形並畫出焦點環（滑鼠操作仍維持 hover 顯形）。
    &:focus-visible {
      color: #4b5563;
      outline: 2px solid var(--field-active-color);
      outline-offset: 1px;
    }
  }

  &__control:hover &__clear,
  &__control:focus-within &__clear {
    opacity: 1;
  }

  &__arrow {
    flex-shrink: 0;
    color: #6b7280;
    transition: transform 0.2s ease;
  }
}

// 開啟時箭頭翻轉（aria-expanded 由 BasePopover 掛在 control 上）。
.base-select__control[aria-expanded='true'] .base-select__arrow {
  transform: rotate(180deg);
}

/*
 * 浮層內容（搜尋欄 + 選項）。容器 chrome（bg / border / shadow / padding）由
 * BasePopover 的 .base-popover 提供；此處只負責內部排版與互動狀態，並對齊
 * BaseDropdown 的視覺語言：accent 高亮、滿版 bleed、disabled 半透明。
 */
.base-select__panel {
  // ── tokens（定義在 teleport 出去的浮層子樹上，--field-* 不會跨樹繼承）──
  --select-accent: #1d4ed8; // 對齊 BaseDropdown --dropdown-accent / BaseButton primary
  --select-item-color: #1f2937;
  --select-item-font-size: 0.875rem;
  --select-item-padding: 0.5rem 0.75rem;
  // 兩層 accent 底色：游標(hover / 鍵盤)較淡、已選較深；已選+游標再加深。
  --select-item-cursor-bg: color-mix(in srgb, var(--select-accent) 8%, transparent);
  --select-item-selected-bg: color-mix(in srgb, var(--select-accent) 16%, transparent);
  --select-item-highlight-color: var(--select-accent);
  --select-disabled-opacity: 0.45;
  --select-max-height: 16rem;

  // 抵銷 BasePopover 的水平內距（--popover-padding 預設 0.75rem），讓高亮與分隔線
  // 滿版貼齊浮層左右緣（與 BaseDropdown --dropdown-bleed-x 同理）。
  --select-bleed-x: 0.75rem;
}

.base-select__search-wrap {
  display: flex;
  align-items: center;
  column-gap: 6px;
  margin: 0 calc(-1 * var(--select-bleed-x)) 6px;
  padding: 0 var(--select-bleed-x) 8px;
  border-bottom: 1px solid #eef0f3;
}

.base-select__search-icon {
  flex-shrink: 0;
  color: #9ca3af;
}

.base-select__search {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.875rem;
  color: #111827;
  background: transparent;
  border: 0;
  outline: none;

  &::placeholder {
    color: #9ca3af;
  }
}

.base-select__menu {
  margin: 0 calc(-1 * var(--select-bleed-x));
  padding: 0;
  max-height: var(--select-max-height);
  overflow-y: auto;
  list-style: none;
}

.base-select__option {
  display: flex;
  align-items: center;
  column-gap: 8px;
  padding: var(--select-item-padding);
  font-size: var(--select-item-font-size);
  color: var(--select-item-color);
  cursor: pointer;
  user-select: none;
  outline: none; // 鍵盤焦點改用 :focus-visible 的滿版游標底（見下），不另畫外框
  transition: background-color 0.12s ease, color 0.12s ease;

  // 游標：滑鼠 hover / 鍵盤 :focus-visible / filterable --active → 淡底色。
  // 刻意「不」用純 :focus —— 非 filterable 的選項可聚焦，滑鼠點一下會停在 :focus，
  // 若 :focus 有底色，點掉已選項後底色會殘留（Multiple 比 Chips 髒的主因）；
  // 改用 :focus-visible（僅鍵盤觸發）即可，hover 仍有底色。
  &:hover,
  &:focus-visible,
  &--active {
    background-color: var(--select-item-cursor-bg);
  }

  // 已選：較深底色 + 主色文字 + 粗體（+ 右側打勾）。點選 toggle 時底色與打勾同進同退。
  &--selected {
    color: var(--select-item-highlight-color);
    font-weight: 600;
    background-color: var(--select-item-selected-bg);
  }

  // 已選 + 游標並存：再加深，兩狀態同時清楚（兩 class 特異度高於上面任一單條，正確勝出）。
  &--selected:hover,
  &--selected:focus-visible,
  &--selected#{&}--active {
    background-color: color-mix(in srgb, var(--select-accent) 24%, transparent);
  }

  &--disabled {
    cursor: not-allowed;
    opacity: var(--select-disabled-opacity);

    &:hover,
    &:focus {
      color: var(--select-item-color);
      background-color: transparent;
    }
  }

  // 粗指標裝置（手機 / 平板）：放大觸控目標到 44px（WCAG 2.5.5）。
  @media (pointer: coarse) {
    min-height: 44px;
  }
}

.base-select__option-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.base-select__check {
  flex-shrink: 0;
  color: var(--select-item-highlight-color);
}

.base-select__empty {
  padding: var(--select-item-padding);
  font-size: var(--select-item-font-size);
  color: #9ca3af;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .base-select__arrow,
  .base-select__clear,
  .base-select__option {
    transition: none;
  }
}
</style>
