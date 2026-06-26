# FormField 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseFormField.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseFormField 是 **表單欄位容器**：統一「標籤 + 控制項 + 訊息」三段式版面，集中管理欄位狀態（`error` / `disabled` / `readonly` / `required`）與無障礙接線（`label for`、`aria-describedby`、`aria-invalid`…）。

本身**不含任何 input**：實際控制項由使用端透過 `#default` slot 傳入，BaseFormField 把 id / a11y 資訊以 scoped slot props 暴露出來給控制項綁定。狀態以 `--field-*` CSS token 對外傳遞，包在其中的控制項（input / select…）可直接讀取（如邊框跟著 `error` 轉紅）。

搭配 `useFormFieldProps` composable，封裝型控制項（如未來的 `BaseInput` / `BaseSelect`）可把自身 props 上的欄位語意一鍵轉發給內部 `<BaseFormField>`，免去逐一手寫透傳。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicFormField`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicFormField.vue)（及其 [`pick`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/utils/pick.ts) util），並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `id` | `string` | —（自動產生 `field-{useId}`） | 控制項 id；同步給 `<label for>` 與 `#default` slot 的 `id` |
| `label` | `string` | — | 標籤文字；提供 `#label` slot 時以 slot 為準 |
| `labelPlacement` | `'left' \| 'top'` | `'left'` | 標籤位置：並排 / 置頂 |
| `labelWidth` | `string \| number` | `'fit-content'` | `label-left` 時的標籤寬度；數字補 `px`、字串原樣（如 `'6rem'`） |
| `hideLabel` | `boolean` | `false` | 視覺隱藏標籤但保留 sr-only；版面不再保留標籤欄 |
| `message` | `string` | — | 輔助 / 驗證訊息；提供 `#message` slot 時以 slot 為準 |
| `error` | `boolean` | `false` | 錯誤狀態：套錯誤色 token、訊息轉紅，slot prop `invalid` 提示綁 `aria-invalid` |
| `required` | `boolean` | `false` | 必填：標籤後顯示 `*`，slot prop `required` 提示綁 `aria-required` |
| `disabled` | `boolean` | `false` | 停用：套停用 token，slot prop `disabled` 傳給控制項 |
| `readonly` | `boolean` | `false` | 唯讀：套 modifier，slot prop `readonly` 傳給控制項 |

**Slots**

| Slot | Scoped props | 說明 |
|---|---|---|
| `#default` | `id`, `labelledby`, `describedby`, `invalid`, `required`, `disabled`, `readonly` | 控制項插槽；把這些值綁到實際的 input / select 上（見 §4） |
| `#label` | `label` | 標籤內容，取代 `label` prop |
| `#message` | `error`, `message` | 訊息內容，取代 `message` prop |

> 本元件無 Emits —— 它只負責版面與接線，值的雙向綁定由插入的控制項自行處理。

---

## 2. CSS 客製化（token）

預設 token 皆以 `:where()`（specificity 0）宣告，使用端 class 覆寫得動。

| Token | 預設 | 作用 |
|---|---|---|
| `--field-height` | `36px`（對齊 BaseButton） | 控制項列高（label-left 標籤 line-height、控制項 min-height） |
| `--field-label-width` | 由 `labelWidth` prop 注入 | `label-left` 標籤欄寬度 |
| `--field-label-gap-x` | `8px` | `label-left` 標籤與控制項水平間距 |
| `--field-label-gap-y` | `6px` | `label-top` 標籤與控制項垂直間距 |
| `--field-label-font-size` | `0.875rem` | 標籤字級 |
| `--field-label-color` | `#374151`（gray-700） | 標籤文字色 |
| `--field-message-font-size` | `0.75rem` | 訊息字級 |
| `--field-message-color` | `#6b7280`（error 時 = danger） | 訊息文字色 |
| `--field-danger-color` | `#dc2626` | 必填星號 / 錯誤色來源 |
| `--field-background` | `transparent` | **狀態傳遞**：控制項背景（disabled 變淡） |
| `--field-color` | `#d1d5db` | **狀態傳遞**：控制項預設邊框 / 輪廓色（error / disabled 時改變） |
| `--field-active-color` | `#1d4ed8`（= primary，對齊 BaseButton） | **狀態傳遞**：控制項 focus / active 色（error 轉紅、disabled 變淡） |
| `--field-radius` | `6px`（對齊 BaseButton） | **狀態傳遞**：控制項圓角（供子控制項讀取） |

> **狀態傳遞 token**：`--field-background` / `--field-color` / `--field-active-color` / `--field-radius` 不直接作用在 BaseFormField 自身，而是給**包在 `#default` slot 內的控制項**讀取。BaseFormField 依 `error` / `disabled` 狀態改寫這些 token，控制項只要用 `border-color: var(--field-color)`、`border-radius: var(--field-radius)`、`:focus-visible { outline: 2px solid var(--field-active-color) }`（對齊全庫一致的 focus 慣例）就能自動跟著欄位狀態變色，不必各自重寫一套狀態邏輯。error 狀態下 `--field-active-color` 轉紅，focus outline 也一起轉紅。

```vue
<template>
  <BaseFormField class="dense-field" label="金額" />
</template>

<style scoped>
.dense-field {
  --field-height: 44px;
  --field-active-color: #db2777;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 標籤置頂 + 必填 + 訊息 -->
  <BaseFormField label="電子郵件" label-placement="top" required message="我們不會公開你的信箱">
    <template #default="{ id, describedby, invalid, required }">
      <input
        :id="id"
        v-model="email"
        type="email"
        :aria-describedby="describedby"
        :aria-invalid="invalid"
        :aria-required="required"
      />
    </template>
  </BaseFormField>

  <!-- 標籤並排，固定寬度 -->
  <BaseFormField label="姓名" label-placement="left" label-width="80px">
    <template #default="{ id }"><input :id="id" v-model="name" /></template>
  </BaseFormField>

  <!-- 錯誤狀態 -->
  <BaseFormField label="密碼" error message="長度至少 8 碼">
    <template #default="{ id, describedby, invalid }">
      <input :id="id" v-model="pwd" type="password" :aria-describedby="describedby" :aria-invalid="invalid" />
    </template>
  </BaseFormField>

  <!-- 視覺隱藏標籤（搭配 placeholder） -->
  <BaseFormField label="搜尋" hide-label>
    <template #default="{ id }"><input :id="id" placeholder="搜尋…" /></template>
  </BaseFormField>
</template>
```

### 搭配 `useFormFieldProps`（封裝型控制項）

未來實作 `BaseInput` 這類「自帶欄位語意」的控制項時，用 `useFormFieldProps` 把欄位 props 收斂後一鍵轉發：

```vue
<!-- BaseInput.vue -->
<script setup lang="ts">
import useFormFieldProps from '~/composables/useFormFieldProps'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'

interface BaseInputProps extends BaseFormFieldProps {
  modelValue?: string
  placeholder?: string
}
const props = defineProps<BaseInputProps>()
const model = defineModel<string>()

// 從完整 props 中挑出 label / error / required… 等欄位語意（含 id 一併轉發；自動濾掉 placeholder / modelValue）
const fieldProps = useFormFieldProps(props)
</script>

<template>
  <BaseFormField v-bind="fieldProps">
    <template #default="{ id, describedby, invalid }">
      <input :id="id" v-model="model" :placeholder="placeholder" :aria-describedby="describedby" :aria-invalid="invalid" />
    </template>
  </BaseFormField>
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `label` prop；`#message` slot > `message` prop。標籤兩者皆未給時不渲染標籤欄。
- **id 與標籤關聯**：未傳 `id` 時自動產生 `field-{useId}`，同步給 `<label for>` 與 `#default` slot 的 `id`。使用端**務必**把 slot 的 `id` 綁到控制項，點標籤才會聚焦控制項。
- **訊息與 `aria-describedby`**：訊息區以 `v-show` 常駐 DOM（id = `{id}-message`）讓參照穩定，並標記 `aria-live="polite"` + `aria-atomic="true"` 使動態出現 / 變動的驗證訊息整段被朗讀。`#default` slot 的 `describedby` **僅在有訊息時**（`message` prop 或 `#message` slot 任一存在）才是字串、否則為 `undefined`，避免控制項指向空節點；判斷直接讀 template 的 `$slots.message`，slot 在執行期增減也會正確反應。
- **狀態傳遞**：`error` / `disabled` 改寫 `--field-*` token，控制項自動跟著變色；同時把 `invalid` / `required` / `disabled` / `readonly` 以 scoped slot props 傳出（值為 `true` 或 `undefined`），方便直接綁 `aria-invalid` / `aria-required` 等。
- **必填星號**：`required` 且標籤可見時，標籤後以 CSS `::after` 顯示 `*`；`hideLabel` 時不顯示星號（標籤已隱藏）。

---

## 5. A11y

- **標籤關聯**：`<label for>` 對應控制項 `id`，點標籤聚焦控制項、SR 朗讀標籤。使用端必須把 slot `id` 綁上控制項才成立。
- **非原生控制項取名（`labelledby`）**：若控制項是 `<div role="combobox/...">` 這類**無法被 `<label for>` 命名**的元素（如 BaseSelect），請改綁 slot prop `labelledby` 到控制項的 `aria-labelledby`——它指向 BaseFormField 內 `<label>` 的 id，讓控制項用同一個可見標籤取名，不必另立 `aria-label`。有 `label` 或 `#label` slot 時才有值、否則 `undefined`。
- **錯誤提示**：`error` 時請把 slot prop `invalid` 綁到控制項的 `aria-invalid`，並用 `message` 描述錯誤；訊息區 `aria-live="polite"` 會在訊息變動時朗讀。
- **必填**：視覺星號（CSS content）部分 SR 不一定朗讀，故另把 slot prop `required` 傳出，請綁到控制項 `aria-required`，確保 SR 使用者知道為必填。
- **隱藏標籤**：`hideLabel` 用 sr-only 技巧（非 `display:none`），標籤仍保留給 SR；此情境建議搭配 `placeholder` 或 `aria-label` 維持視覺使用者的可辨識度。
- **描述關聯**：有 `message` 時務必把 slot `describedby` 綁到控制項 `aria-describedby`，SR 才會把訊息一併朗讀。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 全域 `<style>` + 依賴全域 SCSS `$color-map`（`map.get`）取 primary / danger | 樣式洩漏全域；強綁外部 SCSS map，元件無法獨立運作 | `scoped` + 自包含 `--field-*` token（含 `--field-danger-color`），移除全域相依 |
| 2 | `@include sr-only`（依賴全域 mixin） | 同樣強綁外部 SCSS，缺 mixin 即壞 | `--hide-label` 內聯標準 sr-only 宣告（含 `clip-path` fallback），元件自包含 |
| 3 | `pick` util 簽名 `Record<string, any>` | 違反專案禁用 `any` | 改 `T extends object` + 泛型 key，回傳精確 `Pick<T, K>`，並補 Vitest 單元測試 |
| 4 | `useFormFieldProps` 寫在 SFC 的 `<script lang="ts">` 區塊 | 含 `computed` 的可複用邏輯依規範應歸 `composables/` | 抽到 `app/composables/useFormFieldProps.ts`，明確標註回傳型別 `ComputedRef<BaseFormFieldProps>` |
| 5 | `#default` slot 只暴露 `id` / `describedby` | 控制項拿不到 `error` / `required` 狀態，難正確綁 `aria-invalid` / `aria-required` | 額外暴露 `invalid` / `required` / `disabled` / `readonly`（`true \| undefined`），a11y 接線一次到位 |
| 6 | 訊息區無 `aria-live` | 動態出現的驗證訊息不會被螢幕閱讀器朗讀 | 補 `aria-live="polite"`，訊息變動即朗讀 |
| 7 | `withDefaults` 漏設多個布林 prop 預設 | `error` / `required` 等推導為 `undefined` 而非 `false`，型別與行為略含糊 | 補齊所有布林 prop 預設 `false`，型別與行為一致 |
| 8 | `__content` 無 `min-width: 0` | `label-left` flex 版面下控制項超長內容會撐破欄位 | 補 `min-width: 0`，超長內容可正確收斂 |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseFormField.spec.ts`（label / `#label` slot 優先序、`<label for>` 關聯、自動 / 指定 id、label-placement 與 error / disabled / readonly / required / hide-label modifier class、`labelWidth` 數字補 px / 字串原樣 / hideLabel 時不注入、message 渲染與 `{id}-message` + `aria-live` + `aria-atomic`、`#message` slot 優先序、`#default` scoped props `describedby`（prop 與 slot 兩條來源）/ `invalid` / `required` / `disabled` / `readonly`）— 21 cases
- [x] **Vitest**：`tests/utils/pick.spec.ts`（挑選指定 key、`hasOwnProperty` 守衛、忽略原型鏈屬性、淺拷貝不變更來源）— 6 cases；`tests/composables/useFormFieldProps.spec.ts`（濾出欄位子集含 id 轉發、ref / getter 響應、只含實際存在的 key）— 3 cases
- [x] **Storybook**：`stories/components/atoms/BaseFormField.stories.ts`（Playground / LabelPlacement / States / HideLabel / CustomSlots / Themed）
