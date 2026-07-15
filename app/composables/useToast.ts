import { readonly, shallowReactive } from 'vue'

/** Toast 語意類型：決定圖示、顏色與無障礙的播報優先度。 */
export type ToastType = 'info' | 'success' | 'warning' | 'error'

/**
 * 出現位置（垂直 × 水平）。容器會把相同 placement 的 toast 收進同一個固定區塊堆疊，
 * 不同 placement 各自獨立，互不影響。
 */
export type ToastPlacement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'

/** 推一筆 toast 時可帶的設定。`message` 必填，其餘皆有預設值。 */
export interface ToastOptions {
  /** 主要訊息（必填，純文字）。需要富文字 / 元件請改用宣告式 `<BaseToast>` 的 `#default` slot。 */
  message: string
  /** 選填標題：渲染在訊息上方、字重較粗。 */
  title?: string
  /** 語意類型。 @default 'info' */
  type?: ToastType
  /** 自動消失時間（ms）；設 `0` 則常駐不自動關閉。 @default 3000 */
  duration?: number
  /** 是否顯示關閉按鈕。 @default true */
  closable?: boolean
  /** 是否在底部顯示倒數進度條（隨 `duration` 縮短）；`duration: 0` 時自動不顯示。 @default false */
  progress?: boolean
  /** 出現位置。 @default 'top-end' */
  placement?: ToastPlacement
  /** toast 被移除（自動消失 / 手動關閉 / 被擠掉 / clear）時呼叫。 */
  onClose?: () => void
}

/** 佇列中一筆已正規化（填妥預設值並配發 id）的 toast。 */
export interface ToastItem {
  /** 唯一識別碼，作為 `v-for` key 與 `dismiss(id)` 的依據。 */
  id: string
  message: string
  title: string | undefined
  type: ToastType
  duration: number
  closable: boolean
  progress: boolean
  placement: ToastPlacement
  onClose: (() => void) | undefined
}

/** 捷徑方法（success / error…）可帶的設定：不含 `message` 與 `type`（由方法本身決定）。 */
export type ToastShortcutOptions = Omit<ToastOptions, 'message' | 'type'>

/** Toast 管理器：持有 reactive 佇列並提供推入 / 移除的命令式 API。 */
export interface ToastManager {
  /** 唯讀的 reactive 佇列；交給 `BaseToastContainer` 渲染，外部請勿直接 mutate。 */
  toasts: readonly ToastItem[]
  /**
   * 推一筆 toast；可傳完整設定物件或只傳訊息字串。回傳該筆 id。
   * SSR 期呼叫為 no-op 並回傳空字串（toast 僅支援 client 端觸發；`dismiss('')` 亦為 no-op）。
   */
  show: (options: ToastOptions | string) => string
  /** 捷徑：推一筆 `type: 'success'` 的 toast。 */
  success: (message: string, options?: ToastShortcutOptions) => string
  /** 捷徑：推一筆 `type: 'error'` 的 toast。 */
  error: (message: string, options?: ToastShortcutOptions) => string
  /** 捷徑：推一筆 `type: 'warning'` 的 toast。 */
  warning: (message: string, options?: ToastShortcutOptions) => string
  /** 捷徑：推一筆 `type: 'info'` 的 toast。 */
  info: (message: string, options?: ToastShortcutOptions) => string
  /** 依 id 移除一筆（不存在則為 no-op）。 */
  dismiss: (id: string) => void
  /** 清空所有 toast。 */
  clear: () => void
}

/** 建立管理器時可覆寫的全域預設值。 */
export interface CreateToastManagerOptions {
  /** 同時最多顯示幾筆；超過時自動移除最舊的。 @default 5 */
  max?: number
  /** 預設自動消失時間（ms）；`0` = 常駐。 @default 3000 */
  duration?: number
  /** 預設出現位置。 @default 'top-end' */
  placement?: ToastPlacement
  /** 預設是否顯示倒數進度條。 @default false */
  progress?: boolean
}

const DEFAULT_MAX = 5
const DEFAULT_DURATION = 3000
const DEFAULT_PLACEMENT: ToastPlacement = 'top-end'
const DEFAULT_PROGRESS = false

// 跨所有管理器實例遞增的種子，保證 id 全域唯一且穩定（不依賴 Date / random，SSR 也安全）。
let seed = 0

/**
 * 建立一個獨立的 toast 管理器實例。測試可用它取得彼此隔離的乾淨佇列；
 * 應用端請改用 {@link useToast} 取得共用單例。
 *
 * @param options 覆寫全域預設值（max / duration / placement / progress）
 */
export function createToastManager(options: CreateToastManagerOptions = {}): ToastManager {
  const max = options.max ?? DEFAULT_MAX
  const defaultDuration = options.duration ?? DEFAULT_DURATION
  const defaultPlacement = options.placement ?? DEFAULT_PLACEMENT
  const defaultProgress = options.progress ?? DEFAULT_PROGRESS

  // shallowReactive：容器以 computed 依 placement 分組並 v-for 渲染，佇列增減需觸發響應式更新；
  // 個別 item 為一次性正規化的純資料，不需深層響應。
  const toasts = shallowReactive<ToastItem[]>([])

  /** 自佇列移除指定索引的 item，並觸發其 onClose 回呼。 */
  function removeAt(index: number): void {
    const [removed] = toasts.splice(index, 1)
    removed?.onClose?.()
  }

  function show(options: ToastOptions | string): string {
    // SSR 防禦：manager 常以 module 單例存在，server 端跨請求共享——入佇列的 toast
    // 會洩漏到後續所有請求的首渲輸出且永不消失（server 沒有計時器消化佇列）。
    // server 端一律 no-op；toast 本質是 client 互動回饋，SSR 首渲不該有。
    if (import.meta.server) {
      if (import.meta.env.DEV) {
        console.warn('[useToast] show() 在 server 端被忽略：toast 僅支援 client 端觸發。')
      }
      return ''
    }

    const normalized: ToastOptions
      = typeof options === 'string' ? { message: options } : options

    const item: ToastItem = {
      id: `toast-${++seed}`,
      message: normalized.message,
      title: normalized.title,
      type: normalized.type ?? 'info',
      // 用 ?? 而非 ||：明確傳入 0（常駐）不應被預設值蓋掉。
      duration: normalized.duration ?? defaultDuration,
      closable: normalized.closable ?? true,
      progress: normalized.progress ?? defaultProgress,
      placement: normalized.placement ?? defaultPlacement,
      onClose: normalized.onClose,
    }

    toasts.push(item)

    // 超過上限 → 從最舊的開始擠掉，避免畫面被洗版。
    while (toasts.length > max) {
      removeAt(0)
    }

    return item.id
  }

  function shortcut(type: ToastType) {
    return (message: string, options: ToastShortcutOptions = {}): string =>
      show({ ...options, message, type })
  }

  function dismiss(id: string): void {
    const index = toasts.findIndex(toast => toast.id === id)
    if (index !== -1) removeAt(index)
  }

  function clear(): void {
    // 取出全部後清空，逐筆觸發 onClose。
    for (const toast of toasts.splice(0)) toast.onClose?.()
  }

  return {
    toasts: readonly(toasts) as readonly ToastItem[],
    show,
    success: shortcut('success'),
    error: shortcut('error'),
    warning: shortcut('warning'),
    info: shortcut('info'),
    dismiss,
    clear,
  }
}

// 應用端共用的單例：所有 useToast() 呼叫端與 BaseToastContainer 共享同一個佇列。
let singleton: ToastManager | null = null

/**
 * 取得全應用共用的 toast 管理器單例（Nuxt 自動 import，無需註冊 plugin）。
 *
 * 在任何元件 / composable 內呼叫 `useToast().success('已儲存')` 即可推播；
 * 畫面渲染由掛在 app 根層的單一 `<BaseToastContainer />` 負責。
 *
 * 需要自訂上限 / 預設值或測試隔離時，改用 {@link createToastManager}。
 */
export function useToast(): ToastManager {
  if (!singleton) singleton = createToastManager()
  return singleton
}
