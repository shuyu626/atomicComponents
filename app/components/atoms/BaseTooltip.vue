<template>
  <BasePopover
    :arrow="arrow"
    :disabled="disabled"
    :offset="offset"
    :placement="placement"
    :trigger="trigger"
    role="tooltip"
  >
    <!-- 觸發錨點：透傳給 BasePopover，由它正規化、量測、掛 aria-*。 -->
    <template #reference>
      <slot />
    </template>

    <!--
      浮層內容：深色提示泡泡。僅在「有文字或 content slot」時渲染，避免空泡泡。
      底座 BasePopover 的白底 / 邊框 / 陰影由本檔的全域樣式中性化（見 <style>），
      這裡只負責 tooltip 自身的深色外觀與箭頭。
    -->
    <template
      v-if="content || slots.content"
      #default="{ arrowStyle }"
    >
      <div class="base-tooltip">
        <slot name="content">{{ content }}</slot>
        <!--
          箭頭本體為「指向下方（▼）」的三角形，BasePopover 的 arrowStyle 會依
          placement 旋轉到正確方位並定位；背景接續泡泡底色。
        -->
        <span
          ref="arrowRef"
          class="base-tooltip__arrow"
          aria-hidden="true"
          :style="arrowStyle"
        />
      </div>
    </template>
  </BasePopover>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import BasePopover from '~/components/atoms/BasePopover.vue'

import type {
  BasePopoverPlacement,
  BasePopoverTrigger,
} from '~/components/atoms/BasePopover.vue'

interface BaseTooltipProps {
  /** 提示文字。複雜內容（含 HTML / 元件）請改用 `#content` slot。 */
  content?: string
  /**
   * 觸發方式（透傳給 BasePopover），可單選或陣列複選。
   * 預設 `['hover', 'focus']` 同時涵蓋滑鼠與鍵盤可達性。
   * @default ['hover', 'focus']
   */
  trigger?: BasePopoverTrigger | BasePopoverTrigger[]
  /**
   * 提示相對 reference 的首選位置；空間不足時自動翻轉 / 平移。
   * @default 'top'
   */
  placement?: BasePopoverPlacement
  /**
   * 提示與 reference 的間距。數字＝主軸距離；或物件分別指定主軸 / 交叉軸。
   * @default 8
   */
  offset?: number | { mainAxis?: number; crossAxis?: number }
  /** 整體禁用：不可觸發、不渲染提示。@default false */
  disabled?: boolean
}

withDefaults(defineProps<BaseTooltipProps>(), {
  content: undefined,
  trigger: () => ['hover', 'focus'],
  placement: 'top',
  offset: 8,
  disabled: false,
})

const slots = defineSlots<{
  /** 觸發錨點：傳入單一可聚焦元素（`<button>` / `<a>`…）。透傳給 BasePopover 的 `#reference` */
  default?: () => unknown
  /** 自訂提示內容（取代 `content` prop）。 */
  content?: () => unknown
}>()

const arrowRef = useTemplateRef<HTMLElement>('arrowRef')

/**
 * 用「穩定 template ref + computed」組 arrow prop：物件參考只在 arrowRef 變動
 * （掛載那次）時重算，避免與 floating-ui 自動重算形成無限迴圈。
 */
const arrow = computed(() =>
  arrowRef.value ? { element: arrowRef.value, padding: 4 } : undefined,
)
</script>

<style lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseTooltip — 深色文字提示（包裝 BasePopover）
 *
 * 底座 BasePopover 自帶白底 / 邊框 / 陰影 / 內距，tooltip 不需要這層 chrome，
 * 於是用 :has(.base-tooltip) 把底座的 --popover-* token 中性化（透明、無框、無內距），
 * 由本元件的 .base-tooltip 提供深色泡泡外觀。
 *
 * ⚠️ 本 <style> 刻意「不」加 scoped：
 *   1. 要覆寫底座 .base-popover 的 token（BasePopover 為多根節點，class 不會 fallthrough）。
 *   2. 浮層經 Teleport 送到 <body>，scoped 的進場淡入 / scale 動畫仍由 BasePopover 提供。
 *
 * 主題化：覆寫 --tooltip-* token 即可。
 *   .base-tooltip { --tooltip-bg: #1d4ed8; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/* 中性化底座 chrome：僅當浮層內是 tooltip 時，讓 BasePopover 自身完全透明。 */
.base-popover:has(.base-tooltip) {
  --popover-bg: transparent;
  --popover-border: transparent;
  --popover-shadow: none;
  --popover-padding: 0;
}

/* 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。 */
:where(.base-tooltip) {
  --tooltip-bg: #1f2937;
  --tooltip-color: #ffffff;
  --tooltip-font-size: 0.8125rem;
  --tooltip-padding: 6px 10px;
  --tooltip-radius: 6px;
  --tooltip-max-width: 16rem;
}

.base-tooltip {
  position: relative;
  max-width: var(--tooltip-max-width);
  padding: var(--tooltip-padding);
  font-size: var(--tooltip-font-size);
  line-height: 1.4;
  color: var(--tooltip-color);
  word-break: break-word;
  background-color: var(--tooltip-bg);
  border-radius: var(--tooltip-radius);

  &__arrow {
    // 指向下方（▼）的三角形；BasePopover 的 arrowStyle 依 placement 旋轉到正確方位並定位。
    //
    // ⚠️ 必須是「正方形」元素：arrowStyle 對 left / right placement 用 rotate(±90deg)
    // 繞元素中心旋轉。若寬≠高（如 14×7），繞中心轉 90° 後三角形會被推離泡泡 (寬−高)/2，
    // 形成可見間隙。改用 14×14 正方形 + 頂點落在中心（50% 50%）的 clip：底邊永遠貼在
    // [side]:100% 那條邊、頂點在中心，任何旋轉都對稱不位移。視覺上仍是 14×7 扁三角（下半透明）。
    display: block;
    width: 14px;
    height: 14px;
    background-color: var(--tooltip-bg);
    clip-path: polygon(50% 50%, 0 0, 100% 0);

    // 往泡泡內縮 1px：arrowStyle 把箭頭貼在泡泡外緣，底邊與泡泡間會有次像素接縫。
    // 讓底邊重疊進泡泡（同色）即可消縫。transform 已被 arrowStyle 佔用（翻轉），故用 margin；
    // 主軸方向那一側負責重疊，交叉軸 1px 偏移肉眼不可見。
    margin: -1px;
  }
}
</style>
