<template>
  <span
    class="base-avatar"
    :class="sizeClass"
    :style="style"
    :role="src && alt ? 'img' : undefined"
    :aria-label="src && alt ? alt : undefined"
  >
    <!-- 有 src：載入成功顯示圖片，失敗（@error）切換到 fallback -->
    <template v-if="src">
      <img
        v-if="!error"
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
      <span
        v-else
        class="base-avatar__fallback"
      >
        <!-- 圖片載入失敗的替代內容；預設退回 default slot（縮寫），再退回 alt 文字 -->
        <slot name="fallback">
          <slot>{{ alt }}</slot>
        </slot>
      </span>
    </template>

    <!-- 無 src：純文字 / 縮寫 / 自訂內容 -->
    <span
      v-else
      class="base-avatar__fallback"
    >
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch, watchEffect } from 'vue'

import type { ImgHTMLAttributes, VNode } from 'vue'

import isNumberish from '~/utils/isNumberish'

export interface BaseAvatarProps {
  /**
   * 尺寸：具名（`small` / `medium` / `large`）走預設 token；數字 / 數字字串走自訂像素。
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | `${number}` | number
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
  size: 'medium',
  rounded: 'full',
  src: undefined,
  alt: undefined,
  loading: 'lazy',
  priority: false,
})

defineSlots<BaseAvatarSlots>()

/** 圖片是否載入失敗（由 `<img>` 原生 `@error` 設定）。 */
const error = ref(false)

// src 改變時重置失敗狀態，讓新圖片有機會重新載入。
watch(
  () => props.src,
  () => {
    error.value = false
  },
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
 * 具名尺寸交給 CSS class 處理，回傳 `undefined`（不輸出無效的 `width="medium"`）。
 *
 * > 修正參考實作：原版 `:width="size"` 在 `size='medium'` 時會渲染出非法的
 * > `width="medium"` 屬性，此處只在數值尺寸時輸出。
 */
const pixelSize = computed(() => (isNumberish(props.size) ? Number(props.size) : undefined))

/** 具名尺寸對應的 BEM modifier class；自訂尺寸時為 `null`（改用 inline CSS var）。 */
const sizeClass = computed(() =>
  isNumberish(props.size) ? null : `base-avatar--${props.size}`,
)

const style = computed(() => ({
  // 自訂尺寸寫進 CSS var；具名尺寸由 class 內的 token 提供。
  ...(isNumberish(props.size) ? { '--avatar-size': `${Number(props.size)}px` } : null),
  // full → 9999px（圓形）；其餘一律為像素圓角（數字字串也強制補 px，避免無單位值）。
  '--avatar-rounded': props.rounded === 'full' ? '9999px' : `${Number(props.rounded)}px`,
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
  --avatar-bg: #f3f4f6;
  --avatar-color: #374151;
  --avatar-font-size: 1.25rem;
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

  &--small {
    --avatar-size: 32px;
    --avatar-font-size: 0.75rem;
  }

  &--medium {
    --avatar-size: 40px;
    --avatar-font-size: 1.25rem;
  }

  &--large {
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
}
</style>
