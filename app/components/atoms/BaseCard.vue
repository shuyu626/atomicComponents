<template>
  <!--
    內容容器。語意標籤由 caller 透過 `as` 決定（div / section / article），不假裝。
    區段順序：media（滿版）→ header → body → footer，皆只在對應 slot 存在時渲染。
  -->
  <component
    :is="as"
    class="base-card"
    :class="rootClass"
  >
    <div
      v-if="slots.media"
      class="base-card__media"
    >
      <slot name="media" />
    </div>

    <div
      v-if="slots.header"
      class="base-card__header"
    >
      <slot name="header" />
    </div>

    <div
      v-if="slots.default"
      class="base-card__body"
    >
      <slot />
    </div>

    <div
      v-if="slots.footer"
      class="base-card__footer"
    >
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { VNode } from 'vue'

export interface BaseCardProps {
  /**
   * 根元素的語意標籤。卡片本身是內容容器，語意由 caller 決定，不寫死。
   * - `div`（預設）：純視覺分組
   * - `section`：頁面中具標題的獨立區段
   * - `article`：可獨立散布的內容（文章 / 商品卡…）
   * @default 'div'
   */
  as?: 'div' | 'section' | 'article'
  /**
   * 外觀。卡片的外觀軸是「表面樣式」（陰影 / 邊框 / 填色），與互動元件的
   * `solid / outline / ghost / text`（填充軸）本質不同，故採卡片慣用值：
   * - `elevated`（預設）：陰影浮起、無外框
   * - `outlined`：描邊、無陰影
   * - `filled`：淺色填底、無陰影無外框
   * @default 'elevated'
   */
  variant?: 'elevated' | 'outlined' | 'filled'
  /**
   * 各區段（header / body / footer）的內距；`media` 一律滿版不受影響。
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /**
   * 滑鼠移入時陰影抬升的視覺回饋（僅外觀，不賦予互動語意）。
   * ⚠️ 整張卡片要可點擊時，請在內容放 `<BaseLink>` / `<BaseButton>` 或自行加
   * handler + 對應 a11y（role / tabindex / 鍵盤），本 prop 不負責互動。
   * @default false
   */
  hoverable?: boolean
}

interface BaseCardSlots {
  /** 滿版媒體區（圖片 / 影片 / 橫幅），貼齊卡片邊、不套內距。 */
  media?: () => VNode[]
  /** 卡片頁首（標題列 / 操作）。標題階層由 caller 自行決定，元件不寫死 heading。 */
  header?: () => VNode[]
  /** 卡片主要內容。 */
  default?: () => VNode[]
  /** 卡片頁尾（操作按鈕 / 補充資訊）。 */
  footer?: () => VNode[]
}

const props = withDefaults(defineProps<BaseCardProps>(), {
  as: 'div',
  variant: 'elevated',
  padding: 'md',
  hoverable: false,
})

const slots = defineSlots<BaseCardSlots>()

/** 組裝 BEM modifier：外觀 / 內距 / 可懸停。 */
const rootClass = computed(() => [
  `base-card--${props.variant}`,
  `base-card--padding-${props.padding}`,
  { 'base-card--hoverable': props.hoverable },
])
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseCard — 內容容器卡片
 *
 * 區段：media（滿版）/ header / body / footer，皆走 default slot 控制存在與否。
 * 所有外觀抽成 --card-* token，覆寫即可主題化：
 *
 *   .base-card { --card-radius: 1rem; --card-shadow: ...; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 的 [data-v-xxx]
 * 會高於使用端覆寫 class，導致 --card-* 改不動。
 */
:where(.base-card) {
  --card-bg: #ffffff;
  --card-color: #1f2937; // gray-800，內文色
  --card-border-color: #e5e7eb; // gray-200，outlined variant 外框色
  // 區段分隔線（header 下緣 / footer 上緣）獨立 token，預設沿用外框色，
  // 可單獨覆寫（例如想要 outlined 外框但無區段分隔，設為 transparent）。
  --card-divider-color: var(--card-border-color);
  --card-radius: 0.75rem;
  --card-shadow: 0 1px 3px rgb(0 0 0 / 10%), 0 1px 2px -1px rgb(0 0 0 / 10%);
  --card-shadow-hover: 0 10px 15px -3px rgb(0 0 0 / 10%), 0 4px 6px -4px rgb(0 0 0 / 10%);
  --card-fill-bg: #f9fafb; // gray-50，filled variant 底色
  --card-padding: 1rem; // md 預設；由 padding modifier 覆寫

  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  color: var(--card-color);
  background: var(--card-bg);
  border-radius: var(--card-radius);
  // 讓 media 的方角被卡片圓角裁切；卡片自身陰影在 border-box 外，不受影響。
  overflow: hidden;
}

/* ── 外觀 variant ────────────────────────────────────── */
// 統一補 1px transparent 邊框，讓三種 variant 的盒模型寬高一致（切換不跳動）。
:where(.base-card--elevated) {
  border: 1px solid transparent;
  box-shadow: var(--card-shadow);
}

:where(.base-card--outlined) {
  border: 1px solid var(--card-border-color);
  box-shadow: none;
}

:where(.base-card--filled) {
  border: 1px solid transparent;
  background: var(--card-fill-bg);
  box-shadow: none;
}

/* ── 內距 ────────────────────────────────────────────── */
:where(.base-card--padding-none) { --card-padding: 0; }
:where(.base-card--padding-sm) { --card-padding: 0.75rem; }
:where(.base-card--padding-md) { --card-padding: 1rem; }
:where(.base-card--padding-lg) { --card-padding: 1.5rem; }

/* ── 區段 ────────────────────────────────────────────── */
.base-card__media {
  // 滿版：媒體貼齊卡片邊（圓角由父層 overflow: hidden 裁切）。
  :where(img, video, picture, svg) {
    display: block;
    width: 100%;
    height: auto;
  }
}

.base-card__header {
  padding: var(--card-padding);
  // 與後續內容的分隔線；filled / elevated 無外框時仍提供視覺區隔。
  border-bottom: 1px solid var(--card-divider-color);
}

.base-card__body {
  // 撐開剩餘空間，讓卡片在固定高度容器（grid）中 footer 仍貼底。
  flex: 1 1 auto;
  padding: var(--card-padding);
}

.base-card__footer {
  padding: var(--card-padding);
  border-top: 1px solid var(--card-divider-color);
}

/* ── 可懸停（純視覺回饋）────────────────────────────── */
:where(.base-card--hoverable) {
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.base-card--hoverable:hover {
  box-shadow: var(--card-shadow-hover);
  transform: translateY(-2px);
}

@media (prefers-reduced-motion: reduce) {
  :where(.base-card--hoverable) {
    transition: none;
  }

  .base-card--hoverable:hover {
    transform: none;
  }
}
</style>
