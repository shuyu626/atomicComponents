# Drawer 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseDrawer.vue`）。
> **配套**：`docs/components/BaseModal.md`、`docs/components/BaseDialog.md`（同家族、共用 overlay 基底）、`docs/components/component-design-spec.md`。
> **共用工具**：`app/composables/useOverlay.ts`（焦點 / Esc / 點外部 / scroll-lock / 堆疊 / 遮罩，**與 BaseModal / BaseDialog 共用**）、`app/composables/usePopupsManager.ts`、`app/utils/toUnit.ts`。
> **外部依賴**：`focus-trap`（焦點陷阱，經 useOverlay）。
> **參考改寫**：[Mini-ghost/16th-ithelp-vue-components `AtomicDrawer.vue`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicDrawer.vue)。

BaseDrawer 是「**側邊抽屜（slide-over panel）**」元件。它與 [`BaseModal`](./BaseModal.md)、[`BaseDialog`](./BaseDialog.md) 同屬一個家族、共用 `useOverlay` 提供的全部浮層基礎能力（`Teleport`、`focus-trap` 鎖焦、Esc / 點外部關閉、背景捲動鎖定、多層堆疊、遮罩由最底層渲染），在此之上補了抽屜專屬與借鏡 Vuetify / Element Plus 的能力：

| 能力 | 來源 | 說明 |
|---|---|---|
| **anchor** | — | `top` / `right` / `bottom` / `left` 四個停靠邊緣，決定面板貼齊位置與滑入方向 |
| **size** | — | 抽屜尺寸：左右停靠時為「寬」、上下停靠時為「高」（數字補 `px`、字串原樣） |
| **image** | Vuetify | 背景圖片（`image` prop / `#image` slot），內容浮於其上；`--drawer-image-overlay` 可疊遮罩 |
| **beforeClose** | Element Plus | 關閉前攔截（如「未儲存，確定離開？」），呼叫 `done()` 才真正關閉 |
| **生命週期事件** | Element Plus | `open` / `opened` / `close` / `closed`（進出場動畫前後） |
| **withHeader** | Element Plus | 總開關，`false` 時完全不渲染標題列 |

> 側邊欄貼齊視窗邊緣、**不加圓角**（方正設計）。

> **何時用 BaseModal / BaseDialog、何時用 BaseDrawer？**
> 一般置中對話框（確認框、表單彈窗）用 `BaseModal`；需要拖曳 / 全螢幕 / 方向性進出場用 `BaseDialog`。內容**從畫面邊緣滑入的側邊面板**（篩選器、購物車、設定面板、行動版選單）用 `BaseDrawer`。三者底層共用 `useOverlay`，跨元件疊開時焦點與堆疊仍正確協作。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model`（`modelValue`） | `boolean` | `false` | 開關狀態。未綁定亦可運作（內部狀態），綁定後即受控 |
| `#default` slot | `{ close }` | — | 抽屜主體內容。slot props 提供 `close()` |

---

## 2. Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `title` | `string` | — | 標題文字。設定後渲染標題列並接 `aria-labelledby` |
| `ariaLabel` | `string` | — | 無 `title` 也無 `#title` slot 時用作 `aria-label`（避免無名對話框） |
| `closeLabel` | `string` | `'關閉'` | 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫 |
| `anchor` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'right'` | 停靠邊緣，決定滑入方向與版型 |
| `size` | `number \| string` | `320` | 寬（左 / 右）或高（上 / 下）。數字補 `px`（經 `toUnit`），字串原樣（如 `'50%'`、`'30rem'`） |
| `image` | `string` | — | 背景圖片網址（純裝飾，墊在內容後方）。更複雜的背景改用 `#image` slot |
| `beforeClose` | `(done: () => void) => void` | — | 關閉前攔截；需在內部呼叫 `done()` 才真正關閉。程式化（`v-model`）關閉不觸發 |
| `withHeader` | `boolean` | `true` | 是否渲染整個標題列（含標題與關閉鈕）。`false` 完全不渲染 |
| `hideCloseButton` | `boolean` | `false` | 隱藏標題列關閉鈕 |
| `hideBackdrop` | `boolean` | `false` | 隱藏半透明遮罩（仍可點外部關閉） |
| `closeOnBackdrop` | `boolean` | `true` | 點擊面板外部是否關閉 |
| `closeOnEscape` | `boolean` | `true` | 按 Esc 是否關閉（僅最上層回應） |
| `lockScroll` | `boolean` | `true` | 開啟時鎖定背景捲動並補捲軸寬度 |

---

## 3. Events

| Event | 時機 | 說明 |
|---|---|---|
| `update:modelValue` | 開關變動 | `v-model` 同步（由 `defineModel` 自動發出） |
| `open` | 進場動畫**前** | 開始開啟 |
| `opened` | 進場動畫**後** | 開啟完成 |
| `close` | 離場動畫**前** | 開始關閉 |
| `closed` | 離場動畫**後** | 關閉完成（DOM 已卸載） |

> `open` / `close` 由 `watch(open)` 在 DOM 更新前發出（掛載即開啟者另由 `onMounted` 補發 `open`，避免只發 `opened`）；`opened` / `closed` 由 `<Transition>` 的 `after-enter` / `after-leave` hook 發出。

---

## 4. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `default` | `{ close: () => void }` | 抽屜主體內容 |
| `title` | — | 自訂標題內容（取代 `title` 文字，仍自動接 `aria-labelledby`） |
| `image` | — | 自訂背景圖層（取代 `image` 預設 `<img>`，可放漸層 / `<picture>`） |
| `footer` | `{ close: () => void }` | 底部動作區。未提供則不渲染 footer |

> 與 BaseDialog 一致：BaseDrawer 用 `#title`（只換標題文字、保留標題列與關閉鈕排版）。需要完全接管標題列排版時請改用 BaseModal 的 `#header`。

---

## 5. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BaseDrawer from '~/components/atoms/BaseDrawer.vue'

const open = ref(false)
</script>

<template>
  <button type="button" @click="open = true">篩選</button>

  <BaseDrawer v-model="open" title="篩選條件" anchor="right" :size="320">
    <p>從右側滑入的抽屜內容。</p>

    <template #footer="{ close }">
      <button type="button" @click="close">取消</button>
      <button type="button" @click="close">套用</button>
    </template>
  </BaseDrawer>
</template>
```

### 不同停靠方向

```vue
<BaseDrawer v-model="open" anchor="left" title="選單">…</BaseDrawer>
<BaseDrawer v-model="open" anchor="bottom" title="動作清單">…</BaseDrawer>
```

### 自訂尺寸

```vue
<BaseDrawer v-model="open" :size="480">…</BaseDrawer>   <!-- 480px -->
<BaseDrawer v-model="open" size="50%">…</BaseDrawer>     <!-- 50% 視窗寬 -->
```

### 背景圖片（Vuetify 風格）

```vue
<!-- 疊一層深色遮罩讓文字在圖片上仍清晰 -->
<BaseDrawer
  v-model="open"
  title="個人檔案"
  image="/cover.jpg"
  style="--drawer-image-overlay: rgba(0,0,0,0.45); --drawer-color: #fff"
>
  <p>內容浮在背景圖之上。</p>
</BaseDrawer>

<!-- 需要漸層 / <picture> 時改用 #image slot -->
<BaseDrawer v-model="open" title="活動">
  <template #image>
    <div style="width:100%;height:100%;background:linear-gradient(160deg,#6366f1,#ec4899)" />
  </template>
</BaseDrawer>
```

### 關閉前攔截（Element Plus 風格）

```vue
<script setup lang="ts">
function beforeClose(done: () => void) {
  if (window.confirm('表單尚未儲存，確定關閉？')) done()
}
</script>

<template>
  <!-- Esc / 點遮罩 / 關閉鈕 / slot close() 都會先過 beforeClose -->
  <BaseDrawer v-model="open" title="編輯中" :before-close="beforeClose">…</BaseDrawer>
</template>
```

### 生命週期事件

```vue
<BaseDrawer
  v-model="open"
  @open="onOpen"       <!-- 進場前 -->
  @opened="onOpened"   <!-- 進場後 -->
  @close="onClose"     <!-- 離場前 -->
  @closed="onClosed"   <!-- 離場後（DOM 已卸載） -->
>…</BaseDrawer>
```

### 不渲染 header

```vue
<!-- 完全自訂版型；記得補 aria-label -->
<BaseDrawer v-model="open" :with-header="false" aria-label="自訂面板">…</BaseDrawer>
```

---

## 6. 內部行為（實作必做）

### 6.1 共用 overlay 基底（useOverlay）

`focus-trap`、Esc / 點外部關閉、scroll-lock、多層堆疊、`showBackdrop`（`isBottom` 渲染）皆委派 `useOverlay(panelRef, guardedOpen, options)`，與 BaseModal / BaseDialog **共用同一個 module 層級 `trapStack` 與 `usePopupsManager` 單例** —— 跨元件疊開時，focus-trap 會自動暫停下層、只讓最上層作用，scroll-lock 也用引用計數避免提早釋放。詳見 `BaseModal.md` §5.2–5.4。

### 6.2 anchor → 版型與滑入方向

- 面板 `position: fixed`，依 `anchor` 貼齊對應邊緣（`top`/`bottom` 撐滿寬、高為 `--drawer-size`；`left`/`right` 撐滿高、寬為 `--drawer-size`）。**側邊欄貼齊視窗邊緣、不加圓角。**
- `size` 經 `toUnit` 寫入 `--drawer-size`（數字補 `px`、字串原樣），同時以 `max-width` / `max-height: 100%` 防止超出視窗。
- 進出場以 `transition` name `base-drawer-{anchor}` 區分：overlay 層 `opacity` 帶動 backdrop 淡入，`&__panel` 從停靠邊緣 `translate`（如 `right` 為 `translateX(100%)`）滑入。`prefers-reduced-motion` 下移除位移、只保留淡入。

### 6.3 背景圖層（image）

- 有 `image` prop 或 `#image` slot 才渲染 `&__image`：`position:absolute; inset:0; z-index:0; pointer-events:none`，`aria-hidden`，預設 `<img alt="">`（純裝飾）。
- 內容（header / body / footer）以 `position:relative; z-index:1` 浮於圖層之上。
- `&__image::after` 疊一層 `--drawer-image-overlay`（預設透明）；覆寫此 token 可加深遮罩、提升文字可讀性。

### 6.4 關閉把關（beforeClose）

- 所有「使用者觸發」的關閉路徑（Esc / 點外部 / 關閉鈕 / slot `close()`）都寫入 `guardedOpen` 這個 writable computed；其 setter 遇到關閉且有 `beforeClose` 時，交由 `beforeClose(done)` 決定何時 `done()`（= 真正設 `open=false`）。
- 父層透過 `v-model` 直接改 `open` 屬於**程式化關閉**，不經 setter、不觸發 `beforeClose`（與 Element Plus 行為一致）。
- ⚠️ **每次關閉嘗試都會呼叫一次 `beforeClose`**（連點關閉鈕 / 連按 Esc 即多次觸發）。若 `beforeClose` 內為**非同步**確認（如自訂 dialog / API 驗證），請自行**去抖或加旗標**避免疊出多個確認框；同步 `window.confirm` 則無此問題。

### 6.5 生命週期事件

- `open` / `close`：`watch(open)`（flush `'pre'`）在 DOM 更新與動畫開始前發出。掛載時即為開啟者
  `watch` 不會觸發，故 `onMounted` 補發一次 `open`，避免「只發 `opened` 不發 `open`」的不對稱。
- `opened` / `closed`：`<Transition>` 的 `after-enter` / `after-leave`（含 `after-appear`）hook 發出。

### 6.6 渲染與卸載

- 單一 `<Transition>`（`appear`，name 為 `base-drawer-{anchor}`）包整個 overlay，內層 `v-if="open"`：播完 leave 才卸載。
- `Teleport to="body"` 脫離祖先 `overflow` / `z-index` / `transform` 裁切。
- header 在 `withHeader` 為真、且（有標題或需顯示關閉鈕）時渲染，因此無標題抽屜仍保有關閉入口（除非 `hideCloseButton` 或 `withHeader=false`）。

### 6.7 SSR

同 BaseModal / BaseDialog：初始 `open` 預設 `false` → SSR 不輸出；DOM 監聽與 scroll-lock 僅在 client 執行。⚠️ 避免在 SSR 階段就 `open=true`（遮罩由 `isBottom` 決定，會 hydration mismatch）。

---

## 7. 邊界處理

| 情境 | 行為 |
|---|---|
| 未綁 `v-model` | 用內部狀態（`default: false`），仍可由 `close()` 關閉 |
| `size` 大於視窗 | `max-width` / `max-height: 100%` 限制，面板不超出視窗，內容 `overflow-y:auto` 內捲 |
| 無 `title` 但要關閉鈕 | header 仍渲染（`hasHeader = withHeader && (hasTitle || !hideCloseButton)`），保留右上角關閉鈕 |
| `hideCloseButton` + 無 `title`，或 `withHeader=false` | 不渲染 header，靠 Esc / 點外部 / 自備 `#footer` 關閉 |
| `beforeClose` 未呼叫 `done()` | 抽屜維持開啟（攔截成功）；程式化 `v-model` 改值不受攔截 |
| `image` + 深色背景圖 | 覆寫 `--drawer-image-overlay` 疊遮罩、`--drawer-color` 調文字色以保可讀性 |
| 多個抽屜 / 與 BaseModal·Dialog 疊開 | 共用堆疊，Esc / 點外部只關最上層；scroll-lock 直到最後一個關閉才釋放 |
| 元件卸載時仍開啟 | useOverlay 的 `onUnmounted` 清堆疊 / 解鎖 / 停 trap，無殘留 |

---

## 8. A11y Checklist

| 對象 | 必做 |
|---|---|
| 面板 | `role="dialog"`、`aria-modal="true"`、`tabindex="-1"`、`id`（`useId()`） |
| 無障礙名稱 | 有 `title` 或 `#title` → `aria-labelledby` 指向標題；皆無 → 用 `ariaLabel` 當 `aria-label`。三者皆無會念「未命名對話框」 |
| 內容描述 | 內容區（`__body`）帶 `id`，面板以 `aria-describedby` 指向（與 BaseModal 同模式） |
| 關閉鈕 | `aria-label`（預設「關閉」，可用 `closeLabel` 覆寫供多語系），`&times;` 圖示 `aria-hidden` |
| 遮罩 / 背景圖層 | `aria-hidden="true"`（純視覺，不進無障礙樹）；背景圖 `alt=""` |
| 鍵盤 | Esc 關閉（最上層）；focus-trap 鎖 Tab，關閉還焦給觸發元素 |
| 焦點 | 開啟即移入抽屜；關閉還焦 |

---

## 9. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 手動 `emit('update:modelValue')` | 違反 `defineModel` 規範 | 直接改 `open.value` / 用 `close()` |
| 在 `&__panel` 寫死 inline `transform` | 會與滑入 / 離場動畫互蓋 | 位置交給 anchor 版型，外觀用 `--drawer-*` token |
| 無 `title` / `ariaLabel` / `#title` 就開抽屜 | 抽屜無無障礙名稱 | 至少給 `title` 或 `ariaLabel` |
| `hide-close-button` + 鎖 Esc + 鎖外部 + 無 footer | 使用者無任何關閉入口 | 至少保留一種：關閉鈕、Esc、點外部、或自備 `#footer` 關閉 |
| `before-close` 內永不呼叫 `done()` | 抽屜永遠關不掉 | 條件不符時可不關，但要保留一條能 `done()` 的路徑 |
| 背景圖上直接放深色文字、不疊遮罩 | 圖片明亮處文字看不清 | 覆寫 `--drawer-image-overlay` + `--drawer-color` |
| 用 `v-if="open"` 包 `<BaseDrawer>` 外層 | 直接卸載會跳過 leave 動畫且 scroll-lock 來不及釋放 | 用 `v-model`，讓元件自行處理進出場 |

---

## 10. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 開關 | `v-model`，外部按鈕開、關閉鈕關 |
| 四方向 | `anchor="top" / "right" / "bottom" / "left"` 各自從對應邊緣滑入 |
| 自訂尺寸 | `:size="480"` / `size="50%"` |
| 背景圖 | `image="/cover.jpg"` 或 `#image` slot；`--drawer-image-overlay` 疊遮罩 |
| 關閉攔截 | `:before-close="fn"`，Esc / 遮罩 / 關閉鈕都先確認，`done()` 才關 |
| 生命週期 | `@open` / `@opened` / `@close` / `@closed` 各自於進出場前後觸發 |
| header 開關 | `:with-header="false"` 不渲染標題列 |
| Esc / 點外部 | 預設可關；`:close-on-escape="false"` / `:close-on-backdrop="false"` 鎖定 |
| 標題與 a11y | `title` → `aria-labelledby`；`#title` slot 亦可；無標題用 `ariaLabel` |
| 底部動作 | `#footer` 放「取消 / 套用」，`@click="close"` 可關 |
| 鎖捲動 | 開啟背景不可捲，關閉還原 |
| 焦點陷阱 | 連按 Tab 不跑出；關閉還焦 |
| 與 BaseModal / BaseDialog 疊開 | Esc 只關最上層；全部關閉才解鎖捲動 |

---

## 附錄：相較參考版與借鏡來源

### 相較參考版（AtomicDrawer）的優化

| 項目 | 參考版 | 本元件 |
|---|---|---|
| v-model | `modelValue` prop + 手動 `emit` | `defineModel`（受控 / 非受控自動） |
| `withDefaults` | 宣告了**不存在的 `fullscreen` 預設值**（型別錯誤） | 僅宣告實際存在的 props |
| 包裝方式 | 包一層 `AtomicModal` | 直接用 `useOverlay`，與 BaseModal / BaseDialog 同源，支援跨元件堆疊 |
| 關閉入口 | 無內建關閉鈕（全靠 Modal） | 內建關閉鈕（`hideCloseButton` 可關）、Esc、點外部 |
| a11y | 僅 `role="dialog"` / `aria-modal` | 補 `aria-labelledby` / `aria-label`、`useId` 連結、關閉鈕 `aria-label` |
| 焦點 / 堆疊 / scroll-lock | 由 `AtomicModal` 部分處理 | 抽 `useOverlay` 共用：focus-trap 堆疊、isTop 關閉、isBottom 遮罩、引用計數 scroll-lock |
| 動畫無障礙 | — | `prefers-reduced-motion` 降級 |

### 借鏡 Vuetify / Element Plus

| 功能 | 來源 | 對應 |
|---|---|---|
| 背景圖片 | Vuetify `v-navigation-drawer` `image` | `image` prop + `#image` slot + `--drawer-image-overlay` |
| 關閉前攔截 | Element Plus Drawer `before-close` | `beforeClose: (done) => void`（透過 `guardedOpen` 把關所有使用者關閉路徑） |
| 生命週期事件 | Element Plus Drawer `open/opened/close/closed` | 同名四事件（watch + Transition after-hook） |
| header 總開關 | Element Plus Drawer `with-header` | `withHeader` prop |
