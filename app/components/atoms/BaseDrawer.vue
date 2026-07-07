<template>
  <Teleport to="body">
    <!--
      用單一 <Transition> 包整個 overlay：open=false 時播完 leave 動畫才由 v-if 卸載。
      backdrop 淡入淡出、panel 依 anchor 從對應邊緣滑入。與 BaseModal / BaseDialog
      共用 useOverlay（focus-trap 堆疊、Esc / 點外部關閉、scroll-lock、遮罩）。
      進出場 hook 對應 Element Plus 的 open / opened / close / closed 生命週期事件。
    -->
    <Transition
      appear
      :name="`base-drawer-${anchor}`"
      @after-enter="emit('opened')"
      @after-appear="emit('opened')"
      @after-leave="emit('closed')"
    >
      <div
        v-if="open"
        class="base-drawer"
        :class="`base-drawer--${anchor}`"
        role="presentation"
        :style="{ '--drawer-size': toUnit(size), '--drawer-z': zIndex }"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div
          v-if="showBackdrop"
          class="base-drawer__backdrop"
          aria-hidden="true"
        />

        <div
          :id="id"
          ref="panelRef"
          class="base-drawer__panel"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="hasTitle ? titleId : undefined"
          :aria-label="!hasTitle ? ariaLabel : undefined"
        >
          <!-- 背景圖層（純裝飾，墊在內容後方）。#image slot 可完全自訂。 -->
          <div
            v-if="hasImage"
            class="base-drawer__image"
            aria-hidden="true"
          >
            <slot name="image">
              <img class="base-drawer__image-media" :src="image" alt="" />
            </slot>
          </div>

          <header v-if="hasHeader" class="base-drawer__header">
            <span :id="titleId" class="base-drawer__title">
              <slot name="title">{{ title }}</slot>
            </span>

            <button
              v-if="!hideCloseButton"
              type="button"
              class="base-drawer__close"
              :aria-label="closeLabel"
              @click="close"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </header>

          <div class="base-drawer__body">
            <slot :close="close" />
          </div>

          <footer v-if="$slots.footer" class="base-drawer__footer">
            <slot name="footer" :close="close" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'

import { useOverlay } from '~/composables/useOverlay'
import { useOverlayLifecycle } from '~/composables/useOverlayLifecycle'
import toUnit from '~/utils/toUnit'

export type DrawerAnchor = 'top' | 'right' | 'bottom' | 'left'

export interface BaseDrawerProps {
  /** 標題列文字。設定後渲染預設標題並自動接 `aria-labelledby`。 */
  title?: string
  /**
   * 抽屜的無障礙名稱。無 `title`（也未用 `#title` slot）時用作 `aria-label`，
   * 避免螢幕閱讀器念出「未命名對話框」。有標題時以 `aria-labelledby` 為準、此值忽略。
   */
  ariaLabel?: string
  /** 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫。 @default '關閉' */
  closeLabel?: string
  /** 停靠邊緣，決定滑入方向與版型。 @default 'right' */
  anchor?: DrawerAnchor
  /**
   * 抽屜尺寸：左右停靠時為「寬」、上下停靠時為「高」。
   * 數字補 `px`，字串原樣（如 `'50%'`、`'30rem'`）。 @default 320
   */
  size?: number | string
  /**
   * 背景圖片網址（純裝飾，墊在內容後方）。需要更複雜的背景（漸層、`<picture>`、
   * 遮罩）時改用 `#image` slot。可搭配 `--drawer-image-overlay` token 疊一層遮罩提升可讀性。
   */
  image?: string
  /**
   * 關閉前攔截。提供時，所有關閉入口（Esc / 點外部 / 關閉鈕 / slot `close()`）都會先
   * 呼叫它並暫不關閉；需在內部呼叫 `done()` 才真正關閉。適合「未儲存，確定離開？」確認流程。
   * 透過 `v-model` 由父層直接改值（程式化關閉）不會觸發。
   */
  beforeClose?: (done: () => void) => void
  /** 是否渲染整個標題列（含標題與關閉鈕）。設 `false` 完全不渲染 header。 @default true */
  withHeader?: boolean
  /** 隱藏標題列的關閉鈕。 @default false */
  hideCloseButton?: boolean
  /** 隱藏半透明遮罩（仍保留點擊外部關閉行為）。 @default false */
  hideBackdrop?: boolean
  /** 點擊面板外部（遮罩區）是否關閉。 @default true */
  closeOnBackdrop?: boolean
  /** 按 Esc 是否關閉（僅最上層回應）。 @default true */
  closeOnEscape?: boolean
  /** 開啟時是否鎖定背景捲動。 @default true */
  lockScroll?: boolean
}

const props = withDefaults(defineProps<BaseDrawerProps>(), {
  title: undefined,
  ariaLabel: undefined,
  closeLabel: '關閉',
  anchor: 'right',
  size: 320,
  image: undefined,
  beforeClose: undefined,
  withHeader: true,
  hideCloseButton: false,
  hideBackdrop: false,
  closeOnBackdrop: true,
  closeOnEscape: true,
  lockScroll: true,
})

// 父層綁 v-model => 受控；沒綁 => 內部狀態（預設關閉）。
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

// 關閉把關（beforeClose）與生命週期 open / close 事件（動畫「前」）抽到
// useOverlayLifecycle（與 BaseModal 共用同一套樣板）：所有「使用者觸發」的關閉路徑
// （Esc / 點外部 / 關閉鈕 / slot close）皆寫入 guardedOpen、會過 beforeClose；
// 父層透過 v-model 直接改 open 屬於程式化關閉、不經此。
// opened / closed（動畫「後」）仍由 <Transition> 的 after-enter / after-leave hook 發出。
const { guardedOpen, close } = useOverlayLifecycle(open, {
  beforeClose: () => props.beforeClose,
  emitOpen: () => emit('open'),
  emitClose: () => emit('close'),
})

const slots = defineSlots<{
  /** 抽屜主體內容。slot props 提供 `close()`。 */
  default?: (props: { close: () => void }) => unknown
  /** 自訂標題內容（取代 `title` 文字，仍會接 `aria-labelledby`）。 */
  title?: () => unknown
  /** 自訂背景圖層（取代 `image` 預設 `<img>`，可放漸層 / `<picture>` 等）。 */
  image?: () => unknown
  /** 底部動作區（如「取消 / 確認」）。未提供則不渲染 footer。 */
  footer?: (props: { close: () => void }) => unknown
}>()

const id = useId()
const titleId = `${id}-title`

// 有標題（prop 或 #title slot）才接 aria-labelledby，否則用 ariaLabel。
const hasTitle = computed(() => !!props.title || !!slots.title)
// withHeader 為總開關；其下，有標題、或仍要顯示關閉鈕時才渲染 header。
const hasHeader = computed(() => props.withHeader && (hasTitle.value || !props.hideCloseButton))
// 有 image prop 或 #image slot 才渲染背景圖層。
const hasImage = computed(() => !!props.image || !!slots.image)

const panelRef = useTemplateRef<HTMLElement>('panelRef')

// 共用浮層行為（與 BaseModal / BaseDialog 同一套堆疊 / focus-trap 堆疊）。
// 傳入 guardedOpen：useOverlay 內部關閉（Esc / 點外部）也會過 beforeClose 把關。
const { showBackdrop, zIndex, onOverlayMousedown, onOverlayClick } = useOverlay(panelRef, guardedOpen, {
  closeOnEscape: () => props.closeOnEscape,
  closeOnBackdrop: () => props.closeOnBackdrop,
  lockScroll: () => props.lockScroll,
  hideBackdrop: () => props.hideBackdrop,
})
</script>

<style scoped lang="scss">
.base-drawer {
  // 可由使用者覆寫的視覺 token。
  --drawer-backdrop: rgb(0 0 0 / 60%);
  --drawer-bg: #ffffff;
  --drawer-color: #1f2937;
  --drawer-shadow: 0 0 20px rgb(0 0 0 / 12%);
  --drawer-size: 320px;
  --drawer-padding: 1rem 1.5rem;
  --drawer-image-overlay: transparent;
  --drawer-z: 1100;

  position: fixed;
  z-index: var(--drawer-z);
  inset: 0;

  &__backdrop {
    position: fixed;
    z-index: -1;
    background: var(--drawer-backdrop);
    inset: 0;
  }

  &__panel {
    position: fixed;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    color: var(--drawer-color);
    background: var(--drawer-bg);
    box-shadow: var(--drawer-shadow);
  }

  // 依停靠邊緣決定面板貼齊位置與尺寸（側邊欄不加圓角，貼齊邊緣）。
  &--top &__panel {
    top: 0;
    right: 0;
    left: 0;
    height: var(--drawer-size);
    max-height: 100%;
  }

  &--right &__panel {
    top: 0;
    right: 0;
    bottom: 0;
    width: var(--drawer-size);
    max-width: 100%;
  }

  &--bottom &__panel {
    right: 0;
    bottom: 0;
    left: 0;
    height: var(--drawer-size);
    max-height: 100%;
  }

  &--left &__panel {
    top: 0;
    bottom: 0;
    left: 0;
    width: var(--drawer-size);
    max-width: 100%;
  }

  // 背景圖層：填滿面板、墊在內容後方（內容以 z-index:1 浮於其上）。
  &__image {
    position: absolute;
    z-index: 0;
    overflow: hidden;
    inset: 0;
    pointer-events: none;

    // 可選遮罩：預設透明，覆寫 --drawer-image-overlay 可加深以提升文字可讀性。
    &::after {
      position: absolute;
      inset: 0;
      content: '';
      background: var(--drawer-image-overlay);
    }
  }

  &__image-media {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__header,
  &__body,
  &__footer {
    position: relative;
    z-index: 1;
  }

  &__header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    padding: var(--drawer-padding);
  }

  &__title {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 1.25rem;
    font-weight: 700;
  }

  &__close {
    display: inline-flex;
    flex-shrink: 0;
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

  &__body {
    flex: 1 1 auto;
    padding: var(--drawer-padding);
    overflow-y: auto;
  }

  // 有 header 時主體上緣不重複留白。
  &__header + &__body {
    padding-top: 0;
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: var(--drawer-padding);
  }
}

// ── 進出場：backdrop 淡入；panel 從停靠邊緣滑入 ──────────────────────────────
// 每個 anchor 對應 panel 的起始位移（離場相同）。
$drawer-slides: (
  'top': translateY(-100%),
  'right': translateX(100%),
  'bottom': translateY(100%),
  'left': translateX(-100%),
);

@each $anchor, $from in $drawer-slides {
  .base-drawer-#{$anchor}-enter-active,
  .base-drawer-#{$anchor}-leave-active {
    transition: opacity 0.2s ease;

    .base-drawer__panel {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
  }

  .base-drawer-#{$anchor}-enter-from,
  .base-drawer-#{$anchor}-leave-to {
    opacity: 0;

    .base-drawer__panel {
      transform: $from;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  @each $anchor, $from in $drawer-slides {
    .base-drawer-#{$anchor}-enter-active,
    .base-drawer-#{$anchor}-leave-active {
      .base-drawer__panel {
        transition: none;
        transform: none;
      }
    }
  }
}
</style>
