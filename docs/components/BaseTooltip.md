# Tooltip 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseTooltip.vue`）。
> **底座**：`app/components/atoms/BasePopover.vue`（觸發、定位、開關、無障礙、焦點全部委派給它）。
> **配套**：`docs/components/BasePopover.md`、`docs/components/component-design-spec.md`。

BaseTooltip 是包裝 [BasePopover](./BasePopover.md) 的「深色文字提示」薄層。它把 default slot 當觸發錨點，預設以 **hover / focus** 觸發，掛 `role="tooltip"`，並在浮層內渲染一塊深色泡泡與會跟隨翻轉旋轉的箭頭。定位、`flip`/`shift`、`Teleport`、Esc/click-outside、`prefers-reduced-motion` 等全部沿用底座，本元件只負責「提示的長相與預設行為」。

它是 **icon 說明、表單欄位提示、截斷文字補全、快捷鍵說明** 等場景的首選。

---

## 1. 與參考實作的差異（優化點）

本元件參考 [`AtomicTooltip.vue`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicTooltip.vue) 重寫，並做了以下修正：

| 參考實作 | 本元件 | 為什麼 |
|---|---|---|
| `generic="Value extends …, Context"` | 移除泛型 | tooltip 不需要值型別；那是從 dropdown 複製殘留的死碼 |
| `import { ComponentProps } from 'vue-component-type-helpers'` 反推 props 型別 | 直接 import `BasePopoverTrigger` / `BasePopoverPlacement` | 底座已 export 公開型別，免裝額外套件、型別更直觀 |
| `placement` 預設 `'bottom-start'` | 預設 `'top'` | tooltip 慣例置於上方 |
| 箭頭用 `overflow:hidden` + 旋轉方塊 `::before` | 箭頭用 `clip-path` 三角形（▼） | 符合 BasePopover `arrowStyle`「給一個指向下方的圖形、由它依 placement 旋轉」的約定；少一層 wrapper |
| 寫死色 `#232323` | `--tooltip-*` token 系統 | 可主題化、與其他 `Base*` 一致 |
| 無寬度上限 | `--tooltip-max-width: 16rem` + `word-break` | 長文字自動換行，不撐爆版面 |
| 底座 chrome 未處理 | `:has(.base-tooltip)` 中性化底座白底/邊框/陰影 | 本專案 BasePopover 自帶白盒 chrome，不中性化會變「白盒包深色盒」 |

---

## 2. P0 必備介面

| 介面 | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `#default` slot | 單一可聚焦元素 | **required** | 觸發錨點，透傳給 BasePopover 的 `#reference`。純文字會自動包成 `<span role="button" tabindex="0">` |
| `content` prop | `string` | — | 提示文字。與 `#content` slot 二擇一，皆無則不渲染提示 |

---

## 3. P1 進階 Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `content` | `string` | — | 提示文字（複雜內容請改用 `#content` slot） |
| `trigger` | `'hover' \| 'focus' \| 'click' \| 'touch'` 或其陣列 | `['hover', 'focus']` | 觸發方式；預設同時涵蓋滑鼠與鍵盤可達性。**觸控裝置沒有真正的 hover**，行動裝置策略見 §12 |
| `placement` | `BasePopoverPlacement` | `'top'` | 首選位置；空間不足時 `flip`/`shift` 自動調整 |
| `offset` | `number \| { mainAxis?: number; crossAxis?: number }` | `8` | 提示與 reference 的間距 |
| `disabled` | `boolean` | `false` | 整體禁用：不可觸發、不渲染提示 |

> 其餘底座能力（`autoFit`、`hoverCloseDelay`、`v-model`、`arrow` …）刻意不外露：tooltip 場景不需要，保持 API 精簡。若需要，請直接用 [BasePopover](./BasePopover.md)。

---

## 4. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `default` | — | 觸發錨點。傳入單一元素（`<button>` / `<a>` / icon …）；純文字 / `<svg>` 由底座自動包成可聚焦 span |
| `content` | — | 自訂提示內容（取代 `content` prop），可放任意 HTML / 元件 |

---

## 5. 基本用法

```vue
<script setup lang="ts">
import BaseTooltip from '~/components/atoms/BaseTooltip.vue'
</script>

<template>
  <!-- 純文字提示 -->
  <BaseTooltip content="更多資訊">
    <button type="button" aria-label="說明">?</button>
  </BaseTooltip>

  <!-- 指定位置 -->
  <BaseTooltip content="刪除這筆資料" placement="bottom">
    <button type="button">🗑</button>
  </BaseTooltip>

  <!-- 結構化內容用 #content slot -->
  <BaseTooltip placement="bottom">
    <button type="button">查看快捷鍵</button>
    <template #content>
      <div>
        <strong>鍵盤快捷鍵</strong>
        <p>儲存：⌘ + S</p>
      </div>
    </template>
  </BaseTooltip>
</template>
```

---

## 6. 主題化

提示外觀由 `--tooltip-*` token 控制，泡泡與箭頭底色連動。在使用端（全域或祖先）覆寫即可：

```css
/* 提示經 Teleport 送到 <body>，覆寫請用全域選擇器或自訂 class 直接命中 .base-tooltip */
.base-tooltip {
  --tooltip-bg: #1d4ed8;       /* 泡泡與箭頭底色一起變 */
  --tooltip-color: #ffffff;
  --tooltip-font-size: 0.8125rem;
  --tooltip-padding: 6px 10px;
  --tooltip-radius: 8px;
  --tooltip-max-width: 20rem;
}
```

> ⚠️ 提示已 `Teleport` 到 `<body>`，**不在**你的元件子樹內。用 `.parent .base-tooltip` 這種後代選擇器會選不到；請用全域規則或在 token 上直接命中 `.base-tooltip`。

---

## 7. 內部行為

- **委派底座**：`trigger` / `placement` / `offset` / `disabled` 原樣透傳給 BasePopover，並固定 `role="tooltip"`。開關、定位、Teleport、Esc/click-outside、進場淡入動畫皆由底座負責。
- **箭頭**：用穩定 `ref="arrowRef"` + `computed` 組 `arrow` prop（參考穩定，避免與 floating-ui 自動重算形成無限迴圈）。箭頭本體是 `clip-path` 切的 ▼ 三角形，底座 `arrowStyle` 依 placement 旋轉到正確方位並定位。
- **底座 chrome 中性化**：BasePopover 為多根節點，class 不會 fallthrough，無法直接傳 class 改它。改用非 scoped 的 `.base-popover:has(.base-tooltip)` 全域規則，把底座的 `--popover-*`（bg / border / shadow / padding）設為透明 / 無，泡泡外觀全由 `.base-tooltip` 提供。
- **空內容**：`content` 與 `#content` 皆空時，`#default` 內層 `v-if` 不渲染泡泡。

---

## 8. A11y Checklist

| 對象 | 必做 |
|---|---|
| reference | 由底座掛 `aria-describedby`（指向提示 id，聚焦時螢幕閱讀器念出提示內容）；`tooltip` role 下**不設** `aria-expanded` / `aria-controls` / `aria-haspopup` —— 那些是 disclosure widget（menu/dialog）語意，標在 tooltip 上會被誤念「已摺疊」。底座對 `role="tooltip"` 特判，符合 WAI-ARIA tooltip 規範 |
| 提示 | `role="tooltip"`、`id`（`useId()`，與 reference 的 `aria-describedby` 配對） |
| 鍵盤 | 預設含 `focus` 觸發 → Tab 聚焦錨點即顯示；Esc 關閉（底座提供） |
| 箭頭 | `aria-hidden="true"`（純裝飾） |
| 觸發語意 | 純文字錨點由底座自動補 `role="button" tabindex="0"` |

> 建議錨點若為 icon-only 按鈕，務必自行加 `aria-label`（tooltip 文字不會自動成為按鈕的無障礙名稱）；`aria-describedby` 提供的是「描述」，`aria-label`/可見文字才是「名稱」。

---

## 9. 邊界處理

| 情境 | 行為 |
|---|---|
| `content` 與 `#content` 皆空 | 不渲染提示泡泡 |
| `#content` 與 `content` 同時給 | `#content` slot 優先 |
| `disabled` | 不觸發、不渲染提示 |
| 長文字 | 觸 `--tooltip-max-width` 自動換行（`word-break: break-word`） |
| 錨點貼近視窗邊緣 | 底座 `flip` / `shift` 自動翻轉 / 平移 |
| `#default` 傳純文字 | 底座自動包成可聚焦 span |

---

## 10. 反模式

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 放互動表單 / 連結到 tooltip 內 | tooltip 預設 hover/focus，焦點移入會關閉；語意上 tooltip 非互動容器 | 互動內容改用 [BasePopover](./BasePopover.md) `trigger="click"` |
| 用 `.parent .base-tooltip` 後代選擇器改樣式 | 提示已 Teleport 到 body，選不到 | 用全域規則直接命中 `.base-tooltip` token |
| icon-only 錨點不加 `aria-label` | 螢幕閱讀器讀不到按鈕名稱 | 錨點自行加 `aria-label` |
| 把長段落塞進 tooltip | tooltip 適合短提示 | 長內容用 Popover / Dialog |

---

## 11. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| hover 顯示 | 滑入錨點顯示、滑出關閉 |
| 鍵盤可達 | Tab 聚焦錨點顯示、移開關閉 |
| 各方向 | `placement="top/right/bottom/left"` |
| 自動翻轉 | 錨點貼近視窗邊緣，自動翻到反向 |
| 結構化內容 | `#content` slot 放多行 / icon |
| 長文字換行 | 超過 `--tooltip-max-width` 自動換行 |
| 主題化 | 全域覆寫 `--tooltip-bg`，泡泡與箭頭一起變色 |
| 禁用 | `disabled`，hover / focus 皆無反應 |
| 空內容 | 不給 content → 不顯示泡泡 |

---

## 12. 行動裝置策略（重要）

> **核心原則：重要資訊永遠不要只放在 tooltip 裡。** 觸控裝置沒有真正的 `hover`，放在 tooltip 的內容對手機使用者等於「可能永遠看不到」。

預設 `trigger` 刻意維持 `['hover', 'focus']`、**不含 `touch`**。原因：`touch` 是「點按切換」，若放進預設會和錨點本身的動作打架。要不要支援觸控，取決於**錨點是什麼**，由使用端決定：

| 錨點類型 | 行動裝置做法 | 為什麼 |
|---|---|---|
| **純資訊 affordance**（`?` 說明鈕，本身無其他動作） | 傳 `:trigger="['hover', 'focus', 'touch']"` | 點按切換 tooltip 合理；BasePopover 已支援點外部關閉 |
| **可操作按鈕**（🗑 刪除 / ✏️ 編輯…）配 tooltip 當標籤 | **不要**用 touch；給按鈕**可見文字**或 `aria-label`，別讓 tooltip 是唯一資訊來源 | 手機點一下會同時觸發「按鈕動作 + tooltip」，體驗錯亂 |
| **內容較多、需主動閱讀**（說明段落 / 快捷鍵列表） | 改用 [BasePopover](./BasePopover.md) `trigger="click"` | 語意上這不是 tooltip 而是 Popover；point-and-read 應由可主動觸發的元件負責 |

**業界參考**：Material Design 在行動裝置用**長按（long-press）** 顯示 tooltip，避免和 tap 動作衝突；主流元件庫（MUI / Ant Design…）在 touch 上對 tooltip 一律保守，並都強調「別把必要資訊鎖在 tooltip」。

```vue
<!-- 純說明圖示：手機可點按開啟 -->
<BaseTooltip content="這是補充說明" :trigger="['hover', 'focus', 'touch']">
  <button type="button" aria-label="說明">?</button>
</BaseTooltip>
```
