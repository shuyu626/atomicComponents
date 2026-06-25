import { onScopeDispose, ref, toValue } from 'vue'
import type { MaybeRefOrGetter, Ref } from 'vue'

export interface Coords {
  x: number
  y: number
}

export interface UseDragOptions {
  /**
   * 被拖曳元素的存取器；提供後且 `boundary` 為真時，會把位移 clamp 在視窗內，
   * 避免把元素拖出畫面消失。不提供則為自由拖曳（不限制範圍）。
   */
  target?: () => HTMLElement | null | undefined
  /** 是否限制在視窗範圍內（需搭配 `target`）。 @default true */
  boundary?: MaybeRefOrGetter<boolean>
}

export interface UseDragReturn {
  /** 目前累積位移（px）。可直接綁進 `transform: translate(...)`。 */
  translate: Ref<Coords>
  /** 是否正在拖曳中（可用來加 `user-select:none` 等狀態樣式）。 */
  isDragging: Ref<boolean>
  /** 綁在拖曳把手的 `@pointerdown`，開始一次拖曳。 */
  onDragStart: (event: PointerEvent) => void
  /** 把位移歸零（例如關閉對話框後重置位置）。 */
  reset: () => void
}

/** SSR 安全：只有在有 DOM 的環境（瀏覽器）才操作 `window`。 */
const canUseDOM = typeof window !== 'undefined'

/**
 * 指標拖曳：以 Pointer Events 追蹤位移，**只在拖曳期間**監聽 `pointermove/up`
 * （非永遠常駐），並可選擇把位移 clamp 在視窗範圍內。
 *
 * 相較參考版（常駐 global `mousemove` 的 `useMouse` + 無邊界 `useDrag`）的優化：
 * - Pointer Events → 一併支援觸控 / 觸控筆，且可 `setPointerCapture` 穩定追蹤
 * - 監聽僅存在於單次拖曳生命週期，閒置零開銷
 * - `boundary` 邊界 clamp，避免拖出畫面找不回來
 * - SSR 安全、明確回傳型別（符合 composable 規範）
 *
 * @param enabled 是否啟用拖曳（停用時 `onDragStart` 不作用、不監聽）
 * @param options 邊界 clamp 設定
 */
export default function useDrag(
  enabled: MaybeRefOrGetter<boolean>,
  options: UseDragOptions = {},
): UseDragReturn {
  const translate = ref<Coords>({ x: 0, y: 0 })
  const isDragging = ref(false)

  // 單次拖曳的起點：指標起始座標與當下位移基準（null 代表未在拖曳）。
  let origin: { pointer: Coords, base: Coords } | null = null

  function addListeners() {
    if (!canUseDOM) return
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }

  function removeListeners() {
    if (!canUseDOM) return
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }

  // 把候選位移限制在「元素完整留在視窗內」的範圍。
  function clamp(next: Coords): Coords {
    const target = options.target?.()
    const boundary = toValue(options.boundary) ?? true
    if (!target || !boundary || !canUseDOM) return next

    const rect = target.getBoundingClientRect()
    // 元素在「零位移」時的左上座標（扣掉目前 transform 帶來的位移）。
    const baseLeft = rect.left - translate.value.x
    const baseTop = rect.top - translate.value.y

    const minX = -baseLeft
    const maxX = window.innerWidth - rect.width - baseLeft
    const minY = -baseTop
    const maxY = window.innerHeight - rect.height - baseTop

    return {
      x: clampRange(next.x, minX, maxX),
      y: clampRange(next.y, minY, maxY),
    }
  }

  function onDragStart(event: PointerEvent) {
    if (!toValue(enabled)) return

    origin = {
      pointer: { x: event.clientX, y: event.clientY },
      base: { ...translate.value },
    }
    isDragging.value = true

    // 抓住指標：拖曳過程即使移出元素也持續收到事件。
    try {
      const target = event.target as Element | null
      target?.setPointerCapture?.(event.pointerId)
    }
    catch {
      // setPointerCapture 在部分環境（或測試）不存在，忽略即可。
    }

    addListeners()
  }

  function onPointerMove(event: PointerEvent | MouseEvent) {
    if (!origin || !toValue(enabled)) return

    const next = {
      x: origin.base.x + (event.clientX - origin.pointer.x),
      y: origin.base.y + (event.clientY - origin.pointer.y),
    }
    translate.value = clamp(next)
  }

  function onPointerUp() {
    origin = null
    isDragging.value = false
    removeListeners()
  }

  function reset() {
    translate.value = { x: 0, y: 0 }
  }

  onScopeDispose(() => {
    removeListeners()
  })

  return {
    translate,
    isDragging,
    onDragStart,
    reset,
  }
}

function clampRange(value: number, min: number, max: number): number {
  // 若 min > max（元素比視窗大），退而以 min 為準，至少保住左 / 上緣可見。
  if (min > max) return min
  return Math.min(Math.max(value, min), max)
}
