# Chip 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseChip.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseChip 是 **標籤 / 籌碼** 元件：緊湊呈現分類、狀態、篩選條件或可移除的 token（如 tag input 內的標籤）。支援 `solid` / `outline` / `ghost` / `text` 四種外觀、語意色與任意自訂色，並可選配刪除鈕。

純展示為主、互動僅一個刪除事件（`delete`）。顏色 / 尺寸 / 圓角全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicChip`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicChip.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `as` | `string \| Component` | `'span'` | 根元素標籤或元件（多型）。互動型 chip 可傳 `'a'` / `RouterLink` 等 |
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'text'` | `'ghost'` | 外觀：飽和實心底（白字）/ 外框 / 淡色調底 / 純文字 |
| `color` | `` 'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral' \| (string & {}) `` | `'primary'` | 語意色走預設 token；其餘字串視為自訂 CSS color（hex / rgb / hsl / 具名色） |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 尺寸 |
| `label` | `string` | — | 標籤文字；提供 `#default` slot 時以 slot 為準 |
| `deletable` | `boolean` | `false` | 是否顯示刪除鈕；開啟後點擊 emit `delete` |
| `deleteAriaLabel` | `string` | `'Delete'` | 刪除鈕的無障礙標籤；建議帶 chip 內容，如「移除 Vue 標籤」 |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `delete` | `MouseEvent` | 點擊刪除鈕時觸發 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 標籤主要內容，取代 `label` |
| `#prepend` | 標籤前置內容（icon / 小頭像…） |
| `#append` | 標籤後置內容 |

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--chip-accent` | `#1d4ed8`（= primary） | **色相來源**：solid 實心底、ghost 淡底、outline 邊框、text 文字全由此推導 |
| `--chip-on-accent` | `#fff` | `solid` variant 飽和底上的文字色 |
| `--chip-font-size` | `0.875rem`（sm `0.75rem`、lg `1rem`） | 字級 |
| `--chip-padding-y` / `--chip-padding-x` | `4px` / `8px` | 內距 |
| `--chip-gap` | `4px` | 內容間距 |
| `--chip-radius` | `5px` | 圓角（設 `9999px` 即膠囊狀） |

語意色 preset（`color` prop 選用，皆挑深色調確保淡底上文字 ≥ WCAG AA）：`primary #1d4ed8`、`success #15803d`、`warning #b45309`、`danger #b91c1c`、`info #0369a1`、`neutral #374151`。

> **單一 accent 顏色模型**：`solid` 直接吃飽和的 `--chip-accent` 當底、`--chip-on-accent` 當文字；`ghost` / `outline` / `text` 則用 `color-mix(in srgb, var(--chip-accent) X%, transparent)` 從同一個 accent 推導淡底與邊框。傳語意 `color` 走 preset class、傳自訂色走 inline `--chip-accent`，兩條路共用同一套 CSS，無分支。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseChip color="primary" class="brand-chip">膠囊標籤</BaseChip>
</template>

<style scoped>
.brand-chip {
  --chip-accent: #8b5cf6;
  --chip-radius: 9999px;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 語意色 + 四種 variant -->
  <BaseChip color="success" variant="solid">已完成</BaseChip>
  <BaseChip color="success">處理中</BaseChip>
  <BaseChip color="warning" variant="outline">審核中</BaseChip>
  <BaseChip color="danger" variant="text">失敗</BaseChip>

  <!-- 小尺寸 -->
  <BaseChip size="sm" color="info">v1.2.0</BaseChip>

  <!-- 自訂色（任意 CSS color） -->
  <BaseChip color="#8b5cf6">Vue</BaseChip>
  <BaseChip color="rebeccapurple" variant="outline">Nuxt</BaseChip>

  <!-- 可刪除（tag input 場景） -->
  <BaseChip
    label="設計"
    deletable
    delete-aria-label="移除「設計」標籤"
    @delete="removeTag('設計')"
  />

  <!-- prepend / append slot -->
  <BaseChip color="primary">
    <template #prepend><UserIcon /></template>
    Alice
  </BaseChip>

  <!-- 多型根節點：當成連結 -->
  <BaseChip :as="'a'" href="/tags/vue" color="success">#vue</BaseChip>
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#default` slot > `label` prop。兩者皆未給時渲染空 chip。
- **語意色 vs 自訂色**：`color` 落在 `primary / success / warning / danger / info / neutral` → 掛 modifier class 走 preset token；其餘字串 → 灌進 inline `--chip-accent`，底色 / 邊框由 `color-mix` 自動推導。
- **刪除鈕**：`deletable` 時於尾端渲染獨立 `<button>`，點擊 emit `delete`（payload 為原生事件）。是否真的移除由父層決定（受控）。
- **超長文字**：`--chip-label` 區塊套 `text-overflow: ellipsis`，配合使用端設定 `max-width` 可截斷。

---

## 5. A11y

- 刪除鈕為原生 `<button type="button">`，鍵盤可聚焦、Enter / Space 觸發，並有獨立 `:focus-visible` 外框。
- `deleteAriaLabel` 預設 `'Delete'` 缺乏上下文，**強烈建議**帶入 chip 內容（如 `刪除「Vue」標籤`），讓螢幕閱讀器使用者知道刪的是哪一個。
- 刪除鈕內的 SVG 補 `aria-hidden`，不會被重複朗讀。
- 語意色 preset 皆採深色調，淡底上文字對比 ≥ WCAG AA；改用 `--chip-accent` 自訂淺色時，請自行確認對比。`solid` 飽和底上的文字色為 `--chip-on-accent`（預設白字），自訂淺色底時一併覆寫。
- **避免巢狀互動元素**：互動型根節點（`as="a"` / `as="button"` / `RouterLink`）**不要**同時開 `deletable` —— 會在互動元素內巢狀 `<button>`，違反 HTML 規範。`as="a"` / `as="button"` 的情況開發期會 `console.warn`；元件型根節點無法自動偵測，請自行避免。需要「整片可點 + 可刪除」時，請把刪除鈕移到 chip 外層、或讓根節點維持非互動。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 全域 `<style>` + 依賴全域 SCSS `$color-map`（`@each`）與 `rgba($value, .1)` | 樣式洩漏到全域；強綁外部 SCSS map，元件無法獨立運作 | `scoped` + 自包含 `--chip-*` token，移除全域相依 |
| 2 | 自訂色用 `${toExpandedHex(color)}1A`（字串拼接 10% alpha hex） | 只支援 hex、需額外 util、拼接易碎（傳 `rgb()` / 具名色即失效） | 改用專案既有的 `color-mix(in srgb, …)`（BaseButton 已採用），支援**任意** CSS color；`toExpandedHex.ts` 不再需要 |
| 3 | `as?: any` | 違反專案禁用 `any` | 改 `string \| Component` 明確型別 |
| 4 | `withDefaults` 含 `onDelete: undefined` | 元件無 `onDelete` prop，為殘留的無效預設 | 移除 |
| 5 | 刪除鈕 `aria-label="Delete"` 寫死 | 多筆 chip 時 SR 全唸「Delete」，無法分辨刪的是哪個；亦無法 i18n | 抽成 `deleteAriaLabel` prop，建議帶 chip 內容 |
| 6 | 刪除鈕零樣式（無 hover / focus 視覺） | 看不出可點、鍵盤聚焦無提示 | 補 hover 淡底、`:focus-visible` 外框、`prefers-reduced-motion` 處理 |
| 7 | 圖示來自 `~/assets/svg/close.svg?component` | 綁特定 svg loader 與 asset 路徑，跨專案搬移即壞 | inline `<svg>`（`currentColor` 跟隨文字色），元件自包含 |
| 8 | ghost（淡底）文字色 = 飽和 accent | 部分語意色（如 amber）在淡底上對比不足 | preset 一律採深色調（700 級），確保淡底文字 ≥ AA |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseChip.spec.ts`（多型根節點 `as`、label / default slot 優先序、variant（`solid` / `outline` / `ghost` / `text`）・size（含 `lg`）・語意色 modifier class（含 `neutral`）、自訂色注入 `--chip-accent`、deletable 渲染刪除鈕、點擊 emit `delete`、`deleteAriaLabel`、巢狀互動元素 DEV 警告、prepend / append slot）— 22 cases
- [x] **Storybook**：`stories/components/atoms/BaseChip.stories.ts`（Playground / Variants / Colors / Sizes / CustomColor / Deletable / WithSlots / Themed）
