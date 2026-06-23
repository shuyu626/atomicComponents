<template>
  <component
    :is="as"
    class="base-chip"
    :class="rootClass"
    :style="rootStyle"
  >
    <!-- 前置內容（icon / 頭像…），有 slot 才渲染外框 -->
    <span
      v-if="$slots.prepend"
      class="base-chip__prepend"
    >
      <slot name="prepend" />
    </span>

    <!-- 主要標籤：default slot 優先，否則退回 label -->
    <span class="base-chip__label">
      <slot>{{ label }}</slot>
    </span>

    <!-- 後置內容 -->
    <span
      v-if="$slots.append"
      class="base-chip__append"
    >
      <slot name="append" />
    </span>

    <!-- 刪除鈕：deletable 時渲染，點擊 emit('delete', event) -->
    <button
      v-if="deletable"
      class="base-chip__delete"
      type="button"
      :aria-label="deleteAriaLabel"
      @click="handleDelete"
    >
      <svg
        class="base-chip__delete-icon"
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M6 6 18 18M18 6 6 18" />
      </svg>
    </button>
  </component>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'

import type { Component, CSSProperties } from 'vue'

/** 字面量聯集：保留 IDE 對語意色的自動補全，同時允許任意自訂 CSS color 字串。 */
type LiteralUnion<T extends string> = T | (string & {})

/** 語意色名單；不在此列者一律視為自訂 CSS color（走 inline `--chip-accent`）。 */
const THEME_COLORS = ['primary', 'success', 'warning', 'danger', 'info'] as const

type ThemeColor = (typeof THEME_COLORS)[number]

export interface BaseChipProps {
  /**
   * 根元素標籤或元件（多型）。互動型 chip 可傳入 `'a'` / `RouterLink` 等。
   * @default 'span'
   */
  as?: string | Component
  /**
   * 外觀：`filled`（飽和實心底，白字）| `contained`（淡色調底）|
   * `outlined`（外框）| `text`（純文字無底無框）。
   * @default 'contained'
   */
  variant?: 'filled' | 'contained' | 'outlined' | 'text'
  /**
   * 顏色：語意色（`primary` / `success` / `warning` / `danger` / `info`）走預設 token；
   * 其餘字串視為自訂 CSS color（hex / rgb / hsl / 具名色皆可），背景以 `color-mix` 取淡色調。
   * @default 'primary'
   */
  color?: LiteralUnion<ThemeColor>
  /**
   * 尺寸。
   * @default 'medium'
   */
  size?: 'small' | 'medium'
  /** 標籤文字；提供 default slot 時以 slot 為準。 */
  label?: string
  /**
   * 是否顯示刪除鈕；開啟後點擊 emit `delete`。
   * @default false
   */
  deletable?: boolean
  /**
   * 刪除鈕的無障礙標籤（讀給螢幕閱讀器）。建議帶上 chip 內容，如「移除 Vue 標籤」。
   * @default 'Delete'
   */
  deleteAriaLabel?: string
}

const props = withDefaults(defineProps<BaseChipProps>(), {
  as: 'span',
  variant: 'contained',
  color: 'primary',
  size: 'medium',
  label: undefined,
  deletable: false,
  deleteAriaLabel: 'Delete',
})

const emit = defineEmits<{
  /** 點擊刪除鈕時觸發，payload 為原生 click 事件。 */
  delete: [event: MouseEvent]
}>()

/** 是否為語意色（決定走 CSS class 還是 inline `--chip-accent`）。 */
const isThemeColor = computed(() =>
  (THEME_COLORS as readonly string[]).includes(props.color),
)

const rootClass = computed(() => [
  `base-chip--${props.size}`,
  `base-chip--${props.variant}`,
  // 語意色才掛 color modifier；自訂色由 rootStyle 注入 token。
  isThemeColor.value ? `base-chip--${props.color}` : null,
])

/**
 * 自訂色：把使用端傳入的 CSS color 灌進 `--chip-accent`，
 * 背景 / 邊框的淡色調由 CSS `color-mix` 自動推導（取代參考實作字串拼接 alpha 的作法）。
 */
const rootStyle = computed<CSSProperties | null>(() =>
  isThemeColor.value ? null : { '--chip-accent': props.color },
)

function handleDelete(event: MouseEvent): void {
  emit('delete', event)
}

// a11y：互動型根節點（a / button）+ 刪除鈕會產生巢狀互動元素（無效 HTML），
// 開發期警告。元件型根節點（如 RouterLink）無法偵測，請參閱文件 §5。
if (import.meta.env.DEV) {
  watchEffect(() => {
    if (
      props.deletable &&
      typeof props.as === 'string' &&
      (props.as === 'a' || props.as === 'button')
    ) {
      console.warn(
        `[BaseChip] \`as="${props.as}"\` 搭配 \`deletable\` 會在互動元素內巢狀 <button>（無效 HTML）。`
        + '請改用非互動根節點，或將刪除行為移到 chip 外層。',
      )
    }
  })
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseChip — 標籤 / 籌碼
 *
 * 緊湊的狀態 / 分類標籤，可選刪除鈕。所有外觀抽成 --chip-* token，
 * 取代參考實作對全域 SCSS $color-map 的相依，覆寫即可主題化。
 *
 *   .base-chip { --chip-accent: #8b5cf6; --chip-radius: 9999px; }
 *
 * 顏色模型：單一 --chip-accent 作為色相來源。filled 直接吃飽和 accent 當底、
 * --chip-on-accent 當文字；contained / outlined / text 則用 color-mix 從 accent
 * 推導淡底與邊框。語意色與自訂色共用同一條路徑。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 用 :where()（specificity 0）宣告，否則 scoped 會加上 [data-v-xxx]、
 * specificity 高於使用端覆寫 class，導致 --chip-* 改不動。
 */
:where(.base-chip) {
  --chip-accent: #1d4ed8; // 預設 = primary
  --chip-on-accent: #fff; // filled variant 的文字色（飽和底上的對比色）
  --chip-font-size: 0.875rem;
  --chip-padding-y: 4px;
  --chip-padding-x: 8px;
  --chip-gap: 4px;
  --chip-radius: 5px;
}

/* 語意色 preset（specificity 0，使用端覆寫得動）；皆挑深色調確保淡底上文字 ≥ AA。 */
:where(.base-chip--primary) { --chip-accent: #1d4ed8; } // blue-700
:where(.base-chip--success) { --chip-accent: #15803d; } // green-700
:where(.base-chip--warning) { --chip-accent: #b45309; } // amber-700
:where(.base-chip--danger)  { --chip-accent: #b91c1c; } // red-700
:where(.base-chip--info)    { --chip-accent: #0369a1; } // sky-700

.base-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  column-gap: var(--chip-gap);
  max-width: 100%;
  font-size: var(--chip-font-size);
  line-height: 1.25;
  text-align: center;
  white-space: nowrap;
  vertical-align: middle;
  border: 1px solid transparent;
  border-radius: var(--chip-radius);
  user-select: none;

  // ── 尺寸 ──────────────────────────────────────────────
  &--small {
    --chip-font-size: 0.75rem;
    --chip-padding-y: 2px;
  }

  &--medium {
    --chip-font-size: 0.875rem;
    --chip-padding-y: 4px;
  }

  // 內距套在 chip 本體；刪除鈕另以負邊距抵銷右側內距、擴大點擊區。
  padding: var(--chip-padding-y) var(--chip-padding-x);

  // ── Variant ───────────────────────────────────────────
  &--filled {
    // 飽和實心底 + 對比文字色（語意色皆為 700 級深色，白字 ≥ AA）。
    color: var(--chip-on-accent);
    background-color: var(--chip-accent);
  }

  &--contained {
    color: var(--chip-accent);
    // accent 的 ~12% 淡底，可主題化；任意 CSS color 皆適用。
    background-color: color-mix(in srgb, var(--chip-accent) 12%, transparent);
  }

  &--outlined {
    color: var(--chip-accent);
    background-color: transparent;
    border-color: color-mix(in srgb, var(--chip-accent) 50%, transparent);
  }

  &--text {
    color: var(--chip-accent);
    background-color: transparent;
  }

  // ── 內部元素 ───────────────────────────────────────────
  &__prepend,
  &__append {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
  }

  &__label {
    // min-width: 0 讓 label 這個 flex item 能縮到內容以下，
    // 使用端對根節點設 max-width 時 ellipsis 才會真正觸發（預設 auto 不會縮）。
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  // ── 刪除鈕 ─────────────────────────────────────────────
  &__delete {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    // 抵銷 chip 右側內距，貼齊邊緣同時維持足夠點擊面積。
    margin-right: calc(var(--chip-padding-x) * -0.5);
    margin-left: calc(var(--chip-gap) * -1);
    padding: 2px;
    color: inherit;
    font-size: inherit;
    background: transparent;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    opacity: 0.7;
    transition:
      opacity 0.15s ease,
      background-color 0.15s ease;

    &:hover {
      opacity: 1;
      // 用 currentColor 疊色：filled 底上是白色淡層、其餘 variant 是 accent 淡層，皆可見。
      background-color: color-mix(in srgb, currentColor 20%, transparent);
    }

    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 1px;
      opacity: 1;
    }
  }

  &__delete-icon {
    width: 1em;
    height: 1em;
    // 略小於字級，視覺上與標籤對齊。
    font-size: 0.875em;
  }
}

// 尊重「減少動態效果」偏好。
@media (prefers-reduced-motion: reduce) {
  .base-chip__delete {
    transition: none;
  }
}
</style>
