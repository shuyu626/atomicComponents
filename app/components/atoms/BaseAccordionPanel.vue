<template>
  <div
    class="base-accordion__item"
    :class="{ 'base-accordion__item--open': isActive }"
  >
    <component :is="`h${headingLevel}`" class="base-accordion__heading">
      <button
        :id="`${id}-summary`"
        type="button"
        class="base-accordion__summary"
        data-accordion-summary
        :aria-controls="`${id}-content`"
        :aria-expanded="isActive"
        :disabled="isDisabled"
        @click="onSummaryClick"
      >
        <span class="base-accordion__title">
          <slot name="summary" :active="isActive">{{ summary }}</slot>
        </span>

        <span class="base-accordion__marker" aria-hidden="true">
          <slot name="marker" :active="isActive">
            <svg
              width="1em"
              height="1em"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </slot>
        </span>
      </button>
    </component>

    <div
      :id="`${id}-content`"
      ref="content"
      class="base-accordion__content"
      role="region"
      :aria-labelledby="`${id}-summary`"
      :hidden="hidden"
    >
      <div class="base-accordion__content-inner">
        <slot v-if="renderContent" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number | symbol">
import { computed, inject, nextTick, ref, useId, watch } from 'vue'

import { BASE_ACCORDION_INJECT_KEY } from '~/components/atoms/BaseAccordion.vue'
import isNullOrUndefined from '~/utils/isNullOrUndefined'

export interface BaseAccordionPanelProps<T extends string | number | symbol> {
  /** 對應 BaseAccordion `v-model` 的識別值；有父層 context 時必填才會受 context 控制 */
  value?: T
  /** summary 顯示文字（可被 `#summary` slot 覆寫外觀，仍作為預設內容） */
  summary?: string
  /** 是否禁用此單一 panel（不可點 / 不可聚焦） */
  disabled?: boolean
  /**
   * 延遲掛載：首次展開前不渲染內容，第一次展開後才掛載並保持（之後收合仍保留狀態）。
   * 內容重（圖表 / 大型清單 / 需 fetch）時開啟可省下初次渲染成本。
   * @default false
   */
  lazy?: boolean
}

const props = withDefaults(defineProps<BaseAccordionPanelProps<T>>(), {
  value: undefined,
  summary: undefined,
  disabled: false,
  lazy: false,
})

/**
 * standalone（無父層 BaseAccordion）時的展開狀態 `v-model`；context 模式不使用此值，
 * 由注入的 context 決定展開與否。
 */
const model = defineModel<boolean>({ default: false })

// 父層 context；單獨使用（無 BaseAccordion）時為 null，退化成自管狀態的獨立面板。
const context = inject(BASE_ACCORDION_INJECT_KEY, null)

const id = useId()

// 沒有 context 或沒給 value → standalone：用 modelValue / 內部 state 自管。
const standalone = computed(
  () => isNullOrUndefined(context) || isNullOrUndefined(props.value),
)

const headingLevel = computed(() => context?.headingLevel.value ?? 3)
const isDisabled = computed(() => props.disabled || !!context?.disabled.value)

const isActive = computed<boolean>({
  get() {
    // standalone 直接讀 model（defineModel 已處理 v-model 進出與 unbound 本地狀態）；
    // context 模式則以注入的 active 集合為準。
    if (standalone.value) return model.value
    return context!.active.value.includes(props.value as T)
  },
  set(value) {
    if (isDisabled.value) return
    if (standalone.value) {
      // 寫回 model，defineModel 自動 emit update:modelValue（受控）/ 更新本地（非受控）。
      model.value = value
      return
    }
    context!.toggle(props.value as T)
  },
})

function onSummaryClick() {
  isActive.value = !isActive.value
}

/* ── 展開 / 收合動畫（沿用參考原碼的 JS height 寫法，整理進元件）──
 * 以 scrollHeight 量測目標高度、強制 reflow 觸發過場，transitionend 後還原 inline style。
 * prefers-reduced-motion 時跳過動畫，直接切換 display。
 */
const content = ref<HTMLElement | null>(null)

// 收合靜止態用 `[hidden]` 宣告式控制：首次渲染（含 SSR）就正確收合，
// 避免掛載前內容短暫展開的閃爍；動畫期間才暫時取消 hidden 以便量測 / 過場。
const hidden = ref(!isActive.value)

// lazy：記住「曾經展開過」，第一次展開後就一直渲染（保留狀態）。初始即展開者視為已顯示。
const hasBeenShown = ref(isActive.value)
const renderContent = computed(() => !props.lazy || hasBeenShown.value)

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

// 從 CSS 變數讀取時長 / 緩動，讓 JS 高度動畫與 CSS（內容淡入、marker 旋轉）共用同一組設定；
// 使用者覆寫 --accordion-transition-* 時三者一起變。
function heightTransition(el: HTMLElement) {
  const styles = getComputedStyle(el)
  const duration =
    styles.getPropertyValue('--accordion-transition-duration').trim() || '300ms'
  const easing =
    styles.getPropertyValue('--accordion-transition-easing').trim() ||
    'cubic-bezier(0.4, 0, 0.2, 1)'
  return `height ${duration} ${easing}`
}

watch(isActive, (value, _old, onCleanup) => {
  // lazy：第一次展開就標記，之後保持渲染。
  if (value) hasBeenShown.value = true

  const el = content.value
  if (!el) return

  // reduce motion：不跑高度動畫，直接切換 hidden。
  if (prefersReducedMotion()) {
    hidden.value = !value
    return
  }

  // 本次動畫是否已被新的切換作廢（快速連點時，舊的延後回呼不該再動 DOM）。
  let cancelled = false

  if (value) {
    // 開：先取消 hidden 讓內容可量測（lazy 內容也在此 flush 一併渲染），
    // 等 DOM 更新後從 0 過場到目標高度。
    hidden.value = false
    nextTick(() => {
      if (cancelled) return
      const height = el.scrollHeight
      // 守衛：內容高度為 0（空 slot + padding token 設為 0）時 0→0 不會有過場，
      // transitionend 永不觸發 → 樣式無法還原、panel 卡在收合外觀。直接呈現、不跑動畫。
      if (height === 0) return
      el.style.height = '0'
      el.style.overflow = 'hidden'
      void el.offsetHeight // 強制 reflow，確保起始高度生效
      el.style.transition = heightTransition(el)
      requestAnimationFrame(() => {
        if (cancelled) return
        el.style.height = `${height}px`
      })
    })
  } else {
    // 閉：以「當前實際盒高」為起點（中途被打斷也能平滑銜接，不會先跳到全高），再過場到 0。
    el.style.height = `${el.offsetHeight}px`
    el.style.overflow = 'hidden'
    void el.offsetHeight
    el.style.transition = heightTransition(el)
    requestAnimationFrame(() => {
      if (cancelled) return
      el.style.height = '0'
    })
  }

  const onEnd = (event: TransitionEvent) => {
    // 只認「外層 height 過場」結束：內層 opacity / transform 的 transitionend 會 bubble 上來，
    // 若一併處理會在高度動畫中途清掉 inline height → 高度瞬間跳掉造成卡頓。
    if (event.target !== el || event.propertyName !== 'height') return
    el.style.height = ''
    el.style.overflow = ''
    el.style.transition = ''
    if (!value) hidden.value = true // 收合完成才隱藏，避免過場被 display:none 中斷
    el.removeEventListener('transitionend', onEnd)
  }
  el.addEventListener('transitionend', onEnd)

  // 連續切換時作廢上一次未完成的延後回呼與監聽，避免 stale 動畫蓋掉最新狀態。
  onCleanup(() => {
    cancelled = true
    el.removeEventListener('transitionend', onEnd)
  })
})

defineSlots<{
  /** 自訂 summary 內容，提供目前展開狀態 `active` */
  summary(props: { active: boolean }): unknown
  /** 自訂展開指示 icon，提供 `active`（預設內建旋轉 chevron） */
  marker(props: { active: boolean }): unknown
  /** 面板內容 */
  default(props: Record<string, never>): unknown
}>()
</script>

<style scoped lang="scss">
// 動畫設定取自 token；standalone（無 BaseAccordion）時用 fallback 補上同一組預設。
.base-accordion__item {
  --_duration: var(--accordion-transition-duration, 300ms);
  --_easing: var(--accordion-transition-easing, cubic-bezier(0.4, 0, 0.2, 1));

  // item 之間用 border-top 當分隔線；第一個不畫（外框由 .base-accordion 提供，standalone 則無）。
  & + & {
    border-top: 1px solid var(--accordion-border-color, #e5e7eb);
  }
}

.base-accordion__heading {
  margin: 0;
  font: inherit;
}

.base-accordion__summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: var(--accordion-summary-padding-y, 0.9rem)
    var(--accordion-summary-padding-x, 1.125rem);
  font-family: inherit;
  font-size: var(--accordion-summary-font-size, 1rem);
  font-weight: var(--accordion-summary-font-weight, 500);
  line-height: 1.5;
  color: var(--accordion-summary-color, #1f2937);
  text-align: start;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color var(--_duration) var(--_easing);

  &:hover:not(:disabled) {
    background-color: var(--accordion-summary-bg-hover, #f9fafb);
  }

  &:active:not(:disabled) {
    background-color: var(--accordion-summary-bg-active, #f3f4f6);
  }

  &:focus-visible {
    outline: 2px solid var(--accordion-focus-ring, #2563eb);
    outline-offset: -2px;
  }

  &:disabled {
    opacity: var(--accordion-disabled-opacity, 0.45);
    cursor: not-allowed;
  }
}

.base-accordion__title {
  flex-grow: 1;
}

.base-accordion__marker {
  display: inline-flex;
  flex-shrink: 0;
  font-size: var(--accordion-marker-size, 1.25rem);
  color: var(--accordion-marker-color, #9ca3af);
  // 旋轉用 transition；曲線與高度動畫一致。
  transition: transform var(--_duration) var(--_easing);
}

.base-accordion__item--open .base-accordion__marker {
  transform: rotate(180deg);
  color: var(--accordion-summary-color, #1f2937);
}

.base-accordion__content {
  // 收合靜止態（[hidden]）為 display:none；展開時 height 由 JS 過場。
  color: var(--accordion-content-color, #4b5563);
}

.base-accordion__content-inner {
  // flow-root 建立 BFC：包住子元素 margin（不裁切），避免子層 margin 穿透折疊出容器，
  // 讓「量測（overflow:visible）/ 動畫（overflow:hidden）/ 結束（auto）」三種狀態高度一致，
  // 否則高度量測偏小、動畫結束還原 overflow 時會被那段 margin 撐開、出現跳一下。
  display: flow-root;
  padding: 0 var(--accordion-content-padding-x, 1.125rem)
    var(--accordion-content-padding-bottom, 1rem);
  // 內容淡入 + 輕微上移，與高度動畫疊加讓收合更柔順。
  opacity: 0;
  transform: translateY(-0.25rem);
  transition:
    opacity var(--_duration) var(--_easing),
    transform var(--_duration) var(--_easing);
}

.base-accordion__item--open .base-accordion__content-inner {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .base-accordion__summary,
  .base-accordion__marker,
  .base-accordion__content-inner {
    transition: none;
  }

  // 不跑動畫時內容直接呈現，避免停在透明 / 位移狀態。
  .base-accordion__content-inner {
    opacity: 1;
    transform: none;
  }
}
</style>
