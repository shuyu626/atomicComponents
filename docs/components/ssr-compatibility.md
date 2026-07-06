# SSR 相容性總覽

> 稽核範圍：`app/components/atoms/`（44 個元件）、`app/composables/`、`app/utils/`、`app/helpers/`。
> 環境假設：Nuxt server render + client hydration。
> 結論：**全部元件皆可在 SSR 模式使用**，無 setup 頂層或 module scope 的裸露 DOM 存取（不會 SSR crash）；僅 3 處低風險 hydration 邊界情況，詳見〔風險清單〕。

## 專案 SSR 防護慣例

新元件請遵循以下既有 pattern：

| # | Pattern | 代表位置 |
|---|---|---|
| 1 | **`canUseDOM` 常數守衛**（`typeof window/document !== 'undefined'`），用於 composable | `useDrag.ts:31`、`usePopupsManager.ts:34`、BaseFileUpload 的 `canUseObjectUrl`（`BaseFileUpload.vue:342`） |
| 2 | **Singleton Observer 工廠 + 支援判斷**：Observer 建構延遲到首次 `observe`，無 API 時回 no-op | `createResizeObserver.ts:19`、`createIntersectionObserver.ts:27`、`createSingletonObserver.ts` |
| 3 | **生命週期延遲**：DOM 副作用集中在 `onMounted` / `watch(ref)` / client-only 的 `onBeforeMount` / 事件 handler | `useOverlay.ts:153-161`、`BaseLink.vue:193`、`BaseToast.vue:218`、`BaseDatePicker.vue`（`today` 於 `onMounted` 設值） |
| 4 | **函式內 `typeof` 內聯守衛**（元件內零星 DOM 存取） | `BaseLink.vue:58,65`、`BaseTextField.vue:240`、`BaseTextarea.vue:242`、`BaseAccordionPanel.vue:140` |
| 5 | **id 一律 `useId()`**（SSR / client 決定性一致，禁止自製 counter / random） | BaseSelect、BaseTabs、BaseDialog、BaseModal、BaseDrawer、BasePopover、BaseCheckbox、BaseRadio… |
| 6 | **prefers-reduced-motion 雙軌**：視覺過場用 CSS `@media`（SSR 安全）；需 JS 分支才用守衛過的 `matchMedia` | `BaseToastContainer.vue`（CSS）、`BaseAccordionPanel.vue:140-141`（JS） |
| 7 | **宣告式初始態**：以 `[hidden]` 等屬性讓 SSR 首渲即為正確狀態，避免 mount 後閃爍 | `BaseAccordionPanel.vue`（收合態） |
| 8 | **Teleport 一律搭 `v-if="open"`（預設 false）**：SSR 預設不渲染浮層內容，避免 hydration mismatch | BaseModal / BaseDialog / BaseDrawer / BasePopover |

## 各元件 SSR 狀態與防護標記

### 有 DOM / 瀏覽器 API 存取的元件

| 元件 | 狀態 | 防護手段（位置） |
|---|---|---|
| BaseModal | ✅ | `Teleport` + `v-if="open"`（`open` 預設 false）；focus-trap 委派 useOverlay |
| BaseDialog | ✅ | 同上；拖曳走 useDrag（已守衛） |
| BaseDrawer | ✅ | 同上 |
| BasePopover | ✅ | `Teleport` + `v-if`；`createFocusTrap` 於開啟時建立；全域 listener 於開啟時掛載、關閉/卸載時移除；id 用 `useId()` |
| BaseTooltip | ✅ | 委派 BasePopover，無自身 DOM 存取 |
| BaseSelect | ✅ | `document.activeElement` 僅在鍵盤 handler 內；浮層委派 BasePopover；id 用 `useId()` |
| BaseDropdown | ✅ | `document.activeElement` 僅在 handler 內；浮層委派 BasePopover |
| BaseDatePicker | ⚠️ | `today` 初始 `null`、`new Date()` 延遲到 `onMounted`；`fallbackToday()` 有 `new Date()` 保底路徑（見風險 #1） |
| BaseToast | ✅ | `Date.now()` 僅在 timer 函式內，由 `onMounted` 啟動 |
| BaseToastContainer | ⚠️ | 常駐 `Teleport to="body"` live region，初始為確定性空內容（見風險 #2） |
| BaseFileUpload | ✅ | `canUseObjectUrl` 守衛所有 `URL.createObjectURL/revokeObjectURL`；建立時機在檔案選取 handler |
| BaseLink | ✅ | `typeof window` 守衛 idle callback；IntersectionObserver 於 `onMounted` 建立 |
| BaseScrollbar | ✅ | `document` / `window.getSelection` 全在 pointer handler 與 `onUnmounted`；尺寸監聽走 useResizeObserver |
| BaseTextarea | ✅ | `getComputedStyle` 在 autosize 函式內；`document.activeElement` 有 `typeof document` 守衛 |
| BaseTextField | ✅ | `document.activeElement` 有 `typeof document` 守衛 |
| BaseTabs | ✅ | `document.activeElement` 僅在鍵盤 / roving handler 內；id 用 `useId()` |
| BaseAccordionPanel | ✅ | `matchMedia` 有 `typeof window` 守衛；收合態用宣告式 `[hidden]`，SSR 首渲即正確 |
| BaseCheckbox | ✅ | `indeterminate` DOM prop 於 `onMounted` 設定（client-only） |

### 純展示元件（無 DOM 存取，✅ 安全）

BaseAccordion、BaseAlert、BaseAvatar、BaseAvatarGroup、BaseBadge、BaseBreadcrumb、BaseButton、BaseCard、BaseCheckboxGroup、BaseChip、BaseDivider、BaseFormField、BaseList、BaseListGroup、BaseListItem、BasePagination、BaseProgress、BaseRadio、BaseRadioGroup、BaseRating、BaseResult、BaseSpinner、BaseSwitch、BaseTabPanel、BaseTable、BaseTree — id 需求一律使用 `useId()`。

### Composables

| 檔案 | 狀態 | 防護手段（位置） |
|---|---|---|
| useOverlay | ✅ | focus-trap 由 `watch(panelRef)` 建立；client-only `onBeforeMount` 補跑；`document.addEventListener` 於 `onMounted` |
| usePopupsManager | ✅ | `canUseDOM` 守衛所有 `document.body` / `window.innerWidth` 存取 |
| useDrag | ✅ | `canUseDOM` 守衛所有 `window` listener |
| useResizeObserver | ✅ | observe 於 `watch` / `onMounted` 流程；底層 singleton 已做支援判斷 |
| useToast | ⚠️ | singleton 延遲建立；id 用模組層計數器（見風險 #3） |
| usePagination / useFormFieldProps / useValidation / useStringLength | ✅ | 純運算，無 DOM、無時間、無亂數（`Intl.Segmenter` Node / 瀏覽器皆支援） |

### Utils / Helpers

| 檔案 | 狀態 | 備註 |
|---|---|---|
| createResizeObserver / createIntersectionObserver / createSingletonObserver | ✅ | `typeof window && typeof XObserver` 判斷，無 API 時 no-op；建構延遲到首次 observe |
| dom.ts | ✅ | 純函式，只操作呼叫端傳入的元素；由呼叫端保證在 client 呼叫 |
| date.ts | ✅ | 全部「以參數建構」的決定性日期計算，無讀取當下時間 |
| preloadRouterLinkComponents | ✅ | 純 router 操作 |
| 其餘（clamp、formatBytes、is*、noop、pick、toArray、toUnit、validators） | ✅ | 純函式 |
| findFirstLegitChild / resolveSlotChildren（helpers） | ✅ | 操作 VNode，無 DOM |

## 風險清單（低風險邊界情況）

### 1. BaseDatePicker — `fallbackToday()` 的 `new Date()` 保底

`today` 正確延遲到 `onMounted` 設值，但 `fallbackToday()` 保留 `today.value ?? new Date()` 保底。若日曆面板內容在 SSR 期被求值，server 與 client 的「今日」可能因時區 / 跨午夜不同而 mismatch。**實務上面板由 BasePopover 以 `v-if` 控制、關閉時不渲染，一般不會觸發。** 若未來支援「初始即開啟」的日曆，需先將此保底改為 client-only。

### 2. BaseToastContainer — 常駐 Teleport live region

a11y live region 需要常駐渲染，是專案中唯一不搭 `v-if="open"` 的 Teleport。初始為確定性空內容，hydration 一致；但**若有程式在 client mount 前（如 Nuxt plugin）就呼叫 `useToast().show()`，會產生 hydration mismatch**。約定：toast 只能由 client 互動觸發。若需更保險可改用 `<ClientOnly>` 或 Teleport `defer`。

### 3. useToast — 模組層計數器 id

`toast-${++seed}` 是專案唯一非 `useId()` 的 id 生成。在「toast 僅 client 建立」的約定下安全；若未來需要 SSR 期建立 toast，必須改為 `useId()` 或 per-instance 計數器（模組層 seed 在 server 長駐程序會跨請求累加）。

## 新元件 SSR Checklist

- [ ] setup 頂層與 module scope 不得出現 `window` / `document` / `navigator` / `matchMedia` / `localStorage`
- [ ] Observer / focus-trap / `createObjectURL` 只在 `onMounted`、`watch(ref)` 或事件 handler 內建立，並於 `onUnmounted` / `onScopeDispose` 清理
- [ ] id 一律 `useId()`
- [ ] 不在可能於 SSR 求值的 computed / render 路徑使用 `new Date()`、`Date.now()`、`Math.random()`
- [ ] Teleport 內容以 `v-if`（預設 false）控制；常駐渲染需保證初始輸出為確定性內容
- [ ] 動畫偏好優先用 CSS `@media (prefers-reduced-motion)`；JS 分支需 `typeof window` 守衛
