import type { FocusTrap } from 'focus-trap'
import { createFocusTrap } from 'focus-trap'
import {
  computed,
  onBeforeMount,
  onMounted,
  onUnmounted,
  toValue,
  watch,
} from 'vue'
import type { ComputedRef, MaybeRefOrGetter, Ref } from 'vue'

import { usePopupsManager } from '~/composables/usePopupsManager'

/**
 * 所有浮層（BaseModal / BaseDialog…）共用的 focus-trap 堆疊（module 層級單例）。
 *
 * 跨「不同元件」疊開時也共用同一個堆疊 —— focus-trap 會自動暫停下層 trap、
 * 只讓最上層作用，關閉後再恢復下層，避免兩個 active trap 互搶焦點。
 * 這也是把焦點邏輯抽到 composable 的關鍵：BaseModal 疊 BaseDialog 仍正確協作。
 */
const trapStack: FocusTrap[] = []

export interface UseOverlayOptions {
  /** 按 Esc 是否關閉（僅最上層浮層回應）。 @default true */
  closeOnEscape?: MaybeRefOrGetter<boolean>
  /** 點擊面板外部（遮罩區）是否關閉。 @default true */
  closeOnBackdrop?: MaybeRefOrGetter<boolean>
  /** 開啟時是否鎖定背景捲動。 @default true */
  lockScroll?: MaybeRefOrGetter<boolean>
  /** 隱藏半透明遮罩（仍保留點擊外部關閉行為）。 @default false */
  hideBackdrop?: MaybeRefOrGetter<boolean>
}

export interface UseOverlayReturn {
  /** 是否渲染遮罩：未隱藏且自身為堆疊最底層（避免疊加變暗 / 閃爍）。 */
  showBackdrop: ComputedRef<boolean>
  /** 綁在 overlay 容器上：記錄 mousedown 是否起始於面板外（防誤關）。 */
  onOverlayMousedown: (event: MouseEvent) => void
  /** 綁在 overlay 容器上：按下與放開都在面板外才視為點擊外部 → 關閉。 */
  onOverlayClick: (event: MouseEvent) => void
}

/**
 * 浮層共用行為：focus-trap、Esc / 點外部關閉、scroll-lock、多層堆疊、遮罩渲染。
 *
 * 由 {@link usePopupsManager} 協調堆疊順序與背景捲動鎖定；焦點由 `focus-trap`
 * 配合 module 層級共用的 {@link trapStack} 管理。生命週期副作用（事件監聽、
 * 堆疊註冊 / 解除、trap 啟用 / 停用）皆於 composable 內自理。
 *
 * @param panelRef 對話框面板元素（focus-trap 的容器、判斷點擊內外的依據）
 * @param open     開關狀態的 model ref；關閉統一改 `open.value = false`
 * @param options  行為旗標（可為 ref / getter，內部以 `toValue` 取即時值）
 */
export function useOverlay(
  panelRef: Readonly<Ref<HTMLElement | null>>,
  open: Ref<boolean>,
  options: UseOverlayOptions = {},
): UseOverlayReturn {
  const closeOnEscape = () => toValue(options.closeOnEscape) ?? true
  const closeOnBackdrop = () => toValue(options.closeOnBackdrop) ?? true
  const lockScroll = () => toValue(options.lockScroll) ?? true
  const hideBackdrop = () => toValue(options.hideBackdrop) ?? false

  const popups = usePopupsManager()

  // 此浮層在堆疊管理器中的唯一身分。
  const token = Symbol('overlay')

  function close() {
    open.value = false
  }

  // 多層疊開時只有「最底層」渲染遮罩：疊加過程遮罩恆定，零閃爍、不疊暗。
  const showBackdrop = computed(() => !hideBackdrop() && popups.isBottom(token))

  // ---- 點擊外部關閉 ----
  // 記錄 mousedown 是否起始於面板外：避免「在面板內按住選取文字 → 滑出到外部放開」
  // 觸發的 click 誤關（只有「按下與放開都在外部」才算點擊外部）。
  let pressedOutside = false

  function isOutsidePanel(event: MouseEvent): boolean {
    const panel = panelRef.value
    return !panel || !event.composedPath().includes(panel)
  }

  function onOverlayMousedown(event: MouseEvent) {
    pressedOutside = isOutsidePanel(event)
  }

  function onOverlayClick(event: MouseEvent) {
    const startedOutside = pressedOutside
    pressedOutside = false
    if (!closeOnBackdrop() || !startedOutside) return
    if (!isOutsidePanel(event)) return
    close()
  }

  // ---- Esc 關閉（只有最上層回應，支援多層堆疊）----
  function onEscKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') return
    if (!closeOnEscape() || !open.value || !popups.isTop(token)) return
    event.preventDefault()
    close()
  }

  // ---- focus trap：鎖住 Tab、初始聚焦面板、關閉時還焦給觸發元素 ----
  let trap: FocusTrap | undefined

  function activateTrap() {
    const panel = panelRef.value
    if (!panel || trap) return

    trap = createFocusTrap(panel, {
      trapStack, // 多層浮層共用堆疊：開上層自動暫停下層 trap
      // 面板永遠至少有可聚焦元素；萬一全被隱藏，退而聚焦面板本身（panel 需 tabindex=-1）。
      fallbackFocus: panel,
      delayInitialFocus: false, // 開啟即把焦點移入面板（不等動畫）
      escapeDeactivates: false, // Esc 交由元件統一處理（同時關閉浮層）
      clickOutsideDeactivates: false, // 點外部的關閉邏輯由 onOverlayClick 處理
      // focus-trap 會在 capture 階段攔截「面板外」的點擊（preventDefault + stopImmediatePropagation），
      // 導致遮罩點擊到不了 onOverlayClick。允許可關閉時的外部點擊通過，由 onOverlayClick 決定關閉；
      // closeOnBackdrop 為 false 時維持攔截，焦點仍鎖在面板內。
      allowOutsideClick: () => closeOnBackdrop(),
    })
    trap.activate()
  }

  function deactivateTrap() {
    trap?.deactivate()
    trap = undefined
  }

  // 開關副作用集中處理：上 / 下堆疊、鎖 / 解捲動、啟用 / 停用 focus trap。
  function applyOpenState(value: boolean) {
    if (value) {
      popups.add(token)
      if (lockScroll()) popups.lock(token)
    }
    else {
      popups.remove(token)
      popups.unlock(token)
      deactivateTrap()
    }
  }

  // panel 掛載（開啟並渲染完成）後才建立 focus trap；卸載則停用。
  watch(panelRef, (panel) => {
    if (panel) activateTrap()
    else deactivateTrap()
  })

  watch(open, applyOpenState)

  // 初始即為開啟狀態時，於首次 render 前（client-only，避免 SSR 觸發 DOM / 污染單例）
  // 補跑副作用 —— 讓 showBackdrop 在第一幀就正確（不閃一下才出現遮罩）。
  onBeforeMount(() => {
    if (open.value) applyOpenState(true)
  })

  onMounted(() => {
    document.addEventListener('keydown', onEscKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onEscKeydown)
    popups.remove(token)
    popups.unlock(token)
    deactivateTrap()
  })

  return {
    showBackdrop,
    onOverlayMousedown,
    onOverlayClick,
  }
}
