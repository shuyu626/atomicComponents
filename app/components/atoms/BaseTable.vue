<script lang="ts">
import type { HTMLAttributes, VNode } from 'vue'

/** 表格列資料：以 key 取值的物件。 */
export type TableItem = Record<string, unknown>

/** Vue class 綁定可接受的型別（string / object / array）。 */
type TableClass = HTMLAttributes['class']

/** body cell 的 class：靜態值，或依當格 `(value, item, index)` 動態決定。 */
export type TableBodyCellClass<Item extends TableItem = TableItem> =
  | TableClass
  | ((value: unknown, item: Item, index: number) => TableClass)

/** body row 的 class：靜態值，或依整列 `(item, index)` 動態決定。 */
export type TableBodyRowClass<Item extends TableItem = TableItem> =
  | TableClass
  | ((item: Item, index: number) => TableClass)

/** 單一欄位設定。 */
export interface TableColumn<Item extends TableItem = TableItem> {
  /** 欄位對應到 item 的 key。 */
  key: string
  /** 欄位標題；省略時不顯示文字（可用 `#header:key` slot 覆寫）。 */
  label?: string
  /** 是否可排序；需父層綁定 `v-model:sort` 才會顯示排序按鈕。 */
  sortable?: boolean
  /** 欄位寬度（number 補 px，string 原樣）。 */
  width?: number | string
  /** 內容對齊。@default 'left' */
  align?: 'left' | 'center' | 'right'
  /** 同時套用到表頭與內容儲存格的 class。 */
  class?: TableClass
  /** 僅套用到表頭儲存格的 class。 */
  headCellClass?: TableClass
  /** 套用到內容儲存格的 class（可為函式）。 */
  bodyCellClass?: TableBodyCellClass<Item>
  /** 自訂內容渲染；回傳值會被插值顯示。複雜內容請改用 `#column:key` slot。 */
  render?: (value: unknown, item: Item, index: number) => unknown
}

/** 排序方向。 */
export type TableSortDirection = 'asc' | 'desc'

/** 排序狀態（`v-model:sort`）。 */
export interface TableSort {
  /** 目前排序的欄位 key；無排序為 `undefined`。 */
  column?: string
  /** 排序方向；無排序為 `undefined`。 */
  direction?: TableSortDirection
}

/** itemKey：取列 key 的欄位名稱，或 `(item, index)` 回傳 key 的函式。 */
export type TableItemKey<Item extends TableItem = TableItem> =
  | string
  | ((item: Item, index: number) => PropertyKey)
</script>

<script setup lang="ts" generic="Item extends TableItem = TableItem">
import { computed } from 'vue'

import isFunction from '~/utils/isFunction'
import toUnit from '~/utils/toUnit'

interface BaseTableProps {
  /** 欄位設定。 */
  columns: TableColumn<Item>[]
  /** 表格資料。@default [] */
  items?: Item[]
  /**
   * 取列 key 的依據：欄位名稱或函式；取不到時退回索引。
   * @default 'id'
   */
  itemKey?: TableItemKey<Item>
  /** 表格標題（`<caption>`）。 */
  caption?: string
  /**
   * caption 位置；`hidden` 視覺隱藏但保留給螢幕閱讀器。
   * @default 'top'
   */
  captionSide?: 'top' | 'bottom' | 'hidden'
  /** 是否固定表頭（捲動時 sticky）。@default false */
  stickyHeader?: boolean
  /** 套用到表頭列的 class。 */
  headRowClass?: TableClass
  /** 套用到內容列的 class（可為函式）。 */
  bodyRowClass?: TableBodyRowClass<Item>
}

/**
 * default slot 的 scoped props 型別（含動態具名 slot）。
 * - `#header:<key>`：自訂表頭內容
 * - `#column:<key>`：自訂某欄的儲存格內容
 */
interface BaseTableSlots {
  /** 自訂 `<caption>` 內容（取代 `caption` prop）。 */
  caption?: () => VNode[]
  /** 無資料時的呈現。 */
  empty?: () => VNode[]
  /** 自訂表頭內容。 */
  [name: `header:${string}`]: (props: { column: TableColumn<Item> }) => VNode[]
  /** 自訂儲存格內容。 */
  [name: `column:${string}`]: (props: {
    value: unknown
    item: Item
    index: number
  }) => VNode[]
}

const props = withDefaults(defineProps<BaseTableProps>(), {
  items: () => [],
  itemKey: 'id',
  caption: undefined,
  captionSide: 'top',
  stickyHeader: false,
  headRowClass: undefined,
  bodyRowClass: undefined,
})

const slots = defineSlots<BaseTableSlots>()

const emit = defineEmits<{
  /** 點擊整列時觸發。 */
  'click:row': [item: Item, index: number]
}>()

/**
 * 選取資料（`v-model:selected`）。支援 `Array` 或 `Set`；
 * 未綁定（`undefined`）時不顯示選取欄。寫回一律整體取代，不就地 mutate。
 */
const selected = defineModel<Item[] | Set<Item>>('selected')

/** 排序狀態（`v-model:sort`）。未綁定時可排序欄位不顯示排序按鈕。 */
const sort = defineModel<TableSort>('sort')

// ── 選取 ─────────────────────────────────────────────────────
/** 是否啟用選取欄（父層綁了 `v-model:selected`）。 */
const isSelectable = computed(() => selected.value !== undefined)

/** 目前選取筆數（相容 Array / Set）。 */
const selectedSize = computed(() => {
  const value = selected.value
  if (!value) return 0
  return Array.isArray(value) ? value.length : value.size
})

/** 全選（資料非空且全部選取）。 */
const isAllChecked = computed(
  () => props.items.length > 0 && selectedSize.value === props.items.length,
)

/** 部分選取（用於表頭 checkbox 的 indeterminate 狀態）。 */
const isIndeterminate = computed(
  () => selectedSize.value > 0 && selectedSize.value < props.items.length,
)

/**
 * 選取查找表：把當前選取整理成 Set，讓每列 `isRowSelected` 為 O(1)，
 * 避免陣列模式下整表渲染變成 O(n²)。
 */
const selectedLookup = computed<Set<Item>>(() => {
  const value = selected.value
  if (!value) return new Set()
  return value instanceof Set ? value : new Set(value)
})

const isRowSelected = (item: Item): boolean => selectedLookup.value.has(item)

/** 切換單列選取，依原集合型別整體取代寫回。 */
const toggleRow = (item: Item, checked: boolean) => {
  const value = selected.value
  if (!value) return

  if (value instanceof Set) {
    const next = new Set(value)
    if (checked) next.add(item)
    else next.delete(item)
    selected.value = next
    return
  }

  selected.value = checked ? [...value, item] : value.filter((it) => it !== item)
}

/** 全選 / 取消全選。 */
const toggleAll = (checked: boolean) => {
  const value = selected.value
  if (!value) return
  const next = checked ? props.items.slice() : []
  selected.value = value instanceof Set ? new Set(next) : next
}

// ── 排序 ─────────────────────────────────────────────────────
// asc → desc → 無 → asc
const NEXT_DIRECTION: Record<string, TableSortDirection | undefined> = {
  asc: 'desc',
  desc: undefined,
  undefined: 'asc',
}

/** 是否啟用排序 UI（父層綁了 `v-model:sort`）。 */
const isSortEnabled = computed(() => sort.value !== undefined)

const getAriaSort = (
  column: TableColumn<Item>,
): 'ascending' | 'descending' | 'none' | undefined => {
  if (!column.sortable || !sort.value) return undefined
  if (sort.value.column !== column.key) return 'none'
  return sort.value.direction === 'asc'
    ? 'ascending'
    : sort.value.direction === 'desc'
      ? 'descending'
      : 'none'
}

const onSort = (key: string) => {
  if (!sort.value) return
  const { column, direction } = sort.value
  const next = column === key ? NEXT_DIRECTION[`${direction}`] : 'asc'
  // 方向歸零時連同 column 一併清空（無作用中排序）。
  sort.value = { column: next ? key : undefined, direction: next }
}

// ── 共用 ─────────────────────────────────────────────────────
/** 取列 key：函式 / 欄位值 / 退回索引，確保 `:key` 穩定唯一。 */
const keyOf = (item: Item, index: number): PropertyKey => {
  const itemKey = props.itemKey
  if (isFunction(itemKey)) return itemKey(item, index)
  const value = item[itemKey]
  return value === undefined || value === null
    ? index
    : (value as PropertyKey)
}

/** 內容儲存格的顯示值：有 `render` 用之，否則取原始值。 */
const cellValue = (
  column: TableColumn<Item>,
  item: Item,
  index: number,
): unknown => {
  const value = item[column.key]
  return column.render ? column.render(value, item, index) : value
}

const resolveClass = <T extends (...args: never[]) => TableClass>(
  value: TableClass | T,
  args: Parameters<T>,
): TableClass => (isFunction(value) ? value(...(args as never[])) : value)

/** body row class（靜態 / 函式）。 */
const rowClass = (item: Item, index: number): TableClass =>
  resolveClass(props.bodyRowClass, [item, index])

/** body cell class（靜態 / 函式）。 */
const bodyCellClass = (
  column: TableColumn<Item>,
  item: Item,
  index: number,
): TableClass => resolveClass(column.bodyCellClass, [item[column.key], item, index])

/** 設定原生 checkbox 的 indeterminate（DOM property，無法用 attribute 綁定）。 */
const vIndeterminate = {
  mounted: (el: HTMLInputElement, binding: { value: boolean }) => {
    el.indeterminate = binding.value
  },
  updated: (el: HTMLInputElement, binding: { value: boolean }) => {
    el.indeterminate = binding.value
  },
}
</script>

<template>
  <div
    class="base-table"
    :class="{ 'base-table--sticky': stickyHeader }"
  >
    <table class="base-table__table">
      <caption
        v-if="caption || slots.caption"
        class="base-table__caption"
        :class="`base-table__caption--${captionSide}`"
      >
        <slot name="caption">{{ caption }}</slot>
      </caption>

      <colgroup>
        <col
          v-if="isSelectable"
          class="base-table__col-select"
        >
        <col
          v-for="column in columns"
          :key="column.key"
          :style="column.width ? { width: toUnit(column.width) } : undefined"
        >
      </colgroup>

      <thead class="base-table__head">
        <tr
          class="base-table__row"
          :class="headRowClass"
        >
          <th
            v-if="isSelectable"
            class="base-table__cell base-table__cell--center base-table__cell--select"
            scope="col"
          >
            <input
              v-indeterminate="isIndeterminate"
              class="base-table__checkbox"
              type="checkbox"
              aria-label="全選"
              :checked="isAllChecked"
              @change="toggleAll(($event.target as HTMLInputElement).checked)"
            >
          </th>
          <th
            v-for="column in columns"
            :key="column.key"
            class="base-table__cell"
            :class="[
              `base-table__cell--${column.align || 'left'}`,
              column.headCellClass,
              column.class,
            ]"
            scope="col"
            :aria-sort="getAriaSort(column)"
          >
            <span class="base-table__head-content">
              <slot
                :name="`header:${column.key}`"
                :column="column"
              >{{ column.label }}</slot>
              <button
                v-if="isSortEnabled && column.sortable"
                class="base-table__sort"
                :class="{
                  'base-table__sort--active': sort?.column === column.key,
                  [`base-table__sort--${sort?.direction}`]:
                    sort?.column === column.key && sort?.direction,
                }"
                type="button"
                :aria-label="`依「${column.label ?? column.key}」排序`"
                @click="onSort(column.key)"
              >
                <svg
                  class="base-table__sort-icon"
                  viewBox="0 0 16 16"
                  width="14"
                  height="14"
                  aria-hidden="true"
                >
                  <path
                    class="base-table__sort-up"
                    d="M4 6.5 8 3l4 3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    class="base-table__sort-down"
                    d="M4 9.5 8 13l4-3.5"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>
            </span>
          </th>
        </tr>
      </thead>

      <tbody class="base-table__body">
        <tr
          v-for="(item, index) in items"
          :key="keyOf(item, index)"
          class="base-table__row"
          :class="rowClass(item, index)"
          @click="emit('click:row', item, index)"
        >
          <td
            v-if="isSelectable"
            class="base-table__cell base-table__cell--center base-table__cell--select"
            @click.stop
          >
            <input
              class="base-table__checkbox"
              type="checkbox"
              :aria-label="`選取第 ${index + 1} 列`"
              :checked="isRowSelected(item)"
              @change="toggleRow(item, ($event.target as HTMLInputElement).checked)"
            >
          </td>
          <td
            v-for="column in columns"
            :key="column.key"
            class="base-table__cell"
            :class="[
              `base-table__cell--${column.align || 'left'}`,
              column.class,
              bodyCellClass(column, item, index),
            ]"
          >
            <slot
              :name="`column:${column.key}`"
              :value="item[column.key]"
              :item="item"
              :index="index"
            >{{ cellValue(column, item, index) }}</slot>
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="items.length === 0"
      class="base-table__empty"
    >
      <slot name="empty">暫無資料</slot>
    </div>
  </div>
</template>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseTable — 資料表格
 *
 * 支援排序（v-model:sort）、選取（v-model:selected，Array / Set）、
 * 自訂渲染（render / 具名 slot）、空狀態、sticky header 與 caption。
 * 所有外觀抽成 --table-* token，取代參考實作對全域 $color-map / sr-only
 * mixin / 寫死色（#f5f5f5 / #8c8c8c）的相依，覆寫即可主題化：
 *
 *   .base-table { --table-head-bg: #eef2ff; --table-row-hover-bg: #f8fafc; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/* 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。 */
:where(.base-table) {
  --table-font-size: 0.875rem;
  --table-cell-padding-y: 10px;
  --table-cell-padding-x: 12px;
  --table-border-color: #f0f0f0;
  --table-head-bg: #f5f5f5;
  --table-head-color: #8c8c8c;
  --table-row-hover-bg: #fafafa;
  --table-empty-color: #8c8c8c;
  --table-sort-color: #bfbfbf; // 排序圖示未作用色
  --table-sort-active-color: #1f1f1f; // 作用中方向色
  --table-select-width: 44px;
}

.base-table {
  overflow: auto; // sticky header 需要可捲動容器
  width: 100%;
}

.base-table__table {
  width: 100%;
  min-width: 100%;
  border-collapse: collapse;
  font-size: var(--table-font-size);
}

/* ── caption ─────────────────────────────────────────── */
.base-table__caption {
  padding: var(--table-cell-padding-y) var(--table-cell-padding-x);
  color: var(--table-head-color);

  &--top { caption-side: top; }
  &--bottom { caption-side: bottom; }

  // 視覺隱藏但保留給螢幕閱讀器（取代參考的 @include sr-only）。
  &--hidden {
    position: absolute;
    overflow: hidden;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    white-space: nowrap;
    border: 0;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
  }
}

/* ── 表頭 ─────────────────────────────────────────────── */
.base-table__head {
  color: var(--table-head-color);
  background-color: var(--table-head-bg);

  .base-table--sticky & {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .base-table__cell { font-weight: 400; }
}

.base-table__head-content {
  display: inline-flex;
  align-items: center;
  column-gap: 4px;
}

/* ── 儲存格 ───────────────────────────────────────────── */
.base-table__cell {
  padding: var(--table-cell-padding-y) var(--table-cell-padding-x);
  vertical-align: middle;
  word-break: break-word;
  border-bottom: 1px solid var(--table-border-color);

  &--left { text-align: left; }
  &--center { text-align: center; }
  &--right { text-align: right; }

  &--select {
    line-height: 0; // 消除 checkbox 行高造成的多餘高度
  }
}

/* 選取欄寬度設在 <col>（欄寬的 canonical 位置）。 */
.base-table__col-select {
  width: var(--table-select-width);
}

.base-table__row {
  transition: background-color 0.2s ease;
}

.base-table__body .base-table__row:hover {
  background-color: var(--table-row-hover-bg);
}

/* ── 選取 checkbox ────────────────────────────────────── */
.base-table__checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--table-sort-active-color);
}

/* ── 排序按鈕 ─────────────────────────────────────────── */
.base-table__sort {
  display: inline-flex;
  padding: 0;
  color: var(--table-sort-color);
  cursor: pointer;
  background: none;
  border: 0;

  &:hover { color: var(--table-sort-active-color); }
}

.base-table__sort-icon {
  display: block;
}

/* 作用中方向高亮、另一向維持淡色，清楚指示目前排序。 */
.base-table__sort--asc .base-table__sort-up {
  stroke: var(--table-sort-active-color);
}

.base-table__sort--desc .base-table__sort-down {
  stroke: var(--table-sort-active-color);
}

/* ── 空狀態 ───────────────────────────────────────────── */
.base-table__empty {
  padding: var(--table-cell-padding-x);
  color: var(--table-empty-color);
  text-align: center;
  user-select: none;
}

@media (prefers-reduced-motion: reduce) {
  .base-table__row { transition: none; }
}
</style>
