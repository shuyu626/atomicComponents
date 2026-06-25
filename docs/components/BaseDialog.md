# Dialog 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseDialog.vue`）。
> **配套**：`docs/components/BaseModal.md`（同家族、共用 overlay 基底）、`docs/components/component-design-spec.md`。
> **共用工具**：`app/composables/useOverlay.ts`（焦點 / Esc / 點外部 / scroll-lock / 堆疊 / 遮罩，**與 BaseModal 共用**）、`app/composables/useDrag.ts`（指標拖曳）、`app/composables/usePopupsManager.ts`、`app/utils/toUnit.ts`。
> **外部依賴**：`focus-trap`（焦點陷阱，經 useOverlay）。
> **參考改寫**：[Mini-ghost/16th-ithelp-vue-components `AtomicDialog.vue` / `useDrag.ts` / `useMouse.ts`](https://github.com/Mini-ghost/16th-ithelp-vue-components)。

BaseDialog 是「**可拖曳 / 全螢幕對話框**」元件。它與 [`BaseModal`](./BaseModal.md) 同屬一個家族、共用 `useOverlay` 提供的全部浮層基礎能力（`Teleport`、`focus-trap` 鎖焦、Esc / 點外部關閉、背景捲動鎖定、多層堆疊、遮罩由最底層渲染），在此之上補了四項 **BaseModal 沒有的能力**：

| 能力 | 說明 |
|---|---|
| **draggable** | 拖曳移動位置（有標題列→拖標題列；無標題列→拖四邊感應區，內容仍可選取），內建視窗邊界 clamp |
| **fullscreen** | 撐滿視窗的沉浸式模式 |
| **transition** | `fade` / `slide-up` / `slide-down` / `slide-left` / `slide-right` 五種進出場 |
| **width** | 自訂面板寬度（數字補 `px`、字串原樣） |

> **何時用 BaseModal、何時用 BaseDialog？**
> 一般置中對話框（確認框、表單彈窗）用 `BaseModal`，它的結構化外殼（標題 / 關閉鈕 / 主體 / footer）更開箱即用。需要**拖曳移動**、**全螢幕**或**方向性進出場動畫**時用 `BaseDialog`。兩者底層共用 `useOverlay`，跨元件疊開時焦點與堆疊仍正確協作。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model`（`modelValue`） | `boolean` | `false` | 開關狀態。未綁定亦可運作（內部狀態），綁定後即受控 |
| `#default` slot | `{ close }` | — | 對話框主體內容。slot props 提供 `close()` |

---

## 2. Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `title` | `string` | — | 標題文字。設定後渲染標題列並接 `aria-labelledby` |
| `ariaLabel` | `string` | — | 無 `title` 也無 `#title` slot 時用作 `aria-label`（避免無名對話框） |
| `width` | `number \| string` | `640` | 面板寬度。數字補 `px`（經 `toUnit`），字串原樣（如 `'60%'`）；`fullscreen` 時忽略 |
| `fullscreen` | `boolean` | `false` | 全螢幕模式（撐滿視窗、停用拖曳、header 一律顯示關閉鈕） |
| `draggable` | `boolean` | `false` | 可拖曳移動（拖四邊感應區；`fullscreen` 時停用） |
| `transition` | `'fade' \| 'slide-up' \| 'slide-down' \| 'slide-left' \| 'slide-right'` | `'fade'` | 進出場動畫變體 |
| `hideBackdrop` | `boolean` | `false` | 隱藏半透明遮罩（仍可點外部關閉） |
| `hideCloseButton` | `boolean` | `false` | 隱藏標題列關閉鈕 |
| `closeOnBackdrop` | `boolean` | `true` | 點擊面板外部是否關閉 |
| `closeOnEscape` | `boolean` | `true` | 按 Esc 是否關閉（僅最上層回應） |
| `lockScroll` | `boolean` | `true` | 開啟時鎖定背景捲動並補捲軸寬度 |

---

## 3. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `default` | `{ close: () => void }` | 對話框主體內容 |
| `title` | — | 自訂標題內容（取代 `title` 文字，仍自動接 `aria-labelledby`） |
| `footer` | `{ close: () => void }` | 底部動作區。未提供則不渲染 footer |

> 與 BaseModal 的差異：BaseDialog 用 `#title`（只換標題文字、保留標題列與關閉鈕排版）；BaseModal 用 `#header`（接管整條標題列）。需要完全接管標題列排版時請改用 BaseModal。

---

## 4. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BaseDialog from '~/components/atoms/BaseDialog.vue'

const open = ref(false)
</script>

<template>
  <button type="button" @click="open = true">開啟</button>

  <BaseDialog v-model="open" title="編輯個人資料" draggable>
    <p>拖曳面板四邊可移動；中央內容仍可選取。</p>

    <template #footer="{ close }">
      <button type="button" @click="close">取消</button>
      <button type="button" @click="close">儲存</button>
    </template>
  </BaseDialog>
</template>
```

### 全螢幕

```vue
<BaseDialog v-model="open" title="圖片檢視" fullscreen>
  <img :src="src" alt="…" />
</BaseDialog>
```

### 方向性進出場

```vue
<BaseDialog v-model="open" title="通知" transition="slide-up">
  <p>從下往上滑入。</p>
</BaseDialog>
```

### 自訂寬度

```vue
<BaseDialog v-model="open" :width="420">…</BaseDialog>
<BaseDialog v-model="open" width="60%">…</BaseDialog>
```

---

## 5. 內部行為（實作必做）

### 5.1 共用 overlay 基底（useOverlay）

`focus-trap`、Esc / 點外部關閉、scroll-lock、多層堆疊、`showBackdrop`（`isBottom` 渲染）皆委派 `useOverlay(panelRef, open, options)`，與 BaseModal **共用同一個 module 層級 `trapStack` 與 `usePopupsManager` 單例** —— 這是把邏輯抽到 composable 的關鍵：BaseModal 疊 BaseDialog（或反之）時，focus-trap 仍會自動暫停下層、只讓最上層作用，scroll-lock 也用引用計數避免提早釋放。詳見 `BaseModal.md` §5.2–5.4。

### 5.2 拖曳（useDrag）

拖曳啟用條件 `canDrag = draggable && !fullscreen`，**把手依有無標題列自動切換**：

- **有標題列（`dragViaHeader`）** → 整條 `&__header` 作為把手（加 `--draggable`、`cursor:move`），綁 `@pointerdown="onDragStart"`。關閉鈕加 `@pointerdown.stop`，避免按關閉誤判為拖曳起點。**這是預設且推薦的情形**：把手在標題列，徹底避開右側捲軸與底部按鈕，且 `&__content` 內容仍可正常選取。
- **無標題列（`dragViaSensors`）** → 退回四邊 `&__sensor` 感應區（各綁 `@pointerdown="onDragStart"`），讓沒有標題的對話框也能拖曳，同時不擋中央內容。
- `useDrag(canDrag, { target })` 以 **Pointer Events** 追蹤位移，**僅在拖曳期間**監聽 `pointermove/up/cancel`（閒置零開銷），並把位移 **clamp 在視窗範圍內**（避免拖出畫面消失）
- 位移以 inline `transform: translate(x, y)` 套在 `&__wrapper`；**未位移（x=y=0）時不下 inline transform**，讓 CSS 進出場動畫的 transform 能生效（inline 樣式優先序高於 class，會蓋掉動畫）
- `watch(open)`：關閉時 `reset()` 把位移歸零 → 下次開啟回到置中、leave 動畫從原點播放
- 拖曳中 overlay 加 `--dragging`（`user-select:none`、`touch-action:none`）

### 5.3 渲染與卸載

- 單一 `<Transition>`（`appear`，name 為 `base-dialog-{transition}`）包整個 overlay，內層 `v-if="open"`：播完 leave 才卸載
- `Teleport to="body"` 脫離祖先 `overflow`/`z-index`/`transform` 裁切
- 進出場：overlay 層 `opacity` 帶動 backdrop 淡入；`&__wrapper` 依變體位移。`prefers-reduced-motion` 下移除 wrapper 位移、只保留淡入

### 5.4 SSR

同 BaseModal：初始 `open` 預設 `false` → SSR 不輸出；DOM 監聽與 scroll-lock 僅在 client 執行；`useDrag` 以 `typeof window` 守衛。⚠️ 避免在 SSR 階段就 `open=true`（遮罩由 `isBottom` 決定，會 hydration mismatch）。

---

## 6. 邊界處理

| 情境 | 行為 |
|---|---|
| 未綁 `v-model` | 用內部狀態（`default: false`），仍可由 `close()` 關閉 |
| `fullscreen` + `draggable` | fullscreen 優先，停用拖曳、不渲染感應區 |
| 拖到視窗邊緣 | clamp 在視窗內，面板完整可見；面板比視窗大時保住左 / 上緣 |
| 面板比視窗大（小螢幕） | `max-height: calc(100% - 3rem)` + 主體 `overflow-y:auto` 內捲 |
| 多個對話框 / 與 BaseModal 疊開 | 共用堆疊，Esc / 點外部只關最上層；scroll-lock 直到最後一個關閉才釋放 |
| 元件卸載時仍開啟 | useOverlay 的 `onUnmounted` 清堆疊 / 解鎖 / 停 trap；useDrag 清監聽，無殘留 |

---

## 7. A11y Checklist

| 對象 | 必做 |
|---|---|
| 面板 | `role="dialog"`、`aria-modal="true"`、`tabindex="-1"`、`id`（`useId()`） |
| 無障礙名稱 | 有 `title` 或 `#title` → `aria-labelledby` 指向標題；皆無 → 用 `ariaLabel` 當 `aria-label`。三者皆無會念「未命名對話框」 |
| 內容 | `aria-describedby` 指向主體 `&__content` |
| 關閉鈕 | `aria-label="關閉"`，`&times;` 圖示 `aria-hidden` |
| 遮罩 / 拖曳感應區 | `aria-hidden="true"`（純視覺，不進無障礙樹） |
| 鍵盤 | Esc 關閉（最上層）；focus-trap 鎖 Tab，關閉還焦給觸發元素 |
| 焦點 | 開啟即移入對話框；關閉還焦 |

> 拖曳目前為指標操作（滑鼠 / 觸控）。鍵盤使用者不依賴拖曳即可完整操作對話框（拖曳純屬位置偏好，非必要互動）。

---

## 8. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 手動 `emit('update:modelValue')` | 違反 `defineModel` 規範 | 直接改 `open.value` / 用 `close()` |
| 在拖曳的 `&__wrapper` 上再寫死 inline `transform` | 會與拖曳 / 進出場動畫互蓋 | 位置交給 `useDrag`，外觀用 `--dialog-*` token |
| `fullscreen` 還期待能拖曳 | fullscreen 已撐滿、拖曳無意義且被停用 | 二擇一：要移動就別開 fullscreen |
| `fullscreen` + `hide-close-button` + 鎖 Esc / 外部 | 全螢幕撐滿視窗、無「外部」可點，再隱藏關閉鈕 + 鎖 Esc → 使用者無法關閉 | fullscreen 至少保留關閉鈕，或留 Esc，或自備 `#footer` 關閉入口 |
| 無 `title` / `ariaLabel` / `#title` 就開對話框 | 對話框無無障礙名稱 | 至少給 `title` 或 `ariaLabel` |
| 用 `v-if="open"` 包 `<BaseDialog>` 外層 | 直接卸載會跳過 leave 動畫且 scroll-lock 來不及釋放 | 用 `v-model`，讓元件自行處理進出場 |

---

## 9. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 開關 | `v-model`，外部按鈕開、關閉鈕關 |
| 拖曳（有標題） | `draggable` + `title`，按住標題列拖移；不超出視窗；按關閉鈕不觸發拖曳 |
| 拖曳（無標題） | `draggable` 無標題，按住四邊感應區拖移；中央內容仍可選取 |
| 拖曳不誤關 | 拖曳起點在面板內，放開在外也不關閉 |
| 全螢幕 | `fullscreen`，撐滿視窗、顯示關閉鈕、無法拖曳 |
| 進出場變體 | `transition="slide-up"` 等五種各自正確 |
| 自訂寬度 | `:width="420"` / `width="60%"` |
| Esc / 點外部 | 預設可關；`:close-on-escape="false"` / `:close-on-backdrop="false"` 鎖定 |
| 標題與 a11y | `title` → `aria-labelledby`；`#title` slot 亦可 |
| 底部動作 | `#footer` 放「取消 / 確認」，`@click="close"` 可關 |
| 鎖捲動 | 開啟背景不可捲，關閉還原 |
| 焦點陷阱 | 連按 Tab 不跑出；關閉還焦 |
| 與 BaseModal 疊開 | Esc 只關最上層；兩者皆關才解鎖捲動 |

---

## 附錄：相較參考版（AtomicDialog）的優化

| 項目 | 參考版 | 本元件 |
|---|---|---|
| v-model | `modelValue` prop + 手動 `emit` | `defineModel`（受控 / 非受控自動） |
| 拖曳事件 | 常駐 global `mousemove`（`useMouse`）+ 無邊界 | Pointer Events、**僅拖曳期間監聽**、**視窗邊界 clamp**、支援觸控 |
| 焦點 / 堆疊 / scroll-lock | 由 `AtomicModal` 部分處理 | 抽 `useOverlay` 與 BaseModal 共用：focus-trap 堆疊、isTop 關閉、isBottom 遮罩、引用計數 scroll-lock |
| 進出場 inline transform 衝突 | inline transform 恆存在 | 未位移時不下 inline transform，動畫可正常接管 |
| 動畫無障礙 | — | `prefers-reduced-motion` 降級 |
| 回傳型別 | 仰賴推導 | composable 明確回傳型別 |
