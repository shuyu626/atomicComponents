# Pagination 元件規範

> **歸屬**:`Base*` 通用元件家族(`app/components/atoms/BasePagination.vue`)。
> **配套**:`docs/components/component-design-spec.md`(跨元件通用原則)、`docs/components/BaseButton.md`(按鈕委派)。
> **核心邏輯**:`app/composables/usePagination.ts`(演算法獨立可重用)。

BasePagination 是「分頁導覽」元件,以語意化 `<nav><ul>` 結構呈現頁碼按鈕、上一頁 / 下一頁、(可選)跳至第一頁 / 最後一頁,以及大頁數時的兩段省略符號。按鈕渲染**完全委派** BaseButton,因此自動繼承色彩 / 尺寸 / 形狀 token、disabled 保護、focus ring 等行為,本元件不重複造輪子。

資料模型對齊「後端常見回傳格式」:`page`(1-based)+ `perPage` + `total`,元件內部以 `Math.ceil(total / perPage)` 算總頁數。

---

## 1. P0 必備 Props

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `v-model`(對應 `modelValue` / `update:modelValue`) | `number` | **required** | 當前頁碼(1-based)。required 強制 caller 給初始頁,避免預設 `1` 顯示錯資料 |
| `total` | `number` | **required** | 總筆數。對齊後端回傳,不接受 caller 需自行推導的「總頁數」 |
| `perPage` | `number` | `10` | 每頁筆數。預設值對齊多數後端慣例 |

---

## 2. P1 / P2 進階 Props

### 顯示控制(P1)

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `siblingCount` | `number` | `1` | 當前頁前後各顯示幾個兄弟頁碼(MUI 慣例) |
| `boundaryCount` | `number` | `1` | 開頭 / 結尾固定顯示幾個頁碼 |
| `showFirstButton` | `boolean` | `false` | 顯示「跳至第一頁」按鈕 |
| `showLastButton` | `boolean` | `false` | 顯示「跳至最後一頁」按鈕 |
| `hidePrevButton` | `boolean` | `false` | 隱藏「上一頁」按鈕 |
| `hideNextButton` | `boolean` | `false` | 隱藏「下一頁」按鈕 |
| `disabled` | `boolean` | `false` | 整體禁用(載入中常用) |

### 外觀(P1,委派 BaseButton)

| Prop | 型別 | 預設 |
|---|---|---|
| `variant` | `'outline' \| 'text' \| 'soft'` | `'outline'` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `color` | `'primary' \| 'danger' \| 'success' \| 'warning' \| 'info' \| 'neutral'` | `'primary'` |
| `shape` | `'square' \| 'circle'` | `'square'` |

> `shape` 不暴露 BaseButton 的 `rectangle` / `pill`:不同位數頁碼(`1` vs `100`)會讓寬度不一,破壞 row 對齊。固定 1:1 寬高(`square` / `circle`)視覺最穩定。

#### `variant` 三種風格對照

| variant | 非選中態 | 選中態 | 適用情境 |
|---|---|---|---|
| `outline`(預設) | 主色描邊 + 主色文字 | 主色填色 + 白字 | 表單 / 後台,主色識別強,當前頁最醒目 |
| `text` | 中性灰文字、無邊框 / 背景 | 主色文字、無背景 | 內容頁,降低視覺干擾 |
| `soft` | 淺灰填色 + 深灰文字 | 主色填色 + 白字 | 列表頁、儀表板,按鈕邊界明確 |

### 無障礙(P1)

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `ariaLabel` | `string` | `'Pagination'` | `<nav>` 的 aria-label。i18n 站需傳入翻譯後字串 |
| `ariaControls` | `string` | — | 被分頁列表的 DOM id;SR 能對應按鈕影響哪個區域 |
| `labels` | `BasePaginationLabels` | `{}` | 按鈕 aria-label 字串集(i18n 逃生口) |

#### `BasePaginationLabels` 結構

| 欄位 | 型別 | 預設 |
|---|---|---|
| `first` | `string` | `'Go to first page'` |
| `previous` | `string` | `'Go to previous page'` |
| `next` | `string` | `'Go to next page'` |
| `last` | `string` | `'Go to last page'` |
| `page` | `(n: number) => string` | ``(n) => `Go to page ${n}` `` |
| `current` | `(n: number) => string` | ``(n) => `Page ${n}` `` |

### P2(目前未實作,延伸時參考)

| Prop | 用途 | 備註 |
|---|---|---|
| `jumpInput` | 跳轉輸入框(輸入頁碼直接跳) | 後台管理介面常見 |
| `pageSizeOptions` | 切換每頁筆數 | 應由獨立元件 `BasePageSizeSelect` 處理 |
| `simple` | 只顯示 prev / 當前/總頁 / next | 行動裝置版型 |
| `dense` | 高密度間距 | 透過 `--pg-gap` token 覆寫已可達成 |

---

## 3. Slot 設計

| Slot | Slot props | 用途 | 預設 |
|---|---|---|---|
| `page` | `{ page, selected }` | 自訂頁碼按鈕內容 | `{{ page }}` |
| `first-icon` | — | 「跳至第一頁」icon | 內建 chevron SVG |
| `prev-icon` | — | 「上一頁」icon | 內建 chevron SVG |
| `next-icon` | — | 「下一頁」icon | 內建 chevron SVG |
| `last-icon` | — | 「跳至最後一頁」icon | 內建 chevron SVG |
| `ellipsis` | — | 省略符號顯示 | `…` 字元 |

### 不開放的 slot

| Slot | 為什麼不開 |
|---|---|
| `item` | 整個 `<li>` 自訂會破壞統一性,需求極少 |
| `prepend` / `append` | 分頁前後加總結文字(例:「共 100 筆」)應由 caller 外層處理 |

---

## 4. 內部行為(實作必做)

### 4.1 元件結構

- **必用 `<nav>`**:landmark 角色,SR 可直接跳到分頁導覽。**`aria-label` 必填**
- **必用 `<ul>`**:無序列表 — 分頁項目語意上「並列可選的目標」,非有先後關係的步驟
- **Ellipsis 用 `<span aria-hidden="true">`**,**不可** `<button>`(SR 會誤判為可點)

> 對照:BaseBreadcrumb 用 `<ol>`,因為麵包屑「順序就是路徑」,改順序就錯了。

### 4.2 當前頁判斷(aria-current)

採 **WAI-ARIA Pagination 慣例**:當前頁的 BaseButton 補 `aria-current="page"`,**不**用 `aria-current="true"`。SR 念到時會說「current page, page 5」而非「true, page 5」。

### 4.3 按鈕委派 BaseButton

每個頁碼 / 導航按鈕都透過 `<BaseButton>` 渲染,**不自己寫 `<button>`**。獲得:

- BaseButton token system(color / variant / size / shape)
- Disabled 三層保護(`disabled` 屬性 + `pointer-events: none` + JS handleClick guard)
- `:focus-visible` outline ring + `prefers-reduced-motion`
- 觸控目標 ≥ 44 × 44px(`sm` size 在粗指標裝置自動擴大 hit-area)
- a11y attribute 完整透傳

> BasePagination **不暴露** BaseButton 的 `rounded` / `loading` prop 給 caller(分頁情境用不到)。需深層客製可透過 CSS:`.base-pagination .base-button { --btn-radius: 8px; }`。

#### Variant → BaseButton 映射表

| BasePagination variant | 非選中 → BaseButton variant | 選中 → BaseButton variant | 非選中 color | 選中 color |
|---|---|---|---|---|
| `outline` | `outline` | `solid` | 跟 caller `color` | 跟 caller `color` |
| `text` | `text` | `text` | `neutral` | 跟 caller `color` |
| `soft` | `solid`(token 覆寫成淺灰) | `solid` | `neutral` | 跟 caller `color` |

`text` / `soft` 的非選中態強制使用 `neutral`,**不**跟著 `color` prop 變化 — 避免整排都是同色按鈕、辨識當前頁變難。

`soft` 非選中走 `solid` + token 覆寫(而非新增 BaseButton variant):BaseButton 沒有「淺灰填色」風格(`neutral solid` 是深灰底白字,太重),且這個風格只在 pagination 情境合理,範疇收斂在 BasePagination 內。

### 4.4 Disabled 視覺(全灰)

BaseButton 預設 `opacity: 0.5`(色相保留)。pagination 場景下 **disabled 應呈現完全灰色**(避免誤判為「快要可用」)。修正:取消 opacity、直接設灰階 token。

| variant | 非選中 disabled | 選中 disabled |
|---|---|---|
| `outline` | gray-400 文字 + gray-200 邊框 + 透明底 | 同上 |
| `text` | gray-400 文字 + 無邊框 + 透明底 | 同上 |
| `soft` | gray-500 文字 + gray-100 底 | **gray-700 文字 + gray-300 底 + 字重 600** |

#### Soft disabled 為什麼用兩階灰

soft 啟用態靠「淺灰底 vs 主色底」明確區隔當前頁。若 disabled 後兩者都壓成同一個 gray-100,使用者會找不到當前頁。修正:

- **非選中 disabled**:gray-100 底 + gray-500 文字 → 對比 ~3.5:1
- **選中 disabled**:gray-300 底 + gray-700 文字 + 字重 600 → 對比 ~6.4:1 ✅ WCAG AA

兩階灰刻意拉開差距 — 載入中 / 暫停操作場景,使用者下意識會想確認自己剛剛點到哪頁。

> outline / text 變體的選中 vs 非選中 disabled 視覺上會看起來一樣(本來就靠「邊框 vs 填色」對比區隔,disabled 後填色拿掉就同形)。若 caller 需要兩階,可比照 token 自行覆寫。

### 4.5 Ellipsis 處理

| 規則 | 實作 |
|---|---|
| 預設 `…` 字元 | 純 `<span>` 文字節點 |
| 必補 `aria-hidden="true"` | 純視覺,SR 應略過 |
| 不可被點擊 | 渲染為 `<span>` 而非 button |
| 區分 `start-ellipsis` / `end-ellipsis` | 兩者語意不同(前段空缺 vs 後段),composable 層面區分 |
| 尺寸跟 `size` 連動 | `--pg-ellipsis-min-{width,height}` 隨 root size class 切換:28 / 36 / 44px |
| Soft variant 套 chip 樣式 | 多套 `background-color` + `border-radius`,維持 row 視覺節奏 |

#### 為什麼 ellipsis 也是 chip(soft variant)

```
[<] [1] [...] [3] [4] [5] [6] [7] [...] [10] [>]   ← 整排都是 chip
                          ↑ 選中(深一階灰)在 row 中明顯 pop 出來
```

若 ellipsis 沒 chip,row 中間會出現「灰、灰、空洞、灰、灰、深灰、灰、灰、空洞、灰、灰」的破碎節奏,選中的深一階灰反而被淡化。整排 chip 化後,選中是 row 中**唯一的深色**,自然抓住注意力。

### 4.6 演算法(usePagination composable)

頁碼陣列由 `usePagination` 計算,可獨立使用(例:做行動版簡化分頁 / dropdown 分頁)。

#### `UsePaginationOptions`

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `page` | `number` | required | 當前頁(1-based) |
| `count` | `number` | required | 總頁數;`<= 0` 視為空資料,回傳 `[]` |
| `siblingCount` | `number` | `1` | 當前頁兩側兄弟頁碼數 |
| `boundaryCount` | `number` | `1` | 頭尾固定頁碼數 |
| `showFirstButton` / `showLastButton` | `boolean` | `false` | 對應控制按鈕顯示 |
| `hidePrevButton` / `hideNextButton` | `boolean` | `false` | 對應控制按鈕隱藏 |
| `disabled` | `boolean` | `false` | 整體禁用 |
| `onChange` | `(page: number) => void` | noop | 任一可點按鈕觸發 |

#### 回傳:`ComputedRef<PaginationItem[]>`

```ts
interface PaginationItem {
  type: 'page' | 'first' | 'previous' | 'next' | 'last' | 'start-ellipsis' | 'end-ellipsis'
  page: number | null      // ellipsis 時為 null
  selected: boolean
  disabled: boolean
  ariaCurrent: 'page' | undefined
  onClick: () => void      // ellipsis 為 noop,可安全綁定
}
```

#### 演算法重點

- 演算法參照 MUI `usePagination`:先算 `startPages` / `endPages` / `siblingsStart-End` 四段,再依間隙是否 ≥ 2 決定放 ellipsis 還是直接放單一頁碼(避免 `[1, …, 2]` 這種怪畫面)
- 點當前頁不觸發 `onChange`(避免 v-model 無謂更新)
- 點 disabled 按鈕、點 ellipsis 都不觸發 `onChange`
- `count <= 0` 回傳空陣列,元件層直接不渲染 `<nav>`

#### 獨立使用範例

```ts
// 行動版簡化分頁,只用 prev / next
import usePagination from '~/composables/usePagination'

const page = ref(5)
const items = usePagination(() => ({
  page: page.value,
  count: 20,
  onChange: (next) => (page.value = next),
}))

const navItems = computed(() =>
  items.value.filter(i => i.type === 'previous' || i.type === 'next'),
)
```

### 4.7 邊界處理

| 情境 | 行為 |
|---|---|
| `total = 0` 或 `perPage <= 0` | `pageCount = 0`,不渲染任何 DOM |
| `total < perPage` | `pageCount = 1`,渲染「prev + page 1 + next」,prev/next 都 disabled |
| `page > pageCount` 或 `page <= 0` | composable 仍計算,但 caller 有責任將 `page` clamp 在 `[1, pageCount]` |

> 不主動 clamp `page` 的原因:元件不該偷改 caller 的 state(會造成 v-model 雙向同步混亂)。若需 auto-clamp,在 caller 那層 `watch(pageCount)` 處理。

---

## 5. A11y Checklist

| 情境 | 必做 |
|---|---|
| `<nav>` landmark | 必填 `aria-label`(預設 `Pagination`,i18n 時翻譯)|
| `aria-controls` | 建議填入被分頁列表的 id,SR 能對應按鈕影響哪個區域 |
| 當前頁標記 | selected 按鈕補 `aria-current="page"`(不是 `'true'`) |
| 按鈕 aria-label | 預設英文,可透過 `labels` 覆寫 |
| Ellipsis | `aria-hidden="true"`,SR 略過 |
| Disabled 狀態 | BaseButton 自動補 `disabled` 屬性 + `pointer-events: none` + JS handleClick guard 三層 |
| Focus indicator | BaseButton 內建 `:focus-visible` outline ring |
| 鍵盤導覽 | 由 BaseButton 透過原生 `<button>` 提供 |
| 觸控目標 | sm size 在粗指標裝置自動擴大 hit-area 到 44 × 44px |
| 對比度 | selected(accent 底 + 白字)≥ 4.5:1;non-selected ≥ 4.5:1;disabled 灰階見 §4.4 |

---

## 6. 反模式(常見錯誤)

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 用 `<div>` + 自製按鈕 | 無 landmark / button 語意 | 用 `<nav>` + BaseButton |
| `aria-current="true"` | WAI-ARIA 規範用 `"page"` | 用 `"page"` |
| ellipsis 用 `<button>` | SR 會誤判可點;disabled 後仍會 Tab focus | 用 `<span aria-hidden="true">` |
| 讓 caller 算 pageCount | 每個 caller 都重複算 `Math.ceil(total / perPage)` | 元件內部算,API 對齊後端回傳 |
| 內建 jumpInput / pageSize 切換 | API 膨脹,各專案需求差異大 | 留給 caller 包覆 |
| 寫死英文 aria-label | i18n 站點 SR 念錯語言 | 透過 `labels` prop 注入翻譯 |
| 把整個分頁包在 `<a>` 裡 | 巢狀互動,無效 HTML | 不要 |
| 元件內 fetch / 跟 router 綁定 | 耦合資料層,難測 | items 由 caller 從 store / route 算好 |
| 點當前頁仍 emit | 父層 watch 無謂觸發 | 元件內部攔下(已實作) |
| 用 `aria-current="page"` 同時放在多顆按鈕 | SR 混亂 | 只能一個當前頁(`selected` 演算法保證) |

---

## 7. 跨情境驗收清單

寫完後逐項試,API 撐不撐得住:

| 情境 | Props 組合 |
|---|---|
| 標準 10 頁 | `total=100, perPage=10` |
| 大頁數 + 兩側省略 | `total=500, perPage=10, modelValue=15` |
| 跳第一 / 最後頁 | `showFirstButton, showLastButton` |
| 隱藏 prev / next(極簡) | `hidePrevButton, hideNextButton` |
| 大兄弟數(密集) | `siblingCount=2, boundaryCount=2` |
| 邊界:單頁 | `total=5, perPage=10` |
| 邊界:無資料 | `total=0`(不渲染) |
| 邊界:剛好兩頁 | `total=15, perPage=10` |
| 整體禁用 | `disabled` |
| 多國語化 | `aria-label, labels` 全部翻譯 |
| 自訂 icon | `<template #prev-icon>` |
| 自訂 ellipsis | `<template #ellipsis>` |
| 圓形按鈕 | `shape="circle"` |
| 不同色彩 | `color="danger"` |
| Text 風格 | `variant="text"`(內容頁,低干擾) |
| Soft 風格 | `variant="soft"`(列表頁,按鈕感明確) |
| 三種 variant × disabled | 各 variant 開 disabled 都該全灰 |
| 切頁後 focus 不跳格 | composable + 穩定 key 確保 |
| 跟 route query 同步 | `v-model` + caller 端 `computed({ get, set })` |

---

## 8. 不該做(邊界外)

| 項目 | 為什麼不做 |
|---|---|
| 自動從 `route.query.page` 同步當前頁 | 元件不該依賴 router 狀態;caller 用 `watch` 接通 |
| 內建 jumpInput(輸入頁碼跳) | UI 模式分歧大(inline 輸入 vs popup),P2 功能 |
| 內建 pageSize 切換 | 應由獨立元件 `BasePageSizeSelect` 處理 |
| 自動發 fetch 拉資料 | 資料層責任,元件只管 UI |
| 內建翻譯 / i18n | 文字由 caller 傳,元件不耦合 i18n 套件 |
| auto-clamp `page` 到 `[1, pageCount]` | 偷改 caller state 違反 v-model 單向資料流原則 |
| 內建鍵盤左右鍵切頁 | 與 form / dialog 上下文衝突;caller 想要可在外層 listen `keydown` |
| 顯示「共 N 筆」摘要 | 屬 page 層 layout,在外層自寫 |

---

## 9. CSS 自訂屬性(token)

樣式客製化優先用 token 覆寫,不直接覆 BEM class。

### 共用

| Token | 預設值 | 用途 |
|---|---|---|
| `--pg-gap` | `6px` | 按鈕之間水平 / 垂直間距 |
| `--pg-ellipsis-color` | `#6b7280`(gray-500) | 省略符文字色 |
| `--pg-ellipsis-min-width` | `36px`(sm: 28 / lg: 44) | 跟 `size` 自動同步 |
| `--pg-ellipsis-min-height` | `36px`(sm: 28 / lg: 44) | 同上,讓 chip 跟按鈕等高 |
| `--pg-chip-radius` | `6px` | chip 圓角(soft variant ellipsis 用) |

### Soft variant

| Token | 預設值 | 用途 |
|---|---|---|
| `--pg-soft-bg` | `#f3f4f6`(gray-100) | 非選中按鈕背景 |
| `--pg-soft-bg-hover` | `#e5e7eb`(gray-200) | 非選中按鈕 hover |
| `--pg-soft-bg-active` | `#d1d5db`(gray-300) | 非選中按鈕 active(按下) |
| `--pg-soft-color` | `#1f2937`(gray-800) | 非選中按鈕文字 |

### Disabled

| Token | 預設值 | 用途 |
|---|---|---|
| `--pg-disabled-color` | `#9ca3af`(gray-400) | 透明背景上的文字色(outline / text) |
| `--pg-disabled-bg` | `transparent` | 預設背景 |
| `--pg-disabled-border` | `#e5e7eb`(gray-200) | outline 邊框 |
| `--pg-disabled-bg-soft` | `#f3f4f6` | soft 非選中底 |
| `--pg-disabled-color-soft` | `#6b7280` | soft 非選中文字(對比 ~3.5:1) |
| `--pg-disabled-bg-soft-selected` | `#d1d5db` | soft 選中底(深一階,保留階級) |
| `--pg-disabled-color-soft-selected` | `#374151` | soft 選中文字(對比 ~6.4:1,WCAG AA) |

### 委派給 BaseButton 的 token

按鈕本體的顏色 / 圓角 / focus ring 全走 BaseButton token。覆寫範例:

```scss
.base-pagination .base-button {
  --btn-radius: 8px;       // 改圓角
}

.base-pagination .base-button--primary {
  --btn-accent: #e11d48;   // 換主色為品牌紅
  --btn-accent-hover: #be123c;
  --btn-accent-active: #9f1239;
}

.base-pagination--soft {
  --pg-soft-bg: #fef3c7;   // amber-100
  --pg-soft-color: #92400e;
}

.base-pagination {
  --pg-disabled-color: #6b7280;  // 加深 disabled 文字
}
```

---

## 附錄:與主流元件庫對照

| 概念 | MUI `<Pagination>` | Vuetify `<v-pagination>` | Ant Design `<Pagination>` | Element Plus `<el-pagination>` | BasePagination |
|---|---|---|---|---|---|
| 資料模型 | `count`(總頁數)| `length`(總頁數) | `total + pageSize` | `total + pageSize` | `total + perPage` |
| 當前頁 | `page` + `onChange` | `v-model` | `current` + `onChange` | `current-page` + emit | `v-model` |
| `siblingCount` / `boundaryCount` | ✅ | `total-visible`(合併單一參數) | ❌ | ❌ | ✅ |
| `showFirst/Last` | ❌(預設都顯示) | ✅ | ❌ | ✅ | ✅(opt-in) |
| jumpInput | ❌ | ❌ | ✅ | ✅ | ❌(P2) |
| pageSize 切換 | ❌ | ❌ | ✅ | ✅ | ❌(獨立元件處理) |
| `aria-current` | 自動 `"true"` | 自動 `"page"` | 自動 `"page"` | 手動 | 自動 `"page"` |
| Icon slot | items prop(複雜) | slot per direction | renderItem(複雜) | slot | slot per direction |
| 演算法 composable 抽出 | ✅ (`usePagination`) | ❌ | ❌ | ❌ | ✅ (`usePagination`) |

**觀察**:

- **資料模型用 `total + perPage`** 對齊後端回傳,caller 不用再算 pageCount(與 Ant / Element Plus 一致)
- **`siblingCount` / `boundaryCount` 分開**(MUI 慣例)比 Vuetify 的 `total-visible` 合併參數更可控,且兩個維度正交
- **`showFirstButton` 預設關**:現代 UI 多數不需要,opt-in 更乾淨
- **演算法獨立成 composable**:caller 想做行動版簡化分頁 / dropdown 分頁可直接複用 `usePagination`,本元件只是其中一種 UI 呈現
