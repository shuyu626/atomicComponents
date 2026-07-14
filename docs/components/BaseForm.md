# Form 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseForm.vue`）。
> **配套**：`app/composables/useFormContext.ts`（provide/inject 契約）、`docs/components/BaseFormField.md`（`--error` class 與 `aria-live` 訊息區）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseForm 是 **表單協調器**：一個 `<form novalidate>` 包裝元件，本身不持有任何欄位值，只負責在 submit 時把「已註冊」的表單控制項全部驗證一次，全過才 emit `submit`，否則 emit `invalid` 並（預設）捲動聚焦到第一個錯誤欄位。

核心機制是 **自動註冊**：BaseForm 在 `setup()` 內呼叫 `provideFormContext()` 建立一個欄位 registry 並 `provide` 給子孫元件；所有內部用 `useValidation` 的表單控制項（BaseTextField、BaseSelect、BaseCheckbox…）掛載時會自動 `inject` 到這個 registry 並註冊自己的 `{ validate, reset }`，卸載時自動反註冊。使用端不需要手動蒐集欄位 ref 或呼叫任何註冊 API——這與需要在每個欄位標記 `prop`／`model` 才能整表驗證的作法（如 Element Plus）不同，見 §4、§5。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `scrollToError` | `boolean` | `true` | 驗證失敗時是否捲動並聚焦第一個錯誤欄位 |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `submit` | `SubmitEvent` | 全部已註冊欄位驗證通過後觸發；原生 submit 已被 `preventDefault`，事件物件供讀取 `submitter` 等資訊 |
| `invalid` | — | 任一已註冊欄位驗證失敗時觸發 |

**Slots**

| Slot | 說明 |
|---|---|
| `#default` | 表單內容；內含的表單控制項（有 `rules` 者）會自動註冊進整表驗證，見 §4 |

**Expose（透過模板 ref 取得）**

| Method | 回傳 | 說明 |
|---|---|---|
| `validate()` | `boolean` | 強制驗證全部已註冊欄位（全跑不短路）；回傳是否全部通過 |
| `resetValidation()` | `void` | 清除全部欄位的驗證顯示狀態（touched）；**不重設值**，見 §5 |

---

## 2. 無樣式 token

BaseForm 是**行為容器**，不持有任何視覺樣式——版面、間距、標籤位置、錯誤色全部由包在 `#default` slot 裡的 [`BaseFormField`](./BaseFormField.md)（`--field-*` token）與各控制項自行呈現。BaseForm 的 `<style>` 只有一行：

```scss
.base-form {
  display: block;
}
```

因此本文件沒有「CSS 客製化（token）」段落：需要調整表單版面（如欄位間距、多欄排版）時，直接在使用端包一層容器或對 `.base-form` 加自訂 class 處理即可，不需要、也不會有 `--form-*` 這類 token。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { email, required } from '~/utils/validators'

const name = ref('')
const mail = ref('')

const formRef = useTemplateRef('formRef')

function onSubmit() {
  // 走到這裡代表所有欄位都已通過驗證。
  console.log({ name: name.value, mail: mail.value })
}
</script>

<template>
  <BaseForm
    ref="formRef"
    @submit="onSubmit"
    @invalid="() => console.log('表單有欄位未通過驗證')"
  >
    <BaseTextField v-model="name" label="姓名" :rules="[required('請輸入姓名')]" />
    <BaseTextField v-model="mail" label="Email" :rules="[required('請輸入 Email'), email()]" />

    <button type="submit">送出</button>
    <button type="button" @click="formRef?.resetValidation()">清除錯誤</button>
  </BaseForm>
</template>
```

`<button type="submit">` 或欄位內按 Enter（見 §6 「原生紅利」）都會觸發同一條 `onSubmit` 流程，不需要另外手動呼叫 `validate()`——除非要在 submit 之外的時機（如切換分頁前）主動檢查，見 §4 的 `validate()` / `resetValidation()` 說明。

---

## 4. 自動註冊機制

```
BaseForm.setup()
  └─ provideFormContext()
       ├─ 建立 registry：Set<{ validate, reset }>（非響應式，只在 validate() / resetValidation() 時遍歷）
       └─ provide(formContextKey, { register })
              │
              ▼
子孫元件（BaseTextField / BaseSelect / … 內部）
  └─ useValidation(value, rules)
       ├─ injectFormContext() —— 沒有 BaseForm 祖先時回傳 null，行為完全不變（見 tests/composables/useFormContext.spec.ts 的回歸測試）
       └─ 有 context 時：onScopeDispose(context.register({ validate, reset }))
              ├─ mounted：加進 registry
              └─ unmounted（含 v-if 移除）：自動呼叫反註冊函式，registry 移除
```

**會自動註冊的控制項**：所有內部使用 `useValidation` 的元件，目前共 12 個。只要這些元件出現在 BaseForm 的 `#default` slot 底下（不管巢狀幾層），掛載時就會自動註冊，卸載時自動反註冊，使用端完全不需要手動接線。其中有一個重要差異：**是否包在 `BaseFormField` 內**決定了該欄位驗證失敗時能否成為 `scrollToError` 的捲動 / 聚焦目標（機制與注意事項見 §6）：

| 控制項 | 自動註冊 | submit 失敗時可被捲動 / 聚焦 |
|---|---|---|
| `BaseTextField`、`BaseTextarea`、`BaseInputNumber`、`BaseSelect`、`BaseDatePicker`、`BaseFileUpload`、`BaseCheckboxGroup`、`BaseRadioGroup` | ✅ | ✅ 內部渲染 `BaseFormField`，錯誤時帶 `.base-form-field--error` |
| `BaseCheckbox`、`BaseRadio`、`BaseRating`、`BaseSwitch` | ✅ | ❌ 自繪根節點（不含 `BaseFormField`），錯誤 class 是各自的 `.base-checkbox--error` / `.base-radio--error` / `.base-rating--error` / `.base-switch--error`，`scrollToFirstError()` 查不到 |

**群組模式的註冊歸屬**：`BaseCheckbox` / `BaseRadio` 放進對應的 Group 時切換為「群組模式」——子元件內部是 `validation = group ? null : useValidation(...)`（見 `BaseCheckbox.vue`），也就是**群組內的子元件完全不呼叫 `useValidation`、不會註冊**；`rules` 統一設在 Group 層，registry 裡只有 Group 這一筆。不存在「子元件重複註冊」的情況。

**無 `rules` 的欄位無害**：`useValidation` 的 `firstError` 是「跑 `rules` 陣列」算出來的，`rules` 為空或未傳時直接回傳 `undefined`（見 `useValidation.ts`），也就是說沒有設定 `rules` 的欄位 `validate()` 恆回傳 `true`。因此表單裡放沒有 `rules` 的獨立欄位（如純顯示用途的 `BaseTextField`、未設 `rules` 的 standalone `BaseCheckbox`），只是讓 registry 多幾筆「恆真」的項目，完全不影響整表驗證結果。

---

## 5. `resetValidation` 為何不叫 `reset`

BaseForm 刻意不叫這個方法 `reset()`，因為它做的事情比一般認知的「表單重設」窄很多——它**只清驗證顯示狀態，不動任何欄位的值**。與 Element Plus 的 `resetFields()` 對比：

| | Element Plus `formRef.resetFields()` | BaseForm `resetValidation()` |
|---|---|---|
| 清除驗證錯誤訊息 | ✅ | ✅ |
| 把欄位值重設回初始值 | ✅ | ❌ **不會** |
| 值由誰持有 | `el-form` 透過 `model` + `prop` 綁定，form 本身知道每個欄位的「初始值」可回填 | 本庫**沒有** `model` / `prop` 這層綁定；值完全由使用端 `v-model` 持有。`useFormContext` 的 registry 只存 `{ validate, reset }`，BaseForm 從頭到尾不知道、也拿不到任何欄位的值 |

如果叫 `reset()`，容易讓人聯想到原生 `<form>` 的 `reset` 事件（會把表單欄位清空回初始值）而誤用；`resetValidation` 這個名字明確表達「只清驗證，不清值」——要重設值，使用端把自己手上的 `ref`（如 `name.value = ''`）改回初始值即可，職責本來就清楚地在使用端。

---

## 6. A11y

- **`novalidate`**：`<form novalidate>` 關掉瀏覽器原生的驗證泡泡（tooltip），讓所有錯誤訊息統一走 [BaseFormField](./BaseFormField.md) 的訊息區——樣式、文案、多語系、螢幕閱讀器朗讀時機都在庫內掌控，不會有「原生泡泡」與「庫內錯誤訊息」雙軌並存、互相矛盾的問題。
- **錯誤朗讀**：錯誤文字本身不是 BaseForm 畫的——BaseFormField 的訊息區以 `aria-live="polite"` + `aria-atomic="true"` 常駐 DOM（見 `BaseFormField.vue`），submit 失敗、某欄位錯誤訊息出現或變動時，會被螢幕閱讀器整段朗讀。
- **focus 移轉（限 BaseFormField 系控制項）**：`scrollToError`（預設 `true`）在驗證失敗後，把焦點移到第一個 `.base-form-field--error` 內的可聚焦控制項（`input` / `select` / `textarea` / `button` / 有效 `tabindex`，皆排除 `disabled`）。這一步等同幫 AT 使用者「跳到問題所在」——不需要在整頁 Tab 摸索，焦點一到位，該欄位的 `aria-describedby` 就會讓 AT 立刻讀出對應錯誤訊息。
  > ⚠️ **例外**：`BaseCheckbox`、`BaseRadio`、`BaseRating`、`BaseSwitch` 這 4 個控制項不渲染 `BaseFormField`（錯誤 class 是各自的 `.base-checkbox--error` 等，見 §4 的表格），**永遠不會**成為捲動 / 聚焦目標。若表單中「第一個（或唯一）失敗的欄位」是這 4 者之一，BaseForm 仍會照常 emit `invalid`、該欄位也照常顯示錯誤訊息，但**不會發生任何捲動與焦點移轉**。實務緩解：(1) 監聽 `@invalid` 自行處理捲動 / 聚焦（自行查詢這 4 個錯誤 class 後 `scrollIntoView` + `focus`）；(2) 版面允許時，把這類欄位包一層 `BaseFormField`（`error` prop 由使用端狀態驅動——它是呈現容器，不會自動讀取子控制項的內部驗證狀態），讓錯誤錨點回到 `.base-form-field--error` 的查詢範圍。⚠️ 此作法會產生**兩個訊息區**（控制項自身的錯誤訊息 + 外層 `BaseFormField` 的 `aria-live` 訊息區），務必只對其中一處傳 `message`（另一處留空），否則同一段錯誤文字會被 AT 重複朗讀兩次。
- **reduced-motion**：捲動前讀 `window.matchMedia('(prefers-reduced-motion: reduce)').matches`；為 `true` 時 `scrollIntoView` 用 `behavior: 'auto'`（無動畫瞬移），否則用 `'smooth'`，尊重使用者的動態效果偏好設定。

---

## 7. 未來擴充（v1 明確不做）

以下能力目前**刻意不做**，避免在需求還沒明確前過度設計；有實際場景再另開規格：

- **disabled 傳播**：BaseForm 不會把整體 `disabled` 往下傳給所有已註冊欄位。要整表停用，目前需自行逐一設定各欄位的 `disabled` prop，或包一層原生 `<fieldset disabled>`。
- **form 層 `labelPlacement` / `labelWidth` 預設值**：BaseForm 不提供統一設定底下所有 `BaseFormField` 標籤版面的 props；每個欄位各自透過自己的 `labelPlacement` / `labelWidth` 設定。
- **async rules**：`ValidationRule` 目前定義為同步函式（回傳 `true | string`），`validate()` 也是同步 API。像「email 是否已被註冊」這類需要打 API 才能判定的規則，v1 不支援。
- **`validateField(name)`**：目前只有「整表驗證」的 `validate()`，沒有依欄位名稱單獨驗證單一欄位的 API——`FormFieldRegistration` 本來就沒有記錄欄位的 `name`，registry 是一個無名的 `Set`。

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseForm.spec.ts`（渲染 `<form novalidate class="base-form">`、submit 失敗 emit `invalid` 不 emit `submit`、submit 全過 emit `submit` 一次、驗證全跑不短路（兩個錯誤欄位同時顯示）、原生 submit 被 prevent、`scrollToError` 預設捲動 + 聚焦第一個錯誤欄位（`block:'center'`）、`prefers-reduced-motion` 時 `behavior:'auto'`、`scrollToError:false` 不捲動、expose `validate()`、expose `resetValidation()` 清錯誤不清值、`v-if` 動態欄位反註冊、無欄位空表單直接 `submit`、Enter 隱式送出等價路徑、第一個錯誤欄位為 BaseInputNumber 時聚焦 spinbutton 本體而非 aria-hidden ± 按鈕）— 14 cases
- [x] **Vitest**：`tests/composables/useFormContext.spec.ts`（registry 註冊 / 反註冊、無 provider 時 `injectFormContext()` 回傳 `null`、無 provider 時 `useValidation` 行為不變的回歸測試、兩個子欄位各自 `validate()` 各自顯示訊息）— 7 cases
- [x] **Storybook**：`stories/components/atoms/BaseForm.stories.ts`（Playground / ScrollToError / ManualControl / NativeSubmit）
