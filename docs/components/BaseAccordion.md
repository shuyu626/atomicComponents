# Accordion 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseAccordion.vue`、`app/components/atoms/BaseAccordionPanel.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。
> **共用工具**：`app/utils/toArray.ts`（單值 / 陣列收斂）、`app/utils/isNullOrUndefined.ts`。

BaseAccordion 是「可展開 / 收合的內容區塊」元件，以 WAI-ARIA [Accordion 模式](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/)呈現一組標題（summary）與對應內容區。採 **provide / inject** 共享 context：`BaseAccordion` 管展開狀態（`v-model`）與標題間的鍵盤導覽，`BaseAccordionPanel` 依注入的 context 決定自己是否展開，並建立 `aria-controls` ↔ `aria-labelledby` 的雙向關聯。

資料模型走 **slot 組合**：caller 在預設 slot 內放任意數量的 `<BaseAccordionPanel>`，各 panel 以 `value` 對應 `v-model`。`BaseAccordionPanel` 也可**脫離父層單獨使用**，退化成自管狀態（`v-model:modelValue`）的獨立可收合區塊。

---

## 1. 元件組成

| 元件 | 職責 | 對外介面 |
|---|---|---|
| `BaseAccordion` | 管展開值（`v-model`）、multiple / 單開切換、標題鍵盤導覽、provide context | `v-model` / `multiple` / 預設 slot |
| `BaseAccordionPanel` | inject context，依 `value` 決定展開 / 收合、跑高度動畫、建立 a11y 關聯 | `value` / `summary` / `disabled` / slots |

> 為什麼拆兩個：面板內容彈性最高（任意 HTML / 元件），用獨立元件 + inject 比把內容塞進一份 `items` 陣列更自然；也讓 `BaseAccordionPanel` 能脫離父層單獨當「單一可收合區塊」使用。

---

## 2. P0 必備 Props

### BaseAccordion

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `v-model`（`modelValue` / `update:modelValue`） | `T \| T[]` | — | 展開中的 value。`multiple` 時為陣列、否則為單值（無展開為 `undefined`）。泛型 `T extends string \| number \| symbol` |

### BaseAccordionPanel

| Prop | 型別 | 預設 | 為什麼必要 |
|---|---|---|---|
| `value` | `T` | — | 對應 `BaseAccordion` `v-model` 的識別值。有父層 context 時**必填**才會被 context 控制；省略則退化為 standalone |

---

## 3. P1 進階 Props

### BaseAccordion

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `multiple` | `boolean` | `false` | 是否允許同時展開多個 panel。`false`＝互斥（展開新的收合其它，`v-model` 進出為單值）；`true`＝可多開（`v-model` 進出為陣列） |
| `headingLevel` | `2 \| 3 \| 4 \| 5 \| 6` | `3` | summary 包裹的標題層級。每個 header 依 WAI-ARIA 應為 heading；依文件結構選對層級避免跳級。透過 context 下傳給所有 panel |
| `disabled` | `boolean` | `false` | 整體禁用：所有 panel 的 summary 不可點 / 不可聚焦 |

### BaseAccordionPanel

| Prop | 型別 | 預設 | 用途 |
|---|---|---|---|
| `summary` | `string` | — | summary 顯示文字（可被 `#summary` slot 覆寫外觀，仍作為預設內容） |
| `disabled` | `boolean` | `false` | 禁用此單一 panel |
| `lazy` | `boolean` | `false` | 延遲掛載：首次展開前不渲染內容，第一次展開後才掛載並保留。內容重（圖表 / 大型清單 / 需 fetch）時可省下初次渲染成本 |
| `v-model`（`modelValue`） | `boolean` | — | **無父層 BaseAccordion 時**的 standalone 受控展開狀態 |

---

## 4. Slot 設計

### BaseAccordion

| Slot | 用途 |
|---|---|
| `default` | 放置 `<BaseAccordionPanel>` |

### BaseAccordionPanel

| Slot | Slot props | 用途 | 預設 |
|---|---|---|---|
| `summary` | `{ active }` | 自訂 summary 內容（加 icon / badge…） | `{{ summary }}` |
| `marker` | `{ active }` | 自訂展開指示 icon | 內建旋轉 chevron（`1em` / `currentColor`） |
| `default` | — | 面板內容 |

---

## 5. v-model 行為

- **單開（`multiple = false`，預設）**：`v-model` 綁定單一 value。點已展開的 summary 會收合（值變為 `undefined`），點另一個會互斥切換。
- **多開（`multiple = true`）**：`v-model` 綁定 `value[]`。各 summary 獨立累加 / 移除。
- 內部一律以陣列保存狀態（`toArray` 收斂），emit 時才依 `multiple` 還原成單值或陣列，對齊 caller 傳入的型別語意。
- **standalone**：`BaseAccordionPanel` 省略 `value` 或無父層時，改用自身 `v-model:modelValue`（boolean），與父層 context 完全脫鉤。

---

## 6. 無障礙（a11y）

依 WAI-ARIA Accordion 模式：

- 每個 summary 包進 `headingLevel` 指定的 `<h2>`～`<h6>`，內部是 `<button>`。
- summary `<button>` 帶 `aria-expanded`、`aria-controls` 指向內容區。
- 內容區 `role="region"` + `aria-labelledby` 指回 summary，形成雙向關聯。
- **鍵盤導覽**（焦點在 summary 時）：
  - `↑` / `↓`：在所有未禁用的 summary 間循環移動焦點
  - `Home` / `End`：跳到第一個 / 最後一個 summary
  - `Enter` / `Space`：原生 button 行為，展開 / 收合
- marker icon 標 `aria-hidden`，不干擾螢幕報讀。
- 收合時內容區設 `display:none`，內部可聚焦元素不會被 `Tab` 鍵停靠。

> header 夾在各 panel 內、彼此非兄弟節點，無法套用 `dom.ts` 的 sibling roving；改在 root 蒐集 `button[data-accordion-summary]:not(:disabled)` 後移動焦點。

---

## 7. 動畫

展開 / 收合沿用 JS height 量測法：以 `scrollHeight` 量目標高度、強制 reflow 觸發 `height` 過場，`transitionend` 後還原 inline style。內容 padding 放在內層 `.base-accordion__content-inner`，外層只動 `height`，避免額外動畫 padding。

收合**靜止態**用宣告式 `[hidden]` 屬性控制（非動畫期間的 imperative `display`），讓首次渲染（含 SSR）就正確收合，**避免 Nuxt hydration 前內容短暫展開的閃爍**；動畫期間才暫時取消 `[hidden]` 以量測與過場，收合動畫結束後再設回。

**滑順度**：高度動畫疊加內容區 `opacity` + 輕微 `translateY` 淡入，緩動採 `cubic-bezier(0.4, 0, 0.2, 1)`。時長 / 緩動由 `--accordion-transition-*` 統一驅動，JS 高度動畫透過 `getComputedStyle` 讀同一組變數，**確保高度、內容淡入、marker 旋轉三者完全同步**，使用者覆寫 token 時一起變。

偵測 `prefers-reduced-motion: reduce` 時**跳過所有過場**，直接切換收合狀態並讓內容立即呈現；marker 旋轉亦透過 media query 關閉。

---

## 8. 樣式客製（CSS 變數）

> Token 集中宣告於 `.base-accordion`（會 cascade 給內部 panel）；standalone 使用 `BaseAccordionPanel` 時由 `var()` fallback 提供同一組預設。覆寫時設在 `.base-accordion` 或任一外層容器即可。

| 變數 | 預設 | 作用 |
|---|---|---|
| `--accordion-border-color` | `#e5e7eb` | 外框與 item 分隔線顏色 |
| `--accordion-radius` | `0.5rem` | 容器圓角 |
| `--accordion-summary-color` | `#1f2937` | summary 文字色 |
| `--accordion-summary-bg-hover` | `#f9fafb` | summary hover 底色 |
| `--accordion-summary-bg-active` | `#f3f4f6` | summary 按下底色 |
| `--accordion-summary-padding-y` / `-x` | `0.9rem` / `1.125rem` | summary 內距 |
| `--accordion-summary-font-size` | `1rem` | summary 字級 |
| `--accordion-summary-font-weight` | `500` | summary 字重 |
| `--accordion-marker-color` | `#9ca3af` | 展開指示 icon 顏色 |
| `--accordion-marker-size` | `1.25rem` | 展開指示 icon 大小 |
| `--accordion-content-color` | `#4b5563` | 內容區文字色 |
| `--accordion-content-padding-x` | `1.125rem` | 內容區左右內距 |
| `--accordion-content-padding-bottom` | `1rem` | 內容區下內距 |
| `--accordion-focus-ring` | `#2563eb` | summary 鍵盤聚焦外框色 |
| `--accordion-disabled-opacity` | `0.45` | 禁用 summary 透明度 |
| `--accordion-transition-duration` | `300ms` | 展開 / 收合 / 淡入 / 旋轉時長 |
| `--accordion-transition-easing` | `cubic-bezier(0.4, 0, 0.2, 1)` | 動畫緩動曲線 |

---

## 9. 使用範例

### 單開（預設）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const open = ref<string>('a')
</script>

<template>
  <BaseAccordion v-model="open">
    <BaseAccordionPanel value="a" summary="第一段">內容 A</BaseAccordionPanel>
    <BaseAccordionPanel value="b" summary="第二段">內容 B</BaseAccordionPanel>
    <BaseAccordionPanel value="c" summary="第三段" disabled>內容 C</BaseAccordionPanel>
  </BaseAccordion>
</template>
```

### 多開

```vue
<script setup lang="ts">
import { ref } from 'vue'

const open = ref<string[]>(['a', 'c'])
</script>

<template>
  <BaseAccordion v-model="open" multiple :heading-level="2">
    <BaseAccordionPanel value="a" summary="第一段">內容 A</BaseAccordionPanel>
    <BaseAccordionPanel value="b" summary="第二段">內容 B</BaseAccordionPanel>
    <BaseAccordionPanel value="c" summary="第三段">內容 C</BaseAccordionPanel>
  </BaseAccordion>
</template>
```

### 自訂 summary slot

```vue
<template>
  <BaseAccordion v-model="open">
    <BaseAccordionPanel value="a">
      <template #summary="{ active }">
        <strong>標題</strong>
        <span>{{ active ? '展開中' : '已收合' }}</span>
      </template>
      內容 A
    </BaseAccordionPanel>
  </BaseAccordion>
</template>
```

### standalone（無父層）

```vue
<script setup lang="ts">
import { ref } from 'vue'

const expanded = ref(false)
</script>

<template>
  <BaseAccordionPanel v-model="expanded" summary="獨立可收合區塊">
    不需要 BaseAccordion，自管展開狀態。
  </BaseAccordionPanel>
</template>
```
