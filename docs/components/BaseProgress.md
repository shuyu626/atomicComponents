# Progress 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseProgress.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseProgress 是 **進度指示** 元件：呈現任務完成度（檔案上傳、表單步驟、載入進度）。支援 `linear`（橫條）與 `circular`（環形）兩種型態（`type`），可顯示確定百分比（determinate）或未知進度的持續動畫（indeterminate），並可選配百分比 / 原始值指示文字。

純展示元件，無 emit、無 v-model。顏色 / 粗細 / 尺寸 / 圓角全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicProgress`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicProgress.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `type` | `'linear' \| 'circular'` | `'linear'` | 型態：橫條 / 環形 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'primary'` | 語意色，作為 `--progress-color`（填充色）的預設來源 |
| `indeterminate` | `boolean` | `false` | 進度未知時的持續動畫；開啟後 `value` / `indicator` 失效 |
| `value` | `number \| \`${number}\`` | `0` | 當前進度值 |
| `max` | `number \| \`${number}\`` | `100` | 進度最大值（`value` 相對於此換算百分比） |
| `thickness` | `number \| \`${number}\`` | `8` | 軌道粗細（px）。linear 為條高、circular 為圈線寬 |
| `size` | `number \| \`${number}\`` | `64` | 環形尺寸（px）；僅 `circular` 生效 |
| `indicator` | `boolean \| 'percentage' \| 'value'` | `false` | 指示文字：`true` / `'percentage'` 顯示百分比、`'value'` 顯示原始值 |

> **無 Emits**：純展示元件，狀態由父層 `value` 驅動。

**Slots**

| Slot | Scoped props | 說明 |
|---|---|---|
| `#default` | `{ percentage: number, value: number }` | 自訂指示文字內容，取代 `indicator` 預設輸出；`percentage` 為取整後百分比、`value` 為原始值 |

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--progress-color` | `#3b82f6`（= primary） | 填充色 / 環形弧線色 |
| `--progress-rail-color` | `#f1f1f1` | 未完成軌道底色 |
| `--progress-thickness` | `8px` | 軌道粗細（由 `thickness` prop 注入，亦可 token 覆寫） |
| `--progress-radius` | `99999px` | linear 軌道圓角（預設膠囊狀，設 `0` 為直角） |
| `--progress-gap` | `12px` | linear 條與指示文字間距 |
| `--progress-indicator-color` | `inherit` | 指示文字顏色 |
| `--progress-indicator-font-size` | `1.25rem` | 環形置中指示文字字級 |

語意色 preset（`color` prop 選用，皆對齊 Base* 色彩家族）：`primary #3b82f6`、`success #22c55e`、`warning #f59e0b`、`danger #ef4444`、`info #06b6d4`、`neutral #6b7280`。

> **單一 accent 顏色模型**：填充色與環形弧線色皆吃 `--progress-color`；傳語意 `color` 走 preset class、要完全自訂則覆寫 `--progress-color` token。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <!-- 自訂為紫色直角進度條 -->
  <BaseProgress
    :value="40"
    class="brand-progress"
  />
</template>

<style scoped>
.brand-progress {
  --progress-color: #8b5cf6;
  --progress-radius: 0;
}
</style>
```

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'

const uploaded = ref(40)
</script>

<template>
  <!-- 線形 + 百分比指示 -->
  <BaseProgress
    :value="uploaded"
    indicator
  />

  <!-- 環形 + 自訂尺寸 / 粗細 -->
  <BaseProgress
    type="circular"
    color="success"
    :value="uploaded"
    :size="80"
    :thickness="6"
    indicator
  />

  <!-- 顯示原始值（搭配 max） -->
  <BaseProgress
    :value="3"
    :max="5"
    indicator="value"
  />

  <!-- 進度未知：持續動畫 -->
  <BaseProgress indeterminate />
  <BaseProgress
    type="circular"
    indeterminate
  />

  <!-- 自訂指示文字（scoped slot） -->
  <BaseProgress
    type="circular"
    :value="uploaded"
  >
    <template #default="{ percentage }">
      {{ percentage }}<small>%</small>
    </template>
  </BaseProgress>
</template>
```

---

## 4. 行為與狀態

- **百分比換算**：`percentage = clamp((value / max) × 100, 0, 100)`。`value` 超出 `[0, max]` 自動夾在邊界；`max <= 0` 或非數值時退回 `0`（不會出現 `Infinity` / `NaN`）。
- **幾何 vs 顯示**：弧長 / 平移用未取整的百分比計算（平滑），指示文字另取整數（`Math.round`）顯示。
- **determinate 過渡**：linear 以 `transform: translateX()` 推進、circular 以 `stroke-dasharray` 變化，皆有 `0.3s` 過渡，`value` 改變時平滑動畫。
- **indeterminate**：忽略 `value`，不顯示指示文字。linear 為來回掃動、circular 為整圈旋轉。
- **reduced-motion**：使用者開啟「減少動態效果」時，過渡與 indeterminate 動畫一律關閉（環形 / 橫條以靜態弧 / 滿軌呈現「處理中」語意）。

---

## 5. A11y

- 根節點為 `role="progressbar"`，並提供 `aria-valuemin="0"`、`aria-valuemax`（= `max`）、`aria-valuenow`（= `value`，夾在 `[0, max]`）。
- 額外提供 `aria-valuetext`（= `"<百分比>%"`），讓螢幕閱讀器播報「百分之幾」而非原始數字。
- `indeterminate` 時刻意省略 `aria-valuenow` / `aria-valuetext`，以「缺值」表示進度未知（ARIA 慣例）。
- 環形 `<svg>` 標記 `aria-hidden="true"`，避免重複播報；語意完全由根節點的 progressbar role 承載。
- 建議使用端視情境補上 `aria-label` / `aria-labelledby`（如「檔案上傳進度」），讓 SR 知道這條進度條代表什麼。

---

## 6. 對參考實作的修正與優化

| 項目 | 參考實作 | 本元件 |
|---|---|---|
| Prop 命名 | `variants`（複數，語意怪） | `type`（語意明確：型態而非外觀 variant） |
| 型態拼字 | `'liner'`（typo） | `'linear'` |
| 顏色名單 | `secondary` | `info` / `neutral`（對齊 Base* 色彩家族，共 6 色） |
| 顏色來源 | 全域 SCSS `$color-map` + 寫死 `#F1F1F1` / `#1976D2` | scoped `--progress-*` token + `:where()` 低特異性 preset，無全域相依 |
| 百分比換算 | 直接 `value / max`，`max = 0` 會 `Infinity` / `NaN` | 補 `max <= 0` 與 NaN 防呆並 clamp 至 `[0, 100]` |
| 換算邏輯 | 抽到 `usePercentage` composable（僅一處使用） | 內聯為 `computed`（遵循「第二次用到才搬出去」） |
| a11y | `aria-valuenow` 未取整 / 未 clamp、無 `aria-valuetext` | `aria-valuenow` 夾在 `[0, max]`、補 `aria-valuetext`，indeterminate 正確省略數值 |
| 動態效果 | 無 reduced-motion 處理 | 補 `prefers-reduced-motion` 關閉動畫 |
| 指示數字抖動 | 無 | `font-variant-numeric: tabular-nums` 等寬數字，跳動不位移 |

---

## 7. 測試與 Storybook

- **測試**（`tests/components/atoms/BaseProgress.spec.ts`，30 cases）涵蓋：
  - 結構：linear rail/track vs circular `<svg>` 雙圈；`value = 0` 時不渲染環形 track。
  - modifier class：`type` / `color`（含 `neutral`）/ `indeterminate`。
  - a11y：`role="progressbar"`、`aria-valuemin/max/now/valuetext`；`aria-valuenow` 夾在 `[0, max]`（超出、負值、`max <= 0`）；indeterminate 時省略 `now`/`valuetext`；svg `aria-hidden`。
  - 百分比換算與 clamp（`value > max`、`value < 0`、`max <= 0`、數字字串）。
  - `indicator` 三種值（`true` / `'percentage'` / `'value'`）輸出與取整、circular 指示 class。
  - default scoped slot 收到正確 `percentage` / `value`；indeterminate 時不渲染。
  - inline style token 注入（`--progress-thickness` / `--progress-size`）。
- **Storybook**（`stories/components/atoms/BaseProgress.stories.ts`）：Playground、Variants、Colors、Indicators、CircularSizes、Indeterminate、Live（模擬載入）、Themed（token 客製化）。
