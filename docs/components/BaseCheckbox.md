# Checkbox 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseCheckbox.vue`）。
> **配套**：`docs/components/BaseCheckboxGroup.md`（群組）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseCheckbox 是 **勾選框**：以 `<label>` 包住視覺隱藏（sr-only）的原生 `<input type="checkbox">` + 自繪框（`__box`）+ 標籤文字。**獨立模式** v-model 綁 `boolean`（或 `trueValue`/`falseValue` 自訂值），支援 `indeterminate` 與 `rules` 驗證；放進 [`BaseCheckboxGroup`](./BaseCheckboxGroup.md) 時自動切換為**群組成員**（勾選 = `value ∈ 群組值`，由群組統一管理選取與驗證）。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicCheckbox`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicCheckbox.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

元件為**泛型** `BaseCheckbox<Value>`（`Value` 預設 `boolean`）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `boolean \| Value` | — | 獨立模式勾選狀態；可搭 `trueValue`/`falseValue` |
| `value` | `Value` | — | 在群組中此框代表的值（群組模式必填） |
| `trueValue` | `Value \| boolean` | `true` | 勾選時 v-model 的值（獨立模式） |
| `falseValue` | `Value \| boolean` | `false` | 未勾選時 v-model 的值（獨立模式） |
| `indeterminate` | `boolean` | `false` | 半選（`aria-checked="mixed"` + 視覺橫線） |
| `label` | `string` | — | 標籤文字；也可用 `#default` / `#label` slot |
| `labelPlacement` | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | 標籤相對勾選框位置 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'primary'` | 勾選色；群組模式未指定時繼承群組 |
| `disabled` | `boolean` | `false` | 停用 |
| `name` | `string` | — | 原生 name；群組模式未指定時繼承群組 |
| `id` | `string` | — | 控制項 id；未提供自動產生 |
| `message` | `string` | — | 輔助 / 驗證訊息（獨立模式） |
| `error` | `boolean` | `false` | 錯誤狀態（獨立模式） |
| `rules` | `ValidationRule<...>[]` | — | 驗證規則（獨立模式；touched-gated）。見 §6 |

**Methods（模板 ref）**：`validate()` → `boolean`、`reset()` → `void`（獨立模式）。

**Slots**：`#default` / `#label`（標籤內容）、`#message`（scoped：`error`、`message`）。

**Emits**：`update:modelValue`（defineModel）、`change`（轉發原生 change）。

---

## 2. CSS 客製化（token）

| Token | 預設 | 說明 |
|---|---|---|
| `--checkbox-color` | `#1d4ed8`（隨 `color`） | 勾選底色 / focus ring |
| `--checkbox-size` | `18px` | 勾選框邊長 |
| `--checkbox-radius` | `5px` | 勾選框圓角 |
| `--checkbox-border` | `#c6c7cb` | 未勾選邊框色 |
| `--checkbox-gap` | `8px` | 框與標籤間距 |
| `--checkbox-label-color` | `#374151` | 標籤文字色 |
| `--checkbox-danger-color` | `#dc2626` | 錯誤色 |

語意色以 `:where(.base-checkbox--{color})` 設定 `--checkbox-color`（specificity 0，覆寫得動）。鍵盤聚焦時於 `__box` 外畫 `outline`（input 為 sr-only，靠 `:focus-visible + __box` 相鄰選擇器）。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const subscribe = ref(false)
const consent = ref('no')
</script>

<template>
  <BaseCheckbox v-model="subscribe" label="訂閱電子報" />
  <BaseCheckbox v-model="consent" label="我同意" true-value="yes" false-value="no" />
  <BaseCheckbox :model-value="false" label="部分選取" indeterminate />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `#default` slot > `label` prop；`#message` slot > `message` prop。
- **獨立模式**：v-model 綁 `boolean`，或以 `trueValue`/`falseValue` 綁自訂值；`isChecked = model === trueValue`。
- **群組模式**：偵測到注入的群組 context（在 `BaseCheckboxGroup` 內）即啟用——`isChecked = value ∈ 群組值`（用 `isSet` 判斷 Array / Set），點擊呼叫群組 `toggle(value)`；`name` / `color` / `disabled` 繼承群組（個別 prop 可覆寫）；個別訊息 / 驗證交給群組（子元件**不建立** child-level 驗證、**不暴露** `validate()` / `reset()`，避免回傳無意義且誤導的驗證結果）。
- **indeterminate**：HTML 無對應 attribute，故以 DOM property 設定（`onMounted` 同步 + `watch`），並標 `aria-checked="mixed"`。
- **停用**：`--checkbox-color` 轉灰、input `disabled`、cursor `not-allowed`。

---

## 5. A11y

- 原生 `<input type="checkbox">` 提供完整鍵盤 / 表單語意；視覺以自繪 `__box` 呈現，input 採 sr-only（非 `display:none`，保留可聚焦 / 可點 / 表單送出）。
- `<label>` 包住 input，點標籤即切換、SR 朗讀標籤。
- `indeterminate` 標 `aria-checked="mixed"`。
- 有訊息時 input 綁 `aria-describedby` 指向訊息區（`aria-live="polite"` + `aria-atomic="true"`，且以 `v-show` 常駐 DOM 而非 `v-if`，確保動態出現 / 變動的訊息整段被朗讀，對齊 `BaseFormField`）、錯誤時 `aria-invalid`。
- 鍵盤聚焦於 `__box` 顯示 `outline`（`:focus-visible`）。

---

## 6. 驗證（rules）

獨立模式傳入 `rules`（規則陣列）即啟用，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。採 **touched-gated**：`change` 或 `blur` 後才顯示，之後即時重驗。`error` 為 `props.error || 驗證失敗`；`message` 驗證錯誤優先、否則退回 `props.message`。

> **布林必填**：`required` 不會把 `false` 視為空值，故「必須勾選」請用自訂規則：`(v) => v === true || '必須勾選'`。群組層的「至少選一項」請在 `BaseCheckboxGroup` 設 `rules`。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const agree = ref(false)
const rules: ValidationRule<boolean | undefined>[] = [(v) => v === true || '必須同意條款']
</script>

<template>
  <BaseCheckbox v-model="agree" label="我已閱讀並同意服務條款" :rules="rules" />
</template>
```

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` | 受控樣板，`defineModel` 已原生提供 | 改用 `defineModel`（免 `hasOwn` / `toKebabCase` 相依） |
| 2 | 依賴 `AtomicFormLabelField` + `useFormLabelFieldProps`（另一套 field 包裝） | 多一個欄位包裝元件 | BaseCheckbox 自渲染 inline `<label>`；群組標籤 / 訊息複用既有 `BaseFormField` |
| 3 | 全域 `$color-map` / `@include sr-only` | 強綁全域 SCSS | scoped + 自宣告 `--checkbox-*` token + 自寫 sr-only |
| 4 | 三段完整 SVG（checked / indeterminate / unchecked） | 體積較大、難主題化 | 以 CSS 框 + 單一勾勾 / 橫線 SVG，顏色走 `--checkbox-color` |
| 5 | 無驗證 | 與庫內表單元件不一致 | 整合 `useValidation` + `rules`（獨立模式）+ `validate()` / `reset()` |
| 6 | `onMounted` + `onUpdated` 同步 checked / indeterminate（讀 DOM 回寫 ref） | 多餘的 DOM 往返 | checked 由 computed 推導；`indeterminate` 僅以 `onMounted` + `watch` 設 DOM property |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseCheckbox.spec.ts`（渲染 / slot 標籤 / color / labelPlacement class、label 點擊切換、v-model boolean、trueValue/falseValue、indeterminate（DOM property + `aria-checked="mixed"`）、disabled、change 事件、rules touched-gated / `validate()` / `reset()`）
- [x] **Storybook**：`stories/components/atoms/BaseCheckbox.stories.ts`（Playground / States / LabelPlacement / Colors / TrueFalseValue / Validation / Themed）
