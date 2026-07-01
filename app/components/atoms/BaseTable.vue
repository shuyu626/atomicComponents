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

/**
 * a11y / 空狀態文案（含 i18n 逃生口）。
 * 每個欄位預設值為目前的繁體中文，未傳入時行為不變。
 */
export interface BaseTableLabels {
  /** 表頭「全選」checkbox 的 aria-label。@default '全選' */
  selectAll?: string
  /**
   * 排序按鈕 aria-label：字串（原樣使用）或接受欄位標題回傳字串的函式。
   * @default label => `依「${label}」排序`
   */
  sortBy?: string | ((label: string) => string)
  /**
   * 列選取 checkbox 的 aria-label：字串（原樣使用）或接受列索引（0-based）回傳字串的函式。
   * @default index => `選取第 ${index + 1} 列`
   */
  selectRow?: string | ((index: number) => string)
  /** 無資料時的空狀態文字。@default '暫無資料' */
  empty?: string
}
</script>

<script setup lang="ts" generic="Item extends TableItem = TableItem">
import { computed, getCurrentInstance, toRaw } from 'vue'

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
  /** a11y / 空狀態文案（含 i18n / 自訂模板逃生口）。 */
  labels?: BaseTableLabels
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
  labels: () => ({}),
})

const slots = defineSlots<BaseTableSlots>()

const emit = defineEmits<{
  /** 點擊整列時觸發。 */
  'click:row': [item: Item, index: number]
}>()

// ── 列點擊可達性 ─────────────────────────────────────────────
// `click:row` 被 defineEmits 宣告後，其 listener 不會出現在 $attrs，
// 改由 vnode.props 偵測父層是否綁定 `@click:row`。
const instance = getCurrentInstance()

/** 父層是否綁定 `@click:row`（決定是否補鍵盤可達性屬性）。 */
const isRowClickable = computed(() =>
  Boolean(instance?.vnode.props?.['onClick:row']),
)

/** 可點擊列的鍵盤路徑：Enter / Space 觸發同樣的 click:row。 */
const onRowKeydown = (event: KeyboardEvent, item: Item, index: number) => {
  if (!isRowClickable.value) return
  if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
    event.preventDefault()
    emit('click:row', item, index)
  }
}

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

/**
 * 選取查找表：把當前選取整理成「原始物件」的 Set，讓每列 `isRowSelected` 為 O(1)，
 * 避免陣列模式下整表渲染變成 O(n²)。
 *
 * ⚠️ 一律用 `toRaw` 正規化後再比對 —— 父層以 `v-model:selected="ref([])"` 雙向綁定時，
 * `selected` 內的元素會被 ref 深層包成 reactive proxy，與 `items` prop 的原始物件
 * **參照不同**；若直接以物件參照比對（`Set.has(item)`），全選 / 取消 / 列勾選狀態都會失準。
 * `toRaw` 會把 proxy 還原成同一個原始物件（reactive 代理有快取），兩邊正規化後即可正確比對。
 */
const selectedLookup = computed<Set<Item>>(() => {
  const value = selected.value
  if (!value) return new Set()
  const set = new Set<Item>()
  for (const it of value) set.add(toRaw(it))
  return set
})

/**
 * 「當前 items」中被選取的筆數。
 * 只統計當頁命中的項目，避免 `selected` 含跨頁 / 非當頁項目時
 * `selectedSize > items.length` 造成全選與半選同時 false 的誤判。
 */
const selectedOnPageCount = computed(() => {
  const lookup = selectedLookup.value
  let count = 0
  for (const item of props.items) {
    if (lookup.has(toRaw(item))) count++
  }
  return count
})

/** 全選（資料非空且當頁全部選取）。 */
const isAllChecked = computed(
  () => props.items.length > 0 && selectedOnPageCount.value === props.items.length,
)

/** 部分選取（用於表頭 checkbox 的 indeterminate 狀態）。 */
const isIndeterminate = computed(
  () =>
    selectedOnPageCount.value > 0 &&
    selectedOnPageCount.value < props.items.length,
)

const isRowSelected = (item: Item): boolean => selectedLookup.value.has(toRaw(item))

/**
 * 切換單列選取，依原集合型別整體取代寫回。
 * 比對 / 寫回一律用 `toRaw`（理由見 {@link selectedLookup}）：避免 proxy 與原始物件
 * 參照不一致導致「取消勾選刪不掉」「重複加入」。
 */
const toggleRow = (item: Item, checked: boolean) => {
  const value = selected.value
  if (!value) return
  const raw = toRaw(item)

  if (value instanceof Set) {
    const next = new Set<Item>()
    for (const it of value) {
      if (toRaw(it) !== raw) next.add(it)
    }
    if (checked) next.add(raw)
    selected.value = next
    return
  }

  selected.value = checked
    ? [...value.filter((it) => toRaw(it) !== raw), raw]
    : value.filter((it) => toRaw(it) !== raw)
}

/** 全選 / 取消全選。寫回原始物件，避免把 proxy 漏給父層。 */
const toggleAll = (checked: boolean) => {
  const value = selected.value
  if (!value) return
  const next = checked ? props.items.map((it) => toRaw(it)) : []
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

// ── 文案（a11y / 空狀態）─────────────────────────────────────
const DEFAULT_LABELS: Required<BaseTableLabels> = {
  selectAll: '全選',
  sortBy: (label) => `依「${label}」排序`,
  selectRow: (index) => `選取第 ${index + 1} 列`,
  empty: '暫無資料',
}

// 逐欄位 fallback，避免 caller 傳入 `undefined` 時把預設值覆蓋掉。
const mergedLabels = computed<Required<BaseTableLabels>>(() => ({
  selectAll: props.labels.selectAll ?? DEFAULT_LABELS.selectAll,
  sortBy: props.labels.sortBy ?? DEFAULT_LABELS.sortBy,
  selectRow: props.labels.selectRow ?? DEFAULT_LABELS.selectRow,
  empty: props.labels.empty ?? DEFAULT_LABELS.empty,
}))

/** 排序按鈕 aria-label（字串原樣 / 函式接收欄位標題）。 */
const sortAriaLabel = (column: TableColumn<Item>): string => {
  const value = mergedLabels.value.sortBy
  const title = column.label ?? column.key
  return isFunction(value) ? value(title) : value
}

/** 列選取 checkbox aria-label（字串原樣 / 函式接收列索引）。 */
const selectRowAriaLabel = (index: number): string => {
  const value = mergedLabels.value.selectRow
  return isFunction(value) ? value(index) : value
}

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
              :aria-label="mergedLabels.selectAll"
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
            :style="stickyHeader && column.width ? { width: toUnit(column.width) } : undefined"
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
                :aria-label="sortAriaLabel(column)"
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
          :tabindex="isRowClickable ? 0 : undefined"
          :role="isRowClickable ? 'button' : undefined"
          @click="emit('click:row', item, index)"
          @keydown="onRowKeydown($event, item, index)"
        >
          <td
            v-if="isSelectable"
            class="base-table__cell base-table__cell--center base-table__cell--select"
            @click.stop
          >
            <input
              class="base-table__checkbox"
              type="checkbox"
              :aria-label="selectRowAriaLabel(index)"
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
            :style="stickyHeader && column.width ? { width: toUnit(column.width) } : undefined"
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
      <slot name="empty">{{ mergedLabels.empty }}</slot>
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
  --table-sticky-max-height: 400px; // stickyHeader 時 tbody 捲動區的最大高度
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

  .base-table__cell { font-weight: 400; }
}

/* ───────────────────────────────────────────────────────
 * Sticky header：只讓 tbody 垂直捲動，捲軸不跟著 header
 *
 * 作法：table / thead / tbody 改 display:block、其列（.base-table__row）改
 * display:table + table-layout:fixed —— thead 停在捲動區之外（右側無捲軸），
 * tbody 內部捲動，捲軸只出現在 header 下方。
 *
 * 代價與注意：
 * - 欄寬改吃「儲存格 width（column.width）」或等分，不再由 <col> 自動撐開
 *   （table-layout:fixed）；故 column.width 於 sticky 時改補到 th / td 上（見 template）。
 * - thead 與 tbody 各用 scrollbar-gutter:stable 保留等寬捲軸溝，避免 tbody 出現
 *   捲軸時最後一欄與表頭錯位（overlay 捲軸不佔空間，天然對齊）。
 * - sticky 時不與「水平捲動」併用（width:100% 撐滿，不橫向溢出）。
 * - 捲動區高度由 --table-sticky-max-height（預設 400px）控制。
 * ─────────────────────────────────────────────────────── */
.base-table--sticky {
  overflow: visible; // 容器不再自己垂直捲動，改由 tbody 捲

  .base-table__table,
  .base-table__head,
  .base-table__body {
    display: block;
  }

  // 每列各自成為 table 脈絡 → 欄位依 fixed 佈局對齊（依儲存格 width，否則等分）。
  .base-table__row {
    display: table;
    width: 100%;
    table-layout: fixed;
    // 外層 table 變 block 後 border-collapse 會失效，row-table 會退回 separate +
    // 預設 border-spacing:2px（欄間出現 2px 縫、列分隔線斷開）；在此補回 collapse。
    border-collapse: collapse;
  }

  // 選取欄在 fixed 佈局下需自帶寬度（<col> 於 block 表格不生效）。
  .base-table__cell--select {
    width: var(--table-select-width);
  }

  // header：不捲動，但保留與 body 等寬的捲軸溝，避免有捲軸時最後一欄錯位。
  .base-table__head {
    overflow: hidden;
    scrollbar-gutter: stable;
  }

  // body：唯一的垂直捲動區，捲軸只出現在 header 下方。
  .base-table__body {
    overflow-y: auto;
    scrollbar-gutter: stable;
    max-height: var(--table-sticky-max-height, 400px);
  }
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
