<template>
  <ReferenceComponent
    v-if="$slots.reference"
    class="base-popover__reference"
    :aria-controls="ariaControls"
    :aria-describedby="ariaDescribedby"
    :aria-disabled="disabled || undefined"
    :aria-expanded="ariaExpanded"
    :aria-haspopup="ariaHasPopup"
    @click="onClick"
    @keydown="onKeydown"
    @mouseenter="onMouseenter"
    @mouseleave="onMouseleave"
    @focus="onFocus"
    @blur="onBlur"
    @touchstart.passive="onTouchstart"
  />

  <Teleport to="body">
    <!--
      不用 v-if 包 <Transition>：浮層需先掛載供 floating-ui 量測定位，
      未定位前 floatingStyles 是 top/left:0（畫面左上角）。改以 isPositioned
      控制顯示 —— 掛載時 opacity:0 藏住，定位算完才淡入，避免「左上角閃一下再跳過去」。
    -->
    <div
      v-if="shouldRenderPopover"
      :id="id"
      ref="popoverRef"
      class="base-popover"
      :class="{ 'base-popover--positioned': isPositioned }"
      :role="role"
      :style="[floatingStyles, { '--popover-z-auto': zIndex }]"
      @mouseenter="onPopoverMouseenter"
      @mouseleave="onPopoverMouseleave"
    >
      <slot :close="close" :arrow-style="arrowStyle" />
    </div>
  </Teleport>
</template>

<script lang="ts">
import type { Middleware } from '@floating-ui/vue'
import type { StyleValue } from 'vue'

/** 觸發方式 */
export type BasePopoverTrigger = 'click' | 'hover' | 'focus' | 'touch'

type Side = 'top' | 'right' | 'bottom' | 'left'
type Alignment = 'start' | 'end'

/** 浮層相對 reference 的位置（含對齊變體） */
export type BasePopoverPlacement = Side | `${Side}-${Alignment}`

/**
 * 自訂 floating-ui middleware
 * 功能：當 Popover 在上方或下方時，自動讓浮層寬度等於 reference 元素寬度
 * - top / bottom（垂直放置）→ 浮層 `width` 對齊 reference 寬度
 * - left / right（水平放置）→ 不強制（高度交給內容）
 */
const floatingAutoFit = (): Middleware => ({
  name: 'autoFit',
  fn({ rects, elements, placement }) {
    const [side] = placement.split('-')
    const isVertical = side === 'top' || side === 'bottom'

    // 垂直放置貼齊 reference 寬度；翻轉成水平方位時重置（''），避免殘留先前設的寬度。
    elements.floating.style.width = isVertical ? `${rects.reference.width}px` : ''

    return {}
  },
})
</script>

<script setup lang="ts">
import {
  arrow as floatingArrow,
  offset as floatingOffset,
  shift as floatingShift,
  flip,
  autoUpdate,
  useFloating,
} from '@floating-ui/vue'
import { createFocusTrap } from 'focus-trap'
import { tabbable } from 'tabbable'
import {
  computed,
  defineComponent,
  nextTick,
  onMounted,
  onUnmounted,
  shallowRef,
  useId,
  useTemplateRef,
  watch,
  withDirectives,
} from 'vue'

import type { FocusTrap } from 'focus-trap'
import type { VNode } from 'vue'

import { OVERLAY_BASE_Z, overlayTrapStack } from '~/composables/useOverlay'
import { usePopupsManager } from '~/composables/usePopupsManager'
import findFirstLegitChild from '~/helpers/findFirstLegitChild'
import toArray from '~/utils/toArray'
import toUnit from '~/utils/toUnit'

export interface BasePopoverProps {
  /**
   * 觸發方式，可單選或陣列複選。
   * - `click`（預設）：點擊 / Enter / Space 切換
   * - `hover`：滑入開、滑出關（含 reference↔浮層間隙的防閃爍延遲）
   * - `focus`：聚焦開、失焦關（適合非互動的提示內容）
   * - `touch`：觸控切換
   * @default 'click'
   */
  trigger?: BasePopoverTrigger | BasePopoverTrigger[]
  /**
   * 浮層位置。`flip` / `shift` 會在空間不足時自動翻轉 / 平移，此值是「首選位置」。
   * @default 'bottom'
   */
  placement?: BasePopoverPlacement
  /**
   * 浮層與 reference 的間距。數字＝主軸距離；或物件分別指定主軸 / 交叉軸。
   * @default 8
   */
  offset?: number | { mainAxis?: number; crossAxis?: number }
  /**
   * 啟用箭頭定位。傳入箭頭 DOM 元素（與可選 padding），元件回傳 `arrowStyle`
   */
  arrow?: { element: HTMLElement | null; padding?: number }
  /**
   * 浮層主軸尺寸貼齊 reference（dropdown / select 常用）。
   * 垂直放置時讓浮層寬度 = reference 寬度。
   * @default false
   */
  autoFit?: boolean
  /** 整體禁用：不可觸發、不渲染浮層 @default false */
  disabled?: boolean
  /**
   * 浮層的 ARIA role（如 `menu` / `listbox` / `dialog` / `tooltip`）。
   * 會一併推導 reference 的 `aria-haspopup`。
   */
  role?: string
  /**
   * 關閉浮層內的 focus trap。預設會在「浮層內有可聚焦元素」時啟用 trap
   * （Tab 不會跑出浮層）；純文字提示這類無可聚焦內容本來就不會啟用。
   * @default false
   */
  disableFocusTrap?: boolean
  /**
   * hover 觸發時，滑出到真正關閉的延遲（ms）。用來吃掉「reference → 浮層」
   * 跨越 offset 間隙時的 mouseleave，避免一移動就閃關。
   * @default 120
   */
  hoverCloseDelay?: number
}

const props = withDefaults(defineProps<BasePopoverProps>(), {
  trigger: 'click',
  placement: 'bottom',
  offset: 8,
  arrow: undefined,
  autoFit: false,
  disabled: false,
  role: undefined,
  disableFocusTrap: false,
  hoverCloseDelay: 120,
})

// 父層有綁 v-model => 受控;父層沒綁 => 元件內部狀態（預設 false）
const open = defineModel<boolean>({ default: false })

// disabled 時拒絕任何開關
function setOpen(value: boolean) {
  if (props.disabled) return
  open.value = value
}

function close() {
  setOpen(false)
}

const slots = defineSlots<{
  /** 觸發錨點：傳入單一可聚焦元素（按鈕 / 連結…）。純文字會自動包成可聚焦 span。 */
  reference?: () => unknown
  /** 浮層內容。slot props 提供 `close()` 與箭頭 `arrowStyle`。 */
  default?: (props: { close: () => void; arrowStyle: StyleValue }) => unknown
}>()

const id = useId()

const referenceRef = shallowRef<HTMLElement>()
const popoverRef = useTemplateRef<HTMLElement>('popoverRef')

const { floatingStyles, middlewareData, placement, isPositioned } = useFloating(
  referenceRef, // 觸發按鈕的 ref
  popoverRef, // 浮層的 ref
  {
    open,
    transform: false,  // 用 top/left，不跟動畫 transform 打架
    placement: () => props.placement,
    whileElementsMounted: autoUpdate, // 自動追蹤尺寸/捲動變化重算位置(內建工具，只在元素存在期間運作)
    middleware: () => {
      const list: Middleware[] = [
        floatingOffset(props.offset),       // 主軸/交叉軸位移
        flip(),                             // 空間不足時翻轉
        floatingShift({ padding: 8 })       // 邊界保護避免貼邊
      ]

      if (props.autoFit) list.push(floatingAutoFit())
      // 只有真的拿到箭頭元素才掛 arrow middleware（避免傳 null 進去）。
      if (props.arrow?.element) {
        list.push(floatingArrow({ element: props.arrow.element, padding: props.arrow.padding }))
      }

      return list
    },
  },
)

/** 箭頭樣式：把 floating-ui 算出的座標 + 依放置側的旋轉，組成可套用的 style。 */
const arrowStyle = computed<StyleValue>(() => {
  const { arrow } = middlewareData.value // 箭頭座標資料
  if (!arrow) return {}

  const [side] = placement.value.split('-') as [Side]

  const rotation: Record<Side, string> = {
    top: '',
    bottom: 'rotate(180deg)',
    left: 'rotate(-90deg)',
    right: 'rotate(90deg)',
  }

  return {
    position: 'absolute',
    left: arrow.x != null ? toUnit(arrow.x) : '',
    top: arrow.y != null ? toUnit(arrow.y) : '',
    [side]: '100%', // 箭頭貼在浮層對應邊
    transform: rotation[side],
  }
})

/**
 * reference 的 `aria-haspopup`：彈出式 widget role 直接用該 role；
 * `tooltip` 不是「可叫出的 popup」→ 不設（回傳 undefined 讓屬性省略）；其餘用泛用的 `true`。
 */
const ariaHasPopup = computed<string | boolean | undefined>(() => {
  switch (props.role) {
    case 'menu':
    case 'listbox':
    case 'tree':
    case 'grid':
    case 'dialog':
      return props.role
    case 'tooltip':
      return undefined
    default:
      return true
  }
})

/**
 * tooltip 與 disclosure（menu/dialog…）的 ARIA 模式不同：
 * - disclosure：reference 用 `aria-controls`（指向浮層）+ `aria-expanded`（開合狀態）
 * - tooltip：reference 改用 `aria-describedby`（把提示當「描述」連上），且**不**標 expanded
 *   —— tooltip 非可展開 widget，標 expanded 會被螢幕閱讀器誤念「已摺疊」。
 */
const isTooltip = computed(() => props.role === 'tooltip')

/**
 * reference 的 `aria-controls`：disclosure 用（指向浮層 id）；tooltip 省略。
 * 浮層僅在開啟時才渲染，故關閉時不輸出 `aria-controls`（避免指向不存在的元素）。
 */
const ariaControls = computed<string | undefined>(() =>
  !isTooltip.value && open.value ? id : undefined,
)

/**
 * reference 的 `aria-describedby`：僅 tooltip 用，聚焦時螢幕閱讀器念出提示內容。
 * 浮層僅在開啟時才渲染，故關閉時不輸出（避免指向不存在的 id，同 `ariaControls`）。
 */
const ariaDescribedby = computed<string | undefined>(() =>
  isTooltip.value && open.value ? id : undefined,
)

/** reference 的 `aria-expanded`：disclosure 的開合狀態；tooltip 省略（回傳 undefined）。 */
const ariaExpanded = computed<boolean | undefined>(() =>
  isTooltip.value ? undefined : open.value,
)

/** 是否該渲染浮層：未禁用、有兩端 slot、且為開啟狀態。 */
const shouldRenderPopover = computed(
  () => !props.disabled && !!slots.reference && !!slots.default && open.value,
)

// ---- 觸發處理 ----
function withTrigger<E extends Event>(
  callback: (event: E) => void,
  trigger: BasePopoverTrigger,
) {
  return (event: E) => {
    if (!toArray(props.trigger).includes(trigger)) return
    callback(event) // 只有 trigger 有啟用才執行
  }
}

// hover 防閃爍：滑出不立即關，延遲一小段；期間若滑回 reference 或浮層則取消關閉。
let closeTimer: ReturnType<typeof setTimeout> | undefined

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = undefined
  }
}

function openByHover() {
  clearCloseTimer() // 滑回來就取消關閉
  setOpen(true)
}

// 滑出延遲關
function closeByHover() {
  clearCloseTimer()
  // 延遲關閉，避免 reference 和 popover 間隙造成閃關(避免 popover 立刻不見點不到裡面的東西)
  closeTimer = setTimeout(() => setOpen(false), props.hoverCloseDelay)
}

// touch 與 click 併用時，一次點按會依序發出 touchstart 與「合成 click」：
// touchstart 已 toggle 過就抑制隨後的合成 click，避免雙重 toggle（浮層閃開即關）。
// 旗標帶 500ms 時限：touchstart 後合成 click 未到（滑動取消等），不誤吞下一次真 click。
let suppressSyntheticClick = false
let suppressTimer: ReturnType<typeof setTimeout> | undefined

function clearClickSuppression() {
  suppressSyntheticClick = false
  if (suppressTimer) {
    clearTimeout(suppressTimer)
    suppressTimer = undefined
  }
}

const onClick = withTrigger(() => {
  if (suppressSyntheticClick) {
    clearClickSuppression()
    return
  }
  setOpen(!open.value)
}, 'click')

// 判斷元素是否本來就會 Enter/Space 觸發 click
function nativelyActivatesOnKey(el: HTMLElement): boolean {
  const tag = el.tagName
  if (tag === 'BUTTON' || tag === 'SUMMARY') return true
  if (tag === 'A') return el.hasAttribute('href')
  if (tag === 'INPUT') {
    const type = (el as HTMLInputElement).type
    return type === 'button' || type === 'submit' || type === 'reset'
  }
  return false
}

const onKeydown = withTrigger((event: KeyboardEvent) => {
  const target = event.target as HTMLElement | null
  // 原生會在 Enter/Space 觸發 click 的元素不重複處理，避免雙重 toggle 互相抵銷；
  // 只有 span / div 等自製 role="button"（如純文字 reference）才需手動處理鍵盤。
  if (!target || nativelyActivatesOnKey(target)) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  setOpen(!open.value)
}, 'click')

const onMouseenter = withTrigger(openByHover, 'hover')
const onMouseleave = withTrigger(closeByHover, 'hover')
const onPopoverMouseenter = withTrigger(openByHover, 'hover')
const onPopoverMouseleave = withTrigger(closeByHover, 'hover')

const onFocus = withTrigger(() => setOpen(true), 'focus')
const onBlur = withTrigger((event: FocusEvent) => {
  // 焦點移進浮層內部、或回到 reference 時不關閉：避免使用者 Tab 進浮層內容
  // （或浮層內元素取得焦點）造成 reference blur → 立即關閉 → 再聚焦開啟的無限震盪。
  const next = event.relatedTarget as Node | null
  if (next && (popoverRef.value?.contains(next) || referenceRef.value?.contains(next))) return
  setOpen(false)
}, 'focus')

const onTouchstart = withTrigger(() => {
  // 只有 click 同時啟用才需要抑制合成 click（否則合成 click 本就不會被 withTrigger 處理）。
  if (toArray(props.trigger).includes('click')) {
    // 先清掉前一次點按的 timer 再設旗標：否則舊 timer 到期會把本次的抑制一併清掉，
    // 連續兩次點按（間隔 <500ms）時第二次的合成 click 就會漏過、雙重 toggle。
    clearClickSuppression()
    suppressSyntheticClick = true
    suppressTimer = setTimeout(clearClickSuppression, 500)
  }
  setOpen(!open.value)
}, 'touch')

/**
 * 是否啟用浮層內的 focus trap。只有 click / touch 這類「開啟後持續互動」的觸發
 * 才 trap（如 dropdown / select / menu）；hover / focus 這類非持久提示浮層一律不 trap，
 * 否則 `trap.activate()` 會把鍵盤焦點強行移入浮層（hover 滑過偷焦、focus 開關震盪）。
 */
const shouldTrapFocus = computed(() => {
  const triggers = toArray(props.trigger)
  return triggers.includes('click') || triggers.includes('touch')
})

// reference 錨點：將 slot 傳入元素轉為 DOM，供 useFloating 定位

// 自訂指令物件: 在元素的生命週期中,把該元素的真實 DOM 抓出來存進 referenceRef
const captureReferenceEl = {
  mounted(el: HTMLElement) { referenceRef.value = el },
  updated(el: HTMLElement) { referenceRef.value = el },
  unmounted() { referenceRef.value = undefined },
}

// 負責「包裝使用者傳進來的 reference slot」
const ReferenceComponent = defineComponent({
  name: 'BasePopoverReference',
  setup() {
    return () => {
       // 執行 reference slot 拿到它的 VNode 陣列,從中挑出「第一個合法的元素節點」
      const child = findFirstLegitChild(slots.reference?.() as VNode[] | undefined)
      if (!child) return null

      // 指令「附加」到這個 VNode 上,渲染後指令的 mounted 就會抓到它的 DOM
      return withDirectives(child, [[captureReferenceEl]])
    }
  },
})

// ---- 全域關閉行為：Esc 與點擊外部 ----
// 監聽只在「開啟時」掛載、關閉即解除 —— 一頁可能有上百個 tooltip/popover，
// 常駐 document listener 成本高，閒置時應為零監聽。

const popups = usePopupsManager()
// 此浮層在堆疊管理器中的唯一身分。與 useOverlay（Modal/Dialog/Drawer）共用同一堆疊，
// 因此「Modal 內再開 Popover」時，Esc 的頂層判斷能跨兩套浮層體系正確協調。
const popupToken = Symbol('popover')

/**
 * z-index 依開啟順序派發（與 useOverlay 同一基準、同一 popups 堆疊）：
 * 視覺疊序＝開啟序。寫死高值（舊 1150）會讓「Popover 內開 Modal」時
 * 後開的 Modal（1100 + index）被壓在 Popover 之下。
 *
 * inline 綁到 `--popover-z-auto` 而非 `--popover-z`：inline style 恆勝 stylesheet，
 * 直接綁公開變數會讓使用端的 CSS 覆寫（`.base-popover { --popover-z: X }`）失效。
 * CSS 端以 `var(--popover-z, var(--popover-z-auto))` 讀取——使用端有設就用使用端的，
 * 沒設才用自動派發值。
 */
const zIndex = computed(() => {
  const index = popups.getIndex(popupToken)
  return OVERLAY_BASE_Z + (index < 0 ? 0 : index)
})

function onEscKeydown(event: KeyboardEvent) {
  // IME 組字中的 Esc 是「取消選字」，不該連浮層一起關（CJK 輸入的日常路徑）。
  if (event.key !== 'Escape' || event.isComposing) return
  // 只有最上層浮層回應 Esc：多個浮層並存時，一次只關最上面那個（避免一次全關）。
  if (!open.value || !popups.isTop(popupToken)) return
  // 與 useOverlay 一致用 preventDefault（而非 stopPropagation）：靠 isTop 做頂層協調，
  // 不需要攔截事件傳播，跨「Modal 內開 Popover」兩套體系行為才一致。
  event.preventDefault()
  setOpen(false)
}

/** 事件是否發生在 reference 與浮層之外（點外部判斷的共用依據）。 */
function isOutsideEvent(event: Event): boolean {
  // composedPath 回傳「事件從目標冒泡到頂層」經過的所有節點(含 shadow DOM 內部)
  const path = event.composedPath()
  const reference = referenceRef.value
  const floating = popoverRef.value

  // 點擊路徑裡若包含 reference → 點在按鈕上,不算外部(否則點按鈕想開卻又被關)
  if (reference && path.includes(reference)) return false
  // 點擊路徑裡若包含浮層 → 點在浮層內部,不算外部(使用者在操作浮層內容)
  if (floating && path.includes(floating)) return false

  return true
}

// 與 useOverlay 同思路：記錄 mousedown 是否起始於外部，避免「在浮層內按住選取文字 →
// 滑到浮層外放開」觸發的 click 誤關 —— 只有「按下與放開都在外部」才算點擊外部。
// null 代表這次 click 前沒有對應的 mousedown（如鍵盤觸發的 click），視為起點在外部。
let pressedOutside: boolean | null = null

function onDocumentMousedown(event: Event) {
  pressedOutside = isOutsideEvent(event)
}

function onClickOutside(event: Event) {
  const startedOutside = pressedOutside ?? true
  pressedOutside = null

  if (!open.value) return
  if (!startedOutside || !isOutsideEvent(event)) return

  setOpen(false)
}

function addGlobalListeners() {
  document.addEventListener('mousedown', onDocumentMousedown)
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onEscKeydown)
}

function removeGlobalListeners() {
  document.removeEventListener('mousedown', onDocumentMousedown)
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onEscKeydown)
  pressedOutside = null
}

// 以 shouldRenderPopover（= 未禁用 + 有兩端 slot + 開啟）為準進出堆疊與掛/解監聽。
// 用它而非 open：避免「disabled 但父層 v-model open=true」這種矛盾狀態下，
// 浮層其實沒渲染卻佔據堆疊頂層、且 setOpen 因 disabled 為 no-op，導致 Esc 被吃掉、
// 連下層 Modal 都關不掉的死鎖。
watch(shouldRenderPopover, (active) => {
  if (active) {
    popups.add(popupToken)
    addGlobalListeners()
  }
  else {
    // 關閉瞬間（pre-flush，DOM 尚未移除）快照焦點位置：焦點仍在浮層內＝鍵盤／程式化
    // 關閉（Esc、Dropdown 的 Tab、內容裡的關閉鈕…）→ 浮層移除後還焦給 reference，
    // 鍵盤脈絡不中斷。點外部關閉時焦點已落在外部 → 不進此分支，維持不搶焦。
    const hadFocusInside
      = !!popoverRef.value && popoverRef.value.contains(document.activeElement)
    popups.remove(popupToken)
    removeGlobalListeners()
    if (hadFocusInside) {
      void nextTick(() => referenceRef.value?.focus())
    }
  }
})

// 初始即為開啟狀態（父層 v-model 一開始就 true）時，於 client 掛載後補上註冊。
// SSR 不執行 onMounted，避免污染 module 單例。
onMounted(() => {
  if (shouldRenderPopover.value) {
    popups.add(popupToken)
    addGlobalListeners()
  }
})

onUnmounted(() => {
  removeGlobalListeners()
  popups.remove(popupToken)
  clearCloseTimer()
  clearClickSuppression()
  trap?.deactivate()
  trap = undefined
})

// ---- focus trap：浮層掛載且內有可聚焦元素時啟用 ----

let trap: FocusTrap | undefined

watch(popoverRef, (popover) => {
   // 浮層消失了(關閉/卸載)→ 停用並清空 trap
  if (!popover) {
    trap?.deactivate()
    trap = undefined
    return
  }
  
  // 浮層出現，但下列情況不啟用 trap：
  //   1. 明確停用（disableFocusTrap）
  //   2. 觸發方式不含 click / touch（見 shouldTrapFocus）——避免 hover / focus 偷焦、震盪
  //   3. 浮層內沒有任何可聚焦元素
  if (
    props.disableFocusTrap ||
    !shouldTrapFocus.value ||
    tabbable(popover).length === 0
  ) return

  // 建立並啟用 focus trap,把鍵盤焦點鎖在浮層內
  trap = createFocusTrap(popover, {
    // 與 useOverlay 共用同一個 trapStack：在 Modal 內開 Select / Dropdown 時，
    // 下層 Modal 的 trap 會自動暫停，兩個 trap 不互搶焦點（關閉後再恢復下層）。
    trapStack: overlayTrapStack,
    clickOutsideDeactivates: true, // 點外面時自動解除 trap(配合上面 onClickOutside 的點外關閉)
    // 點外部解除 trap 時不把焦點搶回 reference：否則使用者點頁面上其他輸入框，
    // 焦點會被 focus-trap 預設的 returnFocusOnDeactivate 拉回 trigger。
    // 鍵盤／程式化關閉的還焦不靠 trap，由 shouldRenderPopover watcher 的焦點快照統一處理。
    returnFocusOnDeactivate: false,
    escapeDeactivates: false, // Esc 交由 onEscKeydown 統一處理(含頂層判斷)，不讓 focus-trap 自行解除
  })
  trap.activate()
})
</script>

<style scoped lang="scss">
.base-popover {
  // 浮層基礎外觀（可由使用者覆寫 / 用 default slot 完全自訂內容）。
  --popover-bg: #ffffff;
  --popover-color: #1f2937;
  --popover-border: #e5e7eb;
  --popover-radius: 0.5rem;
  --popover-shadow: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%);
  // z 層級：--popover-z-auto 由 script 依開啟順序動態派發（inline 綁定，與 Modal 家族
  // 同一堆疊基準 1100 + index）→ 後開的浮層永遠疊在先開的之上；使用端要強制層級時
  // 覆寫公開的 --popover-z（優先於自動派發值）。
  --popover-padding: 0.5rem 0.75rem;

  // floatingStyles 已用 inline style 設定 position/top/left，這裡只補視覺。
  z-index: var(--popover-z, var(--popover-z-auto, 1100));
  padding: var(--popover-padding);
  color: var(--popover-color);
  background: var(--popover-bg);
  border: 1px solid var(--popover-border);
  border-radius: var(--popover-radius);
  box-shadow: var(--popover-shadow);

  // 預設藏住（定位前）：避免在左上角閃現。定位完成（--positioned）才淡入 + scale。
  opacity: 0;
  transform: scale(0.96);
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.base-popover--positioned {
  opacity: 1;
  transform: scale(1);
}

@media (prefers-reduced-motion: reduce) {
  .base-popover {
    transition: none;
    transform: none;
  }

  .base-popover--positioned {
    transform: none;
  }
}
</style>
