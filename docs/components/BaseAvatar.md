# Avatar 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseAvatar.vue`、`app/components/atoms/BaseAvatarGroup.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/utils/isNumberish.ts`（數值守衛）、`app/utils/isString.ts`（字串守衛）、`app/utils/toUnit.ts`、`app/helpers/resolveSlotChildren.ts`（攤平 / 過濾 slot 節點）。

BaseAvatar 是 **頭像** 元件：優先顯示圖片（`src`），無圖 / 圖片失敗時依 **三層 fallback** 依序退回 —— ① slot（失敗時 `#fallback` → `#default`；無 `src` 只認 `#default`）→ ② 文字（非空 `alt`，並依顯示文字 hash 出確定性自動配色）→ ③ 內建匿名剪影 SVG，確保任何輸入組合都不會渲染空白圓。BaseAvatarGroup 把一組頭像 **重疊堆疊**，並把超出 `max` 的數量收斂成 `+N`。

兩者皆為純展示元件（無 emit、無 v-model），尺寸 / 圓角 / 顏色全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicAvatar`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicAvatar.vue) 與 [`AtomicAvatarGroup`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicAvatarGroup.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. BaseAvatar — Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `size` | `'sm' \| 'md' \| 'lg' \| \`${number}\` \| number` | `'md'` | 具名走預設 token；數字 / 數字字串走自訂像素 |
| `rounded` | `` `${number}` \| number \| 'full' `` | `'full'` | `full` 為圓形；其餘為像素圓角 |
| `src` | `string` | — | 圖片來源；不給則只渲染 fallback / default slot |
| `alt` | `string` | — | 圖片替代文字。**有 `src` 時必填**：作 `<img alt>`；圖片載入失敗時改作根節點 `aria-label`，並作為最終文字 fallback；裝飾性頭像明示 `alt=""`。漏給時開發期會 `console.warn` |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | 圖片載入策略；一般維持 `'lazy'`，首屏關鍵頭像改用 `priority` |
| `priority` | `boolean` | `false` | 首屏關鍵頭像捷徑：一鍵套 `loading="eager"` + `fetchpriority="high"` 加速 LCP（會覆寫 `loading`） |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 縮寫 / icon：無 `src`，或圖片失敗且未給 `fallback` 時顯示 |
| `#fallback` | 圖片載入失敗時的替代內容（未提供時退回 `#default`，再退回 `alt`，最後退回內建剪影） |

預設尺寸 token：`sm = 32px`、`md = 40px`、`lg = 56px`。

**Fallback 行為細節**

- **三層順序**：slot（`#fallback` → `#default`）→ 文字（非空 `alt`）→ 內建匿名剪影 SVG（`aria-hidden="true"`、以 `currentColor` 沿用 `--avatar-color`）。任何輸入組合都不會渲染空白圓。
- **水合前錯誤偵測**：SSR 輸出的 `<img>` 可能在水合完成前就載入失敗（error 事件已 fire、掛載後綁的 `@error` 收不到）。元件於 `onMounted` 檢查 `img.complete && img.naturalWidth === 0` 補救，等效於準則的「SSR 期 `onerror` 屬性標記」但相容嚴格 CSP（inline handler 字串需要 `'unsafe-inline'`）。
- **文字自動配色**：顯示文字 fallback 時，依顯示文字（`alt`，缺則取 `#default` slot 純文字）做確定性 hash（djb2，SSR 安全），從 8 色色盤挑選背景 / 前景（皆達 WCAG AA 4.5:1，詳見 §3）。
- **數字尺寸字級縮放**：`size` 為數字時，縮寫字級 = `size × 0.5`px（比例對齊 `md` token：字級 20px ÷ 容器 40px = 0.5）；具名尺寸維持各自 token。

---

## 2. BaseAvatarGroup — Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `max` | `number` | `3` | 最多顯示幾個；超出收斂成 `+N`。小於 1 夾為 1 |
| `size` | 同 BaseAvatar `size` | `'md'` | **統一覆寫** 群組內每個 avatar 的尺寸 |
| `rounded` | 同 BaseAvatar `rounded` | `'full'` | **統一覆寫** 群組內每個 avatar 的圓角 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 放一組 `<BaseAvatar>`；群組會統一尺寸 / 圓角、裁切到 `max`、加白色描邊與重疊位移 |

> 群組以 `cloneVNode` 把 `size` / `rounded` 覆寫進每個子 avatar，因此子層各自的 `size` / `rounded` 會被群組統一值取代。clone 時 key 沿用原 vnode 的 key（`node.key ?? index`），確保 slot 來源是動態清單（`v-for`）時 Vue 依身分而非位置 diff，避免增減 / 重排誤 patch 到錯的 avatar。

---

## 3. CSS 客製化（token）

**BaseAvatar（`--avatar-*`）**

| Token | 預設 | 作用 |
|---|---|---|
| `--avatar-size` | `40px` | 尺寸（具名尺寸會覆寫此值） |
| `--avatar-rounded` | `9999px` | 圓角 |
| `--avatar-bg` | `var(--avatar-auto-bg, #f3f4f6)` | 底色（先讀自動配色，退回靜態預設） |
| `--avatar-color` | `var(--avatar-auto-color, #374151)` | 文字（縮寫）顏色（同上） |
| `--avatar-font-size` | `var(--avatar-auto-font-size, 1.25rem)` | 縮寫字級（數字尺寸時自動注入等比字級） |
| `--avatar-font-weight` | `500` | 縮寫字重 |

**自動配色與覆寫優先序**

- 文字頭像會依顯示文字 hash 從固定 8 色色盤挑色，並以 inline style 注入 `--avatar-auto-bg` / `--avatar-auto-color`（**不**直接寫 `--avatar-bg`）。
- `--avatar-bg` 等 token 只宣告在 `:where()` 預設層（specificity 0）並讀取 auto 變數，因此**使用端以任何 class 設 `--avatar-bg` / `--avatar-color` / `--avatar-font-size` 都會贏過自動值**。
- 色盤（bg 皆配白字 `#FFFFFF`，對比值達 WCAG AA 4.5:1）：`#B91C1C` 6.5:1、`#C2410C` 5.2:1、`#B45309` 5.0:1、`#047857` 5.5:1、`#0F766E` 5.5:1、`#1D4ED8` 6.7:1、`#6D28D9` 7.1:1、`#BE185D` 6.0:1。

**BaseAvatarGroup（`--avatar-group-*`）**

| Token | 預設 | 作用 |
|---|---|---|
| `--avatar-group-overlap` | `0.5rem` | 相鄰頭像的重疊量（往左位移）；**數值越小、頭像距離拉得越開** |
| `--avatar-group-ring` | `2px solid #fff` | 每個頭像的描邊（凸顯堆疊層次） |

> 群組與頭像的預設 token 皆以 `:where()` 宣告（specificity 0），確保使用端用 class 覆寫 token 時改得動（否則會被 scoped 自動加上的屬性選擇器壓過）。

```vue
<template>
  <BaseAvatar class="brand-avatar" alt="Alex Chen">AC</BaseAvatar>
</template>

<style scoped>
.brand-avatar {
  --avatar-bg: #dbeafe;
  --avatar-color: #1e40af;
}
</style>
```

---

## 4. 基本用法

```vue
<template>
  <!-- 圖片頭像 -->
  <BaseAvatar src="/avatars/alex.jpg" alt="Alex Chen" />

  <!-- 縮寫頭像（無 src） -->
  <BaseAvatar alt="Alex Chen">AC</BaseAvatar>

  <!-- 圖片失敗 → 自訂 fallback -->
  <BaseAvatar src="/broken.jpg" alt="Alex Chen">
    <template #fallback>AC</template>
  </BaseAvatar>

  <!-- 尺寸與圓角 -->
  <BaseAvatar src="/avatars/alex.jpg" alt="Alex" size="lg" />
  <BaseAvatar src="/avatars/alex.jpg" alt="Alex" :size="64" :rounded="12" />
</template>
```

---

## 5. 群組用法

```vue
<template>
  <BaseAvatarGroup :max="3" size="md" aria-label="專案成員">
    <BaseAvatar src="/avatars/a.jpg" alt="Amy" />
    <BaseAvatar src="/avatars/b.jpg" alt="Ben" />
    <BaseAvatar src="/avatars/c.jpg" alt="Cara" />
    <BaseAvatar src="/avatars/d.jpg" alt="Dan" />
    <BaseAvatar src="/avatars/e.jpg" alt="Eve" />
  </BaseAvatarGroup>
  <!-- 顯示 A、B、C 三個重疊頭像，尾端收斂成 +2 -->
</template>
```

---

## 6. A11y

- 圖片頭像（載入成功）：語意交給 `<img alt>`，根節點**不**掛 `role="img"` / `aria-label`，避免外層與內層 `alt` 重複朗讀。
- 圖片頭像（載入失敗 fallback）：圖片消失、改顯示縮寫 / icon，此時才在根節點補 `role="img"` + `aria-label="{alt}"`，讓螢幕閱讀器把 fallback 當成一張帶描述的圖片。
- 縮寫頭像（無 `src`）：純文字內容，螢幕閱讀器直接朗讀縮寫，根節點不掛 `role`。
- 內建剪影 fallback（第三層）：純裝飾 SVG，掛 `aria-hidden="true"` + `focusable="false"`，SR 一律跳過。
- 群組：根節點 `role="group"`，**建議由使用端傳 `aria-label`**（如 `aria-label="專案成員"`）給群組命名；DOM 順序＝閱讀順序，SR 依序朗讀每個頭像的 `alt`，最後讀到 `+N`。
- `alt` 在有 `src` 時請務必提供有意義文字；裝飾性頭像明示 `alt=""` 讓 SR 跳過。漏給 `alt` 開發期會 `console.warn` 提醒。

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 用 `new Image()` 預載 + `watch` 偵測 `onerror` | 額外發一次圖片請求；需 `isMounted` 旗標規避 SSR hydration mismatch | 直接用 `<img>` 原生 `@error` 切換 fallback；無重複請求、無需 `isMounted`，初次渲染恆為 `<img>`，無 hydration 落差 |
| 2 | `:width="size"` / `:height="size"` | 具名尺寸（如 `size='md'`）時渲染出非法的 `width="md"` 屬性 | 僅在數值尺寸輸出像素 `width/height`（預留版位防 layout shift），具名尺寸交給 CSS |
| 3 | `--avatar-rounded: toUnit(props.rounded)` | 數字字串（如 `'8'`）經 `toUnit` 不會補 `px`，產生無單位的非法值 | 一律 `` `${Number(rounded)}px` ``，數字字串也正確補單位 |
| 4 | 群組 `.reverse()` 反轉 DOM + `flex-direction: row-reverse` | DOM 順序被反轉，螢幕閱讀器朗讀順序與視覺相反（a11y bug） | 保持自然 DOM 順序，改用遞減 `z-index` 達成「前者疊在上層」，閱讀順序＝視覺順序 |
| 5 | `resolveSlotChildren` 只 `import { Fragment }`，卻使用 `Comment` / `Text` | 比對到瀏覽器全域建構子而非 Vue symbol，註解 / 文字過濾失效 | 補上 `import { Comment, Fragment, Text } from 'vue'`，過濾恢復正常 |
| 6 | `resolveSlotChildren` 只攤平一層 | Fragment 內（如 `v-for` 含 `v-if=false`）的註解 / 文字 / 巢狀 Fragment 漏接，污染數量讓 `+N` 算錯 | 改為**遞迴正規化**，只留元件型節點 |
| 7 | 群組把 slot 解析放 `computed` | slot 變動不算響應依賴，子 avatar 動態增減（`v-for` 變長）時吃到舊快取、畫面不更新 | 改用 **render function** 每次 render 重算 |
| 8 | `max` 直接 `Number()` | 分數 `max`（如 `2.5`）會算出非整數的 `+2.5` | `Math.floor` 夾成 ≥ 1 的整數 |
| 9 | 群組描邊 / 重疊量寫死（`2px solid white`、`-1rem`） | 無法主題化、不隨尺寸調整 | 抽成 `--avatar-group-ring` / `--avatar-group-overlap` token |
| 10 | 群組用全域 `<style>` 觸及子 avatar | 樣式洩漏到全域 | `scoped` + `:deep()` 穿透插槽節點，避免全域污染 |
| 11 | 顏色 / 字級寫死於 `.atomic-avatar` | 不可主題化 | 全抽成 `--avatar-*` token |
| 12 | 圖片載入成功時外層仍掛 `role="img"` + `aria-label` | 與內層 `<img alt>` 語意重複，SR 朗讀兩次 | 只有 fallback 狀態（圖片失敗）才在外層補 `role="img"` + `aria-label`；圖片正常顯示交給 `<img alt>` |
| 13 | 群組 `cloneVNode` 未補 `key` | slot 來源是動態清單時 Vue 可能依位置 diff，增減 / 重排誤 patch 到錯的 avatar | clone 時 `key: node.key ?? index`，沿用原 key、缺則退回 index |
| 14 | 只靠 client 端 `@error` | 圖片在水合前就失敗時 error 事件已 fire 完，元件卡在破圖不切 fallback | `onMounted` 檢查 `complete && naturalWidth === 0` 補偵測（CSP 相容的「SSR 期 onerror 標記」等效方案） |
| 15 | 只有「圖片 → slot / 文字」兩層 fallback | 無 slot、無可顯示文字時渲染空白圓 | 第三層內建匿名剪影 SVG（`aria-hidden`、`currentColor` 上色） |
| 16 | 文字 fallback 固定 `--avatar-bg` | 多人清單所有縮寫頭像同色、辨識度低 | 依顯示文字確定性 hash 從 WCAG AA 色盤自動配色；使用端覆寫 `--avatar-bg` 仍優先 |
| 17 | 數字尺寸時字級停在預設值 | 大 / 小頭像縮寫比例失衡 | 依 `size × 0.5`（對齊 md 字級 / 容器比）自動注入 `--avatar-auto-font-size` |

---

## 8. 測試與 Storybook

- [x] **Vitest**
  - `tests/components/atoms/BaseAvatar.spec.ts`（圖片渲染 / role / 尺寸換算 / 圓角 / `@error` fallback / 水合前錯誤偵測 / 三層 fallback 與剪影 / hash 自動配色與覆寫優先序 / 數字尺寸字級縮放 / `priority` / alt 警告）
  - `tests/components/atoms/BaseAvatarGroup.spec.ts`（`max` 裁切與 `+N` / clamp / floor / 統一尺寸 / z-index 堆疊 / 動態響應）
  - `tests/helpers/resolveSlotChildren.spec.ts`、`tests/utils/isNumberish.spec.ts`、`tests/utils/isString.spec.ts`
- [x] **Storybook**：`stories/components/atoms/BaseAvatar.stories.ts`（Sizes / Rounded / Initials / Fallback / Themed）、`BaseAvatarGroup.stories.ts`（Default / Overflow / Sizes / Themed）
