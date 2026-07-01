<template>
  <!--
    行內狀態訊息。role 依嚴重度切 alert（assertive）/ status（polite），
    仿 BaseToast。結構：icon（前導狀態圖示）→ content（title + body）→ actions → 關閉鈕。
  -->
  <div
    class="base-alert"
    :class="[`base-alert--${variant}`, `base-alert--${color}`]"
    :role="role"
    :aria-live="ariaLive"
  >
    <!-- 前導狀態圖示：#icon slot 優先，否則依 color 畫內建 SVG；icon=false 時整塊不渲染。 -->
    <span
      v-if="icon"
      class="base-alert__icon"
      aria-hidden="true"
    >
      <slot name="icon">
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path :d="iconPath" />
        </svg>
      </slot>
    </span>

    <div class="base-alert__content">
      <!-- 標題：#title slot 優先，否則退回 title prop；兩者皆無則不渲染。 -->
      <div
        v-if="hasTitle"
        class="base-alert__title"
      >
        <slot name="title">{{ title }}</slot>
      </div>
      <div class="base-alert__body">
        <slot />
      </div>
    </div>

    <!-- 後置動作區（訊息後、關閉鈕前）：放按鈕等操作。 -->
    <span
      v-if="slots.actions"
      class="base-alert__actions"
    >
      <slot name="actions" />
    </span>

    <!-- 關閉鈕：closable 時渲染，點擊 emit('close')。 -->
    <button
      v-if="closable"
      type="button"
      class="base-alert__close"
      :aria-label="closeLabel"
      @click="onClose"
    >
      <svg
        viewBox="0 0 20 20"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M5 5l10 10M15 5L5 15" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { VNode } from 'vue'

/** 語意色名單；色值對齊 BaseChip（皆深色調，確保 ghost 淡底上文字 ≥ WCAG AA）。 */
type ThemeColor = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface BaseAlertProps {
  /**
   * 外觀（對齊 BaseChip 的填充軸）：
   * - `ghost`（預設）：`color-mix` 淡色調底 + accent 字，典型 alert 外觀
   * - `solid`：飽和 accent 實心底 + 對比字
   * - `outline`：accent 描邊 + accent 字、透明底
   * - `text`：無底無框、僅 accent 字
   * @default 'ghost'
   */
  variant?: 'solid' | 'outline' | 'ghost' | 'text'
  /**
   * 語意色（對齊庫內 6 色），決定 `--alert-accent` 與前導狀態圖示。
   * @default 'info'
   */
  color?: ThemeColor
  /** 選填標題；亦可用 `#title` slot 覆寫。 */
  title?: string
  /**
   * 是否顯示前導狀態圖示；可用 `#icon` slot 覆寫成自訂圖示。設 `false` 時整塊不渲染。
   * @default true
   */
  icon?: boolean
  /**
   * 是否顯示關閉鈕；開啟後點擊 emit `close`。是否真的移除由父層決定（受控）。
   * @default false
   */
  closable?: boolean
  /**
   * 關閉鈕的無障礙名稱（`aria-label`）。多語系專案可覆寫。
   * @default '關閉'
   */
  closeLabel?: string
}

const props = withDefaults(defineProps<BaseAlertProps>(), {
  variant: 'ghost',
  color: 'info',
  title: undefined,
  icon: true,
  closable: false,
  closeLabel: '關閉',
})

const emit = defineEmits<{
  /** 點擊關閉鈕時觸發。 */
  close: []
}>()

const slots = defineSlots<{
  /** 前導狀態圖示（取代依 color 推導的內建 SVG），可放任意圖示元件。 */
  icon?: () => VNode[]
  /** 標題（取代 `title` prop）。 */
  title?: () => VNode[]
  /** 訊息主體。 */
  default?: () => VNode[]
  /** 後置動作區（訊息後、關閉鈕前），放按鈕等操作。 */
  actions?: () => VNode[]
}>()

// 各語意色對應的「純字形」描邊圖示（24×24，Lucide 風格 stroke）。
// primary / info 用資訊 i；success 用勾；warning 用驚嘆號；danger 用叉。
const ICON_PATHS: Record<ThemeColor, string> = {
  primary: 'M12 8h.01M12 11v5', // 資訊 i
  success: 'M5 13l4 4L19 7', // 勾
  warning: 'M12 7v6M12 17h.01', // 驚嘆號
  danger: 'M6 6l12 12M18 6L6 18', // 叉
  info: 'M12 8h.01M12 11v5', // 資訊 i
  neutral: 'M12 8h.01M12 11v5', // 資訊 i
}

const iconPath = computed(() => ICON_PATHS[props.color])

/** 有 title prop 或 `#title` slot 時才渲染標題列。 */
const hasTitle = computed(() => Boolean(props.title) || Boolean(slots.title))

// danger / warning 屬即時且重要 → role="alert"（隱含 assertive）打斷播報；
// 其餘 → role="status"（隱含 polite）等空檔再播。仿 BaseToast 依型別切 role。
const role = computed(() =>
  props.color === 'danger' || props.color === 'warning' ? 'alert' : 'status',
)
const ariaLive = computed(() => (role.value === 'alert' ? 'assertive' : 'polite'))

function onClose(): void {
  emit('close')
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseAlert — 行內狀態訊息
 *
 * 常駐的行內狀態訊息，與短暫的 BaseToast 互補（Toast 命令式、限時、堆疊；
 * Alert 宣告式、常駐、隨內容排版）。所有外觀抽成 --alert-* token，覆寫即可主題化：
 *
 *   .base-alert { --alert-accent: #8b5cf6; --alert-radius: 12px; }
 *
 * 顏色模型：單一 --alert-accent 作為色相來源（對齊 BaseChip）。solid 直接吃飽和
 * accent 當底、--alert-on-accent 當文字；ghost / outline / text 則用 color-mix
 * 從 accent 推導淡底與邊框。各 variant 透過 --alert-bg / --alert-color /
 * --alert-border-color 表達，皆為可覆寫的覆寫點。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 的 [data-v-xxx]
 * 會高於使用端覆寫 class，導致 --alert-* 改不動。
 */
:where(.base-alert) {
  --alert-accent: #0369a1; // 預設 = info（sky-700）
  --alert-on-accent: #fff; // solid variant 的文字色（飽和底上的對比色）
  --alert-radius: 8px;
  --alert-padding: 12px 14px;

  // variant 未套用時的安全預設（等同 ghost 推導）。
  --alert-bg: color-mix(in srgb, var(--alert-accent) 12%, transparent);
  --alert-color: var(--alert-accent);
  --alert-border-color: transparent;
}

/* 語意色 preset（specificity 0，使用端覆寫得動）；色值對齊 BaseChip，皆深色調確保淡底文字 ≥ AA。 */
:where(.base-alert--primary) { --alert-accent: #1d4ed8; } // blue-700
:where(.base-alert--success) { --alert-accent: #15803d; } // green-700
:where(.base-alert--warning) { --alert-accent: #b45309; } // amber-700
:where(.base-alert--danger)  { --alert-accent: #b91c1c; } // red-700
:where(.base-alert--info)    { --alert-accent: #0369a1; } // sky-700
:where(.base-alert--neutral) { --alert-accent: #374151; } // gray-700

.base-alert {
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  column-gap: 10px;
  padding: var(--alert-padding);
  color: var(--alert-color);
  word-break: break-word;
  background-color: var(--alert-bg);
  border: 1px solid var(--alert-border-color);
  border-radius: var(--alert-radius);

  // ── Variant（推導 bg / color / border）───────────────────
  &--solid {
    // 飽和實心底 + 對比文字色（語意色皆為 700 級深色，白字 ≥ AA）。
    --alert-bg: var(--alert-accent);
    --alert-color: var(--alert-on-accent);
    --alert-border-color: transparent;
  }

  &--ghost {
    // accent 的 ~12% 淡底 + accent 字（典型 alert 外觀）。
    --alert-bg: color-mix(in srgb, var(--alert-accent) 12%, transparent);
    --alert-color: var(--alert-accent);
    --alert-border-color: transparent;
  }

  &--outline {
    --alert-bg: transparent;
    --alert-color: var(--alert-accent);
    --alert-border-color: color-mix(in srgb, var(--alert-accent) 50%, transparent);
  }

  &--text {
    --alert-bg: transparent;
    --alert-color: var(--alert-accent);
    --alert-border-color: transparent;
  }

  // ── 內部元素 ───────────────────────────────────────────
  &__icon {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    height: 1.5rem; // 與標題 / 首行對齊
    color: var(--alert-color);
  }

  &__content {
    flex: 1 1 auto;
    min-width: 0; // 允許長字串在 flex 內換行而非撐破
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
    line-height: 1.5rem;
  }

  // 有標題時 body 與標題間留間距。
  &__title + .base-alert__body {
    margin-top: 2px;
  }

  &__body {
    font-size: 0.875rem;
    line-height: 1.5;
  }

  &__actions {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    align-self: center;
    column-gap: 8px;
  }

  // ── 關閉鈕 ─────────────────────────────────────────────
  &__close {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    color: inherit;
    cursor: pointer;
    background: none;
    border: none;
    border-radius: 0.25rem;
    opacity: 0.7;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease;

    &:hover {
      opacity: 1;
      // 用 currentColor 疊色：solid 底上是白色淡層、其餘 variant 是 accent 淡層，皆可見。
      background-color: color-mix(in srgb, currentColor 15%, transparent);
    }

    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 1px;
      opacity: 1;
    }
  }
}

// 尊重「減少動態效果」偏好。
@media (prefers-reduced-motion: reduce) {
  .base-alert__close {
    transition: none;
  }
}
</style>
