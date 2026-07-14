# InputNumber 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseInputNumber.vue`）。
> **配套**：`docs/components/BaseFormField.md`（欄位容器）、`docs/components/BaseTextField.md`（文字輸入）、`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseInputNumber 是 **數字步進輸入控制項**：包在 [`BaseFormField`](./BaseFormField.md) 內，以 **APG spinbutton pattern**（`type="text"` + `inputmode="decimal"` + `role="spinbutton"`，非原生 `type="number"`，理由見 §5）呈現數字輸入，附 ± 步進按鈕（可長按連發）、鍵盤步進（方向鍵 / Home / End）、min / max 夾擠與 precision 捨入。狀態色全部讀 BaseFormField 傳遞的 `--field-*` token，結構與 [BaseTextField](./BaseTextField.md) 同構。

核心設計是 **draft / commit 兩段式**：輸入中的字串（含 `-`、`1.` 等中間態）只暫存於本地 draft，**不寫 model**；blur / Enter / 步進時才 parse → clamp → 捨入 → 寫回 model（`number | null`，`null` 表空值，不使用 `NaN`）。捨入走十進位字串法（`roundToPrecision`），`0.1 + 0.2` 類浮點誤差不會外洩到 model。

---

## 1. Props

BaseInputNumber 額外的控制項 props，加上**全部** [`BaseFormField` 的欄位 props](./BaseFormField.md#1-props)（`id` / `label` / `labelPlacement` / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly`，會自動轉發）。

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `v-model` | `number \| null` | — | 數值；`null` 表空值（清空輸入框），不使用 `NaN` |
| `min` | `number` | — | 最小值；commit 時 clamp、`aria-valuemin`（僅有限值）、Home 跳至此 |
| `max` | `number` | — | 最大值；commit 時 clamp、`aria-valuemax`（僅有限值）、End 跳至此 |
| `step` | `number` | `1` | 步進量（方向鍵 / ± 按鈕每次增減的量） |
| `precision` | `number` | — | 小數位數：顯示以 `toFixed` 格式化、commit 一律捨入到此位數。未設時鍵入值不捨入，步進由 `step` 與目前值的小數位推導有效精度 |
| `controls` | `boolean` | `true` | 顯示 ± 步進按鈕 |
| `controlsPosition` | `'both' \| 'right'` | `'right'` | 按鈕位置：± 分列兩側 / 右側上下疊排 |
| `placeholder` | `string` | — | placeholder 文字 |
| `name` | `string` | — | input `name`（送出表單 / 自動填入用） |
| `rules` | `ValidationRule<number>[]` | — | 驗證規則陣列；作用於 **commit 後的數值**（空值以 `NaN` 收斂交給 `required`）。touched-gated，見 §4 |

**Methods（透過模板 ref 取得）**

| Method | 回傳 | 說明 |
|---|---|---|
| `validate()` | `boolean` | 強制驗證（即使尚未 blur 也顯示錯誤）；回傳是否全部通過。表單 submit 時呼叫 |
| `reset()` | `void` | 清掉驗證錯誤顯示（不動值） |

**Slots**

| Slot | Scoped props | 說明 |
|---|---|---|
| `#label` | — | 標籤內容，取代 `label` prop |
| `#message` | `error`, `message` | 訊息內容，取代 `message` prop |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `update:modelValue` | `number \| null` | v-model（由 `defineModel` 自動處理，無需手動 emit） |
| `change` | `number \| null` | 值 **commit 且有變動**時觸發（blur / Enter / 步進）；輸入中間態不觸發，commit 後值未變也不觸發 |
| `focus` | `FocusEvent` | input 取得焦點時觸發 |
| `blur` | `FocusEvent` | input 失去焦點時觸發（常用於失焦驗證） |

> `focus` / `blur` 直接轉發 input 的原生事件（因元件根節點是 BaseFormField 且 focus/blur 不冒泡，故由元件顯式轉發）。

---

## 2. CSS 客製化（token）

外觀主體沿用 BaseFormField 的 [`--field-*` token](./BaseFormField.md#2-css-客製化token)（`--field-color` 邊框、`--field-active-color` hover / focus、`--field-radius` 圓角、`--field-height` 高度、`--field-background` 背景），**不另立重複 token**；自有 token 只有按鈕三件：

| Token | 預設 | 說明 |
|---|---|---|
| `--input-number-button-width` | `32px` | 步進鈕寬 |
| `--input-number-button-color` | `#6b7280` | 步進鈕圖示色 |
| `--input-number-button-hover-bg` | `#f3f4f6` | 步進鈕 hover 底色 |

```vue
<template>
  <BaseInputNumber class="dense-number" label="數量" />
</template>

<style scoped>
.dense-number {
  --field-height: 44px;
  --field-active-color: #db2777;
  --input-number-button-width: 40px;
}
</style>
```

focus 視覺與 BaseTextField 一致：「邊框轉 active 色 + 同色柔光 ring（`color-mix` 取 `--field-active-color` 22%）」，僅在鍵盤聚焦（`:has(input:focus-visible)`）時出現，error 狀態自動轉紅；保留透明 `outline` 作為 forced-colors 模式的焦點後備。預設 token 以 `:where()`（specificity 0）宣告，使用端 class 覆寫得動。

---

## 3. 基本用法

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { required } from '~/utils/validators'

const quantity = ref<number | null>(1)
const price = ref<number | null>(null)
const rate = ref<number | null>(0.5)
</script>

<template>
  <!-- 基本：min / max / step -->
  <BaseInputNumber v-model="quantity" label="數量" :min="1" :max="99" />

  <!-- 小數：step 0.1 + precision 2（顯示固定兩位、commit 捨入到兩位） -->
  <BaseInputNumber v-model="rate" label="費率" :step="0.1" :precision="2" :min="0" :max="1" />

  <!-- 按鈕右側疊排 / 無按鈕（純鍵盤輸入） -->
  <BaseInputNumber v-model="price" label="金額" controls-position="right" />
  <BaseInputNumber v-model="price" label="金額" :controls="false" placeholder="請輸入金額" />

  <!-- 驗證：required 作用於 commit 後的數值 -->
  <BaseInputNumber v-model="quantity" label="庫存" :rules="[required('請輸入庫存量')]" />
</template>
```

---

## 4. 行為與狀態

- **draft / commit 兩段式**：輸入中的字串暫存於本地 draft ref，`-`、`1.`、空字串等中間態**永不寫 model**；顯示值 draft 優先，非編輯中顯示 formatted model（`precision` 時 `toFixed`）。
- **Commit 時機與流程**（parse → clamp(min, max) → 捨入 → 寫 model → 清 draft → 有變動才 emit `change`）：

  | 觸發 | Parse 來源 | 捨入 |
  |---|---|---|
  | blur | draft 字串 | 只在 `precision` 有設時捨入（尊重使用者輸入） |
  | Enter | draft 字串 | 同 blur；**不** preventDefault（保留表單隱式送出） |
  | `ArrowUp` / `ArrowDown` | **先 commit 未定案的 draft**（鍵入 `7` 後直接按方向鍵 → 以 7 為基準得 8，不丟輸入），再以目前值 ± `step`（`null` 視為 `0` 起步再 clamp） | 恆以有效精度捨入（`precision` 優先，否則取 `step` 與目前值小數位的較大者，修 `0.1+0.2` 浮點誤差） |
  | ± 按鈕（含長按連發） | 同方向鍵 | 同方向鍵 |
  | `Home` / `End` | 直接取 `min` / `max`（僅有限值時，否則無作用） | 同步進 |

- **無法解析的輸入**（如 `abc`）：blur / Enter 時直接**還原顯示**為原 model 值，model 不變、不 emit `change`。清空輸入框則 commit `null`。
- **長按連發**：± 按鈕 pointerdown 先立即步進一次，500ms 後開始每 80ms 連發；pointerup / pointerleave / pointercancel 或元件 unmount 時停止（timer 必清）。連發途中到界（步進值不再變動）時**在 tick 內自我停止**——到界會讓按鈕轉 `disabled`，部分瀏覽器（WebKit）會抑制 disabled 元素的 pointer 事件、pointerup 不會送達，若不自停會留下 timer 孤兒。
- **邊界**：model 到達 `min` / `max` 時對應按鈕 `disabled`；commit 後值未變（如在界上再步進）不 emit `change`。
- **disabled / readonly**：input 加對應屬性、± 按鈕全 disabled、鍵盤步進無作用。
- **驗證（rules）**：作用於 **commit 後的數值**（輸入中間態不觸發驗證）；空值以 `NaN` 收斂——`validators` 的 `isEmpty` 視 `NaN` 為空，`required` 因此報錯、其餘規則自行放行空值。touched-gated：第一次 blur 後才開始即時驗證；`error` / `message` prop 的合併規則同 BaseTextField（驗證訊息優先）。
- **SSR**：`:value` 直接綁 formatted model 的 computed，server 首渲即輸出正確值；client 端同一條綁定隨 draft / model 響應更新，無 hydration 落差。

---

## 5. A11y

- **為何不用 `type="number"`**：原生 number input 有三大問題——(1) 滾輪懸停誤觸改值（使用者捲頁時意外改動數值）；(2) 接受 `e` / `E` / `+` 等科學記號字元，使用者可鍵入 `1e5` 造成混淆；(3) 無效輸入時 `value` 回空字串，程式**無法區分「空」與「輸入了無效內容」**。因此採 APG [spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/)：`<input type="text" inputmode="decimal" role="spinbutton">`，行動裝置仍叫出數字鍵盤，行為完全由元件掌控。
- **spinbutton 三件套**：`aria-valuenow` 隨 model 同步（空值時**省略**，表「無值」）；`aria-valuemin` / `aria-valuemax` 只在有限值時輸出。`aria-invalid` / `aria-required` / `aria-describedby` 由 BaseFormField scoped slot 接線。
- **± 按鈕 `tabindex="-1"` + `aria-hidden="true"`**：按鈕是**指標裝置專用 affordance**——鍵盤使用者用方向鍵步進、螢幕閱讀器使用者透過 spinbutton role 本身操作，兩顆鈕若可聚焦只會污染 Tab 序、被 AT 重複朗讀（React Spectrum [NumberField](https://react-spectrum.adobe.com/react-spectrum/NumberField.html) 同款做法）。按鈕另以 `@pointerdown.prevent` 避免點擊搶走 input 焦點。
- **不做滾輪步進**：懸停滾輪改值是 scroll hijack 反模式（捲頁誤觸、無從 undo），與捨棄 `type="number"` 的理由一致；需要快速調整請用長按連發或直接鍵入。
- **Enter 不 preventDefault**：commit 後保留表單隱式送出（單欄位表單按 Enter 直接送出），與 BaseForm 協作時「先 commit 再驗證」。
- **標籤 / 錯誤 / 必填**：`<label for>` 關聯、`aria-live="polite"` 訊息區、必填星號 + `aria-required` 皆由 BaseFormField 提供，同 BaseTextField。
- **觸控目標**：粗指標裝置下容器高度由 BaseFormField 的 coarse pointer 規則撐到 ≥ 44px，± 按鈕隨容器等高。

---

## 6. 與 BaseTextField 的分工

兩者同構（`BaseFormField v-bind="fieldProps"` + `useValidation` / `useFieldValidation` + `--field-*` token），但輸入模型不同，互補而非重疊：

| 面向 | **BaseInputNumber**（本元件） | **BaseTextField** |
|---|---|---|
| model 型別 | `number \| null`（永不吐字串 / NaN） | `string \| number` |
| 更新時機 | **commit 制**：blur / Enter / 步進才寫 model | **即時制**：逐字 `input` 就寫 model（`.lazy` 例外） |
| 中間態處理 | draft 暫存，`1.` / `-` 不外洩 | 直接進 model（字串本來就合法） |
| 數字能力 | min / max / step / precision / 步進 / 長按 | `type="number"` 僅原生行為 + `.number` 轉型 |
| 語意 | `role="spinbutton"` + aria 三件套 | 原生 text input 語意 |

**選用原則**：值的本質是**數量 / 金額 / 比率**（要步進、要範圍、要精度）→ **InputNumber**；值是**文字**（即使內容是數字，如電話、郵遞區號、卡號——不該被步進也不該去前導零）→ **TextField**（搭配 `inputmode="numeric"`）。

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | APG spinbutton（`type="text"` + `role="spinbutton"`）而非 `type="number"` | 滾輪誤觸、`e`/`E` 字元、無效值不可偵測三大原生缺陷（§5）；行為收回元件掌控 |
| 2 | draft / commit 兩段式，model 只存 `number \| null` | 中間態（`1.`、`-`）不污染 model；消費端永遠拿到乾淨數字或 `null`，不需自行 parse / 防 NaN |
| 3 | 捨入走 `roundToPrecision`（十進位字串位移）而非 `Math.round(v * 10^n) / 10^n` | 浮點乘除本身就會引入誤差（`1.005 * 100 = 100.49999…`）；字串位移全程無浮點運算 |
| 4 | 鍵入 commit 只在 `precision` 有設時捨入；步進 commit 恆捨入 | 鍵入是使用者的明確意圖（未設 precision 就尊重原值）；步進是元件的加法運算，必須修 `0.1+0.2` 誤差 |
| 5 | ± 按鈕 `tabindex=-1` + `aria-hidden` | 指標專用 affordance，鍵盤 / AT 走 spinbutton 本體；React Spectrum 同款（§5） |
| 6 | Enter 不 preventDefault | 保留表單隱式送出；BaseForm 依賴「先 commit 再驗證」的順序 |
| 7 | `change` 只在值有變動時 emit | 對齊原生 change 語意；在界上重複步進 / 還原顯示不會觸發下游副作用 |
| 8 | 長按連發 500ms / 80ms + `onUnmounted` 清 timer | 業界慣行節奏（macOS stepper 同級）；timer 洩漏是長押元件最常見 bug |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseInputNumber.spec.ts`（spinbutton 結構 `type=text` / `inputmode=decimal` / `role`、`aria-valuemin/max` 僅有限值、`aria-valuenow` 隨 model 同步 / null 省略、precision 顯示格式化、draft 中間態不寫 model、blur commit 捨入 / clamp / 無法解析還原 / 清空為 null、Enter commit 不 preventDefault、方向鍵步進 + preventDefault、`0.1 × 3 = 0.3` 浮點修正、null 起步 clamp、鍵入後直接方向鍵＝先 commit draft 再步進、Home / End 跳界 / 無界無作用、± 按鈕步進 + `change` 語意（未變不 emit）、邊界按鈕 disabled、長按連發 fake timers + pointerup 停止 / 到界 tick 內自停不留 timer 孤兒、`controls=false` / `controlsPosition` 佈局 class、按鈕 `tabindex=-1` + `aria-hidden`、rules 驗證接線 + `aria-invalid`、disabled / readonly 全面停用、label 轉發與 `focus` / `blur` 轉發）— 30 cases
- [x] **Vitest**：`tests/utils/number.spec.ts`（`countDecimals`：整數 / 小數 / 科學記號 `1e-7` / `Infinity` / `NaN`；`roundToPrecision`：`1.005` 陷阱、`0.30000000000000004`、負數向 +∞ 捨入、非有限數原樣回傳）— 14 cases
- [x] **Storybook**：`stories/components/atoms/BaseInputNumber.stories.ts`（Playground / MinMaxStep / Precision / ControlsPosition / NoControls / WithValidation / DisabledReadonly / Themed）
