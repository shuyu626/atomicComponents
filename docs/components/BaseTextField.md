# TextField 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseTextField.vue`）。
> **配套**：`docs/components/BaseFormField.md`（欄位容器）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseTextField 是 **文字輸入控制項**：包在 [`BaseFormField`](./BaseFormField.md) 內，補上實際的 `<input>` 與 `prepend` / `append`、字數計數，並把欄位語意（`label` / `message` / `error` / `required`…）透過 `useFormFieldProps` 一鍵轉發給 BaseFormField。狀態色（邊框 / focus / error / disabled）全部讀 BaseFormField 對外傳遞的 `--field-*` token，不自帶一套狀態邏輯。

v-model 採 Vue 3.4+ 的 `defineModel()`，原生處理受控 / 非受控，並支援 `.trim` / `.number` / `.lazy` modifier。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicTextField`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicTextField.vue)（及其 [`useControlled`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/composables/useControlled.ts) / [`useStringLength`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/composables/useStringLength.ts) / [`isComponent`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/utils/isComponent.ts)），並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

BaseTextField 額外的控制項 props，加上**全部** [`BaseFormField` 的欄位 props](./BaseFormField.md#1-props)（`id` / `label` / `labelPlacement` / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly`，會自動轉發）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `string \| number` | — | 輸入值；支援 `.trim` / `.number` / `.lazy` modifier |
| `type` | `'text' \| 'password' \| 'email' \| 'tel' \| 'url' \| 'search' \| 'number'` | `'text'` | 輸入框型別；`number` 自動轉數字並停用計數 |
| `placeholder` | `string` | — | placeholder 文字 |
| `prepend` | `string \| Component` | — | 前綴：字串顯示為文字、元件以 `<component :is>` 渲染；也可用 `#prepend` slot |
| `append` | `string \| Component` | — | 後綴：同 `prepend`；也可用 `#append` slot |
| `name` | `string` | — | input `name`（送出表單 / 自動填入用） |
| `maxlength` | `number` | — | 最大字元數；搭配 `showCount` 顯示 `count/maxlength` |
| `minlength` | `number` | — | 最小字元數 |
| `autocomplete` | `string` | — | input `autocomplete`（如 `'email'`、`'current-password'`、`'off'`） |
| `inputmode` | `string` | — | input `inputmode`（行動裝置鍵盤型別，如 `'numeric'`、`'tel'`） |
| `showCount` | `boolean` | `false` | 顯示字數計數（grapheme 計）；`type="number"` 或 `.number` 時自動關閉 |
| `rules` | `ValidationRule<string \| number>[]` | — | 驗證規則陣列；touched-gated（首次 blur 後逐字即時驗）。見 §6 |

**Methods（透過模板 ref 取得）**

| Method | 回傳 | 說明 |
|---|---|---|
| `validate()` | `boolean` | 強制驗證（即使尚未 blur 也顯示錯誤）；回傳是否全部通過。表單 submit 時呼叫 |
| `reset()` | `void` | 清掉驗證錯誤顯示（不動值） |

**v-model modifiers**

| Modifier | 行為 |
|---|---|
| `.trim` | 提交前去除前後空白（對齊原生 v-model，輸入中尾隨空白不會被即時吃掉） |
| `.number` | 以 `parseFloat` 轉數字；無法解析（如空字串）則保留原字串 |
| `.lazy` | 改在 `change`（blur / Enter）才更新，而非每次 `input` |

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
| `update:modelValue` | `string \| number` | v-model（由 `defineModel` 自動處理，無需手動 emit） |
| `focus` | `FocusEvent` | input 取得焦點時觸發 |
| `blur` | `FocusEvent` | input 失去焦點時觸發（常用於失焦驗證） |

> `focus` / `blur` 直接轉發 input 的原生事件（因元件根節點是 BaseFormField 且 focus/blur 不冒泡，故由元件顯式轉發，`@blur` 才能正確掛到 input）。

---

## 2. CSS 客製化（token）

BaseTextField **不另立 token**，外觀沿用 BaseFormField 的 [`--field-*` token](./BaseFormField.md#2-css-客製化token)。`__container` 讀 `--field-color`（邊框）、`--field-active-color`（hover / focus）、`--field-radius`（圓角）、`--field-height`（高度）、`--field-background`（背景，disabled 變淡），覆寫即可主題化：

```vue
<template>
  <BaseTextField class="dense-field" label="金額" />
</template>

<style scoped>
.dense-field {
  --field-height: 44px;
  --field-active-color: #db2777;
  --field-radius: 10px;
}
</style>
```

focus 採「邊框轉 active 色 + 同色柔光 ring（box-shadow，以 `color-mix` 取 `--field-active-color` 22%）」的單一視覺，僅在**鍵盤聚焦**（`:has(input:focus-visible)`）時出現，error 狀態下自動轉紅；並保留一個透明 `outline` 作為 forced-colors（高對比）模式的焦點後備。控制項與訊息列的間距由 BaseFormField 的 `--field-message-gap-y`（預設 `6px`）控制。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const price = ref<number>()
const bio = ref('')
</script>

<template>
  <!-- 基本：標籤置頂 + 必填 + 訊息 -->
  <BaseTextField
    v-model="email"
    type="email"
    label="電子郵件"
    label-placement="top"
    required
    message="我們不會公開你的信箱"
    autocomplete="email"
  />

  <!-- 前後綴 + .number modifier -->
  <BaseTextField v-model.number="price" label="金額" prepend="$" append="USD" type="number" />

  <!-- 字數計數 + maxlength -->
  <BaseTextField v-model="bio" label="自我介紹" :maxlength="100" show-count />

  <!-- 修整空白 -->
  <BaseTextField v-model.trim="email" label="帳號" />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `label` prop；`#message` slot > `message` prop；`#prepend` / `#append` slot > 對應 prop。
- **受控 / 非受控**：由 `defineModel` 原生處理——父層綁 `v-model` 即受控、值以父層為準；未綁時元件自留內部狀態，仍可正常輸入。
- **modifier 與輸入體驗**：model → input 的同步複刻原生 `vModelText` 的 focus 守衛——聚焦輸入中且「修整後值與 model 相等」時不覆寫 `el.value`，避免 `.trim` 的尾隨空白、`.number` 的 `"1."` 在輸入途中被吃掉；失焦（`change`）時再把顯示值正規化（`.trim` 去尾隨空白、`.number` 去無效字元）。
- **IME 組字**：注音 / 拼音 / 日文等組字途中不提交中途值，待 `compositionend`（選字完成）才更新 model，對齊原生 v-model（改用 `defineModel` 後在元件內手動補回 `vModelText` 內建的組字守衛）。
- **`maxlength` 與計數單位差異**：HTML 原生 `maxlength` 以 **UTF-16 code unit** 計，`showCount` 以 **grapheme cluster** 計。多數情況一致，但 emoji / astral 字元會不同（如 `"😀"` 計數顯示 `1`，卻佔原生 `maxlength` 的 2）。需要嚴格以「人類可見字數」限制長度時，請改用 JS 在 `update:modelValue` 時自行裁切，而非僅依賴原生 `maxlength`。
- **字數計數**：`showCount` 以 grapheme cluster 計（原生 `Intl.Segmenter`），emoji（含膚色 / ZWJ 組合）、中日韓字元都算 1 字；`type="number"` 或 `.number` modifier 時自動關閉（數字無「字數」概念）。計數標 `aria-hidden`（裝飾性資訊）。
- **狀態傳遞**：`error` / `disabled` 由 BaseFormField 改寫 `--field-*` token，`__container` / `__input` 自動跟著變色；`invalid` / `required` / `disabled` / `readonly` 經 BaseFormField 的 scoped slot props 綁到 input 的 `aria-invalid` / `aria-required` / `disabled` / `readonly`。

---

## 5. A11y

- **標籤關聯**：BaseFormField 自動把 `<label for>` 接到 input `id`（未傳 `id` 時自動產生），點標籤聚焦 input、SR 朗讀標籤。
- **錯誤提示**：`error` 時 input 綁 `aria-invalid="true"`，`message` 描述錯誤；訊息區 `aria-live="polite"` 在訊息變動時朗讀。
- **必填**：`required` 同時呈現視覺星號與 input 的 `aria-required` / `required`，確保 SR 使用者知道為必填。
- **描述關聯**：有 `message`（或 `#message` slot）時 input 自動綁 `aria-describedby` 指向訊息區；無訊息時不綁，避免指向空節點。
- **行動裝置**：依輸入內容指定 `inputmode`（如金額用 `numeric`、電話用 `tel`）與 `autocomplete`，提升行動端輸入體驗與自動填入。

---

## 6. 驗證（rules）

傳入 `rules`（規則陣列）即啟用驗證；每條規則是純函式，回傳 `true`（通過）或字串（錯誤訊息）。驗證邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts) composable，規則 helper 放 [`~/utils/validators`](../../app/utils/validators.ts)，元件本身保持純呈現。

**觸發時機（touched-gated）**：第一次 `blur`（碰過欄位）後才開始顯示錯誤；此後值一變動就**逐字即時重驗**，兼顧「即時回饋」與「不打斷正在輸入的人」。多條規則時顯示**第一條失敗**的訊息。

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
import { ref, useTemplateRef } from 'vue'
import { required, email, minLength, sameAs } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

const account = ref('')
const password = ref('')
const confirm = ref('')

const accountRules: ValidationRule<string | number>[] = [required('請輸入帳號'), minLength(4, '帳號至少 4 碼')]
const confirmRules: ValidationRule<string | number>[] = [required(), sameAs(() => password.value, '兩次密碼不一致')]

// 表單 submit 時強制驗證所有欄位
const accountField = useTemplateRef('accountField')
function onSubmit() {
  const ok = accountField.value?.validate()
  if (!ok) return
  // …送出
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <BaseTextField ref="accountField" v-model="account" label="帳號" :rules="accountRules" />
    <BaseTextField v-model="confirm" type="password" label="確認密碼" :rules="confirmRules" />
  </form>
</template>
```

> 目前僅支援**同步**規則。非同步驗證（如打 API 查帳號是否重複）暫不在範圍內——可在父層自行處理後用 `error` / `message` prop 餵回。

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` 處理受控 / 非受控 | 一整套樣板，且 `defineModel` 已原生提供 | 改用 `defineModel()`（符合專案「Vue 3.4+ MUST 用 defineModel」規範），移除 `useControlled` / `toKebabCase` / `hasOwn` 相依 |
| 2 | 用 `defineComponent` + `createElementBlock` / `vModelText` / `withDirectives` 等 **Vue 內部 API** 動態套用 modifier | 依賴未公開 API、脆弱難讀 | 改用 `[model, modifiers] = defineModel()` + `input` / `change` 事件，並以 watchEffect 複刻原生 focus 守衛，無任何內部 API |
| 3 | `useStringLength` 依賴 `string-length` npm 套件 | 多一個 runtime 相依，且該套件主要為 Node ANSI 場景設計 | 改用零依賴的原生 `Intl.Segmenter`（grapheme 計數），舊環境退回 `[...str]`（code point）；補 Vitest 測試 |
| 4 | 全域 `<style>`（樣式洩漏）、依賴全域 SCSS token | 樣式外洩、強綁外部 SCSS | `scoped` + 沿用 BaseFormField 的 `--field-*` token，元件自包含 |
| 5 | input focus 無 outline，僅靠 `:focus-within` 變邊框色 | 鍵盤使用者焦點不夠明顯 | 補 `:has(input:focus-visible)` 的 `outline: 2px solid`（對齊全庫 focus 慣例），且只在鍵盤聚焦時出現 |
| 6 | 字數計數無 `aria-hidden`、`maxlength` 型別用 `InputHTMLAttributes` 寬鬆值 | 計數會被 SR 重複朗讀；型別偏寬 | 計數標 `aria-hidden`；`maxlength` / `minlength` 收斂為 `number` |
| 7 | 缺 `autocomplete` / `inputmode` | 行動端輸入與自動填入體驗不足 | 補 `autocomplete` / `inputmode` 透傳到 input |

> 註 1：`isComponent` 沿用參考實作的判斷（function / `render` / `setup` 三種元件形態），改寫為複用本庫既有的 `isFunction`、收斂參數型別為 `unknown`，並補單元測試。
>
> 註 2：改用 `defineModel` 後，原生 `vModelText` 內建的「IME 組字守衛」與「失焦正規化」需在元件內手動補回（見 §4），以維持與原生 v-model 一致的中日韓 / 修飾符輸入體驗。

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseTextField.spec.ts`（結構與欄位轉發、`<label for>` 關聯、原生屬性透傳、v-model 雙向與 `.trim` / `.number` / `.lazy` modifier、IME 組字不提交中途值 / 失焦正規化、`focus` / `blur` 事件轉發、`prepend` / `append` 字串與元件與 slot、`showCount` 計數 / `count/maxlength` / number 時關閉 / grapheme 計數、a11y `aria-describedby` / `aria-invalid` / `aria-required` / `disabled` / `readonly`、**驗證 rules**：touched-gated 不提早報錯 / blur 後顯示 / 逐字即時重驗 / `error` prop 強制錯誤 / `message` prop 優先 / `validate()` / `reset()` expose）
- [x] **Vitest**：`tests/composables/useValidation.spec.ts`（touched-gated、首條失敗訊息、即時重驗、`validate` / `reset`、空規則、動態規則）；`tests/utils/validators.spec.ts`（`required` / `email` / `minLength` / `maxLength` / `pattern` / `sameAs` 與空值放行）
- [x] **Vitest**：`tests/composables/useStringLength.spec.ts`（ASCII / 空字串 / CJK / astral emoji / ZWJ 組合 / ref / getter）；`tests/utils/isComponent.spec.ts`（functional / options-render / setup / defineComponent / 字串 / 數字 / 純物件 / null-undefined）
- [x] **Storybook**：`stories/components/atoms/BaseTextField.stories.ts`（Playground / Types / PrependAppend / ShowCount / States / LabelPlacement / Validation / Themed）
