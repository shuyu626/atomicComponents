<template>
  <div
    class="base-scrollbar"
    :class="{
      'base-scrollbar--native': native,
      'base-scrollbar--both': hasBothScrollbars,
    }"
  >
    <!--
      viewport：真正可捲動的區域。掛 :id 讓下方 role="scrollbar" 的 aria-controls
      有實際指向（原參考實作 aria-controls 指向不存在的 id，此處修正）。
    -->
    <div
      :id="id"
      ref="viewportRef"
      class="base-scrollbar__viewport"
      @scroll="onScroll"
    >
      <!-- content 包一層：讓 ResizeObserver 能觀察「內容本身」的尺寸變化 -->
      <div
        ref="contentRef"
        class="base-scrollbar__content"
      >
        <slot />
      </div>
    </div>

    <!-- native 模式：直接用瀏覽器原生捲軸，不渲染任何 overlay -->
    <template v-if="!native">
      <!-- 垂直捲軸：內容垂直溢出（thumbHeight > 0）時才掛載 -->
      <Transition
        v-if="thumbHeight"
        name="base-scrollbar"
      >
        <div
          v-show="active || dragging"
          :aria-controls="id"
          aria-orientation="vertical"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="valuenowY"
          class="base-scrollbar__track base-scrollbar__track--vertical"
          role="scrollbar"
          @pointerdown="onTrackPointerdown($event, 'vertical')"
          @pointerenter="onTrackPointerenter"
          @pointerleave="onTrackPointerleave"
        >
          <div
            class="base-scrollbar__thumb"
            :style="{ transform: `translateY(${thumbTop}%)`, height: `${thumbHeight}px` }"
            @pointerdown="onThumbPointerdown($event, 'vertical')"
          />
        </div>
      </Transition>

      <!-- 水平捲軸：內容水平溢出（thumbWidth > 0）時才掛載 -->
      <Transition
        v-if="thumbWidth"
        name="base-scrollbar"
      >
        <div
          v-show="active || dragging"
          :aria-controls="id"
          aria-orientation="horizontal"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-valuenow="valuenowX"
          class="base-scrollbar__track base-scrollbar__track--horizontal"
          role="scrollbar"
          @pointerdown="onTrackPointerdown($event, 'horizontal')"
          @pointerenter="onTrackPointerenter"
          @pointerleave="onTrackPointerleave"
        >
          <div
            class="base-scrollbar__thumb"
            :style="{ transform: `translateX(${thumbLeft}%)`, width: `${thumbWidth}px` }"
            @pointerdown="onThumbPointerdown($event, 'horizontal')"
          />
        </div>
      </Transition>
    </template>
  </div>
</template>

<script lang="ts">
/** thumb 與 track 邊緣保留的間隙（px），讓 thumb 不會貼死兩端。 */
const GAP = 4

/** thumb 最小長度（px），避免內容極長時 thumb 縮到抓不到。 */
const MIN_SIZE = 20

/** 閒置多久後自動隱藏捲軸（ms）。 */
const HIDE_DELAY = 1000

/**
 * 把「垂直 / 水平」兩個方向需要讀寫的 DOM 屬性集中成查表，
 * 讓 scroll / drag / track-click 的計算邏輯各寫一份就能同時服務兩個方向。
 */
const ORIENTATION_MAP = {
  vertical: {
    size: 'offsetHeight',
    scroll: 'scrollTop',
    scrollSize: 'scrollHeight',
    client: 'clientY',
    direction: 'top',
  },
  horizontal: {
    size: 'offsetWidth',
    scroll: 'scrollLeft',
    scrollSize: 'scrollWidth',
    client: 'clientX',
    direction: 'left',
  },
} as const

type Orientation = typeof ORIENTATION_MAP
type OrientationKey = keyof Orientation
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, useId, useTemplateRef } from 'vue'

import useResizeObserver from '~/composables/useResizeObserver'

export interface BaseScrollbarProps {
  /**
   * 退回瀏覽器原生捲軸：不隱藏原生捲軸、不渲染 overlay thumb / track。
   * 適合不需要客製外觀、或要保留作業系統捲軸行為的場景。
   * @default false
   */
  native?: boolean
}

const props = withDefaults(defineProps<BaseScrollbarProps>(), {
  native: false,
})

const id = useId()
/** 捲軸目前是否該顯示（hover track 或剛捲動過 → true，閒置 HIDE_DELAY 後 → false）。 */
const active = ref(false)
/** 是否正在拖曳 thumb（拖曳期間強制顯示，不受自動隱藏影響）。 */
const dragging = ref(false)
const viewportRef = useTemplateRef<HTMLElement>('viewportRef')
const contentRef = useTemplateRef<HTMLElement>('contentRef')

// ── 拖曳 / 自動隱藏的非響應式暫存（不需驅動 render，用一般變數省去 ref 開銷）──
let hideTimer: ReturnType<typeof setTimeout> | undefined
/** 目前拖曳中的方向設定；null 代表未在拖曳。 */
let currentOrientation: Orientation[OrientationKey] | null = null
/** 拖曳起點的指標座標（clientX / clientY，與 getBoundingClientRect() 同座標系）。 */
let mousePosition = 0
/** 拖曳起點的捲動位移（scrollTop / scrollLeft）。 */
let scrollOffset = 0
/**
 * 拖曳期間暫時關閉文字選取（避免拖 thumb 時把頁面文字反白）。
 * 存下原本的 onselectstart，放開時還原。
 */
let originalOnSelectStart: typeof document.onselectstart = null

// ── 自動隱藏 ────────────────────────────────────────────────────────────────

const scheduleHideScrollbar = () => {
  if (hideTimer) clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    active.value = false
  }, HIDE_DELAY)
}

// ── thumb 拖曳 ──────────────────────────────────────────────────────────────

const onThumbPointerdown = (event: PointerEvent, orientation: OrientationKey) => {
  event.stopPropagation()
  // 忽略右鍵 / 中鍵 / Ctrl+左鍵（系統選單），只處理主鍵拖曳。
  if (event.ctrlKey || event.button !== 0) return

  const viewport = viewportRef.value
  if (!viewport) return

  const { client, scroll } = (currentOrientation = ORIENTATION_MAP[orientation])
  mousePosition = event[client]
  scrollOffset = viewport[scroll]

  // 清掉既有選取並暫時禁止選取，避免拖曳反白文字。
  window.getSelection()?.removeAllRanges()
  originalOnSelectStart = document.onselectstart
  document.onselectstart = () => false

  document.addEventListener('pointermove', onDocumentPointermove)
  document.addEventListener('pointerup', onDocumentPointerup)
}

const onDocumentPointermove = (event: PointerEvent) => {
  const viewport = viewportRef.value
  if (!currentOrientation || !viewport) return

  dragging.value = true

  const { client, scroll, scrollSize, size } = currentOrientation
  // 指標位移換算成捲動比例，再乘上可捲動總長 → 新的 scrollTop / scrollLeft。
  const offset = (event[client] - mousePosition) / (viewport[size] - GAP)
  viewport[scroll] = scrollOffset + offset * viewport[scrollSize]
}

const onDocumentPointerup = () => {
  document.removeEventListener('pointermove', onDocumentPointermove)
  document.removeEventListener('pointerup', onDocumentPointerup)

  dragging.value = false
  currentOrientation = null
  scrollOffset = 0
  mousePosition = 0

  // 還原拖曳前的文字選取設定。
  if (document.onselectstart !== originalOnSelectStart) {
    document.onselectstart = originalOnSelectStart
  }
}

// ── track 互動（hover 顯示 / 點擊跳轉）──────────────────────────────────────

const onTrackPointerenter = () => {
  active.value = true
  if (hideTimer) clearTimeout(hideTimer)
}

const onTrackPointerleave = scheduleHideScrollbar

const onTrackPointerdown = (event: PointerEvent, orientation: OrientationKey) => {
  const viewport = viewportRef.value
  if (!viewport) return

  const { scroll, scrollSize, size, client, direction } = ORIENTATION_MAP[orientation]

  const track = event.currentTarget as HTMLElement
  // 用 firstElementChild 而非 childNodes[0]:後者含文字 / 註解節點,
  // 結構調整時可能讀到非元素節點,thumb[size] 變 undefined → NaN。
  const thumb = track.firstElementChild as HTMLElement | null
  if (!thumb) return

  const rect = track.getBoundingClientRect()
  const thumbHalf = thumb[size] / 2
  // 點擊位置距離 track 起點的距離，扣掉半個 thumb → thumb 中心對齊點擊處。
  const position = Math.abs(rect[direction] - event[client])
  viewport[scroll] = (position - thumbHalf) * (viewport[scrollSize] / track[size])
}

// ── thumb 尺寸 / 位置 ───────────────────────────────────────────────────────

const thumbTop = ref(0)
const thumbLeft = ref(0)
const thumbHeight = ref(0)
const thumbWidth = ref(0)

// 垂直 + 水平捲軸同時出現時，掛 --both 讓兩條 track 各自讓出對方寬度，避免右下角重疊。
const hasBothScrollbars = computed(() => thumbHeight.value > 0 && thumbWidth.value > 0)

// 把「實際 thumb 長度」對「理想 thumb 長度」的差異補償回位移比例，
// 確保 thumb 被 MIN_SIZE 撐大後，拖到底時內容也剛好捲到底。
let ratioY = 1
let ratioX = 1

/**
 * 產生 aria-valuenow 的 computed：回傳目前捲動進度（0–100 的整數百分比）。
 * 讀取對應的 thumbTop / thumbLeft 以建立響應依賴（捲動更新 thumb 位置時一併重算）。
 */
const valuenow = (getter: (viewport: HTMLElement) => number) =>
  computed(() => {
    const viewport = viewportRef.value
    if (!viewport) return 0
    return Math.floor(getter(viewport) * 100)
  })

const valuenowY = valuenow(({ scrollTop, scrollHeight, offsetHeight }) => {
  void thumbTop.value
  return scrollHeight - offsetHeight ? scrollTop / (scrollHeight - offsetHeight) : 1
})

const valuenowX = valuenow(({ scrollLeft, scrollWidth, offsetWidth }) => {
  void thumbLeft.value
  return scrollWidth - offsetWidth ? scrollLeft / (scrollWidth - offsetWidth) : 1
})

const onScroll = () => {
  // native 模式用原生捲軸，不需要算 overlay thumb 位置。
  if (props.native) return

  const viewport = viewportRef.value
  if (!viewport) return

  const offsetHeight = viewport.offsetHeight - GAP
  const offsetWidth = viewport.offsetWidth - GAP

  thumbTop.value = ((viewport.scrollTop * 100) / offsetHeight) * ratioY
  thumbLeft.value = ((viewport.scrollLeft * 100) / offsetWidth) * ratioX

  active.value = true
  scheduleHideScrollbar()
}

/** 重算 thumb 尺寸與位移補償比例：在 viewport 尺寸或內容變動時呼叫。 */
const update = () => {
  // native 模式不渲染 overlay；提前 return 省去 offsetHeight/scrollHeight 的 layout reflow。
  if (props.native) return

  const viewport = viewportRef.value
  if (!viewport) return

  const offsetHeight = viewport.offsetHeight - GAP
  const offsetWidth = viewport.offsetWidth - GAP

  // 理想 thumb 長度 = 可視長度² / 內容總長度（可視佔內容的比例 × 可視長度）。
  const originalHeight = offsetHeight ** 2 / viewport.scrollHeight
  const originalWidth = offsetWidth ** 2 / viewport.scrollWidth

  const height = Math.max(originalHeight, MIN_SIZE)
  const width = Math.max(originalWidth, MIN_SIZE)

  // thumb + GAP 仍小於可視長度才顯示（內容沒溢出就不畫捲軸）。
  thumbHeight.value = height + GAP < offsetHeight ? height : 0
  thumbWidth.value = width + GAP < offsetWidth ? width : 0

  // 補償比例：thumb 被 MIN_SIZE 撐大後，軌道可移動空間變小，
  // 用此比例把 scroll 百分比換算回正確的 thumb 位移。
  ratioY = computeRatio(originalHeight, height, offsetHeight)
  ratioX = computeRatio(originalWidth, width, offsetWidth)
}

/**
 * 計算位移補償比例。內容剛好溢出時（original ≈ offset，分母趨近 0）會算出
 * Infinity / NaN，讓壞值流進 onScroll 的 thumbTop / thumbLeft；故分母 <= 0
 * 一律回 0（不補償），避免壞值擴散。
 */
function computeRatio(original: number, size: number, offset: number): number {
  const originalGap = offset - original
  const sizeGap = offset - size
  if (originalGap <= 0 || sizeGap <= 0) return 0
  return original / originalGap / (size / sizeGap)
}

// 容器（viewport）與內容（content）尺寸變化都重算 thumb。
// 只觀察 viewport 抓不到「內容增長」（scrollHeight 變了但容器尺寸沒變），
// 故同時觀察 content —— 取代原本 onUpdated(update) 每次重渲染都強制 reflow 的做法。
useResizeObserver(viewportRef, update)
useResizeObserver(contentRef, update)

// ── 卸載清理：補掉原參考實作沒處理的兩個洩漏點 ──────────────────────────────
onUnmounted(() => {
  if (hideTimer) clearTimeout(hideTimer)
  // 若卸載時仍在拖曳中：移除殘留的 document 監聽並還原 onselectstart。
  document.removeEventListener('pointermove', onDocumentPointermove)
  document.removeEventListener('pointerup', onDocumentPointerup)
  if (document.onselectstart !== originalOnSelectStart) {
    document.onselectstart = originalOnSelectStart
  }
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseScrollbar — overlay 自訂捲軸
 *
 * 機制：隱藏 viewport 的原生捲軸，改用絕對定位的 track + thumb overlay 呈現。
 * 所有顏色 / 尺寸抽成 --scrollbar-* token，覆寫即可主題化（取代參考實作的寫死值）。
 *
 * 客製化：
 *   .base-scrollbar { --scrollbar-thumb-bg: #4b5563; --scrollbar-size: 6px; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-scrollbar {
  // ── CSS tokens ────────────────────────────────────────────
  --scrollbar-size: 8px;
  --scrollbar-size-hover: 10px;
  --scrollbar-gap: 2px;
  --scrollbar-radius: 10px;
  --scrollbar-track-hover-bg: rgb(255 255 255 / 50%);
  --scrollbar-thumb-bg: rgb(35 35 35 / 60%);

  position: relative;
  overflow: hidden;

  &__viewport {
    height: inherit;
    overflow: auto;
  }

  // content 包一層供 ResizeObserver 觀察內容尺寸：
  // inline-block 讓寬度跟著內容（max-content）長，水平溢出時 content 自身變寬、觀察得到；
  // min-width: 100% 保證不窄於 viewport，一般文字流仍照常換行。
  &__content {
    display: inline-block;
    min-width: 100%;
    vertical-align: top;
  }

  // 非 native 模式才隱藏原生捲軸（保留可捲動但不顯示系統捲軸）。
  &:not(&--native) &__viewport {
    scrollbar-width: none; // Firefox

    &::-webkit-scrollbar {
      display: none; // WebKit / Blink
    }
  }

  &__track {
    position: absolute;
    background-color: transparent;
    border-radius: var(--scrollbar-radius);
    transition-duration: 300ms;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-property: width, height, background-color;

    &--vertical {
      top: var(--scrollbar-gap);
      right: var(--scrollbar-gap);
      bottom: var(--scrollbar-gap);
      width: var(--scrollbar-size);
    }

    &--horizontal {
      right: var(--scrollbar-gap);
      bottom: var(--scrollbar-gap);
      left: var(--scrollbar-gap);
      height: var(--scrollbar-size);
    }

    &:hover {
      cursor: pointer;
      background-color: var(--scrollbar-track-hover-bg);

      &.base-scrollbar__track--vertical {
        width: var(--scrollbar-size-hover);
      }

      &.base-scrollbar__track--horizontal {
        height: var(--scrollbar-size-hover);
      }
    }
  }

  &__thumb {
    background-color: var(--scrollbar-thumb-bg);
    border-radius: var(--scrollbar-radius);
  }

  &__track--vertical &__thumb {
    width: 100%;
  }

  &__track--horizontal &__thumb {
    height: 100%;
  }

  // 兩軸並存：各讓出對方（含 hover 放大後）的寬度 + 兩段間距，右下角不重疊。
  &--both &__track--vertical {
    bottom: calc(var(--scrollbar-size-hover) + var(--scrollbar-gap) * 2);
  }

  &--both &__track--horizontal {
    right: calc(var(--scrollbar-size-hover) + var(--scrollbar-gap) * 2);
  }
}

// ── 進出場淡入淡出（Transition name="base-scrollbar"）──────────
.base-scrollbar-enter-active {
  transition: opacity 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

.base-scrollbar-leave-active {
  transition: opacity 350ms cubic-bezier(0.4, 0.2, 0, 1);
}

.base-scrollbar-enter-from,
.base-scrollbar-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .base-scrollbar__track {
    transition: none;
  }

  .base-scrollbar-enter-active,
  .base-scrollbar-leave-active {
    transition: none;
  }
}
</style>
