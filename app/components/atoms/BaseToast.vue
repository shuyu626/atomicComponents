<template>
  <div
    class="base-toast"
    :class="`base-toast--${type}`"
    :role="role"
    :aria-live="ariaLive"
    :aria-atomic="ariaAtomic"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @focusin="onFocusIn"
    @focusout="onFocusOut"
  >
    <!-- 前置圖示（leading）：預設為類型圓形徽章；可用 #icon 換成自訂圖示（如 v-icon）。 -->
    <span class="base-toast__leading" aria-hidden="true">
      <slot name="icon">
        <span class="base-toast__icon">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="iconPath" />
          </svg>
        </span>
      </slot>
    </span>

    <div class="base-toast__content">
      <p v-if="title" class="base-toast__title">{{ title }}</p>
      <!-- 內文：預設渲染 message，可用 #default 放自訂內容；皆無則不渲染空段落。 -->
      <p v-if="message || slots.default" class="base-toast__message">
        <slot>{{ message }}</slot>
      </p>
    </div>

    <!-- 後置區（trailing）：訊息後、關閉鈕前；可放「復原」等動作或自訂圖示。 -->
    <span v-if="slots.action" class="base-toast__action">
      <slot name="action" :close="onClose" />
    </span>

    <button
      v-if="closable"
      type="button"
      class="base-toast__close"
      :aria-label="closeLabel"
      @click="onClose"
    >
      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>

    <!-- 倒數進度條：寬度隨 duration 由滿到空；hover / focus 與計時同步暫停。 -->
    <div
      v-if="showProgress"
      class="base-toast__progress"
      :style="{
        animationDuration: `${duration}ms`,
        animationPlayState: paused ? 'paused' : 'running',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import type { ToastType } from '~/composables/useToast'

interface BaseToastProps {
  /** 主要訊息（可用 `#default` slot 取代）。 */
  message?: string
  /** 選填標題，渲染在訊息上方。 */
  title?: string
  /** 語意類型，決定圖示、顏色與無障礙播報優先度。 @default 'info' */
  type?: ToastType
  /** 自動消失時間（ms，即 timeout）；`0` = 常駐不自動關閉。 @default 3000 */
  duration?: number
  /** 是否顯示關閉按鈕。 @default true */
  closable?: boolean
  /** 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫。 @default '關閉通知' */
  closeLabel?: string
  /** 是否在底部顯示倒數進度條（`duration: 0` 時自動不顯示）。 @default false */
  progress?: boolean
  /**
   * 設為 `true` 時移除自身的 live region 語意（`role` / `aria-live` / `aria-atomic`），
   * 但保留視覺與互動（關閉鈕仍可聚焦）。`BaseToastContainer` 佇列渲染時會啟用，
   * 改由容器的持久 live region 統一朗讀，避免「視覺 toast + 容器 announcer」重複播報。
   * @default false
   */
  presentational?: boolean
}

const props = withDefaults(defineProps<BaseToastProps>(), {
  message: undefined,
  title: undefined,
  type: 'info',
  duration: 3000,
  closable: true,
  closeLabel: '關閉通知',
  progress: false,
  presentational: false,
})

const emit = defineEmits<{
  /** 自動消失到期或使用者點關閉鈕時觸發；由容器負責真正自佇列移除。 */
  close: []
}>()

const slots = defineSlots<{
  /** 內文（取代 `message` prop）。 */
  default?: () => unknown
  /** 前置圖示（取代預設的類型圓形徽章），可放任意圖示元件。 */
  icon?: () => unknown
  /** 後置動作區（訊息後、關閉鈕前），slot prop 提供 `close()`。 */
  action?: (props: { close: () => void }) => unknown
}>()

// 各類型對應的「純字形」描邊圖示（24×24，無外框；外框由 .base-toast__icon 圓形徽章提供）。
// 用 stroke 而非 fill：線寬一致、對稱乾淨，`h.01` 搭配 round linecap 形成圓點。
const ICON_PATHS: Record<ToastType, string> = {
  success: 'M5 13l4 4L19 7', // 勾
  warning: 'M12 7v6M12 17h.01', // 驚嘆號
  error: 'M12 7v6M12 17h.01', // 驚嘆號（以顏色與 warning 區分）
  info: 'M12 8h.01M12 11v5', // 資訊 i
}

const iconPath = computed(() => ICON_PATHS[props.type])

// error / warning 屬即時且重要 → role="alert"（隱含 assertive）打斷播報；
// success / info 屬一般提示 → role="status"（隱含 polite）等空檔再播。
// presentational 模式下移除全部 live 語意,交給容器的持久 live region 統一朗讀。
const role = computed(() =>
  props.presentational
    ? undefined
    : props.type === 'error' || props.type === 'warning'
      ? 'alert'
      : 'status',
)
const ariaLive = computed(() =>
  props.presentational ? undefined : role.value === 'alert' ? 'assertive' : 'polite',
)
const ariaAtomic = computed(() => (props.presentational ? undefined : 'true'))

// 進度條只在「要求顯示且有倒數」時出現。
const showProgress = computed(() => props.progress && props.duration > 0)

// ── 自動消失計時（hover / focus 暫停，移開後以剩餘時間續跑）─────────────────────
// paused 同時驅動 JS 計時器與 CSS 進度條動畫，兩者一致暫停 / 續跑。
// hover 與 focus 各自獨立追蹤：只有「兩者都離開」才續跑，避免鍵盤聚焦中
// 因滑鼠移開（mouseleave）就把 toast 抽走。
const paused = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined
// 用 Date.now 量已耗時間：測試以 vi.useFakeTimers 同時 mock Date 與 setTimeout，可精準驗證暫停。
let remaining = props.duration
let startedAt = 0
let hovered = false
let focused = false

function clearTimer() {
  if (!timer) return
  clearTimeout(timer)
  timer = undefined
}

function startTimer() {
  if (!props.duration || remaining <= 0) return
  startedAt = Date.now()
  timer = setTimeout(() => emit('close'), remaining)
}

/** 依 hover / focus 綜合狀態切換暫停：暫停時扣掉已耗時間，續跑時以剩餘時間重啟。 */
function setPaused(next: boolean) {
  if (next === paused.value) return
  paused.value = next
  if (next) {
    if (!timer) return
    clearTimer()
    remaining -= Date.now() - startedAt
  }
  else {
    startTimer()
  }
}

function onMouseEnter() {
  hovered = true
  setPaused(true)
}

function onMouseLeave() {
  hovered = false
  setPaused(focused) // 焦點仍在則維持暫停
}

function onFocusIn() {
  focused = true
  setPaused(true)
}

function onFocusOut(event: FocusEvent) {
  // 焦點僅在 toast 內部移動（如 Tab 到關閉鈕）不算離開。
  const root = event.currentTarget
  if (root instanceof Node && event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return
  focused = false
  setPaused(hovered) // 滑鼠仍懸停則維持暫停
}

function onClose() {
  emit('close')
}

onMounted(startTimer)
onUnmounted(clearTimer)
</script>

<style scoped lang="scss">
.base-toast {
  // ── 可覆寫的視覺 token（預設 info 藍）───────────────────────────────────────
  --toast-accent: #4a93d9; // 強調色：左側條、圖示徽章、關閉鈕、進度條
  --toast-surface: #e9f2fb; // 卡片柔色底
  --toast-title-color: #1f2937;
  --toast-message-color: #4b5563;
  --toast-radius: 10px;
  --toast-accent-width: 6px; // 左側強調條寬
  --toast-shadow: 0 6px 16px -6px rgb(0 0 0 / 18%);
  --toast-width: 22rem;
  --toast-padding: 0.875rem 1rem;
  --toast-gap: 0.75rem;

  position: relative;
  display: flex;
  align-items: flex-start;
  width: var(--toast-width);
  max-width: calc(100vw - 2rem);
  padding: var(--toast-padding);
  overflow: hidden; // 讓進度條 / 左側條貼齊圓角
  word-break: break-word;
  background: var(--toast-surface);
  border-left: var(--toast-accent-width) solid var(--toast-accent);
  border-radius: var(--toast-radius);
  box-shadow: var(--toast-shadow);
  column-gap: var(--toast-gap);
  pointer-events: auto; // 容器為 none，toast 本體要能接收 hover / 點擊

  // 各類型：強調色 + 柔色底（對齊參考圖一）。
  &--success {
    --toast-accent: #2e9e63;
    --toast-surface: #e8f6ee;
  }

  &--warning {
    --toast-accent: #e0a32e;
    --toast-surface: #fdf4e3;
  }

  &--error {
    --toast-accent: #e0564d;
    --toast-surface: #fdebe9;
  }

  &--info {
    --toast-accent: #4a93d9;
    --toast-surface: #e9f2fb;
  }

  &__leading {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: 1.375rem; // 與標題行高對齊
  }

  // 預設圓形實心徽章：強調色底 + 白色字形。
  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.375rem;
    height: 1.375rem;
    color: #fff;
    background: var(--toast-accent);
    border-radius: 50%;
  }

  &__content {
    flex: 1 1 auto;
    min-width: 0; // 允許長字串在 flex 內換行而非撐破
  }

  &__title {
    margin: 0 0 0.125rem;
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.375rem;
    color: var(--toast-title-color);
  }

  &__message {
    margin: 0;
    font-size: 0.875rem;
    line-height: 1.45;
    color: var(--toast-message-color);
  }

  &__action {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    align-self: center;
  }

  &__close {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    color: var(--toast-accent); // 同色 ×（對齊參考圖一）
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 0.25rem;
    opacity: 0.85;
    transition: opacity 0.15s ease, background-color 0.15s ease;

    &:hover {
      opacity: 1;
      background: rgb(0 0 0 / 6%);
    }
  }

  &__progress {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--toast-accent);
    opacity: 0.45;
    transform-origin: left center;
    animation: base-toast-progress linear forwards;
  }
}

@keyframes base-toast-progress {
  from {
    transform: scaleX(1);
  }

  to {
    transform: scaleX(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-toast__progress {
    animation: none;
  }
}
</style>
