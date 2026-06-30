# RadioGroup 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseRadioGroup.vue`）。
> **配套**：`docs/components/BaseRadio.md`（成員）、`docs/components/BaseFormField.md`（欄位容器）。

BaseRadioGroup 管理一組 [`BaseRadio`](./BaseRadio.md)：`v-model` 綁**單一值**，透過 **provide/inject** 廣播 `name` / `color` / `disabled` 給子圈，並複用 [`BaseFormField`](./BaseFormField.md) 呈現群組標籤、訊息與驗證（如「必選一項」）；容器標 `role="radiogroup"` 並接上 BaseFormField 的 `aria-labelledby` / `aria-describedby`。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicRadioGroup`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicRadioGroup.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

元件為**泛型** `BaseRadioGroup<Value>`（`Value` 預設 `string | number`），並繼承**全部** [`BaseFormField` 欄位 props](./BaseFormField.md#1-props)（`label` / `labelPlacement`(left/top) / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly` / `id`，會轉發給 BaseFormField）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `Value` | — | 目前選取的單一值 |
| `name` | `string` | 自動產生 | 廣播給所有子圈的 name；未指定時自動產生（仍能讓原生 radio 同組巡覽） |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | — | 廣播給子圈的選取色（子圈可自行覆寫） |
| `disabled` | `boolean` | `false` | 整組停用（廣播給子圈） |
| `rules` | `ValidationRule<Value \| undefined>[]` | — | 套在選取值上（如「必選」）；touched 於每次 select。見 §5 |

**Methods（模板 ref）**：`validate()` → `boolean`、`reset()` → `void`。

**Slots**：`#default`（放 BaseRadio）、`#label`、`#message`（scoped：`error`、`message`）。

**Emits**：`update:modelValue`（defineModel）。

---

## 2. 提供的 context（provide / inject）

群組以 `BASE_RADIO_GROUP_INJECT_KEY`（自 `BaseRadioGroup.vue` 匯出）provide：

```ts
interface BaseRadioGroupContext<Value> {
  isSelected: (value: Value) => boolean   // model === value
  select: (value: Value) => void          // 設為選取並 touch 驗證（單選、無法取消）
  touch: () => void                       // 標記群組碰過（子圈失焦時呼叫，未選離開也顯示錯誤）
  name: ComputedRef<string | undefined>   // 含自動 fallback
  color: ComputedRef<BaseRadioColor | undefined>
  disabled: ComputedRef<boolean>
}
```

BaseRadio `inject` 此 key 後即進入群組模式。與參考實作以「子元件回寫共享 ref」不同，本作法對齊 BaseCheckboxGroup / BaseAccordion / BaseTabs 的 provide/inject 慣例，型別安全且狀態更新集中於群組。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const plan = ref('pro')
const plans = [
  { value: 'free', label: '免費' },
  { value: 'pro', label: '專業' },
  { value: 'team', label: '團隊' },
]
</script>

<template>
  <BaseRadioGroup v-model="plan" label="選擇方案" label-placement="top" color="success">
    <BaseRadio v-for="p in plans" :key="p.value" :value="p.value" :label="p.label" />
  </BaseRadioGroup>
</template>
```

---

## 4. 行為與狀態

- **單選**：`v-model` 為單一值；`select(value)` 直接整體取代，radio 無法靠點擊取消（只能改選別項）。
- **共用 name**：群組一律廣播 `name`（未指定則自動產生 `radio-group-{useId}`），確保原生 radio 同組可用**方向鍵巡覽並移動選取**——這是 radio 相對 checkbox 的關鍵 a11y 行為。
- **廣播**：`name` / `color` / `disabled` 經 provide 傳給子圈；子圈未指定時繼承，指定則覆寫。
- **版面**：子圈以 `flex-wrap` 橫向排列（`gap: 8px 16px`），可用 CSS 覆寫成直向。
- **a11y**：子圈容器標 `role="radiogroup"`，並接上 BaseFormField 的 `aria-labelledby`（指向群組標籤）與 `aria-describedby`（指向訊息區）；群組標籤、`aria-live` 訊息由 BaseFormField 提供。錯誤狀態（`error` prop 或驗證失敗）時，群組容器補 `aria-invalid="true"`（不只靠視覺色傳達），非錯誤時省略該屬性。

---

## 5. 驗證（rules）

`rules` 套在**選取值**上，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。觸發 `touch`（碰過）有兩個時機：**選取任一項後**，或**子圈失焦離開群組後**（子圈 blur 透過 context 的 `touch()` 標記群組）——因此使用者 Tab 進群組未選就離開也會顯示錯誤；touched 後即時顯示。常見「必選一項」：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const value = ref<string>()
const rules: ValidationRule<string | undefined>[] = [(v) => v != null || '請選擇一個方案']
</script>

<template>
  <BaseRadioGroup v-model="value" label="方案" required :rules="rules">
    <BaseRadio value="free" label="免費" />
    <BaseRadio value="pro" label="專業" />
  </BaseRadioGroup>
</template>
```

`error` / `message` 與驗證合併規則同其他表單元件（驗證錯誤優先；`props.error` 可強制錯誤）。父層可用模板 ref 呼叫 `validate()`（submit 時）。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` | 受控樣板，`defineModel` 已原生提供 | 改用 `defineModel`（免額外受控判斷） |
| 2 | provide 整包 `props` 與共享 ref，子元件回寫 `modelValue.value` | 子改父狀態、無 select 語意、無自動 name | provide 明確的 `select` / `isSelected` 方法 + 自動 fallback `name`，狀態更新集中、原生巡覽可用 |
| 3 | `modelValue: any` | 失去型別 | 泛型 `Value`（預設 `string \| number`） |
| 4 | `template` 僅 `<slot />`，無欄位容器 | 群組層標籤 / 訊息 / role 缺位 | 複用 `BaseFormField` 呈現群組標籤、`aria-live` 訊息、必填星號，容器標 `role="radiogroup"` + `aria-labelledby` |
| 5 | 無驗證 | 無法表達「必選一項」 | 整合 `useValidation` + `rules`（選取值層）+ `validate()` / `reset()` |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseRadioGroup.spec.ts`（slot 子圈渲染、modelValue 反映子圈選取、select 設值、再選取代前次（單選）、自動 / 顯式 `name` 廣播、`disabled` / `color` 廣播、`role="radiogroup"`、群組 rules「必選一項」/ `validate()` / `reset()`、BaseFormField 標籤呈現、**群組容器 `aria-invalid`（error / 驗證失敗時為 true、無錯誤時省略）**、per-child color 覆寫）
- [x] **Storybook**：`stories/components/atoms/BaseRadioGroup.stories.ts`（Playground / Disabled / Validation）
