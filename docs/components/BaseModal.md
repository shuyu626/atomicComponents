# Modal 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseModal.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/composables/useOverlay.ts`（焦點 / Esc / 點外部 / scroll-lock / 堆疊 / 遮罩，**與 BaseDialog 共用**）、`app/composables/usePopupsManager.ts`（浮層堆疊 + 背景捲動鎖定）、`app/utils/toUnit.ts`。
> **外部依賴**：`focus-trap`（焦點陷阱，經 useOverlay）。
> **姊妹元件**：[`BaseDialog`](./BaseDialog.md)（可拖曳 / 全螢幕 / 方向性進出場，共用 useOverlay 基底）。
> **參考改寫**：[Mini-ghost/16th-ithelp-vue-components `AtomicModal.vue` / `popups.ts`](https://github.com/Mini-ghost/16th-ithelp-vue-components)。

BaseModal 是「置中對話框」元件：以 `v-model` 控制開關，透過 `Teleport` 把對話框送到 `<body>` 脫離祖先的 `overflow` / `z-index` / `transform` 裁切，半透明遮罩覆蓋背景，並用 `focus-trap` 把鍵盤焦點鎖在對話框內、關閉時還焦給觸發元素。多個 modal 同時開啟時，由 `usePopupsManager` 維護堆疊順序與背景捲動鎖定：Esc / 點擊外部**只關最上層**（`isTop`）；遮罩**僅由最底層渲染**（`isBottom`）——疊加時暗度一致不變深，且切換層級時遮罩恆定、無閃爍。

它在參考版的 headless 基底上補了**結構化外殼**（標題列、關閉鈕、主體、底部動作區）與**完整 a11y**（`role="dialog"`、`aria-modal`、`aria-labelledby`），開箱即可當確認框 / 表單對話框 / 內容彈窗。內容仍可透過 slot 完全自訂。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `v-model`（對應 `modelValue`） | `boolean` | `false` | 開關狀態。**未綁定亦可運作**（內部狀態）；綁定後即受控。Modal 無自帶觸發器，通常由外部按鈕開啟 |
| `#default` slot | `{ close }` | — | 對話框主體內容。slot props 提供 `close()` 供內容主動關閉 |

> **為什麼用 `v-model` 而非 `visible` + 事件**：符合 Vue 3.4+ `defineModel()` 規範，受控 / 非受控自動切換，無需父層額外樣板。

---

## 2. P1 進階 Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `title` | `string` | — | 標題列文字。設定後渲染預設標題並自動接 `aria-labelledby` |
| `ariaLabel` | `string` | — | 對話框無障礙名稱。**無 `title` 時**用作 `aria-label`（避免無名對話框）；有 `title` 時忽略（以 `aria-labelledby` 為準） |
| `closeLabel` | `string` | `'關閉'` | 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫 |
| `beforeClose` | `(done: () => void) => void` | — | 關閉前攔截；需在內部呼叫 `done()` 才真正關閉。程式化（`v-model`）關閉不觸發（對齊 BaseDrawer） |
| `hideBackdrop` | `boolean` | `false` | 隱藏半透明遮罩（仍保留點擊外部關閉行為） |
| `hideCloseButton` | `boolean` | `false` | 隱藏右上角關閉鈕 |
| `closeOnBackdrop` | `boolean` | `true` | 點擊面板外部（遮罩區）是否關閉 |
| `closeOnEscape` | `boolean` | `true` | 按 Esc 是否關閉（僅最上層 modal 回應） |
| `lockScroll` | `boolean` | `true` | 開啟時鎖定背景捲動，並補捲軸寬度避免版面橫向跳動 |

---

## 2.1 Events（生命週期，對齊 BaseDrawer）

| Event | 時機 | 說明 |
|---|---|---|
| `update:modelValue` | 開關變動 | `v-model` 同步（由 `defineModel` 自動發出） |
| `open` | 進場動畫**前** | 開始開啟 |
| `opened` | 進場動畫**後** | 開啟完成 |
| `close` | 離場動畫**前** | 開始關閉 |
| `closed` | 離場動畫**後** | 關閉完成（DOM 已卸載） |

> `open` / `close` 由 `watch(open)` 在 DOM 更新前發出（掛載即開啟者另由 `onMounted` 補發 `open`，避免只發 `opened`）；`opened` / `closed` 由 `<Transition>` 的 `after-enter` / `after-leave` hook 發出。與 BaseDrawer 完全同一套 wiring。

---

## 3. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `default` | `{ close: () => void }` | 對話框主體內容 |
| `header` | `{ close: () => void }` | 自訂整個標題列（覆蓋 `title` 預設標題）。⚠️ 自訂 header 時 `aria-labelledby` 不會自動連結，請自行處理（見 §7） |
| `footer` | `{ close: () => void }` | 底部動作區（如「取消 / 確認」）。未提供則不渲染 footer |

### 不開放的設計

| 項目 | 為什麼 |
|---|---|
| `Teleport` 目標 | 固定 `Teleport to="body"` 以脫離 `overflow`/`z-index` 裁切；自訂外觀請覆寫 `--modal-*` token 或用 slot |
| 自帶觸發按鈕 | Modal 的開關語意上屬於父層流程，由 `v-model` 控制；觸發按鈕放父層更彈性 |

---

## 4. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from '~/components/atoms/BaseModal.vue'

const open = ref(false)
</script>

<template>
  <button type="button" @click="open = true">開啟對話框</button>

  <BaseModal v-model="open" title="編輯個人資料">
    <p>這裡是對話框主體，可放任意 HTML / 元件 / 表單。</p>

    <template #footer="{ close }">
      <button type="button" @click="close">取消</button>
      <button type="button" @click="close">儲存</button>
    </template>
  </BaseModal>
</template>
```

### 確認框（不可點外部關閉）

```vue
<BaseModal
  v-model="confirmOpen"
  title="確認刪除"
  :close-on-backdrop="false"
  :close-on-escape="false"
  hide-close-button
>
  <p>刪除後無法復原，確定要刪除這筆資料嗎？</p>

  <template #footer="{ close }">
    <button type="button" @click="close">取消</button>
    <button type="button" @click="onConfirmDelete">確認刪除</button>
  </template>
</BaseModal>
```

### 完全自訂外殼

```vue
<BaseModal v-model="open" hide-close-button>
  <template #header="{ close }">
    <div class="my-header">
      <h2 id="my-modal-title">自訂標題</h2>
      <button type="button" @click="close">✕</button>
    </div>
  </template>

  <div>自訂主體</div>
</BaseModal>
```

> 自訂 `#header` 時若需 `aria-labelledby`，請給標題元素一個 `id` 並自行在父層處理（元件僅在使用 `title` prop 時自動連結）。

---

## 5. 內部行為（實作必做）

### 5.1 渲染與卸載

- 用單一 `<Transition appear name="base-modal">` 包整個 overlay，內層 `v-if="open"`：`open=false` 時播完 leave 動畫才卸載，**不需**額外的「延遲卸載」本地狀態
- `Teleport to="body"` 脫離裁切
- `prefers-reduced-motion` 下關閉進出場動畫

### 5.2 堆疊與背景捲動（usePopupsManager）

- 開啟時 `popups.add(token)` 上堆疊；`lockScroll` 為真時 `popups.lock(token)`
- 關閉 / 卸載時 `popups.remove(token)` + `popups.unlock(token)`
- **遮罩渲染**：`showBackdrop = !hideBackdrop && popups.isBottom(token)` —— 只有最底層 modal 畫遮罩。堆疊上層時最底層遮罩完全不動，避免「`isTop` 切換瞬間移除舊遮罩、新遮罩才淡入」造成的變亮閃爍，也避免多層半透明黑疊加變暗。`popups` 用 `shallowReactive`，`isBottom` 變動會即時更新
- 初始即開啟的副作用在 `onBeforeMount`（client-only、首次 render 前）補跑 → 遮罩第一幀就正確、不閃；之後開關交給 `watch(open)`
- **scroll-lock**：第一個 modal 鎖 `body { overflow: hidden }` 並補 `padding-right`（用 `window.innerWidth - documentElement.clientWidth` 算捲軸寬，經 `toUnit` 轉單位）；最後一個關閉才還原。中間層開關不會誤放開鎖
- `usePopupsManager()` 為惰性單例，存取 `document` / `window` 前以 `typeof document !== 'undefined'` 守衛 → **SSR 安全**

### 5.3 關閉行為

| 來源 | 行為 |
|---|---|
| 關閉鈕 | `@click="close"`（`hideCloseButton` 時不渲染） |
| Esc | `document` keydown 監聽；需 `closeOnEscape` 且 `open` 且 `popups.isTop(token)`（只有最上層回應） |
| 點擊外部 | overlay `@click` + `event.composedPath()` 判斷是否落在面板內（含 Shadow DOM），不在面板內才關（`closeOnBackdrop` 控制） |
| `close()` | 透過各 slot props 提供，讓內容主動關閉 |

- 所有「使用者觸發」的關閉路徑（關閉鈕 / Esc / 點外部 / slot `close()`）皆寫入 `guardedOpen` writable computed；其 setter 在關閉且有 `beforeClose` 時交由 `beforeClose(done)` 決定何時 `done()`（= 真正設 `open=false`）。父層透過 `v-model` 直接改 `open` 屬於**程式化關閉**，不經 setter、不觸發 `beforeClose`（與 BaseDrawer / Element Plus 行為一致）
- 所有關閉統一改 `open.value = false`（`defineModel`），**不**手動 `emit`

### 5.4 焦點管理（focus-trap）

> §5.2–5.4 的行為自 `useOverlay` composable 提供（BaseModal 與 BaseDialog 共用），以下描述其內部實作。`trapStack` 為 `useOverlay` 的 module 層級共用陣列，故跨 BaseModal / BaseDialog 疊開時焦點仍正確協作。

- `watch(panelRef)`：面板掛載 → `createFocusTrap(panel).activate()`；卸載 → `deactivate()`
- 選項：
  - `delayInitialFocus: false` —— 開啟即聚焦面板（不等動畫）
  - `fallbackFocus: panel` —— 內容無可聚焦元素時退而聚焦面板本身（面板需 `tabindex="-1"` 才可聚焦）
  - `escapeDeactivates: false` —— Esc 交由 §5.3 統一處理
  - `clickOutsideDeactivates: false` —— 點外部關閉由 overlay 處理
  - `allowOutsideClick: () => closeOnBackdrop` —— **關鍵**：focus-trap 會在 capture 階段 `preventDefault + stopImmediatePropagation` 攔截面板外點擊，導致遮罩點擊到不了 `onOverlayClick`。可關閉時放行外部點擊由 overlay 決定關閉；`closeOnBackdrop: false` 時維持攔截、焦點鎖在面板內
  - `trapStack`（module 層級共用陣列）—— 多層 modal 疊開時自動暫停下層 trap、只讓最上層作用，關閉後恢復，避免兩個 active trap 互搶焦點
- 關閉時 focus-trap 預設 `returnFocusOnDeactivate` 還焦給開啟前的觸發元素

### 5.5 SSR

- 初始 `open` 預設 `false` → SSR 不輸出對話框；`document` 監聽與 scroll-lock 僅在 client 執行
- 初始即 `open` 的副作用在 `onBeforeMount`（client-only、首次 render 前）補跑：堆疊註冊純 JS、scroll-lock 已自帶 `typeof document` 守衛，故 SSR 不會被觸發；watch 不用 `immediate` 以免在 server 端 setup 階段污染單例
- ⚠️ **避免在 SSR 階段就 `open=true`**：遮罩由 `isBottom` 決定，server 端堆疊為空（`onBeforeMount` 不在 server 執行）→ 不渲染遮罩，client 首次 render 才補上 → 會有 hydration mismatch。modal 請於 client 端開啟（一般用法本就如此）

---

## 6. 邊界處理

| 情境 | 行為 |
|---|---|
| 未綁 `v-model` | 用內部狀態（`default: false`），仍可由 `close()` 關閉 |
| 多個 modal 疊開 | 由堆疊管理，Esc / 點外部只關最上層；scroll-lock 直到最後一個關閉才釋放 |
| `hideBackdrop` | 不渲染遮罩，但仍可點面板外部關閉（除非 `closeOnBackdrop: false`） |
| `hideCloseButton` + 無 footer | 仍可用 Esc / 點外部 / 程式 `close()` 關閉；若三者皆禁用請務必自備關閉入口 |
| 面板內無可聚焦元素 | `fallbackFocus` 聚焦面板本身，焦點不外漏 |
| 元件卸載時仍開啟 | `onUnmounted` 移出堆疊、解鎖捲動、`deactivate` trap，無殘留 |

---

## 7. A11y Checklist

| 對象 | 必做 |
|---|---|
| 面板 | `role="dialog"`、`aria-modal="true"`、`tabindex="-1"`、`id`（`useId()`）；用 `title` → `aria-labelledby`；無 `title` 但有 `ariaLabel` → `aria-label` |
| 無障礙名稱 | **每個對話框都應有名稱**：給 `title`、`ariaLabel`，或自訂 `#header` 時自行用 `aria-labelledby`。三者皆無 → 螢幕閱讀器念「未命名對話框」 |
| 標題 | 預設標題帶 `id`（`${useId()}-title`）供 `aria-labelledby` 連結 |
| 內容 | 主體 `&__body` 帶 `id`（`${useId()}-body`），面板 `aria-describedby` 指向它（對齊 BaseDialog） |
| 關閉鈕 | `aria-label`（預設「關閉」，可用 `closeLabel` 覆寫供多語系），`&times;` 圖示標 `aria-hidden` |
| 遮罩 | `aria-hidden="true"`（純視覺，不進無障礙樹） |
| 鍵盤 | Esc 關閉（最上層）；focus-trap 鎖 Tab，關閉還焦 |
| 焦點 | 開啟即移入對話框；關閉還焦給觸發元素 |
| 自訂 `#header` | `aria-labelledby` 不自動連結 → 自行給標題 `id` 並處理 |

---

## 8. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 手動 `emit('update:modelValue')` | 違反 `defineModel` 規範 | 直接改 `open.value` / 用 `close()` |
| 同時 `hide-close-button` + `:close-on-backdrop="false"` + `:close-on-escape="false"` 又無 footer 關閉鈕 | 使用者無法關閉對話框 | 至少保留一個關閉入口 |
| 在父層加 `position`/`overflow` 想裁切 modal | 已 `Teleport` 到 body，裁不到 | 用 `--modal-*` token 或 slot 控制外觀 |
| 自訂 `#header` 卻期待 `aria-labelledby` 自動生效 | 元件無法得知自訂標題的 id | 自行給標題 `id` 並連結，或改傳 `ariaLabel` |
| 無 `title` / `ariaLabel` / 自訂連結 就開對話框 | 對話框無無障礙名稱 | 至少給 `title` 或 `ariaLabel` |
| 用 `v-if="open"` 包 `<BaseModal>` 外層 | 直接卸載會跳過 leave 動畫且 scroll-lock 來不及釋放 | 用 `v-model` 控制，讓元件自行處理進出場 |

---

## 9. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 開關 | `v-model`，外部按鈕開、關閉鈕關 |
| Esc 關閉 | 開啟後按 Esc 關閉 |
| 點外部關閉 | 點遮罩區關閉；點面板內不關 |
| 鎖外部關閉 | `:close-on-backdrop="false"`，點遮罩不關 |
| 鎖 Esc | `:close-on-escape="false"`，按 Esc 不關 |
| 標題與 a11y | `title="…"`，面板 `aria-labelledby` 指向標題 |
| 底部動作 | `#footer` 放「取消 / 確認」，`@click="close"` 可關 |
| 隱藏遮罩 | `hide-backdrop`，無視覺遮罩 |
| 隱藏關閉鈕 | `hide-close-button`，右上無 X |
| 鎖捲動 | 開啟時背景不可捲動，關閉還原 |
| 不鎖捲動 | `:lock-scroll="false"`，背景仍可捲動 |
| 焦點陷阱 | 連按 Tab 不跑出對話框；Esc 關閉並還焦 |
| 多層堆疊 | 開兩層，Esc 只關最上層；兩層皆關才解鎖捲動 |
| 自訂外殼 | `#header` 自訂標題列 + `hide-close-button` |
| 受控 / 非受控 | 綁 / 不綁 v-model 皆可關閉 |

---

## 附錄：與主流元件庫對照

| 概念 | Element Plus `<el-dialog>` | Ant Design `<Modal>` | Headless UI `<Dialog>` | BaseModal |
|---|---|---|---|---|
| 開關 | `v-model` | `open` + `onCancel` | `open` + `onClose` | `v-model`（受控 / 非受控自動） |
| 脫離裁切 | `append-to-body` | `getContainer` | Portal | 固定 `Teleport to="body"` |
| 焦點管理 | 部分 | 部分 | 完整 | focus-trap（鎖 Tab + 還焦） |
| 多層堆疊 | z-index 遞增 | z-index 遞增 | 巢狀 | `usePopupsManager` 堆疊（isTop 關閉 / isBottom 遮罩） |
| 背景捲動鎖定 | 內建 | 內建 | 內建 | `usePopupsManager` lock（補捲軸寬） |
| 結構 | header/body/footer slot | title/footer | 完全自訂 | header/default/footer slot + 預設外殼 |

**觀察**：

- **`defineModel` 受控 / 非受控自動**：不綁 v-model 也能用，綁了即受控
- **堆疊管理抽成 composable 單例**：Esc / 點外部只作用最上層（isTop）、遮罩只由最底層渲染（isBottom，疊加不變暗 / 不閃爍），scroll-lock 引用計數避免提早釋放
- **結構化外殼 + slot 自訂並存**：開箱即用，必要時用 `#header` / `#footer` 完全接管
- **SSR 安全**：DOM 操作守衛 + 初始 closed，伺服器端不輸出對話框
