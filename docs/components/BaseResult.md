# Result 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseResult.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseResult 是 **結果 / 狀態回饋面板**：置中呈現「狀態圖示 → 標題 → 說明 → 額外內容 → 動作」。用於操作完成後的回饋（成功 / 失敗 / 警告 / 提示）、空狀態、404 / 403 等結果頁。

**可單獨用在頁面**，也可**塞進 [`BaseModal`](./BaseModal.md) / [`BaseDialog`](./BaseDialog.md) 當結果彈窗**——此時遮罩、右上 ✕、focus trap 由 Modal 負責，BaseResult 只提供置中的狀態內容，主要動作（關閉 / 重試）放 `#actions`。

顏色 / 尺寸 / 間距全走 CSS token，可跨專案主題化。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `status` | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'` | 狀態：決定圓標顏色與內建字符（success 綠勾 / info 藍 i / warning 琥珀驚嘆號 / error 紅叉） |
| `title` | `string` | — | 主標題（也可用 `#title` slot 覆寫） |
| `description` | `string` | — | 說明文字（也可用 `#description` slot 覆寫） |
| `icon` | `boolean` | `true` | 是否顯示狀態圖示（`#icon` slot 可覆寫成自訂圖示） |

**Slots**

| Slot | 說明 |
|---|---|
| `#icon` | 覆寫狀態圖示（emoji / 品牌插畫 / 自訂 SVG） |
| `#title` | 覆寫標題（否則用 `title` prop） |
| `#description` | 覆寫說明（否則用 `description` prop） |
| `#default` | 標題 / 說明之後、動作之前的額外內容（明細、清單…） |
| `#actions` | 動作按鈕區（關閉 / 重試 / 返回…） |

各區塊皆只在「有 prop 或對應 slot」時才渲染。本元件純展示，無 emits。

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--result-accent` | 依 `status`（info `#06b6d4`） | 圓標顏色（success `#22c55e` / warning `#f59e0b` / error `#ef4444`） |
| `--result-on-accent` | `#ffffff` | 圓標字符色（accent 底上的對比色） |
| `--result-title-color` | `#1f2937`（gray-800） | 標題色 |
| `--result-description-color` | `#6b7280`（gray-500） | 說明色 |
| `--result-icon-size` | `56px` | 圖示尺寸 |
| `--result-gap` | `12px` | 各區塊之間的垂直間距 |
| `--result-padding` | `24px` | 面板內距 |

> 狀態色（`--result-accent`）對齊 [`BaseBadge`](./BaseBadge.md) / [`BaseSpinner`](./BaseSpinner.md) 的亮色語意集。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseResult class="brand-result" status="success" title="付款完成" />
</template>

<style scoped>
.brand-result {
  --result-accent: #7c3aed;
  --result-icon-size: 72px;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 頁面結果 -->
  <BaseResult status="success" title="您已駁回該筆融資案件">
    <template #actions>
      <BaseButton variant="outline" color="neutral">關閉</BaseButton>
    </template>
  </BaseResult>

  <!-- 錯誤 + 說明 + 多個動作 -->
  <BaseResult status="error" title="發生非預期的錯誤" description="欄位值不一致，請檢查並重新提交。">
    <template #actions>
      <BaseButton variant="outline" color="neutral">返回</BaseButton>
      <BaseButton color="primary">重試</BaseButton>
    </template>
  </BaseResult>
</template>
```

**結果彈窗（塞進 BaseModal）**

```vue
<template>
  <BaseModal v-model="open">
    <BaseResult status="success" title="您已駁回該筆融資案件">
      <template #actions>
        <BaseButton variant="outline" color="neutral" @click="open = false">關閉</BaseButton>
      </template>
    </BaseResult>
  </BaseModal>
</template>
```

> Modal 的右上 ✕、遮罩點擊、Esc、focus trap 由 BaseModal 提供；BaseResult 只負責置中狀態內容。**不要**同時在 Result 內和 Modal 上各放一個關閉入口以外的重複動作。

---

## 4. 行為與狀態

- **條件渲染**：`icon`（含 `#icon`）、`title`/`#title`、`description`/`#description`、`#default`、`#actions` 各自只在提供時渲染，不留空白區塊。
- **內建圖示**：依 `status` 畫「實心 accent 圓 + 白色字符」的內聯 SVG（不依賴 icon library），尺寸走 `--result-icon-size`、隨 token 縮放清晰。
- **置中排版**：`flex column` + `align-items:center` + `text-align:center`，各區塊間距走 `--result-gap`。
- **與 Modal 組合**：Result 不含遮罩 / ✕ / 開關邏輯，交給 Modal；這讓同一個 Result 也能直接用在整頁結果（成功頁 / 404）。

---

## 5. A11y

- **圖示為裝飾性**：內建 SVG 標 `aria-hidden="true"`，狀態語意由**標題文字**承載（顏色不獨自承載資訊）。
- **不自帶 live region**：Result 常放在 Modal 內（Modal 已管理 focus / 對話框語意），故不加 `role="alert"`，避免與 Modal 重複朗讀。若需要在頁面上「動態出現即朗讀」的即時狀態，改用 [`BaseAlert`](./BaseAlert.md)（行內）或 [`BaseToast`](./BaseToast.md)（浮層）。
- **標題階層**：標題以 `<p>` 呈現、不寫死 heading 階層；若此 Result 是頁面主要結果，可用 `#title` slot 放入正確層級的 heading，或由外層 Modal 以 `aria-labelledby` 指向。
- **動作可達**：`#actions` 放真正的 `<BaseButton>` / `<BaseLink>`，鍵盤與 SR 皆可操作。

---

## 6. 與 BaseAlert / BaseToast 的分工

| | BaseResult | BaseAlert | BaseToast |
|---|---|---|---|
| 型態 | **整頁 / 彈窗的置中結果**（大圖示 + 標題 + 動作） | 行內狀態訊息條 | 浮層短暫通知 |
| 觸發 | 宣告式，操作完成後呈現 | 宣告式，常駐 | 命令式，自動消失 |
| 典型場景 | 送出成功頁、錯誤彈窗、404 | 表單錯誤摘要、頁面公告 | 「已儲存」即時回饋 |

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | Result 與 Modal **解耦** | Result 專注「狀態內容」，可同時用於彈窗與整頁結果；彈窗行為交給既有的 Modal，不重造 |
| 2 | 內建狀態 SVG（非 icon library） | 對齊 design-spec「不依賴 icon library」；狀態圓標是元件語意的一部分，自繪最穩定，仍可用 `#icon` 覆寫 |
| 3 | 標題用 `<p>`、不寫死 heading | 由 caller 決定階層（`#title` slot / Modal `aria-labelledby`），避免跳階 |
| 4 | 狀態色對齊 Badge/Spinner 亮色集 | 大圓標用飽和亮色辨識度最好，且與庫內指示型元件一致 |
| 5 | `status` 用 `error`（非語意色的 `danger`） | `status` 是「結果狀態」軸（`success`/`info`/`warning`/`error`），對齊 `BaseToast` 的 `type` 與 Ant Design Result 慣例；與元件庫 `color` 屬性的 `danger` 是不同概念 —— 從 Badge/Button 切過來時注意此命名差異 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseResult.spec.ts`（`status` modifier 與預設、title/description prop 與 `#title`/`#description` slot 覆寫、icon 預設/關閉/自訂 slot、`#default`/`#actions` 條件渲染）— 9 cases
- [x] **Storybook**：`stories/components/atoms/BaseResult.stories.ts`（Playground / Statuses / WithActions / InModal / CustomIcon / Themed）
