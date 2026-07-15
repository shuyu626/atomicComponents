# EmptyState 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseEmptyState.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseEmptyState 是 **區塊內無資料狀態**：置中呈現「inbox 圖示 → 標題 → 說明 → 額外內容 → 動作」。用於列表 / 表格 / 搜尋結果為空的情境，是 [`BaseResult`](./BaseResult.md) 的「無狀態色」表親——版面結構相同，但刻意不帶 `success` / `error` 等狀態語意色，統一走中性灰階，避免與頁面主要結果混淆（詳見 §6）。

顏色 / 尺寸 / 間距全走 CSS token，可跨專案主題化。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `title` | `string` | `'目前沒有資料'` | 標題文字（也可用 `#title` slot 覆寫） |
| `description` | `string` | — | 補充說明（也可用 `#description` slot 覆寫） |
| `icon` | `boolean` | `true` | 是否顯示圖示區（`#icon` slot 可覆寫成自訂插圖）；`false` 時**含 `#icon` slot 一律不渲染**（同 BaseAlert / BaseResult） |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸：控制圖示大小與容器留白 |

**Slots**

| Slot | Scoped Props | 說明 |
|---|---|---|
| `#icon` | — | 覆寫內建 inbox 圖示（自訂插圖 / 品牌 SVG） |
| `#title` | `{ title }` | 覆寫標題（否則用 `title` prop） |
| `#description` | `{ description }` | 覆寫說明（否則用 `description` prop） |
| `#default` | — | 標題 / 說明之後、動作之前的額外內容（篩選條件摘要、提示清單…） |
| `#actions` | — | 動作按鈕區（重新整理 / 新增資料 / 清除篩選…） |

`title` 永遠渲染（有預設文字）；`description` / `#default` / `#actions` 各自只在「有 prop 或對應 slot」時才渲染，不留空白區塊。本元件純展示，無 emits。

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--empty-icon-size` | `56px`（依 `size`：sm `40px` / md `56px` / lg `72px`） | 圖示尺寸 |
| `--empty-icon-color` | `#d1d5db`（gray-300） | 圖示顏色 |
| `--empty-title-color` | `#1f2937`（gray-800，對齊 BaseResult） | 標題色 |
| `--empty-title-font-size` | `1rem`（依 `size`：sm `0.875rem` / md `1rem` / lg `1.125rem`） | 標題字級 |
| `--empty-description-color` | `#6b7280`（gray-500） | 說明色 |
| `--empty-description-font-size` | `0.875rem`（依 `size`：sm `0.75rem` / md `0.875rem` / lg `0.9375rem`） | 說明字級 |
| `--empty-gap-y` | `12px`（依 `size`：sm `8px` / md `12px` / lg `16px`） | 各區塊之間的垂直間距 |
| `--empty-padding` | `40px`（依 `size`：sm `24px` / md `40px` / lg `56px`） | 容器內距 |

> `size` 覆寫圖示尺寸、內距、字級與間距（版面比例整組縮放），不影響顏色；字級階層對齊 BaseResult（lg 與 Result 同字級）。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseEmptyState class="brand-empty" title="尚無收藏項目" />
</template>

<style scoped>
.brand-empty {
  --empty-icon-color: #9ca3af;
  --empty-title-color: #111827;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 最簡：預設標題「目前沒有資料」 -->
  <BaseEmptyState />

  <!-- 自訂標題 + 說明 -->
  <BaseEmptyState
    title="找不到符合的結果"
    description="請調整篩選條件後再試一次。"
  />

  <!-- 尺寸 -->
  <BaseEmptyState size="sm" title="尚無留言" />
  <BaseEmptyState size="lg" title="購物車是空的" />

  <!-- 動作 -->
  <BaseEmptyState title="尚未新增任何項目">
    <template #actions>
      <BaseButton color="primary" @click="onCreate">新增資料</BaseButton>
    </template>
  </BaseEmptyState>

  <!-- 自訂插圖（取代內建 inbox） -->
  <BaseEmptyState title="搜尋不到相關結果">
    <template #icon>
      <img src="/illustrations/empty-search.svg" alt="" width="72" height="72">
    </template>
  </BaseEmptyState>
</template>
```

**搭配 BaseTable 的 `#empty` slot**

```vue
<template>
  <BaseTable :columns="columns" :items="items">
    <template #empty>
      <BaseEmptyState
        title="尚無資料"
        description="目前沒有符合條件的紀錄。"
      >
        <template #actions>
          <BaseButton size="sm" variant="outline" @click="resetFilters">清除篩選</BaseButton>
        </template>
      </BaseEmptyState>
    </template>
  </BaseTable>
</template>
```

> `BaseTable` 的 `items` 為空陣列時會渲染 `#empty` slot（未覆寫時退回 `labels.empty` 純文字）。把 `BaseEmptyState` 塞進 `#empty`，即可用同一套「無資料視覺語言」取代 Table 原本的純文字空狀態。

---

## 4. 行為與狀態

- **條件渲染**：`title` 永遠渲染（有預設文字 `'目前沒有資料'`）；圖示區**僅由 `icon` prop 閘控**（`icon=false` 時即使提供 `#icon` slot 也不渲染，行為對齊 BaseAlert / BaseResult）；`description`/`#description`、`#default`、`#actions` 各自只在提供時渲染。
- **內建圖示**：inbox 造型的內聯 SVG（不依賴 icon library），`stroke="currentColor"` 隨 `--empty-icon-color` 著色，尺寸走 `--empty-icon-size`。
- **置中排版**：`flex column` + `align-items:center` + `text-align:center`，各區塊間距走 `--empty-gap-y`。
- **尺寸**：`size` 只切換 `--empty-icon-size` / `--empty-padding`（modifier class `base-empty-state--sm/md/lg`），與顏色無關。

---

## 5. A11y

- **圖示為裝飾性**：`#icon` 容器帶 `aria-hidden="true"`，語意由**標題文字**承載，不依賴圖示。
- **不內建 live region**：EmptyState 多半是「首次渲染就存在」的靜態版面內容（列表載入完成後才切換顯示），不加 `role="status"` / `aria-live`——若在同一畫面上加上又拿掉，容易造成過度朗讀。若你的場景是「使用者操作後，畫面從有資料動態切換為空狀態」且需要即時朗讀，請在使用端外層自行加 `aria-live="polite"`：

  ```vue
  <template>
    <div aria-live="polite">
      <BaseEmptyState v-if="items.length === 0" title="沒有符合的資料" />
      <BaseTable v-else :columns="columns" :items="items" />
    </div>
  </template>
  ```

- **標題階層**：`title` 以 `<div>` 呈現、不寫死 heading 階層；若此 EmptyState 是頁面 / 區塊的主要內容（例如整頁搜尋結果），可用 `#title` slot 放入正確層級的 `<h3>` 等：

  ```vue
  <BaseEmptyState description="請調整搜尋條件後再試一次。">
    <template #title="{ title }">
      <h3>{{ title }}</h3>
    </template>
  </BaseEmptyState>
  ```

- **動作可達**：`#actions` 放真正的 `<BaseButton>` / `<BaseLink>`，鍵盤與 SR 皆可操作。

---

## 6. 與 BaseResult 的分工

| | BaseEmptyState | BaseResult |
|---|---|---|
| 色彩語意 | **中性灰階**（無 `status`，不隨語意變色） | **狀態色**（`success`/`info`/`warning`/`error` 各自 accent） |
| 使用場景 | **區塊內無資料**（列表 / 表格 / 搜尋結果為空） | **整頁結果**（送出成功頁、錯誤彈窗、404） |
| 內建圖示 | 固定 inbox / 收納箱造型（`#icon` 可換自訂插圖） | 依 `status` 切換的內建狀態圖示（勾 / 叉 / 驚嘆號 / i） |
| 典型宿主 | `BaseTable` `#empty`、`BaseList` 空清單、搜尋結果頁 | 頁面結果、`BaseModal` / `BaseDialog` 結果彈窗 |

**選用原則**：「資料本來就沒有 / 篩選後查無結果」→ **EmptyState**；「使用者剛完成一個操作，需要知道結果好壞」→ **Result**。兩者置中欄版面（圖示 → 標題 → 說明 → 額外內容 → 動作）與 slot 集合刻意一致，降低心智負擔，必要時可互換而不需重學 API。

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | 與 BaseResult 共用版面骨架、拆成獨立元件而非 `status="empty"` | 「無資料」不是一種結果狀態，語意上不該與 success/error 混在同一個 `status` enum；獨立元件也讓「不帶狀態色」這個設計意圖更明確 |
| 2 | 內建圖示固定為 inbox（非依某個 prop 切換） | EmptyState 只有一種語意（沒有資料），不像 Result 需要依狀態切圖；`#icon` slot 已足夠覆寫成品牌插圖 |
| 3 | `title` 有預設文案、`description` 沒有 | 「目前沒有資料」是可安全套用任何情境的通用文案；說明文字情境性太強，交由使用端決定是否需要 |
| 4 | 不內建 live region | 多數用在靜態初始渲染（列表載入完成），動態切換情境交由使用端加 `aria-live`，避免過度朗讀 |
| 5 | 標題用 `<div>`、不寫死 heading | 與 BaseResult 一致，由 caller 決定階層（`#title` slot 放 `<h*>`），避免跳階 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseEmptyState.spec.ts`（預設標題、title/description prop 與 `#title`/`#description` slot 覆寫（含 scoped props）、description 未提供時不渲染、icon 預設/`icon=false`/`#icon` slot 覆寫、size 預設與三種 modifier、`#default`/`#actions` 條件渲染、a11y：icon 容器 `aria-hidden` + 根節點無 `role`）— 11 cases
- [x] **Storybook**：`stories/components/atoms/BaseEmptyState.stories.ts`（Playground / Sizes / WithActions / CustomIcon / WithTable / Themed）
