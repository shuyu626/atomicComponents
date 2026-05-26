# 通用元件設計規範

> **寫給**:跨專案共用的 `Base*` 元件實作參考。
> **範圍**:Vue 3 + TypeScript;原則大多跨框架通用(React / Solid / Web Components 適用)。
> **配套**:`~/.claude/rules/component-architecture.md`(元件放置決策)、`~/.claude/rules/code-reuse.md`(函式 / store / composable 複用)。
> **個別元件規格**:見 `docs/component/` 資料夾,例如 [`button.md`](../component/button.md)。

本文件分兩部分:
1. **跨元件通用原則** — 適用所有 `Base*` 元件
2. **新元件設計 checklist** — 寫新元件時逐項對照

附錄 A 為命名公約。

---

## 第一部分:跨元件通用原則

### 1. 三條鐵律

| # | 鐵律 | 為什麼 |
|---|---|---|
| 1 | **解耦多維屬性**:`variant` × `color/tone` × `size` 互相獨立,不交叉綁定 | 把語意顏色塞進 variant(像 `variant="danger"`)會讓「outlined + danger」這類組合無法表達 |
| 2 | **不假裝原生元素**:能讓 `<button>` / `<a>` / `<input>` 處理的(鍵盤、focus、disabled、form integration),不要重新發明 | 重寫 = 重新引入 bug;原生 = 免費拿到瀏覽器幾十年累積的 a11y |
| 3 | **設計 token 而非字面值**:顏色 / 間距 / 圓角 / 字級全走 CSS 變數,本體不寫 hex | 跨專案落地必要條件;同時讓 dark mode / multi-theme 自動運作 |

### 2. Props 設計原則

| 原則 | 說明 |
|---|---|
| **分層 P0 / P1 / P2** | P0 = 沒它就不能用、P1 = 解決常見彈性、P2 = 邊緣情境。第一版只暴露 P0 |
| **互斥多值用 string union** | `variant: 'solid' \| 'outline' \| 'ghost'` 優於多個 boolean。擴充新風格不破壞 API |
| **一個 boolean 控一件事** | 避免 `compact: boolean` 同時改 padding + 字級 + icon 大小 |
| **預設值要安全** | 例:`<button>` 的 `type` 預設 `'button'`,避免在 form 內意外觸發 submit |
| **a11y 約束優先用型別表達** | 能用 discriminated union 在 TS 層擋下的,不要 runtime warn。例:iconOnly: true 時 aria-label 必填 → `type ButtonProps = { iconOnly?: false; ariaLabel?: string } \| { iconOnly: true; ariaLabel: string }`。runtime warn 是備援,不是首選 |
| **不要 1 對 1 包裝原生 prop** | 別寫 `nativeType` + `type` 兩個 prop;一個就夠 |
| **公開 props interface** | `export interface ButtonProps`,讓 caller 可以 `extends ButtonProps` 做包裝元件 |
| **Vue 3.4+ v-model 用 `defineModel`** | 禁手寫 `defineProps(['modelValue']) + defineEmits(['update:modelValue'])` 舊樣板。MUST 用泛型:`defineModel<T>()`;2 個以上 v-model 全部具名:`defineModel<T>('xxx')`;子元件直接改 `model.value`,不要手動 emit。詳細寫法見 `~/.claude/rules/component-architecture.md` |

### 3. Slot 設計原則

| 原則 | 說明 |
|---|---|
| **內容走 slot,不走 prop string** | 不要 `<Button text="..." />`;直接 `<Button>...</Button>` |
| **icon 走 slot,不要 prop** | `iconName="..."` 強耦合特定 icon library。用 slot 讓 caller 放任何東西 |
| **命名一套到底** | 設計系統內統一用 `prepend` / `append` |
| **常用內容開有名 slot** | 例如 `loading` slot 讓 caller 換成品牌 spinner |

### 4. A11y 設計原則(每個互動元件都要做)

| 項目 | 必做 |
|---|---|
| **鍵盤可達** | Tab 能聚焦、Enter / Space 能觸發。`<button>` 自動有,自製互動元素要補 |
| **Focus 樣式** | 用 `:focus-visible` 而非 `:focus`,滑鼠點擊不要亮 ring |
| **狀態語意** | disabled → `disabled` attribute(button)或 `aria-disabled`(a / div);loading → `aria-busy="true"`;toggle → `aria-pressed`;menu → `aria-expanded` + `aria-haspopup` |
| **顏色不獨自承載資訊** | 配 icon 或文字。色盲 / 弱視會漏資訊 |
| **觸控目標 ≥ 44 × 44px** | WCAG 2.5.5 Level AAA。手機 UX 必備 |
| **對比度 ≥ 4.5 : 1** | WCAG AA 文字最低要求 |
| **`prefers-reduced-motion`** | 動畫(spinner / hover transition)在使用者偏好減少動態時要關掉 |

### 5. 語意 HTML 與 SEO

元件層能影響 SEO 的部分有限,但**選對標籤、暴露階層 prop** 是底線;頁面層級的 meta tags / Open Graph / canonical / robots / sitemap 由 page 或 layout 負責,本節不涵蓋。

| 原則 | 說明 |
|---|---|
| **語意標籤優先,`<div>` 不假裝任何東西** | 互動 → `<button>` / `<a>`;區段 → `<section>` / `<article>`;導航 → `<nav>`;主要內容 → `<main>`;側欄 → `<aside>`;頁首頁尾 → `<header>` / `<footer>`。SEO + a11y 雙贏 |
| **連結 vs 按鈕分清楚** | 會跳網址 → `<a href>` / `<NuxtLink>`;觸發動作 → `<button>`。**禁止用 `<a>` 假裝按鈕**(`<a onclick="...">` 沒 href) |
| **Heading 階層由 caller 決定** | 元件內若需標題,開 `headingLevel: 1 \| 2 \| ... \| 6` prop 或暴露 slot。**禁止寫死 `<h2>`** — caller 不知道頁面標題層級 |
| **Heading 不可跳階** | `<h1>` → `<h2>` → `<h3>`,不能 `<h1>` → `<h3>`(SEO 與 a11y 雙重扣分) |
| **圖片 `alt` 必填** | 內容性圖片:描述語意;裝飾性圖片:明示 `alt=""`(讓 SR 跳過)。元件設 `alt` 為 required prop,避免 caller 忘記 |
| **連結文字要有意義** | 禁 "click here" / "read more" / "點這裡"。caller 必傳能單獨理解的字串(`了解信託專戶開戶流程`) |
| **表單欄位必須有 `<label>`** | 用 `for` / `id` 或 `<label>` 包覆;`aria-label` 是備援,不是首選。Search engine 也讀 `<label>` 來理解欄位用途 |
| **時間與地址用語意標籤** | `<time datetime="2026-05-21T10:00:00Z">`、`<address>`、`<abbr title="...">`,機器與 SR 都受惠 |
| **landmark 不可重複** | 一頁僅 1 個 `<main>` / `<header>` / `<footer>`(頁面層);元件 nest 時用 `<section>` / `<aside>` |
| **不可見內容語意正確** | 視覺隱藏但給 SR / 搜尋引擎讀:`sr-only` / `visually-hidden` class。雙重隱藏(視覺 + SR):`aria-hidden="true"` |
| **結構化資料(JSON-LD)由 page 嵌入** | 列表元件不負責 schema.org markup,只暴露足夠的 prop 讓 caller 在外層生成 `<script type="application/ld+json">` |
| **lazy load 圖片** | 非首屏圖片:`loading="lazy"`;首屏關鍵圖片:`loading="eager"` + `fetchpriority="high"`。元件用 `priority: boolean` prop 控制 |
| **避免 `<button>` 內塞跳轉邏輯** | 搜尋引擎不會跟著 `router.push` 抓子頁面。需要被索引的子頁,必須是真正的 `<a href>` |

### 6. 行為與狀態原則

| 行為 | 必做實作 |
|---|---|
| **disabled 防點擊** | 同時設 attribute + `pointer-events: none`(`<a>` 無 native disabled,只靠 attribute 擋不住) |
| **loading 防重複觸發** | 自動視為 disabled + 設 `aria-busy="true"` |
| **保留 layout 寬度** | loading 時用 absolute spinner + `visibility: hidden` 內容,避免 layout shift |
| **原生 DOM 事件不要重包** | `click` / `input` / `focus` 等讓事件透過 attrs fallthrough 自動掛到 root,別 `emit('click')`。`onClick` 內只負責 disabled / loading 時 `e.preventDefault()` + `e.stopImmediatePropagation()` 阻擋 |
| **透傳 `data-*` / `aria-*` / `class` / `style`** | 預設行為已可;若用 `inheritAttrs: false`,要顯式 `v-bind="$attrs"` |
| **不在元件內處理副作用** | confirm dialog、debounce、analytics 都應該由 caller 包裝,Button 只負責 click |
| **受控與非受控並存** | 有內部狀態的元件(input / select / checkbox / dialog / disclosure)同時支援 v-model(受控)與 defaultValue / defaultOpen prop(非受控)。caller 沒給 v-model 時元件內部自治,給了就完全交出控制權。defineModel 在沒綁定時會回傳獨立 ref,天然支援|
| **必要時 expose imperative API** | 用 defineExpose 把關鍵方法 / ref 暴露給 caller:input 類 { focus, blur, inputRef }、dialog { open, close }、scrollable list { scrollToIndex }。避免父元件無法控制原生行為 |

### 7. SSR 與跨平台

| 項目 | 注意 |
|---|---|
|**Teleport 與 SSR 共存**| `<Teleport to="body">` 的 target 在 hydration 前不存在。SSR 階段用 disabled prop 關掉 teleport,或用 `<ClientOnly>`包裝。Nuxt 用 `<Teleport to="body" :disabled="!isMounted">` pattern |
| **不在 setup 階段碰 DOM** | `document` / `window` 只能在 `onMounted` 內或 `import.meta.client` guard 內使用 |
| **避免 hydration mismatch** | 隨機值用 seeded random(本專案有 `createSeededRandom`);id 用 Vue `useId()` |
| **RTL 友善** | padding / margin 用 logical properties(`padding-inline-start`),Tailwind 用 `ps-*` / `pe-*` |
| **不依賴 ResizeObserver / IntersectionObserver 等 API 在 SSR** | 用 `import.meta.client` 包起來 |

### 8. 跨專案落地

| 項目 | 建議 |
|---|---|
| **設計 token 接口** | CSS custom properties 開放覆寫(`--btn-color-primary` 等)。不假設 caller 用 Tailwind / SCSS |
| **i18n** | 文字 / `aria-label` 由 caller 傳,元件內**不**做翻譯 |
| **Bundle size** | 不依賴 icon library、不依賴 utility libraries(lodash 等) |
| **Tree-shakable** | 單檔 `.vue`,不要附帶 composable 與其他元件 |
| **完整 TypeScript** | strict + 公開 `interface Props` |
| **文件 / 視覺驗證** | Storybook / Histoire 列出所有 prop 組合矩陣,讓設計師可以 review |
| **版本相容** | README 列最低 Vue / TS / Node 版本 |
| **API 穩定** | 第一版只暴露 P0;P1 / P2 在 minor 版本加 |

---

## 第二部分:新元件設計 Checklist

寫每個新 `Base*` 元件時,依下面三階段逐項對照。

### 9. 設計階段(寫第一行 code 前)

- [ ] 列出元件的「正交維度」 — 哪些屬性可以獨立組合(variant / color / size / state)
- [ ] 列 P0 props(沒它就不能用) — 限 5–8 個
- [ ] 列 P1 / P2 props — 進階情境
- [ ] 決定 slot 介面 — 哪些內容透過 slot 而非 prop
- [ ] 列出 a11y 要求 — role / aria-* / 鍵盤行為
- [ ] **確認語意標籤** — 優先使用 `<button>` / `<a>` / `<nav>` / `<section>` 等而非 `<div>` 假裝
- [ ] **Heading 階層** — 若元件含標題,設計 `headingLevel` prop 而非寫死
- [ ] 寫出 10+ 真實使用情境,逐個驗證 API 表達得出來
- [ ] Review 反模式 — 是否落入「把語意塞進 variant」「icon 用 prop」等陷阱
- [ ] 對齊 Figma / 設計系統 — variant 名稱、互動狀態跟設計師一致

### 10. 實作階段

- [ ] TypeScript strict,公開 `export interface XxxProps`
- [ ] 預設值安全(`type='button'`、`disabled=false`)
- [ ] **Vue 3.4+ 雙向綁定用 `defineModel<T>()`**,不手寫 `modelValue` + `update:modelValue` 樣板
- [ ] **用對語意標籤** — 互動元素用 `<button>` / `<a>`,內容區段用 `<section>` / `<article>` 等
- [ ] **圖片必填 `alt`** — required prop;裝飾性圖明示 `alt=""`
- [ ] disabled / loading 雙重保護(attribute + CSS pointer-events)
- [ ] Focus 用 `:focus-visible`
- [ ] 顏色全部走 CSS var / token,不寫 hex
- [ ] 觸控目標 ≥ 44px
- [ ] Polymorphic root(`<component :is>`)— 如果支援 `to` / `href` / `as`
- [ ] SSR safe — 不在 setup 階段碰 `document` / `window`
- [ ] Reduced motion — 動畫包 media query
- [ ] 透傳 attrs(`data-testid` / `aria-*` / `class` 都能往下傳)
- [ ] 點擊 handler 處理 disabled / loading 狀況
- [ ] Loading 不造成 layout shift

### 11. 驗收階段

- [ ] Storybook / Histoire 列出所有 variant × color × size × state 組合
- [ ] 鍵盤實測:Tab / Shift+Tab / Enter / Space / Esc / 方向鍵(視元件適用)
- [ ] 螢幕閱讀器實測:VoiceOver / NVDA 至少一個
- [ ] 對比度檢查(Chrome DevTools / axe DevTools)
- [ ] **HTML 結構檢查** — DevTools 看 outline / W3C Validator 跑一次,確認語意標籤與 heading 階層
- [ ] 至少 2 個試點專案實際使用後再升 stable

---

## 附錄 A:命名公約

| 概念 | 推薦名稱 | 避免 |
|---|---|---|
| 視覺風格 | `variant` | `appearance` / `style` / `kind` |
| 語意顏色 | `color` 或 `tone`(全公司擇一) | 混用 |
| 尺寸 | `size` | `dimension` / `magnitude` |
| 形狀 | `shape` | `form` |
| 載入 | `loading` | `busy` / `pending` |
| 禁用 | `disabled` | `inactive` |
| 全寬 | `block` | `fullWidth` / `wide`(混用 CSS `display: block` 也 OK) |
| 標題階層 | `headingLevel`(`1` ~ `6`) | `tag` / `as`(語意不清) |
| 前綴 slot | `prepend` | `icon-left` / `prefix` |
| 後綴 slot | `append`  | `icon-right` / `suffix` |
| toggle 狀態 | `aria-pressed` | `active` / `selected`(語意模糊) |
| 路由 | `to` | `href`(留給外部) |
| 外部 | `href` | `to`(留給內部) |
