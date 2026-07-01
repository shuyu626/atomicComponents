# Spinner 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseSpinner.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseSpinner 是 **不確定型載入指示**：以持續旋轉的圓環表達「處理中、無確定進度」。與 `BaseProgress` 的差異在於 spinner **沒有百分比 / 完成度**語意，純粹告訴使用者「系統正在忙」——適合放在按鈕、卡片、表格、頁面區塊等等待點。

純展示元件，無 emit、無 v-model、無 slot。尺寸 / 顏色 / 粗細 / 速度全走 CSS token，可跨專案主題化。顏色預設吃 `currentColor`，放進按鈕 / 文字即自動繼承色。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg' \| \`${number}\` \| number` | `'md'` | 具名尺寸走 token（`sm` 16 / `md` 24 / `lg` 40 px）；數字 / 數字字串走自訂像素 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | *（無）* | **可選** 語意色。未指定時吃 `currentColor`（繼承父層文字色）；指定時走該語意色 preset |
| `label` | `string` | `'載入中'` | 無障礙標籤（`role="status"` 的 `aria-label`），i18n 覆寫點 |

> **無 Emits / Slots**：純展示元件，無互動狀態。

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--spinner-size` | `24px`（= md） | 環的外徑；具名尺寸由 modifier 提供、數字尺寸由 inline style 注入 |
| `--spinner-color` | `currentColor` | accent 弧線色（頂端那段）；未指定 `color` 時繼承文字色 |
| `--spinner-track-color` | `color-mix(in srgb, var(--spinner-color) 25%, transparent)` | 整圈軌道底色（accent 色的淡化版） |
| `--spinner-thickness` | `3px`（`sm` 2 / `lg` 4） | 環線寬（px）。**不做 prop**，一律走 token |
| `--spinner-speed` | `0.6s` | 旋轉一圈所需秒數 |

語意色 preset（`color` prop 選用，皆對齊 Base* 色彩家族）：`primary #3b82f6`、`success #22c55e`、`warning #f59e0b`、`danger #ef4444`、`info #06b6d4`、`neutral #6b7280`。

> **粗細只走 token（不開 prop）**：thickness 是低頻調整、且與 size 高度相關（具名尺寸已內建協調的線寬比例），為避免 API 膨脹刻意不開 prop，需要時覆寫 `--spinner-thickness` 即可。**自訂數字尺寸時建議一併覆寫 thickness**（數字尺寸沿用預設 3px，大尺寸會顯得偏細）。
>
> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseSpinner :size="48" class="brand-spinner" />
</template>

<style scoped>
.brand-spinner {
  --spinner-color: #8b5cf6;
  --spinner-thickness: 6px;
  --spinner-speed: 1.2s;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 最簡：md、繼承文字色、預設 label「載入中」 -->
  <BaseSpinner />

  <!-- 具名尺寸 -->
  <BaseSpinner size="sm" />
  <BaseSpinner size="lg" />

  <!-- 自訂像素尺寸 -->
  <BaseSpinner :size="64" />

  <!-- 語意色 -->
  <BaseSpinner color="primary" />
  <BaseSpinner color="danger" />

  <!-- 放在按鈕內：不指定 color → 繼承按鈕文字色 -->
  <button disabled style="display:inline-flex;align-items:center;gap:8px;color:#fff;background:#2563eb">
    <BaseSpinner size="sm" /> 送出中
  </button>

  <!-- 情境化 / i18n 無障礙標籤 -->
  <BaseSpinner :label="t('common.loading')" />
</template>
```

---

## 4. 行為與狀態

- **不確定型**：spinner 只有「忙碌中」語意、無完成度。若有明確百分比 / 進度，請改用 `BaseProgress`（determinate）。
- **顏色繼承**：未指定 `color` 時 `--spinner-color` 為 `currentColor`，spinner 隨父層文字色走；軌道底色預設是 accent 色的 25% 淡化版，維持單色協調。指定 `color` 走語意色 preset，要完全自訂則覆寫 `--spinner-color`。
- **尺寸兩軌**：具名尺寸（`sm`/`md`/`lg`）由 modifier class 提供 `--spinner-size` 與協調的 `--spinner-thickness`；數字 / 數字字串由 inline style 注入 `--spinner-size`（thickness 沿用預設，必要時覆寫）。
- **reduced-motion**：見 §5。

---

## 5. A11y

- 根節點為 `role="status"`（live region）並帶 `aria-label="{label}"`，供螢幕閱讀器讀出「載入中」語意（對齊 BaseProgress 的 aria-only 做法，不另放重複的 sr-only 文字以免雙重命名）。
- 旋轉環本身是純視覺，標記 `aria-hidden="true"`，不重複朗讀。
- **`label` 是 i18n 覆寫點**：多語系情境請傳入翻譯後字串（如 `:label="t('common.loading')"`），或依情境給更具體描述（「正在載入報表」）。
- **essential motion（刻意保留動畫）**：旋轉是本元件表達「載入中」的**核心語意**，若在 `prefers-reduced-motion: reduce` 下整個停轉，畫面會變成一個靜止的環、失去「系統正在忙」的訊息。因此本元件在減少動態偏好下**不停轉，改把旋轉放慢 3×**（`--spinner-speed × 3`），在保留載入語意的同時大幅降低前庭不適。這是與純裝飾動畫（可直接關閉）不同的取捨。
- **搭配載入區塊**：若 spinner 用於「取代一整塊尚未載入的內容」，建議在該容器加 `aria-busy="true"`，載入完成移除；spinner 只表達 busy 狀態、不負責容器語意。

---

## 6. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | `color` 可選、預設 `currentColor` | Spinner 最常見情境是嵌在按鈕 / 連結 / 文字內，繼承色最省事；需要語意色再明示 `color` |
| 2 | `thickness` 只走 token、不開 prop | 低頻調整且與 size 相關；具名尺寸已內建協調線寬，避免 API 膨脹（對齊「一個 prop 控一件事、罕用軸走 token」） |
| 3 | `size` 具名 + 數字雙軌（沿用 `BaseAvatar` 寫法） | 具名走 token 保持一致性，數字滿足客製；用 `isNumberish` 分流 |
| 4 | 採 border-based 旋轉環（非 SVG stroke） | px 粗細 / 尺寸直接映射到 border-width / width，`currentColor` 繼承天然成立，無需 viewBox 幾何運算，程式碼更乾淨 |
| 5 | reduced-motion 放慢而非停止 | 旋轉是 essential motion；停止會失去載入語意，放慢兼顧無障礙與語意 |
| 6 | 與 `BaseProgress` 分工 | Spinner = 不確定型（無百分比）；Progress = 確定型 + indeterminate 條 / 環。語意不同、不合併 |

---

## 7. 測試與 Storybook

- **測試**（`tests/components/atoms/BaseSpinner.spec.ts`，14 cases）涵蓋：
  - 結構：root / `__ring` / `__sr` 三節點；ring `aria-hidden`。
  - size：預設 `md` modifier 且無 inline style；具名 `sm`/`lg` modifier；數字 / 數字字串注入 `--spinner-size` 且不加 size modifier。
  - color：未指定時六色 modifier 皆不存在（吃 currentColor）；指定時加對應語意色 modifier（含 `neutral`）。
  - a11y：`role="status"`、`label` → `aria-label`（預設「載入中」與自訂值）。
  - 根 class：恆有 `base-spinner`；size + color modifier 併存。
- **Storybook**（`stories/components/atoms/BaseSpinner.stories.ts`）：Playground / Sizes / Colors / InheritColor（放進有色文字 + 按鈕）/ CustomLabel / Themed（token 客製化）。
