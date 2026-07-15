<template>
  <nav
    v-if="pageCount > 0"
    :aria-label="ariaLabel"
    :aria-controls="ariaControls"
    :class="rootClass"
  >
    <ul class="base-pagination__list">
      <li
        v-for="item in items"
        :key="getItemKey(item)"
        class="base-pagination__item"
      >
        <!-- ── Ellipsis：純視覺，不可互動，SR 應跳過 ── -->
        <span
          v-if="item.type === 'start-ellipsis' || item.type === 'end-ellipsis'"
          class="base-pagination__ellipsis"
          aria-hidden="true"
        >
          <slot name="ellipsis">…</slot>
        </span>

        <!-- ── 一般按鈕（頁碼 / first / prev / next / last） ── -->
        <!--
          停用策略分兩軌：整組 disabled prop（靜態、無焦點議題）維持原生 disabled，
          不佔 Tab 順序；「邊界項」（首頁的 prev / 末頁的 next）改 aria-disabled +
          is-disabled class——站在倒數第二頁點 next 抵達末頁時，next 若轉原生 disabled
          會把鍵盤焦點踢回 body（APG 建議 aria-disabled 保持可聚焦）；點擊由 onItemClick 攔下。
        -->
        <BaseButton
          v-else
          :color="getButtonColor(item)"
          :variant="getButtonVariant(item)"
          :size="size"
          :shape="shape"
          :disabled="disabled"
          :aria-disabled="(!disabled && item.disabled) || undefined"
          :aria-label="getButtonAriaLabel(item)"
          :aria-current="item.ariaCurrent"
          class="base-pagination__button"
          :class="[
            `base-pagination__button--${item.type}`,
            {
              'base-pagination__button--selected': item.selected,
              'is-disabled': !disabled && item.disabled,
            },
          ]"
          @click="onItemClick(item)"
        >
          <!-- 頁碼：允許 caller 自訂頁碼長什麼樣子 -->
          <template v-if="item.type === 'page'">
            <slot name="page" :page="(item.page as number)" :selected="item.selected">
              {{ item.page }}
            </slot>
          </template>

          <!-- 預設 inline chevron SVG;1em 對齊字級、currentColor 跟字色,可用對應 slot 換 icon -->
          <template v-else-if="item.type === 'first'">
            <slot name="first-icon">
              <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </slot>
          </template>
          <template v-else-if="item.type === 'previous'">
            <slot name="prev-icon">
              <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </slot>
          </template>
          <template v-else-if="item.type === 'next'">
            <slot name="next-icon">
              <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </slot>
          </template>
          <template v-else-if="item.type === 'last'">
            <slot name="last-icon">
              <svg
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <polyline points="13 17 18 12 13 7" />
                <polyline points="6 17 11 12 6 7" />
              </svg>
            </slot>
          </template>
        </BaseButton>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'

import BaseButton from '~/components/atoms/BaseButton.vue'
import usePagination from '~/composables/usePagination'
import type { PaginationItem } from '~/composables/usePagination'

// ── Public types ─────────────────────────────────────────

export interface BasePaginationLabels {
  /** 「跳至第一頁」按鈕 aria-label @default 'Go to first page' */
  first?: string
  /** 「上一頁」按鈕 aria-label @default 'Go to previous page' */
  previous?: string
  /** 「下一頁」按鈕 aria-label @default 'Go to next page' */
  next?: string
  /** 「跳至最後一頁」按鈕 aria-label @default 'Go to last page' */
  last?: string
  /** 一般頁碼按鈕 aria-label（非當前頁） @default n => `Go to page ${n}` */
  page?: (page: number) => string
  /** 當前頁按鈕 aria-label @default n => `Page ${n}` */
  current?: (page: number) => string
}

export interface BasePaginationProps {
  // ── 資料 ──────────────────────────────────────────────────
  /** 每頁筆數 @default 10 */
  perPage?: number
  /** 總筆數（用於計算總頁數 = Math.ceil(total / perPage)） */
  total: number

  // ── 顯示控制 ──────────────────────────────────────────────
  /** 當前頁前後各顯示幾個兄弟頁碼 @default 1 */
  siblingCount?: number
  /** 開頭 / 結尾固定顯示幾個頁碼 @default 1 */
  boundaryCount?: number
  /** 顯示「跳至第一頁」按鈕 @default false */
  showFirstButton?: boolean
  /** 顯示「跳至最後一頁」按鈕 @default false */
  showLastButton?: boolean
  /** 隱藏「上一頁」按鈕 @default false */
  hidePrevButton?: boolean
  /** 隱藏「下一頁」按鈕 @default false */
  hideNextButton?: boolean

  // ── 狀態 ──────────────────────────────────────────────────
  /** 整體禁用 @default false */
  disabled?: boolean

  // ── 外觀（委派 BaseButton）─────────────────────────────────
  /**
   * 視覺風格:
   * - `outline`(預設):非選中態為描邊、選中態為填色;主色強調最明顯
   * - `text`:非選中態純文字無背景、選中態以主色文字標示;最低調
   * - `soft`:非選中態淺灰填色、選中態主色填色;按鈕感最明確
   * @default 'outline'
   */
  variant?: 'outline' | 'text' | 'soft'
  /** 按鈕尺寸 @default 'md' */
  size?: 'sm' | 'md' | 'lg'
  /** 語意色彩，影響選中態的填色 @default 'primary' */
  color?: 'primary' | 'danger' | 'success' | 'warning' | 'info' | 'neutral'
  /** 按鈕形狀 @default 'square' */
  shape?: 'square' | 'circle'

  // ── 無障礙 (a11y) ─────────────────────────────────────────
  /** `<nav>` 的 aria-label @default 'Pagination' */
  ariaLabel?: string
  /** 被分頁列表的 id（指向結果區），SR 能對應分頁按鈕影響哪個區域 */
  ariaControls?: string
  /** 按鈕 aria-label 字串（含 i18n / 自訂模板的逃生口） */
  labels?: BasePaginationLabels
}

const props = withDefaults(defineProps<BasePaginationProps>(), {
  // 資料
  perPage: 10,
  // 顯示控制
  siblingCount: 1,
  boundaryCount: 1,
  showFirstButton: false,
  showLastButton: false,
  hidePrevButton: false,
  hideNextButton: false,
  // 狀態
  disabled: false,
  // 外觀
  variant: 'outline',
  size: 'md',
  color: 'primary',
  shape: 'square',
  // a11y
  ariaLabel: 'Pagination',
  ariaControls: undefined,
  labels: () => ({}),
})

// ── v-model ──────────────────────────────────────────────

/** 當前頁碼(1-based);required 強制 caller 給初始頁,避免預設 1 顯示錯資料 */
const page = defineModel<number>({ required: true })

// ── Computed ─────────────────────────────────────────────

/** total / perPage 推導總頁數;邊界值(<= 0)回 0,template 端不渲染 `<nav>` */
const pageCount = computed(() => {
  if (props.total <= 0 || props.perPage <= 0) return 0
  return Math.ceil(props.total / props.perPage)
})

// total 縮小使 pageCount < 當前頁時,當前頁會落在不存在的頁。
// 收斂到最後一頁(pageCount),透過 v-model emit 通知父層;pageCount < 1(無資料)
// 時不動作 —— 此時不渲染 <nav>,且不該把 page 改成 0。
// immediate:初始 page 就超出初始 pageCount 時也立即收斂(callback 只用新值,首跑相容)。
watch(pageCount, (count) => {
  if (count >= 1 && page.value > count) {
    page.value = count
  }
}, { immediate: true })

const items = usePagination(() => ({
  page: page.value,
  count: pageCount.value,
  siblingCount: props.siblingCount,
  boundaryCount: props.boundaryCount,
  showFirstButton: props.showFirstButton,
  showLastButton: props.showLastButton,
  hidePrevButton: props.hidePrevButton,
  hideNextButton: props.hideNextButton,
  disabled: props.disabled,
  onChange: (next) => {
    page.value = next
  },
}))

// ── A11y labels ──────────────────────────────────────────

const DEFAULT_LABELS: Required<BasePaginationLabels> = {
  first: 'Go to first page',
  previous: 'Go to previous page',
  next: 'Go to next page',
  last: 'Go to last page',
  page: (n) => `Go to page ${n}`,
  current: (n) => `Page ${n}`,
}

// 逐欄位 fallback，避免 caller 傳入 `undefined` 時把預設字串覆蓋掉。
const mergedLabels = computed<Required<BasePaginationLabels>>(() => ({
  first: props.labels.first ?? DEFAULT_LABELS.first,
  previous: props.labels.previous ?? DEFAULT_LABELS.previous,
  next: props.labels.next ?? DEFAULT_LABELS.next,
  last: props.labels.last ?? DEFAULT_LABELS.last,
  page: props.labels.page ?? DEFAULT_LABELS.page,
  current: props.labels.current ?? DEFAULT_LABELS.current,
}))

/** 停用項的點擊攔截（見 template 註解：不用原生 disabled 以保留鍵盤焦點）。 */
function onItemClick(item: PaginationItem) {
  if (item.disabled) return
  item.onClick()
}

function getButtonAriaLabel(item: PaginationItem): string | undefined {
  const labels = mergedLabels.value
  switch (item.type) {
    case 'first':
      return labels.first
    case 'previous':
      return labels.previous
    case 'next':
      return labels.next
    case 'last':
      return labels.last
    case 'page':
      // item.page 在 type='page' 必為 number(usePagination 保證)
      return item.selected
        ? labels.current(item.page as number)
        : labels.page(item.page as number)
    default:
      return undefined
  }
}

// ── List key ─────────────────────────────────────────────

/**
 * 頁碼用真實頁碼;控制類型每種至多一次,用 type 即可。
 * 不用 index — list shift 時會讓 BaseButton destroy/recreate、焦點消失。
 */
function getItemKey(item: PaginationItem): string {
  return item.type === 'page' ? `page-${item.page}` : item.type
}

// ── Variant ⇆ BaseButton 映射 ─────────────────────────────
type BaseButtonVariant = 'solid' | 'outline' | 'text'

// 移除 prop optional 帶來的 undefined(withDefaults 後永遠有值)
type PaginationColor = NonNullable<BasePaginationProps['color']>

function getButtonVariant(item: PaginationItem): BaseButtonVariant {
  if (item.selected) {
    return props.variant === 'text' ? 'text' : 'solid'
  }
  switch (props.variant) {
    case 'text':
      return 'text'
    case 'soft':
      // 走 solid + .base-pagination--soft 內以 CSS var 覆寫成淺灰
      return 'solid'
    case 'outline':
    default:
      return 'outline'
  }
}

function getButtonColor(item: PaginationItem): PaginationColor {
  // 選中態一律用 caller 指定的 color(凸顯當前頁)
  if (item.selected) return props.color
  // 非選中態:outline 維持 caller color(描邊也跟主色);text / soft 強制 neutral
  return props.variant === 'outline' ? props.color : 'neutral'
}

const rootClass = computed(() => [
  'base-pagination',
  `base-pagination--${props.variant}`,
  `base-pagination--${props.size}`,
])

defineSlots<{
  /** 完全覆寫頁碼按鈕內容（少見，預設為 `{{ item.page }}`） */
  page(props: { page: number; selected: boolean }): unknown
  /** 自訂「跳至第一頁」按鈕內容（預設內建 chevron） */
  'first-icon'(props: Record<string, never>): unknown
  /** 自訂「上一頁」按鈕內容（預設內建 chevron） */
  'prev-icon'(props: Record<string, never>): unknown
  /** 自訂「下一頁」按鈕內容（預設內建 chevron） */
  'next-icon'(props: Record<string, never>): unknown
  /** 自訂「跳至最後一頁」按鈕內容（預設內建 chevron） */
  'last-icon'(props: Record<string, never>): unknown
  /** 自訂 ellipsis 顯示（預設 `…` 文字） */
  ellipsis(props: Record<string, never>): unknown
}>()
</script>

<style scoped lang="scss">
/*
 * BasePagination — 客製優先覆寫 --pg-* token;深層客製按鈕本體走 BaseButton --btn-* token。
 * 完整 token 表與覆寫範例見 docs/components/BasePagination.md §10。
 */

.base-pagination {
  // ── 共用 tokens ──────────────────────────────────────────
  --pg-gap: 6px;
  --pg-ellipsis-color: #6b7280; // gray-500
  --pg-ellipsis-min-width: 36px; // 與 md 按鈕等寬,避免換行時擠壓
  --pg-ellipsis-min-height: 36px; // 跟 md 按鈕同高,讓整排 chip 視覺對齊
  --pg-chip-radius: 6px; // chip 圓角,跟 BaseButton md 預設一致

  // ── Disabled token(全灰)──────────────────────────────────
  // 三個 variant 共用配色;soft 額外用兩階灰保留「選中 vs 非選中」階級。
  --pg-disabled-color: #9ca3af;        // gray-400 文字(outline / text)
  --pg-disabled-bg: transparent;        // soft variant 內再覆寫
  --pg-disabled-border: #e5e7eb;        // gray-200 邊框(僅 outline 需要)

  // Soft disabled 兩階灰(對比 ~3.5:1 / ~6.4:1)
  --pg-disabled-bg-soft: #f3f4f6;              // 非選中底(gray-100)
  --pg-disabled-color-soft: #6b7280;           // 非選中文字(gray-500)
  --pg-disabled-bg-soft-selected: #d1d5db;     // 選中底(gray-300,深一階保留階級)
  --pg-disabled-color-soft-selected: #374151;  // 選中文字(gray-700)

  // ── Soft variant token ──────────────────────────────────
  // 非選中按鈕的淺灰填色;caller 可整組覆寫品牌色系
  --pg-soft-bg: #f3f4f6;               // gray-100
  --pg-soft-bg-hover: #e5e7eb;         // gray-200
  --pg-soft-bg-active: #d1d5db;        // gray-300
  --pg-soft-color: #1f2937;            // gray-800
}

.base-pagination__list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: var(--pg-gap);
  row-gap: var(--pg-gap);
  margin: 0;
  padding: 0;
  list-style: none;
}

.base-pagination__item {
  display: inline-flex;
  align-items: center;
}

.base-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: var(--pg-ellipsis-min-width);
  min-height: var(--pg-ellipsis-min-height);
  color: var(--pg-ellipsis-color);
  user-select: none;
  line-height: 1;
}

// ── Size-aware ellipsis 尺寸 ─────────────────────────────
// ellipsis 不是 BaseButton,改靠 root size class 同步寬高,確保跟按鈕等高。
.base-pagination--sm {
  --pg-ellipsis-min-width: 28px;
  --pg-ellipsis-min-height: 28px;
}

.base-pagination--lg {
  --pg-ellipsis-min-width: 44px;
  --pg-ellipsis-min-height: 44px;
}

// ── Variant: soft ────────────────────────────────────────
// 非選中走 BaseButton solid + 覆寫 token 改淺灰。
// Ellipsis 也套 chip 樣式,讓整排 row 節奏一致 → 選中的深色 chip 才能 pop
// (沒 chip → row 中間空洞 → 選中被淡化)。
.base-pagination--soft {
  .base-pagination__button:not(.base-pagination__button--selected) {
    --btn-bg: var(--pg-soft-bg);
    --btn-bg-hover: var(--pg-soft-bg-hover);
    --btn-bg-active: var(--pg-soft-bg-active);
    --btn-color: var(--pg-soft-color);
    --btn-border-color: transparent;
  }

  // Ellipsis 套 chip 樣式:bg 跟非選中按鈕同色,圓角同寬高,維持 row 的視覺節奏
  .base-pagination__ellipsis {
    background-color: var(--pg-soft-bg);
    border-radius: var(--pg-chip-radius);
  }
}

// ── Disabled 全灰覆寫 ────────────────────────────────────
// 取代 BaseButton 預設 opacity: 0.5(避免色相殘留),改用顯式灰階 token。
// 各 variant 差異:outline 保留邊框 / text 全透明 / soft 保留淺灰底。
.base-pagination__button {
  &:disabled,
  &.is-disabled {
    --btn-color: var(--pg-disabled-color);
    --btn-bg: var(--pg-disabled-bg);
    --btn-bg-hover: var(--pg-disabled-bg);
    --btn-bg-active: var(--pg-disabled-bg);
    --btn-border-color: transparent;
    opacity: 1;
  }
}

.base-pagination--outline .base-pagination__button {
  &:disabled,
  &.is-disabled {
    --btn-border-color: var(--pg-disabled-border);
  }
}

// ── Soft disabled:兩階灰保留「當前頁」階級 ──────────────
// 啟用態靠「淺灰底 vs 主色底」標示當前頁;disabled 若全壓 gray-100 會找不到當前頁。
// 故維持兩階對比,並把文字色拉深(gray-500 / gray-700)補對比度損失。
.base-pagination--soft .base-pagination__button {
  &:disabled,
  &.is-disabled {
    --btn-bg: var(--pg-disabled-bg-soft);
    --btn-bg-hover: var(--pg-disabled-bg-soft);
    --btn-bg-active: var(--pg-disabled-bg-soft);
    --btn-color: var(--pg-disabled-color-soft);
  }

  // 選中態 disabled:背景明顯較深、文字較深、字重加粗 → 仍辨識得出當前頁
  &.base-pagination__button--selected:disabled,
  &.base-pagination__button--selected.is-disabled {
    --btn-bg: var(--pg-disabled-bg-soft-selected);
    --btn-bg-hover: var(--pg-disabled-bg-soft-selected);
    --btn-bg-active: var(--pg-disabled-bg-soft-selected);
    --btn-color: var(--pg-disabled-color-soft-selected);
    font-weight: 600;
  }
}
</style>
