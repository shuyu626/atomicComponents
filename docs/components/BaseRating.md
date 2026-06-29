# Rating 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseRating.vue`）。
> **配套**：`docs/components/BaseRadio.md`（單選圈）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseRating 是 **星級評分**：每顆星由 **底層未選取圖示**（`__icon--empty`，定義星格尺寸）與 **上層填色圖示**（`__icon--fill`，以寬度裁切呈現填滿比例）疊成。互動模式再疊一層透明命中區（`__hit`），對應視覺隱藏（sr-only）的原生 `<input type="radio">`，免費取得 **方向鍵巡覽、表單送出與 `role="radiogroup"`**。支援 `allowHalf` 半星、`clearable` 點同顆歸零、hover 預覽、`readonly`（`role="img"`）、`disabled`、`size`、`color` 與 `rules` 驗證。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicRating`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicRating.vue) / [`AtomicRatingItem`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicRatingItem.vue)，合併為單一元件並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `number` | — | 評分值；`allowHalf` 時可為 `.5`，`undefined` 視為 `0` |
| `max` | `number` | `5` | 星數上限 |
| `allowHalf` | `boolean` | `false` | 允許半星（0.5 級距） |
| `clearable` | `boolean` | `true` | 點已選取的同顆星可歸零 |
| `readonly` | `boolean` | `false` | 唯讀（呈現分數、不可互動，`role="img"`） |
| `disabled` | `boolean` | `false` | 停用 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 尺寸 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | — | 評分色；未指定時用金色預設 token |
| `label` | `string` | — | 標籤文字；也可用 `#default` / `#label` slot |
| `ariaLabel` | `string` | `'評分'` | 群組無障礙標籤（未提供 label / slot 時的 fallback） |
| `name` | `string` | — | 原生 name；未提供時用自動 id |
| `id` | `string` | — | 控制項 id；未提供自動產生 |
| `message` | `string` | — | 輔助 / 驗證訊息 |
| `error` | `boolean` | `false` | 錯誤狀態 |
| `rules` | `ValidationRule<number \| undefined>[]` | — | 驗證規則（touched-gated）。見 §6 |

**Methods（模板 ref）**：`validate()` → `boolean`、`reset()` → `void`。

**Slots**：`#default` / `#label`（標籤內容）、`#icon:selected`（已選取圖示，scoped：`value`）、`#icon:unselected`（未選取圖示，scoped：`value`）、`#message`（scoped：`error`、`message`）。

**Emits**：`update:modelValue`（defineModel）、`change`（帶新分數 `number`；點同顆星歸零時為 `0`）。

---

## 2. CSS 客製化（token）

| Token | 預設 | 說明 |
|---|---|---|
| `--rating-color` | `#faaf00`（金色，隨 `color`） | 填色星 / focus ring 色 |
| `--rating-empty-color` | `#e0e0e0` | 未選取星色 |
| `--rating-size` | `1.5rem`（隨 `size`） | 單顆星尺寸 |
| `--rating-gap` | `4px` | 星與星間距 |
| `--rating-label-color` | `#374151` | 標籤文字色 |
| `--rating-danger-color` | `#dc2626` | 錯誤色 |

語意色以 `:where(.base-rating--{color})` 覆寫 `--rating-color`（specificity 0，覆寫得動）；尺寸以 `:where(.base-rating--{size})` 設 `--rating-size`。填色比例靠 `__icon--fill` 的 `width`（inline style）裁切，`__svg` 固定 `width: var(--rating-size); max-width: none`，故裁切時星形仍維持整顆寬度。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const score = ref(3)
const half = ref(2.5)
</script>

<template>
  <BaseRating v-model="score" label="滿意度" />
  <BaseRating v-model="half" allow-half label="半星評分" />
  <BaseRating :model-value="3.7" readonly label="平均分 3.7" />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `#default` slot > `label` prop；`#message` slot > `message` prop；`#icon:*` slot > 內建 SVG 星。
- **星數（`max`）**：以 `Math.max(0, Math.floor(max))` 取實際星數，傳入小數 / 負值不會渲染異常。
- **填滿計算**：`displayValue = hover || currentValue`，每顆星填滿比例 = `clamp(displayValue - (v - 1), 0, 1)`，唯讀時支援任意小數（如 `3.7` → 第 4 顆填 70%；百分比四捨五入到小數兩位避免浮點醜值）。
- **半星（`allowHalf`）**：每顆星拆成左右兩個命中區（`v - 0.5` / `v`），hover 與點擊皆支援 0.5 級距。
- **清除（`clearable`，預設開）**：再次以**滑鼠**點擊已選取的同一顆星即歸零。原生 radio 重複點擊不觸發 `change`，故靠 `@click` 偵測「點到目前值」來歸零；並以 `event.detail >= 1` 限定為滑鼠點擊，避免鍵盤（方向鍵選取後按 Space / Enter，`detail` 為 0）意外清除。鍵盤清除請改用群組內的「未評分」選項。
- **hover 預覽**：滑入星格即時預覽填滿，移出群組（`mouseleave`）還原為目前分數；`readonly` / `disabled` 不預覽。
- **唯讀（`readonly`）**：不渲染任何 input，群組為 `role="img"` 並以 `aria-label` 朗讀「N / max 顆星」。
- **停用（`disabled`）**：仍渲染 input（保留表單語意）但加 `disabled`、不互動、不送值，星色轉灰。

---

## 5. A11y

- 互動模式：群組為 `role="radiogroup"`，內含每顆星（及半星）對應的 sr-only 原生 `<input type="radio">`，**方向鍵巡覽、表單送出、Tab focus 皆為原生行為**；input 採 sr-only（非 `display:none`，保留可聚焦 / 可送出）。
- 額外渲染一個 sr-only「未評分」radio（`value=0`），讓鍵盤可達 0（鍵盤清除評分的途徑）、且值為 0 時群組仍有對應的 checked 選項；此 radio 不在星格內，聚焦時改於整個群組（`__stars`）畫 focus ring，避免無焦點指示。
- 標籤：有 `label` / slot 時群組以 `aria-labelledby` 連到標籤；否則用 `ariaLabel` 的 `aria-label` fallback。
- 每個命中區（`label`）內含 sr-only 文字「N 顆星」供 SR 朗讀；視覺星形 `aria-hidden`。
- 有訊息時群組綁 `aria-describedby` 指向訊息區（`aria-live="polite"`）、錯誤時 `aria-invalid`。
- 鍵盤聚焦：input 為 sr-only 且置於星格內，以 `.base-rating__star:has(.base-rating__input:focus-visible)` 對該星畫 `outline`。
- 唯讀模式：群組 `role="img"` + `aria-label="N / max 顆星"`，整組視為單一圖像。

---

## 6. 驗證（rules）

傳入 `rules`（規則陣列）即啟用，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。採 **touched-gated**：`change` 或 `blur` 後才顯示，之後即時重驗。`error` 為 `props.error || 驗證失敗`；`message` 驗證錯誤優先、否則退回 `props.message`。

> **必填評分**：`required` 視 `0` 為有效數字（非空），故「至少給 1 星」請用自訂規則：`(v) => (!!v && v > 0) || '請給予評分'`。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const score = ref(0)
const rules: ValidationRule<number | undefined>[] = [(v) => (!!v && v > 0) || '請給予評分']
</script>

<template>
  <BaseRating v-model="score" label="請評分" :rules="rules" />
</template>
```

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 拆 `AtomicRating` + `AtomicRatingItem` 兩元件 | RatingItem 純內部用，多一個對外元件需維護 | 合併為單一 `BaseRating`，star item 為內部實作；保留 `#icon:*` slot 客製 |
| 2 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` | 受控樣板，`defineModel` 已原生提供 | 改用 `defineModel`（免額外相依） |
| 3 | 依賴外部 `star-empty.svg` / `star-fill.svg`（`?component`）+ 全域 `@include sr-only` | 強綁 svg loader 與全域 SCSS | 內建 inline SVG（無資源檔依賴）+ scoped + 自宣告 `--rating-*` token + 自寫 sr-only |
| 4 | 半星用「兩組 label/input 疊放、各自渲染整顆圖示」 | 視覺與互動耦合，圖示渲染重複 4 次 | 視覺（填色層寬度裁切，支援任意小數）與互動（透明命中區 + radio）**分層**，圖示只渲染一次 |
| 5 | 無 `role="radiogroup"`，唯讀才有 `role="img"` | 互動群組缺群組語意 | 互動補 `role="radiogroup"` + `aria-labelledby` / `aria-label`，唯讀維持 `role="img"` |
| 6 | 無驗證 | 與庫內表單元件不一致 | 整合 `useValidation` + `rules` + `validate()` / `reset()` + `aria-describedby` / `aria-invalid` |
| 7 | 填滿比例僅 0 / 0.5 / 1 | 唯讀平均分（如 3.7）無法精準呈現 | 填色層線性裁切，唯讀支援任意小數 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseRating.spec.ts`（渲染 max 顆星 / max 防呆（小數取下界、負值歸 0）/ role=radiogroup / radio 數量 / label + aria-labelledby / aria-label fallback / size + color class、v-model 填滿與 checked、change 事件、empty radio、clearable（滑鼠歸零 / 關閉 / 鍵盤 detail 0 不歸零）、allowHalf（half class / 半值 / 50% 裁切）、readonly（無 input / role=img / 小數裁切）、disabled（含不送值）、自訂 icon slot、rules touched-gated / `validate()` / `reset()`、aria 接線）
- [x] **Storybook**：`stories/components/atoms/BaseRating.stories.ts`（Playground / States / AllowHalf / Clearable / Readonly / Sizes / Colors / Disabled / Validation / CustomIcon / Themed）
