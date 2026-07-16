<template>
  <span
    class="base-avatar"
    :class="sizeClass"
    :style="style"
    :role="fallbackRole"
    :aria-label="fallbackRole ? alt : undefined"
  >
    <!-- 有 src 且未失敗：顯示圖片；載入失敗（@error 或掛載時偵測）切換到 fallback -->
    <img
      v-if="src && !error"
      ref="imgRef"
      class="base-avatar__image"
      :src="src"
      :alt="alt"
      :width="pixelSize"
      :height="pixelSize"
      :loading="imgLoading"
      :fetchpriority="fetchPriority"
      decoding="async"
      draggable="false"
      @error="error = true"
    >

    <!--
      三層 fallback：
      1. slot — 圖片失敗優先 #fallback，其次 #default（無 src 只認 #default）
      2. 文字 — alt（非空字串）作縮寫 / 名稱
      3. 剪影 — 皆無可顯示內容時渲染內建匿名剪影，確保不出現空白圓
    -->
    <span
      v-else
      class="base-avatar__fallback"
    >
      <slot
        v-if="src && slots.fallback"
        name="fallback"
      />
      <slot v-else-if="slots.default" />
      <template v-else-if="alt">{{ alt }}</template>
      <!-- 內建匿名使用者剪影：純裝飾（aria-hidden），currentColor 沿用 --avatar-color 可主題化 -->
      <svg
        v-else
        class="base-avatar__silhouette"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z" />
      </svg>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef, watch, watchEffect } from 'vue'

import type { ImgHTMLAttributes, VNode, VNodeArrayChildren } from 'vue'

import isNumberish from '~/utils/isNumberish'

export interface BaseAvatarProps {
  /**
   * 尺寸：具名（`sm` / `md` / `lg`）走預設 token；數字 / 數字字串走自訂像素。
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | `${number}` | number
  /**
   * 圓角：`full` 為圓形；數字 / 數字字串為像素圓角。
   * @default 'full'
   */
  rounded?: `${number}` | number | 'full'
  /** 圖片來源；不給則只渲染 fallback / default slot（縮寫頭像）。 */
  src?: string
  /**
   * 圖片替代文字。有 `src` 時 MUST 提供：作為 `<img alt>` 與根節點 `aria-label`，
   * 也是圖片載入失敗時的最終文字 fallback。裝飾性頭像可明示 `alt=""`。
   */
  alt?: string
  /**
   * 圖片 `loading` 行為。一般情況維持 `'lazy'`；首屏關鍵頭像建議改用 `priority`。
   * @default 'lazy'
   */
  loading?: ImgHTMLAttributes['loading']
  /**
   * 首屏關鍵頭像的語意捷徑：一鍵套用 `loading="eager"` + `fetchpriority="high"`，
   * 加速 LCP。設為 `true` 時會覆寫 `loading`。
   * @default false
   */
  priority?: boolean
}

interface BaseAvatarSlots {
  /** 預設內容（縮寫 / icon）：無 `src` 或圖片失敗且未提供 `fallback` 時顯示。 */
  default?: () => VNode[]
  /** 圖片載入失敗時的替代內容。 */
  fallback?: () => VNode[]
}

const props = withDefaults(defineProps<BaseAvatarProps>(), {
  size: 'md',
  rounded: 'full',
  src: undefined,
  alt: undefined,
  loading: 'lazy',
  priority: false,
})

const slots = defineSlots<BaseAvatarSlots>()

/** 圖片是否載入失敗（由 `<img>` 原生 `@error` 或掛載時的水合前偵測設定）。 */
const error = ref(false)

const imgRef = useTemplateRef<HTMLImageElement>('imgRef')

/**
 * 水合前圖片錯誤偵測：SSR 輸出的 `<img>` 可能在 Vue 水合完成前就載入失敗，
 * 此時 error 事件早已 fire 完、掛載後才綁上的 `@error` 永遠收不到，元件會卡在破圖。
 *
 * 設計準則建議的「SSR 期 onerror 屬性標記」需要 inline handler 字串，與嚴格 CSP
 * （`script-src` 未含 `'unsafe-inline'`）不相容；此處改為掛載時檢查
 * `img.complete && img.naturalWidth === 0`（已結束載入卻無自然尺寸＝載入失敗），
 * 為同一情境的等效方案。之後的失敗仍由既有 `@error` 接手。
 */
onMounted(() => {
  const img = imgRef.value
  if (props.src && img && img.complete && img.naturalWidth === 0) {
    error.value = true
  }
})

// src 改變時重置失敗狀態，讓新圖片有機會重新載入。
watch(
  () => props.src,
  () => {
    error.value = false
  },
)

/**
 * 只有 fallback 狀態（有 `src` 但圖片載入失敗）才在外層 span 補 `role="img"` + `aria-label`，
 * 讓螢幕閱讀器把縮寫 / icon fallback 當成一張帶描述的圖片。
 *
 * 圖片正常顯示時交給 `<img alt>` 表達語意，避免外層 role/aria-label 與內層 img alt 重複朗讀；
 * 純縮寫頭像（無 `src`）與裝飾性頭像（`alt=""`）一律不掛，讓 SR 直接讀文字或跳過。
 */
const fallbackRole = computed<'img' | undefined>(() =>
  props.src && error.value && props.alt ? 'img' : undefined,
)

// a11y：有 src 卻沒給 alt 時於開發期警告（裝飾性頭像請明示 alt=""）。
if (import.meta.env.DEV) {
  watchEffect(() => {
    if (props.src && props.alt == null) {
      console.warn(
        '[BaseAvatar] 有 `src` 時請提供 `alt`（內容性頭像描述對象，裝飾性頭像明示 alt=""）。',
      )
    }
  })
}

/** priority 為首屏關鍵圖的捷徑：覆寫 loading 為 eager。 */
const imgLoading = computed<ImgHTMLAttributes['loading']>(() =>
  props.priority ? 'eager' : props.loading,
)

/** priority 時提高抓取優先序（加速 LCP）；否則交給瀏覽器預設。 */
const fetchPriority = computed<'high' | undefined>(() =>
  props.priority ? 'high' : undefined,
)

/**
 * 自訂尺寸時換算成像素整數，餵給 `<img width/height>` 預留版位、避免 layout shift。
 * 具名尺寸交給 CSS class 處理，回傳 `undefined`（不輸出無效的 `width="md"`）。
 *
 * > 修正參考實作：原版 `:width="size"` 在具名尺寸（如 `size='md'`）時會渲染出非法的
 * > `width="md"` 屬性，此處只在數值尺寸時輸出。
 */
const pixelSize = computed(() => (isNumberish(props.size) ? Number(props.size) : undefined))

/** 具名尺寸對應的 BEM modifier class；自訂尺寸時為 `null`（改用 inline CSS var）。 */
const sizeClass = computed(() =>
  isNumberish(props.size) ? null : `base-avatar--${props.size}`,
)

/**
 * 文字頭像自動配色色盤：每組 bg / fg 皆通過 WCAG AA（一般文字 4.5:1）對比驗證。
 * 各底色對白色前景（#FFFFFF）的對比值（依 WCAG relative luminance 計算，四捨五入）：
 *
 *   #B91C1C 6.5:1   #C2410C 5.2:1   #B45309 5.0:1   #047857 5.5:1
 *   #0F766E 5.5:1   #1D4ED8 6.7:1   #6D28D9 7.1:1   #BE185D 6.0:1
 */
const AUTO_COLOR_PALETTE = [
  { bg: '#B91C1C', fg: '#FFFFFF' },
  { bg: '#C2410C', fg: '#FFFFFF' },
  { bg: '#B45309', fg: '#FFFFFF' },
  { bg: '#047857', fg: '#FFFFFF' },
  { bg: '#0F766E', fg: '#FFFFFF' },
  { bg: '#1D4ED8', fg: '#FFFFFF' },
  { bg: '#6D28D9', fg: '#FFFFFF' },
  { bg: '#BE185D', fg: '#FFFFFF' },
] as const

/**
 * djb2 字串 hash：純算術、無亂數 / 時間來源，同輸入永遠同輸出（SSR 安全，
 * server / client 渲染結果一致，不會 hydration mismatch）。
 */
function hashString(value: string): number {
  let hash = 5381
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0
  }
  return hash
}

/** 從 slot vnode 樹擷取純文字（hash 配色依據）；只認字串 / 數字子節點，輸出具確定性。 */
function extractVNodeText(children: VNodeArrayChildren | undefined): string {
  if (!children) return ''
  let text = ''
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      text += String(child)
    } else if (Array.isArray(child)) {
      text += extractVNodeText(child)
    } else if (child && typeof child === 'object') {
      const nested = (child as VNode).children
      if (typeof nested === 'string') text += nested
      else if (Array.isArray(nested)) text += extractVNodeText(nested)
    }
  }
  return text
}

/** 自動配色的 hash 依據：優先 `alt`，否則退回 default slot 的純文字內容（縮寫）。 */
const autoColorKey = computed(() => props.alt || extractVNodeText(slots.default?.()))

/** 依顯示文字挑出的自動配色；無可顯示文字時為 `null`（維持 token 靜態預設）。 */
const autoColor = computed(() => {
  const key = autoColorKey.value
  if (!key) return null
  return AUTO_COLOR_PALETTE[hashString(key) % AUTO_COLOR_PALETTE.length] ?? null
})

const style = computed(() => ({
  ...(isNumberish(props.size)
    ? {
        // 自訂尺寸寫進 CSS var；具名尺寸由 class 內的 token 提供。
        '--avatar-size': `${Number(props.size)}px`,
        // 數字尺寸的字級等比縮放：比例對齊預設 md token（字級 1.25rem = 20px ÷ 容器 40px = 0.5），
        // 即 font-size = size × 0.5（px）。具名尺寸仍由各自 class token 提供，不受影響。
        '--avatar-auto-font-size': `${Number(props.size) * 0.5}px`,
      }
    : null),
  // full → 9999px（圓形）；其餘一律為像素圓角（數字字串也強制補 px，避免無單位值）。
  '--avatar-rounded': props.rounded === 'full' ? '9999px' : `${Number(props.rounded)}px`,
  // 自動配色只注入 `--avatar-auto-*`（而非直接寫 `--avatar-bg`）：inline style 會壓過任何
  // class，若直接寫 `--avatar-bg` 使用端就再也蓋不掉。優先序（高 → 低）：
  //   使用端 class 覆寫 --avatar-bg（specificity > 0）
  //   > :where() 預設層 --avatar-bg: var(--avatar-auto-bg, 靜態預設)（specificity 0，讀 inline auto 值）
  ...(autoColor.value
    ? {
        '--avatar-auto-bg': autoColor.value.bg,
        '--avatar-auto-color': autoColor.value.fg,
      }
    : null),
}))
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseAvatar — 頭像
 *
 * 圖片頭像 + 縮寫 / icon fallback。所有外觀抽成 --avatar-* token，
 * 覆寫即可主題化（取代參考實作的寫死值）。
 *
 *   .base-avatar { --avatar-bg: #dbeafe; --avatar-color: #1e40af; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 用 :where() 包起來（specificity 0），否則 scoped 會幫選擇器加上
 * [data-v-xxx]、specificity 高於使用端覆寫 class，導致 --avatar-bg 等改不動。
 */
:where(.base-avatar) {
  --avatar-size: 40px;
  --avatar-rounded: 9999px;

  /*
   * bg / color / font-size 的預設值先讀 `--avatar-auto-*`（元件 inline 注入的
   * hash 自動配色 / 數字尺寸自動字級），再退回靜態預設。
   *
   * 優先序設計：auto 值雖走 inline style，但 `--avatar-bg` 本身只宣告在這層
   * （:where()，specificity 0），因此使用端以任何 class 覆寫 `--avatar-bg` /
   * `--avatar-color` / `--avatar-font-size` 都必贏過自動配色。
   */
  --avatar-bg: var(--avatar-auto-bg, #f3f4f6);
  --avatar-color: var(--avatar-auto-color, #374151);
  --avatar-font-size: var(--avatar-auto-font-size, 1.25rem);
  --avatar-font-weight: 500;
}

.base-avatar {
  display: inline-flex;
  flex: none;
  justify-content: center;
  align-items: center;
  box-sizing: border-box;
  width: var(--avatar-size);
  height: var(--avatar-size);
  overflow: hidden;
  color: var(--avatar-color);
  font-size: var(--avatar-font-size);
  font-weight: var(--avatar-font-weight);
  line-height: 1;
  background-color: var(--avatar-bg);
  border-radius: var(--avatar-rounded);
  user-select: none;

  &--sm {
    --avatar-size: 32px;
    --avatar-font-size: 0.75rem;
  }

  &--md {
    --avatar-size: 40px;
    --avatar-font-size: 1.25rem;
  }

  &--lg {
    --avatar-size: 56px;
    --avatar-font-size: 1.5rem;
  }

  &__image {
    width: 100%;
    height: 100%;
    aspect-ratio: 1 / 1;
    object-fit: cover;
  }

  &__fallback {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  &__silhouette {
    /* 剪影約佔容器 2/3，四周留白；fill 用 currentColor（= --avatar-color）可主題化 */
    width: 66.67%;
    height: 66.67%;
  }
}
</style>
