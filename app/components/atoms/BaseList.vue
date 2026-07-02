<template>
  <!--
    語意列表容器。標籤由 `as` 決定（ul / ol），重置原生 list 樣式後由 item 自行排版。
    顯式補 role="list"：Safari + VoiceOver 在 `list-style: none`（尤其再加 flex）時會剝除
    <ul>/<ol> 的清單語意（不再朗讀「清單，N 項」），補 role 把語意找回來（item 亦補 role="listitem"）。
    size / divided / itemShape 透過 provide 傳給每個 BaseListItem，item 端 var() fallback 提供 standalone 預設。
  -->
  <component
    :is="as"
    class="base-list"
    :class="rootClass"
    role="list"
  >
    <slot />
  </component>
</template>

<script lang="ts">
import type { ComputedRef, InjectionKey } from 'vue'

/** 列表項目的尺寸（控制內距與字級） */
export type BaseListSize = 'sm' | 'md' | 'lg'

/**
 * 列表項目形狀（高亮外觀）：
 * - `square`：滿版方角列（預設）
 * - `rounded`：圓角藥丸列 + 間距（導覽抽屜風格）
 * - `shaped`：單邊全圓藥丸（trailing 端全圓、leading 端平齊）
 *   （註：與 Vuetify 的 `shaped`＝對角圓角不同，此處為單邊藥丸）
 */
export type BaseListItemShape = 'square' | 'rounded' | 'shaped'

/** BaseList 透過 provide 傳給 BaseListItem 的共享 context */
export interface BaseListContext {
  /** 尺寸：決定 item 的內距 / 字級 */
  size: ComputedRef<BaseListSize>
  /** 項目間是否加分隔線（僅 `square` 有效） */
  divided: ComputedRef<boolean>
  /** 項目形狀（高亮外觀） */
  itemShape: ComputedRef<BaseListItemShape>
}

/** provide / inject 用的 key（BaseListItem 會 import） */
export const BASE_LIST_INJECT_KEY: InjectionKey<BaseListContext> =
  Symbol('BaseList')
</script>

<script setup lang="ts">
import { computed, provide } from 'vue'
import type { VNode } from 'vue'

export interface BaseListProps {
  /**
   * 根元素的語意標籤。
   * - `ul`（預設）：無序列表
   * - `ol`：有序列表（步驟 / 排名…）
   * @default 'ul'
   */
  as?: 'ul' | 'ol'
  /**
   * 尺寸：控制每個項目的內距與字級，透過 context 傳給 BaseListItem。
   * @default 'md'
   */
  size?: BaseListSize
  /**
   * 是否在項目之間加分隔線（第一項之前不畫）。僅 `itemShape="square"` 有效。
   * @default false
   */
  divided?: boolean
  /**
   * 項目形狀（高亮外觀）：
   * - `square`（預設）：滿版方角列
   * - `rounded`：圓角藥丸列 + 間距（導覽抽屜風格）
   * - `shaped`：單邊全圓藥丸（trailing 端全圓、leading 端平齊）
   * @default 'square'
   */
  itemShape?: BaseListItemShape
}

const props = withDefaults(defineProps<BaseListProps>(), {
  as: 'ul',
  size: 'md',
  divided: false,
  itemShape: 'square',
})

defineSlots<{
  /** 預設 slot：放一組 `<BaseListItem>` */
  default?: () => VNode[]
}>()

/** 組裝 BEM modifier：尺寸 / 分隔線 / 形狀（square 為預設，不輸出 class）。 */
const rootClass = computed(() => [
  `base-list--${props.size}`,
  {
    'base-list--divided': props.divided && props.itemShape === 'square',
    [`base-list--shape-${props.itemShape}`]: props.itemShape !== 'square',
  },
])

// 以 computed 提供 context，size / divided / itemShape 變動時 item 端自動反映。
provide(BASE_LIST_INJECT_KEY, {
  size: computed(() => props.size),
  divided: computed(() => props.divided),
  itemShape: computed(() => props.itemShape),
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseList — 語意列表容器
 *
 * 重置原生 list 樣式（marker / margin / padding），版面交給 BaseListItem。
 * 顏色 / 分隔線色走 --list-* token（會 cascade 給內部 item）：
 *
 *   .base-list { --list-divider-color: #d1d5db; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，否則 scoped 的 [data-v-xxx]
 * 會高於使用端覆寫 class，導致 --list-* 改不動。
 */
:where(.base-list) {
  --list-bg: transparent;
  --list-color: #1f2937; // gray-800，內文色
  --list-divider-color: #e5e7eb; // gray-200，項目分隔線
  --list-gap: 0; // 項目間距（rounded / shaped 導覽模式加大）
  --list-padding: 0; // 列表內距（導覽模式讓藥丸內縮不貼邊）

  display: flex;
  flex-direction: column;
  gap: var(--list-gap);
  margin: 0;
  padding: var(--list-padding);
  color: var(--list-color);
  background: var(--list-bg);
  list-style: none;
}

/* ── 導覽模式（rounded / shaped）：項目變藥丸、加間距、列表內縮 ── */
:where(.base-list--shape-rounded),
:where(.base-list--shape-shaped) {
  --list-gap: 2px;
  --list-padding: 6px;
}
</style>
