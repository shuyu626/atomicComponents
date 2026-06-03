# Popover 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BasePopover.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/helpers/findFirstLegitChild.ts`（reference slot VNode 正規化）、`app/utils/toArray.ts`、`app/utils/toUnit.ts`。
> **外部依賴**：`@floating-ui/vue`（定位）、`focus-trap` + `tabbable`（焦點陷阱）。

BasePopover 是「錨定式浮層」元件：以使用者傳入的 `#reference` 元素為錨點，在其周邊彈出一塊浮層內容。底層用 [`@floating-ui/vue`](https://floating-ui.com/) 計算位置（含 `flip` 翻轉、`shift` 平移、可選 `arrow` 箭頭），用 `Teleport` 把浮層送到 `<body>` 避免被祖先的 `overflow` / `z-index` / `transform` 裁切，並以 `focus-trap` 在浮層內有可聚焦元素時鎖住 Tab。

它是 **dropdown / menu / tooltip / select 浮層 / 確認氣泡** 等元件的底座：本身只負責「觸發、定位、開關、無障礙與焦點」，浮層長相完全交給 default slot。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `#reference` slot | 單一可聚焦元素 | **required** | 浮層的錨點；元件量測它的位置、掛 `aria-*`、接觸發事件。純文字會自動包成 `<span role="button" tabindex="0">` |
| `#default` slot | `{ close, arrowStyle }` | **required** | 浮層內容。不傳則不渲染浮層 |
| `v-model`（對應 `modelValue`） | `boolean` | `false` | 開關狀態。**未綁定亦可運作**（內部狀態）；綁定後即受控 |

> **為什麼用 slot 而非 `content` prop**：浮層內容彈性最高（任意 HTML / 元件 / 互動表單），用 slot 比字串 prop 自然，且能透過 slot props 拿到 `close()`。

---

## 2. P1 進階 Props

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `trigger` | `'click' \| 'hover' \| 'focus' \| 'touch'` 或其陣列 | `'click'` | 觸發方式，可複選（如 `['hover','focus']`） |
| `placement` | `Side \| \`${Side}-${Alignment}\`` | `'bottom'` | 首選位置；空間不足時 `flip`/`shift` 自動調整。`Side`=top/right/bottom/left，`Alignment`=start/end |
| `offset` | `number \| { mainAxis?: number; crossAxis?: number }` | `8` | 浮層與 reference 的間距 |
| `arrow` | `{ element: HTMLElement \| null; padding?: number }` | — | 啟用箭頭定位；元件回傳 `arrowStyle` 經 slot 給你套用 |
| `autoFit` | `boolean` | `false` | 垂直放置時讓浮層寬度貼齊 reference（dropdown / select 用） |
| `disabled` | `boolean` | `false` | 整體禁用：不可觸發、不渲染浮層 |
| `role` | `string` | — | 浮層 ARIA role（`menu`/`listbox`/`dialog`/`tooltip`…），並推導 reference 的 `aria-haspopup` |
| `disableFocusTrap` | `boolean` | `false` | 關閉焦點陷阱（預設僅在浮層內有可聚焦元素時才啟用） |
| `hoverCloseDelay` | `number` | `120` | hover 觸發時滑出到關閉的延遲（ms），吃掉跨間隙的 `mouseleave` |

---

## 3. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `reference` | — | 觸發錨點。傳入單一元素（`<button>` / `<a>` …）；純文字 / `<svg>` 自動包成可聚焦 span |
| `default` | `{ close: () => void; arrowStyle: StyleValue }` | 浮層內容。`close()` 手動關閉；`arrowStyle` 套到 `arrow` prop 指定的箭頭元素上 |

### 不開放的設計

| 項目 | 為什麼 |
|---|---|
| 浮層容器標籤 / `Teleport` 目標 | 固定 `Teleport to="body"` 以脫離 `overflow`/`z-index` 裁切；自訂外觀請用 default slot 或覆寫 `--popover-*` token |
| 多個 reference 節點 | 錨點語意上唯一；slot 傳多節點時只取第一個合法節點（見 §5.1） |

---

## 4. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BasePopover from '~/components/atoms/BasePopover.vue'

const open = ref(false)
</script>

<template>
  <!-- 非受控：不綁 v-model 也能用 -->
  <BasePopover trigger="click" placement="bottom-start">
    <template #reference>
      <button type="button">開啟選單</button>
    </template>

    <template #default="{ close }">
      <ul>
        <li><button type="button" @click="close">選項一</button></li>
        <li><button type="button" @click="close">選項二</button></li>
      </ul>
    </template>
  </BasePopover>

  <!-- 受控：需要外部控制開關時綁 v-model -->
  <BasePopover v-model="open" :trigger="['hover', 'focus']" role="tooltip">
    <template #reference>
      <button type="button">說明</button>
    </template>
    <template #default>這是一段提示文字</template>
  </BasePopover>
</template>
```

### 帶箭頭

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import BasePopover from '~/components/atoms/BasePopover.vue'

const arrowEl = ref<HTMLElement | null>(null)
// 用 computed 組 arrow prop：物件參考穩定（只在 arrowEl 變動時才重算）。
const arrow = computed(() => ({ element: arrowEl.value, padding: 8 }))
</script>

<template>
  <BasePopover :arrow="arrow">
    <template #reference>
      <button type="button">Hover 我</button>
    </template>
    <template #default="{ arrowStyle }">
      <div>內容</div>
      <!-- my-arrow 需是「指向下方（▼）」的圖形，元件會依 placement 旋轉到正確方位 -->
      <div ref="arrowEl" class="my-arrow" :style="arrowStyle" />
    </template>
  </BasePopover>
</template>
```

`arrowStyle` 只負責**定位 + 依 placement 旋轉**（`top→0°`、`bottom→180°`、`left→-90°`、`right→90°`），它預期 `my-arrow` 本身是一個**指向下方（▼）的圖形**。請用三角形而非方塊，例如：

```css
.my-arrow {
  /* clip-path 切出 ▼ 並保留真實尺寸（floating-ui 才能正確置中）；白色接續浮層、drop-shadow 補輪廓 */
  width: 14px;
  height: 7px;
  background: var(--popover-bg, #fff);
  clip-path: polygon(50% 100%, 0 0, 100% 0);
  filter: drop-shadow(0 2px 1px rgb(0 0 0 / 7%));
}
```

> ⚠️ **箭頭接線務必用穩定參考**：箭頭元素用固定 template ref（`ref="arrowEl"`）+ `computed` 組 `arrow` prop。**切勿**用 `:ref="(el) => state = {...}"` 在 render 期間寫入新物件 —— 那會與 floating-ui 的自動重算形成無限迴圈，導致瀏覽器當掉。

---

## 5. 內部行為（實作必做）

### 5.1 reference 錨點解析

`#reference` slot 內容由使用者自由傳入，但元件需要**單一真實 DOM 元素**來量測位置、掛屬性、接事件。流程：

- 用 `findFirstLegitChild()` 從 slot VNode 取第一個合法節點：略過註解節點、`Fragment` 遞迴往內找、純文字 / `<svg>` 包成 `<span role="button" tabindex="0">`、其餘元素直接用
- 用 inline `defineComponent` + 自訂指令（`mounted`/`updated`/`unmounted`）抓到該節點的真實 `el` 存進 `referenceRef`
- `<ReferenceComponent>` 上的 `aria-*` 與事件監聽透過 **Vue fallthrough attributes** 自動落到該節點（單根節點 + `inheritAttrs` 預設 true）

### 5.2 定位（floating-ui）

- `useFloating(referenceRef, popoverRef, { open, transform: false, placement, whileElementsMounted: autoUpdate, middleware })`
- middleware 順序：`offset` → `flip` → `shift({ padding: 8 })` →（可選）`autoFit` →（可選）`arrow`
- `autoUpdate` 在捲動 / resize 時自動重算位置（popover 不鎖捲動）
- `arrowStyle` 由 `middlewareData.arrow` 的座標 + 依放置側旋轉組成，用 `toUnit` 轉單位
- **`transform: false`（用 top/left 定位）**：避免與浮層 `scale` 進場動畫搶 `transform`，也讓 `isPositioned` 切換的 CSS transition 正常運作（見 §5.6）

### 5.3 開關與觸發

| 觸發 | reference 事件 | 行為 |
|---|---|---|
| `click` | `click` / `keydown`(Enter/Space) | toggle。`keydown` 對「會原生觸發 click 的元素」（`button` / `summary` / `a[href]` / `input` button 類）跳過以免雙重 toggle；只有 `span` / `div` 等自製 `role="button"`（如純文字 reference）才手動處理 |
| `hover` | `mouseenter` / `mouseleave`（reference 與浮層皆掛） | 滑入開；滑出延遲 `hoverCloseDelay` 才關，期間滑回任一側取消關閉 |
| `focus` | `focus` / `blur` | 聚焦開、失焦關（適合**非互動**提示；互動內容請用 `click`，見 §6） |
| `touch` | `touchstart.passive` | toggle |

- 所有寫入經 `setOpen(value)` 單一入口，`disabled` 時一律拒絕
- 子元件**直接改 `open.value`**（`defineModel`），不手動 `emit`

### 5.4 關閉行為

- **Esc**：`document` keydown 監聽，按下即關
- **點擊外部**：`document` click 監聽，用 `event.composedPath()` 判斷點擊是否落在 reference / 浮層內（含 Shadow DOM），都不在才關
- **`close()`**：透過 default slot props 提供，讓內容（如選單項）主動關閉
- 監聽於 `onMounted` 掛、`onUnmounted` 卸，並清除 hover timer 與 focus-trap

### 5.5 焦點陷阱（focus-trap）

- `watch(popoverRef)`：浮層掛載時，若**未設 `disableFocusTrap` 且 `tabbable(popover).length > 0`** → `createFocusTrap` 並 `activate`
- 浮層卸載（`open=false` → `v-if` 移除）→ `deactivate`
- `clickOutsideDeactivates: true`、`escapeDeactivates: false`（Esc 交給 §5.4 統一處理，同時關閉浮層）
- 純提示（無可聚焦內容）不啟用 trap，不干擾頁面焦點

### 5.6 渲染條件與 SSR

- `shouldRenderPopover = !disabled && #reference && #default && open`
- 浮層用 `Teleport to="body"` 脫離裁切；**先掛載供 floating-ui 量測，再以 `isPositioned` 控制顯示**：未定位前 `opacity: 0` 藏住，定位算完才加上 `--positioned` class 淡入 + `scale`。這能消除「浮層先閃現在畫面左上角（`top/left:0`）再跳到 reference 旁」的問題；`prefers-reduced-motion` 下關閉動畫
- 初始 `open` 預設 `false` → SSR 不輸出浮層、`document` 監聽只在 `onMounted`（client）掛，SSR 安全

---

## 6. 邊界處理

| 情境 | 行為 |
|---|---|
| 未綁 `v-model` | 用內部狀態（`default: false`），照常開關 |
| `disabled` | 不觸發、不渲染浮層；`setOpen` 一律拒絕；reference 標 `aria-disabled` |
| `#reference` 傳純文字 | 自動包成 `<span role="button" tabindex="0">`，補可聚焦語意 |
| `#reference` 傳多節點 / `<template>` | 取第一個合法節點當錨點（`findFirstLegitChild` 遞迴 Fragment） |
| 無 `#default` | 不渲染浮層（`shouldRenderPopover` 為 false） |
| hover 跨 `offset` 間隙 | `hoverCloseDelay` 延遲關閉 + 浮層自身的 `mouseenter` 取消關閉，不閃爍 |
| `focus` 觸發 + 互動內容 | 焦點移入浮層會使 reference `blur` 而關閉 → **互動內容請改用 `click`** |
| 浮層內無可聚焦元素 | 不啟用 focus-trap |
| 元件卸載時浮層仍開 | `onUnmounted` 卸監聽、清 timer、`deactivate` trap，無殘留 |

---

## 7. A11y Checklist

| 對象 | 必做 |
|---|---|
| reference | `aria-haspopup`（由 `role` 推導：popup widget role 用該 role、`tooltip` 不設、其餘預設 `true`）、`aria-expanded`（跟隨開關）、`aria-controls`（指向浮層 id）；`disabled` 時 `aria-disabled` |
| 浮層 | `id`（`useId()`，與 `aria-controls` 配對）、`role`（由 prop 指定，如 `menu`/`dialog`/`tooltip`） |
| 鍵盤 | `click` 觸發支援 Enter/Space；Esc 關閉；focus-trap 鎖 Tab（有可聚焦內容時） |
| 焦點 | 浮層內有可聚焦元素 → 啟用 trap；純提示 → 不干擾焦點 |
| 觸發語意 | 純文字 reference 自動補 `role="button" tabindex="0"` |

---

## 8. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| `focus` 觸發包互動表單 | 焦點移入浮層使 reference blur → 浮層關閉 | 互動內容用 `click` |
| 把浮層內容寫成 `content` 字串 prop | 失去 HTML / 元件 / 互動彈性 | 用 `#default` slot |
| 自己在父層加 `position`/`overflow` 想裁切浮層 | 浮層已 `Teleport` 到 body，裁不到 | 用 `--popover-*` token 或 slot 控制外觀 |
| 手動 `emit('update:modelValue')` | 違反 `defineModel` 規範 | 直接改 `open.value` / 用 `close()` |
| reference 傳多個並排元素 | 只有第一個合法節點被當錨點，其餘不接事件 | reference 只放單一錨點元素 |
| 重內容 popover 用 `hover` 且 `hoverCloseDelay: 0` | 跨間隙閃爍 | 保留預設延遲或改 `click` |
| `arrow` 用 `:ref="(el) => state = {...}"` 在 render 期間寫新物件 | 與 floating-ui 自動重算形成無限迴圈、瀏覽器當掉 | 固定 `ref="arrowEl"` + `computed` 組 `arrow`（參考穩定） |

---

## 9. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 點擊開關 | `trigger="click"`，點 reference 開、再點關、點外部關 |
| 鍵盤開關 | reference 聚焦按 Enter/Space 開、Esc 關 |
| hover 提示 | `trigger="hover"` `role="tooltip"`，滑入開、滑出延遲關 |
| hover 不閃爍 | hover 開啟後，滑鼠跨 `offset` 移到浮層，浮層不關 |
| focus 提示 | `trigger="focus"`，Tab 聚焦 reference 開、移開關 |
| 複合觸發 | `:trigger="['hover','focus']"`，滑入或聚焦都開 |
| 自動翻轉 | reference 貼近視窗底部，`placement="bottom"` 自動翻到 top |
| 自動平移 | reference 貼近視窗邊緣，浮層 `shift` 不超出 |
| 對齊變體 | `placement="bottom-start"` / `bottom-end` |
| 自訂間距 | `:offset="16"` 或 `:offset="{ mainAxis: 12, crossAxis: 4 }"` |
| 箭頭 | `:arrow="{ element, padding: 8 }"`，箭頭跟隨翻轉旋轉 |
| 寬度貼齊 | `auto-fit`，浮層寬度 = reference 寬度（dropdown） |
| 受控 | `v-model="open"`，外部按鈕也能開關 |
| 非受控 | 不綁 v-model，仍可開關 |
| 禁用 | `disabled`，點 / hover / focus 皆無反應 |
| 焦點陷阱 | 浮層內含按鈕 → Tab 循環不跑出；Esc 關閉並還焦 |
| 純提示不鎖焦 | 浮層只有文字 → 不啟用 trap |
| slot 關閉 | default slot 內 `@click="close"` 能關閉 |
| 純文字 reference | `#reference` 直接放文字 → 自動可聚焦 |
| 捲動重定位 | 開啟後捲動頁面，浮層跟隨 reference |

---

## 附錄：與主流元件庫對照

| 概念 | Element Plus `<el-popover>` | Ant Design `<Popover>` | Headless UI `<Popover>` | BasePopover |
|---|---|---|---|---|
| 觸發 | `trigger`(click/hover/focus/contextmenu) | `trigger` | 固定 click | `trigger`（可陣列複選） |
| 定位 | Popper.js | dom-align | floating-ui | floating-ui（flip/shift/arrow） |
| 內容 | slot / `content` | slot / `content` | slot | `#default` slot（含 `close`/`arrowStyle`） |
| 受控 | `v-model:visible` | `open` + `onOpenChange` | 內部 | `v-model`（受控/非受控自動） |
| 脫離裁切 | `teleported` | `getPopupContainer` | Portal | 固定 `Teleport to="body"` |
| 焦點管理 | 部分 | 部分 | 完整 | focus-trap（有可聚焦內容時） |

**觀察**：

- **`trigger` 支援陣列複選**：`['hover','focus']` 一次涵蓋滑鼠 + 鍵盤可達性
- **`defineModel` 受控/非受控自動**：不綁 v-model 也能用，綁了即受控，無需額外 composable 或樣板
- **floating-ui middleware 鏈**：`flip`/`shift`/`arrow`/`autoFit` 組合，定位邏輯穩定且可組裝
- **焦點與關閉行為內建**：focus-trap + Esc + click-outside 一次到位，dropdown/menu/dialog 直接當底座
