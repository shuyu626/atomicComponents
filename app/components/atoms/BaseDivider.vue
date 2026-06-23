<template>
  <!--
    有 default slot：渲染帶文字的分隔線（左右／上下各一段線，中間夾內容）。
    role="separator" + aria-orientation 讓螢幕閱讀器知道這是方向性分隔。
  -->
  <div
    v-if="slots.default"
    class="base-divider base-divider--with-text"
    :class="rootClass"
    role="separator"
    :aria-orientation="orientation"
  >
    <span class="base-divider__text">
      <slot />
    </span>
  </div>

  <!--
    無內容：用語意化的 <hr>（原生即 separator role）。
    為 vertical 補上 aria-orientation（hr 預設為 horizontal）。
  -->
  <hr
    v-else
    class="base-divider"
    :class="rootClass"
    :aria-orientation="orientation"
  >
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { VNode } from 'vue'

export interface BaseDividerProps {
  /**
   * 方向：水平（橫向分隔上下內容）或垂直（縱向分隔左右內容）。
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   * 線型樣式（對應 CSS `border-style`）。
   * @default 'solid'
   */
  variant?: 'solid' | 'dashed' | 'dotted'
  /**
   * 文字相對於分隔線的位置；僅在提供 `#default` slot（帶文字）時生效。
   * `start` / `end` 會讓文字靠向起點 / 終點，較短的那一段線置於文字外側。
   * @default 'center'
   */
  textAlign?: 'start' | 'center' | 'end'
}

interface BaseDividerSlots {
  /** 分隔線中央的文字 / 內容；提供時改渲染帶文字的分隔線。 */
  default?: () => VNode[]
}

const props = withDefaults(defineProps<BaseDividerProps>(), {
  orientation: 'horizontal',
  variant: 'solid',
  textAlign: 'center',
})

const slots = defineSlots<BaseDividerSlots>()

/** 組裝 BEM modifier：方向 / 線型 / 文字對齊。 */
const rootClass = computed(() => [
  `base-divider--${props.orientation}`,
  `base-divider--${props.variant}`,
  `base-divider--${props.textAlign}`,
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseDivider — 分隔線
 *
 * 兩種型態：純線（<hr>）與帶文字（<div role="separator">，線段夾住中央內容）。
 * 所有外觀抽成 --divider-* token，取代參考實作寫死的 lightslategray 與全域
 * <style>，覆寫即可主題化：
 *
 *   .base-divider { --divider-color: #cbd5e1; --divider-thickness: 2px; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 會加上 [data-v-xxx]、
 * specificity 高於使用端覆寫 class，導致 --divider-* 改不動。
 */
:where(.base-divider) {
  --divider-color: #e5e7eb; // gray-200，淡灰中性線
  --divider-thickness: 1px; // 線粗
  --divider-text-color: #6b7280; // gray-500，帶文字時的內容色
  --divider-text-gap: 0.75rem; // 文字與線段之間的間距
  --divider-spacing: 0; // 分隔線外距（horizontal 走 block、vertical 走 inline）
  --divider-vertical-length: 1em; // 垂直線無內容時的預設長度（亦可由 flex 容器 stretch 撐開）

  // 線型由 variant modifier 覆寫
  --_divider-line-style: solid;
  box-sizing: border-box;
  border: 0;
}

/* ── 線型 ─────────────────────────────────────────────── */
:where(.base-divider--solid) { --_divider-line-style: solid; }
:where(.base-divider--dashed) { --_divider-line-style: dashed; }
:where(.base-divider--dotted) { --_divider-line-style: dotted; }

/* ───────────────────────────────────────────────────────
 * 純線：<hr>
 * ─────────────────────────────────────────────────────── */
hr.base-divider {
  &.base-divider--horizontal {
    width: 100%;
    margin-block: var(--divider-spacing);
    border-top: var(--divider-thickness) var(--_divider-line-style)
      var(--divider-color);
  }

  &.base-divider--vertical {
    display: inline-block;
    // 修正參考實作：原版用 height: auto，垂直 <hr> 高度為 0、完全不顯示。
    // 用 min-height 而非 height：保留 height: auto 讓 align-self: stretch 在 flex row
    // 容器中能撐到與兄弟元素同高（stretch 僅在交叉軸尺寸為 auto 時生效，寫死 height
    // 會讓 stretch 失效）；--divider-vertical-length 則作為非 flex 情境的 fallback 長度。
    align-self: stretch;
    min-height: var(--divider-vertical-length);
    margin-inline: var(--divider-spacing);
    border-left: var(--divider-thickness) var(--_divider-line-style)
      var(--divider-color);
  }
}

/* ───────────────────────────────────────────────────────
 * 帶文字：<div> + ::before / ::after 兩段線夾住內容
 * 兩段線以 flex-grow 比例分配剩餘空間，textAlign 調整 grow 比例讓文字靠邊。
 * ─────────────────────────────────────────────────────── */
.base-divider--with-text {
  display: flex;
  align-items: center;
  color: var(--divider-text-color);

  // 兩段線：flex-basis 0 + 等比 grow 填滿「扣掉文字」後的剩餘空間。
  // 預設兩側 grow 相同 → 置中；start / end 改變 grow 比例讓文字靠邊。
  // （取代參考實作的固定百分比：50% + 50% 加總已達 100%，再加上文字會溢出、
  //   把文字擠到 0 寬而換行。）
  &::before,
  &::after {
    content: '';
    flex: 1 1 0%;
  }

  &.base-divider--horizontal {
    width: 100%;
    margin-block: var(--divider-spacing);

    &::before,
    &::after {
      border-top: var(--divider-thickness) var(--_divider-line-style)
        var(--divider-color);
    }
  }

  &.base-divider--vertical {
    flex-direction: column;
    align-self: stretch;
    min-height: var(--divider-vertical-length);
    margin-inline: var(--divider-spacing);

    &::before,
    &::after {
      border-left: var(--divider-thickness) var(--_divider-line-style)
        var(--divider-color);
    }
  }

  // ── 文字對齊：調整兩段線的 grow 比例（1:9）讓文字靠邊 ──────
  // start：文字靠起點 → 起點側線短、終點側線長
  &.base-divider--start::before { flex-grow: 1; }
  &.base-divider--start::after { flex-grow: 9; }
  // end：文字靠終點 → 反之
  &.base-divider--end::before { flex-grow: 9; }
  &.base-divider--end::after { flex-grow: 1; }

  // 文字本體：class 為 .base-divider__text（非 --with-text__text），
  // 必須用完整 class 選取，否則 nowrap / 不可壓縮 / 間距全失效 → 文字被擠到換行。
  .base-divider__text {
    flex: 0 0 auto; // 不被兩段線壓縮，維持單行
    white-space: nowrap;
  }

  &.base-divider--horizontal .base-divider__text {
    padding-inline: var(--divider-text-gap);
  }

  &.base-divider--vertical .base-divider__text {
    padding-block: var(--divider-text-gap);
  }
}
</style>
