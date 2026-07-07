import { shallowReactive } from 'vue'

import toUnit from '~/utils/toUnit'

/**
 * 每個浮層（modal…）的唯一身分。只要是穩定的唯一參考即可——
 * 元件端通常用 `Symbol()` 或自身 component instance 當 token。
 */
export type PopupToken = symbol | object

/**
 * 浮層堆疊管理器：負責「誰在最上層（isTop）」與「背景捲動鎖定（lock/unlock）」。
 *
 * - **堆疊**：多個 modal 同時開啟時，只有最上層該回應 Esc / 點遮罩關閉。
 * - **scroll-lock**：第一個浮層鎖定 `body` 捲動並補捲軸寬度（避免版面跳動），
 *   最後一個關閉時才還原。中間層開關不會誤放開鎖。
 */
export interface PopupsManager {
  /** 把浮層推上堆疊頂端（重複 add 同一 token 不會疊加）。 */
  add: (token: PopupToken) => void
  /** 將浮層移出堆疊（不存在則為 no-op）。 */
  remove: (token: PopupToken) => void
  /** 登記一筆捲動鎖；第一筆會真正鎖住 `body`。 */
  lock: (token: PopupToken) => void
  /** 撤除一筆捲動鎖；最後一筆撤除後才還原 `body`。 */
  unlock: (token: PopupToken) => void
  /** 此浮層是否位於堆疊最上層（決定 Esc / 點外部由誰回應）。 */
  isTop: (token: PopupToken) => boolean
  /** 此浮層是否位於堆疊最底層（決定由誰渲染遮罩 —— 只有最底層畫，避免疊加變暗與閃爍）。 */
  isBottom: (token: PopupToken) => boolean
  /** 浮層在堆疊中的位置（0 起算的開啟順序；不存在回 -1）。供依開啟序派發 z-index。 */
  getIndex: (token: PopupToken) => number
}

/** SSR 安全：只有在有 DOM 的環境（瀏覽器）才操作 `document` / `window`。 */
const canUseDOM = typeof document !== 'undefined' && typeof window !== 'undefined'

/**
 * 建立一個獨立的浮層管理器實例。測試可用它取得彼此隔離的乾淨狀態；
 * 應用端請改用 {@link usePopupsManager} 取得共用單例。
 */
export function createPopupsManager(): PopupsManager {
  // popups 用 shallowReactive：元件以 computed(() => isTop(token)) 反應「自己是否最上層」
  // （決定是否渲染遮罩），故堆疊變動需觸發響應式更新。
  // locks 僅在事件/生命週期當下讀取，不需響應式。
  const popups = shallowReactive<PopupToken[]>([])
  const locks: PopupToken[] = []

  // 首次鎖定時保存宿主 App 原本設在 body 上的 inline 樣式，最後解鎖時據以還原——
  // 直接清成 '' 會抹掉宿主自己的 overflow / paddingRight 設定。
  let savedOverflow = ''
  let savedPaddingRight = ''

  const add = (token: PopupToken): void => {
    if (popups.includes(token)) return
    popups.push(token)
  }

  const remove = (token: PopupToken): void => {
    const index = popups.indexOf(token)
    if (index !== -1) popups.splice(index, 1)
  }

  const isTop = (token: PopupToken): boolean =>
    popups.length > 0 && popups[popups.length - 1] === token

  const isBottom = (token: PopupToken): boolean =>
    popups.length > 0 && popups[0] === token

  // popups 為 shallowReactive：indexOf 讀取 length / 索引，於 computed 中會建立響應依賴，
  // add / remove 改動堆疊時自動重算（供 useOverlay 依開啟序派發 z-index）。
  const getIndex = (token: PopupToken): number => popups.indexOf(token)

  const lock = (token: PopupToken): void => {
    if (locks.includes(token)) return

    // 第一筆鎖 → 先保存原始 inline 樣式，再真正鎖住 body 並補上捲軸寬度，
    // 避免捲軸消失造成版面橫向跳動。
    if (!locks.length && canUseDOM) {
      savedOverflow = document.body.style.overflow
      savedPaddingRight = document.body.style.paddingRight

      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) document.body.style.paddingRight = toUnit(scrollbarWidth)
      document.body.style.overflow = 'hidden'
    }

    locks.push(token)
  }

  const unlock = (token: PopupToken): void => {
    const index = locks.indexOf(token)
    if (index === -1) return

    locks.splice(index, 1)

    // 最後一筆鎖被撤除 → 還原鎖定前保存的 body inline 樣式。
    if (!locks.length && canUseDOM) {
      document.body.style.paddingRight = savedPaddingRight
      document.body.style.overflow = savedOverflow
    }
  }

  return { add, remove, lock, unlock, isTop, isBottom, getIndex }
}

// 應用端共用的單例：跨所有 BaseModal 共享同一個堆疊與鎖定狀態。
// 採惰性建立，並只在 client 端真正持有狀態（SSR 不需堆疊管理）。
let singleton: PopupsManager | null = null

/**
 * 取得全應用共用的浮層管理器單例（Nuxt 自動 import，無需註冊 plugin）。
 * 所有 BaseModal 透過它協調堆疊順序與背景捲動鎖定。
 */
export function usePopupsManager(): PopupsManager {
  if (!singleton) singleton = createPopupsManager()
  return singleton
}
