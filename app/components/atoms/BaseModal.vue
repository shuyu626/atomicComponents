<template>
  <Teleport to="body">
    <!--
      用單一 <Transition> 包整個 overlay：open=false 時播完 leave 動畫才由 v-if 卸載，
      不需額外的「延遲卸載」本地狀態。backdrop 與 panel 各自有 CSS 進出場效果。
    -->
    <Transition
      appear
      name="base-modal"
      @after-enter="emit('opened')"
      @after-appear="emit('opened')"
      @after-leave="emit('closed')"
    >
      <div
        v-if="open"
        class="base-modal"
        role="presentation"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div
          v-if="showBackdrop"
          class="base-modal__backdrop"
          aria-hidden="true"
        />

        <div
          :id="id"
          ref="panelRef"
          class="base-modal__panel"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="title ? titleId : undefined"
          :aria-label="!title ? ariaLabel : undefined"
          :aria-describedby="bodyId"
        >
          <button
            v-if="!hideCloseButton"
            type="button"
            class="base-modal__close"
            :aria-label="closeLabel"
            @click="close"
          >
            <span aria-hidden="true">&times;</span>
          </button>

          <header v-if="$slots.header || title" class="base-modal__header">
            <!-- 有 #header 則完全交給使用者；否則渲染預設標題（供 aria-labelledby 連結）。 -->
            <slot name="header" :close="close">
              <h2 :id="titleId" class="base-modal__title">{{ title }}</h2>
            </slot>
          </header>

          <div :id="bodyId" class="base-modal__body">
            <slot :close="close" />
          </div>

          <footer v-if="$slots.footer" class="base-modal__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, useId, useTemplateRef, watch } from 'vue'

import { useOverlay } from '~/composables/useOverlay'

interface BaseModalProps {
  /** 標題列文字。設定後會渲染預設標題並自動接上 `aria-labelledby`。 */
  title?: string
  /**
   * 對話框的無障礙名稱。無 `title`（或自訂 `#header` 未連結標題）時用它當 `aria-label`，
   * 避免螢幕閱讀器念出「未命名對話框」。有 `title` 時以 `aria-labelledby` 為準、此值忽略。
   */
  ariaLabel?: string
  /** 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫。 @default '關閉' */
  closeLabel?: string
  /**
   * 關閉前攔截。提供時，所有關閉入口（Esc / 點外部 / 關閉鈕 / slot `close()`）都會先
   * 呼叫它並暫不關閉；需在內部呼叫 `done()` 才真正關閉。適合「未儲存，確定離開？」確認流程。
   * 透過 `v-model` 由父層直接改值（程式化關閉）不會觸發。
   */
  beforeClose?: (done: () => void) => void
  /** 隱藏半透明遮罩（仍保留點擊外部關閉的行為）。 @default false */
  hideBackdrop?: boolean
  /** 隱藏右上角的關閉按鈕。 @default false */
  hideCloseButton?: boolean
  /** 點擊面板外部（遮罩區）是否關閉。 @default true */
  closeOnBackdrop?: boolean
  /** 按 Esc 是否關閉（僅最上層 modal 會回應）。 @default true */
  closeOnEscape?: boolean
  /** 開啟時是否鎖定背景捲動（並補捲軸寬度避免版面跳動）。 @default true */
  lockScroll?: boolean
}

const props = withDefaults(defineProps<BaseModalProps>(), {
  title: undefined,
  ariaLabel: undefined,
  closeLabel: '關閉',
  beforeClose: undefined,
  hideBackdrop: false,
  hideCloseButton: false,
  closeOnBackdrop: true,
  closeOnEscape: true,
  lockScroll: true,
})

// 父層綁 v-model => 受控;沒綁 => 內部狀態（預設關閉）。
const open = defineModel<boolean>({ default: false })

const emit = defineEmits<{
  /** 開始開啟（進場動畫前）。 */
  open: []
  /** 開啟完成（進場動畫後）。 */
  opened: []
  /** 開始關閉（離場動畫前）。 */
  close: []
  /** 關閉完成（離場動畫後）。 */
  closed: []
}>()

/**
 * 關閉時統一經此把關：有 `beforeClose` 則交由它決定何時呼叫 `done()`，否則直接關閉。
 * 開啟方向不攔截。所有「使用者觸發」的關閉路徑（Esc / 點外部 / 關閉鈕 / slot close）皆寫入
 * 此 ref，因此都會過 `beforeClose`；父層透過 `v-model` 直接改 `open` 屬於程式化關閉、不經此。
 */
const guardedOpen = computed<boolean>({
  get: () => open.value,
  set(value) {
    if (value) {
      open.value = true
      return
    }
    if (props.beforeClose) {
      props.beforeClose(() => {
        open.value = false
      })
    }
    else {
      open.value = false
    }
  },
})

function close() {
  guardedOpen.value = false
}

// 生命週期事件（對齊 BaseDrawer）：
// - open / close（動畫「前」）：watch 預設 flush:'pre'，在 DOM 更新與動畫開始前發出。
//   掛載時即為開啟者 watch 不會觸發，故 onMounted 補發 open（修正 appear 只發 opened 的不對稱）。
// - opened / closed（動畫「後」）：由 <Transition> 的 after-enter / after-leave hook 發出。
watch(open, (value) => {
  emit(value ? 'open' : 'close')
})

onMounted(() => {
  if (open.value) emit('open')
})

defineSlots<{
  /** 對話框主體內容。slot props 提供 `close()`。 */
  default?: (props: { close: () => void }) => unknown
  /** 自訂整個標題列（會覆蓋預設 `title` 標題）。 */
  header?: (props: { close: () => void }) => unknown
  /** 底部動作區（如「取消 / 確認」按鈕）。未提供則不渲染 footer。 */
  footer?: (props: { close: () => void }) => unknown
}>()

const id = useId()
const titleId = `${id}-title`
const bodyId = `${id}-body`

const panelRef = useTemplateRef<HTMLElement>('panelRef')

// 浮層共用行為（focus-trap / Esc / 點外部關閉 / scroll-lock / 堆疊 / 遮罩渲染）
// 抽到 useOverlay，與 BaseDialog 共用同一套堆疊與 focus-trap 堆疊。
// 傳入 guardedOpen：useOverlay 內部關閉（Esc / 點外部）也會過 beforeClose 把關。
const { showBackdrop, onOverlayMousedown, onOverlayClick } = useOverlay(panelRef, guardedOpen, {
  closeOnEscape: () => props.closeOnEscape,
  closeOnBackdrop: () => props.closeOnBackdrop,
  lockScroll: () => props.lockScroll,
  hideBackdrop: () => props.hideBackdrop,
})
</script>

<style scoped lang="scss">
.base-modal {
  // 可由使用者覆寫的視覺 token。
  --modal-backdrop: rgb(0 0 0 / 60%);
  --modal-bg: #ffffff;
  --modal-color: #1f2937;
  --modal-radius: 0.75rem;
  --modal-shadow: 0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%);
  --modal-width: 32rem;
  --modal-padding: 1.5rem;
  --modal-z: 1100;

  position: fixed;
  z-index: var(--modal-z);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  inset: 0;

  &__backdrop {
    position: fixed;
    z-index: -1;
    background: var(--modal-backdrop);
    inset: 0;
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: var(--modal-width);
    max-height: calc(100vh - 2rem);
    overflow: hidden;
    color: var(--modal-color);
    background: var(--modal-bg);
    border-radius: var(--modal-radius);
    box-shadow: var(--modal-shadow);
  }

  &__close {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    padding: 0;
    font-size: 1.5rem;
    line-height: 1;
    color: inherit;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 0.375rem;
    transition: background-color 0.15s ease;

    &:hover {
      background: rgb(0 0 0 / 6%);
    }
  }

  &__header {
    padding: var(--modal-padding);
    padding-right: 3rem; // 留空間給關閉鈕
    border-bottom: 1px solid #e5e7eb;
  }

  &__title {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  &__body {
    flex: 1 1 auto;
    padding: var(--modal-padding);
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: var(--modal-padding);
    border-top: 1px solid #e5e7eb;
  }
}

// 進出場：遮罩淡入、面板淡入 + 輕微縮放上移。
.base-modal-enter-active,
.base-modal-leave-active {
  transition: opacity 0.2s ease;

  .base-modal__panel {
    transition: transform 0.2s ease, opacity 0.2s ease;
  }
}

.base-modal-enter-from,
.base-modal-leave-to {
  opacity: 0;

  .base-modal__panel {
    transform: translateY(8px) scale(0.98);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-modal-enter-active,
  .base-modal-leave-active,
  .base-modal-enter-active .base-modal__panel,
  .base-modal-leave-active .base-modal__panel {
    transition: none;
  }
}
</style>
