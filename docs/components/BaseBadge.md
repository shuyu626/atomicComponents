# Badge 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseBadge.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/utils/isNumberish.ts`（數值守衛）、`app/utils/isNullOrUndefined.ts`（空值守衛）。

BaseBadge 是 **徽章** 元件：把數字計數或純紅點（dot）疊在錨點（icon / 按鈕 / 頭像…）的角落。數字超過 `max` 會收斂成 `${max}+`；內容為 `0` 時預設隱藏（可用 `showZero` 強制顯示）。

純展示元件（無 emit、無 v-model），顏色 / 尺寸全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicBadge`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicBadge.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `content` | `string \| number \| null` | — | 徽章內容；數字會套 `max` 收斂，文字原樣顯示。不給且無 `#content` slot 時渲染空徽章 / 紅點 |
| `overlap` | `'circular' \| 'rectangular'` | `'circular'` | 錨點外形 → 角落內縮量。圓形錨點（頭像）用 `circular` 內縮；方形錨點（卡片 / icon）用 `rectangular` 貼齊角落 |
| `max` | `` number \| `${number}` `` | `99` | 數字內容上限；超過顯示 `${max}+`。非數字內容不受影響 |
| `placement` | `'top-left' \| 'top-right' \| 'bottom-left' \| 'bottom-right'` | `'top-right'` | 相對錨點的定位角落 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸：一般徽章控制色塊大小；`dot` 模式下控制紅點大小 |
| `dot` | `boolean` | `false` | 純紅點模式：為 `true` 時只渲染存在感紅點、不顯示任何內容（`content` / `#content` 皆忽略），點大小仍由 `size` 控制 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'danger'` | 語意色：作為 `--badge-bg` 的預設來源。要完全自訂顏色請覆寫 `--badge-bg` |
| `showZero` | `boolean` | `false` | 內容為數字 `0` 時是否仍顯示 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 錨點元素（被標記的目標） |
| `#content` | 自訂徽章內容，取代 `content` 的文字渲染；`dot` 為 `true` 時不渲染 |

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--badge-bg` | —（退回語意色 preset） | **背景色覆寫鉤子**：設了就吃這個值，覆寫語意色 |
| `--badge-color` | `#fff` | 文字（數字）顏色 |
| `--badge-font-size` | `0.75rem` | 內容字級 |

語意色 preset（`color` prop 選用，可被 `--badge-bg` 覆寫）：`primary #3b82f6`、`success #22c55e`、`warning #f59e0b`、`danger #ef4444`、`info #06b6d4`、`neutral #6b7280`。

> 背景採 fallback chain：`background: var(--badge-bg, var(--_badge-preset-bg))`。傳 `color` prop 走語意 preset；覆寫 `--badge-bg` 則完全自訂——兩條路並存。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseBadge :content="8" class="brand-badge">
    <BellIcon />
  </BaseBadge>
</template>

<style scoped>
.brand-badge {
  --badge-bg: #8b5cf6;
  --badge-color: #fff;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 數字徽章 -->
  <BaseBadge :content="5">
    <BellIcon />
  </BaseBadge>

  <!-- 超過 max → 99+ -->
  <BaseBadge :content="120" :max="99">
    <BellIcon />
  </BaseBadge>

  <!-- 純紅點（存在感提示，不顯示數字）；點大小由 size 控制 -->
  <BaseBadge dot color="success">
    <Avatar />
  </BaseBadge>

  <!-- 較大的紅點 -->
  <BaseBadge dot size="lg" color="neutral">
    <Avatar />
  </BaseBadge>

  <!-- 方形錨點貼齊角落 + 改定位 -->
  <BaseBadge :content="3" overlap="rectangular" placement="bottom-right">
    <ProductCard />
  </BaseBadge>

  <!-- 強制顯示 0 -->
  <BaseBadge :content="0" show-zero>
    <BellIcon />
  </BaseBadge>

  <!-- 自訂內容 slot -->
  <BaseBadge color="primary">
    <template #content>NEW</template>
    <Card />
  </BaseBadge>
</template>
```

---

## 4. 行為與狀態

- **數字收斂**：`content` 為數字且 `> max` 時顯示 `${max}+`；非數字內容（如 `'NEW'`）不套 `max`、原樣顯示。
- **0 的處理**：`content` 為數字 `0` 且 `showZero=false` → 隱藏（`scale(0)` 收合 + `aria-hidden`）。`null` / `undefined` / 文字**不**算 0，不會被誤判隱藏。
- **空內容收合**：非 `dot` 模式但沒有任何 `content` / `#content` slot 時 → 自動收合（不渲染空色塊圓圈）。
- **dot 模式**：`dot=true` 時永遠不渲染 `content` / `#content`，只當作存在感紅點；**即使無內容也維持顯示**（不受空收合影響）；點大小由 `size`（`sm` / `md` / `lg`）控制。

---

## 5. A11y

- `invisible`（數字 0 隱藏）時補 `aria-hidden`，螢幕閱讀器不會朗讀被收合的徽章內容。
- 徽章內容（如計數）為一般文字節點，SR 會依序朗讀。**icon-only 錨點**建議由使用端給錨點有意義的可及名稱（如按鈕 `aria-label="通知（5 則未讀）"`），讓計數有上下文。
- 根節點 `inheritAttrs` 預設開啟，使用端可直接傳 `aria-label` 等屬性落到 `.base-badge`。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 全域 `<style>` + 依賴全域 SCSS `$color-map` / `%placeholder`（`@extend`） | 樣式洩漏到全域；強綁外部 SCSS map / placeholder，元件無法獨立運作 | `scoped` + 自包含 CSS token，移除對全域 SCSS 的相依，無洩漏 |
| 2 | `invisible` 用 `Number(content) === 0` | `content=null` 時 `Number(null)===0` 為真 → 誤判隱藏（連無內容的 dot 都被吃掉） | 加 `isNumberish` 守衛，只有「真正的數字 0」才隱藏 |
| 3 | `invisible` 只做 `scale(0)` 視覺隱藏 | 元素仍在 a11y tree，螢幕閱讀器仍會朗讀被隱藏的 `0` | invisible 時補 `aria-hidden`，SR 不再朗讀 |
| 4 | 顏色寫死 `color: white` + `$color-map` | 不可主題化、綁死全域色票 | 抽 `--badge-bg`（fallback chain）/ `--badge-color` token，語意色為可覆寫 preset |
| 5 | 尺寸 / 偏移 / 字級寫死 | 不可主題化 | 全抽成 `--badge-*` token，並以 `:where()`（specificity 0）宣告預設，使用端覆寫得動 |
| 6 | 無 reduced-motion 處理 | 對動態敏感使用者仍有 scale 過場 | 加 `@media (prefers-reduced-motion: reduce)` 關閉過場 |
| 7 | 無內容的非 dot 徽章留下空色塊圓圈 | `medium` / `large` 無 `content` 時仍渲染一個空的色圈 | 無內容（且非 dot）時一併收合（`invisible`） |
| 8 | 徽章 `z-index` 易受錨點內部堆疊影響 | 錨點若自建 stacking context 可能蓋住徽章 | wrapper 加 `isolation: isolate` 自成堆疊脈絡；`--badge-offset` 補預設值防呆 |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseBadge.spec.ts`（content 渲染 / `max` 收斂 / `showZero` / 0 隱藏 + `aria-hidden` / null 不誤判 / **空內容收合** / `dot` 模式不渲染內容且維持顯示、size 可控 / placement・overlap・size・color modifier class（含 `sm`・`neutral`）/ `#content` slot）— 23 cases
- [x] **Storybook**：`stories/components/atoms/BaseBadge.stories.ts`（Playground / Numbers / Sizes / Max / Dot / Placements / Colors / Overlap / Themed）
