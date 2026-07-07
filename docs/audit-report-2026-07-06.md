# atomicComponents 全專案分析報告

> **日期**：2026-07-06
> **範圍**：44 個元件、12 個 composables、21 個 utils/helpers，及對應 docs / stories / tests、建置設定、規範文件
> **方法**：專案結構與基礎設施掃描 + 全檔逐一深度審查；所有 🔴 級發現均經開檔驗證（部分以 `renderToString`、focus-trap 原始碼、Node 實測佐證）
> **定位判準**：本專案目標為「跨專案可複用的基礎元件庫」，所有建議以此為最高判準

## 當日健康度實測

| 項目 | 結果 |
|---|---|
| `pnpm test` | 66 檔、**1190 個測試全綠**（1 個附註原因的 skip：`BaseDrawer.spec.ts:351`，happy-dom 無法驅動 leave transition） |
| `pnpm typecheck` | 通過 |
| 靜態掃描 | 無 `any`、無 `console.log`、無 `:key="index"`；`defineModel` 貫徹（23 檔）；全元件顯式 import（不依賴 Nuxt auto-import） |
| 規模 | 元件程式碼共 16,300 行；295 個 CSS custom property token |

## 總體評價

**元件本體的工程品質在自製元件庫中屬上乘**——IME 組字處理完整複刻 `vModelText`、focus-trap 疊層協調正確、a11y 決策有深度（sr-only radio 的 Rating、常駐 live region 的 Toast、`aria-current="page"` 的 Pagination）、SSR 慣例成文、文件誠實記錄取捨。這個底子值得投資。

但以「成為未來各種專案的基礎」為判準，存在：

1. **一個致命缺口**（P0）：這個庫目前無法被任何專案安裝使用
2. **兩類系統性問題**（P1）：token 無語意層（已實際漂移出兩套配色）、工程基建缺件
3. **9 個已驗證的確定性 bug**（🔴）

---

## A. 戰略層（P0 — 決定這個庫「能不能被用」）

### A1. 目前沒有任何專案可以安裝使用它

`package.json` 是 `private: true` 的 Nuxt **應用程式**（`build: nuxt build`），沒有 `exports`、沒有 lib build、沒有 Nuxt Layer 設定。README 宣稱「可重用元件庫」「同一份元件可在 Nuxt 與純 Vite SPA 運作」，但目前唯一的重用方式是**複製貼上**。

| 路線 | 成本 | 能兌現的承諾 |
|---|---|---|
| **Nuxt Layer**（`extends` 此 repo） | 極低（半天） | 所有 Nuxt 消費端立即可用 |
| **npm library**（vite lib mode / unbuild + `vue-tsc` 產 d.ts + peerDeps） | 中（約一週） | 兌現「純 Vite SPA」承諾 |
| **pnpm monorepo**（core + nuxt 包 + storybook app） | 高 | 長期多包演化 |

**建議：短期先 Layer、中期抽 npm 包。** 程式碼已為此鋪好路（全元件顯式 import、`BaseLink` 的 NuxtLink → RouterLink → `<a>` fallback chain），主要剩打包工程。屆時需一併決定 `focus-trap` / `@floating-ui/vue` / `tabbable` / `ufo` 要隨包（dependencies）還是 peerDependencies。

### A2. Nuxt auto-import 名稱錯位：文件寫 `<BaseButton>`，實際註冊名是 `<AtomsBaseButton>`

`.nuxt/components.d.ts` 證實元件以路徑前綴註冊（`export const AtomsBaseButton`）。docs / stories / tests 全部寫 `BaseButton`（它們直接 import 所以沒炸），但任何 Nuxt 頁面照文件使用會解析失敗。一行修正（`nuxt.config.ts`）：

```ts
components: [{ path: '~/components', pathPrefix: false }]
```

### A3. 「atoms」裝了 1364 行的 DatePicker — 發佈前是重新分類的唯一便宜時機

44 個元件全在 `atoms/`：BaseDatePicker **1364 行**、BaseSelect 1028 行、BaseTable 735 行——這些在 Atomic Design 中是 molecule / organism。`molecules/` 等目錄存在但空且未入版控（git 不追蹤空目錄）。改目錄 = 改所有 import path，**第一個消費專案出現後就是 breaking change**，需現在裁決：

- **(a)** 按 atomic design 歸位（Table / Tree / Select / DatePicker / FileUpload 移出 atoms）；或
- **(b)** 放棄 atomic 分類，改扁平 `base/`，以「依賴層級」文件化（utils → composables → 原子元件 → 複合元件）

同時建議修訂 `component-design-spec.md:123` 的「Tree-shakable：單檔 .vue，不要附帶 composable 與其他元件」——實作（正確地）大量組合共用（Button→Link、Select→Popover、7 個欄位→FormField），矛盾的是規範不是程式碼，應改寫為「依賴 DAG 分層」原則。

---

## B. 系統層（P1 — 決定它「用起來是不是一套系統」）

### B1. Token 缺全域語意層，漂移已經發生

295 個 component-scoped token（`--btn-*`、`--field-*`…），**沒有任何全域 `--color-primary` 語意層**，跨元件一致性靠註解（「對齊 BaseButton」）維持——這條人工紀律已實際失守：

| 語意色 | BaseButton | BaseToast | 其他 |
|---|---|---|---|
| primary 藍 | `#1d4ed8` | — | BaseBadge **`#3b82f6`**、BaseAccordion focus ring **`#2563eb`** |
| info | `#0284c7` | **`#4a93d9`** | |
| success | `#16a34a` | **`#2e9e63`** | |
| warning | `#f59e0b` | **`#e0a32e`** | |
| danger/error | `#dc2626` | **`#e0564d`** | |

BaseToast 已整組漂成獨立配色。換品牌色時消費端得逐元件覆寫幾十個變數。建議兩層式：

```scss
// assets/styles/tokens.css（消費端可選引入、可整檔覆寫）
:root { --ac-color-primary: #1d4ed8; --ac-color-danger: #dc2626; /* … */ }

// 元件內：引用語意層、保留 fallback（單檔仍可獨立運作）
--btn-accent: var(--ac-color-primary, #1d4ed8);
```

好處：一個檔案換品牌、dark mode 有掛載點、漂移在結構上不可能。附帶兩點：

- 全域 token 加 `--ac-*` 命名空間，避免與消費專案的 CSS 變數衝突
- **BaseToast 與 BaseDatePicker 沒跟上庫內既有的 `:where()` 慣例**（其他 20 個元件都用了），導致 `BaseToast.md:177-185` 文件示範的 class 覆寫法實際蓋不過 scoped specificity

### B2. 工程基建缺件

| 缺件 | 現況與影響 | 建議 |
|---|---|---|
| **CI** | 無 `.github/workflows`，主幹品質靠自覺 | GitHub Actions：install → typecheck → test → storybook:build |
| **ESLint / Prettier** | 完全沒有設定，但 `new-component-workflow.md:222` 卻要求「無 ESLint 錯誤」 | `@nuxt/eslint` + prettier |
| **typecheck 範圍** | `.nuxt/tsconfig.app.json` 只含 `app/**` 與 `tests/nuxt/**`；實際測試在 `tests/`、stories 也不在範圍——**1190 個測試與 41 個 stories 的型別錯誤抓不到**（Vitest 只轉譯不檢查型別） | tests 補一支 tsconfig 進 CI 跑 `vue-tsc --noEmit`；stories 用現成的 `.storybook/tsconfig.json` |
| **LICENSE** | 無檔案（README 只寫「Private。」） | 補 LICENSE 或內部授權聲明 |
| **版本策略** | 無版號、無 CHANGELOG，消費端無法鎖定升級 | changesets 或手動 semver |
| **共用邏輯測試** | 9 檔無測試：**`useOverlay.ts`（浮層核心！）**、3 個 observer 工廠、`findFirstLegitChild`（Popover 錨點地基）、`preloadRouterLinkComponents`、`useResizeObserver`、`isFunction`、`noop` | 優先補 useOverlay 與 findFirstLegitChild |

### B3. i18n 預設文案語言混亂、逃生口不齊

規範 §9 說「文字 / aria-label 由 caller 傳，元件內不做翻譯」，實況四軌並行：

- BaseTree **寫死中文**（'收合'/'展開'/'無資料'）且**沒有 labels prop 逃生口**（`BaseTree.vue:34,103`）
- BaseChip `deleteAriaLabel` 預設 `'Delete'`（英文）
- BaseAlert / BaseToast `closeLabel` 預設 `'關閉'`（中文）
- BaseTable labels 預設繁中 vs BasePagination labels 預設英文

建議統一「labels prop + 單一預設語言」策略，並寫進規範。

### B4. API 語意軸命名漂移

同一個「語意狀態」概念三種 prop 名、兩種色名：Toast `type: 'error'`、Alert `color: 'danger'`、Result `status: 'error'`。規範附錄 A 明言語意顏色「全公司擇一」。關閉/刪除也分裂：`closable/close/closeLabel` vs Chip 的 `deletable/delete/deleteAriaLabel`。這是每個新專案的每個開發者都會撞到的學習成本，建議發佈前統一。

### B5. 20/44 元件的 Props interface 沒有 `export`

規範 §2 要求 `export interface XxxProps`（讓 caller `extends` 做包裝元件）。BaseModal、BaseCheckbox、BaseSelect、BaseTabs、BaseToast 等 20 個元件定義了 interface 卻沒 export（輔助型別如 `BaseSelectOption` 反而有）。一次性機械修正。

### B6. 文件治理：單一真相來源失守

- `.github/copilot-instructions.md` 與 `docs/components/component-design-spec.md` 是**近乎全文重複的兩份規範且已 drift**：spec 已改為 `stopPropagation`（附理由，`:87`）、copilot 版還是舊的 `stopImmediatePropagation`；spec 多了 §7 v-for key 整節。建議 copilot 版改成薄指標檔。
- `ssr-compatibility.md`：漏了 refactor 後新增的 3 個 composables（useComposingModel、useFieldValidation、useOverlayLifecycle）；把**無效的 `canUseObjectUrl` 守衛列為防護慣例範本**（Node ≥16.7 就有 `URL.createObjectURL`，`typeof` 判斷在 server 也是 true）；BaseTextField/Textarea 標 ✅ 但漏了 C1-5 的 SSR 空值問題；大量 `檔案:行號` 引用會隨改動腐化。
- README「覆蓋率僅統計 `app/components/**`」已過時（vitest.config 現含 composables/utils/helpers）。
- 兩份 canonical 文件（BaseButton.md、BaseLink.md）合計 6 處與實作不符（例：宣稱「純文字自動 truncate」實無；「`to="#section"` 歸外部」實測歸內部走 RouterLink）。

---

## C. 元件層發現

### C1. 🔴 確定性 bug（9 個，皆經開檔驗證，發佈前必修）

| # | 位置 | 問題 | 觸發情境 |
|---|---|---|---|
| 1 | `BaseTable.vue:254-259` | `toggleAll` 以 `items.map(toRaw)` 或 `[]` **整批取代** selected，摧毀跨頁選取——同元件顯示層與 `BaseTable.md:202` 卻明確支援跨頁模型 | 勾了 3 頁資料 → 點表頭全選/取消 → 他頁選取全滅 |
| 2 | `BaseScrollbar.vue:243` | track 點擊混用座標系：`rect[direction]`（client 座標）減 `event.pageY/X`（document 座標） | 頁面捲動 N px 後點擊 track，固定偏移 N px |
| 3 | `BaseTree.vue:438` | `activeFocusKey = focusedKey ?? visible[0]` 沒有「focusedKey 仍可見」檢查；聚焦節點被收合（chevron 點擊 / `collapseAll()` / 外部改 `v-model:expanded`）後**所有 treeitem tabindex=-1** | 鍵盤使用者永久無法 Tab 進 Tree |
| 4 | `BaseDatePicker.vue:918-919` | PageUp/PageDown 用 `new Date(y, m±1, d)` 無日數 clamp | 5/31 按 PageUp 跳到 5/1（同月）；3/31 → 3/3 |
| 5 | `BaseTextField.vue` / `BaseTextarea.vue`（template 無 `:value` 綁定） | 值同步只靠 client 端 `watchEffect`，**SSR 首渲 HTML 完全沒有 value**（`renderToString` 實測證實） | 所有「編輯表單回填」頁首屏空白，hydration 後才補值 |
| 6 | `BasePopover.vue:498-504` | `clickOutsideDeactivates: true` 未配 `returnFocusOnDeactivate: false`（focus-trap 預設 true）→ **點外部關閉會把焦點搶回 trigger**；`BaseDropdown.md:191` 宣稱行為相反 | 使用者點頁面上另一個輸入框，焦點被拉回 |
| 7 | `BasePopover.vue:486-506` + `:356` | trap 建立不分 trigger 類型：hover 浮層含可聚焦內容時**滑過即偷走鍵盤焦點**；`trigger="focus"` + 可聚焦內容 = 開關**無限震盪**（onBlur 無 relatedTarget 檢查） | 含按鈕的 hover card / tooltip |
| 8 | `BaseModal.vue:175` / `BaseDialog.vue:307` / `BaseDrawer.vue:216` | 三者固定 `z-index: 1100`，且 Teleport 錨點在**掛載時**就佔位（`v-if` 在內層）→ 視覺疊序 = 掛載順序而非開啟順序；`usePopupsManager` 只管邏輯序不派發 z | 兩個常駐浮層反序開啟 → 邏輯上層被視覺壓底、Esc 關到看不見的層 |
| 9 | `BaseButton.vue:90,150` | `href` 只是 `to` 的 alias，無 protocol 的路徑走 SPA 路由；但規範附錄 A 定義「外部 → href」、`BaseButton.md:132` 的下載範例照做會壞 | `href="/file.pdf" download` 被 router 攔截 |

### C2. 🟡 重要缺陷（依主題精選）

#### 浮層／焦點系統

- Esc 關閉無 `isComposing` 防護（`useOverlay.ts:103-108`、`BasePopover.vue:393-401`）——IME 組字中按 Esc 取消注音會**同時關掉 Modal**，CJK 專案日常路徑。
- 點遮罩關閉沒有 `popups.isTop()` 協調（`useOverlay.ts:94-100`；Esc 有）→ Modal 內開 Dropdown 時點遮罩**兩層同時關**；`BaseModal.md:10` 宣稱「只關最上層」。
- `initialFocus` 不可客製（`useOverlay.ts:117-128`）→ 對話框開啟後焦點固定落在**關閉鈕**（SR 使用者第一個聽到「關閉, 按鈕」），表單對話框無法聚焦首欄。
- BaseDialog 家族 API 不齊：無 `beforeClose`、無 open/opened/close/closed 生命週期事件（Modal/Drawer 都有，且 `useOverlayLifecycle` 現成可複用）。
- `useDrag.ts:92-111` 不檢查 `event.button` → 右鍵／中鍵也啟動拖曳。

#### 表單系統

- readonly 的 BaseSelect 被標 `aria-disabled="true"` 且可聚焦、無 `aria-readonly`（`BaseSelect.vue:22` + Popover fallthrough，實測證實）——SR 聽到「已停用」卻能操作。
- 三個 input 類元件未 expose `focus/blur/inputRef`（違反自家規範 `component-design-spec.md:91`）→「驗證失敗聚焦第一個錯誤欄位」這個表單基本需求做不到。
- attrs fallthrough 停在最外層 div：`min`/`max`/`step`/`pattern`/`data-testid` 都到不了 `<input>`，每缺一個屬性就要發版加 prop。
- CheckboxGroup / RadioGroup 的 `readonly` prop **看起來有、實際無效**（context 不廣播，子框照常可互動）。
- BaseFileUpload：重複選同檔 → v-for key 重複（`:106,287-314`）；`aria-invalid` 綁在 `display:none` 的 input 上（SR 讀不到）。

#### 回饋／展示

- `useToast.ts:93` module-scope singleton **無 SSR 防禦**：server 端任何 `show()` 呼叫會讓 toast 永久留在佇列並洩漏到後續所有請求的 SSR 輸出（`ssr-compatibility.md` 只靠「約定」防守——基礎庫不能假設每個下游團隊都讀過風險清單）。建議 `import.meta.server` 時 no-op + DEV warn。
- BaseToastContainer 連續兩則**相同文字**不會再播報（ref 同值不觸發，`:107-112`）——這個元件存在的目的就是可靠播報。
- `BaseResult.vue:83-95` 用 `<p>` 包 `#title`/`#description` slot，但文件建議塞 heading → invalid HTML，**SSR 下 hydration mismatch + 版面破裂**。
- BaseChip 刪除鈕不擋冒泡（`:139-141`）→ 可點擊 chip 場景「刪除 + 點擊」同時觸發。

#### a11y 深水區

- BaseTree：checkable 時每個 checkbox 都是額外 tab stop（APG 要求整棵樹單一 tab stop）；鍵盤可展開 disabled 節點（滑鼠不行）；扁平化渲染缺 `aria-setsize`/`aria-posinset`。
- BaseDatePicker：鍵盤焦點可落在 disabled 日導致 roving 斷鏈；日格只有裸數字無「2026年7月15日」accessible name；clear 鈕巢在 `role="button"` 內（nested interactive 違規）；外點關閉會把焦點**搶回控制項**（打字打進錯誤欄位）。
- `createSingletonObserver.ts:79-99`：同一 element 二次 observe **靜默覆蓋**前一個 callback，且第一個的 unobserve 會把第二個也解除——全庫共用基礎設施的未文件化陷阱。
- `validators.ts:73-75`：`pattern()` 吃到 `/g` 旗標 regex 時 `lastIndex` 殘留 → 驗證結果**交替翻轉**，共用庫經典地雷。
- BaseLink 在純 Vite 環境每個實例都觸發 `resolveComponent` dev warning；無 vue-router 的純 Vue app 中內部路徑仍渲染 `<RouterLink>` 直接 runtime error，與 `BaseLink.md:123` 宣稱的 fallback 不符——「跨環境適配層」是本庫主打，這是可信度問題。

### C3. 🔵 低優先（代表性列舉）

- `aria-controls` 在 link 形態仍輸出（`BaseButton.vue:15`，其他 aria 都有 gate）
- AvatarGroup 的 `+N` 節點無 key（`BaseAvatarGroup.vue:92`）
- BaseCheckbox 在原生 checkbox 上加冗餘 `aria-checked`（BaseSwitch 的註解明確反對此做法——同庫自相矛盾）
- combobox 不支援 ArrowDown/ArrowUp 開啟浮層（WAI-APG 慣例）
- 多選 hidden input 用逗號 join（值含逗號時 server 無法還原，建議改多個同名欄位）
- `clamp.ts` 存在但 Progress/Rating 各自 inline 重寫（違反 code-reuse「相同邏輯只寫一次」）
- Dropdown 以 `Function.length >= 2` 決定關閉時機（handler 用預設參數就失效的暗契約）
- BaseAvatar 的 `src`↔`alt` 約束未比照 BaseButton 用 discriminated union（規範 §2「a11y 約束優先用型別表達」）

### C4. 測試與 Storybook 的關鍵盲區

- **`BasePopover.spec.ts:33` 預設 `disableFocusTrap: true`** → trap 行為零測試覆蓋，正是 C1-6/7 藏身處。
- 六個浮層元件都沒有「關閉後焦點還給 trigger」與「開→關→再開循環」測試；混合疊層（Modal 內開 Dropdown）的 Esc/點外協調無測試。
- BaseDatePicker **完全沒有鍵盤導航測試**（C1-4 因此漏網）；BaseTree 鍵盤測試薄弱（12 案 vs Table 55 案）。
- 無「原生 `<form>` submit 序列化」的 FormData 層級測試與 story。
- Storybook 未裝 `@storybook/addon-a11y`（自家文件已註明未裝）；缺跨元件疊層 story——正是最能暴露 C1-8 的驗收場景。

---

## D. 值得肯定的資產（保持下去）

1. **IME 組字處理完整度罕見**：`useComposingModel` 精準複刻 `vModelText` 全部行為（composing 旗標、`.trim`/`.lazy`/`.number`、聚焦中不覆寫），連 Select 搜尋框都有 `isComposing` 守衛，且有對應測試。
2. **跨兩套浮層體系共用 `overlayTrapStack` + `usePopupsManager`**：Modal 內開 Select 時下層 trap 自動暫停、Esc 由 isTop 協調——自製元件庫少見且實作正確（含對 focus-trap 原始碼行為的正確理解，`allowOutsideClick` 的處理完全正確）。
3. **token + `:where()` + `color-mix` 的主題化路線是對的**：specificity 歸零讓使用端覆寫得動、單一 accent 推導淡色調讓自訂色與語意色走同一條 CSS 路徑——缺的只是語意層（B1）。
4. **「對參考實作的修正」文件化**：各 docs 把修掉的 bug 留成 regression 依據並有測試對應——這是元件庫可長期維護的關鍵習慣。
5. **受控/非受控、standalone 降級、provide/inject 型別契約**貫徹到底：複合元件單獨誤用不 crash、不留半殘 aria（`BaseTabPanel.vue:33-45` 是範本級寫法）。

---

## E. 建議行動路線圖

### 第 1 波：止血（發佈前必修，約 2–4 天）

1. A2 auto-import 一行設定
2. C1 的 9 個 🔴 bug
3. B5 Props export（機械修正）
4. LICENSE

### 第 2 波：成為真正的庫（約 1–2 週）

1. A1 發佈機制（先 Nuxt Layer）
2. B1 token 語意層 + Toast/DatePicker 補 `:where()`
3. B2 CI / ESLint / typecheck 範圍
4. A3 目錄分類裁決
5. B3 labels 統一 + B4 命名裁決（`danger` vs `error`）

### 第 3 波：養成（持續）

1. 補 useOverlay / findFirstLegitChild / trap 行為 / 鍵盤導航測試
2. docs drift 清理與 copilot-instructions 指標化
3. `@storybook/addon-a11y` + 跨元件疊層 story
4. C2 的 a11y 深水區（Tree tab stop、DatePicker accessible name 等）
5. dark mode token 集

---

## 待裁決的三個方向性決策

以下三個都是「發佈前改很便宜、發佈後改是 breaking change」的決定：

| # | 決策 | 選項 |
|---|---|---|
| 1 | **發佈機制** | Nuxt Layer（短期）→ npm lib（中期）的節奏 |
| 2 | **目錄分類** | atomic design 歸位 vs 扁平化 `base/` |
| 3 | **語意色命名** | `danger` vs `error`（目前 Toast `type` / Alert `color` / Result `status` 三軌並行） |
