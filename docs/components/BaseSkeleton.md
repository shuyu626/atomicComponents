# Skeleton 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseSkeleton.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseSkeleton 是 **載入佔位骨架**：在資料尚未到位前，用形狀相符的靜態色塊佔用「未來內容」的版位，避免內容到位瞬間 layout shift / 版面跳動。與不確定型的 [BaseSpinner](./BaseSpinner.md) 互補（Spinner 表達「處理中」、Skeleton 表達「這裡即將出現什麼」，見 §6）。

支援 `text` / `circular` / `rectangular` / `rounded` 四種形狀與 `pulse` / `wave` / `none` 三種動畫。`loading=false` 時只渲染 default slot（無 wrapper 元素），不影響版面。顏色 / 圓角 / 速度全走 CSS token，可跨專案主題化。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `variant` | `'text' \| 'circular' \| 'rectangular' \| 'rounded'` | `'text'` | 形狀：`text`（1em 文字列）/ `circular`（圓）/ `rectangular`（直角矩形）/ `rounded`（圓角矩形） |
| `width` | `string \| number` | *（無）* | 寬度；數字補 px，字串原樣使用。未指定時走 token 預設 `100%` |
| `height` | `string \| number` | *（無）* | 高度；數字補 px，字串原樣使用。未指定時走 token 預設 `1em`（跟隨字級，`text` 之外的形狀建議自行指定） |
| `animation` | `'pulse' \| 'wave' \| 'none'` | `'pulse'` | 動畫：`pulse`（透明度脈動）/ `wave`（掃光）/ `none`（靜態） |
| `loading` | `boolean` | `true` | 載入中；`false` 時直接渲染 default slot（無 wrapper） |

> **無 Emits**：純展示元件，無互動狀態。

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 載入完成後的實際內容；`loading=false` 時原樣渲染（無包覆元素） |

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--skeleton-color` | `#e5e7eb`（gray-200） | 骨架基底色 |
| `--skeleton-highlight` | `rgba(255, 255, 255, 0.6)` | `wave` 動畫的掃光色 |
| `--skeleton-radius` | `6px` | `rounded` 形狀的圓角（`text` 取其 2/3；`circular` 恆 `50%`；`rectangular` 恆 `0`，不受此 token 影響） |
| `--skeleton-speed` | `1.6s` | `pulse` / `wave` 動畫週期 |
| `--skeleton-width` | `100%` | 寬度；由 `width` prop 覆寫（inline style），未傳時吃此預設 |
| `--skeleton-height` | `1em` | 高度；由 `height` prop 覆寫（inline style），未傳時吃此預設 |

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。`width` / `height` prop 走 inline style（優先權高於 `:where()` 預設，但仍低於使用端在 class 上寫 `!important` 以外的正常覆寫情境不受影響）。

```vue
<template>
  <BaseSkeleton class="brand-skeleton" variant="rounded" :width="240" :height="120" />
</template>

<style scoped>
.brand-skeleton {
  --skeleton-color: #1f2937;
  --skeleton-speed: 1s;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 單顆：預設 text（1em 文字列） -->
  <BaseSkeleton />

  <!-- 頭像佔位 -->
  <BaseSkeleton variant="circular" :width="48" :height="48" />

  <!-- 圖片 / 卡片佔位 -->
  <BaseSkeleton variant="rounded" width="100%" :height="160" />
  <BaseSkeleton variant="rectangular" width="100%" :height="160" />

  <!-- 多行文字組合：使用端疊多顆 text，末行縮短模擬自然斷行 -->
  <div style="display:flex;flex-direction:column;gap:8px">
    <BaseSkeleton variant="text" width="100%" />
    <BaseSkeleton variant="text" width="100%" />
    <BaseSkeleton variant="text" width="60%" />
  </div>

  <!-- loading 包內容：資料到位後自動切換為實際內容，無 wrapper -->
  <BaseSkeleton :loading="isLoading" variant="rounded" :width="200" :height="120">
    <img src="/cover.jpg" alt="封面圖" width="200" height="120" />
  </BaseSkeleton>

  <!-- 動畫切換 -->
  <BaseSkeleton animation="wave" />
  <BaseSkeleton animation="none" />
</template>
```

---

## 4. 行為與狀態

- **形狀**：`text` / `circular` / `rectangular` / `rounded` 四選一，決定 `border-radius` 推導方式（見 §2）。
- **尺寸**：`width` / `height` 未傳時走 `--skeleton-width: 100%` / `--skeleton-height: 1em` 預設；傳入時經 `toUnit` 轉換注入同名 inline CSS 變數（數字補 `px`、字串原樣使用），沿用 `BaseSpinner` 數字尺寸的做法。
- **動畫**：`pulse`（預設）以 `opacity` 脈動；`wave` 用 `::after` 疊一道線性漸層並 `translateX` 掃過（不觸發 layout/paint 抖動，`overflow: hidden` 裁切）；`none` 為靜態色塊。
- **loading 切換**：`loading=true`（預設）渲染骨架 `<div class="base-skeleton base-skeleton--{variant} base-skeleton--{animation}">`；`loading=false` **只渲染 default slot**，不留任何 wrapper 元素，不影響版面；無 slot 時什麼都不渲染。
- **多行文字**：atom 不內建 rows / 行數 preset，由使用端疊多顆 `variant="text"` 自行組合（見 §3 範例），保留最大排版彈性。

---

## 5. A11y

- **骨架本體 `aria-hidden="true"`**：骨架是純視覺裝飾（不代表真實內容語意），不應曝光給輔助科技；螢幕閱讀器會直接跳過。
- **`aria-busy` 由使用端在容器層表達**：Skeleton 本身不擁有 `role` / `aria-busy`，載入語意需由使用端在外層容器標註，讀屏軟體才知道該區塊正在載入中，完成後記得移除：

  ```vue
  <template>
    <section :aria-busy="isLoading ? 'true' : undefined">
      <BaseSkeleton :loading="isLoading" variant="text" width="100%">
        <h2>{{ article.title }}</h2>
      </BaseSkeleton>
    </section>
  </template>
  ```

- **reduced-motion**：`pulse` / `wave` 皆非表達關鍵語意的 essential motion（骨架本身的形狀 + 版位已足夠傳達「這裡即將出現內容」），因此 `prefers-reduced-motion: reduce` 下**直接停用動畫**、退回靜態色塊，與 `BaseSpinner`「放慢而非停止」的取捨不同（Spinner 的旋轉是「處理中」語意的核心，停止會失去意義；Skeleton 停止動畫不影響語意）。

---

## 6. 與 BaseSpinner 的分工

BaseSkeleton 與 BaseSpinner 都用於「內容尚未就緒」的等待情境，但**適用時機、資訊量**不同：

| 面向 | **BaseSkeleton**（本元件） | **BaseSpinner** |
|---|---|---|
| 適用時機 | **首次載入**：內容形狀 / 版位已知，只是資料還沒到位 | **行為中 / 操作中**：按鈕送出、局部重新整理等短暫等待 |
| 傳達的資訊 | 內容的**形狀與大致排版**（模擬最終版面） | 純粹「系統忙碌中」，無形狀語意 |
| 版面影響 | 佔滿即將出現的版位，內容到位後**無縫接軌**、不跳版 | 通常較小、置中或嵌入按鈕 / 文字內 |
| 典型場景 | 頁面首載的卡片 / 列表 / 頭像 / 圖片佔位 | 按鈕 loading、局部資料重新整理、無法預知內容形狀的等待 |

**選用原則**：已經知道「這裡會出現什麼形狀的內容」（卡片、頭像、文字列）→ **Skeleton**，讓使用者提前感知版面、降低到位瞬間的視覺跳動；只需要傳達「正在處理，稍候」且無明確形狀（按鈕送出中、局部刷新）→ **Spinner**。兩者可並存：例如頁面首載用 Skeleton 佔位，其中的「重新整理」按鈕用 Spinner 表達操作中。

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | 形狀走 `variant` 四選一（`text` 預設），不開 `rows` / 行數 prop | 多行文字組合情境多樣（寬度遞減、對齊方式各異），交給使用端疊多顆 `text` 更彈性；atom 保持單一職責 |
| 2 | `width` / `height` 數字 / 字串雙軌，經 `toUnit` 注入 inline CSS 變數 | 沿用 `BaseSpinner` 數字尺寸的既有寫法，全庫尺寸類 prop API 一致 |
| 3 | `loading=false` 時無 wrapper，直接渲染 slot | 避免多一層 DOM 影響使用端的 CSS selector / flex/grid 版面；「取代」語意透過 `v-if` / `v-else` 表達，而非顯示/隱藏 |
| 4 | 動畫三選一（`pulse` / `wave` / `none`），皆走 token 控制速度 | `pulse` 最通用、`wave` 更精緻但成本略高（多一層 `::after`）、`none` 給效能敏感或設計偏好靜態場景 |
| 5 | reduced-motion 下完全停用動畫（非放慢） | 骨架動畫是裝飾性提示而非 essential motion，與 `BaseSpinner` 的旋轉語意不同，可直接關閉且不損失資訊 |
| 6 | `aria-busy` 交由使用端在容器層設定，元件本身只做 `aria-hidden` | Skeleton 只是「一顆裝飾用色塊」，不知道自己所在容器的語意邊界；容器層的 `aria-busy` 由使用端在明確知道邊界時設定最準確 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseSkeleton.spec.ts`（variant 預設與四形狀 modifier、`width` / `height` 數字補 px 與字串原樣注入 CSS 變數、未傳時不注入、animation 預設與三選一 modifier、`loading=true` 渲染骨架且隱藏 slot 內容、`loading=false` 渲染 slot 且無 wrapper、`loading=false` 無 slot 時不渲染任何內容、`aria-hidden="true"`、無 `role`）— 17 cases
- [x] **Storybook**：`stories/components/atoms/BaseSkeleton.stories.ts`（Playground / Variants / Animations / TextLines / WithContent / Themed）
