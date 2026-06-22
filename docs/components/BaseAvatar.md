# Avatar 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseAvatar.vue`、`app/components/atoms/BaseAvatarGroup.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/utils/isNumberish.ts`（數值守衛）、`app/utils/isString.ts`（字串守衛）、`app/utils/toUnit.ts`、`app/helpers/resolveSlotChildren.ts`（攤平 / 過濾 slot 節點）。

BaseAvatar 是 **頭像** 元件：優先顯示圖片（`src`），圖片載入失敗時自動退回 **縮寫 / icon / 自訂內容** fallback；不給 `src` 時則直接渲染縮寫頭像。BaseAvatarGroup 把一組頭像 **重疊堆疊**，並把超出 `max` 的數量收斂成 `+N`。

兩者皆為純展示元件（無 emit、無 v-model），尺寸 / 圓角 / 顏色全走 CSS token，可跨專案主題化。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicAvatar`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicAvatar.vue) 與 [`AtomicAvatarGroup`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicAvatarGroup.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. BaseAvatar — Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `size` | `'small' \| 'medium' \| 'large' \| \`${number}\` \| number` | `'medium'` | 具名走預設 token；數字 / 數字字串走自訂像素 |
| `rounded` | `` `${number}` \| number \| 'full' `` | `'full'` | `full` 為圓形；其餘為像素圓角 |
| `src` | `string` | — | 圖片來源；不給則只渲染 fallback / default slot |
| `alt` | `string` | — | 圖片替代文字。**有 `src` 時必填**：作 `<img alt>` 與根節點 `aria-label`，也是載入失敗時的最終文字 fallback；裝飾性頭像明示 `alt=""`。漏給時開發期會 `console.warn` |
| `loading` | `'lazy' \| 'eager'` | `'lazy'` | 圖片載入策略；一般維持 `'lazy'`，首屏關鍵頭像改用 `priority` |
| `priority` | `boolean` | `false` | 首屏關鍵頭像捷徑：一鍵套 `loading="eager"` + `fetchpriority="high"` 加速 LCP（會覆寫 `loading`） |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 縮寫 / icon：無 `src`，或圖片失敗且未給 `fallback` 時顯示 |
| `#fallback` | 圖片載入失敗時的替代內容（未提供時退回 `#default`，再退回 `alt`） |

預設尺寸 token：`small = 32px`、`medium = 40px`、`large = 56px`。

---

## 2. BaseAvatarGroup — Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `max` | `number` | `3` | 最多顯示幾個；超出收斂成 `+N`。小於 1 夾為 1 |
| `size` | 同 BaseAvatar `size` | `'medium'` | **統一覆寫** 群組內每個 avatar 的尺寸 |
| `rounded` | 同 BaseAvatar `rounded` | `'full'` | **統一覆寫** 群組內每個 avatar 的圓角 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 放一組 `<BaseAvatar>`；群組會統一尺寸 / 圓角、裁切到 `max`、加白色描邊與重疊位移 |

> 群組以 `cloneVNode` 把 `size` / `rounded` 覆寫進每個子 avatar，因此子層各自的 `size` / `rounded` 會被群組統一值取代。

---

## 3. CSS 客製化（token）

**BaseAvatar（`--avatar-*`）**

| Token | 預設 | 作用 |
|---|---|---|
| `--avatar-size` | `40px` | 尺寸（具名尺寸會覆寫此值） |
| `--avatar-rounded` | `9999px` | 圓角 |
| `--avatar-bg` | `#f3f4f6` | 底色 |
| `--avatar-color` | `#374151` | 文字（縮寫）顏色 |
| `--avatar-font-size` | `1.25rem` | 縮寫字級 |
| `--avatar-font-weight` | `700` | 縮寫字重 |

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
  <BaseAvatar src="/avatars/alex.jpg" alt="Alex" size="large" />
  <BaseAvatar src="/avatars/alex.jpg" alt="Alex" :size="64" :rounded="12" />
</template>
```

---

## 5. 群組用法

```vue
<template>
  <BaseAvatarGroup :max="3" size="medium" aria-label="專案成員">
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

- 圖片頭像：根節點 `role="img"` + `aria-label="{alt}"`，`<img>` 同步帶 `alt`。
- 縮寫頭像（無 `src`）：純文字內容，螢幕閱讀器直接朗讀縮寫。
- 群組：根節點 `role="group"`，**建議由使用端傳 `aria-label`**（如 `aria-label="專案成員"`）給群組命名；DOM 順序＝閱讀順序，SR 依序朗讀每個頭像的 `alt`，最後讀到 `+N`。
- `alt` 在有 `src` 時請務必提供有意義文字；裝飾性頭像明示 `alt=""` 讓 SR 跳過。漏給 `alt` 開發期會 `console.warn` 提醒。

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 用 `new Image()` 預載 + `watch` 偵測 `onerror` | 額外發一次圖片請求；需 `isMounted` 旗標規避 SSR hydration mismatch | 直接用 `<img>` 原生 `@error` 切換 fallback；無重複請求、無需 `isMounted`，初次渲染恆為 `<img>`，無 hydration 落差 |
| 2 | `:width="size"` / `:height="size"` | `size='medium'` 時渲染出非法的 `width="medium"` 屬性 | 僅在數值尺寸輸出像素 `width/height`（預留版位防 layout shift），具名尺寸交給 CSS |
| 3 | `--avatar-rounded: toUnit(props.rounded)` | 數字字串（如 `'8'`）經 `toUnit` 不會補 `px`，產生無單位的非法值 | 一律 `` `${Number(rounded)}px` ``，數字字串也正確補單位 |
| 4 | 群組 `.reverse()` 反轉 DOM + `flex-direction: row-reverse` | DOM 順序被反轉，螢幕閱讀器朗讀順序與視覺相反（a11y bug） | 保持自然 DOM 順序，改用遞減 `z-index` 達成「前者疊在上層」，閱讀順序＝視覺順序 |
| 5 | `resolveSlotChildren` 只 `import { Fragment }`，卻使用 `Comment` / `Text` | 比對到瀏覽器全域建構子而非 Vue symbol，註解 / 文字過濾失效 | 補上 `import { Comment, Fragment, Text } from 'vue'`，過濾恢復正常 |
| 6 | `resolveSlotChildren` 只攤平一層 | Fragment 內（如 `v-for` 含 `v-if=false`）的註解 / 文字 / 巢狀 Fragment 漏接，污染數量讓 `+N` 算錯 | 改為**遞迴正規化**，只留元件型節點 |
| 7 | 群組把 slot 解析放 `computed` | slot 變動不算響應依賴，子 avatar 動態增減（`v-for` 變長）時吃到舊快取、畫面不更新 | 改用 **render function** 每次 render 重算 |
| 8 | `max` 直接 `Number()` | 分數 `max`（如 `2.5`）會算出非整數的 `+2.5` | `Math.floor` 夾成 ≥ 1 的整數 |
| 9 | 群組描邊 / 重疊量寫死（`2px solid white`、`-1rem`） | 無法主題化、不隨尺寸調整 | 抽成 `--avatar-group-ring` / `--avatar-group-overlap` token |
| 10 | 群組用全域 `<style>` 觸及子 avatar | 樣式洩漏到全域 | `scoped` + `:deep()` 穿透插槽節點，避免全域污染 |
| 11 | 顏色 / 字級寫死於 `.atomic-avatar` | 不可主題化 | 全抽成 `--avatar-*` token |

---

## 8. 測試與 Storybook

- [x] **Vitest**
  - `tests/components/atoms/BaseAvatar.spec.ts`（圖片渲染 / role / 尺寸換算 / 圓角 / `@error` fallback / `priority` / alt 警告）
  - `tests/components/atoms/BaseAvatarGroup.spec.ts`（`max` 裁切與 `+N` / clamp / floor / 統一尺寸 / z-index 堆疊 / 動態響應）
  - `tests/helpers/resolveSlotChildren.spec.ts`、`tests/utils/isNumberish.spec.ts`、`tests/utils/isString.spec.ts`
- [x] **Storybook**：`stories/components/atoms/BaseAvatar.stories.ts`（Sizes / Rounded / Initials / Fallback / Themed）、`BaseAvatarGroup.stories.ts`（Default / Overflow / Sizes / Themed）
