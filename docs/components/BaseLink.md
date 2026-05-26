# Link 元件規範

> **歸屬**:`Base*` 通用元件家族(`app/components/atoms/BaseLink.vue`)。
> **配套**:`docs/components/component-design-spec.md`(跨元件通用原則)、`docs/components/BaseButton.md`(連結型按鈕參考)。

BaseLink 是「跨環境連結適配層」,把 NuxtLink / RouterLink / `<a>` 三種底層的差異收斂成單一 API。需要連結行為的其他元件(BaseButton、BaseCard、BaseMenuItem...)應該透過 BaseLink 渲染連結,而非自行 `resolveComponent('NuxtLink')`。

---

## 1. P0 必備 Props

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `to` | `RouteLocationRaw` | `''` | 路由位置(內部)或 URL 字串(外部)。type 是 `string \| RouteLocation`,涵蓋兩種用法 |
| `target` | `'_self' \| '_blank' \| '_parent' \| '_top'` | — | 連結開啟目標。**`_blank` 自動補 `rel="noopener noreferrer"`** |
| `external` | `boolean` | `false` | 強制視為外部連結。優先順序最高,可覆蓋 `to` 的型別推斷 |

---

## 2. P1 / P2 進階 Props(目前未實作,延伸時參考)

| Prop | 型別 | 用途 | 備註 |
|---|---|---|---|
| `replace` | `boolean` | 路由 replace 而非 push | 對應 RouterLink 同名 prop |
| `prefetch` | `boolean` | 覆寫 link prefetch 預設 | 預設啟用,大量列表時可關掉省頻寬 |
| `activeClass` | `string` | 當前路由 active class | RouterLink / NuxtLink 共用 |
| `exactActiveClass` | `string` | 完全匹配 active class | 同上 |
| `noPrefetch` | `boolean` | 顯式關閉本元件的 preload | viewport 大量 link 時用 |
| `aria-current` | `'page' \| 'step' \| 'true'` | 當前頁標記 | autocomplete 給多數情境 `page` |
| `download` | `string \| boolean` | 配合外部 `href` 觸發下載 | 同 `<a download>` |
| `as` / `tag` | `string \| Component` | polymorphic 逃生口 | 整合 headless-ui MenuItem 等情境 |

---

## 3. Slot 設計

| Slot | 內容 | 注意 |
|---|---|---|
| `default` | 連結內容(文字 / icon / 任意 Vue node) | 不限定型別,使用方完全自主 |

> **不提供 `prepend` / `append` slot**:這是 BaseButton 的責任。BaseLink 是純連結語意的最薄一層,**只負責 link 行為**,內容裝飾交給使用方或外層元件。

---

## 4. 內部行為(實作必做)

### 4.1 元件 fallback chain

| 優先序 | 觸發條件 | 渲染為 | 原因 |
|---|---|---|---|
| 1 | `isExternal === true` | `<a href=... target=... rel=...>` | 外部連結不可用 router 機制 |
| 2 | NuxtLink 全域已註冊 | `<component :is="NuxtLink">` | Nuxt 環境(或 Storybook stub)。享 NuxtLink 內建 prefetch / external 判斷 / SSR |
| 3 | 其他(純 Vite + vue-router SPA) | `<RouterLink>` + 自家 preload | NuxtLink 不存在時退到 RouterLink |

判斷時機:**模組載入時一次**(`resolveComponent('NuxtLink')` 結果不會 reactive),所以同一個專案的所有 BaseLink 走同一條 fallback。

### 4.2 External / Internal 判斷規則

優先序由上而下,**第一條命中就決定**:

| 序 | 規則 | 範例 |
|---|---|---|
| 1 | `external === true` | `<BaseLink external to="/foo">` → 視為外部 |
| 2 | `target` 為 `_blank` / `_parent` / `_top`(非 `_self`) | `<BaseLink to="/foo" target="_blank">` → 外部 |
| 3 | `to` 是 route object | `<BaseLink :to="{ name: 'home' }">` → 內部 |
| 4 | `to` 為空字串 或 含 protocol | `<BaseLink to="https://...">` / `<BaseLink to="mailto:...">` → 外部 |
| 5 | 以上皆否 | 內部 |

`hasProtocol` 直接採用 `ufo` 套件。`ufo` 本來就是 Nuxt 內部用來判斷 external link 的工具(NuxtLink 的實作依賴它),從 transitive dep 升級為 direct dep,不增加 bundle 體積。

### 4.3 Route preloading(RouterLink 路徑專用)

NuxtLink 環境**不執行**(NuxtLink 已內建 prefetch)。RouterLink 路徑時:

1. `onMounted` 後排程 `requestIdleCallback`(無此 API 時 fallback `setTimeout(_, 200)`,200ms 是避開 first paint 競爭、貼近 idle 精神的折衷;**不要**用 `setTimeout(_, 1)`,等同於 next task 仍會與 LCP 搶資源)
2. idle 時透過 `createIntersectionObserver()` 取得 **app 共享的 singleton observer**,`observe` link 的真實 DOM(`$el`)。100+ link 的列表頁也只有 1 個原生 IntersectionObserver 實例
3. link 進入 viewport → 觸發 `preloadRouterLinkComponents(to, router)` → **立即 unobserve**(只跑一次)。最後一個 link 解除時 singleton 會自動 `disconnect` 釋放原生資源,呼叫端不需管理。命名刻意避開 Nuxt 內建的 `preloadRouteComponents`(避免 auto-import shadow),設計上跨 Vite-SPA / Nuxt 都可用
4. `router._routePreloaded` set 記錄已 preload 的 path,跨多個 BaseLink 共享避免重複載入。**失敗時該 path 會從 set 移除**,下次仍可重試(避免網路抖動後永久卡死)
5. External link 在 idle callback 內仍會再檢一次 `isExternal`,中途改 prop 也安全
6. Chunk 載入失敗:吞錯(preload 本就 best-effort),dev 模式以 `console.warn` 提示協助定位 — 錯誤處理已內聚在 helper 內,呼叫端**不需**再 `.catch(noop)`

### 4.4 其他行為

| 行為 | 實作 |
|---|---|
| `target="_blank"` 安全預設 | 自動補 `rel="noopener noreferrer"`(caller 可顯式覆寫透過 attrs fallthrough) |
| href 解析 | `to` 是 object 時透過 `router.resolve(to).href` 取出字串給 `<a>` 用(vue-router 4 必回 `RouteLocation`,不需 optional chaining) |
| SSR guard | `typeof window === 'undefined'` 直接 return,不存取 browser API。`createIntersectionObserver` 在無 `IntersectionObserver` 時回 no-op handle,呼叫端不必再寫 typeof guard |
| 舊瀏覽器 fallback | `requestIdleCallback` 不存在 → `setTimeout(_, 200)`;`IntersectionObserver` 不存在 → helper 回 no-op,preload 整段流程跳過(不報錯) |
| Cancel API this 綁定 | `cancelIdleCallback` / `clearTimeout` 在 fallback 切換時用 `.bind(window)`,避免某些瀏覽器要求 `window` 作為 receiver |
| Idle helpers 放置 | `scheduleIdle` / `cancelIdle` 提到 module 層級,不依賴 props/refs,避免每個 BaseLink 實例重建一份 |
| Unmount 清理 | `onBeforeUnmount` 取消未觸發的 idle callback、unobserve link(若已 observe)。**不要**呼叫 `disconnect` — 共享 observer 由 singleton 自動管理 |
| Unobserve idempotent | `createIntersectionObserver` 回傳的 unobserve 重複呼叫安全(內部 `callbacks.has` guard 防 NPE),但呼叫端**仍應**在觸發後設 `unobserve = null` 釋放 closure |
| 透傳 attrs | 預設 fallthrough。`class` / `data-testid` / `@click` 全部能透過 |

---

## 5. A11y Checklist

| 情境 | 必做 |
|---|---|
| 外部連結 + `target="_blank"` | 自動補 `rel="noopener noreferrer"`(已內建) |
| 當前頁連結 | caller 傳入 `aria-current="page"`,讓 SR 知道目前位置 |
| 純 icon link | caller 必須補 `aria-label`(本元件不強制,由外層 BaseButton/BaseIconButton 把關) |
| 連結文字 | 不該只寫「點這裡」、「More」,SR list mode 無上下文 |
| 顯示文字 ≠ 連結目的 | 用 `aria-label` 補完整描述 |
| disabled link | **不該存在**。要禁用就不要渲染連結,改用 `<button disabled>` |
| Focus indicator | 不可 `outline: none` 無備案(本元件不寫樣式,在 caller 把關) |
| 焦點順序 | 跟 DOM 順序一致即可(不另設 `tabindex`) |

---

## 6. 反模式(常見錯誤)

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 元件內 `resolveComponent('NuxtLink')` 散落多處 | DRY 違反、跨環境難移植 | 統一過 BaseLink |
| `<a>` 跟 `<RouterLink>` 寫兩份分支 | 跨環境會踩雷 | 用 BaseLink 適配 |
| `target="_blank"` 沒補 `rel` | 開新分頁的安全洞(window.opener 攻擊) | 本元件自動補,不要顯式覆寫除非必要 |
| disabled 連結 | `<a disabled>` 無效 HTML | 改渲染 `<button disabled>` 或不渲染 |
| `to=""` 想當「不導航」 | 仍會 render `<a href="">` 跳回首頁 | 想 no-op 改用 `<button>` |
| 寫死 `<a href="...">` 跨頁 | 跳脫 SPA,完整 page reload | 用 BaseLink + `to` |
| `useRouter()` 在無 router 環境用 | throw | 用 BaseLink 包,有 fallback 到 `<a>` |
| 大量列表全部 preload | 浪費頻寬(helper 已對「同 path」做路由級 dedup,但不同 path 仍各自載入一次) | 加 `noPrefetch` prop(實作後) |
| 把連結文字寫成「More」 | a11y 無上下文 | 寫具體目的「下載 2024 年報」 |
| 在連結內放 `<button>` | 無效巢狀互動 | 擇一(連結或按鈕) |

---

## 7. 跨情境驗收清單

寫完後逐項試,API 撐不撐得住:

| 情境 | Props 組合 |
|---|---|
| 內部路由(字串) | `to="/products"` |
| 內部路由(具名) | `:to="{ name: 'product-detail', params: { id } }"` |
| 外部新分頁 | `to="https://example.com" target="_blank"`(自動補 rel) |
| 外部不開新分頁 | `to="https://example.com"`(命中規則 4,仍外部) |
| Email link | `to="mailto:foo@bar.com"` |
| 電話 link | `to="tel:+886912345678"` |
| 強制外部(內部路徑也想用 `<a>`) | `external to="/legacy-page"` |
| 內部錨點 | `to="#section"`(視為相對 protocol,目前歸外部 — 之後可加 `anchor` 例外規則) |
| 同源跨子網域 | `to="//cdn.example.com/foo"`(命中規則 4 acceptRelative) |
| 當前頁標記 | `to="/foo" aria-current="page"` |
| 跨環境(複製到純 Vite SPA) | 同樣 props 都能跑(NuxtLink 不存在時退 RouterLink) |
| 多元件巢狀(BaseButton 用 BaseLink) | 預期改 BaseButton 後測這個 |

---

## 8. 不該做(邊界外)

| 項目 | 為什麼不做 |
|---|---|
| 內建樣式(底線 / 顏色) | 違反「最薄適配層」原則。視覺由 caller 或外層元件控 |
| disabled prop | 連結 disabled 是反模式,不該支援 |
| `loading` 狀態 | 連結沒有「載入中」的語意,要 spinner 該用 BaseButton |
| `download` 寫成複雜的 file API | `<a download>` 已夠用,複雜下載另開 hook |
| 自己實作 prefetch 策略 | NuxtLink 已最佳化,RouterLink 路徑用最簡 IntersectionObserver 即可 |
| 巢狀路由 active class 邏輯 | RouterLink / NuxtLink 內建,別重造 |
| 整合 history / scroll 行為 | router 配置層做,不在元件 |
| 自動把所有 `<a>` 抓出來改寫 | caller 自主決定何時用 BaseLink |

---

## 附錄:與主流連結元件對照

| 概念 | NuxtLink | Vue Router | Next.js | Inertia | Astro |
|---|---|---|---|---|---|
| 元件名 | `<NuxtLink>` | `<RouterLink>` | `<Link>` | `<Link>` | `<a>`(內建 ViewTransition) |
| 內部路由 prop | `to` | `to` | `href` | `href` | `href` |
| 外部判斷 | 自動(含 `external` prop) | 無內建(要自己判斷) | 自動 | 用 `<a>` | 自動 |
| Prefetch | viewport-based(opt-out) | 無 | viewport-based(opt-out) | manual `prefetch` prop | 無 |
| target=_blank | 不自動補 rel | 不自動補 rel | 不自動補 rel | 不自動補 rel | 不自動補 rel |
| SSR | ✅ | ✅(SSR mode) | ✅ | ✅ | ✅ |
| 適配跨環境 | Nuxt-only | router-only | Next-only | Inertia-only | Astro-only |

**觀察**:

- 多數框架都把 link 元件耦合到自家 router,**沒有跨框架的標準連結 API**
- `target="_blank"` 安全(`rel="noopener"`)**幾乎沒有官方元件主動補**,這是常見漏洞
- Prefetch 策略差異大:NuxtLink / Next 預設開、Vue Router / Astro 預設關
- **BaseLink 的定位**:把這些差異收斂成單一 API,讓元件庫不被綁死在某一個 framework
