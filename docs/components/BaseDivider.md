# Divider 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseDivider.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseDivider 是 **分隔線** 元件：在內容之間畫出一條語意化的分隔。支援水平 / 垂直方向、`solid` / `dashed` / `dotted` 三種線型（`lineStyle`），並可選配中央文字（如「或」「OR」分段標題）。

兩種型態自動切換：

- **純線** — 未提供 `#default` slot 時渲染原生 `<hr>`（本身即帶 `separator` 角色）。
- **帶文字** — 提供 `#default` slot 時渲染 `<div role="separator">`，兩段線夾住中央內容。

顏色 / 粗細 / 間距全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicDivider`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicDivider.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 方向：水平分隔上下內容 / 垂直分隔左右內容 |
| `lineStyle` | `'solid' \| 'dashed' \| 'dotted'` | `'solid'` | 線型（對應 CSS `border-style`） |
| `textAlign` | `'start' \| 'center' \| 'end'` | `'center'` | 文字位置；僅在提供 `#default` slot 時生效 |
| `decorative` | `boolean` | `false` | 是否為純裝飾性分隔線。`true` 時對輔助技術隱形（`role="none"`），適合純視覺裝飾、內容本身已能表達分隔關係的情境；`false` 保留語義化 `separator` 角色，用於確實分隔有意義內容區塊（例如區隔段落、選單分組）的情境 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 分隔線中央的文字 / 內容；提供時改渲染帶文字的分隔線（`<div role="separator">`），否則渲染純線 `<hr>` |

本元件純展示，無 emits。

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--divider-color` | `#e5e7eb`（gray-200） | 線段顏色 |
| `--divider-thickness` | `1px` | 線粗 |
| `--divider-text-color` | `#6b7280`（gray-500） | 帶文字時的內容色 |
| `--divider-text-gap` | `0.75rem` | 文字與線段之間的間距 |
| `--divider-spacing` | `0` | 分隔線外距（horizontal 走 `margin-block`、vertical 走 `margin-inline`） |
| `--divider-vertical-length` | `1em` | 垂直線的**最小**長度（fallback）；於 flex row 容器中高度維持 `auto`，由 `align-self: stretch` 撐到與兄弟元素同高，非 flex 情境則退回此長度 |

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseDivider class="brand-divider" />
</template>

<style scoped>
.brand-divider {
  --divider-color: #8b5cf6;
  --divider-thickness: 2px;
  --divider-spacing: 1rem;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 純水平線 -->
  <BaseDivider />

  <!-- 線型 -->
  <BaseDivider line-style="dashed" />
  <BaseDivider line-style="dotted" />

  <!-- 帶文字（置中 / 靠左 / 靠右） -->
  <BaseDivider>或</BaseDivider>
  <BaseDivider text-align="start">最新消息</BaseDivider>
  <BaseDivider text-align="end">更多</BaseDivider>

  <!-- 垂直分隔（需放在有高度的 flex 容器中） -->
  <div style="display: flex; align-items: center; height: 24px;">
    <span>首頁</span>
    <BaseDivider orientation="vertical" />
    <span>關於</span>
    <BaseDivider orientation="vertical" />
    <span>聯絡</span>
  </div>

  <!-- 純裝飾分隔線：不承載語義，對輔助技術隱形（role="none"） -->
  <BaseDivider decorative />
</template>
```

---

## 4. 行為與狀態

- **型態自動切換**：有 `#default` slot → 帶文字的 `<div role="separator">`；無 → 純線 `<hr>`。
- **文字對齊**：兩段線皆為 `flex: 1 1 0%`（`flex-basis: 0`），靠 **flex-grow 比例**分配「扣掉文字後」的剩餘空間；`textAlign` 調整兩側 grow 比例 —— `start` 為 `1 : 9`（起點側線短）、`center` 為 `1 : 1`（置中）、`end` 為 `9 : 1`（終點側線短）。僅在帶文字時有意義。
- **垂直方向**：高度維持 `auto` + `align-self: stretch`，因此放進 `display: flex` 的橫向容器時會自動撐到與兄弟元素同高；`--divider-vertical-length`（預設 `1em`）作為 `min-height` fallback，在非 flex 或無高度情境下保底顯示。
  > ⚠️ 寫死 `height` 會讓 `align-self: stretch` 失效（stretch 僅在交叉軸尺寸為 `auto` 時生效），因此此處刻意用 `min-height` 而非 `height`。
- **超長文字**：帶文字版的 `#default` 內容為單行不換行（`white-space: nowrap`），過長會水平溢出而非截斷 —— 分隔標籤建議維持精簡。
- **線型**：`lineStyle` 對應 `border-style`，`solid` / `dashed` / `dotted` 共用同一套 token，無分支。

---

## 5. A11y

- 純線使用原生 `<hr>`，本身即帶 `separator` 角色；垂直方向補 `aria-orientation="vertical"`（`<hr>` 預設為 `horizontal`）。
- 帶文字版本使用 `<div role="separator" :aria-orientation>`，文字會被螢幕閱讀器朗讀，作為區段標籤。
- 預設 `--divider-color` 為淡灰中性線；若調深 / 調淺請自行確認與背景的對比足夠（分隔線非文字，無嚴格 WCAG 對比門檻，但過淡會難以辨識）。
- **`decorative`**：純視覺裝飾、不承載語義的分隔線（例如卡片內部的裝飾線），設 `decorative` 可對輔助技術隱形，避免大量裝飾用分隔線在螢幕閱讀器中產生 separator 噪音：
  - 純線 `<hr>` 顯式補 `role="none"`，覆蓋原生隱含的 separator 語意（`aria-orientation` 維持不變，因無 accessible node 而不會被朗讀）。
  - 帶文字 `<div>` 改為 `role="none"` 並省略 `aria-orientation`。
  - 預設 `false`，維持既有語義化行為；僅在分隔線本身不帶有意義的區段資訊時才設為 `true`。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 全域 `<style>` + 寫死 `lightslategray` | 樣式洩漏到全域；顏色無法主題化 | `scoped` + 自包含 `--divider-*` token，覆寫即可改色 / 粗細 / 間距 |
| 2 | 垂直 `<hr>` 用 `height: auto` | 純 border 的 `<hr>` 在 `height: auto` 下實際高度為 0，**完全不顯示** | 改吃 `--divider-vertical-length` 預設長度，並 `align-self: stretch` 於 flex 容器中自動撐高 |
| 3 | `::before` / `::after` 用 `width: var(--size, 50%)` 控制線長 | `display: block` 的偽元素以百分比寬搭配 `justify-content: center`，線段佔比與置中邏輯耦合、不易預測；兩側 50% + 50% 已達 100%，再加文字會溢出、把文字擠到 0 寬而換行 | 改用 flex `flex: 1 1 0%`（`flex-basis: 0` + 等比 grow 填滿「扣掉文字」後的剩餘空間），線段佔比由 **flex-grow 比例**決定（`start` 1:9、`center` 1:1、`end` 9:1），置中 / start / end 邏輯清晰 |
| 4 | 僅 `solid` 單一線型 | 無法畫虛線 / 點線分隔 | 新增 `lineStyle`（`solid` / `dashed` / `dotted`），對應 `border-style` |
| 5 | 無外距控制 | 使用端需自行包一層加 margin | 新增 `--divider-spacing` token（horizontal 走 `margin-block`、vertical 走 `margin-inline`） |
| 6 | `defineSlots()` 無型別 | slot 無型別提示 | `defineSlots<BaseDividerSlots>()` 明確標註 |
| 7 | 文字色繼承預設黑字 | 帶文字分隔的標籤通常為次要資訊 | 新增 `--divider-text-color`（預設 gray-500 次要色），可覆寫 |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseDivider.spec.ts`（純線渲染 `<hr>`、帶文字渲染 `<div role="separator">`、slot 內容、`orientation` / `lineStyle` / `textAlign` modifier class、`aria-orientation`、`decorative` 對兩分支 role / aria-orientation 的影響）— 14 cases
- [x] **Storybook**：`stories/components/atoms/BaseDivider.stories.ts`（Playground / Basic / Variants / WithText / Vertical / Themed）
