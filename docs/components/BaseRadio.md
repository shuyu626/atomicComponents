# Radio 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseRadio.vue`）。
> **配套**：`docs/components/BaseRadioGroup.md`（群組）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseRadio 是 **單選圈**：以 `<label>` 包住視覺隱藏（sr-only）的原生 `<input type="radio">` + 自繪圓圈（`__circle` 外環 + `__dot` 內點）+ 標籤文字。**獨立模式** v-model 綁 `value`（選中 = `model === value`），支援 `rules` 驗證；放進 [`BaseRadioGroup`](./BaseRadioGroup.md) 時自動切換為**群組成員**（選中 = `value === 群組值`，由群組統一管理選取與驗證）。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicRadio`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicRadio.vue)，並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

元件為**泛型** `BaseRadio<Value>`（`Value` 預設 `string | number`）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `Value` | — | 獨立模式選取值；選中時等於 `value` |
| `value` | `Value` | — | 此選項代表的值（群組模式必填；獨立模式為選中時的值） |
| `label` | `string` | — | 標籤文字；也可用 `#default` / `#label` slot |
| `labelPlacement` | `'right' \| 'left' \| 'top' \| 'bottom'` | `'right'` | 標籤相對選圈位置 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'primary'` | 選取色；群組模式未指定時繼承群組 |
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
| `--radio-color` | `#1d4ed8`（隨 `color`） | 內點色 / 選中外環 / focus ring |
| `--radio-size` | `18px` | 選圈直徑 |
| `--radio-dot-scale` | `0.62` | 內點相對選圈直徑的比例（越大內點越大、間距越小） |
| `--radio-border` | `#c6c7cb` | 未選邊框色 |
| `--radio-gap` | `8px` | 圈與標籤間距 |
| `--radio-label-color` | `#374151` | 標籤文字色 |
| `--radio-danger-color` | `#dc2626` | 錯誤色 |

語意色以 `:where(.base-radio--{color})` 設定 `--radio-color`（specificity 0，覆寫得動）。內點以 `transform: scale()` 過場，未選時 `scale(0)`、選中 `scale(1)`。鍵盤聚焦時於 `__circle` 外畫 `outline`（input 為 sr-only，靠 `:focus-visible + __circle` 相鄰選擇器）。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const plan = ref('pro')
</script>

<template>
  <BaseRadio v-model="plan" value="free" label="免費" />
  <BaseRadio v-model="plan" value="pro" label="專業" />
</template>
```

> 多個 radio 互斥選取建議交給 [`BaseRadioGroup`](./BaseRadioGroup.md)（提供群組標籤、共用 `name` 巡覽、群組驗證）。

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `#default` slot > `label` prop；`#message` slot > `message` prop。
- **獨立模式**：v-model 綁 `value`，`isChecked = model === value`；radio 為單選且**無法靠點擊取消**（`change` 只在變成選中時觸發）。
- **群組模式**：偵測到注入的群組 context（在 `BaseRadioGroup` 內）即啟用——`isChecked = value === 群組值`，點擊呼叫群組 `select(value)`；`name` / `color` / `disabled` 繼承群組（個別 prop 可覆寫）；個別訊息 / 驗證交給群組（子元件**不建立** child-level 驗證、**不暴露** `validate()` / `reset()`，避免回傳無意義且誤導的驗證結果）。
- **停用**：`--radio-color` 轉灰、input `disabled`、cursor `not-allowed`。

---

## 5. A11y

- 原生 `<input type="radio">` 提供完整鍵盤 / 表單語意；視覺以自繪 `__circle` 呈現，input 採 sr-only（非 `display:none`，保留可聚焦 / 可點 / 表單送出 / 方向鍵巡覽）。
- `<label>` 包住 input，點標籤即選取、SR 朗讀標籤。
- 同 `name` 的原生 radio 自動形成單選群，可用方向鍵巡覽並移動選取（群組模式由 BaseRadioGroup 廣播共用 `name`）。
- 有訊息時 input 綁 `aria-describedby` 指向訊息區（`aria-live="polite"` + `aria-atomic="true"`，且以 `v-show` 常駐 DOM 而非 `v-if`，確保動態出現 / 變動的訊息整段被朗讀，對齊 `BaseFormField`）、錯誤時 `aria-invalid`。
- 鍵盤聚焦於 `__circle` 顯示 `outline`（`:focus-visible`）。

---

## 6. 驗證（rules）

獨立模式傳入 `rules`（規則陣列）即啟用，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。採 **touched-gated**：`change` 或 `blur` 後才顯示，之後即時重驗。`error` 為 `props.error || 驗證失敗`；`message` 驗證錯誤優先、否則退回 `props.message`。

> 多個 radio 的「必選一項」請在 [`BaseRadioGroup`](./BaseRadioGroup.md) 設 `rules`（套在群組選取值上），而非逐一在子 radio 設規則。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const value = ref<string>()
const rules: ValidationRule<string | undefined>[] = [(v) => v != null || '此選項為必選']
</script>

<template>
  <BaseRadio v-model="value" value="agree" label="我已閱讀並同意" :rules="rules" />
</template>
```

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `inject` context 後用 `context.modelValue.value = v` 直接回寫共享 ref | 子元件改父狀態、且 `modelValue` 型別為 `any` | 群組以 `select(value)` 方法 + provide/inject 注入；獨立模式用 `defineModel`，型別安全 |
| 2 | `marge()`（typo）逐一 `props[key] ?? context.props[key]` 合併 | 手寫合併、型別鬆散 | `computed` 直接讀 `props.x ?? group?.x.value`，集中且具型別 |
| 3 | 依賴 `AtomicFormLabelField`（另一套 field 包裝） | 多一個欄位包裝元件 | BaseRadio 自渲染 inline `<label>`；群組標籤 / 訊息複用既有 `BaseFormField` |
| 4 | 全域 `$color-map` / `@include sr-only` | 強綁全域 SCSS | scoped + 自宣告 `--radio-*` token + 自寫 sr-only |
| 5 | 兩段完整 SVG（picked / unpicked，互相 `display:none`） | 體積較大、難主題化、無過場 | 以 CSS 圓圈 + `scale()` 內點，顏色走 `--radio-color`、含過場與 reduced-motion |
| 6 | `modelValue: any` | 失去型別 | 泛型 `Value`（預設 `string \| number`） |
| 7 | 無驗證 | 與庫內表單元件不一致 | 整合 `useValidation` + `rules`（獨立模式）+ `validate()` / `reset()` |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseRadio.spec.ts`（渲染 / slot 標籤 / color / labelPlacement class、label 點擊選取、v-model（`model === value` 為選中）、select 發 value、change 事件、disabled、rules touched-gated / `validate()` / `reset()`）
- [x] **Storybook**：`stories/components/atoms/BaseRadio.stories.ts`（Playground / States / LabelPlacement / Colors / Validation / Themed）
