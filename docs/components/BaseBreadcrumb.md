# Breadcrumb 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseBreadcrumb.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）、`docs/components/BaseLink.md`（內部連結委派）。

BaseBreadcrumb 是「網站階層位置指示器」，以語意化 `<nav><ol>` 結構呈現使用者從根節點到當前頁的路徑。連結行為**完全委派** BaseLink，因此自動繼承跨環境（NuxtLink / RouterLink / `<a>`）fallback、`target="_blank"` 安全 rel、viewport preload 等行為，本元件不再重複造輪子。

---

## 1. P0 必備 Props

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `items` | `BreadcrumbItem[]` | — | 麵包屑路徑。**最後一項通常不傳 `to`**，將自動標記為當前頁 |
| `separator` | `string \| Component` | `'/'` | 項目間分隔符。字串直接渲染、Component 走 `<component :is>` |
| `ariaLabel` | `string` | `'Breadcrumb'` | `<nav>` 的 aria-label。多國語站需傳入翻譯後字串（例：`'麵包屑'`） |

### `BreadcrumbItem` 結構

| 欄位 | 型別 | 必填 | 說明 |
|---|---|---|---|
| `to` | `RouteLocationRaw` | 否 | route 目標。**不提供時渲染為 `<span>`**，視為當前頁 |
| `label` | `string` | ✅ | 顯示文字。同時作為 a11y 名稱，iconOnly 模式下用 sr-only 給 SR 讀 |
| `icon` | `Component` | 否 | 任意 Vue Component，渲染在 label 前。不耦合 icon library |
| `iconOnly` | `boolean` | 否 | 是否只顯示 icon（需搭配 `icon`），label 改用 sr-only |

---

## 2. P1 / P2 進階 Props（目前未實作，延伸時參考）

| Prop | 型別 | 用途 | 備註 |
|---|---|---|---|
| `maxItems` | `number` | 超過時中間摺疊為 `…` | 長路徑常見需求；摺疊處可放展開觸發 |
| `itemsBeforeCollapse` / `itemsAfterCollapse` | `number` | 摺疊時保留前 / 後幾項 | 搭配 `maxItems` |
| `expandText` | `string` | 摺疊按鈕的 a11y 標籤 | 預設 `'Show path'` |
| `linkComponent` | `Component` | 覆寫內部連結元件 | 多數情境用 BaseLink 即可，逃生口 |
| `structuredData` | `boolean` | 輸出 schema.org BreadcrumbList JSON-LD | SEO 重點頁面用；預設關（避免重複） |
| `current` | `number \| 'last' \| 'none'` | 顯式指定當前頁 index | 預設 `'last'`；少數頁需自訂 |

---

## 3. Slot 設計

| Slot | Slot props | 用途 | 注意 |
|---|---|---|---|
| `item` | `{ item, index, isCurrent }` | 完全自訂單一項目內容 | 預設渲染 `icon + label`；覆寫後自行處理樣式 |
| `separator` | `{ index }` | 完全自訂分隔符 | 優先於 `separator` prop |

### 不開放的 slot

| Slot | 為什麼不開 |
|---|---|
| `prepend` / `append` | 整體前後綴的需求極少，且難與 `<ol>` 語意對齊 — 真的要做請外層包 |
| `home` / `current` | 用 `item` slot 配合 `isCurrent` / `index === 0` 已足夠，多開 slot 反而混淆 API |

---

## 4. 內部行為（實作必做）

### 4.1 元件結構

```
<nav aria-label="Breadcrumb">
  <ol>
    <li>
      <BaseLink :to> 或 <span>  ← 視 item.to 是否存在
        [icon] + label
      </>
      <span aria-hidden="true"> ← separator（最後一項不渲染）
    </li>
    ...
  </ol>
</nav>
```

- **必用 `<nav>`**：landmark 角色，SR 可以直接跳到麵包屑導覽
- **必用 `<ol>`**：有序列表，明確表達層級先後（`<ul>` 語意較弱）
- **必用 `<li>`**：每項目都是 list item
- **`aria-label` 必填**：SR 用來區分頁面內可能存在的多個 `<nav>` landmark

### 4.2 當前頁判斷（aria-current）

採 **WAI-ARIA Breadcrumb 慣例**：陣列的**最後一項一律視為當前頁**，自動補 `aria-current="page"`。

| 最後一項 | 渲染為 | 行為 |
|---|---|---|
| 有 `to`（少見） | `BaseLink` + `aria-current="page"` | 仍可點，但視覺上強化（粗體、不底線），caller 可透過 CSS 取消 `pointer-events: none` |
| 無 `to`（建議） | `<span>` + `aria-current="page"` | 純文字，無互動 |

**不**額外暴露 `current` prop 讓使用者手動指定 — 經驗上 caller 會忘記，導致 SR 找不到當前位置。如果需要「中間某項為當前」（非典型情境），未來再加 P2 prop。

#### 覆寫「最後一項仍可點」的具體寫法

預設規則 `.base-breadcrumb__link[aria-current='page'] { pointer-events: none }` 的 specificity 為 `(0,2,0)`。要解除互動鎖定，覆寫 selector 至少要打平甚至加強，並且建議放在元件 scoped style 之外（page 層或全域）：

```scss
// page-level 覆寫：最後一項仍可點、加底線提示
.my-page .base-breadcrumb__link[aria-current='page'] {
  pointer-events: auto;
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

注意：解除 `pointer-events: none` 後，視覺上跟「非當前頁連結」幾乎相同，請保留 `aria-current="page"` 讓 SR 仍能識別當前位置。

### 4.3 連結委派 BaseLink

每個有 `to` 的項目都透過 `<BaseLink :to>` 渲染，**不自己處理** NuxtLink / RouterLink / `<a>` 判斷。這帶來：

- 自動取得 BaseLink 的 fallback chain（NuxtLink → RouterLink → `<a>`）
- 自動取得 viewport-based preload（NuxtLink 環境用內建、否則用 BaseLink 內建 IntersectionObserver）
- `to` 是 object / string 都支援
- 跨 Vite-SPA / Nuxt 不需條件分支

### 4.4 Separator

| 規則 | 實作 |
|---|---|
| 預設 `'/'` | 字串直接渲染為文字節點 |
| Component | `typeof separator !== 'string'` → 走 `<component :is>`，支援任意 Vue Component |
| 最後一項後不渲染 | `v-if="index < items.length - 1"` |
| `aria-hidden="true"` | 純視覺，SR 應略過（SR 自己會用 list 的層級感知斷句） |
| Slot 覆寫 | `<slot name="separator" :index>` 優先於 prop |

### 4.5 Icon 與 iconOnly

| 情境 | 行為 |
|---|---|
| 有 `icon`，無 `iconOnly` | icon + label 並列；icon 包 `aria-hidden="true"`（裝飾性） |
| 有 `icon`，有 `iconOnly` | icon 顯示、label 套 sr-only class（視覺隱藏、SR 仍讀得到） |
| 無 `icon`，有 `iconOnly` | `iconOnly` 被忽略（無 icon 時強制隱藏 label 會讓元件「啞」），label 正常顯示 |

> sr-only 樣式採 WCAG 標準（`clip: rect(0,0,0,0)` + 1×1 px），不依賴外部 mixin。

### 4.6 其他行為

| 行為 | 實作 |
|---|---|
| SSR 安全 | setup 階段不存取 `document` / `window`，無副作用 |
| 透傳 attrs | 預設 fallthrough；`data-testid` / `class` 都能透過到 `<nav>` |
| 響應式 wrap | `<ol>` 採 `flex-wrap: wrap` + `row-gap`，視窗窄時自動換行 |
| 連結 focus | 委派給 BaseLink + 本元件補 `:focus-visible` outline ring |

---

## 5. A11y Checklist

| 情境 | 必做 |
|---|---|
| `<nav>` landmark | 必填 `aria-label`（預設 `Breadcrumb`，i18n 時翻譯）|
| 當前頁標記 | 最後一項自動補 `aria-current="page"`（本元件已內建） |
| 分隔符 | `aria-hidden="true"`（SR 應靠 list 結構而非分隔符斷句） |
| Icon 裝飾 | icon 包 `aria-hidden="true"`，label 仍給 SR 讀 |
| icon-only 項目 | label 套 sr-only 仍保留，SR 念得到「Home, link」 |
| Focus indicator | `:focus-visible` outline ring，禁 `outline: none` 無備案 |
| 鍵盤導覽 | 由 BaseLink 透過原生 `<a>` 提供，不另外處理 |
| 對比度 | 預設 token `--bc-color: gray-600`、`--bc-current-color: gray-900`，對白底 ≥ 4.5:1 ✅ |

---

## 6. 反模式（常見錯誤）

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 用 `<div>` + 自製分隔符 | 無 landmark、SR 不認得是導覽 | 用 `<nav><ol>` |
| `<ul>` 取代 `<ol>` | 麵包屑有先後順序，`<ol>` 才準確 | 用 `<ol>` |
| 最後一項仍為 `<a>` 沒 `aria-current` | SR 不知道當前位置 | 本元件自動補；caller 用陣列最後一項即可 |
| 分隔符渲染為實體文字 / 無 `aria-hidden` | SR 會念「斜線、斜線、斜線」 | 用 `aria-hidden="true"` |
| 在元件內寫死 `<HomeIcon>` 給首項 | 耦合特定 icon library | 透過 `item.icon` prop 傳入任意 Component |
| 為了「進階」加 home prop / current prop / link prop | API 膨脹，使用情境 < 5% | 用 `item` slot 覆寫即可 |
| `separator` 用字串 emoji 拼貼樣式 | i18n / RTL 不友善 | 視覺強的分隔符用 Component（SVG）|
| 把整個 `<BaseBreadcrumb>` 包在 `<a>` 裡 | 巢狀互動，無效 HTML | 不要 |
| 元件內 fetch route metadata 自動生成 items | 耦合路由設計，難測 | items 由 caller 從 router meta / breadcrumb store 算好傳入 |

---

## 7. 跨情境驗收清單

寫完後逐項試，API 撐不撐得住：

| 情境 | Props 組合 |
|---|---|
| 標準 3 階 | `[{to:'/',label:'Home'},{to:'/products',label:'Products'},{label:'Detail'}]` |
| 單一項（只有當前頁） | `[{label:'Home'}]` → 不渲染任何 separator |
| 首頁 icon-only | `[{to:'/',label:'首頁',icon:HomeIcon,iconOnly:true}, ...]` |
| 自訂字串 separator | `separator=">"` |
| 自訂 Component separator | `:separator="ChevronRight"` |
| Slot 完全覆寫 item | `<template #item="{item,isCurrent}">...</template>` |
| Slot 覆寫 separator | `<template #separator>|</template>` |
| 多國語 aria-label | `aria-label="麵包屑"`（i18n key 翻譯後傳入） |
| Route object 路由 | `to: { name: 'product-detail', params: { id } }` |
| 外部 URL（罕見） | `to: 'https://docs.example.com'`（BaseLink 自動判定為外部 `<a>`） |
| 響應式換行 | 容器設窄寬度，`<ol>` 自動 wrap |
| 跨環境（Vite SPA → Nuxt） | 同樣 props 都能跑，內部 BaseLink 自動 fallback |

---

## 8. 不該做（邊界外）

| 項目 | 為什麼不做 |
|---|---|
| 自動從 `router.currentRoute` 推導 items | 元件不該依賴 router 狀態；caller 用 composable / store 算 |
| 自動產生 schema.org JSON-LD | 結構化資料應由 page layout 控（`docs/components/component-design-spec.md §5`） |
| 內建摺疊（`…` 中間省略） | P2 功能，第一版不開；caller 真有需要可外層自切 items |
| 內建翻譯 / i18n | 文字由 caller 傳，元件不耦合 i18n 套件 |
| dropdown / popover 展開長路徑 | 互動模式分歧大（hover / click / focus），交由 caller 用 BaseMenu 包 |
| disabled prop | 麵包屑沒有「禁用」語意，不該支援 |
| icon-only 整條麵包屑 | 純 icon 麵包屑無上下文，違反 a11y 原則；元件不阻止單一項使用 icon-only |

---

## 9. CSS 自訂屬性（token）

樣式客製化優先用 token 覆寫，不直接覆 BEM class。

| Token | 預設值 | 用途 |
|---|---|---|
| `--bc-gap` | `6px` | 項目之間（含分隔符）的水平間距 |
| `--bc-icon-gap` | `4px` | item 內 icon 跟 label 的間距 |
| `--bc-font-size` | `0.875rem` | 整體字級 |
| `--bc-color` | `#4b5563`（gray-600） | 一般文字色 |
| `--bc-link-color` | `inherit` | 連結預設色 |
| `--bc-link-hover-color` | `#1d4ed8`（blue-700） | 連結 hover 色，與 BaseButton primary 同色系 |
| `--bc-current-color` | `#111827`（gray-900） | 當前頁文字色 |
| `--bc-separator-color` | `#9ca3af`（gray-400） | 分隔符顏色 |
| `--bc-focus-ring-color` | `var(--bc-link-hover-color)` | focus-visible outline 色 |

### 覆寫範例

```scss
// 換主色為品牌紅
.base-breadcrumb {
  --bc-link-hover-color: #e11d48;
  --bc-focus-ring-color: #e11d48;
}

// 整條換大字
.base-breadcrumb--large {
  --bc-font-size: 1rem;
  --bc-gap: 8px;
}
```

---

## 附錄：與主流元件庫對照

| 概念 | MUI `<Breadcrumbs>` | Vuetify `<v-breadcrumbs>` | Chakra `<Breadcrumb>` | Element Plus `<el-breadcrumb>` | Ant Design `<Breadcrumb>` |
|---|---|---|---|---|---|
| Items API | children element | `items` prop | children compound | children compound | `items` prop |
| Separator | `separator` prop / slot | `divider` prop / slot | compound `<BreadcrumbSeparator>` | `separator` prop | `separator` prop |
| icon 支援 | 自由（children） | `icon` per item | 自由（children） | 自由（slot） | item 上 `title` slot |
| `aria-current` | 自動最後一項 | 手動 `disabled` 模擬 | 手動 `isCurrentPage` | 手動 | 自動最後一項 |
| 摺疊（`…`） | ✅ `maxItems` | ❌ | ❌ | ❌ | ❌ |
| 結構化資料 | ❌ | ❌ | ❌ | ❌ | ❌ |

**觀察**：

- 多數元件庫**不主動補 `aria-current`**，BaseBreadcrumb 主動補以避免 caller 漏標
- **Items 陣列 prop** 比 children compound 簡潔，本元件採此設計（與 Vuetify / Element Plus / Ant Design 一致）
- **摺疊（maxItems）是 P2 進階功能**，第一版不實作；caller 真有需要可自切 items
- **結構化資料（schema.org BreadcrumbList）** 屬 page layout 責任（見 `component-design-spec.md §5`），元件不重複造輪子
