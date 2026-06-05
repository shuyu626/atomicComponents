# Dropdown 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseDropdown.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）、`docs/components/BasePopover.md`（底層浮層）。
> **底座**：`app/components/atoms/BasePopover.vue`（觸發 / 定位 / 開關 / focus-trap / Esc / click-outside 全交給它）。
> **共用工具**：`app/utils/dom.ts`（`moveFocus` / `nextItem` / `previousItem` 鍵盤導覽）、`app/utils/isFunction.ts`、`app/utils/noop.ts`。

BaseDropdown 是「資料驅動的選單（menu）」元件：傳入 `items` 陣列 + 一個 `#reference` 觸發錨點，點擊 / hover 後彈出一份 `role="menu"` 的選項清單，並內建 WAI-ARIA menu 的鍵盤導覽（↑↓ / Home / End / Enter / Space / Esc / Tab）。

它本身**不重造浮層**：定位、開關、focus-trap、Esc、點擊外部關閉全部委派給 [BasePopover](./BasePopover.md)，BaseDropdown 只負責「把 items 正規化成選單項 + roving tabindex 鍵盤導覽 + 點擊行為」。適用於 **操作選單、下拉動作、更多選項（⋯）、帳號選單** 等情境。

> **與 select 的差異**：BaseDropdown 是「執行動作」的 menu（`role="menu"` / `menuitem`），不是「選值」的 listbox。需要單 / 複選值請另用 select 類元件（`role="listbox"` / `option` + `aria-selected`）。

---

## 1. P0 必備介面

| 介面 | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `items` | `BaseDropdownItem<Value, Context>[]` | `[]` | 選單資料來源；每項含 `label` / `value` / 可選 `onClick` / `disabled` / `context` |
| `#reference` slot | 單一可聚焦元素 | **required** | 觸發錨點，透傳給 BasePopover；純文字會自動包成 `<span role="button" tabindex="0">` |
| `v-model`（對應 `modelValue`） | `boolean` | `false` | 開關狀態。**未綁定亦可運作**（內部狀態）；綁定後即受控 |

### `BaseDropdownItem` 結構

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `label` | `string` | ✓ | 顯示文字，可被 `#menuitem` slot 覆寫 |
| `value` | `Value` | ✓ | 該項的值，回傳於 `onClick` 與 slot props；同時是 `v-for` 的 key，**需唯一** |
| `onClick` | `(value, close) => void` | — | 點擊回呼，依宣告參數數量決定關閉時機（見 §5.3） |
| `disabled` | `boolean` | — | 禁用此項：不可點、鍵盤導覽跳過、標 `aria-disabled` |
| `context` | `Context` | — | 附帶資料，原封不動傳進 `#menuitem` slot props（icon / 說明…） |

---

## 2. P1 進階 Props（透傳 BasePopover）

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `trigger` | `'click' \| 'hover' \| 'focus' \| 'touch'` 或其陣列 | `'click'` | 觸發方式，可複選 |
| `placement` | `BasePopoverPlacement` | `'bottom-start'` | 首選位置；空間不足時自動 `flip`/`shift` |
| `offset` | `number \| { mainAxis?: number; crossAxis?: number }` | `8` | 選單與 reference 的間距 |
| `disabled` | `boolean` | `false` | 整體禁用：不可觸發、所有項目視為 disabled |
| `autoFit` | `boolean` | `false` | 選單寬度貼齊 reference（垂直放置時，select 風格下拉常用） |

> `placement` 預設為 `bottom-start`（非 BasePopover 的 `bottom`）：選單慣例靠左對齊起始邊，符合多數操作選單的視覺預期。

---

## 3. Slot 設計

| Slot | Slot props | 用途 |
|---|---|---|
| `reference` | — | 觸發錨點，透傳給 BasePopover 的 `#reference`（單一元素 / 純文字自動補可聚焦語意） |
| `menuitem` | `{ label, value, context?, disabled }` | 自訂單項渲染（icon、雙列文字、危險動作配色…）。預設僅渲染 `{{ label }}` |

### 不開放的設計

| 項目 | 為什麼 |
|---|---|
| 選單容器標籤（固定 `<ul role="menu">` / `<li role="menuitem">`） | menu 的 ARIA 角色語意固定；自訂外觀請用 `#menuitem` slot 或覆寫 `--dropdown-*` / `--popover-*` token |
| 浮層定位 / `Teleport` / 焦點陷阱 | 全部委派 BasePopover，避免兩處 drift（見 [BasePopover.md](./BasePopover.md) §5） |
| `onClick` 以外的事件透傳 | 互動語意收斂在 `items[].onClick` 與 `#menuitem` slot，避免散落的 emit |

---

## 4. 基本用法

```vue
<script setup lang="ts">
import BaseDropdown from '~/components/atoms/BaseDropdown.vue'
import type { BaseDropdownItem } from '~/components/atoms/BaseDropdown.vue'

const items: BaseDropdownItem<string>[] = [
  { label: '編輯', value: 'edit', onClick: (value) => console.log(value) },
  { label: '複製', value: 'copy', onClick: (value) => console.log(value) },
  { label: '刪除', value: 'delete', disabled: true },
]
</script>

<template>
  <!-- 非受控：不綁 v-model 也能用 -->
  <BaseDropdown :items="items" placement="bottom-start">
    <template #reference>
      <button type="button">操作 ▾</button>
    </template>
  </BaseDropdown>
</template>
```

### 自訂單項渲染（`#menuitem`）

```vue
<template>
  <BaseDropdown :items="items">
    <template #reference>
      <button type="button">更多 ⋯</button>
    </template>

    <template #menuitem="{ label, context, disabled }">
      <span class="row" :class="{ 'row--danger': context?.danger }">
        <component :is="context?.icon" />
        {{ label }}
      </span>
    </template>
  </BaseDropdown>
</template>
```

### 非同步動作（自己掌控關閉時機）

```vue
<script setup lang="ts">
import type { BaseDropdownItem } from '~/components/atoms/BaseDropdown.vue'

const items: BaseDropdownItem<string>[] = [
  {
    label: '存檔並關閉',
    value: 'save',
    // 宣告第二參數 close → 元件不自動關閉，等 await 完成再手動關
    onClick: async (value, close) => {
      await save(value)
      close()
    },
  },
]
</script>
```

### 受控 + 寬度貼齊

```vue
<template>
  <BaseDropdown v-model="open" :items="items" auto-fit>
    <template #reference>
      <button type="button">選擇欄位</button>
    </template>
  </BaseDropdown>
</template>
```

---

## 5. 內部行為（實作必做）

### 5.1 架構：薄包一層 BasePopover

- BaseDropdown 把 `trigger` / `placement` / `offset` / `disabled` / `autoFit` 原樣透傳給 BasePopover。**刻意不傳 `role`**：否則浮層容器 div 會掛 `role="menu"`，與內層 `<ul role="menu">` 形成巢狀 menu（語意＝子選單）。不傳 role 時 reference 的 `aria-haspopup` 退回 `"true"`（ARIA 規範中 `true` ≡ `menu`，語意相同），唯一的 menu 即下方 `<ul>`。
- `#reference` slot 直接轉交 BasePopover 的 `#reference`，**不自行包裝 ReferenceComponent**（reference 正規化、量測、事件全在 BasePopover）。
- 選單本體 `<ul role="menu">` 放在 BasePopover 的 default slot；浮層的 bg / border / shadow / padding 來自 BasePopover（可覆寫 `--popover-*`）。

### 5.2 items 正規化（`itemsCompose`）

每個 item 透過 `computed` 正規化成可渲染結構，附上：

- `disabled = props.disabled || item.disabled`（整體禁用會蓋過單項）
- **roving tabindex**：只有「第一個未禁用項」拿 `tabindex=0`（Tab 進入點），其餘 `-1`，方向鍵在其間移動
- `aria-disabled`：禁用項標 `true`，讓 `moveFocus` 跳過（見 §5.4）
- `onClick` / `onKeydown`（Enter / Space）事件處理

### 5.3 點擊行為（`onClick` 的參數契約）

| `item.onClick` | 行為 |
|---|---|
| 未提供 | 點擊僅 `close()` 關閉選單 |
| 宣告 **0–1 個參數**（`(value) => {}`） | 執行 handler 後**自動 `close()`** |
| 宣告 **2 個參數**（`(value, close) => {}`） | 把 `close` 交給 handler，**不自動關閉**（非同步流程適用） |

- 判斷依據是函式的 `Function.length`（不含預設值 / rest 之後的參數）。
- 禁用項的 `onClick` 直接 return，不觸發。

### 5.4 鍵盤導覽（WAI-ARIA menu 模式）

選單容器 `@keydown` 統一處理（用 `app/utils/dom.ts` 的共用工具）：

| 按鍵 | 行為 |
|---|---|
| `ArrowDown` / `ArrowUp` | `moveFocus` 移到下 / 上一個可聚焦項，到頭尾繞回 |
| `Home` / `End` | 跳到第一 / 最後一個可聚焦項 |
| `Enter` / `Space` | 觸發該項 `onClick`（在 `<li>` 的 `onKeydown`） |
| `Tab` | 關閉選單（焦點由 BasePopover 的 focus-trap 還給 reference） |
| `Esc` | 關閉選單（由 BasePopover 統一處理） |

- `moveFocus` 自動跳過 `disabled`（`HTMLButtonElement.disabled`）與 `aria-disabled="true"` 的節點，並繞圈回到起點時回 `false` 避免無限迴圈。
- **∴ 禁用項必須標 `aria-disabled`**，否則鍵盤導覽會停在禁用項上（本元件已處理，見 §5.2）。

### 5.5 開關與焦點

- `defineModel<boolean>({ default: false })`：未綁 v-model 用內部狀態，綁了即受控。
- 開啟時 BasePopover 的 focus-trap 會把焦點移到第一個可聚焦項（即 `tabindex=0` 的項目）。
- 關閉（選取 / Esc / Tab）時 focus-trap `deactivate` 把焦點還給 reference；**點擊外部關閉**則不搶焦（`clickOutsideDeactivates`），讓點擊落在目標上。
- 全項皆 disabled → 無 `tabindex=0` 項 → 無可聚焦內容 → BasePopover 不啟用 focus-trap。

---

## 6. 邊界處理

| 情境 | 行為 |
|---|---|
| `items` 為空 | 渲染空的 `<ul role="menu">`，無項目 |
| `disabled`（元件層） | 不可觸發；所有項目視為 disabled、標 `aria-disabled`、無 `tabindex=0` |
| 首項 `disabled` | `tabindex=0` 落在第一個未禁用項，Tab 不卡在禁用項 |
| 全部項目 `disabled` | 無可聚焦項，不啟用 focus-trap，鍵盤導覽無作用對象 |
| `onClick` 為非同步 | 宣告 `(value, close)` 兩參數，`await` 後自行 `close()` |
| `#reference` 傳純文字 | 由 BasePopover 自動包成 `<span role="button" tabindex="0">` |
| 未綁 `v-model` | 用內部狀態，照常開關 |
| 元件卸載時選單仍開 | BasePopover 於 `onUnmounted` 卸監聽、清 timer、`deactivate` trap |

---

## 7. A11y Checklist

| 對象 | 必做 |
|---|---|
| reference | `aria-haspopup="true"`（≡ menu；刻意不傳 role 以免容器 div 與 ul 巢狀 menu）、`aria-expanded` 跟隨開關、`aria-controls` 指向浮層 |
| 選單容器 | `role="menu"`、`tabindex="-1"`（容器本身不進 Tab 序，靠內部 roving） |
| 選單項 | `role="menuitem"`、roving `tabindex`（首個可聚焦項 0、其餘 -1）、禁用項 `aria-disabled="true"` |
| 鍵盤 | ↑↓ 移動、Home/End 跳頭尾、Enter/Space 觸發、Esc / Tab 關閉 |
| 焦點 | 開啟移入第一可聚焦項；選取 / Esc / Tab 還焦 reference；點外部不搶焦 |

---

## 8. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 禁用項只設 `disabled` 不設 `aria-disabled` | `moveFocus` 靠 `aria-disabled` 判斷，鍵盤會停在禁用項 | 用本元件（已自動標）或務必補 `aria-disabled` |
| roving tabindex 固定第 0 項拿 `tabindex=0` | 首項 disabled 時 Tab 焦點卡在禁用項 | 改用「第一個未禁用項」當進入點（本元件已處理） |
| 用 BaseDropdown 做單 / 複選「選值」 | menu 語意是「執行動作」，非選值 | 選值請用 listbox / select 類元件（`aria-selected`） |
| 非同步動作卻用 `(value) => {}` 單參數 | 會在 `await` 前就自動關閉選單 | 宣告 `(value, close)` 兩參數，自行 `close()` |
| 在父層加 `overflow`/`position` 想裁切選單 | 選單已由 BasePopover `Teleport` 到 body | 用 `--dropdown-*` / `--popover-*` token 或 `#menuitem` slot |
| `value` 重複 | `v-for` key 衝突、選取對應錯亂 | `value` 在同組內必須唯一 |

---

## 9. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 點擊開關 | 預設 `trigger="click"`，點 reference 開、點外部 / Esc 關 |
| 鍵盤開啟 | reference 聚焦按 Enter/Space 開，焦點落到第一項 |
| 方向鍵導覽 | ↓↑ 在項目間移動、到頭尾繞回 |
| Home / End | 跳到第一 / 最後一個可聚焦項 |
| 選取項目 | Enter / Space / 點擊觸發 `onClick`，預設自動關閉 |
| 跳過禁用項 | 含 `disabled` 項，↓↑ 自動略過 |
| 首項禁用 | 第一項 `disabled`，Tab 焦點落在第二項（首個可聚焦） |
| 非同步動作 | `(value, close)` 兩參數，await 後手動關閉 |
| 自訂渲染 | `#menuitem` slot 加 icon / 配色 |
| 寬度貼齊 | `auto-fit`，選單寬度 = reference 寬度 |
| 受控 | `v-model="open"`，外部按鈕也能開關 |
| 整體禁用 | `disabled`，點 / hover 皆無反應 |
| 還焦 reference | 選取 / Esc / Tab 關閉後焦點回到觸發鈕 |
| 點外不搶焦 | 點擊頁面他處關閉，焦點落在點擊目標 |

---

## 附錄：與主流元件庫對照

| 概念 | Element Plus `<el-dropdown>` | Ant Design `<Dropdown menu>` | Headless UI `<Menu>` | BaseDropdown |
|---|---|---|---|---|
| 資料來源 | slot `<el-dropdown-item>` | `menu.items` 設定物件 | slot `<MenuItem>` | `items` 陣列（`label`/`value`/`onClick`） |
| 觸發 | `trigger`(hover/click/contextmenu) | `trigger` | 固定 click | `trigger`（透傳 BasePopover，可陣列複選） |
| 定位 | Popper.js | dom-align | floating-ui | floating-ui（委派 BasePopover） |
| 鍵盤導覽 | 內建 | 內建 | 內建（roving） | roving tabindex + `moveFocus`（共用 `dom.ts`） |
| 關閉控制 | `hide-on-click` | `menu.onClick` | 自動 | `onClick` 參數數量決定（0–1 自動 / 2 手動） |
| 焦點管理 | 部分 | 部分 | 完整 | 委派 BasePopover focus-trap |

**觀察**：

- **薄包 BasePopover**：定位 / 開關 / 焦點 / Esc / click-outside 不重造，dropdown 只專注「items → menu + 鍵盤導覽」，避免雙處 drift。
- **`onClick` 參數契約**：用 `Function.length` 區分「自動關閉」與「手動關閉」，非同步動作不需額外 prop。
- **roving tabindex 修正**：進入點取「第一個未禁用項」而非固定第 0 項；禁用項補 `aria-disabled` 讓 `moveFocus` 正確跳過 —— 這兩點是參考實作常見的 a11y 疏漏。
