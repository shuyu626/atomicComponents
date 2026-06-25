<template>
  <Teleport to="body">
    <!--
      用單一 <Transition> 包整個 overlay：open=false 時播完 leave 動畫才由 v-if 卸載。
      backdrop 淡入淡出、wrapper 依 transition 變體進出場。
    -->
    <Transition appear :name="`base-dialog-${transition}`">
      <div
        v-if="open"
        class="base-dialog"
        :class="{
          'base-dialog--fullscreen': fullscreen,
          'base-dialog--dragging': isDragging,
        }"
        role="presentation"
        :style="{ '--dialog-width': toUnit(width) }"
        @mousedown="onOverlayMousedown"
        @click="onOverlayClick"
      >
        <div
          v-if="showBackdrop"
          class="base-dialog__backdrop"
          aria-hidden="true"
        />

        <div
          :id="id"
          ref="panelRef"
          class="base-dialog__wrapper"
          role="dialog"
          aria-modal="true"
          tabindex="-1"
          :aria-labelledby="hasTitle ? titleId : undefined"
          :aria-label="!hasTitle ? ariaLabel : undefined"
          :aria-describedby="contentId"
          :style="wrapperStyle"
        >
          <header
            v-if="hasHeader"
            class="base-dialog__header"
            :class="{ 'base-dialog__header--draggable': dragViaHeader }"
            @pointerdown="onDragStart"
          >
            <span :id="titleId" class="base-dialog__title">
              <slot name="title">{{ title }}</slot>
            </span>

            <button
              v-if="!hideCloseButton"
              type="button"
              class="base-dialog__close"
              aria-label="關閉"
              @click="close"
              @pointerdown.stop
            >
              <span aria-hidden="true">&times;</span>
            </button>
          </header>

          <div :id="contentId" class="base-dialog__content">
            <slot :close="close" />
          </div>

          <footer v-if="$slots.footer" class="base-dialog__footer">
            <slot name="footer" :close="close" />
          </footer>

          <!--
            無標題列時的拖曳感應區：放在四邊（非整個面板），讓內容文字仍可正常選取 / 點擊。
            有標題列時改用 header 當把手（見上方），避開右側捲軸 / 底部按鈕；fullscreen 不可拖曳。
          -->
          <template v-if="dragViaSensors">
            <div
              class="base-dialog__sensor base-dialog__sensor--top"
              aria-hidden="true"
              @pointerdown="onDragStart"
            />
            <div
              class="base-dialog__sensor base-dialog__sensor--right"
              aria-hidden="true"
              @pointerdown="onDragStart"
            />
            <div
              class="base-dialog__sensor base-dialog__sensor--bottom"
              aria-hidden="true"
              @pointerdown="onDragStart"
            />
            <div
              class="base-dialog__sensor base-dialog__sensor--left"
              aria-hidden="true"
              @pointerdown="onDragStart"
            />
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'

import useDrag from '~/composables/useDrag'
import { useOverlay } from '~/composables/useOverlay'
import toUnit from '~/utils/toUnit'

type DialogTransition = 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'

interface BaseDialogProps {
  /** 標題列文字。設定後渲染預設標題並自動接 `aria-labelledby`。 */
  title?: string
  /**
   * 對話框的無障礙名稱。無 `title`（也未用 `#title` slot）時用作 `aria-label`，
   * 避免螢幕閱讀器念出「未命名對話框」。有標題時以 `aria-labelledby` 為準、此值忽略。
   */
  ariaLabel?: string
  /** 面板寬度。數字補 `px`，字串原樣（如 `'60%'`）；`fullscreen` 時忽略。 @default 640 */
  width?: number | string
  /** 全螢幕模式（撐滿視窗、不可拖曳、預設顯示關閉鈕作為關閉入口）。 @default false */
  fullscreen?: boolean
  /**
   * 可拖曳移動（`fullscreen` 時停用）。把手依有無標題列自動切換：
   * 有標題列 → 拖標題列（避開捲軸 / 按鈕）；無標題列 → 拖面板四邊感應區。
   * @default false
   */
  draggable?: boolean
  /** 進出場動畫變體。 @default 'fade' */
  transition?: DialogTransition
  /** 隱藏半透明遮罩（仍保留點擊外部關閉行為）。 @default false */
  hideBackdrop?: boolean
  /** 隱藏標題列的關閉鈕。 @default false */
  hideCloseButton?: boolean
  /** 點擊面板外部（遮罩區）是否關閉。 @default true */
  closeOnBackdrop?: boolean
  /** 按 Esc 是否關閉（僅最上層回應）。 @default true */
  closeOnEscape?: boolean
  /** 開啟時是否鎖定背景捲動。 @default true */
  lockScroll?: boolean
}

const props = withDefaults(defineProps<BaseDialogProps>(), {
  title: undefined,
  ariaLabel: undefined,
  width: 640,
  fullscreen: false,
  draggable: false,
  transition: 'fade',
  hideBackdrop: false,
  hideCloseButton: false,
  closeOnBackdrop: true,
  closeOnEscape: true,
  lockScroll: true,
})

// 父層綁 v-model => 受控；沒綁 => 內部狀態（預設關閉）。
const open = defineModel<boolean>({ default: false })

function close() {
  open.value = false
}

const slots = defineSlots<{
  /** 對話框主體內容。slot props 提供 `close()`。 */
  default?: (props: { close: () => void }) => unknown
  /** 自訂標題內容（取代 `title` 文字，仍會接 `aria-labelledby`）。 */
  title?: () => unknown
  /** 底部動作區（如「取消 / 確認」）。未提供則不渲染 footer。 */
  footer?: (props: { close: () => void }) => unknown
}>()

const id = useId()
const titleId = `${id}-title`
const contentId = `${id}-content`

// 有標題（prop 或 #title slot）才接 aria-labelledby，否則用 ariaLabel。
const hasTitle = computed(() => !!props.title || !!slots.title)
// header 在「有標題」或「全螢幕」時渲染（全螢幕需保留關閉入口）。
const hasHeader = computed(() => hasTitle.value || props.fullscreen)

const panelRef = useTemplateRef<HTMLElement>('panelRef')

// 共用浮層行為（與 BaseModal 同一套堆疊 / focus-trap 堆疊）。
const { showBackdrop, onOverlayMousedown, onOverlayClick } = useOverlay(panelRef, open, {
  closeOnEscape: () => props.closeOnEscape,
  closeOnBackdrop: () => props.closeOnBackdrop,
  lockScroll: () => props.lockScroll,
  hideBackdrop: () => props.hideBackdrop,
})

// 拖曳：限制在視窗內，fullscreen 或未開啟 draggable 時停用。
const canDrag = computed(() => props.draggable && !props.fullscreen)
const { translate, isDragging, onDragStart, reset } = useDrag(canDrag, {
  target: () => panelRef.value,
})

// 有標題列 → 用 header 當拖曳把手（避開右側捲軸 / 底部按鈕）；
// 無標題列 → 退回四邊感應區，讓內容仍可選取。
const dragViaHeader = computed(() => canDrag.value && hasHeader.value)
const dragViaSensors = computed(() => canDrag.value && !hasHeader.value)

// 關閉後把位置歸零 → 下次開啟回到置中，且讓 CSS 進出場動畫能正常接管 transform。
watch(open, (value) => {
  if (!value) reset()
})

const wrapperStyle = computed(() => {
  if (props.fullscreen) return undefined
  const { x, y } = translate.value
  // 未位移時不下 inline transform，讓進出場動畫的 transform 生效（inline 會蓋掉 CSS）。
  if (x === 0 && y === 0) return undefined
  return { transform: `translate(${toUnit(x)}, ${toUnit(y)})` }
})
</script>

<style scoped lang="scss">
.base-dialog {
  // 可由使用者覆寫的視覺 token。
  --dialog-backdrop: rgb(0 0 0 / 60%);
  --dialog-bg: #ffffff;
  --dialog-color: #1f2937;
  --dialog-radius: 0.5rem;
  --dialog-shadow: 0 20px 25px -5px rgb(0 0 0 / 10%), 0 8px 10px -6px rgb(0 0 0 / 10%);
  --dialog-width: 640px;
  --dialog-padding: 1rem 1.5rem;
  --dialog-z: 1100;

  position: fixed;
  z-index: var(--dialog-z);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  inset: 0;

  &__backdrop {
    position: fixed;
    z-index: -1;
    background: var(--dialog-backdrop);
    inset: 0;
  }

  &__wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: var(--dialog-width);
    max-width: 100%;
    // overlay 已用 padding 留白；100% 即「視窗 - padding」，不需再扣一次。
    max-height: 100%;
    overflow: hidden;
    color: var(--dialog-color);
    background: var(--dialog-bg);
    border-radius: var(--dialog-radius);
    box-shadow: var(--dialog-shadow);
  }

  &__header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
    padding: var(--dialog-padding);

    // 當 header 作為拖曳把手時，整條標題列可抓取（關閉鈕除外，見 @pointerdown.stop）。
    &--draggable {
      cursor: move;
      user-select: none;
    }
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

  &__content {
    flex: 1 1 auto;
    padding: var(--dialog-padding);
    overflow-y: auto;
  }

  // 有 header 時主體上緣不重複留白。
  &__header + &__content {
    padding-top: 0;
  }

  &__footer {
    display: flex;
    flex-shrink: 0;
    gap: 0.5rem;
    justify-content: flex-end;
    padding: var(--dialog-padding);
  }

  // 拖曳感應區：四邊，游標顯示可移動。
  &__sensor {
    position: absolute;
    cursor: move;

    &--top {
      top: 0;
      right: 0;
      left: 0;
      height: 1rem;
    }

    &--right {
      top: 0;
      right: 0;
      bottom: 0;
      width: 1rem;
    }

    &--bottom {
      right: 0;
      bottom: 0;
      left: 0;
      height: 1rem;
    }

    &--left {
      top: 0;
      bottom: 0;
      left: 0;
      width: 1rem;
    }
  }

  &--dragging {
    cursor: move;
    touch-action: none;
    user-select: none;
  }

  &--fullscreen {
    padding: 0;

    .base-dialog__wrapper {
      width: 100%;
      max-width: 100%;
      height: 100%;
      max-height: 100%;
      border-radius: 0;
    }
  }
}

// ── 進出場：backdrop 淡入；wrapper 依變體位移 ──────────────────────────────────
// 每個變體的 wrapper 起始 / 結束 transform（新增變體只要加一筆 + 對應 prop union）。
$dialog-transitions: (
  'fade': translateY(8px) scale(0.98),
  'slide-up': translateY(2rem),
  'slide-down': translateY(-2rem),
  'slide-left': translateX(2rem),
  'slide-right': translateX(-2rem),
);

@each $name, $from in $dialog-transitions {
  .base-dialog-#{$name}-enter-active,
  .base-dialog-#{$name}-leave-active {
    transition: opacity 0.2s ease;

    .base-dialog__wrapper {
      transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
    }
  }

  .base-dialog-#{$name}-enter-from,
  .base-dialog-#{$name}-leave-to {
    opacity: 0;

    .base-dialog__wrapper {
      opacity: 0;
      transform: $from;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  @each $name, $from in $dialog-transitions {
    .base-dialog-#{$name}-enter-active,
    .base-dialog-#{$name}-leave-active {
      .base-dialog__wrapper {
        transition: none;
        transform: none;
      }
    }
  }
}
</style>
