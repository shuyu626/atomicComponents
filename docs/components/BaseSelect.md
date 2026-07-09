# Select 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseSelect.vue`）。
> **配套**：`docs/components/BaseFormField.md`（欄位容器）、`docs/components/BasePopover.md`（浮層）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseSelect 是 **下拉選擇控制項**：包在 [`BaseFormField`](./BaseFormField.md) 內，補上 `role="combobox"` 控制項與 `role="listbox"` 浮層，支援**單選 / 多選（Array 或 Set）/ 可搜尋（filterable）**。欄位語意（`label` / `message` / `error` / `required`…）透過 `useFormFieldProps` 一鍵轉發給 BaseFormField；狀態色（邊框 / focus / error / disabled）全部讀 `--field-*` token，不自帶一套狀態邏輯。

浮層的**定位、focus-trap、Esc 關閉、點擊外部關閉**全部委派給 [`BasePopover`](./BasePopover.md)（內部用 `@floating-ui/vue`）；元件本身只負責選取邏輯、鍵盤導覽與顯示。v-model 採 `defineModel()`，原生處理受控 / 非受控；驗證整合 [`useValidation`](../../app/composables/useValidation.ts)。

> 本元件改寫自 Mini-ghost/16th-ithelp-vue-components 的 [`AtomicSelect`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicSelect.vue)（及其 `useControlled` / `AtomicPopover` / `dom` utils），並針對本專案規範做了修正與優化（見 §7）。

---

## 1. Props

BaseSelect 額外的控制項 props，加上**全部** [`BaseFormField` 的欄位 props](./BaseFormField.md#1-props)（`id` / `label` / `labelPlacement` / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly`，會自動轉發）。元件為**泛型** `BaseSelect<T>`，`T` 為選項值型別（預設 `string | number`）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `T \| T[] \| Set<T>` | — | 單選綁 `T`；多選綁 `T[]` 或 `Set<T>` |
| `options` | `BaseSelectOption<T>[]` | — | 選項清單 `{ value, label, disabled? }` |
| `placeholder` | `string` | — | 未選取時的提示文字 |
| `name` | `string` | — | 原生 `name`（送出表單用；以隱藏 `<input type="hidden">` 提交序列化後的「值」） |
| `multiple` | `boolean` | `false` | 多選；v-model 綁 `Array` 或 `Set`（依傳入值型別沿用） |
| `filterable` | `boolean` | `false` | 可搜尋（點開後**浮層上方為搜尋欄、下方為選項**，依 `label` 即時過濾） |
| `searchPlaceholder` | `string` | `'搜尋'` | `filterable` 時搜尋框的 placeholder |
| `clearable` | `boolean` | `true` | 有選取時顯示叉叉清除鈕（hover / focus 控制項才顯形） |
| `clearLabel` | `string` | `'清除'` | 清除鈕的 `aria-label`（i18n 覆寫點） |
| `chips` | `boolean` | `false` | 多選時以可刪除的 chip 顯示已選項（取代逗號文字）；單選無效。複用 [`BaseChip`](./BaseChip.md) |
| `removeLabel` | `string \| ((label: string) => string)` | `` (label) => `移除 ${label}` `` | chip 刪除鈕的 `aria-label`（i18n 覆寫點）：字串原樣 / 函式接收該項 `label` |
| `maxCollapseTags` | `number` | `0` | chips 模式顯示上限：已選數超過時只顯示前 N 顆可刪除 chip，其餘收斂成一顆不可刪除的 `+N`（被收斂項 label 放入原生 `title`），避免多選過多時輸入框高度膨脹破版。僅 `multiple` + `chips` 生效；`0` 不限制 |
| `placement` | `BasePopoverPlacement` | `'bottom-start'` | 浮層位置（空間不足時 `flip` / `shift` 自動調整） |
| `emptyText` | `string` | `'查無選項'` | 無選項時的提示（可用 `#empty` slot 覆寫） |
| `rules` | `ValidationRule<T \| T[] \| Set<T> \| undefined>[]` | — | 驗證規則陣列；touched-gated。見 §6 |

**`BaseSelectOption<T>`**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `value` | `T` | 綁定值 |
| `label` | `string` | 顯示文字 |
| `disabled` | `boolean?` | 是否停用（不可選、不參與鍵盤導覽） |

**Methods（透過模板 ref 取得）**

| Method | 回傳 | 說明 |
|---|---|---|
| `validate()` | `boolean` | 強制驗證（即使尚未 touch 也顯示錯誤）；回傳是否通過 |
| `reset()` | `void` | 清掉驗證錯誤顯示（不動值） |

**Slots**

| Slot | Scoped props | 說明 |
|---|---|---|
| `#label` | — | 標籤內容，取代 `label` prop |
| `#prepend` | — | 控制項前綴內容 |
| `#display` | `selected` | 自訂選取後的顯示（`selected` 單選為選項物件、多選為陣列） |
| `#option` | `value`, `label`, `selected`, `index` | 自訂單一選項渲染（內建打勾仍顯示在最後方） |
| `#empty` | — | 無選項時的內容，取代 `emptyText` |
| `#message` | `error`, `message` | 訊息內容，取代 `message` prop |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `update:modelValue` | `T \| T[] \| Set<T>` | v-model（由 `defineModel` 自動處理，無需手動 emit） |

---

## 2. CSS 客製化（token）

BaseSelect **不另立 token**，外觀沿用 BaseFormField 的 [`--field-*` token](./BaseFormField.md#2-css-客製化token)。`__control` 讀 `--field-color`（邊框）、`--field-active-color`（hover / focus / 已選項色）、`--field-radius`（圓角）、`--field-height`（高度）、`--field-background`（背景），覆寫即可主題化：

```vue
<template>
  <BaseSelect class="dense-select" label="水果" :options="options" />
</template>

<style scoped>
.dense-select {
  --field-height: 44px;
  --field-active-color: #db2777;
  --field-radius: 10px;
}
</style>
```

focus 採「邊框轉 active 色 + 同色柔光 ring（box-shadow，以 `color-mix` 取 `--field-active-color` 22%）」的單一視覺，僅在**鍵盤聚焦**（`:focus-visible` / 內部 searchbox `:focus-visible`）時出現，error 狀態下自動轉紅；並保留透明 `outline` 作為 forced-colors（高對比）模式的焦點後備。浮層本身的外觀（陰影 / 圓角 / z-index）由 BasePopover 的 `--popover-*` token 控制。

**浮層內容 token（`--select-*`）**：選項清單與搜尋欄的視覺對齊 [`BaseDropdown`](./BaseDropdown.md)（accent 高亮、滿版 bleed）。因浮層被 teleport 到 `<body>`、與控制項不在同一 DOM 子樹，`--field-*` 不會跨樹繼承，故這組 token **定義在 `.base-select__panel` 上**：

| Token | 預設 | 說明 |
|---|---|---|
| `--select-accent` | `#1d4ed8` | 主色（選中 / 游標 / 打勾 的色相來源，對齊 BaseDropdown `--dropdown-accent`） |
| `--select-item-cursor-bg` | `color-mix(accent 8%)` | hover / 鍵盤游標底色（較淡；用 `:hover` + `:focus-visible`，滑鼠點擊取消後不殘留） |
| `--select-item-selected-bg` | `color-mix(accent 16%)` | 已選項底色（較深，搭配打勾）；已選+游標並存時再加深至 24% |
| `--select-item-highlight-color` | `var(--select-accent)` | 已選項的文字 / 打勾色 |
| `--select-item-padding` | `0.5rem 0.75rem` | 選項內距 |
| `--select-max-height` | `16rem` | 選單最大高度（超出捲動） |
| `--select-bleed-x` | `0.75rem` | 抵銷 BasePopover 水平內距，讓高亮 / 分隔線滿版貼齊浮層左右緣 |

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { BaseSelectOption } from '~/components/atoms/BaseSelect.vue'

const fruits: BaseSelectOption<string>[] = [
  { label: '蘋果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '芒果（缺貨）', value: 'mango', disabled: true },
]

const single = ref<string>()
const multi = ref<string[]>([])
const multiSet = ref<Set<string>>(new Set())
const city = ref<string>()
</script>

<template>
  <!-- 單選 -->
  <BaseSelect v-model="single" :options="fruits" label="水果" label-placement="top" placeholder="請選擇" />

  <!-- 多選（Array） -->
  <BaseSelect v-model="multi" :options="fruits" multiple label="多選" placeholder="可複選" />

  <!-- 多選（Set） -->
  <BaseSelect v-model="multiSet" :options="fruits" multiple label="Set 多選" />

  <!-- 可搜尋 -->
  <BaseSelect v-model="city" :options="fruits" filterable label="搜尋" empty-text="找不到結果" />
</template>
```

---

## 4. 行為與狀態

- **內容優先序**：`#label` slot > `label` prop；`#message` slot > `message` prop；`#display` slot > 預設顯示；`#option` slot > 預設選項；`#empty` slot > `emptyText`。
- **受控 / 非受控**：由 `defineModel` 原生處理——父層綁 `v-model` 即受控；未綁時元件自留內部狀態。
- **單選**：點選項（或鍵盤 Enter）即更新 v-model 並**關閉**浮層。
- **多選**：點選項 toggle 累加 / 移除，浮層**保持開啟**；顯示區預設以 `, ` 串接已選 label。
  - **容器型別沿用**：v-model 傳入 `Set` → 維持 Set（Set 進 Set 出）；否則用 `Array`。切換時一律**整體取代**（`new Set(...)` / 新陣列），不深層 mutate，確保響應式更新（對齊 component-architecture 規範）。
  - **chip 顯示**：`chips` 開啟時，已選項改在控制項內以可刪除的 [`BaseChip`](./BaseChip.md) 呈現（chip 多時自動換行、控制項高度自動成長）。每個 chip 的 × 透過 BaseChip 的 `delete` 事件單獨移除該值（`stopPropagation` 後移除，不連帶開合浮層）；維持原容器型別。`chips` 僅多選有效，且自訂 `#display` slot 時以 slot 為準。
- **選中打勾**：選取的選項會在**最後方**顯示打勾圖示（`.base-select__check`）；自訂 `#option` slot 時打勾仍會附加在 label 之後。
- **清除（clearable）**：`clearable`（預設 `true`）時，有選取就會在控制項右側出現叉叉鈕（hover / focus 控制項才顯形，且**可鍵盤 Tab 聚焦操作**）。點擊清除：單選回 `undefined`、多選回空 `Array` / 空 `Set`（依原容器型別）。清除鈕 `@click.stop` 不會連帶開合浮層、`@mousedown.prevent` 不搶焦點（滑鼠清除後焦點仍在控制項）。
- **filterable**：點開後**浮層上方為搜尋欄、下方為選項清單**（搜尋欄不在控制項內，控制項持續顯示已選 / placeholder）。依 `label` 不分大小寫 `includes` 即時過濾。**開啟時不預先高亮任何項**（避免出現「無故較深的一列」）——待使用者輸入或按方向鍵，作用中項（`aria-activedescendant`）才出現；輸入過濾時作用中項自動移到第一個符合的非停用項，方便 Enter 直接選取。開啟時自動聚焦搜尋欄、關閉時清空搜尋字串。
- **停用**：整體 `disabled` / `readonly` 時不可開啟浮層、不顯示清除鈕；個別 `option.disabled` 不可選、鍵盤導覽自動跳過。
- **狀態傳遞**：`error` / `disabled` 由 BaseFormField 改寫 `--field-*` token，`__control` 自動跟著變色；`invalid` / `required` / `describedby` 經 scoped slot props 綁到可聚焦的 **combobox** `aria-*`（名稱用 `aria-labelledby`），`disabled` 另傳給隱藏的表單 input。

### 鍵盤操作

| 情境 | 按鍵 | 行為 |
|---|---|---|
| 非 filterable（焦點在選項） | `↑` / `↓` | 上 / 下一個選項（roving focus，跳過停用、繞回頭尾） |
| | `Home` / `End` | 第一個 / 最後一個選項 |
| | `Enter` / `Space` | 選取目前聚焦選項 |
| | `Esc` / `Tab` | 關閉浮層 |
| filterable（焦點在 searchbox） | `↑` / `↓` | 移動作用中項（`aria-activedescendant`，跳過停用、繞回） |
| | `Home` / `End` | 第一個 / 最後一個可選項 |
| | `Enter` | 選取作用中項 |
| | `Esc` / `Tab` | 關閉浮層 |

> 非 filterable 的方向鍵導覽複用本庫 [`utils/dom`](../../app/utils/dom.ts) 的 `moveFocus` / `nextItem` / `previousItem`（與 BaseDropdown 同一套 roving 邏輯）；filterable 則維持焦點在輸入框、用 `aria-activedescendant` 指示作用中項（符合 WAI-ARIA combobox 模式）。

---

## 5. A11y

- **combobox / listbox**：控制項 `role="combobox"`，浮層內 `<ul role="listbox">`（id 為 `${uid}-listbox`），選項 `role="option"` + `aria-selected`；多選 listbox 標 `aria-multiselectable`。
- **展開狀態**：BasePopover 自動為控制項掛 `aria-expanded`（開合）。箭頭隨 `aria-expanded` 翻轉。
- **listbox 關聯**：控制項**自行**以指令明確設定 `aria-haspopup="listbox"`，並在展開時把 `aria-controls` 指向實際的 listbox `<ul>`（`${uid}-listbox`）、收合時移除。因 BasePopover 會透過 fallthrough 帶下泛用的 `aria-haspopup="true"` 與指向浮層容器的 `aria-controls`，而 fallthrough 屬性在合併時會覆蓋模板綁定，故改在 patch 之後以指令寫入，確保**以控制項自身明確設定為準**（指向真正的 listbox，而非浮層容器）。
- **狀態與名稱掛在可聚焦的 combobox 上**：鍵盤焦點落在 `role="combobox"` 的 `<div>`，故 `aria-describedby` / `aria-invalid` / `aria-required` 直接掛在 combobox div。名稱則用 **`aria-labelledby`** 指向 BaseFormField 的 `<label>` 元素（BaseFormField 透過 default slot 的 `labelledby` 傳入）——單一名稱來源、不產生重複的隱藏控制項，且 `#label` slot 自訂標籤時同樣有效。
- **表單送出**：以 `<input type="hidden">`（不可聚焦、不入 a11y tree）送出 `name` 對應的**序列化值**（單選為值、多選逗號串接各值），而非顯示用的 label。
- **作用中項**：filterable 時 searchbox 綁 `aria-activedescendant` 指向作用中選項 id，SR 能朗讀目前高亮項而不移動實體焦點。
- **錯誤 / 必填 / 描述**：`error` → combobox `aria-invalid`；`required` → 視覺星號 + `aria-required`；有訊息時綁 `aria-describedby` 指向訊息區（`aria-live="polite"`）。
- **停用選項**：`option.disabled` → `aria-disabled="true"`，鍵盤導覽與點擊皆略過。

---

## 6. 驗證（rules）

傳入 `rules`（規則陣列）即啟用驗證；每條規則是純函式，回傳 `true`（通過）或字串（錯誤訊息）。驗證邏輯抽在 [`useValidation`](../../app/composables/useValidation.ts)，規則 helper 放 [`~/utils/validators`](../../app/utils/validators.ts)。

**觸發時機（touched-gated）**：**浮層第一次關閉**（等同失焦）後才開始顯示錯誤；此後值一變動就即時重驗。多條規則時顯示**第一條失敗**的訊息。

**與 `error` / `message` prop 的合併**：

- `error`：`props.error || 驗證失敗` 任一為真即錯誤——父層仍可用 `error` prop 強制錯誤（如 server 端驗證）。
- `message`：**驗證錯誤訊息優先**；無驗證錯誤時退回 `props.message` 靜態提示。

```vue
<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import { required } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

const fruit = ref<string>()
const rules: ValidationRule<string | string[] | Set<string> | undefined>[] = [required('請選擇一個水果')]

const field = useTemplateRef('field')
function onSubmit() {
  if (!field.value?.validate()) return
  // …送出
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <BaseSelect ref="field" v-model="fruit" :options="options" label="水果" :rules="rules" />
  </form>
</template>
```

> **多選必填**：`required` 對非空陣列 / 非空 Set 會通過、對空陣列需注意——若要「多選至少一項」，建議自訂規則（如 `(v) => (Array.isArray(v) ? v.length > 0 : (v as Set<unknown>)?.size > 0) || '至少選一項'`）。目前僅支援**同步**規則。

---

## 7. 對參考實作的修正與優化

| # | 參考實作 | 問題 | 本元件作法 |
|---|---|---|---|
| 1 | `modelValue: any` / `options: any` / 大量 `any` | 失去型別安全，違反 strict mode「禁止 any」 | 改為**泛型** `BaseSelect<T>`，`options` / v-model / slot props 全程型別安全 |
| 2 | `useControlled` + 手寫 `modelValueLocal` / `modelValueWritable` + 手動 `emit` | 一整套受控樣板，`defineModel` 已原生提供 | 改用 `defineModel()`（符合「Vue 3.4+ MUST 用 defineModel」規範），移除 `useControlled` 相依 |
| 3 | 自建 popover（`AtomicPopover`）、自行管理 Esc / 點外關閉 / 定位 | 與本庫既有 `BasePopover` 重複 | 直接複用 `BasePopover`（`@floating-ui/vue` 定位、focus-trap、Esc、點外關閉、`auto-fit`），元件只管選取邏輯 |
| 4 | `isSet` 為外部相依 | 本庫沒有此 util | 新增零依賴的 `app/utils/isSet.ts`（`instanceof Set` type guard）+ 單元測試 |
| 5 | 依賴外部 `ArrowSvg` 資產（`~/assets/svg/arrow.svg`） | 強綁未必存在的資產 | 內聯 `<svg>`（標 `aria-hidden` / `focusable=false`），元件自包含 |
| 6 | 全域 `<style>`、依賴全域 SCSS `$color-map` / sr-only mixin | 樣式外洩、強綁外部 SCSS | `scoped` + 沿用 BaseFormField 的 `--field-*` token，元件自包含 |
| 7 | 無驗證能力 | 與 BaseTextField / BaseTextarea 不一致 | 整合 `useValidation` + `rules` prop + `validate()` / `reset()` expose（浮層關閉時 touch） |
| 8 | 多選 toggle 後直接 `current.has` 等讀寫，Set 分支與 Array 分支邏輯交纏 | 可讀性低、易出錯 | 抽 `isSelected()` / `selectOption()`，Set 一律 `new Set(...)` 整體取代（不深層 mutate），符合響應式規範 |
| 9 | `scrollIntoView` 直接呼叫 | 測試 / SSR 等無此 API 的環境會丟錯 | 加 `typeof el.scrollIntoView === 'function'` 守衛 |
| 10 | filterable 的 searchbox 內嵌在控制項內、選取後切換顯示 / 輸入框 | 控制項同時兼具顯示與輸入、版面在開合時跳動 | 搜尋欄改放**浮層上方**、選項在下方；控制項持續顯示已選 / placeholder，版面穩定（對齊常見 select 體驗） |
| 11 | 無清除機制 | 選錯只能再開選單反選 | 新增 `clearable`（叉叉清除，hover 顯形、可鍵盤聚焦）；單選清 `undefined`、多選清空容器 |
| 12 | 選中項僅靠底色 / 粗體區分 | 多選 / 掃視時不夠明確 | 選中項最後方加打勾圖示；整體選項視覺對齊 BaseDropdown 的 accent 高亮系統 |
| 13 | combobox 無可存取名稱、`aria-*` 狀態掛在隱藏代理 input（焦點落 combobox 念不到） | SR focus mode 缺名稱 / 狀態 | combobox 改用 `aria-labelledby`（BaseFormField 暴露 `labelledby` slot prop 指向 `<label>`）；`aria-invalid` / `aria-required` / `aria-describedby` 移到 combobox |
| 14 | 表單值送出顯示 label（逗號串接文字） | 原生送表單拿到 label 而非值 | 改用 `<input type="hidden">` 送**序列化值**；移除可聚焦的代理 input（不再污染 a11y tree） |
| 15 | 多選 Array 以 `.includes` 逐項判斷選取（O(n²)） | 大量選項效能差 | 內部用 `selectedValues` Set，`isSelected` 改 O(1) |
| 16 | 多選只有逗號文字顯示 | 已選多時不易辨識 / 難單獨移除 | 新增 `chips` 模式，複用既有 `BaseChip`（`deletable` + `delete` 事件）在控制項內顯示可單獨移除的 chip |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseSelect.spec.ts`（渲染 combobox / 浮層 teleport / `aria-expanded`、單選選取 / 顯示 / `aria-selected` / 關閉、多選 Array toggle 累加移除 / 顯示串接 / 保持開啟、多選 Set 容器維持、整體 disabled 不開 / 停用選項不可選、**filterable 搜尋欄在浮層上方 / 過濾 / emptyText / `aria-activedescendant` + Enter 選取 / 選項以 value 為 key 過濾不錯位重用節點**、鍵盤 roving 導覽 / Enter / Esc / Tab、**clearable 單選 / 多選 Array / 多選 Set 清除 / 不開合浮層 / disabled 隱藏 / `clearable=false` / 可鍵盤聚焦**、**chips 多選顯示 / 單獨移除 / 維持 Set / 不開合浮層 / 空顯 placeholder / 單選不啟用 / chip size `sm`**、**選中打勾**、**a11y（`aria-labelledby` 取名 / `aria-required` / `aria-invalid` / `aria-haspopup="listbox"` + 展開時 `aria-controls` 指向 listbox `<ul>`）與表單（hidden input 送序列化值、不渲染代理 input）**、驗證 touched-gated / 關閉 touch / `validate()` / `reset()`、`#option` / `#display` / `#empty` slot）
- [x] **Vitest**：`tests/utils/isSet.spec.ts`（Set / WeakSet / Array / Map / 物件 / null / undefined / 原始值）
- [x] **Storybook**：`stories/components/atoms/BaseSelect.stories.ts`（Playground / Single / Multiple / Chips / MultipleSet / Filterable / Clearable / States / CustomSlots / Validation / Themed）
