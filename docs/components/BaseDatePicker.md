# BaseDatePicker

日期 / 區間選擇器。包在 `BaseFormField` 內,補上 `role="button"` 控制項與日曆浮層(定位 / focus-trap / Esc / 點外關閉交給 `BasePopover`)。日期運算全用原生 `Date`(見 `~/utils/date`),不依賴任何日期函式庫。

## 值型別(v-model)

- **單選**:綁 ISO 字串 `'YYYY-MM-DD'`;未選為 `undefined`。
- **區間**(`range`):綁兩個 ISO 的 tuple `[start, end]`(升冪);未選為 `undefined`。
- 對外型別:`export type BaseDatePickerModel = string | [string, string]`。

```vue
<script setup lang="ts">
import { ref } from 'vue'
const day = ref<string>()                 // 單選
const span = ref<[string, string]>()      // 區間
</script>

<template>
  <BaseDatePicker v-model="day" label="日期" placeholder="請選擇" />
  <BaseDatePicker v-model="span" range label="區間" />
</template>
```

## Props

| prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `range` | `boolean` | `false` | 區間模式(雙月面板,v-model 綁 tuple) |
| `format` | `(iso: string) => string` | `iso => iso.replaceAll('-', '/')` | 控制項顯示格式化(不影響 v-model 的 ISO 值) |
| `placeholder` | `string` | — | 單選 placeholder |
| `startPlaceholder` / `endPlaceholder` | `string` | — | 區間兩端 placeholder |
| `rangeSeparator` | `string` | `'至'` | 區間分隔文字 |
| `min` / `max` | `string`(ISO) | — | 可選日期下 / 上界(界外禁用) |
| `disabledDate` | `(d: Date) => boolean` | — | 自訂禁用判斷 |
| `clearable` | `boolean` | `true` | 有值時顯示清除鈕 |
| `clearLabel` | `string` | `'清除'` | 清除鈕 aria-label |
| `firstDayOfWeek` | `0..6` | `0`(週日) | 每週起始 |
| `weekdayLabels` | `string[]`(7) | zh-TW | 週標題(i18n 覆寫點,索引 0=週日) |
| `monthLabels` | `string[]`(12) | zh-TW | 月標題(i18n 覆寫點) |
| `name` | `string` | — | 送出表單用;區間產生 `${name}-start` / `${name}-end` 兩個 hidden input |
| `placement` | `BasePopoverPlacement` | `'bottom-start'` | 浮層位置 |
| `rules` | `ValidationRule<BaseDatePickerModel \| undefined>[]` | — | 驗證(touched-gated) |

另繼承 `BaseFormFieldProps`(`label` / `labelPlacement` / `labelWidth` / `hideLabel` / `message` / `error` / `required` / `disabled` / `readonly` / `id`)。

## Slots

| slot | scoped props | 說明 |
|---|---|---|
| `label` | — | 標籤內容,取代 `label` prop |
| `prepend` | — | 控制項前綴(自訂 icon) |
| `message` | `{ error, message }` | 訊息內容,取代 `message` prop |

## Expose

透過模板 ref 取得:

| 方法 | 說明 |
|---|---|
| `validate()` | 強制驗證(即使尚未 touch);回傳是否通過 |
| `reset()` | 重置驗證顯示狀態(不動值) |
| `focus()` | 聚焦控制項 |

## 行為

- 單選:點日即更新 v-model 並關閉浮層。
- 區間:點第一下設起點、點第二下設終點(自動升冪排序)並關閉;中間 hover 即時預覽區間。
- 區間雙面板:左右兩個面板各自獨立導覽 —— 點面板標題的「年」或「月」可分別叫出年 / 月快選格,左右、年月皆可獨立選取;兩側維持「左 < 右」,任一側越過另一側時自動推開一個月。**鍵盤導覽**則另有規則(焦點可跨進右面板、跨月時維持雙面板連續),見 A11y 段。
- 浮層關閉視為失焦 → `touch()`,之後才開始顯示驗證錯誤。
- 界外(`min` / `max`)與 `disabledDate` 的日以 `disabled` 屬性擋下,不可點 / 不參與鍵盤選取。

## A11y

- 控制項 `role="button"` + `aria-haspopup="dialog"` + `aria-expanded`;浮層 `role="dialog"`。
- 日格容器 `role="grid"`、列 `role="row"`、日 `role="gridcell"`(`<button>`);選取日 `aria-selected`,禁用日 `aria-disabled` + `disabled`。
- 鍵盤(焦點在日格時):

| 按鍵 | 行為 |
|---|---|
| ← / → | 前 / 後一日 |
| ↑ / ↓ | 上 / 下一週 |
| Home / End | 該週首 / 週末 |
| PageUp / PageDown | 上 / 下個月 |
| Enter / Space | 選取聚焦日 |
| Esc | 關閉浮層(BasePopover) |

- **單一 roving 焦點跨越雙面板**:整組日曆恰有一格 `tabindex="0"`(Tab 一次進入、方向鍵移動,符合 APG grid 慣例);區間模式下該格**可以落在左或右任一面板**——方向鍵越過左面板月底會直接把焦點移進右面板,右面板的日格同樣可聚焦、可用 Enter 選取。
- **鍵盤導覽的視圖跟隨**:目標日**已在任一面板內**就完全不動視圖(焦點自然移進另一面板);跨出畫面才以越界側為錨最小幅度移動,並維持**雙面板連續**(右 = 左 + 1)。例:面板為 7月|8月 時 `↑` 跨到 6/24 → 變成 6月|7月(不會留下 6月|8月 的月份斷層);焦點在右面板 9 月時 `PageDown` 跨到 10 月 → 變成 9月|10月。
  > 兩側**各自導覽**(滑鼠點面板箭頭 / 年月快選)造成的非連續月份是刻意功能,只在鍵盤跨出畫面時才收斂為連續。
- **停用日不中斷 roving**:鍵盤移動的目標日被停用(min/max/disabledDate)時,沿移動方向續掃至第一個可用日(Home/End 朝週內原焦點方向找);開啟面板時基準日停用則先往後、再往前找可用日,並讓視圖跟隨焦點日。
- **視圖夾回不變量**:滑鼠翻月 / 年月快選使 roving 焦點日離開畫面時,焦點日自動夾回**距離最近面板**的「最接近同號日的可用日」(取最近面板而非固定左側:焦點可能正落在右面板,固定夾回左側會把焦點無故拉走)——任何時刻日曆內都有一格 `tabindex="0"` 且可聚焦,Tab 恆可進入(整月停用的極端情境除外,屬滑鼠瀏覽情境)。

## 反模式

- ❌ 把顯示格式塞進 v-model(值恆為 ISO,顯示交給 `format`)。
- ❌ 依賴 dayjs / date-fns(本元件用原生 `Date`,見 `~/utils/date`)。
- ❌ 元件內做 i18n(週 / 月標題由 caller 傳)。

## 主題化 token

面板 accent 走 `--date-accent`(預設 `#1d4ed8`);控制項邊框 / focus / error 讀 `BaseFormField` 的 `--field-*`。覆寫範例:

```css
.my-picker { --field-active-color: #db2777; }
.my-picker .base-date-picker__panel { --date-accent: #db2777; }
```
