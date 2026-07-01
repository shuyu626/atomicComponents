# Card 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseCard.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseCard 是 **內容容器卡片**：把相關內容群組成一張表面。提供 `media`（滿版）/ `header` / `body` / `footer` 四個區段，皆由對應 slot 控制是否渲染。外觀走「表面樣式軸」（`elevated` / `outlined` / `filled`），內距由 `padding` 控制。顏色 / 圓角 / 陰影全走 CSS token，可跨專案主題化。

設計取捨：

- **語意不假裝** — 根元素由 `as` 決定（`div` / `section` / `article`），元件不替你選語意。
- **標題不寫死階層** — 頁首走 `#header` slot，heading 階層由 caller 提供（符合 design-spec「Heading 階層由 caller 決定」）。
- **內容走 slot 不走 prop string** — 標題 / 內文 / 操作皆 slot，最大彈性。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `as` | `'div' \| 'section' \| 'article'` | `'div'` | 根元素語意標籤；語意由 caller 決定 |
| `variant` | `'elevated' \| 'outlined' \| 'filled'` | `'elevated'` | 外觀（表面樣式）：陰影浮起 / 描邊 / 淺色填底 |
| `padding` | `'none' \| 'sm' \| 'md' \| 'lg'` | `'md'` | header / body / footer 內距；`media` 一律滿版不受影響 |
| `hoverable` | `boolean` | `false` | 滑入時陰影抬升（**純視覺**，不賦予互動語意） |

> **關於 `variant`**：卡片是「表面 / 容器」,其外觀軸（陰影 / 邊框 / 填色）與互動元件（Button / Chip）的填充軸 `solid / outline / ghost / text` 本質不同，故採卡片慣用值 `elevated / outlined / filled`（對齊 MUI / Material 等主流系統）。這是刻意的領域差異，非命名 drift。

**Slots**

| Slot | 說明 |
|---|---|
| `#media` | 滿版媒體區（圖片 / 影片 / 橫幅），貼齊卡片邊、不套內距、圓角自動裁切 |
| `#header` | 頁首（標題列 / 操作）。標題階層由 caller 自行決定（如放 `<h2>` / `<h3>`），元件不寫死 |
| `#default` | 主要內容（body） |
| `#footer` | 頁尾（操作按鈕 / 補充資訊） |

各區段只在對應 slot 存在時才渲染。本元件純展示，無 emits。

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--card-bg` | `#ffffff` | 卡片底色（`filled` 另用 `--card-fill-bg`） |
| `--card-color` | `#1f2937`（gray-800） | 內文色 |
| `--card-border-color` | `#e5e7eb`（gray-200） | `outlined` variant 外框色 |
| `--card-divider-color` | `var(--card-border-color)` | header / footer 區段分隔線色；可單獨設 `transparent` 移除分隔線 |
| `--card-radius` | `0.75rem` | 圓角 |
| `--card-shadow` | gray 雙層陰影 | `elevated` 預設陰影 |
| `--card-shadow-hover` | 較深雙層陰影 | `hoverable` 滑入時陰影 |
| `--card-fill-bg` | `#f9fafb`（gray-50） | `filled` variant 底色 |
| `--card-padding` | `1rem` | 由 `padding` modifier 設定（none/sm/md/lg），各區段讀取 |

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseCard class="brand-card" variant="filled" />
</template>

<style scoped>
.brand-card {
  --card-fill-bg: #eef2ff;
  --card-radius: 1rem;
  --card-color: #3730a3;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 最簡：只有內容 -->
  <BaseCard>純內容卡片</BaseCard>

  <!-- 外觀 -->
  <BaseCard variant="outlined">描邊卡片</BaseCard>
  <BaseCard variant="filled">填底卡片</BaseCard>

  <!-- 完整區段 -->
  <BaseCard as="article" variant="elevated">
    <template #media>
      <img :src="cover" alt="封面" />
    </template>
    <template #header>
      <h3>產品名稱</h3>
    </template>
    <p>產品描述內容…</p>
    <template #footer>
      <BaseButton variant="solid">加入購物車</BaseButton>
    </template>
  </BaseCard>

  <!-- 可懸停（搭配內部連結做成可點擊卡片） -->
  <BaseCard hoverable>
    <template #media><img :src="thumb" alt="" /></template>
    <h3><BaseLink to="/posts/1">文章標題</BaseLink></h3>
  </BaseCard>
</template>
```

---

## 4. 行為與狀態

- **區段條件渲染**：`media` / `header` / `body` / `footer` 各自只在對應 slot 存在時渲染；不會留下空的內距盒。
- **閱讀順序固定**：DOM 順序恆為 media → header → body → footer。
- **滿版 media**：`#media` 不套內距、貼齊卡片邊；內部 `img` / `video` / `picture` / `svg` 自動 `display:block; width:100%`，方角由卡片 `overflow:hidden` + `--card-radius` 裁切。
- **區段分隔**：`header` 帶 `border-bottom`、`footer` 帶 `border-top`（用 `--card-border-color`），即使 `elevated` / `filled` 無外框也提供視覺區隔。
- **footer 貼底**：根為 `flex column`、`body` 為 `flex:1 1 auto`，因此在固定高度容器（如等高 grid）中 footer 會貼到底部。
- **盒模型一致**：三種 variant 都補 `1px` 邊框（`elevated` / `filled` 為 transparent），切換 variant 不會因邊框有無造成尺寸跳動。
- **hoverable**：僅切換陰影 + 輕微 `translateY(-2px)`，`prefers-reduced-motion` 時關閉動畫。**不**含 `cursor:pointer` 與互動語意。

---

## 5. A11y

- **語意標籤**：用 `as` 選對標籤 —— 可獨立散布的內容（商品卡 / 文章卡）用 `article`、頁面中具標題的區段用 `section`、純視覺分組用 `div`。
- **標題階層**：頁首放在 `#header`，請由 caller 放入正確階層的 heading（如頁面 `<h1>` 下的卡片用 `<h2>`），元件**不**寫死 heading 以免跳階。
- **可點擊卡片（推薦做法：stretched link）**：`hoverable` 只是視覺回饋，**不**讓整張卡片可點。要做「整張卡片導向同一連結」且鍵盤 / SR 都正確，請用 **stretched link** 模式 —— 在卡片內放一個真正的連結，用偽元素覆蓋整張卡片：

  ```vue
  <template>
    <BaseCard hoverable style="position: relative">
      <template #media><img :src="thumb" alt="" /></template>
      <h3>
        <!-- 這個連結的 ::after 覆蓋整張卡 → 點哪都進這個連結，但 DOM 只有一個可聚焦元素 -->
        <NuxtLink to="/posts/1" class="stretched">文章標題</NuxtLink>
      </h3>
      <p>摘要…</p>
    </BaseCard>
  </template>

  <style scoped>
  .stretched::after { content: ''; position: absolute; inset: 0; }
  </style>
  ```

  > ⚠️ 不要只把 `@click` 套在卡片容器上（滑鼠限定、鍵盤 / SR 無法操作），也不要在 stretched link 卡片內再放其他連結 / 按鈕（會被覆蓋層擋住或造成巢狀互動）。卡片內需要多個操作時，改用「卡片不可點 + footer 放按鈕」。這也是本元件**刻意不把根元素做成 polymorphic link** 的原因（見 §6）。
- **圖片 alt**：`#media` 內的圖片由 caller 提供 `alt`（內容性圖片描述語意、裝飾性圖片 `alt=""`）。
- **`overflow: hidden`**：卡片裁切 media 方角用，與 Vuetify / Nuxt UI 一致。卡片內的浮層（`BaseTooltip` / `BaseDropdown` / `BaseSelect`）皆 `Teleport` 到 `body`，不會被裁掉；但若在卡片極邊緣放可聚焦元素，focus ring 可能被輕微裁切 —— 需要時自行加內距。

---

## 6. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | `variant` 採 `elevated / outlined / filled`（非 `solid / outline / ghost / text`） | 卡片是表面容器，外觀軸是陰影 / 邊框 / 填色，與互動元件的填充軸本質不同；對齊主流系統慣例 |
| 2 | 標題走 `#header` slot、不開 `headingLevel` prop | 卡片不知道自己在頁面的標題層級，交由 caller 放正確的 heading 最安全 |
| 3 | `padding` 與 `media` 解耦 | media 需滿版貼邊，內距只作用於文字區段，符合「一個 prop 控一件事」 |
| 4 | `hoverable` 純視覺、不含互動語意 | 避免「看起來可點、實際鍵盤 / SR 不可用」的假互動；可點擊交給內部連結 / 按鈕 |
| 5 | 三 variant 補 transparent 邊框 | 統一盒模型，切換 variant 不跳動 |

---

## 7. 與主流框架對照與取捨

對照 Vuetify(`v-card`)、Element Plus(`el-card`)、Quasar(`QCard`)、Nuxt UI(`UCard`)：

**已覆蓋(對齊主流)**

- 區段結構 header / body / footer + 滿版 media（≈ Quasar `QCardSection` + media、Nuxt UI slots）。
- 區段分隔線（≈ Element Plus header 邊框、Nuxt UI `divide-y`）。
- 外觀 variant：`elevated`(陰影) / `outlined`(邊框) / `filled`(填底)，涵蓋 Element Plus `shadow=always|never`、Quasar `flat|bordered`、Nuxt UI `outline|soft` 的核心情境。
- `hoverable` ≈ Element Plus `shadow="hover"` / Vuetify `hover`。
- 全 token 化、語意標籤可選（`as`）≈ Vuetify `tag` / Nuxt UI `as`。

**刻意未做(及理由)**

| 框架有、本元件沒有 | 取捨理由 |
|---|---|
| 整張卡片做成 link（Vuetify `to`/`href`） | 本專案 design-spec 強調「連結 vs 按鈕分清楚」「避免假互動」。整卡 link 與「卡內還有按鈕」天生衝突（巢狀互動 a11y 地雷）。改推薦 §4 的 **stretched link** 模式，鍵盤 / SR 正確 |
| `loading` 狀態（Vuetify 頂部進度條） | 載入態建議用即將加入的 `BaseSkeleton` 放進 body，語意更清楚、可表達骨架輪廓；不在 Card 內建一套 loading |
| 水平排版 `horizontal`（Quasar） | 屬版面情境，可由 caller 用 `#media` + flex 自行排（P2）；若日後需求高再加 `orientation` prop |
| `tonal` / `subtle`（Vuetify / Nuxt UI 的色調 + 邊框組合） | `filled` 已涵蓋色調填底；`subtle`(填底+邊框) 可由 `filled` + 覆寫 `--card-border-color` 達成 |

**樣式一致性**：圓角 `0.75rem` 對齊 `BaseModal`（大型內容面），陰影沿用 `BasePopover` 同款 shadow-lg，色彩全用庫內既有灰階 token（gray-50/200/800）。若想更貼近 popover/dialog 的 `0.5rem`，覆寫 `--card-radius` 即可。

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseCard.spec.ts`（`as` 根元素、`variant` / `padding` / `hoverable` modifier class、四區段條件渲染與內容、body 缺省、閱讀順序）— 12 cases
- [x] **Storybook**：`stories/components/atoms/BaseCard.stories.ts`（Playground / Variants / Padding / Composed / Hoverable / Clickable / Themed）
