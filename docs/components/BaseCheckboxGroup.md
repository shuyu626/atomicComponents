# CheckboxGroup 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseCheckboxGroup.vue`）。
> **配套**：`docs/components/BaseCheckbox.md`（成員）、`docs/components/BaseFormField.md`（欄位容器）。

BaseCheckboxGroup 管理一組 [`BaseCheckbox`](./BaseCheckbox.md)：`v-model` 綁**陣列或 Set**，透過 **provide/inject** 廣播 `name` / `color` / `disabled` 給子框，並複用 [`BaseFormField`](./BaseFormField.md) 呈現群組標籤、訊息與驗證（如「至少選一項」）。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicCheckboxGroup`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicCheckboxGroup.vue)，並針對本專案規範做了修正與優化（見 §6）。

---

## 1. Props

元件為**泛型** `BaseCheckboxGroup<Value>`，並繼承**全部** [`BaseFormField` 欄位 props](./BaseFormField.md#1-props)（`label` / `labelPlacement`(left/top) / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `id`，會轉發給 BaseFormField）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `Value[] \| Set<Value>` | `[]` | 已勾選值集合（Set 進 Set 出，整體取代不深層 mutate） |
| `name` | `string` | — | 廣播給所有子框的 name |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | — | 廣播給子框的勾選色（子框可自行覆寫） |
| `disabled` | `boolean` | `false` | 整組停用（廣播給子框） |
| `rules` | `ValidationRule<Value[] \| Set<Value>>[]` | — | 套在整個集合上（如「至少選一項」）；touched 於每次 toggle。見 §5 |

**Methods（模板 ref）**：`validate()` → `boolean`、`reset()` → `void`。

**Slots**：`#default`（放 BaseCheckbox）、`#label`、`#message`（scoped：`error`、`message`）。

**Emits**：`update:modelValue`（defineModel）。

---

## 2. 提供的 context（provide / inject）

群組以 `BASE_CHECKBOX_GROUP_INJECT_KEY`（自 `BaseCheckboxGroup.vue` 匯出）provide：

```ts
interface BaseCheckboxGroupContext<Value> {
  isSelected: (value: Value) => boolean   // 封裝 Array / Set 判斷
  toggle: (value: Value) => void          // 加入 / 移除並 touch 驗證
  touch: () => void                       // 標記群組碰過（子框失焦時呼叫）
  name: ComputedRef<string | undefined>
  color: ComputedRef<BaseCheckboxColor | undefined>
  disabled: ComputedRef<boolean>
}
```

BaseCheckbox `inject` 此 key 後即進入群組模式。與參考實作用 `cloneVNode` 注入 props 不同，本作法對齊 BaseAccordion / BaseTabs 的 provide/inject 慣例，型別安全且不依賴 VNode 操作。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
const selected = ref<string[]>(['banana'])
const fruits = [
  { value: 'apple', label: '蘋果' },
  { value: 'banana', label: '香蕉' },
  { value: 'cherry', label: '櫻桃' },
]
</script>

<template>
  <BaseCheckboxGroup v-model="selected" label="選擇水果" label-placement="top" color="success">
    <BaseCheckbox v-for="f in fruits" :key="f.value" :value="f.value" :label="f.label" />
  </BaseCheckboxGroup>
</template>
```

---

## 4. 行為與狀態

- **容器型別沿用**：`v-model` 傳入 `Set` → 維持 Set（Set 進 Set 出）；否則用 `Array`。toggle 一律**整體取代**（`new Set(...)` / 新陣列），不深層 mutate（對齊 component-architecture 規範）。
- **廣播**：`name` / `color` / `disabled` 經 provide 傳給子框；子框未指定時繼承，指定則覆寫。
- **版面**：子框以 `flex-wrap` 橫向排列（`gap: 8px 16px`），可用 CSS 覆寫成直向。
- **a11y**：子框容器標 `role="group"`，並接上 BaseFormField 的 `aria-describedby`（指向訊息區）；群組標籤、`aria-live` 訊息由 BaseFormField 提供。

---

## 5. 驗證（rules）

`rules` 套在**整個集合**上，邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)。觸發 `touch`（碰過）有兩個時機：**每次 toggle 後**，或**子框失焦離開群組後**（子框 blur 透過 context 的 `touch()` 標記群組）；touched 後即時顯示。常見「至少選一項」：

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { ValidationRule } from '~/utils/validators'
const value = ref<string[]>([])
const rules: ValidationRule<string[] | Set<string>>[] = [
  (v) => (Array.isArray(v) ? v.length > 0 : v.size > 0) || '請至少選擇一項',
]
</script>

<template>
  <BaseCheckboxGroup v-model="value" label="興趣" required :rules="rules">
    <BaseCheckbox value="a" label="A" />
    <BaseCheckbox value="b" label="B" />
  </BaseCheckboxGroup>
</template>
```

`error` / `message` 與驗證合併規則同其他表單元件（驗證錯誤優先；`props.error` 可強制錯誤）。父層可用模板 ref 呼叫 `validate()`（submit 時）。

---

## 6. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | 以 `cloneVNode` + `resolveSlotChildren` 複製子節點注入 `modelValue` / `onUpdate` | 依賴 VNode 操作、脆弱、型別為 `any` | 改用 **provide/inject**（對齊 BaseAccordion / BaseTabs），型別安全、子框自取 context |
| 2 | `modelValue: any[]` | 失去型別、且不支援 Set | 泛型 `Value[] \| Set<Value>`（對齊 BaseSelect 多選） |
| 3 | 無欄位容器（標籤 / 訊息靠子框各自處理） | 群組層標籤 / 驗證缺位 | 複用 `BaseFormField` 呈現群組標籤、`aria-live` 訊息與必填星號 |
| 4 | 無驗證 | 無法表達「至少選一項」 | 整合 `useValidation` + `rules`（集合層）+ `validate()` / `reset()` |

---

## 7. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseCheckboxGroup.spec.ts`（slot 子框渲染、modelValue 反映子框勾選、勾選加入 / 取消移除、Set 容器維持、`disabled` / `color` 廣播、群組 rules「至少選一項」/ `validate()` / `reset()`、BaseFormField 標籤呈現、per-child color 覆寫）
- [x] **Storybook**：`stories/components/atoms/BaseCheckboxGroup.stories.ts`（Playground / SetModel / Disabled / Validation）
