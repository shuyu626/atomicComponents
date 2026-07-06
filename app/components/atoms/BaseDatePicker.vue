<template>
  <BaseFormField
    class="base-date-picker"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <!--
      控制項：BaseFormField 透過 scoped slot props 傳入 a11y 接線（id / describedby /
      invalid / required / disabled / readonly）。控制項為 role="button" 的 div,
      浮層（日曆面板）、focus-trap、Esc、點外關閉、定位交給 BasePopover。
    -->
    <template #default="{ id, labelledby, describedby, invalid, required: isRequired, disabled: isDisabledState, readonly: isReadonlyState }">
      <BasePopover
        v-model="active"
        role="dialog"
        :placement="placement"
        :disabled="isDisabledState || isReadonlyState"
        trigger="click"
      >
        <template #reference>
          <div
            :id="id"
            ref="controlRef"
            class="base-date-picker__control"
            role="button"
            aria-haspopup="dialog"
            :aria-expanded="active"
            :aria-labelledby="labelledby"
            :aria-describedby="describedby"
            :aria-invalid="invalid"
            :aria-required="isRequired"
            :aria-disabled="isDisabledState || undefined"
            :tabindex="isDisabledState ? -1 : 0"
          >
            <span
              v-if="$slots.prepend"
              class="base-date-picker__prepend"
            >
              <slot name="prepend" />
            </span>

            <span
              class="base-date-picker__text"
              :class="{ 'base-date-picker__placeholder': !hasValue }"
            >{{ displayText || placeholderText }}</span>

            <!-- 表單值：hidden input 提交 ISO 值（區間提交 start / end 兩個）。 -->
            <template v-if="name">
              <input
                v-if="!range"
                type="hidden"
                :name="name"
                :value="typeof model === 'string' ? model : ''"
              >
              <template v-else>
                <input
                  type="hidden"
                  :name="`${name}-start`"
                  :value="rangeStart ? toISO(rangeStart) : ''"
                >
                <input
                  type="hidden"
                  :name="`${name}-end`"
                  :value="rangeEnd ? toISO(rangeEnd) : ''"
                >
              </template>
            </template>

            <button
              v-if="clearable && hasValue && !isDisabledState && !isReadonlyState"
              type="button"
              class="base-date-picker__clear"
              :aria-label="clearLabel"
              @mousedown.prevent
              @click.stop="clear"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
            </button>

            <svg
              class="base-date-picker__icon"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              focusable="false"
            >
              <rect
                x="3"
                y="4"
                width="18"
                height="17"
                rx="2"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
              <path
                d="M3 9h18M8 2v4M16 2v4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
              />
            </svg>
          </div>
        </template>

        <!-- 浮層內容：月曆面板。 -->
        <div class="base-date-picker__panel">
          <!-- 單選共用 header（含年 / 月快選觸發）。區間改為每個面板各自的 header。 -->
          <div
            v-if="!range"
            class="base-date-picker__header"
          >
            <button
              type="button"
              class="base-date-picker__nav base-date-picker__nav--prev-block"
              :aria-label="prevBlockLabel"
              @click="navBlock(-1)"
            >&#171;</button>
            <button
              v-if="viewMode === 'date'"
              type="button"
              class="base-date-picker__nav base-date-picker__nav--prev-month"
              aria-label="上個月"
              @click="shiftMonth(-1)"
            >&#8249;</button>

            <div class="base-date-picker__title">
              <span
                v-if="viewMode === 'year'"
                class="base-date-picker__title-range"
              >{{ yearPageStart }} - {{ yearPageStart + 11 }}</span>
              <template v-else>
                <button
                  type="button"
                  class="base-date-picker__title-btn"
                  aria-label="選擇年份"
                  @click="openYearView"
                >{{ viewYear }}年</button>
                <button
                  v-if="viewMode === 'date'"
                  type="button"
                  class="base-date-picker__title-btn"
                  aria-label="選擇月份"
                  @click="openMonthView"
                >{{ monthLabels[viewMonth] }}</button>
              </template>
            </div>

            <button
              v-if="viewMode === 'date'"
              type="button"
              class="base-date-picker__nav base-date-picker__nav--next-month"
              aria-label="下個月"
              @click="shiftMonth(1)"
            >&#8250;</button>
            <button
              type="button"
              class="base-date-picker__nav base-date-picker__nav--next-block"
              :aria-label="nextBlockLabel"
              @click="navBlock(1)"
            >&#187;</button>
          </div>

          <div
            v-if="viewMode === 'date'"
            class="base-date-picker__months"
          >
            <div
              v-for="(view, vi) in monthsToRender"
              :key="vi"
              class="base-date-picker__month"
            >
              <!-- 區間:每個面板各自的 header。年 / 月標題可點,分別進年 / 月快選;箭頭依模式翻月 / 年 / 頁。 -->
              <div
                v-if="range"
                class="base-date-picker__pane-header"
              >
                <button
                  type="button"
                  class="base-date-picker__nav"
                  :aria-label="paneViewMode(vi) === 'year' ? '上一頁' : '上一年'"
                  @click="paneNavBlock(vi, -1)"
                >&#171;</button>
                <button
                  v-if="paneViewMode(vi) === 'date'"
                  type="button"
                  class="base-date-picker__nav"
                  aria-label="上個月"
                  @click="navPane(vi, 'month', -1)"
                >&#8249;</button>

                <div class="base-date-picker__title">
                  <span
                    v-if="paneViewMode(vi) === 'year'"
                    class="base-date-picker__title-range"
                  >{{ rangeYearPageAt(vi) }} - {{ rangeYearPageAt(vi) + 11 }}</span>
                  <template v-else>
                    <button
                      type="button"
                      class="base-date-picker__title-btn"
                      aria-label="選擇年份"
                      @click="openPaneYear(vi)"
                    >{{ view.year }}年</button>
                    <button
                      v-if="paneViewMode(vi) === 'date'"
                      type="button"
                      class="base-date-picker__title-btn"
                      aria-label="選擇月份"
                      @click="openPaneMonth(vi)"
                    >{{ monthLabels[view.month] }}</button>
                  </template>
                </div>

                <button
                  v-if="paneViewMode(vi) === 'date'"
                  type="button"
                  class="base-date-picker__nav"
                  aria-label="下個月"
                  @click="navPane(vi, 'month', 1)"
                >&#8250;</button>
                <button
                  type="button"
                  class="base-date-picker__nav"
                  :aria-label="paneViewMode(vi) === 'year' ? '下一頁' : '下一年'"
                  @click="paneNavBlock(vi, 1)"
                >&#187;</button>
              </div>

              <!-- 日曆:單選一律走此;區間為該面板 date 模式時。 -->
              <template v-if="paneViewMode(vi) === 'date'">
                <div
                  class="base-date-picker__weekdays"
                  aria-hidden="true"
                >
                  <span
                    v-for="(w, wi) in rotatedWeekdays"
                    :key="wi"
                    class="base-date-picker__weekday"
                  >{{ w }}</span>
                </div>

                <div
                  class="base-date-picker__grid"
                  role="grid"
                  @keydown="onGridKeydown"
                >
                  <div
                    v-for="(week, ri) in matrixOf(view)"
                    :key="ri"
                    class="base-date-picker__week"
                    role="row"
                  >
                    <button
                      v-for="day in week"
                      :key="toISO(day)"
                      type="button"
                      role="gridcell"
                      class="base-date-picker__day"
                      :class="dayClasses(day, view.month, vi)"
                      :data-iso="toISO(day)"
                      :tabindex="dayTabindex(day, view.month)"
                      :disabled="isDisabled(day)"
                      :aria-selected="isSelected(day) || undefined"
                      :aria-disabled="isDisabled(day) || undefined"
                      @click="pick(day)"
                      @mouseenter="onDayHover(day)"
                    >{{ day.getDate() }}</button>
                  </div>
                </div>
              </template>

              <!-- 區間:該面板月份快選。 -->
              <div
                v-else-if="paneViewMode(vi) === 'month'"
                class="base-date-picker__quick base-date-picker__quick--month"
              >
                <button
                  v-for="(label, m) in monthLabels"
                  :key="m"
                  type="button"
                  class="base-date-picker__quick-cell"
                  :class="{
                    'base-date-picker__quick-cell--selected': m === paneMonthAt(vi),
                    'base-date-picker__quick-cell--today': paneIsCurrentMonth(vi, m),
                  }"
                  @click="pickPaneMonth(vi, m)"
                >{{ label }}</button>
              </div>

              <!-- 區間:該面板年份快選。 -->
              <div
                v-else
                class="base-date-picker__quick base-date-picker__quick--year"
              >
                <button
                  v-for="y in paneYearCells(vi)"
                  :key="y"
                  type="button"
                  class="base-date-picker__quick-cell"
                  :class="{
                    'base-date-picker__quick-cell--selected': y === paneYearAt(vi),
                    'base-date-picker__quick-cell--today': paneIsCurrentYear(y),
                  }"
                  @click="pickPaneYear(vi, y)"
                >{{ y }}</button>
              </div>
            </div>
          </div>

          <!-- 月份快速選取 -->
          <div
            v-else-if="viewMode === 'month'"
            class="base-date-picker__quick base-date-picker__quick--month"
          >
            <button
              v-for="(label, m) in monthLabels"
              :key="m"
              type="button"
              class="base-date-picker__quick-cell"
              :class="{
                'base-date-picker__quick-cell--selected': m === viewMonth,
                'base-date-picker__quick-cell--today': isCurrentMonth(m),
              }"
              @click="pickMonth(m)"
            >{{ label }}</button>
          </div>

          <!-- 年份快速選取 -->
          <div
            v-else
            class="base-date-picker__quick base-date-picker__quick--year"
          >
            <button
              v-for="y in yearCells"
              :key="y"
              type="button"
              class="base-date-picker__quick-cell"
              :class="{
                'base-date-picker__quick-cell--selected': y === viewYear,
                'base-date-picker__quick-cell--today': isCurrentYear(y),
              }"
              @click="pickYear(y)"
            >{{ y }}</button>
          </div>
        </div>
      </BasePopover>
    </template>

    <template
      v-if="displayMessage || $slots.message"
      #message="{ error }"
    >
      <slot
        name="message"
        :error="error"
        :message="displayMessage"
      >{{ displayMessage }}</slot>
    </template>
  </BaseFormField>
</template>

<script lang="ts">
/** 單選綁 ISO `'YYYY-MM-DD'`;區間綁兩個 ISO 的 tuple。 */
export type BaseDatePickerModel = string | [string, string]
</script>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import BasePopover from '~/components/atoms/BasePopover.vue'
import type { BasePopoverPlacement } from '~/components/atoms/BasePopover.vue'
import useFormFieldProps from '~/composables/useFormFieldProps'
import useValidation from '~/composables/useValidation'
import { buildMonthMatrix, isAfter, isBefore, isSameDay, parseISO, toISO } from '~/utils/date'
import type { ValidationRule } from '~/utils/validators'

export interface BaseDatePickerProps extends BaseFormFieldProps {
  /** 區間模式：雙月面板,v-model 綁 `[start, end]` tuple。 @default false */
  range?: boolean
  /** 控制項顯示格式化（不影響 v-model 的 ISO 值）。 @default (iso) => iso.replaceAll('-', '/') */
  format?: (iso: string) => string
  /** 單選 placeholder。 */
  placeholder?: string
  /** 區間起始 placeholder。 */
  startPlaceholder?: string
  /** 區間結束 placeholder。 */
  endPlaceholder?: string
  /** 區間分隔文字。 @default '至' */
  rangeSeparator?: string
  /** 可選日期下界（ISO）；界外禁用。 */
  min?: string
  /** 可選日期上界（ISO）；界外禁用。 */
  max?: string
  /** 自訂禁用判斷（回 true 表示該日不可選）。 */
  disabledDate?: (date: Date) => boolean
  /** 有值時顯示清除鈕。 @default true */
  clearable?: boolean
  /** 清除鈕 aria-label（i18n 覆寫點）。 @default '清除' */
  clearLabel?: string
  /** 每週起始（0=週日 ... 6=週六）。 @default 0 */
  firstDayOfWeek?: number
  /** 週標題（7 個,索引 0=週日）。i18n 覆寫點。 */
  weekdayLabels?: string[]
  /** 月標題（12 個）。i18n 覆寫點。 */
  monthLabels?: string[]
  /** 送出表單用 name（區間會產生 `${name}-start` / `${name}-end` 兩個 hidden input）。 */
  name?: string
  /** 浮層位置。 @default 'bottom-start' */
  placement?: BasePopoverPlacement
  /** 驗證規則陣列（touched-gated）；浮層關閉時觸發 touch（等同失焦）。 */
  rules?: ValidationRule<BaseDatePickerModel | undefined>[]
}

const props = withDefaults(defineProps<BaseDatePickerProps>(), {
  range: false,
  format: undefined,
  placeholder: undefined,
  startPlaceholder: undefined,
  endPlaceholder: undefined,
  rangeSeparator: '至',
  min: undefined,
  max: undefined,
  disabledDate: undefined,
  clearable: true,
  clearLabel: '清除',
  firstDayOfWeek: 0,
  weekdayLabels: () => ['日', '一', '二', '三', '四', '五', '六'],
  monthLabels: () => ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  name: undefined,
  placement: 'bottom-start',
  rules: undefined,
})

defineSlots<{
  /** 標籤內容,取代 `label` prop。 */
  label?: () => unknown
  /** 控制項前綴（自訂 icon 等）。 */
  prepend?: () => unknown
  /** 訊息內容,取代 `message` prop。scoped props：`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** 單選綁 string;區間綁 tuple;未選為 undefined。 */
const model = defineModel<BaseDatePickerModel>()

const controlRef = ref<HTMLElement | null>(null)
const active = ref(false)

// 面板檢視中的年月。單選 / 區間左面板用 viewYear/viewMonth;
// 區間右面板用 viewYear2/viewMonth2,兩側可各自導覽（維持 左 < 右）。
const viewYear = ref(2000)
const viewMonth = ref(0)
const viewYear2 = ref(2000)
const viewMonth2 = ref(1)

// 面板檢視模式:日曆 / 月份快選 / 年份快選;年份快選頁的起始年。
const viewMode = ref<'date' | 'month' | 'year'>('date')
const yearPageStart = ref(2000)

// 今日 / 鍵盤聚焦日 / 區間待定起點 / 區間 hover 預覽（皆 client-only 設定,避免 SSR 碰 Date.now）。
const today = ref<Date | null>(null)
const focusedDate = ref<Date | null>(null)
const pendingStart = ref<Date | null>(null)
const hoverDate = ref<Date | null>(null)

const formatFn = computed(() => props.format ?? ((iso: string) => iso.replaceAll('-', '/')))

// ── 值解析 ──────────────────────────────────────────────────────────────────
const singleDate = computed<Date | null>(() =>
  !props.range && typeof model.value === 'string' ? parseISO(model.value) : null,
)
const rangeStart = computed<Date | null>(() =>
  props.range && Array.isArray(model.value) ? parseISO(model.value[0]) : null,
)
const rangeEnd = computed<Date | null>(() =>
  props.range && Array.isArray(model.value) ? parseISO(model.value[1]) : null,
)

const hasValue = computed<boolean>(() =>
  props.range
    ? !!rangeStart.value && !!rangeEnd.value
    : typeof model.value === 'string' && model.value !== '',
)

const displayText = computed<string>(() => {
  if (props.range) {
    if (!rangeStart.value || !rangeEnd.value) return ''
    return `${formatFn.value(toISO(rangeStart.value))} ${props.rangeSeparator} ${formatFn.value(toISO(rangeEnd.value))}`
  }
  return singleDate.value ? formatFn.value(toISO(singleDate.value)) : ''
})

const placeholderText = computed<string>(() => {
  if (props.range) {
    const start = props.startPlaceholder ?? props.placeholder ?? '開始日期'
    const end = props.endPlaceholder ?? '結束日期'
    return `${start} ${props.rangeSeparator} ${end}`
  }
  return props.placeholder ?? ''
})

// ── 檢視年月 ────────────────────────────────────────────────────────────────
function fallbackToday(): Date {
  return today.value ?? new Date()
}
function baseViewDate(): Date {
  if (props.range && rangeStart.value) return rangeStart.value
  if (!props.range && singleDate.value) return singleDate.value
  return fallbackToday()
}
function syncView() {
  const d = baseViewDate()
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
  if (props.range) {
    // 右面板預設為左面板 +1 月;開啟後兩側可各自導覽。
    const next = addMonths(viewYear.value, viewMonth.value, 1)
    viewYear2.value = next.year
    viewMonth2.value = next.month
  }
}

const monthsToRender = computed(() => {
  const list = [{ year: viewYear.value, month: viewMonth.value }]
  if (props.range) list.push({ year: viewYear2.value, month: viewMonth2.value })
  return list
})

function matrixOf(view: { year: number; month: number }): Date[][] {
  return buildMonthMatrix(view.year, view.month, props.firstDayOfWeek)
}

const rotatedWeekdays = computed<string[]>(() =>
  props.weekdayLabels.map((_, i) => props.weekdayLabels[(props.firstDayOfWeek + i) % 7] ?? ''),
)

// ── 日狀態 ──────────────────────────────────────────────────────────────────
const minDate = computed<Date | null>(() => (props.min ? parseISO(props.min) : null))
const maxDate = computed<Date | null>(() => (props.max ? parseISO(props.max) : null))

function isDisabled(day: Date): boolean {
  if (minDate.value && isBefore(day, minDate.value)) return true
  if (maxDate.value && isAfter(day, maxDate.value)) return true
  return props.disabledDate ? props.disabledDate(day) : false
}

function isToday(day: Date): boolean {
  return !!today.value && isSameDay(day, today.value)
}

function isSelected(day: Date): boolean {
  if (props.range) {
    return (!!rangeStart.value && isSameDay(day, rangeStart.value))
      || (!!rangeEnd.value && isSameDay(day, rangeEnd.value))
  }
  return !!singleDate.value && isSameDay(day, singleDate.value)
}

// 目前生效的區間（已 commit 或 hover 預覽,皆升冪排序）。
const activeRange = computed<[Date, Date] | null>(() => {
  if (!props.range) return null
  if (pendingStart.value && hoverDate.value) {
    return isBefore(hoverDate.value, pendingStart.value)
      ? [hoverDate.value, pendingStart.value]
      : [pendingStart.value, hoverDate.value]
  }
  if (rangeStart.value && rangeEnd.value) return [rangeStart.value, rangeEnd.value]
  return null
})

function isInRange(day: Date): boolean {
  const r = activeRange.value
  return !!r && isAfter(day, r[0]) && isBefore(day, r[1])
}

function rangeEndpoint(day: Date): 'start' | 'end' | null {
  const r = activeRange.value
  if (!r) {
    if (pendingStart.value && isSameDay(day, pendingStart.value)) return 'start'
    return null
  }
  if (isSameDay(day, r[0])) return 'start'
  if (isSameDay(day, r[1])) return 'end'
  return null
}

function dayClasses(day: Date, month: number, viewIndex: number) {
  const endpoint = props.range ? rangeEndpoint(day) : null
  const inRange = isInRange(day)
  const hasBand = !!endpoint || inRange
  // 該日在該列的欄位(0=週首, 6=週尾),供色帶分列收圓用。
  const col = (day.getDay() - props.firstDayOfWeek + 7) % 7
  // 單日區間(起訖同日):端點需兩側皆收圓,避免只丸半邊的半膠囊。
  const r = activeRange.value
  const isSingleDay = !!endpoint && !!r && isSameDay(r[0], r[1])
  return {
    'base-date-picker__day--adjacent': day.getMonth() !== month,
    'base-date-picker__day--today': isToday(day),
    'base-date-picker__day--selected': !props.range && isSelected(day),
    'base-date-picker__day--in-range': inRange,
    'base-date-picker__day--range-start': endpoint === 'start',
    'base-date-picker__day--range-end': endpoint === 'end',
    // 色帶每列收圓:區間端點或該列左/右緣(週首 / 週尾)處收圓角。
    'base-date-picker__day--cap-left': hasBand && (endpoint === 'start' || isSingleDay || col === 0),
    'base-date-picker__day--cap-right': hasBand && (endpoint === 'end' || isSingleDay || col === 6),
    // 僅用於避免同一日在雙月都拿到 roving 焦點時的視覺重複（保留擴充點）。
    'base-date-picker__day--secondary': viewIndex > 0,
  }
}

function dayTabindex(day: Date, month: number): number {
  if (day.getMonth() !== month) return -1
  return focusedDate.value && isSameDay(day, focusedDate.value) ? 0 : -1
}

// ── 互動 ────────────────────────────────────────────────────────────────────
function pick(day: Date) {
  if (isDisabled(day)) return

  if (!props.range) {
    model.value = toISO(day)
    active.value = false
    return
  }

  if (!pendingStart.value) {
    pendingStart.value = day
    focusedDate.value = day
    return
  }

  const [a, b] = isBefore(day, pendingStart.value)
    ? [day, pendingStart.value]
    : [pendingStart.value, day]
  model.value = [toISO(a), toISO(b)]
  pendingStart.value = null
  hoverDate.value = null
  active.value = false
}

function onDayHover(day: Date) {
  if (props.range && pendingStart.value) hoverDate.value = day
}

function clear() {
  model.value = undefined
  pendingStart.value = null
  hoverDate.value = null
}

function shiftMonth(delta: number) {
  let m = viewMonth.value + delta
  let y = viewYear.value
  while (m < 0) { m += 12; y-- }
  while (m > 11) { m -= 12; y++ }
  viewMonth.value = m
  viewYear.value = y
}

function shiftYear(delta: number) {
  viewYear.value += delta
}

// ── 區間雙面板:左右各自導覽 ──────────────────────────────────────────────────
function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  let m = month + delta
  let y = year
  while (m < 0) { m += 12; y-- }
  while (m > 11) { m -= 12; y++ }
  return { year: y, month: m }
}

/** 年月序數,供左 / 右面板比大小。 */
function ordinal(year: number, month: number): number {
  return year * 12 + month
}

// 設定左 / 右面板年月,並維持「左 < 右」:任一側越界時把另一側推開一個月。
function setLeftView(year: number, month: number) {
  viewYear.value = year
  viewMonth.value = month
  if (ordinal(year, month) >= ordinal(viewYear2.value, viewMonth2.value)) {
    const next = addMonths(year, month, 1)
    viewYear2.value = next.year
    viewMonth2.value = next.month
  }
}
function setRightView(year: number, month: number) {
  viewYear2.value = year
  viewMonth2.value = month
  if (ordinal(year, month) <= ordinal(viewYear.value, viewMonth.value)) {
    const prev = addMonths(year, month, -1)
    viewYear.value = prev.year
    viewMonth.value = prev.month
  }
}

/** 面板導覽:`paneIndex` 0=左 1=右;`unit` 換月 / 換年;`delta` ±1。 */
function navPane(paneIndex: number, unit: 'month' | 'year', delta: number) {
  const isLeft = paneIndex === 0
  const y = isLeft ? viewYear.value : viewYear2.value
  const m = isLeft ? viewMonth.value : viewMonth2.value
  const next = unit === 'month' ? addMonths(y, m, delta) : { year: y + delta, month: m }
  if (isLeft) setLeftView(next.year, next.month)
  else setRightView(next.year, next.month)
}

// ── 區間雙面板:每個面板各自的年 / 月快選（左右、年月皆獨立）───────────────────
// 各面板的檢視模式與年份快選頁起始年（索引 0=左 1=右）。
const rangePaneMode = ref<('date' | 'month' | 'year')[]>(['date', 'date'])
const rangeYearPage = ref<number[]>([2000, 2000])

/** 該面板年份快選頁起始年;封裝索引存取避免 undefined。 */
function rangeYearPageAt(pane: number): number {
  return rangeYearPage.value[pane] ?? 0
}

/** 該面板目前檢視模式;單選一律 date（單選走共用 header 的 viewMode）。 */
function paneViewMode(pane: number): 'date' | 'month' | 'year' {
  return props.range ? (rangePaneMode.value[pane] ?? 'date') : 'date'
}
function paneYearAt(pane: number): number {
  return pane === 0 ? viewYear.value : viewYear2.value
}
function paneMonthAt(pane: number): number {
  return pane === 0 ? viewMonth.value : viewMonth2.value
}
function setPaneYearOnly(pane: number, year: number) {
  if (pane === 0) viewYear.value = year
  else viewYear2.value = year
}
function paneYearCells(pane: number): number[] {
  const startYear = rangeYearPageAt(pane)
  return Array.from({ length: 12 }, (_, i) => startYear + i)
}
function paneIsCurrentMonth(pane: number, month: number): boolean {
  return !!today.value && today.value.getFullYear() === paneYearAt(pane) && today.value.getMonth() === month
}
function paneIsCurrentYear(year: number): boolean {
  return !!today.value && today.value.getFullYear() === year
}

// 點面板標題:進入年 / 月快選。
function openPaneYear(pane: number) {
  rangeYearPage.value[pane] = Math.floor(paneYearAt(pane) / 12) * 12
  rangePaneMode.value[pane] = 'year'
}
function openPaneMonth(pane: number) {
  rangePaneMode.value[pane] = 'month'
}
// 快選年:設定該面板年份後續選月份。
function pickPaneYear(pane: number, year: number) {
  setPaneYearOnly(pane, year)
  rangePaneMode.value[pane] = 'month'
}
// 快選月:連同該面板現有年份 commit（維持左 < 右）,回到日曆。
function pickPaneMonth(pane: number, month: number) {
  if (pane === 0) setLeftView(paneYearAt(0), month)
  else setRightView(paneYearAt(1), month)
  rangePaneMode.value[pane] = 'date'
}
// 標題兩側 «/» 依模式切換單位:日曆翻年、月快選翻年、年快選翻頁（12 年）。
function paneNavBlock(pane: number, delta: number) {
  const mode = paneViewMode(pane)
  if (mode === 'year') rangeYearPage.value[pane] = rangeYearPageAt(pane) + delta * 12
  else if (mode === 'month') setPaneYearOnly(pane, paneYearAt(pane) + delta)
  else navPane(pane, 'year', delta)
}

// ── 年 / 月快速選取 ──────────────────────────────────────────────────────────
// 年份快選頁的 12 個年份（對齊 12 年為一頁）。
const yearCells = computed<number[]>(() =>
  Array.from({ length: 12 }, (_, i) => yearPageStart.value + i),
)

const prevBlockLabel = computed(() => (viewMode.value === 'year' ? '上一頁' : '上一年'))
const nextBlockLabel = computed(() => (viewMode.value === 'year' ? '下一頁' : '下一年'))

function isCurrentMonth(month: number): boolean {
  return !!today.value && today.value.getFullYear() === viewYear.value && today.value.getMonth() === month
}
function isCurrentYear(year: number): boolean {
  return !!today.value && today.value.getFullYear() === year
}

function openYearView() {
  yearPageStart.value = Math.floor(viewYear.value / 12) * 12
  viewMode.value = 'year'
}
function openMonthView() {
  viewMode.value = 'month'
}
function pickYear(year: number) {
  viewYear.value = year
  viewMode.value = 'month'
}
function pickMonth(month: number) {
  viewMonth.value = month
  viewMode.value = 'date'
}

// 標題兩側的 «/» 依模式切換單位:日曆翻年、月份快選翻年、年份快選翻頁（12 年）。
function navBlock(delta: number) {
  if (viewMode.value === 'year') yearPageStart.value += delta * 12
  else if (viewMode.value === 'month') viewYear.value += delta
  else shiftYear(delta)
}

function addDays(date: Date, n: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + n)
}

function focusDay(day: Date) {
  nextTick(() => {
    const el = document.querySelector<HTMLElement>(`.base-date-picker__day[data-iso="${toISO(day)}"]`)
    el?.focus()
  })
}

function onGridKeydown(event: KeyboardEvent) {
  const cur = focusedDate.value
  if (!cur) return

  let next: Date | null = null
  switch (event.key) {
    case 'ArrowRight': next = addDays(cur, 1); break
    case 'ArrowLeft': next = addDays(cur, -1); break
    case 'ArrowDown': next = addDays(cur, 7); break
    case 'ArrowUp': next = addDays(cur, -7); break
    case 'Home': next = addDays(cur, -((cur.getDay() - props.firstDayOfWeek + 7) % 7)); break
    case 'End': next = addDays(cur, 6 - ((cur.getDay() - props.firstDayOfWeek + 7) % 7)); break
    case 'PageUp': next = new Date(cur.getFullYear(), cur.getMonth() - 1, cur.getDate()); break
    case 'PageDown': next = new Date(cur.getFullYear(), cur.getMonth() + 1, cur.getDate()); break
    case 'Enter':
    case ' ':
      event.preventDefault()
      pick(cur)
      return
    default:
      return
  }

  event.preventDefault()
  focusedDate.value = next
  if (props.range) {
    setLeftView(next.getFullYear(), next.getMonth())
  }
  else {
    viewYear.value = next.getFullYear()
    viewMonth.value = next.getMonth()
  }
  focusDay(next)
}

// ── 開合副作用 ──────────────────────────────────────────────────────────────
watch(active, (open) => {
  if (open) {
    viewMode.value = 'date'
    rangePaneMode.value = ['date', 'date']
    syncView()
    pendingStart.value = null
    hoverDate.value = null
    focusedDate.value = baseViewDate()
    return
  }
  // 關閉 = 失焦：標記 touched 後開始顯示驗證錯誤,並把焦點還給控制項。
  validation.touch()
  pendingStart.value = null
  hoverDate.value = null
  nextTick(() => controlRef.value?.focus())
})

onMounted(() => {
  today.value = new Date()
  syncView()
})

// ── 驗證 ────────────────────────────────────────────────────────────────────
const validation = useValidation<BaseDatePickerModel | undefined>(
  () => model.value,
  () => props.rules,
)

const displayError = computed(() => props.error || validation.error.value)
const displayMessage = computed(() => validation.message.value ?? props.message)

const fieldProps = useFormFieldProps(() => ({
  ...props,
  error: displayError.value,
  message: displayMessage.value,
}))

defineExpose({
  /** 強制驗證（會顯示錯誤即使尚未 touch）；回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態（清掉錯誤,不動值）。 */
  reset: validation.reset,
  /** 聚焦控制項。 */
  focus: () => controlRef.value?.focus(),
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseDatePicker — 日期 / 區間選擇器
 *
 * 包在 BaseFormField 內,補上 role="button" 控制項與日曆浮層（定位 / focus-trap /
 * Esc / 點外關閉交給 BasePopover）。所有狀態色（邊框 / focus / error / disabled）讀
 * BaseFormField 對外的 --field-* token;面板 accent 用自帶 --date-* token。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-date-picker {
  &__control {
    position: relative;
    display: flex;
    align-items: center;
    column-gap: 6px;
    width: 100%;
    min-height: var(--field-height);
    padding: 0 12px;
    background: var(--field-background, #fff);
    border: 1px solid var(--field-color);
    border-radius: var(--field-radius);
    outline: none;
    cursor: pointer;
    user-select: none;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: var(--field-active-color);
    }

    &:focus-visible {
      border-color: var(--field-active-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--field-active-color) 22%, transparent);
    }

    &[aria-disabled='true'] {
      cursor: not-allowed;
    }
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 0.875rem;
    color: #111827;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__placeholder {
    color: #9ca3af;
  }

  &__prepend {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #6b7280;
  }

  &__clear {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    padding: 0;
    color: #9ca3af;
    background: transparent;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.12s ease, color 0.12s ease, background-color 0.12s ease;

    &:hover {
      color: #4b5563;
      background: #f3f4f6;
    }

    &:focus-visible {
      color: #4b5563;
      outline: 2px solid var(--field-active-color);
      outline-offset: 1px;
      opacity: 1;
    }
  }

  &__control:hover &__clear,
  &__control:focus-within &__clear {
    opacity: 1;
  }

  &__icon {
    flex-shrink: 0;
    color: #6b7280;
  }
}

/*
 * 浮層內容（日曆面板）。容器 chrome（bg / border / shadow / padding）由 BasePopover
 * 提供;此處只負責內部排版與互動狀態。
 */
.base-date-picker__panel {
  --date-accent: #1d4ed8;
  --date-in-range-bg: color-mix(in srgb, var(--date-accent) 12%, transparent);
  --date-cell-size: 2rem;

  min-width: 15rem;
  font-size: 0.875rem;
  color: #1f2937;
}

.base-date-picker__header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}

.base-date-picker__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  font-size: 1rem;
  line-height: 1;
  color: #6b7280;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    color: #1f2937;
    background: #f3f4f6;
  }

  &:focus-visible {
    outline: 2px solid var(--date-accent);
    outline-offset: 1px;
  }
}

.base-date-picker__title {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.base-date-picker__title-range {
  font-weight: 600;
}

.base-date-picker__title-btn {
  padding: 2px 6px;
  font: inherit;
  font-weight: 600;
  color: inherit;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    color: var(--date-accent);
    background: #f3f4f6;
  }

  &:focus-visible {
    outline: 2px solid var(--date-accent);
    outline-offset: 1px;
  }
}

.base-date-picker__quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding: 4px 0;
}

.base-date-picker__quick-cell {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 2.5rem;
  font-size: 0.8125rem;
  color: #1f2937;
  background: transparent;
  border: 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;

  &:hover {
    background: #f3f4f6;
  }

  &:focus-visible {
    outline: 2px solid var(--date-accent);
    outline-offset: -2px;
  }

  &--today {
    font-weight: 700;
    box-shadow: inset 0 0 0 1px var(--date-accent);
  }

  &--selected {
    color: #fff;
    font-weight: 600;
    background: var(--date-accent);

    &:hover {
      background: var(--date-accent);
    }
  }
}

.base-date-picker__months {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

// 固定欄寬 = 7 格,讓面板在「日曆 / 年月快選」間切換時寬度不塌縮、左右兩欄等寬。
.base-date-picker__month {
  min-width: calc(var(--date-cell-size) * 7);
}

.base-date-picker__pane-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.base-date-picker__weekdays {
  display: grid;
  grid-template-columns: repeat(7, var(--date-cell-size));
  margin-bottom: 4px;
}

.base-date-picker__weekday {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 1.5rem;
  font-size: 0.75rem;
  color: #9ca3af;
}

.base-date-picker__week {
  display: grid;
  grid-template-columns: repeat(7, var(--date-cell-size));

  // 列與列之間留間距,讓區間色帶分段成獨立膠囊。
  & + & {
    margin-top: 4px;
  }
}

.base-date-picker__day {
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--date-cell-size);
  height: var(--date-cell-size);
  padding: 0;
  font-size: 0.8125rem;
  color: #1f2937;
  background: transparent;
  border: 0;
  cursor: pointer;
  outline: none;

  // 圓形高亮層(hover / today / selected / 端點),比格子內縮 → 與色帶留間距。
  &::before {
    content: '';
    position: absolute;
    inset: 3px;
    z-index: -1;
    border-radius: 50%;
    transition: background-color 0.12s ease, box-shadow 0.12s ease;
  }

  &:hover::before {
    background-color: #f3f4f6;
  }

  &:focus-visible::before {
    box-shadow: 0 0 0 2px var(--date-accent);
  }

  &--adjacent {
    color: #d1d5db;
  }

  &--today {
    font-weight: 700;

    &::before {
      box-shadow: inset 0 0 0 1px var(--date-accent);
    }
  }

  // 區間色帶：填滿整格,圓點浮於其上。
  &--in-range,
  &--range-start,
  &--range-end {
    background-color: var(--date-in-range-bg);
  }

  // 色帶分列收圓:每列左 / 右緣(或區間端點)收圓角,形成分段膠囊。
  &--cap-left {
    border-top-left-radius: 999px;
    border-bottom-left-radius: 999px;
  }

  &--cap-right {
    border-top-right-radius: 999px;
    border-bottom-right-radius: 999px;
  }

  // 選取日 / 區間端點：置中實心圓(小於格子),文字反白。
  &--selected,
  &--range-start,
  &--range-end {
    color: #fff;
    font-weight: 600;

    &::before {
      background-color: var(--date-accent);
    }

    &:hover::before {
      background-color: var(--date-accent);
    }
  }

  &:disabled {
    color: #d1d5db;
    cursor: not-allowed;
    background-color: transparent;

    &::before {
      background-color: transparent;
    }
  }

  @media (pointer: coarse) {
    width: max(var(--date-cell-size), 44px);
    height: max(var(--date-cell-size), 44px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-date-picker__control,
  .base-date-picker__clear,
  .base-date-picker__day::before,
  .base-date-picker__quick-cell {
    transition: none;
  }
}
</style>
