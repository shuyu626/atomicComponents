# Textarea 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseTextarea.vue`）。
> **配套**：`docs/components/BaseFormField.md`（欄位容器）、`docs/components/BaseTextField.md`（單行輸入）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseTextarea 是 **多行文字輸入控制項**：包在 [`BaseFormField`](./BaseFormField.md) 內，補上實際的 `<textarea>` 與 `prepend` / `append`、字數計數、**autosize 自動高度**，並把欄位語意（`label` / `message` / `error` / `required`…）透過 `useFormFieldProps` 一鍵轉發給 BaseFormField。狀態色（邊框 / focus / error / disabled）全部讀 BaseFormField 對外傳遞的 `--field-*` token，不自帶一套狀態邏輯。

v-model 採 Vue 3.4+ 的 `defineModel()`，原生處理受控 / 非受控，並支援 `.trim` / `.lazy` modifier。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicTextarea`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicTextarea.vue)（及其 [`useControlled`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/composables/useControlled.ts) / `useStringLength` / `useResizeObserver` / `clamp` / `isComponent`），並針對本專案規範做了修正與優化（見 §7）。與 [`BaseTextField`](./BaseTextField.md) 共用 BaseFormField / `--field-*` token / `useFormFieldProps` / `useStringLength` 等基礎建設。

---

## 1. Props

BaseTextarea 額外的控制項 props，加上**全部** [`BaseFormField` 的欄位 props](./BaseFormField.md#1-props)（`id` / `label` / `labelPlacement` / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly`，會自動轉發）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `string` | — | 輸入值；支援 `.trim` / `.lazy` modifier |
| `placeholder` | `string` | — | placeholder 文字 |
| `rows` | `number` | `2` | 初始 / 最小可見行數（HTML `rows`）；`autosize` 時作為高度下界 |
| `maxRows` | `number` | — | `autosize` 時的最大行數上界；未設則不限制（內容多長就多高） |
| `autosize` | `boolean \| 'cacheMeasurements'` | `false` | 隨內容自動調整高度；`'cacheMeasurements'` 快取量測值（樣式不變時較省） |
| `prepend` | `string \| Component` | — | 前綴：字串顯示為文字、元件以 `<component :is>` 渲染；也可用 `#prepend` slot |
| `append` | `string \| Component` | — | 後綴：同 `prepend`；也可用 `#append` slot |
| `name` | `string` | — | textarea `name`（送出表單 / 自動填入用） |
| `maxlength` | `number` | — | 最大字元數；搭配 `showCount` 顯示 `count/maxlength` |
| `minlength` | `number` | — | 最小字元數 |
| `autocomplete` | `string` | — | textarea `autocomplete`（如 `'off'`、`'on'`） |
| `showCount` | `boolean` | `false` | 顯示字數計數（grapheme 計） |
| `rules` | `ValidationRule<string>[]` | — | 驗證規則陣列；touched-gated（首次 blur 後逐字即時驗）。見 §6 |

**Methods（透過模板 ref 取得）**

| Method | 回傳 | 說明 |
|---|---|---|
| `validate()` | `boolean` | 強制驗證（即使尚未 blur 也顯示錯誤）；回傳是否全部通過。表單 submit 時呼叫 |
| `reset()` | `void` | 清掉驗證錯誤顯示（不動值） |

**v-model modifiers**

| Modifier | 行為 |
|---|---|
| `.trim` | 提交前去除前後空白（對齊原生 v-model，輸入中尾隨空白不會被即時吃掉） |
| `.lazy` | 改在 `change`（blur）才更新，而非每次 `input` |

> textarea 值恆為字串，故**不支援** `.number` modifier（與 BaseTextField 的差異）。

**Slots**

| Slot | Scoped props | 說明 |
|---|---|---|
| `#label` | — | 標籤內容，取代 `label` prop |
| `#prepend` | — | 前綴內容，取代 `prepend` prop |
| `#append` | — | 後綴內容，取代 `append` prop |
| `#message` | `error`, `message` | 訊息內容，取代 `message` prop |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `update:modelValue` | `string` | v-model（由 `defineModel` 自動處理，無需手動 emit） |
| `focus` | `FocusEvent` | textarea 取得焦點時觸發 |
| `blur` | `FocusEvent` | textarea 失去焦點時觸發（常用於失焦驗證） |

> `focus` / `blur` 直接轉發 textarea 的原生事件（因元件根節點是 BaseFormField 且 focus/blur 不冒泡，故由元件顯式轉發，`@blur` 才能正確掛到 textarea）。

---

## 2. CSS 客製化（token）

BaseTextarea **不另立 token**，外觀沿用 BaseFormField 的 [`--field-*` token](./BaseFormField.md#2-css-客製化token)。`__container` 讀 `--field-color`（邊框）、`--field-active-color`（hover / focus）、`--field-radius`（圓角）、`--field-background`（背景，disabled 變淡），覆寫即可主題化：

```vue
<template>
  <BaseTextarea class="rounded-area" label="留言" />
</template>

<style scoped>
.rounded-area {
  --field-active-color: #db2777;
  --field-radius: 10px;
}
</style>
```

> 與 BaseTextField 不同，textarea 高度由 `rows` / `autosize` 決定，**不吃** `--field-height`（該 token 僅用於 BaseFormField 的標籤行高與訊息對齊）。

focus 採「邊框轉 active 色 + 同色柔光 ring（box-shadow，以 `color-mix` 取 `--field-active-color` 22%）」的單一視覺，僅在**鍵盤聚焦**（`:has(textarea:focus-visible)`）時出現，error 狀態下自動轉紅；並保留一個透明 `outline` 作為 forced-colors（高對比）模式的焦點後備。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'

const bio = ref('')
const feedback = ref('')
</script>

<template>
  <!-- 基本：標籤置頂 + 必填 + 訊息 -->
  <BaseTextarea
    v-model="feedback"
    label="意見回饋"
    label-placement="top"
    :rows="4"
    required
    message="請描述你遇到的問題"
  />

  <!-- autosize：2~6 行間自動長高 -->
  <BaseTextarea v-model="bio" label="自我介紹" autosize :rows="2" :max-rows="6" />

  <!-- 字數計數 + maxlength -->
  <BaseTextarea v-model="bio" label="留言" :maxlength="200" show-count />

  <!-- 修整空白 -->
  <BaseTextarea v-model.trim="feedback" label="備註" />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `label` prop；`#message` slot > `message` prop；`#prepend` / `#append` slot > 對應 prop。
- **受控 / 非受控**：由 `defineModel` 原生處理——父層綁 `v-model` 即受控、值以父層為準；未綁時元件自留內部狀態，仍可正常輸入。
- **autosize（自動高度）**：以 `scrollHeight` 扣除上下 padding 換算所需行數，夾在 `rows`（下界）與 `maxRows`（上界，未設為不限制）之間設定 `textarea.rows`。觸發時機：使用者輸入（`input`）、`v-model` 程式化變動、容器尺寸改變（`useResizeObserver`，如父層 flex 重排、字體載入後撐高）。達 `maxRows` 上界後改為內部捲動；`autosize` 開啟時停用使用者手動拖拉（`resize: none`），未開啟則保留 `resize: vertical`。`'cacheMeasurements'` 會快取 padding / line-height 量測值，樣式固定時較省效能，但字體 / 行高變動後不會重新量測。
- **modifier 與輸入體驗**：model → textarea 的同步複刻原生 `vModelText` 的 focus 守衛——聚焦輸入中且「修整後值與 model 相等」時不覆寫 `el.value`，避免 `.trim` 的尾隨空白在輸入途中被吃掉；失焦（`change`）時再把顯示值正規化（`.trim` 去尾隨空白）。
- **IME 組字**：注音 / 拼音 / 日文等組字途中不提交中途值，待 `compositionend`（選字完成）才更新 model，對齊原生 v-model（改用 `defineModel` 後在元件內手動補回 `vModelText` 內建的組字守衛）；組字中仍即時調整 autosize 高度。
- **`maxlength` 與計數單位差異**：HTML 原生 `maxlength` 以 **UTF-16 code unit** 計，`showCount` 以 **grapheme cluster** 計。多數情況一致，但 emoji / astral 字元會不同（如 `"😀"` 計數顯示 `1`，卻佔原生 `maxlength` 的 2）。需要嚴格以「人類可見字數」限制長度時，請改用 JS 在 `update:modelValue` 時自行裁切，而非僅依賴原生 `maxlength`。
- **字數計數**：`showCount` 以 grapheme cluster 計（原生 `Intl.Segmenter`），emoji（含膚色 / ZWJ 組合）、中日韓字元都算 1 字。計數標 `aria-hidden`（裝飾性資訊）。
- **狀態傳遞**：`error` / `disabled` 由 BaseFormField 改寫 `--field-*` token，`__container` / `__input` 自動跟著變色；`invalid` / `required` / `disabled` / `readonly` 經 BaseFormField 的 scoped slot props 綁到 textarea 的 `aria-invalid` / `aria-required` / `disabled` / `readonly`。

---

## 5. A11y

- **標籤關聯**：BaseFormField 自動把 `<label for>` 接到 textarea `id`（未傳 `id` 時自動產生），點標籤聚焦 textarea、SR 朗讀標籤。
- **錯誤提示**：`error` 時 textarea 綁 `aria-invalid="true"`，`message` 描述錯誤；訊息區 `aria-live="polite"` 在訊息變動時朗讀。
- **必填**：`required` 同時呈現視覺星號與 textarea 的 `aria-required` / `required`，確保 SR 使用者知道為必填。
- **描述關聯**：有 `message`（或 `#message` slot）時 textarea 自動綁 `aria-describedby` 指向訊息區；無訊息時不綁，避免指向空節點。
- **autosize 與焦點**：高度變化僅改 `rows` 屬性，不影響焦點與游標位置；達 `maxRows` 後內部捲動仍可鍵盤操作。

---

## 6. 驗證（rules）

傳入 `rules`（規則陣列）即啟用驗證；每條規則是純函式，回傳 `true`（通過）或字串（錯誤訊息）。驗證邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts) composable（與 [BaseTextField](./BaseTextField.md#6-驗證rules) 共用），規則 helper 放 [`~/utils/validators`](../../app/utils/validators.ts)，元件本身保持純呈現。

**觸發時機（touched-gated）**：第一次 `blur`（碰過欄位）後才開始顯示錯誤；此後值一變動就**逐字即時重驗**，兼顧「即時回饋」與「不打斷正在輸入的人」。多條規則時顯示**第一條失敗**的訊息。可與 `showCount` 並用。

**與 `error` / `message` prop 的合併**：

- `error`：`props.error || 驗證失敗` 任一為真即錯誤——父層仍可用 `error` prop 強制錯誤（如 server 端驗證結果）。
- `message`：**驗證錯誤訊息優先**（讓使用者看到「為何不合規」）；無驗證錯誤時退回 `props.message` 靜態提示。沒有 `rules` 時等同只顯示 `props.message`。

**常用規則 helper**（皆可傳自訂訊息；除 `required` / `sameAs` 外，空值自動通過，交給 `required` 把關）：

| Helper | 簽章 | 預設訊息 |
|---|---|---|
| `required` | `required(message?)` | `此欄位為必填` |
| `email` | `email(message?)` | `電子郵件格式不正確` |
| `minLength` | `minLength(min, message?)` | `至少需 N 個字` |
| `maxLength` | `maxLength(max, message?)` | `不可超過 N 個字` |
| `pattern` | `pattern(regex, message?)` | `格式不正確` |
| `sameAs` | `sameAs(getter, message?)` | `兩次輸入不一致` |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { required, minLength, maxLength } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

const feedback = ref('')
const rules: ValidationRule<string>[] = [
  required('請填寫意見'),
  minLength(10, '至少需 10 個字'),
  maxLength(200, '不可超過 200 個字'),
]
</script>

<template>
  <BaseTextarea v-model="feedback" label="意見回饋" :rows="4" :rules="rules" show-count :maxlength="200" />
</template>
```

> 目前僅支援**同步**規則。非同步驗證（如打 API 檢查內容）暫不在範圍內——可在父層自行處理後用 `error` / `message` prop 餵回。表單 submit 時可透過模板 ref 呼叫 `validate()` 強制驗證未碰過的欄位（用法同 [BaseTextField §6](./BaseTextField.md#6-驗證rules)）。

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` 處理受控 / 非受控 | 一整套樣板，且 `defineModel` 已原生提供 | 改用 `defineModel()`（符合專案「Vue 3.4+ MUST 用 defineModel」規範），移除 `useControlled` / `toKebabCase` / `hasOwn` 相依 |
| 2 | 用 `defineComponent` + `createElementBlock` / `vModelText` / `withDirectives` 等 **Vue 內部 API** 動態套用 modifier 並把 textarea 包成內部元件 | 依賴未公開 API、脆弱難讀 | 改用真實 `<textarea>` + `[model, modifiers] = defineModel()` + `input` / `change` 事件，並以 watchEffect 複刻原生 focus 守衛，無任何內部 API |
| 3 | autosize 只在 `input` / `resize` 時重算高度 | `v-model` 程式化賦值（如清空、載入草稿）後高度不更新 | 補 `watch(model)` 在程式化變動後 `nextTick` 重算，並監看 `autosize` / `rows` / `maxRows` 變動重算 |
| 4 | `getSizingStyle` 直接 `parseFloat(lineHeight)` | `line-height: normal` 時為 `NaN`，整個高度計算會崩（rows 變 NaN） | NaN 時退回以 `font-size * 1.2` 推估，確保任何 line-height 設定都能正常 autosize |
| 5 | `useStringLength` 依賴 `string-length` npm 套件、計數無 `aria-hidden` | 多一個 runtime 相依；計數會被 SR 重複朗讀 | 改用零依賴的原生 `Intl.Segmenter`（與 BaseTextField 共用 `useStringLength`）；計數標 `aria-hidden` |
| 6 | 全域 `<style>`（樣式洩漏）、依賴全域 SCSS token、textarea focus 無 outline | 樣式外洩、強綁外部 SCSS、鍵盤焦點不明顯 | `scoped` + 沿用 `--field-*` token；補 `:has(textarea:focus-visible)` 的 outline（對齊全庫 focus 慣例），只在鍵盤聚焦時出現 |
| 7 | `modelModifiers.number` 分支（textarea） | 多行文字無「數字」語意，該分支為死碼 | 移除 `.number`，model 收斂為 `string`；`maxlength` / `minlength` 收斂為 `number` |
| 8 | `clamp` 直接取 `scrollHeight / lineHeight`（未取整） | 非整數行數塞進 `rows` 屬性，跨瀏覽器捨入不一致 | `Math.ceil` 取整後再 clamp，行數穩定；`clamp` 改寫為本庫 util 並補測試 |

> 註：改用 `defineModel` 後，原生 `vModelText` 內建的「IME 組字守衛」與「失焦正規化」需在元件內手動補回（見 §4），以維持與原生 v-model 一致的中日韓 / 修飾符輸入體驗。

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseTextarea.spec.ts`（結構與欄位轉發、`<label for>` 關聯、原生屬性透傳、v-model 雙向與 `.trim` / `.lazy` modifier、IME 組字不提交中途值 / 失焦正規化、`focus` / `blur` 事件轉發、`prepend` / `append` 字串與元件與 slot、`showCount` 計數 / `count/maxlength` / grapheme 計數、`autosize` modifier class、a11y `aria-describedby` / `aria-invalid` / `aria-required` / `disabled` / `readonly`、**驗證 rules**：touched-gated 不提早報錯 / blur 後顯示 / 逐字即時重驗 / `message` prop 優先 / `validate()` / `reset()` expose）
- [x] **Vitest**：`tests/utils/clamp.spec.ts`（區間內 / 夾下界 / 夾上界 / 邊界值 / Infinity 上界）。共用驗證測試 `tests/composables/useValidation.spec.ts`、`tests/utils/validators.spec.ts`，與 `tests/composables/useStringLength.spec.ts`、`tests/utils/isComponent.spec.ts`（與 BaseTextField 共用基礎建設）。
- [x] **Storybook**：`stories/components/atoms/BaseTextarea.stories.ts`（Playground / Rows / Autosize / ShowCount / States / LabelPlacement / Validation / Themed）
