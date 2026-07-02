<template>
  <!--
    結果 / 狀態回饋面板：置中的狀態圖示 + 標題 + 說明 + 動作。
    可單獨用在頁面（成功頁 / 空狀態 / 404），或塞進 BaseModal / BaseDialog 當結果彈窗
    （彈窗的 ✕ 由 Modal 提供，主要動作放 #actions）。
  -->
  <div
    class="base-result"
    :class="`base-result--${status}`"
  >
    <div
      v-if="icon"
      class="base-result__icon"
    >
      <slot name="icon">
        <!-- 內建狀態圓標：實心 accent 圓 + 白色字符。裝飾性，語意由標題承載。 -->
        <svg
          class="base-result__glyph"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="12"
            r="12"
            fill="var(--result-accent)"
          />
          <!-- success → 勾 -->
          <path
            v-if="status === 'success'"
            d="M7 12.4l3.2 3.1L17 8.8"
            fill="none"
            stroke="var(--result-on-accent)"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <!-- error → 叉 -->
          <path
            v-else-if="status === 'error'"
            d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6"
            fill="none"
            stroke="var(--result-on-accent)"
            stroke-width="2"
            stroke-linecap="round"
          />
          <!-- warning → 驚嘆號 -->
          <template v-else-if="status === 'warning'">
            <path
              d="M12 6.5v7"
              fill="none"
              stroke="var(--result-on-accent)"
              stroke-width="2"
              stroke-linecap="round"
            />
            <circle
              cx="12"
              cy="17"
              r="1.2"
              fill="var(--result-on-accent)"
            />
          </template>
          <!-- info → i -->
          <template v-else>
            <circle
              cx="12"
              cy="7.5"
              r="1.2"
              fill="var(--result-on-accent)"
            />
            <path
              d="M12 11v6.5"
              fill="none"
              stroke="var(--result-on-accent)"
              stroke-width="2"
              stroke-linecap="round"
            />
          </template>
        </svg>
      </slot>
    </div>

    <p
      v-if="title || slots.title"
      class="base-result__title"
    >
      <slot name="title">{{ title }}</slot>
    </p>

    <p
      v-if="description || slots.description"
      class="base-result__description"
    >
      <slot name="description">{{ description }}</slot>
    </p>

    <div
      v-if="slots.default"
      class="base-result__body"
    >
      <slot />
    </div>

    <div
      v-if="slots.actions"
      class="base-result__actions"
    >
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { VNode } from 'vue'

export type BaseResultStatus = 'success' | 'info' | 'warning' | 'error'

export interface BaseResultProps {
  /**
   * 狀態：決定圓標顏色與內建字符。
   * - `success`：綠 + 勾
   * - `info`（預設）：藍 + i
   * - `warning`：琥珀 + 驚嘆號
   * - `error`：紅 + 叉
   * @default 'info'
   */
  status?: BaseResultStatus
  /** 主標題（也可用 `#title` slot 覆寫）。 */
  title?: string
  /** 說明文字（也可用 `#description` slot 覆寫）。 */
  description?: string
  /**
   * 是否顯示狀態圖示（可用 `#icon` slot 覆寫成自訂圖示）。
   * @default true
   */
  icon?: boolean
}

withDefaults(defineProps<BaseResultProps>(), {
  status: 'info',
  title: undefined,
  description: undefined,
  icon: true,
})

const slots = defineSlots<{
  /** 覆寫狀態圖示 */
  icon?: () => VNode[]
  /** 覆寫標題（否則用 `title` prop） */
  title?: () => VNode[]
  /** 覆寫說明（否則用 `description` prop） */
  description?: () => VNode[]
  /** 標題 / 說明之後、動作之前的額外內容（明細、清單…） */
  default?: () => VNode[]
  /** 動作按鈕區（關閉 / 重試 / 返回…） */
  actions?: () => VNode[]
}>()
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseResult — 結果 / 狀態回饋面板
 *
 * 置中直欄：狀態圓標 → 標題 → 說明 → 額外內容 → 動作。
 * 顏色 / 尺寸 / 間距全走 --result-* token，覆寫即可主題化：
 *
 *   .base-result { --result-icon-size: 72px; --result-accent: #7c3aed; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。
 */
:where(.base-result) {
  --result-accent: #06b6d4; // 預設 = info
  --result-on-accent: #ffffff; // 圓標字符色（accent 底上的對比色）
  --result-title-color: #1f2937; // gray-800
  --result-description-color: #6b7280; // gray-500
  --result-icon-size: 56px;
  --result-gap: 12px; // 各區塊之間的垂直間距
  --result-padding: 24px;

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--result-gap);
  padding: var(--result-padding);
  text-align: center;
}

/* ── 狀態色（accent 對齊 BaseBadge / BaseSpinner 的亮色語意集）── */
:where(.base-result--success) { --result-accent: #22c55e; }
:where(.base-result--info) { --result-accent: #06b6d4; }
:where(.base-result--warning) { --result-accent: #f59e0b; }
:where(.base-result--error) { --result-accent: #ef4444; }

/* ── 圖示 ─────────────────────────────────────────────── */
// 用 flex 置中；不靠 line-height:0（那會讓文字 / emoji 類的自訂 #icon 盒高塌成 0
// 而向下溢出壓到標題）。SVG 自身用 display:block 消除基線間隙。
.base-result__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.base-result__glyph {
  display: block;
  width: var(--result-icon-size);
  height: var(--result-icon-size);
}

/* ── 文字 ─────────────────────────────────────────────── */
.base-result__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--result-title-color);
}

.base-result__description {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: var(--result-description-color);
}

/* ── 額外內容 / 動作 ──────────────────────────────────── */
.base-result__body {
  width: 100%;
}

.base-result__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  // 動作與上方文字保留多一點呼吸空間。
  margin-top: 4px;
}
</style>
