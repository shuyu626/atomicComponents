# Table 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseTable.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseTable 是 **資料表格** 元件：以 `columns` 設定欄位、`items` 提供資料，支援排序（`v-model:sort`）、選取（`v-model:selected`，相容 `Array` / `Set`）、自訂渲染（`render` 函式或具名 slot）、空狀態、sticky header 與 caption。

排序與選取採「**受控狀態**」設計：元件只負責 UI 與狀態流轉，實際的資料排序由父層依 `sort` 自行運算。顏色 / 間距 / 邊框全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicTable`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicTable.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `columns` | `TableColumn<Item>[]` | （必填） | 欄位設定 |
| `items` | `Item[]` | `[]` | 表格資料 |
| `itemKey` | `string \| ((item, index) => PropertyKey)` | `'id'` | 取列 key 的依據；取不到時退回索引 |
| `caption` | `string` | — | 表格標題（`<caption>`） |
| `captionSide` | `'top' \| 'bottom' \| 'hidden'` | `'top'` | caption 位置；`hidden` 視覺隱藏但保留給螢幕閱讀器 |
| `stickyHeader` | `boolean` | `false` | 固定表頭（捲動時 sticky） |
| `headRowClass` | `class` | — | 套用到表頭列的 class |
| `bodyRowClass` | `class \| ((item, index) => class)` | — | 套用到內容列的 class（可為函式） |

### `TableColumn<Item>`

| 欄位 | 型別 | 說明 |
|---|---|---|
| `key` | `string` | 對應 item 的 key（必填） |
| `label` | `string` | 欄位標題；可用 `#header:<key>` slot 覆寫 |
| `sortable` | `boolean` | 是否可排序（需綁 `v-model:sort` 才顯示排序按鈕） |
| `width` | `number \| string` | 欄寬（number 補 px） |
| `align` | `'left' \| 'center' \| 'right'` | 內容對齊，預設 `left` |
| `class` | `class` | 同時套用到表頭與內容儲存格 |
| `headCellClass` | `class` | 僅套用到表頭儲存格 |
| `bodyCellClass` | `class \| ((value, item, index) => class)` | 套用到內容儲存格（可為函式） |
| `render` | `(value, item, index) => unknown` | 自訂內容（回傳值會被插值）；複雜內容請用 `#column:<key>` slot |

> **參數順序**：`render` 與 `bodyCellClass` 函式統一為 `(value, item, index)`（參考實作為 `(value, index, item)`，本元件調整為更直覺的順序）。

## 2. v-model

| 名稱 | 型別 | 說明 |
|---|---|---|
| `v-model:selected` | `Item[] \| Set<Item>` | 選取資料。**綁定後才顯示選取欄**；未綁定 = 不可選 |
| `v-model:sort` | `{ column?: string; direction?: 'asc' \| 'desc' }` | 排序狀態。**綁定後 `sortable` 欄位才顯示排序按鈕** |

> 是否啟用選取 / 排序，由「父層是否綁定對應 `v-model`」決定（取代參考實作的 `useControlled`）。寫回一律**整體取代**集合，不就地 mutate。

## 3. Emits

| 事件 | 參數 | 說明 |
|---|---|---|
| `click:row` | `(item: Item, index: number)` | 點擊整列時觸發（點選取欄 checkbox 不會冒泡觸發） |

## 4. Slots

| Slot | Scoped props | 說明 |
|---|---|---|
| `#caption` | — | 自訂 `<caption>` 內容（取代 `caption` prop） |
| `#header:<key>` | `{ column }` | 自訂某欄表頭內容 |
| `#column:<key>` | `{ value, item, index }` | 自訂某欄儲存格內容（取代 `render`） |
| `#empty` | — | 無資料時的呈現（預設「暫無資料」） |

---

## 5. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--table-font-size` | `0.875rem` | 表格字級 |
| `--table-cell-padding-y` | `10px` | 儲存格垂直內距 |
| `--table-cell-padding-x` | `12px` | 儲存格水平內距 |
| `--table-border-color` | `#f0f0f0` | 列分隔線色 |
| `--table-head-bg` | `#f5f5f5` | 表頭背景 |
| `--table-head-color` | `#8c8c8c` | 表頭文字色 |
| `--table-row-hover-bg` | `#fafafa` | 列 hover 背景 |
| `--table-empty-color` | `#8c8c8c` | 空狀態文字色 |
| `--table-sort-color` | `#bfbfbf` | 排序圖示未作用色 |
| `--table-sort-active-color` | `#1f1f1f` | 作用中排序方向色 / checkbox accent |
| `--table-select-width` | `44px` | 選取欄寬度 |

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseTable
    class="brand-table"
    :columns="columns"
    :items="items"
  />
</template>

<style scoped>
.brand-table {
  --table-head-bg: #eef2ff;
  --table-head-color: #4338ca;
  --table-row-hover-bg: #f5f3ff;
}
</style>
```

---

## 6. 基本用法

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TableColumn, TableSort } from '~/components/atoms/BaseTable.vue'

interface User {
  id: number
  name: string
  age: number
}

const columns: TableColumn<User>[] = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'age', label: '年齡', align: 'right', sortable: true, render: (v) => `${v} 歲` },
]

const users: User[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
]

// 選取（Array 或 Set 皆可）
const selected = ref<User[]>([])

// 排序狀態 + 父層依狀態排序資料
const sort = ref<TableSort>({})
const sortedUsers = computed(() => {
  const { column, direction } = sort.value
  if (!column || !direction) return users
  const key = column as keyof User
  return [...users].sort((a, b) => {
    const r = a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0
    return direction === 'asc' ? r : -r
  })
})
</script>

<template>
  <BaseTable
    v-model:selected="selected"
    v-model:sort="sort"
    :columns="columns"
    :items="sortedUsers"
    caption="使用者列表"
    @click:row="(item) => openDetail(item)"
  >
    <!-- 自訂某欄儲存格 -->
    <template #column:name="{ value }">
      <strong>{{ value }}</strong>
    </template>

    <!-- 空狀態 -->
    <template #empty>查無資料</template>
  </BaseTable>
</template>
```

---

## 7. 行為與狀態

- **排序循環**：點同一欄 `asc → desc → 無`（方向歸零時 `column` 一併清空）；點別欄則重新從 `asc` 開始。元件只 emit `update:sort`，**不排序資料**——資料排序由父層依 `sort` 自理。
- **選取相容 Array / Set**：依傳入集合型別決定寫回型別；全選 / 取消全選由表頭 checkbox 控制，部分選取時表頭呈 indeterminate。
- **不就地 mutate**：選取寫回一律建立新集合（`[...arr]` / `new Set()`）整體取代，符合單向資料流。
- **列點擊**：整列可觸發 `click:row`；選取欄的 checkbox 以 `@click.stop` 阻止冒泡，避免誤觸列點擊。
- **空狀態**：`items` 為空時隱藏 `<tbody>` 列並顯示 `#empty`。
- **sticky header**：元件根節點（`.base-table`）本身即捲動容器（預設 `overflow:auto`）。`stickyHeader` 開啟後，**對 `<BaseTable>` 設 `max-height`** 表頭即會吸頂——不要再外包一層捲動容器（會讓 sticky 相對到內層而失效）。
- **選取比對採「參考」**：選取以物件參考判定（`Set` / 陣列成員需與 `items` 為同一參考）。若 `selected` 來源與 `items` 非同源（如各自 fetch），請先正規化為同一份資料再傳入。

---

## 8. A11y

- 採語意化 `<table>` / `<caption>` / `<thead>` / `<tbody>`，表頭儲存格為 `<th scope="col">`。
- 可排序欄位提供 `aria-sort`（`ascending` / `descending` / `none`），非排序欄不輸出該屬性。
- 排序按鈕、選取 checkbox 皆有 `aria-label`（如「依『姓名』排序」「選取第 N 列」「全選」）。
- `captionSide="hidden"` 以 sr-only 樣式保留 caption 給螢幕閱讀器（取代參考的全域 `@include sr-only`）。
- 排序圖示 `<svg>` 標記 `aria-hidden="true"`，語意由按鈕 `aria-label` 與表頭 `aria-sort` 承載。

---

## 9. 對參考實作的修正與優化

| 項目 | 參考實作 | 本元件 |
|---|---|---|
| 雙向綁定 | 手動 `defineEmits('update:selected'/'update:sort')` + `selectedWritable` computed | `defineModel('selected'/'sort')`（對齊專案 Vue 3.4+ 規範） |
| 受控判定 | `useControlled` composable（依賴 `hasOwn` / `toKebabCase`） | 直接以 `model.value !== undefined` 判定，移除三個相依檔 |
| 型別安全 | `Record<string, any>`、欄位 class 皆 `any` | 泛型 `Item`、`HTMLAttributes['class']`，全面移除 `any` |
| 選取元件 | 依賴 `AtomicCheckbox`（本專案無此元件） | 原生 `<input type="checkbox">` + 本地 `v-indeterminate` 指令，零相依 |
| 排序圖示 | import 三個 `.svg?component` 資產 | 內聯 SVG（單一圖示以方向 class 高亮），移除資產相依 |
| 樣式相依 | 全域 `$color-map`、`@include sr-only`、寫死色（`#f5f5f5` / `#8c8c8c`） | scoped `--table-*` token + `:where()` 低特異性 + 內聯 sr-only |
| 排序歸零 | `direction` 為 `undefined` 但 `column` 仍保留 | `direction` 歸零時連同 `column` 清空（無作用中排序語意更乾淨） |
| 函式參數 | `render(value, index, item)` | `render(value, item, index)`（item 先於 index，較直覺） |
| 列點擊誤觸 | 選取欄無阻擋，點 checkbox 也會觸發 `click:row` | 選取欄 `@click.stop`，避免誤觸列點擊 |
| reduced-motion | 無 | 補 `prefers-reduced-motion` 關閉列 hover 過渡 |

---

## 10. 測試與 Storybook

- **測試**（`tests/components/atoms/BaseTable.spec.ts`，34 cases）涵蓋：
  - 結構：thead 欄位數、tbody 列數、原始值渲染、對齊 modifier、`<col>` 寬度。
  - 渲染：`render` 轉換、`#column:<key>` / `#header:<key>` slot、函式型 `bodyCellClass` / `bodyRowClass`。
  - 空狀態：預設訊息、`#empty` slot、有資料時隱藏。
  - caption：prop 渲染、`captionSide`、未提供時不渲染。
  - sticky / itemKey（函式）/ `click:row`（item + index）。
  - 排序：未綁 `v-model:sort` 不顯示按鈕、方向循環 asc→desc→無、`aria-sort` 各狀態、非排序欄不輸出 `aria-sort`。
  - 選取：未綁不顯示選取欄、Array / Set 寫回、不就地 mutate、全選 / 取消全選、indeterminate、選取欄點擊不冒泡。
- **Storybook**（`stories/components/atoms/BaseTable.stories.ts`）：Playground、Basic、Sortable、Selectable、CustomCell、Empty、StickyHeader、Themed（token 客製化）。
