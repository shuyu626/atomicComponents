# Alert 元件規範

> **歸屬**：`Base*` 通用元件家族（`app/components/atoms/BaseAlert.vue`）。
> **配套**：`docs/components/component-design-spec.md`（跨元件通用原則）。

BaseAlert 是 **常駐的行內狀態訊息**：在版面中就地呈現一段需使用者知悉的情境訊息（表單錯誤摘要、系統公告、操作結果說明、權限提示…）。宣告式、隨內容自然排版、不自動消失，與短暫、命令式、堆疊的 [BaseToast](./BaseToast.md) 互補（見 §6）。

支援 `solid` / `outline` / `ghost` / `text` 四種外觀與 6 色語意，共用單一 `--alert-accent` 顏色模型（對齊 [BaseChip](./BaseChip.md)）。可選配前導狀態圖示、標題、後置動作區與關閉鈕。顏色 / 圓角 / 內距全走 CSS token，可跨專案主題化。

---

## 1. Props

| Prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `variant` | `'solid' \| 'outline' \| 'ghost' \| 'text'` | `'ghost'` | 外觀（填充軸，對齊 Chip）：飽和實心底（對比字）/ 描邊 / 淡色調底 / 純文字 |
| `color` | `'primary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'neutral'` | `'info'` | 語意色，決定 `--alert-accent` 與前導狀態圖示 |
| `title` | `string` | — | 選填標題；亦可用 `#title` slot 覆寫 |
| `icon` | `boolean` | `true` | 是否顯示前導狀態圖示；可用 `#icon` slot 覆寫。設 `false` 時整塊不渲染 |
| `closable` | `boolean` | `false` | 是否顯示關閉鈕；開啟後點擊 emit `close` |
| `closeLabel` | `string` | `'關閉'` | 關閉鈕的無障礙標籤（`aria-label`），多語系可覆寫 |

**Emits**

| Event | Payload | 說明 |
|---|---|---|
| `close` | — | 點擊關閉鈕時觸發。是否真的移除由父層決定（受控） |

**Slots**

| Slot | 說明 |
|---|---|
| `#icon` | 前導狀態圖示，取代依 `color` 推導的內建 SVG（可放任意圖示元件） |
| `#title` | 標題，取代 `title` prop |
| `#default` | 訊息主體（body） |
| `#actions` | 後置動作區（訊息後、關閉鈕前），放按鈕等操作 |

---

## 2. CSS 客製化（token）

| Token | 預設 | 作用 |
|---|---|---|
| `--alert-accent` | `#0369a1`（= info） | **色相來源**：solid 實心底、ghost 淡底、outline 邊框、text 文字全由此推導 |
| `--alert-on-accent` | `#fff` | `solid` variant 飽和底上的文字色 |
| `--alert-bg` | 隨 variant | 背景色（各 variant 由 accent 推導，可覆寫） |
| `--alert-color` | 隨 variant | 文字色（各 variant 由 accent 推導，可覆寫） |
| `--alert-border-color` | 隨 variant | 邊框色（各 variant 由 accent 推導，可覆寫） |
| `--alert-radius` | `8px` | 圓角 |
| `--alert-padding` | `12px 14px` | 內距 |

語意色 preset（`color` prop 選用，色值對齊 BaseChip，皆挑深色調確保淡底文字 ≥ WCAG AA）：`primary #1d4ed8`、`success #15803d`、`warning #b45309`、`danger #b91c1c`、`info #0369a1`、`neutral #374151`。

> **單一 accent 顏色模型**：`solid` 直接吃飽和的 `--alert-accent` 當底、`--alert-on-accent` 當文字；`ghost` / `outline` / `text` 則用 `color-mix(in srgb, var(--alert-accent) X%, transparent)` 從同一個 accent 推導淡底與邊框。各 variant 皆透過 `--alert-bg` / `--alert-color` / `--alert-border-color` 表達，是額外的覆寫點。預設 token 皆以 `:where()`（specificity 0）宣告，確保使用端 class 覆寫得動。

```vue
<template>
  <BaseAlert class="brand-alert" title="品牌色">內容…</BaseAlert>
</template>

<style scoped>
.brand-alert {
  --alert-accent: #db2777;
  --alert-radius: 14px;
}
</style>
```

---

## 3. 基本用法

```vue
<template>
  <!-- 最簡：ghost（預設）+ info -->
  <BaseAlert>有新版本可用。</BaseAlert>

  <!-- 語意色 × variant -->
  <BaseAlert color="success" variant="solid">操作成功。</BaseAlert>
  <BaseAlert color="warning" variant="outline">請留意額度即將用罄。</BaseAlert>
  <BaseAlert color="danger" variant="text">發生錯誤。</BaseAlert>

  <!-- 標題 + 內文 -->
  <BaseAlert color="danger" title="表單送出失敗">
    請修正下列欄位後再試一次。
  </BaseAlert>

  <!-- 可關閉（受控） -->
  <BaseAlert
    v-if="showNotice"
    color="warning"
    title="系統維護通知"
    closable
    close-label="關閉通知"
    @close="showNotice = false"
  >
    系統將於今晚 02:00 進行維護。
  </BaseAlert>

  <!-- 後置動作 -->
  <BaseAlert color="danger" title="連線中斷">
    無法連上伺服器。
    <template #actions>
      <BaseButton size="sm" @click="retry">重試</BaseButton>
    </template>
  </BaseAlert>

  <!-- 自訂圖示 / 無圖示 -->
  <BaseAlert color="success">
    <template #icon>🎉</template>
    完成！
  </BaseAlert>
  <BaseAlert color="neutral" :icon="false">貼齊左緣的純文字提示。</BaseAlert>
</template>
```

---

## 4. 行為與狀態

- **前導圖示**：`icon`（預設 `true`）時渲染依 `color` 推導的內建 stroke SVG（`success` 勾、`warning` 驚嘆號、`danger` 叉、`primary` / `info` / `neutral` 資訊 i），帶 `aria-hidden="true"`。`#icon` slot 可覆寫成自訂圖示；`icon=false` 時整塊不渲染。
- **標題**：`#title` slot > `title` prop；兩者皆未給時不渲染標題列（僅內文）。
- **內文**：`#default` slot 為訊息主體。
- **後置動作**：`#actions` slot 只在提供時渲染，位於訊息後、關閉鈕前。
- **關閉鈕**：`closable` 時於尾端渲染獨立 `<button type="button">`，點擊 emit `close`（無 payload）。是否真的移除由父層決定（受控），與 Chip 的 `delete`、Toast 的 `close` 一致。

---

## 5. A11y

- **角色與播報**（仿 BaseToast 依嚴重度切）：`danger` / `warning` → `role="alert"` + `aria-live="assertive"`（即時打斷播報）；`primary` / `success` / `info` / `neutral` → `role="status"` + `aria-live="polite"`（等空檔再播）。
  > ⚠️ Alert 是**常駐**訊息。live region 的自動朗讀只在「元件掛載後訊息動態變更 / 插入」時最可靠；若訊息在首次渲染就存在（SSR / 初始畫面），螢幕閱讀器可能只在一般閱讀流程唸到它，屬正常行為。需要「一出現就打斷朗讀」的即時通知，請改用 BaseToast。
- **前導圖示**：內建 SVG 帶 `aria-hidden="true"`，不被朗讀；顏色不獨自承載資訊——語意同時由圖示形狀、`title` / 內文文字傳達，色盲使用者亦可辨。
- **關閉鈕**：原生 `<button type="button">`，鍵盤可聚焦、Enter / Space 觸發，有獨立 `:focus-visible` 外框；`aria-label` 預設 `'關閉'`，可用 `closeLabel` prop 覆寫供多語系。
- **對比**：語意色 preset 皆採深色調（700 級），ghost 淡底 / outline / text 上文字對比 ≥ WCAG AA；`solid` 飽和底上文字為 `--alert-on-accent`（預設白字）。自訂淺色 accent 時請自行確認對比。
- **標題階層**：`title` / `#title` 為視覺樣式的標題，非文件 heading；需要 heading 語意時，於 `#title` slot 放適當階層的 `<h*>`。

---

## 6. 與 Toast 的分工

BaseAlert 與 BaseToast 都用來傳達「狀態 / 結果」，但**觸發方式、生命週期、版面關係**不同，互補而非重疊：

| 面向 | **BaseAlert**（本元件） | **BaseToast** |
|---|---|---|
| 使用方式 | 宣告式（放在 template 裡） | 命令式（`useToast().success(...)`） |
| 生命週期 | **常駐**，直到條件改變 / 使用者關閉 | **短暫**，限時自動消失（`duration`） |
| 版面關係 | **行內**，隨內容佔位、推擠排版 | **浮層**，Teleport 到 `body` 角落堆疊 |
| 數量 | 就地一則（隨資料可多則） | 佇列堆疊，有 `max` 上限 |
| 典型場景 | 表單錯誤摘要、系統公告、權限 / 額度提示、頁面級狀態說明 | 操作成功回饋、非同步結果、背景事件播報 |
| a11y 播報 | `role` 依 color（`alert` / `status`），常駐訊息以閱讀流程為主 | 同樣依 type 切 `role`，並由容器持久 live region 主動朗讀 |

**選用原則**：訊息需要「留在畫面上、與內容一起被看到、可能需要就地操作（重試 / 前往設定）」→ **Alert**；訊息是「一次性的即時回饋、看過即可消失、不佔版面」→ **Toast**。兩者外觀軸（`variant`）、6 色語意、依嚴重度切 `role` 的規則刻意一致，降低心智負擔。

---

## 7. 設計重點

| # | 決策 | 理由 |
|---|---|---|
| 1 | 外觀軸沿用 Chip 的 `solid / outline / ghost / text`，預設 `ghost` | Alert 與 Chip 同屬「語意色填充」家族；`ghost` 淡底是典型 alert 外觀，故為預設。與 Card 的表面軸（`elevated / outlined / filled`）刻意區分 |
| 2 | 單一 `--alert-accent` 顏色模型、色值對齊 Chip | 全庫語意色一致；ghost / outline / text 由 `color-mix` 從 accent 推導，無分支 |
| 3 | `role` 依 `color`（danger / warning → alert）而非固定 | 對齊 BaseToast，即時且重要的訊息才打斷朗讀，符合 WAI-ARIA |
| 4 | `close` 受控、不自動移除 | 與 Chip `delete` / Toast `close` 一致；是否移除交由父層，最大彈性 |
| 5 | 圖示用 inline stroke SVG（依 color 推導） | 元件自包含、無 svg-loader 相依；顏色不獨自承載資訊（形狀 + 文字輔助） |
| 6 | 內建圖示 `aria-hidden`、`title` 非 heading | 避免重複朗讀與跳階；需要 heading 語意時於 `#title` slot 自行放 `<h*>` |

---

## 8. 測試與 Storybook

- [x] **Vitest**：`tests/components/atoms/BaseAlert.spec.ts`（variant / color modifier（含 neutral 與全 4 variant）、`title` prop 與 `#title` slot 優先序、icon 預設 / `icon=false` / 依 color 換 path / `#icon` slot 覆寫、default / `#actions` slot、`closable` 渲染關閉鈕 + emit `close`、`closeLabel` 覆寫、role 依 color 切 `alert` / `status` + `aria-live`）— 20 cases
- [x] **Storybook**：`stories/components/atoms/BaseAlert.stories.ts`（Playground / Variants / Colors / WithTitle / Closable / WithActions / CustomIcon / Themed）
