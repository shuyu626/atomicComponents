import { onScopeDispose, watch } from 'vue'

import type { Ref } from 'vue'

import createResizeObserver from '~/utils/createResizeObserver'

/**
 * 監聽單一元素尺寸變化的 composable。
 *
 * 為什麼需要它：自訂捲軸 / 自動高度 / 虛擬清單等元件，需要在「容器尺寸改變」時
 * 重新計算版面，但 `window.resize` 抓不到「容器自身（非視窗）」的尺寸變化
 * （例如父層 flex 重排、字體載入後撐高）。`ResizeObserver` 正是為此設計。
 *
 * 本 composable 解掉三件呼叫端常踩的雷：
 *   1. **ref 還沒掛載就 observe** —— 用 `watch(target)` 等元素出現才 observe，
 *      元素換掉（v-if 重建）也會先 unobserve 舊的再綁新的。
 *   2. **忘了釋放** —— 透過 `onScopeDispose` 自動 unobserve（比 `onUnmounted` 通用，
 *      在巢狀 effect scope / 非元件情境也能正確清理）。
 *   3. **SSR / 舊瀏覽器 crash** —— 底層 `createResizeObserver` 在無此 API 時回 no-op。
 *
 * 共用底層的 singleton `createResizeObserver`：整個 app 只有一個 ResizeObserver 實例
 * （與 `createIntersectionObserver` 同款），多個呼叫端不會各自 new 一份。
 */
interface UseResizeObserverReturn {
  /** 手動停止觀察並釋放（scope dispose 時也會自動呼叫）。 */
  stop: () => void
}

export default function useResizeObserver(
  target: Readonly<Ref<HTMLElement | null | undefined>>,
  callback: () => void,
): UseResizeObserverReturn {
  let unobserve: (() => void) | undefined

  const cleanup = () => {
    unobserve?.()
    unobserve = undefined
  }

  // flush:'post' —— 等 DOM patch 完成後再讀 ref，確保拿到已掛載的元素。
  // immediate —— 元素若在首次 watch 時就已存在（同步 ref）也立刻 observe。
  const stopWatch = watch(
    target,
    (element) => {
      cleanup() // 元素換掉先解除舊的，避免殘留觀察
      if (!element) return
      unobserve = createResizeObserver().observe(element, callback)
    },
    { immediate: true, flush: 'post' },
  )

  const stop = () => {
    cleanup()
    stopWatch()
  }

  onScopeDispose(stop)

  return { stop }
}
