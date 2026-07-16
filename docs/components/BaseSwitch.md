# Switch 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseSwitch.vue`）。
> **配套**：`docs/components/BaseCheckbox.md`（勾選框）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseSwitch 是 **開關**：以 `<label>` 包住視覺隱藏（sr-only）的原生 `<input type="checkbox" role="switch">` + 自繪軌道（`__track`）+ 滑塊（`__thumb`）。v-model 綁 `boolean`（或 `activeValue`/`inactiveValue` 自訂值），可選兩側狀態文字（`activeText` / `inactiveText`）與主標籤（`label`），並支援 `rules` 驗證。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicSwitch`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicSwitch.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

元件為**泛型** `BaseSwitch<Value>`（`Value` 預設 `boolean`）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `boolean \| Value` | — | 開關狀態；可搭 `activeValue`/`inactiveValue` |
| `activeValue` | `Value \| boolean` | `true` | 開啟時 v-model 的值 |
| `inactiveValue` | `Value \| boolean` | `false` | 關閉時 v-model 的值 |
| `label` | `string` | — | 標籤文字；也可用 `#default` / `#label` slot |
| `labelPlacement` | `'left' \| 'right' \| 'top' \| 'bottom'` | `'left'` | 標籤相對開關位置 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'primary'` | 開啟色 |
| `activeText` | `string` | — | 開啟時顯示於軌道旁的文字 |
| `inactiveText` | `string` | — | 關閉時顯示於軌道旁的文字 |
| `disabled` | `boolean` | `false` | 停用 |
| `name` | `string` | — | 原生 name |
| `id` | `string` | — | 控制項 id；未提供自動產生 |
| `message` | `string` | — | 輔助 / 驗證訊息 |
| `error` | `boolean` | `false` | 錯誤狀態 |
| `rules` | `ValidationRule<...>[]` | — | 驗證規則（touched-gated）。見 §6 |

**Methods（模板 ref）**：`validate()` → `boolean`、`reset()` → `void`。

**Slots**：`#default` / `#label`（標籤內容）、`#message`（scoped：`error`、`message`）。

**Emits**：`update:modelValue`（defineModel）、`change`（轉發原生 change）。

---

## 2. CSS 客製化（token）

| Token | 預設 | 說明 |
|---|---|---|
| `--switch-color` | `#1d4ed8`（隨 `color`） | 開啟軌道色 / focus ring / 啟用側文字色 |
| `--switch-width` | `44px` | 軌道寬 |
| `--switch-height` | `24px` | 軌道高（= 滑塊位移基準） |
| `--switch-padding` | `3px` | 滑塊與軌道內距 |
| `--switch-track-off` | `#d1d5db` | 關閉時軌道色 |
| `--switch-thumb-color` | `#fff` | 滑塊色 |
| `--switch-gap` | `8px` | 標籤與開關間距 |
| `--switch-text-gap` | `8px` | 狀態文字與軌道間距 |
| `--switch-label-color` | `#374151` | 標籤文字色 |
| `--switch-danger-color` | `#dc2626` | 錯誤色 |

語意色以 `:where(.base-switch--{color})` 設定 `--switch-color`（specificity 0，覆寫得動）。滑塊位移為 `translateX(width - height)`，改尺寸 token 即自動換算，毋須額外設定。鍵盤聚焦時於 `__track` 外畫 `outline`（input 為 sr-only，靠 `:focus-visible + __track` 相鄰選擇器）。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const dark = ref(false)
const status = ref('off')
</script>

<template>
  <BaseSwitch v-model="dark" label="深色模式" />
  <BaseSwitch v-model="status" label="狀態" active-value="on" inactive-value="off" />
  <BaseSwitch v-model="dark" active-text="啟用" inactive-text="停用" />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `#default` slot > `label` prop；`#message` slot > `message` prop。
- **值對應**：v-model 綁 `boolean`，或以 `activeValue`/`inactiveValue` 綁自訂值。設了 `activeValue` 或 `inactiveValue` 任一即進入自訂值模式（`isChecked = model === activeValue`）；兩者皆未設才退回 boolean 真值判斷（`!!model`）。如此「只設 `inactiveValue`」時 truthy 的初始值（如 `'off'`）不會被誤判為開啟。
- **狀態文字**：`activeText` / `inactiveText` 位於軌道兩側，啟用側套 `--switch-color`。兩者皆為純視覺裝飾標 `aria-hidden`（開 / 關狀態由 `role="switch"` 傳達、用途由 `label` 傳達，避免 SR 重複朗讀）。
- **切換**：原生 `change` 推導新值 `checked ? activeValue : inactiveValue`，emit `update:modelValue` 與 `change`。
- **停用**：`--switch-color` / 軌道轉灰、input `disabled`、cursor `not-allowed`，且 `change` 不送值。

---

## 5. A11y

- 原生 `<input type="checkbox" role="switch">` 提供完整鍵盤 / 表單語意；視覺以自繪軌道呈現，input 採 sr-only（非 `display:none`，保留可聚焦 / 可點 / 表單送出）。
- `<label>` 包住 input，點標籤即切換、SR 朗讀標籤。
- 開 / 關狀態由原生 `<input type="checkbox" role="switch">` 的 `checked` 自動映射到無障礙樹，**不另加冗餘 `aria-checked`**（避免兩處狀態來源不同步）。
- 有訊息時 input 綁 `aria-describedby` 指向訊息區（`aria-live="polite"` + `aria-atomic="true"`，且以 `v-show` 常駐 DOM 而非 `v-if`，確保動態出現 / 變動的訊息整段被朗讀，對齊 `BaseFormField`）、錯誤時 `aria-invalid`。
- 狀態文字（`activeText` / `inactiveText`）為純裝飾，兩側皆標 `aria-hidden`；鍵盤聚焦於 `__track` 顯示 `outline`（`:focus-visible`）。

---

## 6. 驗證（rules）

傳入 `rules`（規則陣列）即啟用，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。採 **touched-gated**：`change` 或 `blur` 後才顯示，之後即時重驗。`error` 為 `props.error || 驗證失敗`；`message` 驗證錯誤優先、否則退回 `props.message`。

> **布林必填**：`required` 不會把 `false` 視為空值，故「必須開啟」請用自訂規則：`(v) => v === true || '必須開啟'`。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const agree = ref(false)
const rules: ValidationRule<boolean | undefined>[] = [(v) => v === true || '必須開啟才能繼續']
</script>

<template>
  <BaseSwitch v-model="agree" label="啟用通知" :rules="rules" />
</template>
```

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` | 受控樣板，`defineModel` 已原生提供 | 改用 `defineModel`（免額外相依） |
| 2 | 依賴 `AtomicFormLabelField` + `useFormLabelFieldProps`（另一套 field 包裝） | 多一個欄位包裝元件 | BaseSwitch 自渲染 inline `<label>`，與 BaseCheckbox 一致 |
| 3 | 全域 `$color-map` / `@include sr-only` | 強綁全域 SCSS | scoped + 自宣告 `--switch-*` token + 自寫 sr-only |
| 4 | `:has(&__input:checked)` 切文字色 / `--switch-thumb-translate` 由 `:checked + track` 設定 | 混用 token 中介，狀態散落 selector | 選中態統一由原生 `:checked` 偽類 + 兄弟選擇器驅動軌道 / 滑塊 / 文字（狀態來源單一＝DOM，`form.reset()` 還原 `input.checked` 時視覺同步；僅 inactiveText 因位於 input 之前需 `:has()` 反向判斷），**不輸出** JS 的 `--checked` modifier class |
| 5 | 無驗證 | 與庫內表單元件不一致 | 整合 `useValidation` + `rules` + `validate()` / `reset()` |
| 6 | input 用 `@click.stop`、無 `aria-describedby` / `aria-invalid` | a11y 接線不足 | 補 `aria-describedby` / `aria-invalid`（checked 由 `role="switch"` 原生映射，不加冗餘 `aria-checked`），停用時不送值 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseSwitch.spec.ts`（渲染 / role="switch" / slot 標籤 / 狀態文字 / color / labelPlacement class、label 切換、v-model boolean、activeValue/inactiveValue、disabled（含不送值）、change 事件、rules touched-gated / `validate()` / `reset()`、aria 接線）
- [x] **Storybook**：`stories/components/atoms/BaseSwitch.stories.ts`（Playground / States / StateText / LabelPlacement / Colors / ActiveInactiveValue / Validation / Themed）
