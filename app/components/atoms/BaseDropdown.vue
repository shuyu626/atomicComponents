<template>
  <BasePopover
    v-model="open"
    :trigger="trigger"
    :placement="placement"
    :offset="offset"
    :disabled="disabled"
    :auto-fit="autoFit"
  >
    <!--
      reference 直接透傳給 BasePopover：由它負責正規化、量測、掛 aria-*。
      刻意「不」傳 role 給 BasePopover：否則浮層容器 div 會掛 role="menu"，與內層
      <ul role="menu"> 形成巢狀 menu（語意=子選單）。不傳 role 時 reference 的
      aria-haspopup 退回 "true"（ARIA 規範中 true ≡ menu，語意相同），且唯一的 menu
      就是下方的 <ul>，menuitem 歸屬清楚。
    -->
    <template #reference>
      <slot name="reference" />
    </template>

    <!-- 浮層內容：選單本體（唯一的 role="menu"）。focus-trap 由 BasePopover 提供 -->
    <ul
      ref="menuRef"
      class="base-dropdown"
      role="menu"
      aria-orientation="vertical"
      tabindex="-1"
      @keydown="onMenuKeydown"
    >
      <li
        v-for="item in itemsCompose"
        :key="item.value"
        class="base-dropdown__item"
        :class="{ 'base-dropdown__item--disabled': item.disabled }"
        role="menuitem"
        :tabindex="item.tabindex"
        :aria-disabled="item.disabled || undefined"
        @click="item.onClick"
        @keydown="item.onKeydown"
      >
        <slot
          name="menuitem"
          :label="item.label"
          :value="item.value"
          :context="item.context"
          :disabled="item.disabled"
        >
          {{ item.label }}
        </slot>
      </li>
    </ul>
  </BasePopover>
</template>

<script lang="ts">
/**
 * 單一選單項。`Value` 是綁定值型別，`Context` 是可選的附帶資料（給 `#menuitem` slot 自訂渲染）。
 */
export interface BaseDropdownItem<Value = string | number, Context = unknown> {
  /** 顯示文字（可被 `#menuitem` slot 覆寫） */
  label: string
  /** 此項的值，會在 `onClick` 與 slot props 中回傳；也是 `v-for` 的 key（需唯一） */
  value: Value
  /** 是否禁用此項：不可點擊、鍵盤導覽會跳過 @default false */
  disabled?: boolean
  /** 附帶資料，原封不動傳進 `#menuitem` slot props，方便自訂渲染（icon / 說明…） */
  context?: Context
  /**
   * 點擊（或 Enter / Space）觸發後是否自動關閉選單。
   * 設為 `false` 時元件不自動關閉，改由 `onClick` 收到的 `close` 在任意時機呼叫
   * （非同步流程適用，見 `onClick` 範例）。
   * @default true
   */
  closeOnClick?: boolean
  /**
   * 點擊 / Enter / Space 時的回呼，**一律**以 `(value, close)` 呼叫（不看宣告的參數個數）。
   * - 預設（`closeOnClick !== false`）：handler 執行後元件自動 `close()`
   * - `closeOnClick: false`：不自動關閉，由 handler 自行決定何時 `close()`，例如非同步完成後：
   *   ```ts
   *   { label: '存檔', value: 'save', closeOnClick: false,
   *     onClick: async (value, close) => { await save(value); close() } }
   *   ```
   * 未提供 `onClick` 時，點擊依 `closeOnClick` 決定是否關閉（預設關閉）。
   */
  onClick?: (value: Value, close: () => void) => void
}
</script>

<script setup lang="ts" generic="Value extends string | number | symbol = string | number, Context = unknown">
import { computed, useTemplateRef } from 'vue'

import BasePopover from '~/components/atoms/BasePopover.vue'
import { moveFocus, nextItem, previousItem } from '~/utils/dom'
import isFunction from '~/utils/isFunction'

import type { BasePopoverPlacement, BasePopoverTrigger } from '~/components/atoms/BasePopover.vue'

export interface BaseDropdownProps<Value extends string | number | symbol = string | number, Context = unknown> {
  /** 選單項清單。空陣列則只渲染容器、無項目 @default [] */
  items?: BaseDropdownItem<Value, Context>[]
  /**
   * 觸發方式（透傳給 BasePopover），可單選或陣列複選。
   * @default 'click'
   */
  trigger?: BasePopoverTrigger | BasePopoverTrigger[]
  /**
   * 選單相對 reference 的首選位置；空間不足時自動翻轉 / 平移。
   * @default 'bottom-start'
   */
  placement?: BasePopoverPlacement
  /**
   * 選單與 reference 的間距。數字＝主軸距離；或物件分別指定主軸 / 交叉軸。
   * @default 8
   */
  offset?: number | { mainAxis?: number; crossAxis?: number }
  /** 整體禁用：不可觸發、所有項目視為 disabled @default false */
  disabled?: boolean
  /**
   * 選單寬度貼齊 reference（垂直放置時）。typeahead / select 風格的下拉常用。
   * @default false
   */
  autoFit?: boolean
}

const props = withDefaults(defineProps<BaseDropdownProps<Value, Context>>(), {
  items: () => [],
  trigger: 'click',
  placement: 'bottom-start',
  offset: 8,
  disabled: false,
  autoFit: false,
})

defineSlots<{
  /** 觸發錨點：傳入單一可聚焦元素（`<button>` / `<a>`…）。透傳給 BasePopover 的 `#reference` */
  reference?: () => unknown
  /** 自訂單項渲染。slot props 提供 `label` / `value` / `context` / `disabled` */
  menuitem?: (props: {
    label: string
    value: Value
    context?: Context
    disabled: boolean
  }) => unknown
}>()

// 父層未綁 v-model => 內部狀態（預設關閉）；綁了即受控。可用來外部控制開關。
const open = defineModel<boolean>({ default: false })

function close() {
  open.value = false
}

const menuRef = useTemplateRef<HTMLElement>('menuRef')

/**
 * roving tabindex 的進入點：第一個「未被禁用」的項目拿 `tabindex=0`，其餘 `-1`。
 * 用「第一個未禁用」而非固定第 0 項，避免首項 disabled 時 Tab 焦點卡在禁用項。
 */
const firstFocusableIndex = computed(() =>
  props.items.findIndex((item) => !(props.disabled || item.disabled)),
)

/** 把外部 items 正規化成帶事件處理與 roving tabindex 的可渲染結構。 */
const itemsCompose = computed(() =>
  props.items.map((item, index) => {
    const disabled = props.disabled || !!item.disabled

    const onClick = () => {
      if (disabled) return

      // 關閉時機純宣告式：closeOnClick !== false → handler 執行後自動關閉；
      // closeOnClick: false → 不自動關，由 handler 用收到的 close 決定時機（含 async 完成後）。
      const autoClose = item.closeOnClick !== false
      const handler = item.onClick

      // close 恆傳入，不再以 Function.length 猜測意圖（預設參數 / rest 會讓 length 失真）。
      if (isFunction(handler)) handler(item.value, close)

      if (autoClose) close()
    }

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      onClick()
    }

    return {
      label: item.label,
      value: item.value,
      context: item.context,
      disabled,
      tabindex: index === firstFocusableIndex.value ? 0 : -1,
      onClick,
      onKeydown,
    }
  }),
)

/**
 * 選單鍵盤導覽（WAI-ARIA menu 模式）：
 * - ↓ / ↑：移到下 / 上一個可聚焦項（`moveFocus` 自動跳過 disabled 並繞回）
 * - Home / End：跳到第一 / 最後一個
 * - Tab：關閉選單（BasePopover 偵測到關閉瞬間焦點仍在浮層內，會還焦給 reference）
 * Esc 與點擊外部由 BasePopover 處理。
 */
function onMenuKeydown(event: KeyboardEvent) {
  const container = menuRef.value
  if (!container) return

  const currentFocus = document.activeElement as HTMLElement | null

  switch (event.key) {
    case 'Tab':
      event.preventDefault()
      close()
      break
    case 'ArrowDown':
      event.preventDefault()
      moveFocus(container, currentFocus, nextItem)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveFocus(container, currentFocus, previousItem)
      break
    case 'Home':
      event.preventDefault()
      moveFocus(container, null, nextItem)
      break
    case 'End':
      event.preventDefault()
      moveFocus(container, null, previousItem)
      break
  }
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseDropdown — CSS 自訂屬性（token）系統
 *
 * 選單「容器外觀」（bg / border / shadow / 外距）由底層 BasePopover 的 .base-popover
 * 提供，覆寫 --popover-* token 即可；本檔只負責「選單項」的排版與互動狀態。
 *
 * 互動視覺：hover / 鍵盤游標時 → 滿版淺藍底 + 文字轉主色（Element Plus 風格）。
 *
 * 客製化方式：
 *   1. 覆蓋 --dropdown-* 變數（推薦，最小侵入）
 *   2. 直接覆蓋 .base-dropdown 的 BEM class
 *   3. 用 #menuitem slot 完全自訂單項內容
 *
 * 範例 — 換高亮主色（hover 底色與文字一起變）：
 *   .base-dropdown { --dropdown-accent: #dc2626; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-dropdown {
  // ── CSS tokens ────────────────────────────────────────────
  --dropdown-max-height: 16rem;

  // 主色：換色唯一開關，hover 高亮底與文字都從它推導。
  --dropdown-accent: #1d4ed8; // blue-700（對齊 BaseButton / BaseTabs primary）

  --dropdown-item-color: #1f2937;
  --dropdown-item-font-size: 0.875rem;
  --dropdown-item-padding: 0.5rem 0.75rem;

  // hover / 鍵盤游標：滿版淺藍底 + 主色文字。底色從主色自動調淡，換 accent 一起變。
  --dropdown-item-highlight-bg: color-mix(in srgb, var(--dropdown-accent) 10%, transparent);
  --dropdown-item-highlight-color: var(--dropdown-accent);
  --dropdown-disabled-opacity: 0.45;

  // 抵銷 BasePopover 的水平內距（--popover-padding 預設 0.5rem 0.75rem 的 0.75rem），
  // 讓高亮「滿版」貼齊浮層左右邊；上下白邊沿用浮層的垂直內距。
  // ⚠️ 若覆寫了 --popover-padding 的水平值，請同步調整此 token。
  --dropdown-bleed-x: 0.75rem;

  // ── 容器（外層 chrome 由 .base-popover 提供）──────────────
  margin: 0 calc(-1 * var(--dropdown-bleed-x)); // 水平外擴貼齊浮層內緣，垂直不動
  padding: 0;
  list-style: none;
  max-height: var(--dropdown-max-height);
  overflow-y: auto;

  // ── 選單項 ────────────────────────────────────────────────
  &__item {
    padding: var(--dropdown-item-padding);
    font-size: var(--dropdown-item-font-size);
    color: var(--dropdown-item-color);
    cursor: pointer;
    user-select: none;
    outline: none; // 焦點指示改用滿版高亮底 + 主色文字（見下），不另畫外框
    transition: background-color 0.12s ease, color 0.12s ease;

    // 滑鼠 hover 與鍵盤游標（:focus）一律高亮 —— 不依賴 :focus-visible，
    // 確保方向鍵導覽時被聚焦的項目永遠看得出來（menu 的「目前項」指示）。
    &:hover,
    &:focus {
      color: var(--dropdown-item-highlight-color);
      background-color: var(--dropdown-item-highlight-bg);
    }

    // 粗指標裝置（手機 / 平板）：放大觸控目標到 44px（WCAG 2.5.5）。
    @media (pointer: coarse) {
      display: flex;
      align-items: center;
      min-height: 44px;
    }

    &--disabled {
      cursor: not-allowed;
      opacity: var(--dropdown-disabled-opacity);

      // 禁用項不吃高亮、不轉色（即便被滑鼠 focus）。
      &:hover,
      &:focus {
        color: var(--dropdown-item-color);
        background-color: transparent;
      }
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-dropdown__item {
    transition: none;
  }
}
</style>
