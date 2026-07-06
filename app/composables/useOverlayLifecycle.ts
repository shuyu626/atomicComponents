import { computed, onMounted, watch } from 'vue'

import type { Ref, WritableComputedRef } from 'vue'

/**
 * 關閉前攔截函式：呼叫時暫不關閉，需在內部呼叫 `done()` 才真正關閉。
 * 適合「未儲存，確定離開？」確認流程。
 */
export type OverlayBeforeClose = (done: () => void) => void

export interface UseOverlayLifecycleOptions {
  /**
   * 取得當前的 `beforeClose` 攔截（props 可能變動，以 getter 取即時值）。
   * 回傳 undefined 時關閉不攔截、直接生效。
   */
  beforeClose?: () => OverlayBeforeClose | undefined
  /** 開始開啟（進場動畫前）時呼叫，通常是 `() => emit('open')`。 */
  emitOpen: () => void
  /** 開始關閉（離場動畫前）時呼叫，通常是 `() => emit('close')`。 */
  emitClose: () => void
}

export interface UseOverlayLifecycleReturn {
  /**
   * 把關後的開關 ref：寫入 `false` 會先過 `beforeClose`（有提供時）才真正關閉；
   * 開啟方向不攔截。交給 useOverlay 與各關閉入口（關閉鈕 / slot `close()`）使用。
   */
  guardedOpen: WritableComputedRef<boolean>
  /** 統一的關閉入口（等同 `guardedOpen.value = false`，會過 `beforeClose`）。 */
  close: () => void
}

/**
 * 對話框類浮層（Modal / Drawer）共用的「關閉把關 + 生命週期 emit」樣板：
 *
 * - **guardedOpen**：所有「使用者觸發」的關閉路徑（Esc / 點外部 / 關閉鈕 / slot `close()`）
 *   皆寫入此 ref，因此都會過 `beforeClose`；父層透過 `v-model` 直接改 `open` 屬於
 *   程式化關閉、不經此。
 * - **open / close 事件（動畫「前」）**：watch 預設 flush:'pre'，在 DOM 更新與動畫開始前
 *   發出。掛載時即為開啟者 watch 不會觸發，故 onMounted 補發 open（修正 `<Transition appear>`
 *   只發 opened 的不對稱）。
 * - opened / closed（動畫「後」）不在此處理，由元件的 `<Transition>` hook 發出。
 *
 * watch / onMounted 註冊於元件 scope，隨元件卸載自動清理，無需手動釋放。
 *
 * @param open    開關狀態的 model ref（`defineModel<boolean>()`）
 * @param options `beforeClose` getter 與生命週期 emit 回呼
 */
export function useOverlayLifecycle(
  open: Ref<boolean>,
  options: UseOverlayLifecycleOptions,
): UseOverlayLifecycleReturn {
  const guardedOpen = computed<boolean>({
    get: () => open.value,
    set(value) {
      if (value) {
        open.value = true
        return
      }

      const beforeClose = options.beforeClose?.()
      if (beforeClose) {
        beforeClose(() => {
          open.value = false
        })
      }
      else {
        open.value = false
      }
    },
  })

  function close(): void {
    guardedOpen.value = false
  }

  watch(open, (value) => {
    if (value) options.emitOpen()
    else options.emitClose()
  })

  onMounted(() => {
    if (open.value) options.emitOpen()
  })

  return { guardedOpen, close }
}
