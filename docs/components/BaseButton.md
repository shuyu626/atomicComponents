# Button 元件規範

> **歸屬**:`Base*` 通用元件家族(`app/components/atoms/BaseButton.vue`)。
> **配套**:`docs/components/component-design-spec.md`(跨元件通用原則)。

本文件是 Button 元件的完整規格,可作為其他通用元件撰寫時的範例藍本。

---

## 1. P0 必備 Props

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'text' \| 'link'` | `'solid'` | 視覺結構。**不綁定顏色** |
| `color` | `'primary' \| 'danger' \| 'success' \| 'warning' \| 'info' \| 'neutral'` | `'primary'` | 語意顏色。獨立於 variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 同時控制 padding / 字級 / min-height |
| `disabled` | `boolean` | `false` | 表單必備 |
| `loading` | `boolean` | `false` | 非同步動作必備 |
| `type` | `'button' \| 'submit' \| 'reset'` | `'button'` | 預設安全值,避免意外提交 |
| `block` | `boolean` | `false` | 全寬(手機 CTA、modal footer 常用) |
| `to` | `RouteLocationRaw` | — | 渲染為 `<NuxtLink>` / `<RouterLink>` |
| `href` | `string` | — | 透過 BaseLink 委派渲染(由 fallback chain 決定 NuxtLink / RouterLink / `<a>`) |
| `target` | `'_self' \| '_blank' \| '_parent' \| '_top'` | — | 配合 `href`。**`_blank` 時自動補 `rel="noopener noreferrer"`** |

---

## 2. P1 / P2 進階 Props

| Prop | 型別 | 用途 |
|---|---|---|
| `shape` | `'rectangle' \| 'square' \| 'circle' \| 'pill'` | icon-only 強制 1:1 寬高;`pill` = 完整圓角 |
| `iconOnly` | `boolean` | 顯式 icon button 模式。觸發**強制 `aria-label`** |
| `aria-label` | `string` | icon-only 時必填 |
| `aria-pressed` | `boolean` | toggle(收藏 / 點讚 / 暗黑模式) |
| `aria-expanded` | `boolean` | popup / menu trigger |
| `aria-controls` | `string` | 配合 `aria-expanded` |
| `aria-haspopup` | `'menu' \| 'listbox' \| 'dialog' \| 'tree' \| 'grid' \| 'true'` | popup 類型提示 |
| `rounded` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'full'` | 覆寫預設圓角 |

> **非宣告式 prop(透傳)**:以下不是 BaseButton 宣告的 prop,而是透過 Vue fallthrough attributes 落到底層元素 / 元件,功能由該層提供:
> - `download` / `form` / `name` / `value` —— 渲染為原生 `<button>`(或 `<a>`)時透傳的**原生 attr**(`form` 跨 DOM 觸發提交、`name`/`value` 區分同 form 多 submit、`download` 配合連結觸發下載)。
> - `replace` / `prefetch` —— 有 `to` / `href` 時委派 `BaseLink`(NuxtLink / RouterLink)的 **prop**,透傳生效。
>
> 元件**未支援** polymorphic `as` / `tag`(整合 headless-ui 等),也**沒有** `elevated`(FAB shadow)prop。FAB 陰影請以 class / `--btn-*` token 自訂;根元素只在「有 `to`/`href` → BaseLink」與「否則 → 原生 `<button>`」兩者間自動切換。

---

## 3. Slot 設計

| Slot | 內容 | 注意 |
|---|---|---|
| `default` | 主文字 / 內容 | 是純文字時自動 `truncate` 避免溢出 |
| `prepend` | 前綴(icon / badge) | 跟 `append` 命名成對 |
| `append` | 後綴 | 同上 |
| `loading` | 自訂 spinner | 預設 spinner 不一定合品牌 |

---

## 4. 內部行為(實作必做)

| 行為 | 實作 |
|---|---|
| disabled 點擊保護 | `@click` 內 `e.preventDefault(); e.stopPropagation()` + CSS `pointer-events: none`。**用 `stopPropagation` 而非 `stopImmediatePropagation`** —— 後者會吃掉同一 element 上 `v-on="$attrs"` 透傳的 handler |
| loading 視為 disabled | 同時 disable click + 加 `aria-busy="true"` |
| Loading 保留寬度 | spinner `position: absolute` 覆蓋,內容用 `visibility: hidden` 保留 layout |
| `target="_blank"` 安全預設 | 自動補 `rel="noopener noreferrer"`(caller 可顯式覆寫) |
| `<a>` 模式的 disabled | 設 `aria-disabled="true"` + `tabindex="-1"` + `pointer-events:none` |
| Focus 樣式 | `:focus-visible` ring,非 `:focus` |
| 鍵盤行為 | `<button>` 原生 Enter / Space;`<a role="button">` 要補 Space |
| 觸控目標 | 粗指標裝置(`@media (pointer: coarse)`)下 ≥ 44 × 44px;`sm` 桌機保持 28px 視覺(避開密集排版),手機改用透明 hit-area pseudo 擴大觸控區到 44 × 44(WCAG 2.5.5) |
| Icon 間距 | 用 `gap` 而非 margin(RTL 友善) |
| Reduced motion | spinner / transition 包 `@media (prefers-reduced-motion: reduce)` |
| 透傳 attrs | 預設 fallthrough 即可;`data-testid` / `class` / `@click` 全部要能透過 |
| Click 事件 | **不要 `emit('click')`**,讓 `@click` 透過 attrs fallthrough。`onClick` 只負責 disabled 攔截 |
| toggle / popup a11y | `aria-pressed` / `aria-expanded` / `aria-haspopup` **僅在渲染為原生 `<button>`** 時輸出;委派成連結(BaseLink / `<a>`,即有 `to` / `href`)時不輸出 |
| icon-only 警告 | `iconOnly` 為 `true` 但未提供 `ariaLabel` 時,於 **dev 環境 `console.warn`** 提醒(避免 SR 只報「button」) |

---

## 5. A11y Checklist

| 情境 | 必做 |
|---|---|
| icon-only button | `aria-label` 必填(否則 SR 只報「button」) |
| loading 中 | `aria-busy="true"` |
| disabled 在 `<button>` | `disabled` attribute |
| disabled 在 `<a>` | `aria-disabled="true"` + `tabindex="-1"` + `pointer-events:none` |
| toggle | `aria-pressed="true/false"`(僅原生 `<button>` 輸出,委派連結時不輸出) |
| menu trigger | `aria-haspopup` + `aria-expanded`(僅原生 `<button>` 輸出,委派連結時不輸出) |
| 顏色傳達狀態 | 同步配 icon 或文字(色盲友善) |
| 對比度 | 文字對背景 ≥ 4.5 : 1 |
| Focus indicator | 不可 `outline: none` 無備案 |

---

## 6. 反模式(常見錯誤)

| 反模式 | 為什麼錯 | 正解 |
|---|---|---|
| 把 `danger` 寫成 variant | 跟 `outline` 組不起來 | 拆 `variant` × `color` |
| `<a><button></button></a>` | 無效 HTML | polymorphic 擇一渲染 |
| 自定義 `emit('click')` | 重複、攔不到原生 keydown | 讓 `@click` fallthrough |
| 寫死 hex | 跨專案無法套主題 | CSS var / token |
| disabled 連結還能點 | attribute 在 `<a>` 無效 | `pointer-events:none` + `aria-disabled` + `tabindex="-1"` |
| `:focus` 而非 `:focus-visible` | 滑鼠點完也亮 ring | 用 `:focus-visible` |
| Loading 寬度變化 | layout shift | absolute spinner + `visibility:hidden` 內容 |
| icon 用 prop name | 耦合 icon library | slot |
| 一個 size 控所有 | 設計師沒法獨立調 | CSS var override |
| `nativeType` + `type` 兩個 prop | API 混亂 | 一個 `type` |
| ripple 寫死 | Material-only,iOS 風不需要 | opt-in `ripple` |
| 內建 confirm dialog / debounce | 違反單一職責 | caller 自行包裝 |

---

## 7. 跨情境驗收清單

寫完 Button 後逐項試,API 撐不撐得住:

| 情境 | Props 組合 |
|---|---|
| 表單送出 | `type="submit" loading` |
| 取消刪除 | `variant="ghost" color="danger"` |
| 警告 CTA(黃) | `variant="solid" color="warning"` |
| 危險主 CTA | `variant="solid" color="danger"` |
| 表格內次要按鈕 | `size="sm" variant="outline"` |
| 內部路由 | `to="/foo"` |
| 外部新分頁 | `href="..." target="_blank"`(自動補 rel) |
| 圓形 close | `iconOnly shape="circle" aria-label="Close"` |
| Dropdown trigger | `aria-haspopup="menu" :aria-expanded="open"` |
| 收藏 toggle | `:aria-pressed="favorited"` |
| Modal footer 觸發外部 form | `type="submit" :form="formId"` |
| 下載檔案 | `href="/file.pdf" download` |
| FAB 浮動按鈕 | `shape="circle" size="lg"`(陰影用 class / `--btn-*` token 自訂;**無 `elevated` prop**) |
| Pagination 上下頁 | `iconOnly variant="ghost" aria-label="Previous"` |
| Segmented control 單顆 | `variant="ghost" :aria-pressed` |
| ~~整合 headless-ui MenuButton~~ | **未支援** polymorphic `:as` / `:tag` |

---

## 8. 不該做(邊界外)

| 項目 | 為什麼不做 |
|---|---|
| ripple 動畫 | Material-only,不通用,opt-in 才考慮 |
| icon name prop | 耦合 icon library |
| 內建 confirm dialog | 違反單一職責 |
| 內建 debounce / throttle | 用 composable 包 |
| 任意 hex color override prop | 破壞 design system,不如直接 `class` |
| 多層 polymorphic 巢狀 | API 太繞 |
| 自訂 variant slot 注入 | 過度設計,99% 用不到 |
| 多階 loading 狀態 | 業務邏輯 |

---

## 附錄:與主流元件庫對照

| 概念 | MUI | Vuetify | Chakra | Mantine | Element Plus | Ant Design |
|---|---|---|---|---|---|---|
| 視覺 | `variant: contained / outlined / text` | `variant: elevated / flat / outlined / text / tonal / plain` | `variant: solid / outline / ghost / link` | `variant: filled / outline / light / subtle / transparent / default / gradient` | `type: primary / success / info / warning / danger` | `type: primary / default / dashed / text / link` |
| 顏色 | `color: primary / secondary / success / error / info / warning` | `color: any token` | `colorScheme: any token` | `color: any token` | (混在 type) | (混在 type) |
| 尺寸 | `size: small / medium / large` | `size: x-small / small / default / large / x-large` | `size: xs / sm / md / lg` | `size: xs / sm / md / lg / xl` | `size: large / default / small` | `size: large / middle / small` |
| icon-only | 用 `<IconButton>` 另外元件 | `icon` prop | `<IconButton>` | `<ActionIcon>` | `circle` + slot | `shape="circle"` + icon |

**觀察**:
- MUI / Chakra 把 icon button 拆獨立元件;Vuetify / Mantine 用 prop 整合
- Element Plus / Ant Design 把 variant 與 color 混在一起(早期 API 缺陷)
- 多數現代庫(MUI / Chakra / Mantine)都遵循 **variant × color 解耦**
