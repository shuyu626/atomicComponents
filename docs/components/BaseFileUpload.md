# BaseFileUpload

受控 / 展示型檔案上傳。只負責選檔、拖放、清單、前端驗證(型別 / 大小 / 數量);**不發任何上傳請求**——副作用(實際上傳)交給 caller / services 層(見設計規範 §6)。包在 `BaseFormField` 內,狀態色讀 `--field-*` token。

## 值型別(v-model)

一律以 `File[]` 保存(單檔時長度 0/1),被拒絕的檔以 `error` 事件回報。

```vue
<script setup lang="ts">
import { ref } from 'vue'
const files = ref<File[]>([])

async function upload() {
  // 上傳交給 caller:
  const form = new FormData()
  files.value.forEach((f) => form.append('files', f))
  // await fileService.upload(form)
}
</script>

<template>
  <BaseFileUpload v-model="files" multiple accept="image/*" :max-size="5 * 1024 * 1024" />
  <button @click="upload">上傳</button>
</template>
```

## Props

| prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `accept` | `string` | — | 原生 `accept`(`image/*`、`.pdf,.doc`),同時作型別驗證 |
| `multiple` | `boolean` | `false` | 是否可多檔 |
| `maxSize` | `number`(bytes) | — | 單檔大小上限,超出 reject + `error('size')` |
| `maxFiles` | `number` | — | 檔案數上限,超出 reject + `exceed` |
| `drag` | `boolean` | `true` | 顯示拖放區 |
| `showFileList` | `boolean` | `true` | 顯示已選檔清單 |
| `triggerLabel` | `string` | `'上傳檔案'` | 拖放區 aria-label |
| `rules` | `ValidationRule<File[]>[]` | — | 驗證(如「至少一檔」) |

另繼承 `BaseFormFieldProps`(`label` / `message` / `error` / `required` / `disabled` / `readonly` …)。

## Emits

| 事件 | payload | 說明 |
|---|---|---|
| `update:modelValue` | `File[]` | v-model 更新 |
| `error` | `{ file: File; reason: 'size' \| 'type' \| 'count' }` | 有檔案被拒絕時逐檔觸發 |
| `exceed` | `{ files: File[]; limit: number }` | 選檔數超過 `maxFiles` |

## Slots

| slot | scoped props | 說明 |
|---|---|---|
| `default` | `{ open }` | 拖放區內容,取代預設「點擊或拖曳」;`open()` 觸發檔案對話框 |
| `tip` | — | 拖放區下方提示文字 |
| `file` | `{ file, index, remove }` | 自訂清單列 |
| `label` | — | 標籤內容 |
| `message` | `{ error, message }` | 訊息內容 |

## Expose

| 方法 | 說明 |
|---|---|
| `validate()` | 強制驗證;回傳是否通過 |
| `reset()` | 重置驗證顯示狀態 |
| `open()` | 開啟檔案選擇對話框 |

## 行為

- 選檔 / 拖放後逐檔驗證:型別(`accept`)、大小(`maxSize`)、數量(`maxFiles`);通過者併入 v-model,未通過以 `error` / `exceed` 回報。
- 單檔模式(`!multiple`):新選檔取代舊檔。
- 圖片檔顯示縮圖(`URL.createObjectURL`,client-only,移除 / 卸載時 `revokeObjectURL`);其餘顯示檔案 icon。
- 拖放中(dragover)切換 `--dragging` 樣式。

## A11y

- 拖放區 `role="button"` + `tabindex` + `aria-label`,Enter / Space 開啟檔案對話框。
- `<input type="file">` 視覺隱藏但仍可被觸發;移除鈕有 `aria-label`。

## 反模式

- ❌ 在元件內直接 fetch / 上傳(副作用交給 caller;元件只 emit 檔案)。
- ❌ 用 prop 傳 icon(用 `default` slot 自訂拖放區內容)。

## 主題化 token

拖放區邊框 / focus / dragging 底色讀 `BaseFormField` 的 `--field-*`(`--field-active-color` / `--field-color` / `--field-radius`)。覆寫範例:

```css
.my-upload { --field-active-color: #059669; --field-radius: 12px; }
```
