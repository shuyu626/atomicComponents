# Tabs 元件規範

> **歸屬**:`Base*` 通用元件家族(`app/components/atoms/BaseTabs.vue`、`app/components/atoms/BaseTabPanel.vue`)。
> **配套**:`docs/components/component-design-spec.md`(跨元件通用原則)。
> **共用工具**:`app/utils/dom.ts`(焦點遍歷,roving tabindex 元件可重用)、`app/utils/isNullOrUndefined.ts`。

BaseTabs 是「分頁切換」元件,以 WAI-ARIA Tabs 模式呈現一排 `role="tab"` 按鈕,搭配 `BaseTabPanel` 顯示對應內容。採 **provide / inject** 共享 context:`BaseTabs` 管 tablist 與選中狀態,`BaseTabPanel` 依注入的 context 決定自己該不該顯示,並建立 `aria-controls` ↔ `aria-labelledby` 的雙向關聯。

資料模型走 **items 驅動**:caller 傳 `items: BaseTabsItem[]`,元件負責渲染 tab 按鈕、roving tabindex、鍵盤導覽;面板內容則放在預設 slot 內的 `<BaseTabPanel>`,以 `value` 對應到各 tab。

---

## 1. 元件組成

| 元件 | 職責 | 對外介面 |
|---|---|---|
| `BaseTabs` | 渲染 tablist、管理選中值(`v-model`)、鍵盤導覽、provide context | `items` / `v-model` / slots |
| `BaseTabPanel` | inject context,依 `value` 對應顯示 / 隱藏並建立 a11y 關聯 | `value` / `lazy` / 預設 slot |

> 為什麼拆兩個:面板內容彈性最高(任意 HTML / 元件),用獨立元件 + inject 比把內容塞進 `items` 更自然,也讓 tab 與 panel 的 DOM 位置解耦(橫排時 tablist 在上、面板在下;直排時 tablist 在左、面板在右,各自渲染)。

---

## 2. P0 必備 Props

### BaseTabs

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `v-model`(對應 `modelValue` / `update:modelValue`) | `T` | — | 當前選中的 tab value。用 `defineModel<T>()`,泛型對齊 `items` 的 value 型別 |
| `items` | `BaseTabsItem<T>[]` | **required** | tab 列表。資料驅動,元件不靠 slot 掃描子節點推導 tab |

### BaseTabPanel

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `value` | `unknown` | **required** | 對應某個 tab 的 `value`;與當前選中值相符時顯示 |
| `lazy` | `boolean` | `false` | 首次顯示前不渲染內容,第一次顯示後才掛載並保留(內容重 / 需 fetch 時用) |

---

## 3. P1 進階 Props(BaseTabs)

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `disabled` | `boolean` | `false` | 整體禁用(所有 tab 不可點 / 不可聚焦) |
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | 排列方向。`vertical` 時 tablist 縱向堆疊於左、面板在右,指示線移到 tab 右側,方向鍵改用 `↑`/`↓`;同步影響 `aria-orientation` |
| `activation` | `'manual' \| 'automatic'` | `'manual'` | 鍵盤啟用方式。`manual` 方向鍵只移焦點(Enter/Space 才切);`automatic` 方向鍵移到即切換 |
| `color` | `'primary' \| 'danger' \| 'success' \| 'warning' \| 'info' \| 'neutral'` | `'primary'` | 語意色彩。一次切換選中態的文字 / 指示底線 / 淺色底 / focus ring(由 `--tabs-accent` 統一驅動,色票對齊 BaseButton) |
| `onBeforeChange` | `(value) => boolean \| void \| Promise<boolean \| void>` | — | 切換前攔截。回傳 `false`(或 Promise resolve `false`)取消;拋錯 / reject 也取消。詳見 §6.4 |
| `ariaLabel` | `string` | — | tablist 的無障礙名稱。同頁多組 tabs 時建議填,SR 才能區分 |

### `BaseTabsItem<Value>` 結構

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `value` | `Value` | required | tab 唯一識別值,同時是 `v-model` 綁定值。**建議用 string / number 等原始型別**(見 §7.2) |
| `label` | `string` | required | 顯示文字(可被 `#tab` slot 覆寫外觀,仍作為預設內容) |
| `disabled` | `boolean` | `false` | 是否禁用此單一 tab |

---

## 4. Slot 設計

### BaseTabs

| Slot | Slot props | 用途 | 預設 |
|---|---|---|---|
| `tab` | `{ item }`(含 `value` / `label` / `selected` / `disabled`) | 自訂單一 tab 按鈕內容(加 icon、badge…) | `{{ item.label }}` |
| `default` | — | 放置對應的 `<BaseTabPanel>` | — |

### BaseTabPanel

| Slot | 用途 |
|---|---|
| `default` | 面板內容 |

### 不開放的 slot

| Slot | 為什麼不開 |
|---|---|
| 整個 `tab` 按鈕(含 `<button>` 本體) | 破壞 roving tabindex / a11y 屬性的統一管理;只開放按鈕「內容」 |
| `tablist` 容器自訂 | tablist 結構與 `role` 固定,需自訂排版用 CSS token / class 覆寫 |

---

## 5. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import BaseTabs from '~/components/atoms/BaseTabs.vue'
import BaseTabPanel from '~/components/atoms/BaseTabPanel.vue'
import type { BaseTabsItem } from '~/components/atoms/BaseTabs.vue'

const current = ref('profile')

const items: BaseTabsItem<string>[] = [
  { value: 'profile', label: '個人資料' },
  { value: 'security', label: '帳號安全' },
  { value: 'billing', label: '帳單', disabled: true },
]
</script>

<template>
  <BaseTabs v-model="current" :items="items" aria-label="帳號設定">
    <BaseTabPanel value="profile">個人資料內容…</BaseTabPanel>
    <BaseTabPanel value="security">帳號安全內容…</BaseTabPanel>
    <BaseTabPanel value="billing">帳單內容…</BaseTabPanel>
  </BaseTabs>
</template>
```

### 自訂 tab 外觀(`#tab` slot)

```vue
<BaseTabs v-model="current" :items="items">
  <template #tab="{ item }">
    <MyIcon :name="item.value" />
    <span>{{ item.label }}</span>
  </template>

  <BaseTabPanel v-for="item in items" :key="item.value" :value="item.value">
    …
  </BaseTabPanel>
</BaseTabs>
```

---

## 6. 內部行為(實作必做)

### 6.1 元件結構與 a11y 角色

| 元素 | role | 必備屬性 |
|---|---|---|
| tablist 容器 | `tablist` | `aria-label`(建議)、`aria-orientation`(`horizontal` / `vertical`,跟隨 `orientation` prop) |
| tab 按鈕 | `tab` | `aria-selected`、`aria-controls`(指向 panel id)、`tabindex`(roving) |
| panel | `tabpanel` | `aria-labelledby`(指向 tab id)、`tabindex="0"`(僅在顯示中且面板內無可聚焦元素時)、`hidden`(未選中時) |

- **tab 用原生 `<button type="button">`**:取得原生鍵盤 / focus / disabled 行為,不自製 `<div onClick>`
- **id 用 `useId()` 產生**:SSR 安全且唯一;`tab` 與 `panel` 共用同一組 base id 配對

### 6.2 選中判斷與 roving tabindex

採 WAI-ARIA Tabs 慣例:

- 選中且啟用的 tab → `aria-selected="true"` + `tabindex="0"`;其餘 → `aria-selected="false"` + `tabindex="-1"`
- **無可聚焦的選中 tab**(`v-model` 初值不在 `items` 內,**或選中項剛好被 disabled**)→ 第一個「啟用」的 tab 補 `tabindex="0"`,否則整個 tablist 無法用 Tab 鍵進入
- 一組 tabs 只會有一個 `aria-selected="true"`(由單一 `v-model` 值保證)

### 6.3 鍵盤導覽

方向鍵移動 focus(跳過 disabled、頭尾環繞);切換時機由 `activation` 決定:

- **`manual`(預設)**:方向鍵只移動 focus,需 `Enter` / `Space`(原生 button 行為)或點擊才切換。面板內容重 / 需 lazy 時較合適。
- **`automatic`**:方向鍵移到哪就切到哪(選中跟著焦點走)。

| 按鍵 | 行為 |
|---|---|
| `←` / `→`(horizontal)<br>`↑` / `↓`(vertical) | 移動 focus 到上 / 下一個 tab。軸向跟隨 `orientation` |
| `Home` | focus 第一個可聚焦 tab(兩種方向皆適用) |
| `End` | focus 最後一個可聚焦 tab(兩種方向皆適用) |
| `Enter` / `Space` | 切換到當前 focus 的 tab(`manual` 時的主要切換方式) |

> **跨軸方向鍵不攔截**:horizontal 時按 `↑`/`↓`、vertical 時按 `←`/`→` 不做事(`event.preventDefault` 不觸發),交還瀏覽器預設行為 — 對齊 WAI-ARIA Tabs 慣例。

焦點遍歷邏輯抽到 `~/utils/dom.ts`(`moveFocus` / `nextItem` / `previousItem`),純 DOM 操作、無 Vue 狀態,其他 roving tabindex 元件(Toolbar、Menu)可重用。`moveFocus` 內建「繞行一圈回起點即停」防呆,避免全 disabled 時無限迴圈。

**已知行為 / 限制**

- `automatic` 同時搭配 `onBeforeChange`:方向鍵會先移動焦點再觸發攔截,若攔截取消切換,會出現「焦點已移、選中未變」的短暫不同步(屬正常 roving 行為)。重面板 / 需攔截的情境建議用 `manual`。
- 方向鍵軸向以**書寫方向為 LTR** 為前提(`←`=上一個、`→`=下一個);目前**未針對 RTL 對調**。RTL 站點若需鏡像,請在外層自行處理或提需求擴充。

### 6.4 切換攔截(onBeforeChange)

採**回傳值**判斷(不靠參數個數,避免脆弱):

| hook 回傳 | 行為 |
|---|---|
| 未提供 hook | 直接切換 |
| `false` | 取消切換 |
| `true` / `undefined` / 不回傳 | 照常切換 |
| `Promise<...>` | 等 resolve;resolve `false` 才取消(非同步確認) |
| **拋錯 / Promise reject** | **取消切換**,dev 環境 `console.error` |

```ts
// 同步:回傳 false 取消
const onBeforeChange = (value: string) => window.confirm(`切到 ${value}?`)

// 非同步:表單有未存變更時先確認
const onBeforeChange = async () => (isDirty.value ? await confirmLeave() : true)
```

- **點當前 tab 不觸發**:`model.value === value` 時直接 return,避免 `v-model` 無謂更新與 hook 誤觸
- **連點防呆**:非同步確認用遞增編號,較慢 resolve 的舊請求會被作廢(不會蓋掉最後選的)
- **錯誤策略**:hook 拋錯 / reject 一律**取消切換**,使用端程式碼出錯不會讓元件當掉
- 子元件**直接改 `model.value`** 切換(`defineModel`),不手動 `emit('update:modelValue')`

### 6.5 面板顯示策略

- `BaseTabPanel` 預設**保持掛載**,只用 `hidden` 屬性切換顯示 / 隱藏 → 保留面板內部狀態(輸入框、捲動位置)
- 加 **`lazy`** 則首次顯示前不渲染內容,第一次顯示後才掛載並保留(適合內容重 / 需 fetch 的面板)
- `value !== current` → `hidden`
- **`tabindex` 自動判斷**:面板顯示中、且**內部沒有可聚焦元素**時才補 `tabindex="0"`(WAI-ARIA);若面板內已有可聚焦元素則不掛,避免多一個 Tab 停靠點
- 無 `BaseTabs` 父層時(獨立使用),或 `value` 對不到任何 tab,`BaseTabPanel` 退化為單純 `<div>`(不掛 `role` / `tabindex`),交由 caller 控制

---

## 7. 邊界處理

### 7.1 常見邊界

| 情境 | 行為 |
|---|---|
| `v-model` 初值不在 `items` 內 | 無 tab 選中;第一個啟用 tab 取得 `tabindex=0`,所有 panel 隱藏 |
| 整組 `disabled` | 所有 tab disabled、不可聚焦;方向鍵找不到可聚焦目標時不動作 |
| 選中的 tab 被設 `disabled` | 仍標記為選中(`aria-selected="true"`)但自身不可聚焦;`tabindex="0"` 自動 fallback 給第一個啟用 tab,tablist 仍能用 Tab 鍵進入 |
| 連點切換 + 非同步攔截 | 較慢 resolve 的舊 Promise 會被 token 機制判定過期而捨棄,只切到最後請求的 tab(見 §6.4) |
| `onBeforeChange` 拋錯 / reject | 取消切換、不讓元件當掉(dev 會 console.error) |
| `items` 為空陣列 | 渲染空 tablist;不報錯 |

### 7.2 為什麼 `value` 建議用原始型別

`value` 同時用於:`v-model` 比對(`===` 嚴格相等)、`lookup` Map 的 key、`v-for` 的 `:key`。物件 / 陣列以參考相等比對,容易因每次 render 產生新參考而失準。**用 string / number** 最穩定。元件內部 id 已改用 `index` 組字串(不直接用 `value`),所以 `value` 含特殊字元也不影響 id 合法性。

---

## 8. A11y Checklist

| 情境 | 必做 |
|---|---|
| tablist | `role="tablist"`,建議補 `aria-label`(同頁多組時必填)、`aria-orientation` 跟隨 `orientation` |
| tab 按鈕 | `role="tab"` + `aria-selected` + `aria-controls`(指向 panel) |
| panel | `role="tabpanel"` + `aria-labelledby`(指向 tab) |
| 當前 tab | `aria-selected="true"`(唯一);`tabindex="0"`,其餘 `-1` |
| 鍵盤 | `←/→`(horizontal)或 `↑/↓`(vertical)移動 focus、`Home/End` 跳首尾、`Enter/Space` 切換 |
| Disabled tab | `<button disabled>`,鍵盤導覽自動跳過 |
| Focus indicator | `:focus-visible` outline ring(滑鼠點擊不顯示) |
| 隱藏面板 | `hidden` 屬性 + 移除 `tabindex`,SR 與 Tab 都略過 |
| 可聚焦面板 | 顯示中、且**內部無可聚焦元素**的 panel 才補 `tabindex="0"`;面板內已有可聚焦元素則不補,避免多一個 Tab 停靠點(WAI-ARIA APG) |

---

## 9. 反模式(常見錯誤)

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 用 `<div @click>` 當 tab | 無 button 語意 / 無原生鍵盤行為 | 用 `<button role="tab">` |
| 所有 tab 都 `tabindex="0"` | 破壞 roving tabindex,Tab 鍵要按很多次才跳出 tablist | 只選中(或 fallback)一個為 0 |
| 重面板卻用 `activation="automatic"` | 每次移動焦點都切換 + 重渲染,卡頓 | 重面板用 `manual`(預設);輕量內容才用 `automatic` |
| panel 用 `v-if` 卸載 | 切回來時面板狀態(輸入 / 捲動)全失 | 預設保持掛載,只切 `hidden`;要延遲建立用 `lazy` |
| `value` 用物件 | 參考相等難比對,`v-model` / key 失準 | 用 string / number |
| 手動 `emit('update:modelValue')` | 違反 `defineModel` 規範 | 直接改 `model.value` |
| 多個 tab 同時 `aria-selected="true"` | SR 混亂 | 單一 `v-model` 值保證唯一 |
| 隱藏面板留著 `tabindex="0"` | Tab 會聚焦到看不見的內容 | 隱藏時移除 `tabindex` |

---

## 10. 跨情境驗收清單

| 情境 | 操作 / Props |
|---|---|
| 標準三分頁 | `items` 三筆,點擊切換 |
| 垂直排列 | `orientation="vertical"`,tablist 在左、面板在右,指示線在右側 |
| 垂直鍵盤 | vertical 下按 `↑/↓` 移動 focus;按 `←/→` 不動作 |
| 鍵盤左右移動 | focus tab 後按 `←/→`,focus 移動但不切換 |
| `Home` / `End` | 跳首 / 尾可聚焦 tab |
| 跳過 disabled | 中間 tab `disabled`,方向鍵略過它 |
| 整體禁用 | `disabled`,所有 tab 不可點 |
| 無初始選中 | `v-model` 初值不在 items,第一 tab 取得 `tabindex=0`,panel 全隱藏 |
| 自動啟用 | `activation="automatic"`,方向鍵移到即切換 |
| 同步攔截 | `onBeforeChange` 回傳 `false` 取消 / 其餘切換 |
| 非同步攔截 | `onBeforeChange` 回傳 Promise,resolve `false` 取消 |
| 攔截拋錯 | hook 拋錯 / reject → 取消切換、不當掉 |
| 點當前 tab | 不觸發 hook、不切換 |
| 自訂 tab 外觀 | `#tab` slot 加 icon |
| 面板狀態保留 | 面板內輸入文字 → 切走再切回 → 文字還在 |
| 延遲掛載 | `<BaseTabPanel lazy>`,首次顯示後才建立內容 |
| 分頁過多 | tab 超出寬度 → tablist 可水平捲動,不擠壓 |
| 獨立 / 孤兒 panel | 無父層或 value 對不到 tab → 退化為純 div(無 role / tabindex) |
| 多組 tabs 同頁 | 各組 `aria-label` 不同,id 不衝突(`useId`) |

---

## 附錄:與主流元件庫對照

| 概念 | MUI `<Tabs>` | Vuetify `<v-tabs>` | Ant Design `<Tabs>` | Element Plus `<el-tabs>` | BaseTabs |
|---|---|---|---|---|---|
| 資料模型 | children `<Tab>` | `items` / slot | `items`(v5) | slot `<el-tab-pane>` | `items` prop |
| 當前值 | `value` + `onChange` | `v-model` | `activeKey` + `onChange` | `v-model` | `v-model` |
| 面板關聯 | 另接 `<TabPanel>` | slot per tab | `items[].children` | `<el-tab-pane>` | `<BaseTabPanel value>` |
| 鍵盤啟用 | 可設 auto / manual | 自動 | 自動 | 自動 | `activation`(manual / automatic) |
| 切換前攔截 | ❌(自行擋) | ❌ | ❌ | `before-leave`(回傳值 / Promise) | `onBeforeChange`(回傳值 / Promise) |
| 焦點遍歷抽出 | 內部 | 內部 | 內部 | 內部 | ✅ (`utils/dom.ts` 可重用) |

**觀察**:

- **`items` 驅動 tab + 獨立 `BaseTabPanel`**:tab 列與面板 DOM 解耦,面板內容彈性最大
- **`activation` 可切 manual / automatic**:重面板用 manual、輕量用 automatic,兩種 WAI-ARIA 模式都支援
- **`onBeforeChange` 用回傳值 / Promise**:對齊 Element Plus `before-leave`,比 callback 簽章更不易誤用,且內建錯誤 = 取消切換
- **焦點遍歷獨立成 util**:其他 roving tabindex 元件(Toolbar / Menu)可直接重用
