# List 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseList.vue`、`app/components/atoms/BaseListItem.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **復用**：`app/components/atoms/BaseLink.vue`（連結項的渲染與 prefetch / 安全性）。

BaseList 是 **語意列表容器**：渲染 `<ul>` / `<ol>` 並重置原生 list 樣式（marker / margin / padding），版面交給子元件 BaseListItem。`size`（內距 / 字級）與 `divided`（項目分隔線）透過 **provide / inject** 傳給每個 item，統一整份清單的外觀。

BaseListItem 是清單的單一項目：根一律 `<li>`，內容區為 flex row（`prepend` + `body` + `append`）。有 `to` / `href` 時整列用 `<BaseLink>` 包起變成 **可點列**（鍵盤 / 焦點 / 外部連結安全性全交給 BaseLink），並支援 `active`（高亮 + `aria-current`）與 `disabled`。

兩者皆走 CSS token（`--list-*` / `--list-item-*`），可跨專案主題化。BaseListItem 可 **standalone**（不包在 BaseList 內）使用，此時降級為 `size='md'`、`divided=false`。

設計取捨：

- **語意由 `as` 決定** — `ul`（無序）/ `ol`（有序）由 caller 選，元件不替你選語意。
- **連結不自己重寫** — 可點列直接委派 `<BaseLink>`，不自行處理 router / 外部連結 / `rel`。
- **狀態走 prop、內容走 slot** — `active` / `disabled` 是 prop；圖示 / 內文 / 操作皆 slot，最大彈性。

---

## 1. Props

### BaseList

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `as` | `'ul' \| 'ol'` | `'ul'` | 根元素語意標籤；無序 / 有序由 caller 決定 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 項目內距 / 字級，透過 context 傳給每個 item |
| `divided` | `boolean` | `false` | 項目之間加分隔線（第一項前不畫）；**僅 `itemShape="square"` 有效** |
| `itemShape` | `'square' \| 'rounded' \| 'shaped'` | `'square'` | 項目形狀（高亮外觀）：`square` 滿版方角 / `rounded` 圓角藥丸 + 間距（導覽抽屜風格）/ `shaped` 單邊全圓藥丸（trailing 端全圓、leading 端平齊；註：與 Vuetify `shaped` 的對角圓角不同） |

**BaseList Slots**

| Slot | 說明 |
|---|---|
| `#default` | 放一組 `<BaseListItem>` |

### BaseListItem

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `to` | `string \| Record<string, unknown>` | — | router 目標（內部連結）；有 `to` 或 `href` 其一則整列可點 |
| `href` | `string` | — | 外部連結 URL；有 `to` 或 `href` 其一則整列可點 |
| `active` | `boolean` | `false` | 高亮目前 / 選中項目；連結項時對連結加 `aria-current="true"` |
| `disabled` | `boolean` | `false` | 禁用：連結項不可點（`aria-disabled` + `pointer-events:none` + 移出 tab 順序） |

**BaseListItem Slots**

| Slot | 說明 |
|---|---|
| `#prepend` | 前置區（icon / avatar / checkbox…） |
| `#default` | 主要內容（body）；提供 `#subtitle` 時作為**標題行** |
| `#subtitle` | 次要說明行；提供時項目變**兩行**（標題 + 副標，常用於通訊錄 / 通知清單） |
| `#append` | 後置區（次要文字 / 操作 / chevron…） |

> `size` / `divided` **不是** BaseListItem 的 prop —— 由父層 BaseList 透過 context 注入，確保整份清單一致。standalone（無 BaseList）時降級為 `md` / 不分隔。兩元件皆純展示，無 emits / v-model。

### BaseListGroup（可折疊子群組）

放在 `<BaseList>` 內，包一組 `<BaseListItem>` 成為可展開 / 收合的導覽子群組（側欄常見）。標題列為 `<button>`（帶 `aria-expanded` / `aria-controls`），右側自動渲染收合箭頭（展開時朝上），子項目縮排顯示；size 沿用 List context。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `title` | `string` | — | 群組標題（也可用 `#title` slot 覆寫） |
| `v-model:open` | `boolean` | `false` | 展開狀態；未綁定亦可運作（內部狀態） |
| `disabled` | `boolean` | `false` | 禁用：不可展開 / 收合 |

| Slot | 說明 |
|---|---|
| `#prepend` | 群組標題前的圖示 / 頭像 |
| `#title` | 群組標題內容（否則用 `title` prop） |
| `#default` | 子項目：一組 `<BaseListItem>` |

- **收合以 `v-show` 實作**：收合時子項 `display:none` → 不可 Tab、不在 SR 樹（a11y 正確）。
- token：`--list-group-indent`（子項縮排，預設 `2.25rem`）、`--list-group-chevron-color`（箭頭色，預設 gray-400）；header 的內距 / hover / 字級沿用 `--list-item-*`。

---

## 2. Context 機制（provide / inject）

BaseList 用 `provide` 提供一組 context，BaseListItem 用 `inject` 取用：

```ts
// BaseList.vue（module <script>）—— symbol key + 明確型別
export interface BaseListContext {
  size: ComputedRef<BaseListSize>
  divided: ComputedRef<boolean>
  itemShape: ComputedRef<BaseListItemShape>
}
export const BASE_LIST_INJECT_KEY: InjectionKey<BaseListContext> = Symbol('BaseList')

// BaseList.vue（setup）—— 以 computed 提供，變動時 item 自動反映
provide(BASE_LIST_INJECT_KEY, {
  size: computed(() => props.size),
  divided: computed(() => props.divided),
  itemShape: computed(() => props.itemShape),
})

// BaseListItem.vue —— inject 第二參數 null 作降級預設
const context = inject(BASE_LIST_INJECT_KEY, null)
const size = computed(() => context?.size.value ?? 'md')
const itemShape = computed(() => context?.itemShape.value ?? 'square')
// divided 僅 square 有效
const divided = computed(() => (context?.divided.value ?? false) && itemShape.value === 'square')
```

對齊 BaseAccordion / BaseAccordionPanel 的同款模式：**父提供、子注入、standalone 降級**。

---

## 3. BaseLink 復用

有 `to` / `href` 時，內容區用 `<component :is>` 切成 `<BaseLink>`（否則為 `<div>`）：

```vue
<component
  :is="isInteractive ? BaseLink : 'div'"
  class="base-list-item__content"
  :to="isInteractive ? linkTarget : undefined"
  :aria-current="isInteractive && active ? 'true' : undefined"
  :aria-disabled="isInteractive && disabled ? 'true' : undefined"
  :tabindex="isInteractive && disabled ? -1 : undefined"
>
```

- `to` 與 `href` 收斂成單一 `linkTarget` 交給 BaseLink：內部 / 外部由 **BaseLink 依 protocol 自行判斷**（`href` 帶 `http(s)://` 等 → 渲染 `<a>`；`to` 相對路徑 → RouterLink / NuxtLink）。
- BaseListItem **不**自行處理 router / `rel="noopener"` / prefetch —— 全交給 BaseLink，避免重複造輪子與安全性遺漏。
- `class` / `aria-current` / `aria-disabled` / `tabindex` 透過 BaseLink 的 attribute fallthrough 落到最終的 `<a>` / RouterLink 上。

---

## 4. CSS 客製化（token）

**BaseList（`--list-*`）**

| Token | 預設 | 作用 |
|---|---|---|
| `--list-bg` | `transparent` | 列表底色 |
| `--list-color` | `#1f2937`（gray-800） | 內文色（cascade 給 item） |
| `--list-divider-color` | `#e5e7eb`（gray-200） | 項目分隔線色 |
| `--list-gap` | `0`（導覽模式 `2px`） | 項目間距（`rounded` / `shaped` 用間距分隔） |
| `--list-padding` | `0`（導覽模式 `6px`） | 列表內距（導覽模式讓藥丸內縮不貼邊） |

**BaseListItem（`--list-item-*`）**

| Token | 預設 | 作用 |
|---|---|---|
| `--list-item-padding-y` | `10px`（md） | 垂直內距（sm/md/lg 由 size modifier 覆寫） |
| `--list-item-padding-x` | `12px`（md） | 水平內距（sm/md/lg 由 size modifier 覆寫） |
| `--list-item-font-size` | `0.875rem`（md） | 字級（sm/md/lg 由 size modifier 覆寫） |
| `--list-item-gap` | `0.75rem` | prepend / body / append 之間的間距 |
| `--list-item-hover-bg` | `#f9fafb`（gray-50） | 可點列 hover 背景 |
| `--list-item-active-bg` | `#eff6ff`（blue-50） | active 高亮背景 |
| `--list-item-active-color` | `#1d4ed8`（blue-700） | active 文字色 + focus ring 色 |
| `--list-item-radius` | `8px` | `rounded` / `shaped` 導覽模式的藥丸圓角 |
| `--list-item-subtitle-color` | `#6b7280`（gray-500） | `#subtitle` 副標文字色 |

尺寸級距（padding 對齊 `BaseTable` cell）：`sm = 6/10px`、`md = 10/12px`、`lg = 14/16px`；字級 `sm = 0.8125rem`、`md = 0.875rem`、`lg = 1rem`。

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseList class="brand-list" divided>
    <BaseListItem to="/a" active>項目</BaseListItem>
  </BaseList>
</template>

<style scoped>
.brand-list {
  --list-divider-color: #ddd6fe;
  --list-item-active-bg: #ede9fe;
  --list-item-active-color: #6d28d9;
}
</style>
```

---

## 5. 基本用法

```vue
<template>
  <!-- 純文字清單 -->
  <BaseList>
    <BaseListItem>第一項</BaseListItem>
    <BaseListItem>第二項</BaseListItem>
  </BaseList>

  <!-- 分隔線 + 尺寸 -->
  <BaseList size="lg" divided>
    <BaseListItem>帳號設定</BaseListItem>
    <BaseListItem>通知</BaseListItem>
  </BaseList>

  <!-- icon + 次要資訊 + 高亮 -->
  <BaseList divided>
    <BaseListItem active>
      <template #prepend><InboxIcon /></template>
      收件匣
      <template #append><span class="count">12</span></template>
    </BaseListItem>
  </BaseList>

  <!-- 可點導覽清單（內部 / 外部連結） -->
  <BaseList divided>
    <BaseListItem to="/dashboard" active>儀表板</BaseListItem>
    <BaseListItem to="/reports">報表</BaseListItem>
    <BaseListItem href="https://example.com">外部連結</BaseListItem>
    <BaseListItem to="/archived" disabled>封存（停用）</BaseListItem>
  </BaseList>

  <!-- 有序列表 -->
  <BaseList as="ol">
    <BaseListItem>建立帳號</BaseListItem>
    <BaseListItem>驗證電子郵件</BaseListItem>
  </BaseList>

  <!-- standalone（無 BaseList，降級 md） -->
  <ul>
    <BaseListItem to="/x">單獨使用的項目</BaseListItem>
  </ul>
</template>
```

---

## 6. 行為與狀態

- **樣式重置**：BaseList 清掉 `list-style` / `margin` / `padding`，避免原生 marker 與縮排干擾排版；語意仍是 `<ul>` / `<ol>`。
- **context 統一**：`size` / `divided` / `itemShape` 由 BaseList 一次決定，所有 item 同步；改 BaseList 的 prop 會即時反映到每個 item。
- **分隔線**：`divided`（僅 `square`）時每個 item 加 `base-list-item--divided`，用相鄰選擇器 `& + &` 在項目之間畫 `border-top`（第一項前不畫），色彩走 `--list-divider-color`。
- **項目形狀（`itemShape`）**：`rounded` / `shaped` 為「導覽抽屜」樣式 —— 列表加 `--list-padding` 內縮、item 間加 `--list-gap`，高亮（hover / active）變成藥丸：`rounded` 為圓角矩形、`shaped` 為單邊全圓（trailing 端全圓、leading 端平齊，用 logical 圓角屬性支援 RTL）。此模式下 `divided` 自動失效（改用間距分隔）。
- **兩行項目**：提供 `#subtitle` slot 時 body 變成「標題 + 副標」兩行（副標較小、走 `--list-item-subtitle-color`）；未提供時維持單行、DOM 不變（向後相容）。
- **可點列判定**：`to` 或 `href` 任一存在 → `base-list-item--interactive`，內容區改用 `<BaseLink>` 包整列、`cursor:pointer`、hover 換背景。
- **active**：加 `base-list-item--active`（背景 + 文字色），連結項另加 `aria-current="true"`。
- **disabled**：加 `base-list-item--disabled`（半透明、`cursor:not-allowed`），連結項 `pointer-events:none` + `tabindex="-1"` + `aria-disabled="true"`。
- **內容溢出**：`__body` 為 `flex:1 1 auto; min-width:0`，允許內文 truncate（caller 自行加 `overflow`）而不撐爆列。
- **standalone 降級**：BaseListItem 沒有父 context 時 `size='md'`、`divided=false`，仍可單獨用在任意 `<ul>` / `<ol>` 或選單結構中。

---

## 7. A11y

- **語意結構**：`<ul>`/`<ol>` + `<li>` 是原生列表語意；`as` 選對無序 / 有序。
  - ⚠️ 因為重置了 `list-style` 並用 flex 排版，**Safari + VoiceOver 會剝除清單語意**（不再朗讀「清單，N 項」）。故容器顯式補 `role="list"`、item 補 `role="listitem"` 把語意找回來。
  - `as="ol"` 已重置原生 marker、**不顯示數字編號**；`role="list"` 提供「清單」語意但不含「有序」，若序位對使用者重要，請在項目文字中自帶序號（如「1. …」）。
- **可點列**：委派 `<BaseLink>` → 渲染真正的 `<a>` / RouterLink，天生鍵盤可達（Tab 聚焦、Enter 觸發）、SR 讀為連結，`:focus-visible` 有 ring。**不**用 `@click` 套在 `<li>` 上假裝可點。
- **目前項目**：`active` 的連結項加 `aria-current="true"`，讓 SR 標示「目前所在」；非連結的 active 僅視覺高亮、不加 `aria-current`（避免對非連結節點誤用）。
- **禁用連結**：`disabled` 連結加 `aria-disabled="true"` + `tabindex="-1"` 移出 tab 順序 + `pointer-events:none`，避免「看得到卻點不動又能被 Tab 聚焦」的落差。
- **裝飾性圖示**：`#prepend` 放的 icon 請自行標 `aria-hidden="true"`（語意由 body 文字承載）。
- **分隔線純視覺**：`divided` 只是 `border`，不建立額外語意，不干擾 SR 朗讀。

---

## 8. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | `size` / `divided` 走 context，不做成 item 的 prop | 整份清單外觀應一致；避免逐項重複設定與 drift，對齊 Accordion 的 provide/inject 模式 |
| 2 | 可點列委派 `<BaseLink>`，不自己寫連結 | router / 外部連結 / `rel` / prefetch 已由 BaseLink 處理，重寫易漏安全性；符合「函式複用」原則 |
| 3 | `to` / `href` 收斂成單一 `linkTarget` | BaseLink 已能依 protocol 分辨內外部，item 不需再分兩條渲染分支 |
| 4 | BaseListItem 可 standalone 降級 | 選單 / 下拉等情境可能單獨用 item；無 context 時安全退回 md / 不分隔，不 crash |
| 5 | 用 `<ul>`/`<ol>` + 顯式 `role="list"` / `role="listitem"` | 重置 list 樣式（無 marker）後，Safari + VoiceOver 會剝除清單語意；補 role 找回語意，兼顧視覺與 a11y，而非改用純 `<div>` |
| 6 | `active` 對非連結項不加 `aria-current` | `aria-current` 語意屬於「導覽中的目前連結」，用在純文字項目會誤導 SR |

---

## 9. 與主流框架對照與取捨

對照 Vuetify(`v-list` / `v-list-item`)、Element Plus、Quasar(`QList` / `QItem`)、Nuxt UI：

**已覆蓋（對齊主流）**

- 容器 + 項目雙元件、context 傳遞尺寸 / 分隔（≈ Vuetify `v-list` density、Quasar `QList` bordered / separator）。
- 項目三段式版面 prepend / body / append（≈ Quasar `QItemSection` side、Vuetify `#prepend` / `#append`）。
- 可點列 + active / disabled（≈ Vuetify `v-list-item` `to` / `active` / `disabled`、Quasar `QItem` `clickable`）。
- 全 token 化、語意標籤可選（`as`）。

**刻意未做（及理由）**

| 框架有、本元件沒有 | 取捨理由 |
|---|---|
| 選取 / 多選狀態管理（Vuetify `v-list` `selectable` / `v-model`） | 選取邏輯屬更高層（選單 / 樹狀）情境，Atom 層先保持純展示；需要時由 caller 或後續 `BaseMenu` 承載 |
| 巢狀群組 / 子清單（Vuetify `v-list-group`） | 巢狀屬版面組合，caller 可自行巢狀 `BaseList`；不在本元件內建折疊邏輯（那是 Accordion 的職責） |
| `clickable` 這個獨立 prop（Quasar） | 本元件以「有無 `to` / `href`」判定可點，避免「clickable 但沒有連結目標」的空互動 |
| 純 `@click` 事件列（無連結目標） | design-spec 強調避免假互動；要事件驅動的列建議由 caller 在 `#append` 放 `BaseButton`，語意更清楚 |

---

## 10. 測試與 Storybook

- [x] **Vitest**
  - `tests/components/atoms/BaseList.spec.ts`（`as` ul/ol、`role="list"`、`size` / `divided` / `itemShape` modifier、context 傳遞、`shaped` 時 `divided` 失效）— 14 cases
  - `tests/components/atoms/BaseListItem.spec.ts`（`<li>` 根 + `role="listitem"`、standalone 降級、context size、prepend/append/default/subtitle slot（含兩行）、`to` → BaseLink、`href` → 外部 `<a>`、`active` + `aria-current`、`disabled` + `aria-disabled` + `tabindex`）— 15 cases
  - `tests/components/atoms/BaseListGroup.spec.ts`（`<li role="listitem">` + button header、`role="list"` panel（ARIA：`listitem` 的 owner 必須是 `list`，`role="group"` 內放 listitem 是 invalid ARIA）、`aria-controls`/`aria-expanded`、open v-model 切換與收合、disabled 不切換、prepend/title slot、子項渲染、context size）— 9 cases
- [x] **Storybook**
  - `stories/components/atoms/BaseList.stories.ts`（Playground / Basic / Divided / Sizes / WithIconsAndActions / Links / Ordered / Nav / Shaped / TwoLine / NavWithGroups / Themed）
  - `stories/components/atoms/BaseListItem.stories.ts`（Playground / Slots / States / Standalone）
  - `stories/components/atoms/BaseListGroup.stories.ts`（Playground / States / NavSidebar / Controlled）
