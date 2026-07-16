# Scrollbar 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseScrollbar.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/composables/useResizeObserver.ts`（監聽容器尺寸變化重算 thumb）、`app/utils/createResizeObserver.ts`（singleton ResizeObserver，與 `createIntersectionObserver` 同款）。

BaseScrollbar 是 **overlay 自訂捲軸**：把 viewport 的原生捲軸隱藏，改用絕對定位的 `track + thumb` 覆蓋層呈現，閒置後自動淡出。用於需要「跨瀏覽器一致捲軸外觀」的場景（卡片、面板、側邊欄、聊天視窗…），同時保留原生捲動的物理慣性與滾輪行為。

它**不接管 viewport 本身的捲動** —— viewport 仍是原生 `overflow:auto`，滾輪 / 觸控 / 鍵盤捲動全照舊；overlay 只負責「視覺化捲動位置 + 提供拖曳 / 點軌道跳轉」。但 track 是浮在 viewport **之上**、卻不屬於 viewport **內部**的絕對定位覆蓋層——滑鼠停在 track 顯示區滾滾輪時，若不處理，瀏覽器會捲動最近的可捲動祖先（通常是整頁）而非 viewport，形成死角。因此 track 額外掛了 `@wheel`，把落在 track 上的滾輪事件轉發成 viewport 的捲動（到頂 / 到底時不吃事件，讓其自然冒泡給頁面）。`native` prop 可一鍵退回完全原生捲軸（不隱藏、不渲染 overlay，track 死角問題也隨之消失）。

> 本元件改寫自 [Mini-ghost/16th-ithelp-vue-components 的 `AtomicScrollbar`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicScrollbar.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `#default` slot | 任意內容 | **required** | 放進 viewport 的可捲動內容 |
| 容器尺寸（`height` / `width`） | CSS | — | **必須由外部限制**（如 `style="height:240px"`），內容超出才會出現捲軸 |

> ⚠️ BaseScrollbar 的根元素 `height: inherit` 由 viewport 繼承。**容器沒有受限的高度 / 寬度，內容就不會溢出、捲軸也不會出現**。請在使用端用 `style` / class 給定尺寸。

---

## 2. P1 Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `native` | `boolean` | `false` | 退回瀏覽器原生捲軸：不隱藏原生捲軸、不渲染 overlay、跳過所有 thumb 計算 |

本元件**無 emit、無 v-model**：捲動狀態屬於原生 DOM，元件不對外同步（需要監聽捲動請自行在 slot 內容或父層綁 `scroll`）。

---

## 3. CSS 客製化（`--scrollbar-*` token）

所有外觀抽成 CSS 自訂屬性，覆寫 `.base-scrollbar` 上的 token 即可主題化，無需動 class：

| Token | 預設 | 作用 |
|---|---|---|
| `--scrollbar-size` | `8px` | 軌道粗細（垂直＝寬、水平＝高） |
| `--scrollbar-size-hover` | `10px` | hover 軌道時放大後的粗細 |
| `--scrollbar-gap` | `2px` | 軌道距容器邊緣的間距 |
| `--scrollbar-radius` | `10px` | 軌道與 thumb 的圓角 |
| `--scrollbar-thumb-bg` | `rgb(35 35 35 / 60%)` | thumb 顏色 |
| `--scrollbar-track-hover-bg` | `rgb(255 255 255 / 50%)` | hover 軌道時的底色 |

```vue
<template>
  <BaseScrollbar class="dark-bar" style="height:240px">
    <!-- 內容 -->
  </BaseScrollbar>
</template>

<style scoped>
.dark-bar {
  --scrollbar-size: 10px;
  --scrollbar-thumb-bg: #60a5fa;
  --scrollbar-track-hover-bg: rgb(148 163 184 / 25%);
}
</style>
```

---

## 4. 基本用法

```vue
<script setup lang="ts">
import BaseScrollbar from '~/components/atoms/BaseScrollbar.vue'
</script>

<template>
  <!-- 垂直捲動：容器固定高度，內容超出即出現 overlay 捲軸 -->
  <BaseScrollbar style="height:240px;width:320px">
    <p v-for="line in lines" :key="line">{{ line }}</p>
  </BaseScrollbar>

  <!-- 水平捲動：內容用 white-space:nowrap 撐寬 -->
  <BaseScrollbar style="width:360px">
    <div style="white-space:nowrap">…很長的一行…</div>
  </BaseScrollbar>

  <!-- 退回原生捲軸 -->
  <BaseScrollbar native style="height:240px">
    <!-- 內容 -->
  </BaseScrollbar>
</template>
```

---

## 5. 內部行為（實作必做）

### 5.1 結構：viewport + overlay

```
.base-scrollbar (position:relative; overflow:hidden)
├─ .base-scrollbar__viewport (overflow:auto; 隱藏原生捲軸; 帶 :id 供 aria-controls 指向)
│  └─ <slot />
├─ .base-scrollbar__track--vertical   (role="scrollbar"; v-if thumbHeight)
│  └─ .base-scrollbar__thumb
└─ .base-scrollbar__track--horizontal (role="scrollbar"; v-if thumbWidth)
   └─ .base-scrollbar__thumb
```

- **隱藏原生捲軸**：`scrollbar-width: none`（Firefox）+ `::-webkit-scrollbar { display:none }`（WebKit/Blink）。`native` 模式不隱藏。
- 垂直 / 水平兩方向的計算共用一份邏輯，靠 `ORIENTATION_MAP` 查表切換要讀寫的 DOM 屬性（`scrollTop`/`scrollLeft`、`offsetHeight`/`offsetWidth`…）。

### 5.2 thumb 尺寸與位置

| 時機 | 函式 | 做什麼 |
|---|---|---|
| 捲動（`@scroll`） | `onScroll` | 依 `scrollTop/Left` 算 thumb 位移（`translateY/X %`），顯示捲軸並排程自動隱藏 |
| 尺寸 / 內容變動 | `update` | 算 thumb 長度與位移補償比例 `ratio`；內容沒溢出時長度設 0（不渲染軌道） |

- **thumb 長度** = `可視長度² / 內容總長度`，並以 `MIN_SIZE`(20px) 為下限避免縮到抓不到。
- 被 `MIN_SIZE` 撐大後，用 `ratioY/X` 補償位移比例，確保「拖到底＝內容捲到底」。
- `update` 由兩個來源觸發：`useResizeObserver`（容器尺寸變化）+ `onUpdated`（內容重渲染）。

### 5.3 互動

| 操作 | 行為 |
|---|---|
| 拖曳 thumb | `pointerdown` 記起點 → `document` 上 `pointermove` 換算捲動位移 → `pointerup` 釋放。拖曳期間暫停文字選取（還原 `onselectstart`） |
| 點擊軌道空白 | thumb 中心對齊點擊位置並捲過去 |
| hover 軌道 | 顯示捲軸、加粗、暫停自動隱藏 |
| 滑出 / 捲動後閒置 | `HIDE_DELAY`(1000ms) 後淡出 |
| 滾輪 / 觸控 / 鍵盤（在 viewport 上） | 原生 `overflow:auto` 處理，元件不介入 |
| 滾輪（在 track 覆蓋區上） | track 不在 viewport 內，瀏覽器預設會捲動最近可捲動祖先（死角）；track 掛 `@wheel` 把 delta 轉發給 viewport。horizontal track 優先吃 `deltaX`，為 0 時把 `deltaY` 當橫向捲動量；`deltaMode` line/page 依 16px / 可視長度換算。只有 viewport 還能往該方向捲時才 `preventDefault()`，到頂 / 到底時不吃事件，讓其自然冒泡給頁面 |

- 只處理主鍵（`button === 0`）拖曳；右鍵 / 中鍵 / `Ctrl+左鍵` 忽略。

---

## 6. 邊界處理

| 情境 | 行為 |
|---|---|
| 內容未溢出 | 對應方向 thumb 長度 = 0，不渲染該軌道 |
| 垂直 + 水平同時溢出 | 根元素掛 `--both`，兩條軌道各讓出對方寬度，右下角不重疊 |
| 容器無固定尺寸 | 內容不溢出 → 無捲軸（**使用端責任**：給定 height/width） |
| `native` | 不隱藏原生捲軸、不渲染 overlay、`onScroll` 直接 return |
| 拖曳中元件被卸載 | `onUnmounted` 移除殘留的 `document` 監聽並還原 `onselectstart`、清掉隱藏 timer |
| SSR | viewport ref 為 null 時所有計算早退；`useResizeObserver` 在無 `ResizeObserver` 時靜默略過 |
| 動態增刪內容 | `onUpdated` 觸發 `update` 重算 thumb 尺寸 |

---

## 7. 相對參考實作的修正與優化

| 項目 | 參考實作 | 本元件 | 為什麼 |
|---|---|---|---|
| `aria-controls` | 指向 `id`，但 viewport 沒掛該 `id`（指向不存在的元素） | viewport 補 `:id="id"`，`aria-controls` 真正關聯可捲動區 | a11y：`role="scrollbar"` 必須 controls 一個實際存在的捲動容器 |
| 卸載清理 | 隱藏 timer 與拖曳期 `document` 監聽未清 | `onUnmounted` 清 timer、移除監聽、還原 `onselectstart` | 避免記憶體洩漏與全域副作用殘留 |
| `useResizeObserver` | 直接依賴外部 composable | 本專案新增 SSR-safe、`onScopeDispose` 自動釋放的實作，底層走 singleton `createResizeObserver`（全 app 共用一個 observer，比照既有 `createIntersectionObserver`） | 對齊 `code-reuse.md`（有生命週期 → composable）與專案既有 observer 單例慣例 |
| 外觀 | 顏色 / 尺寸寫死 | 抽成 `--scrollbar-*` token | 與其他 Base 元件一致、可主題化 |
| 型別 | `originalOnSelectStart` 用 `any` | 改用 `typeof document.onselectstart` | 對齊 strict、避免自寫 `any` |
| 樣式作用域 | 非 scoped | `scoped` | 避免污染全域 |
| 點軌道取 thumb | `track.childNodes[0]`（含文字 / 註解節點） | `track.firstElementChild`（取不到則早退） | 結構調整時 `childNodes[0]` 可能是非元素節點，`thumb[size]` 會變 `undefined` → `NaN` 寫進 `scrollTop` |
| ratio 補償計算 | 直接相除 | 分母 `<= 0` 時 ratio 視為 `0`（`computeRatio` guard） | 內容剛好溢出（`originalHeight ≈ offsetHeight`，分母趨近 0）時會算出 `Infinity` / `NaN`，流進 `onScroll` 的 `thumbTop` / `thumbLeft` 造成壞值 |

---

## 8. A11y / 注意事項

| 對象 | 說明 |
|---|---|
| viewport | 帶 `id`，作為捲軸的 `aria-controls` 目標 |
| 軌道 | `role="scrollbar"` + `aria-orientation` + `aria-valuemin/max/now`（0–100 進度） |
| 鍵盤捲動 | viewport 內建 `tabindex="0"`：原生捲軸被隱藏後，Tab 聚焦 viewport 即可用方向鍵 / PageUp/PageDown 捲動（可捲動區本就該是 Tab 停靠點） |
| `prefers-reduced-motion` | 自動關閉軌道放大過場與淡入淡出 |

> **限制**：overlay **軌道 / thumb** 不支援以方向鍵直接操作（WAI-ARIA scrollbar 的鍵盤互動）；鍵盤捲動走「聚焦 viewport + 方向鍵」的原生路徑即可滿足多數情境。

---

## 9. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 不給容器固定尺寸就期待出現捲軸 | 內容不溢出，thumb 長度為 0 | 在使用端給 `height` / `width` |
| 在 slot 內容自己再寫 `overflow:auto` | 雙層捲動，overlay 抓不到正確捲動量 | 捲動交給 BaseScrollbar 的 viewport，內容只負責內容 |
| 直接覆蓋 `.base-scrollbar__thumb` 等 BEM class 改色 | 與 token 系統 drift | 優先覆寫 `--scrollbar-*` token |
| 需要以方向鍵直接操作 thumb（ARIA scrollbar 鍵盤互動）卻用 overlay 模式 | overlay 軌道不接管鍵盤（一般鍵盤捲動聚焦 viewport 即可） | 用 `native` 模式 |

---

## 附錄：與主流方案對照

| 概念 | OverlayScrollbars | simplebar | Element Plus `<el-scrollbar>` | BaseScrollbar |
|---|---|---|---|---|
| 捲動接管 | 原生 overflow | 原生 overflow | 原生 overflow | 原生 overflow |
| 尺寸監聽 | ResizeObserver | ResizeObserver/MutationObserver | ResizeObserver | `useResizeObserver` + `onUpdated` |
| 方向 | 垂直 + 水平 | 垂直 + 水平 | 垂直 + 水平 | 垂直 + 水平 |
| 自動隱藏 | ✓ | ✓ | ✓（hover 顯示） | ✓（捲動 / hover 顯示，閒置淡出） |
| 主題化 | CSS 變數 / theme | CSS class | CSS 變數 | `--scrollbar-*` token |

**觀察**：

- **不重造捲動**：viewport 仍是原生 `overflow:auto`，只在視覺層疊一層可拖曳 thumb，避免攔截滾輪 / 觸控造成的慣性與相容性問題。唯一的例外是 track 覆蓋區：track 浮在 viewport 之上但不在其內，滾輪落在 track 上時瀏覽器不會捲 viewport，故以 `@wheel` 把事件轉發回 viewport（到頂 / 到底時放行冒泡），viewport 上的原生滾輪行為則完全不接管。
- **查表驅動雙向**：`ORIENTATION_MAP` 讓垂直 / 水平共用同一份計算，減少重複。
- **修正 a11y 與洩漏**：補 `aria-controls` 指向、補卸載清理 —— 這兩點是參考實作常見的疏漏（見 §7）。
