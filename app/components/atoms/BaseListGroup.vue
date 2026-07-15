<template>
  <!--
    可折疊的清單子群組（導覽抽屜常見）：群組標題（button，帶 aria-expanded / aria-controls）
    + 收合箭頭，展開時顯示縮排的子項目（一組 <BaseListItem>）。
    放在 <BaseList> 內；子項目透過同一個 List context 沿用 size / itemShape。
    收合用 v-show（display:none）→ 收合時子項不可 Tab、不在 SR 樹，a11y 正確。
  -->
  <li
    class="base-list-group"
    :class="rootClass"
    role="listitem"
  >
    <button
      type="button"
      class="base-list-group__header"
      :aria-expanded="open"
      :aria-controls="panelId"
      :disabled="disabled"
      @click="toggle"
    >
      <span
        v-if="slots.prepend"
        class="base-list-group__prepend"
      >
        <slot name="prepend" />
      </span>

      <span class="base-list-group__title">
        <slot name="title">{{ title }}</slot>
      </span>

      <svg
        class="base-list-group__chevron"
        viewBox="0 0 24 24"
        width="16"
        height="16"
        aria-hidden="true"
      >
        <path
          d="M6 9l6 6 6-6"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!--
      子清單用 role="list"（非 role="group"）：ARIA 規定 listitem 的 owner 必須是
      list，group 內放 listitem 是 invalid ARIA（axe: aria-required-parent）。
      顯式 role 同時沿用 BaseList 的 Safari 修復（list-style: none 會拔掉隱含 list 語意）。
    -->
    <ul
      v-show="open"
      :id="panelId"
      class="base-list-group__items"
      role="list"
      :aria-label="title || undefined"
    >
      <slot />
    </ul>
  </li>
</template>

<script setup lang="ts">
import { computed, inject, useId } from 'vue'
import type { VNode } from 'vue'

import { BASE_LIST_INJECT_KEY } from '~/components/atoms/BaseList.vue'

export interface BaseListGroupProps {
  /** 群組標題（也可用 `#title` slot 覆寫）。 */
  title?: string
  /**
   * 禁用：不可展開 / 收合（header 為 disabled button）。
   * @default false
   */
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseListGroupProps>(), {
  title: undefined,
  disabled: false,
})

/** 展開狀態。父層綁 `v-model:open` => 受控；沒綁 => 內部狀態（預設收合）。 */
const open = defineModel<boolean>('open', { default: false })

const slots = defineSlots<{
  /** 群組標題前的圖示 / 頭像。 */
  prepend?: () => VNode[]
  /** 群組標題內容（否則用 `title` prop）。 */
  title?: () => VNode[]
  /** 子項目：一組 `<BaseListItem>`。 */
  default?: () => VNode[]
}>()

// 沿用父層 BaseList 的 size（standalone 無 context 時降級為 md）。
const context = inject(BASE_LIST_INJECT_KEY, null)
const size = computed(() => context?.size.value ?? 'md')

const panelId = useId()

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

const rootClass = computed(() => [
  `base-list-group--${size.value}`,
  {
    'base-list-group--open': open.value,
    'base-list-group--disabled': props.disabled,
  },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseListGroup — 可折疊清單子群組
 *
 * header 的內距 / 字級沿用與 BaseListItem 相同的 size 級距（透過 context）；
 * 外觀走 --list-item-* / --list-group-* token，覆寫即可主題化。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

:where(.base-list-group) {
  // 沿用 item 的視覺 token（hover / 字級 / 內距），另加群組專屬 token。
  --list-item-padding-y: 10px;
  --list-item-padding-x: 12px;
  --list-item-font-size: 0.875rem;
  --list-item-gap: 0.75rem;
  --list-item-hover-bg: #f9fafb;
  --list-item-active-color: #1d4ed8;
  --list-group-indent: 2.25rem; // 子項目縮排（對齊 header 標題、避開 prepend 圖示）
  --list-group-chevron-color: #9ca3af; // gray-400，箭頭色

  display: block;
}

/* size 級距（與 BaseListItem 對齊）─────────────────────── */
:where(.base-list-group--sm) {
  --list-item-padding-y: 6px;
  --list-item-padding-x: 10px;
  --list-item-font-size: 0.8125rem;
}

:where(.base-list-group--md) {
  --list-item-padding-y: 10px;
  --list-item-padding-x: 12px;
  --list-item-font-size: 0.875rem;
}

:where(.base-list-group--lg) {
  --list-item-padding-y: 14px;
  --list-item-padding-x: 16px;
  --list-item-font-size: 1rem;
}

/* ── header（可點的群組標題）───────────────────────────── */
.base-list-group__header {
  display: flex;
  align-items: center;
  gap: var(--list-item-gap);
  width: 100%;
  padding: var(--list-item-padding-y) var(--list-item-padding-x);
  font: inherit;
  font-size: var(--list-item-font-size);
  color: var(--list-color, #1f2937);
  text-align: start;
  background: none;
  border: 0;
  cursor: pointer;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: var(--list-item-hover-bg, #f9fafb);
  }

  &:focus-visible {
    outline: 2px solid var(--list-item-active-color, #1d4ed8);
    outline-offset: -2px;
  }
}

.base-list-group__prepend {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
}

.base-list-group__title {
  flex: 1 1 auto;
  min-width: 0;
}

/* ── 箭頭（展開時旋轉 180°）───────────────────────────── */
.base-list-group__chevron {
  flex-shrink: 0;
  color: var(--list-group-chevron-color, #9ca3af);
  transition: transform 0.2s ease;
}

.base-list-group--open .base-list-group__chevron {
  transform: rotate(180deg);
}

/* ── 子項目（縮排）─────────────────────────────────────── */
.base-list-group__items {
  margin: 0;
  padding: 0;
  padding-inline-start: var(--list-group-indent);
  list-style: none;
}

/* ── disabled ─────────────────────────────────────────── */
.base-list-group--disabled .base-list-group__header {
  cursor: not-allowed;
  opacity: 0.5;
}

@media (prefers-reduced-motion: reduce) {
  .base-list-group__header,
  .base-list-group__chevron {
    transition: none;
  }
}
</style>
