# Steps 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseSteps.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseSteps 是**線性流程的步驟指示器**：以有序清單 `<ol>` 呈現一串節點（node）+ 標題 + 說明 + 連接線，標示使用者目前走到哪一步、哪些已完成。它是**純指示器**——不含內容面板，各步的實際內容（表單欄位、確認畫面…）由使用端自行以 `v-if` / `v-show` 依 `v-model:current` 切換（見 §3 wizard 範例），與平行內容切換的 [BaseTabs](./BaseTabs.md) 分工不同（見 §6）。

資料模型走 **items 驅動**：caller 傳 `items: BaseStepItem[]`，元件依 `current`（**具名 model**，`v-model:current`）位置自動推導每步狀態（`wait` / `process` / `finish`），也可用 `item.status` 逐步覆寫（例如某步驗證失敗標成 `error`）。`clickable` 開啟後步驟可點擊切換。

---

## 1. Props / Model / Emits / Slots

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `items` | `BaseStepItem[]` | — | 步驟資料（必填） |
| `direction` | `'horizontal' \| 'vertical'` | `'horizontal'` | 排列方向 |
| `clickable` | `boolean` | `false` | 步驟可點擊切換（渲染為 `<button>` 並更新 `v-model:current`） |

**`BaseStepItem`**

| 欄位 | 型別 | 說明 |
|---|---|---|
| `title` | `string` | 步驟標題 |
| `description` | `string?` | 補充描述 |
| `status` | `BaseStepStatus?`（`'wait' \| 'process' \| 'finish' \| 'error'`） | 狀態覆寫；未設時由 `current` 位置自動推導 |
| `disabled` | `boolean?`（預設 `false`） | `clickable` 模式下停用此步的點擊 |

**Model**

| Model | 型別 | 預設 | 說明 |
|---|---|---|---|
| `current`（`v-model:current`） | `number` | `0` | 目前所在步驟（0-based）；`clickable` 點擊非 disabled、非目前步驟時會更新此值 |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `change` | `index: number` | `clickable` 模式下點擊步驟時觸發（與 `update:current` 同時發生） |

**Slots**（皆為 scoped slot，props：`{ item: BaseStepItem, index: number, status: BaseStepStatus }`）

| Slot | 說明 |
|---|---|
| `#icon` | 覆寫節點內容；預設 `finish` 顯示 ✓、`error` 顯示 ✕、其餘顯示 1-based 編號 |
| `#title` | 覆寫標題；預設顯示 `item.title` |
| `#description` | 覆寫描述；預設顯示 `item.description` |

---

## 2. CSS 客製化（token）

| Token | 預設 | 說明 |
|---|---|---|
| `--steps-accent` | `#1d4ed8`（對齊 `--field-active-color`） | `process` / `finish` 主色（實心底、光暈 ring、目前步驟標題） |
| `--steps-on-accent` | `#fff` | 實心底（`process` / `finish` / `error`）上的編號與 ✓ / ✕ 前景色 |
| `--steps-wait-color` | `#9ca3af`（gray-400） | `wait` 節點編號色 |
| `--steps-error-color` | `#dc2626`（對齊 `--field-danger-color`） | `error` 色 |
| `--steps-icon-size` | `36px` | 圓形節點尺寸 |
| `--steps-line-thickness` | `2px` | 連接線粗細（同時是節點描邊粗細） |
| `--steps-line-color` | `#e5e7eb` | 連接線未完成色（亦作 `wait` 節點描邊色） |
| `--steps-title-font-size` | `0.875rem` | 標題字級 |
| `--steps-title-color` | `#374151`（gray-700） | 標題色（`process` 用 `--steps-accent`、`error` 用 `--steps-error-color`） |
| `--steps-description-font-size` | `0.75rem` | 描述字級 |
| `--steps-description-color` | `#6b7280`（gray-500） | 描述色 |
| `--steps-gap` | `10px` | 節點與文字之間的水平間距 |
| `--steps-vertical-gap` | `32px` | `vertical` 模式下每步之間的垂直間距 |

> 預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseSteps class="brand-steps" :items="items" />
</template>

<style scoped>
.brand-steps {
  --steps-accent: #7c3aed;
  --steps-icon-size: 32px;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 最簡：水平、不可點擊 -->
  <BaseSteps v-model:current="step" :items="items" />

  <!-- 垂直排列 -->
  <BaseSteps direction="vertical" :items="items" v-model:current="step" />

  <!-- 可點擊切換（適合已完成步驟允許回頭修改） -->
  <BaseSteps
    clickable
    :items="items"
    v-model:current="step"
    @change="onStepChange"
  />

  <!-- 某步驗證失敗：用 item.status 覆寫成 error -->
  <BaseSteps :items="itemsWithError" v-model:current="step" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { BaseStepItem } from '~/components/atoms/BaseSteps.vue'

const step = ref(0)
const items: BaseStepItem[] = [
  { title: '填寫資料' },
  { title: '確認內容' },
  { title: '完成' },
]

const itemsWithError = computed<BaseStepItem[]>(() =>
  items.map((item, index) => (index === 0 ? { ...item, status: 'error' } : item)),
)

function onStepChange(index: number) {
  console.log('切到第', index, '步')
}
</script>
```

**Wizard 範例（v-model:current + v-if 內容切換 + 上一步 / 下一步）**

```vue
<template>
  <BaseSteps :items="items" v-model:current="step" />

  <section class="wizard-panel">
    <div v-if="step === 0">
      <!-- 第一步：填寫資料 -->
    </div>
    <div v-else-if="step === 1">
      <!-- 第二步：確認內容 -->
    </div>
    <div v-else>
      <!-- 第三步：完成 -->
    </div>
  </section>

  <div class="wizard-actions">
    <BaseButton variant="outline" :disabled="step === 0" @click="step--">
      上一步
    </BaseButton>
    <BaseButton :disabled="step === items.length - 1" @click="step++">
      下一步
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { BaseStepItem } from '~/components/atoms/BaseSteps.vue'

const step = ref(0)
const items: BaseStepItem[] = [
  { title: '填寫資料' },
  { title: '確認內容' },
  { title: '完成' },
]
</script>
```

> BaseSteps 只負責「畫進度」，`step` 的遞增 / 遞減、內容切換、驗證是否可前進，都由使用端在 wizard 層自行控制——元件不內建上一步 / 下一步按鈕或驗證邏輯。

---

## 4. 行為與狀態

**狀態推導表**（`item.status` 未設時，依 `index` 與 `current` 的相對位置推導）：

| `index` vs `current` | 推導狀態 | 節點外觀 |
|---|---|---|
| `index < current` | `finish` | 實心 `--steps-accent` 底 + 白 ✓ |
| `index === current` | `process` | 實心 `--steps-accent` 底 + 白編號 + accent 柔光暈 ring；標題／描述轉 accent |
| `index > current` | `wait` | 淡灰（`--steps-line-color`）描邊 + `--steps-wait-color` 編號 |
| `item.status` 有值 | 該值（含 `error`） | `error`：實心 `--steps-error-color` 底 + 白 ✕；標題轉 error 色 |

- **`item.status` 優先覆寫**：即使該步依位置推導應為 `finish`，只要 `item.status` 有值（例如 `'error'`），一律以 `item.status` 為準——典型用法是「使用者已離開某步但該步驗證未過」。
- **連接線**：第 n 條線（第 n 步與第 n+1 步之間）跟隨第 n 步是否為 `finish` 上色（`--steps-accent`），其餘維持 `--steps-line-color`；一律 `aria-hidden="true"`，數量固定為 `items.length - 1`。
- **`clickable`**：`true` 時每步的 header 渲染為真正的 `<button type="button">`，點擊「非 `item.disabled`、且非目前 `current`」的步驟會同步更新 `current`（`v-model:current`）並 emit `change(index)`；點擊目前步驟自身或 `disabled` 步驟不觸發任何變更。`false`（預設）時 header 是純 `<div>`，不具任何互動語意。
- **clickable hover 回饋**：`wait` 步驟 hover 時節點轉 `--steps-accent`、標題轉 `--steps-title-color`，預覽「可前往」狀態（對齊 BaseTabs / BaseButton 的 hover 慣例）；`process` / `finish` / `error` 已自帶狀態色，不疊 hover 效果。
- **觸控目標**：粗指標裝置（手機 / 平板）下 clickable 步驟以透明 hit-area 擴大觸控區至 44×44px（不改變視覺、不位移連接線；對齊 BaseButton `--sm` 的做法，WCAG 2.5.5）。
- **`direction`**：`horizontal`（預設）每步等寬直欄——節點置上、標籤置中於下，連接線貫穿於節點中心高度（主流 stepper 版式）；`vertical` 節點在左、文字在右，連接線走節點正下方的垂直段。

---

## 5. A11y

- **結構語意**：根節點為 `<ol>`、每步為 `<li>`，屬有序清單，天然傳達「有先後順序的流程」。
- **目前位置**：目前步驟的 `<li>` 帶 `aria-current="step"`，其餘步驟不帶此屬性——螢幕閱讀器可用此定位目前所在步驟，不需仰賴顏色。
- **狀態不只靠顏色**：每步的節點內建 sr-only 文字「第 n 步，共 N 步」，並依狀態附加後綴：`finish` →「（已完成）」、`process` →「（進行中）」、`error` →「（發生錯誤）」；`finish` / `error` 節點另外各自畫出 ✓ / ✕ 圖形（而非只換色），色盲使用者與螢幕閱讀器皆可辨識狀態，符合「不能只靠顏色傳達資訊」原則。
- **連接線為裝飾**：`.base-steps__line` 一律 `aria-hidden="true"`，不被朗讀，也不佔可聚焦順序。
- **`clickable`**：渲染真正的 `<button type="button">`，鍵盤可聚焦（Tab）、Enter / Space 觸發，有獨立 `:focus-visible` 外框；`item.disabled` 的步驟帶原生 `disabled` 屬性（不可聚焦、不可點擊）。`clickable=false` 時 header 是純 `<div>`，不給任何互動語意（不可聚焦、無 `role`），避免螢幕閱讀器誤判為可操作。
- **節點圖示**：節點容器（`.base-steps__node`）帶 `aria-hidden="true"`，圖示 / 編號本身純視覺，狀態改由前述 sr-only 文字承載，避免重複朗讀「1」「勾」等視覺符號。

---

## 6. 與 BaseTabs 的分工

BaseSteps 與 [BaseTabs](./BaseTabs.md) 都會渲染「一排可能可點擊的項目」，但語意與使用情境完全不同：

| 面向 | **BaseSteps**（本元件） | **BaseTabs** |
|---|---|---|
| 語意 | **線性流程進度**：有先後順序，目前步驟之前為「已完成」、之後為「尚未開始」 | **平行內容切換**：各 tab 互不隸屬，可任意跳選，無「完成 / 未完成」的順序關係 |
| 結構 | `<ol>` / `<li>`（有序清單） | `role="tablist"` / `role="tab"`（WAI-ARIA Tabs 模式） |
| 狀態語意 | 每步有 `wait` / `process` / `finish` / `error` 四態，反映流程進度 | 每個 tab 只有「選中 / 未選中 / disabled」，無進度概念 |
| 內容切換 | **不內建**：本元件只畫進度條，內容由使用端自行 `v-if` / `v-show` | **內建**：`BaseTabPanel` 依 inject 的 context 自動顯示 / 隱藏對應面板 |
| 預設互動性 | `clickable` 預設 `false`（多數 wizard 只能循序前進，不能跳步） | tab 預設即可點擊切換（`disabled` 才不可） |
| 典型場景 | 註冊流程、結帳流程、多步表單、審核進度 | 設定頁分頁、資料檢視切換（列表 / 圖表） |

**選用原則**：畫面內容之間有「先後順序、需依序完成」→ **Steps**（搭配使用端自管的內容切換）；畫面內容之間是「平行、互斥、可任意切換」→ **Tabs**（搭配內建的 `BaseTabPanel`）。若流程中途也想允許使用者自由跳步修改，可將 BaseSteps 設 `clickable`，但語意仍是「回頭修改已完成步驟」而非 Tabs 式的平行切換。

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | 純指示器，不內建內容面板 | Steps 常見場景（多步表單、結帳流程）內容差異極大，硬塞 slot-per-step 或 `BaseStepPanel` 會限制彈性；改用 `v-model:current` + 使用端 `v-if`，與任何內容結構都能搭配 |
| 2 | `current` 用**具名 model**（`v-model:current`）而非預設 `v-model` | `items` 已佔用 default prop 語意；具名 model 讓「步驟資料」與「目前位置」在模板上一望即知，也避免與未來可能的其他 model（如 `v-model:open`）衝突 |
| 3 | 狀態推導 + `item.status` 覆寫並存 | 多數步驟狀態可由 `current` 位置自動算出（少寫重複邏輯），但驗證失敗等例外情境需要逐步覆寫；`item.status` 優先於推導值，兩者互補 |
| 4 | `status` 軸命名用 `error`（而非六色語意的 `danger`） | 對齊 [BaseResult](./BaseResult.md) / [BaseToast](./BaseToast.md) 的「狀態軸」慣例（`wait`/`process`/`finish`/`error`），與庫內六色「色盤軸」（`primary`/`success`/`warning`/`danger`/`info`/`neutral`）刻意區分，避免語意混淆 |
| 5 | `clickable=false` 時 header 是純 `<div>`（非隱藏的 `<button>`） | 多數 wizard 不允許跳步；改用 `<div>` 從 DOM 語意上就排除鍵盤可聚焦與互動期待，比「render 一顆 disabled button」更誠實 |
| 6 | 節點內建圖示用 inline stroke SVG（依狀態切換） | 元件自包含、無 icon library 相依，對齊 BaseAlert / BaseEmptyState 等既有元件的圖示做法 |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseSteps.spec.ts`（`<ol>`/`<li>` 結構、狀態推導 finish/process/wait、`item.status` 覆寫、finish ✓ / error ✕ SVG 與 wait/process 編號、`aria-current` 只在目前步驟、sr-only「第 n 步，共 N 步」+ 狀態後綴、連接線 `aria-hidden` 與數量、`direction` class、非 clickable 為 `<div>`、clickable 為 `<button>` 並 emit `update:current` + `change`、`item.disabled` 不可點、點擊目前步驟不 emit、scoped slots 傳參）— 15 cases
- [x] **Storybook**：`stories/components/atoms/BaseSteps.stories.ts`（Playground / Vertical / Clickable / WithError / WithDescription / CustomIcon / WizardDemo / Themed）
