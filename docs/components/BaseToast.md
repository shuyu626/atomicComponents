# Toast 元件規範

> **歸屬**：`Base*` 通用元件家族。
> **組成**：
> - `app/composables/useToast.ts` — 命令式佇列管理器（單例）
> - `app/components/atoms/BaseToast.vue` — 單顆 toast 的視覺與行為（圖示、自動消失、暫停、a11y）
> - `app/components/atoms/BaseToastContainer.vue` — Teleport 到 `<body>`、依 placement 分組堆疊、串接佇列
> **配套**：`docs/components/component-design-spec.md`。

BaseToast 是「非阻斷式輕量通知」。與 [BaseModal](./BaseModal.md) / [BaseDialog](./BaseDialog.md) 那種需要使用者回應的浮層不同，toast 由**程式邏輯觸發**、自動排隊、限時消失，因此採**命令式 API**：在任何地方呼叫 `useToast().success('已儲存')`，畫面由掛在 app 根層的單一 `<BaseToastContainer />` 負責渲染。

它是 **操作成功提示、錯誤回饋、非同步結果通知、背景事件播報** 等場景的首選。

---

## 1. 與參考實作的差異（優化點）

本元件參考 [`AtomicToasts.vue`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicToasts.vue) 與 [`AtomicToast.vue`](https://github.com/Mini-ghost/16th-ithelp-vue-components/blob/main/src/components/AtomicToast.vue) 重寫，並做了以下修正：

| 參考實作 | 本元件 | 為什麼 |
|---|---|---|
| 每顆 toast 用 `offset` prop + `translateY(offset * 1px)` 手動疊位 | 容器 `flex` column + `gap` 自然堆疊 | 免去呼叫端 / 父層算偏移；新增刪除時排版自動補位 |
| 只能固定右上角（`right: 16px; top: 0`） | 6 種 `placement`（top/bottom × start/center/end），容器依 placement 分組 | 真實產品常需自訂角落；不同角落各自獨立堆疊 |
| 全部 `role="status"` | error / warning → `role="alert"`（assertive）；其餘 → `role="status"`（polite） | 錯誤訊息應即時打斷播報，一般提示等空檔；符合 WAI-ARIA |
| hover 不暫停，時間到照關 | hover / focus 暫停計時，移開後**以剩餘時間**續跑 | 使用者正在閱讀 / 操作關閉鈕時不該被抽掉 |
| 無數量上限，可無限堆疊洗版 | `max`（預設 5）超過擠掉最舊 | 避免大量通知瞬間灌爆畫面 |
| `duration` 無「常駐」語意 | `duration: 0` = 不自動消失（需手動 / 程式關閉） | 重大錯誤或需使用者確認的通知要留住 |
| 圖示用 `xxx.svg?component`（依賴 svg loader） | inline SVG（stroke 字形，Lucide 風格） | 本專案無 svg-loader；零額外建置設定 |
| 寫死色（`white` / `#646464`…） | `--toast-*` CSS 變數 | 可主題化、與其他 `Base*` 一致 |
| 無 reduced-motion 處理 | `prefers-reduced-motion` 關閉動畫 | 無障礙：尊重「減少動態」偏好 |
| `onClose` 僅關閉時 | 自動消失 / 手動 / 被擠掉 / `clear` 皆觸發 `onClose` | 呼叫端可統一在 toast 結束時做清理 |
| 樸素白底 + 純色字形圖示 | 柔色卡片 + 左側強調條 + 圓形實心圖示徽章 + 同色 × | 對齊參考設計圖，層級與類型一眼可辨 |
| 圖示固定、不可換 | `#icon`（前置）/ `#action`（後置）/ `#default`（內文）slots | 可塞自訂圖示（如 `v-icon`）或「復原」動作 |
| 無倒數視覺回饋 | `progress` 選項：底部進度條隨 timeout 縮短，hover 同步暫停 | 使用者能預期 toast 何時消失 |

---

## 2. 安裝（掛載容器）

在 app 根層（Nuxt 為 `app/app.vue`，SPA 為根元件）放**一個**容器即可，全應用共用同一佇列：

```vue
<!-- app/app.vue -->
<template>
  <NuxtPage />
  <BaseToastContainer />
</template>
```

> Nuxt 自動 import 元件與 composable，無需手動 import / 註冊 plugin。

---

## 3. 觸發 API（`useToast`）

```ts
const toast = useToast()

// 捷徑：第一參數為訊息，第二參數為選填設定
toast.success('已儲存變更')
toast.error('儲存失敗，請稍後再試', { duration: 0 }) // 0 = 常駐
toast.warning('表單尚未送出')
toast.info('有新版本可用', { title: '更新', placement: 'bottom-end' })

// 帶倒數進度條（隨 timeout 縮短，hover 暫停）
toast.success('已寄出', { progress: true, duration: 5000 })

// 完整設定
const id = toast.show({
  message: '檔案上傳中…',
  type: 'info',
  duration: 0,
  closable: false,
})

// 程式控制
toast.dismiss(id) // 關閉指定一筆
toast.clear()     // 清空全部
```

### `ToastOptions`

| 欄位 | 型別 | 預設 | 說明 |
|---|---|---|---|
| `message` | `string` | **required** | 主要訊息 |
| `title` | `string` | — | 選填標題（訊息上方、字重較粗） |
| `type` | `'info' \| 'success' \| 'warning' \| 'error'` | `'info'` | 語意類型：決定圖示、顏色與播報優先度 |
| `duration` | `number` | `3000` | 自動消失時間（ms，即 timeout）；`0` = 常駐 |
| `closable` | `boolean` | `true` | 是否顯示關閉按鈕 |
| `progress` | `boolean` | `false` | 是否在底部顯示倒數進度條（`duration: 0` 時自動不顯示） |
| `placement` | `ToastPlacement` | `'top-end'` | 出現位置（見下） |
| `onClose` | `() => void` | — | toast 被移除時觸發（任何移除途徑皆會呼叫） |

`ToastPlacement`：`'top-start' \| 'top' \| 'top-end' \| 'bottom-start' \| 'bottom' \| 'bottom-end'`。

### `ToastManager` 方法

| 方法 | 簽名 | 說明 |
|---|---|---|
| `show` | `(options: ToastOptions \| string) => string` | 推一筆；傳字串等同 `{ message }`。回傳 id。**SSR 期呼叫為 no-op 並回傳空字串**（server 端佇列會跨請求洩漏，故強制擋下；dev 模式印警告） |
| `success` / `error` / `warning` / `info` | `(message: string, options?) => string` | 捷徑，自動帶對應 `type` |
| `dismiss` | `(id: string) => void` | 依 id 移除 |
| `clear` | `() => void` | 清空全部 |
| `toasts` | `readonly ToastItem[]` | 唯讀 reactive 佇列（容器消費，外部勿 mutate） |

### 自訂上限 / 預設值

`useToast()` 回傳全域單例（預設 `max: 5`、`duration: 3000`、`placement: 'top-end'`）。需要獨立佇列或不同預設時用 `createToastManager()`，並把實例傳給容器：

```ts
const manager = createToastManager({ max: 3, placement: 'bottom-end' })
```

```vue
<BaseToastContainer :manager="manager" />
```

---

## 4. Slots（自訂圖示 / 內容 / 動作）

命令式 API 涵蓋常見情境；若需要自訂圖示或動作，可**直接使用 `<BaseToast>`**（宣告式），提供三個 slot：

| Slot | 位置 | 說明 |
|---|---|---|
| `#icon` | 前置（leading） | 取代預設的類型圓形徽章，可塞任意圖示元件（如 `<v-icon>`） |
| `#default` | 內文 | 取代 `message` prop，可放富文字 / 元件 |
| `#action` | 後置（trailing） | 訊息後、關閉鈕前；放「復原」等動作。slot prop 提供 `close()` |

```vue
<BaseToast type="success" :duration="5000" progress>
  <!-- 前置自訂圖示 -->
  <template #icon><v-icon name="check" /></template>

  檔案已刪除

  <!-- 後置動作 -->
  <template #action="{ close }">
    <button @click="restore(); close()">復原</button>
  </template>
</BaseToast>
```

> 命令式佇列（`useToast`）渲染的 toast 使用預設類型圖示；要自訂圖示請走上述宣告式用法。

---

## 5. 無障礙（a11y）

- **角色與播報**：`error` / `warning` → `role="alert"` + `aria-live="assertive"`（即時打斷）；`success` / `info` → `role="status"` + `aria-live="polite"`（等空檔）。皆 `aria-atomic="true"`，確保整段重念。
- **持久 live region（容器佇列模式）**：`BaseToastContainer` 內建一組**常駐**的 `polite` / `assertive` live region（`role=status` / `role=alert` + `aria-atomic="true"`），永遠存在於 DOM。新 toast 出現時把訊息文字（`title` + `message`）依 `type` 注入對應層級朗讀。原因：部分螢幕閱讀器只朗讀「先存在、後填入」的 live region，整塊 `role=status/alert` 動態插入時會被略過。為避免「視覺 toast + 容器 announcer」重複播報，容器渲染的 toast 一律帶 `presentational`（見下）移除自身 live 語意，但保留視覺與關閉鈕互動。
- **`presentational` prop**：宣告式單獨使用 `<BaseToast>` 時**不需設定**（預設 `false`，維持自身 `role` / `aria-live` / `aria-atomic`）；僅 `BaseToastContainer` 佇列渲染時自動設為 `true`，把朗讀責任交給容器的持久 live region。
- **暫停閱讀**：hover / focus 進入 toast 會暫停自動消失，避免使用者還在讀就被抽走。
- **關閉按鈕**：`<button>` 帶 `aria-label`（預設「關閉通知」，可用 `closeLabel` prop 覆寫供多語系），可鍵盤聚焦觸發。
- **減少動態**：`prefers-reduced-motion: reduce` 時關閉進出場與補位動畫。
- **常駐重大訊息**：需使用者確認的錯誤建議 `duration: 0`，避免讀屏使用者來不及聽完。

---

## 6. 主題化（CSS 變數）

覆寫 `.base-toast` 上的 token 即可：

| Token | 預設 | 用途 |
|---|---|---|
| `--toast-accent` | 隨 type | 強調色：左側條、圖示徽章、關閉鈕、進度條（各 type 各自覆寫） |
| `--toast-surface` | 隨 type | 卡片柔色底（各 type 各自覆寫） |
| `--toast-title-color` | `#1f2937` | 標題文字色 |
| `--toast-message-color` | `#4b5563` | 訊息文字色 |
| `--toast-accent-width` | `6px` | 左側強調條寬度 |
| `--toast-radius` | `10px` | 圓角 |
| `--toast-shadow` | — | 陰影 |
| `--toast-width` | `22rem` | 寬度 |
| `--toast-padding` | `0.875rem 1rem` | 內距 |
| `--toast-z`（容器） | `1200` | 堆疊層級（建議高於 modal 的 `1100`） |

```css
/* 深色「Custom Toast」變體（對齊參考圖一最後一張） */
.base-toast--dark {
  --toast-accent: #6b7280;
  --toast-surface: #3f3f46;
  --toast-title-color: #f9fafb;
  --toast-message-color: #d1d5db;
}
```

---

## 7. 驗收 Checklist

- [ ] 根層僅掛**一個** `<BaseToastContainer />`，全應用共用佇列
- [ ] 成功 / 錯誤 / 警告 / 資訊四種 type 圖示與顏色正確
- [ ] `duration` 到期自動消失；`duration: 0` 常駐不消失
- [ ] `progress: true` 顯示倒數進度條，且 hover 時與計時同步暫停
- [ ] `#icon` / `#action` slots 可注入自訂圖示與動作
- [ ] hover / focus 時暫停計時，移開續跑剩餘時間
- [ ] 超過 `max` 時最舊的被擠掉
- [ ] 6 種 placement 定位正確且各自獨立堆疊
- [ ] error / warning 為 `role="alert"`，其餘為 `role="status"`（單獨使用 `<BaseToast>` 時）
- [ ] 容器有常駐的 polite / assertive live region，新 toast 訊息依 type 注入正確層級
- [ ] 容器佇列渲染的 toast 帶 `presentational`（無自身 live 語意，避免重複播報），關閉鈕仍可操作
- [ ] `prefers-reduced-motion` 下無動畫
- [ ] 關閉按鈕可鍵盤操作、`onClose` 在各移除途徑皆觸發
```
