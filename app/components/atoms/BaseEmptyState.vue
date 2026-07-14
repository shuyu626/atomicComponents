<template>
  <div
    class="base-empty-state"
    :class="`base-empty-state--${size}`"
  >
    <div
      v-if="icon || slots.icon"
      class="base-empty-state__icon"
      aria-hidden="true"
    >
      <slot name="icon">
        <svg
          class="base-empty-state__glyph"
          viewBox="0 0 24 24"
          fill="none"
        >
          <!-- 內建 inbox 圖示：托盤外框 + 內凹槽，純裝飾，色走 --empty-icon-color -->
          <path
            d="M3 13.5 5 5.8A1.5 1.5 0 0 1 6.4 4.7h11.2a1.5 1.5 0 0 1 1.4 1.1l2 7.7 M3 13.5V18a1.5 1.5 0 0 0 1.5 1.5h15A1.5 1.5 0 0 0 21 18v-4.5 M3 13.5h5l1.2 2.3h5.6l1.2-2.3h5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </slot>
    </div>

    <div class="base-empty-state__title">
      <slot
        name="title"
        :title="title"
      >{{ title }}</slot>
    </div>

    <div
      v-if="description || slots.description"
      class="base-empty-state__description"
    >
      <slot
        name="description"
        :description="description"
      >{{ description }}</slot>
    </div>

    <div
      v-if="slots.default"
      class="base-empty-state__extra"
    >
      <slot />
    </div>

    <div
      v-if="slots.actions"
      class="base-empty-state__actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
// BaseEmptyState 是 BaseResult 的「無狀態色」表親：置中欄版面（圖示 → 標題 → 說明 →
// 額外內容 → 動作）比照 BaseResult，但不帶狀態語意色（無 success/error 等 accent），
// 統一走中性灰階 --empty-* token，用於「區塊內無資料」情境（列表 / 表格 / 搜尋結果
// 為空），與 BaseResult 定位於「整頁結果」的分工詳見 docs/components/BaseEmptyState.md。
import type { VNode } from 'vue'

export interface BaseEmptyStateProps {
  /** 標題文字；提供 `#title` slot 時以 slot 為準。 @default '目前沒有資料' */
  title?: string
  /** 補充說明；提供 `#description` slot 時以 slot 為準。 */
  description?: string
  /** 顯示內建 inbox 圖示；`#icon` slot 存在時以 slot 為準。 @default true */
  icon?: boolean
  /** 尺寸：控制圖示大小與容器留白。 @default 'md' */
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<BaseEmptyStateProps>(), {
  title: '目前沒有資料',
  description: undefined,
  icon: true,
  size: 'md',
})

const slots = defineSlots<{
  /** 覆寫內建 inbox 圖示（自訂插圖 / 品牌 SVG）。 */
  icon?: () => VNode[]
  /** 覆寫標題；scoped prop 帶出目前的 `title` prop 值（否則用 `title` prop）。 */
  title?: (props: { title: string }) => VNode[]
  /** 覆寫說明；scoped prop 帶出目前的 `description` prop 值（否則用 `description` prop）。 */
  description?: (props: { description?: string }) => VNode[]
  /** 標題 / 說明之後、動作之前的額外內容（篩選條件摘要、提示清單…）。 */
  default?: () => VNode[]
  /** 動作按鈕區（重新整理 / 新增資料 / 清除篩選…）。 */
  actions?: () => VNode[]
}>()
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseEmptyState — 區塊內無資料狀態
 *
 * 置中直欄：inbox 圖示 → 標題 → 說明 → 額外內容 → 動作，版面比照 BaseResult，
 * 但刻意不帶狀態語意色（無 success/error 等 accent）——統一走中性灰階
 * --empty-* token，覆寫即可主題化：
 *
 *   .base-empty-state { --empty-icon-color: #9ca3af; --empty-title-color: #111827; }
 *
 * size（sm/md/lg）覆寫圖示尺寸、內距、字級與間距（版面比例整組縮放），不影響顏色；
 * 字級階層對齊姊妹元件 BaseResult（md 標題 1rem 介於 sm 0.875 與 Result 1.125 之間）。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。
 */
:where(.base-empty-state) {
  --empty-icon-size: 56px; // size=md 預設；sm/lg 由 modifier 覆寫
  --empty-icon-color: #d1d5db; // gray-300
  --empty-title-color: #1f2937; // gray-800，對齊 BaseResult --result-title-color
  --empty-title-font-size: 1rem; // size=md 預設；sm/lg 由 modifier 覆寫
  --empty-description-color: #6b7280; // gray-500
  --empty-description-font-size: 0.875rem; // size=md 預設；sm/lg 由 modifier 覆寫
  --empty-gap-y: 12px; // size=md 預設，對齊 BaseResult --result-gap；sm/lg 由 modifier 覆寫
  --empty-padding: 40px; // size=md 預設；sm/lg 由 modifier 覆寫

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--empty-gap-y);
  padding: var(--empty-padding);
  text-align: center;
}

/* ── size（尺寸 / 內距 / 字級 / 間距整組縮放，不影響顏色）──────── */
:where(.base-empty-state--sm) {
  --empty-icon-size: 40px;
  --empty-padding: 24px;
  --empty-title-font-size: 0.875rem;
  --empty-description-font-size: 0.75rem;
  --empty-gap-y: 8px; // 緊湊情境（表格空槽等）維持原節奏
}
:where(.base-empty-state--md) {
  --empty-icon-size: 56px;
  --empty-padding: 40px;
  --empty-title-font-size: 1rem;
  --empty-description-font-size: 0.875rem;
  --empty-gap-y: 12px;
}
:where(.base-empty-state--lg) {
  --empty-icon-size: 72px;
  --empty-padding: 56px;
  --empty-title-font-size: 1.125rem; // 對齊 BaseResult 標題字級
  --empty-description-font-size: 0.9375rem; // 對齊 BaseResult 說明字級
  --empty-gap-y: 16px;
}

/* ── 圖示 ─────────────────────────────────────────────── */
.base-empty-state__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.base-empty-state__glyph {
  display: block;
  width: var(--empty-icon-size);
  height: var(--empty-icon-size);
  color: var(--empty-icon-color);
}

/* ── 文字 ─────────────────────────────────────────────── */
.base-empty-state__title {
  margin: 0;
  font-size: var(--empty-title-font-size);
  font-weight: 600;
  line-height: 1.4;
  color: var(--empty-title-color);
}

.base-empty-state__description {
  margin: 0;
  font-size: var(--empty-description-font-size);
  line-height: 1.5;
  color: var(--empty-description-color);
}

/* ── 額外內容 / 動作 ──────────────────────────────────── */
.base-empty-state__extra {
  width: 100%;
}

.base-empty-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  // 動作與上方文字保留多一點呼吸空間。
  margin-top: 4px;
}
</style>
