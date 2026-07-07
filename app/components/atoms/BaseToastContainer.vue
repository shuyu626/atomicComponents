<template>
  <Teleport to="body">
    <!--
      持久 live region:永遠存在於 DOM(先於訊息插入),再把文字塞進來。
      部分螢幕閱讀器只朗讀「先存在、後填入」的 live region,整塊動態插入的
      role=status/alert 會被略過,故獨立出這個常駐 announcer 統一朗讀。
      polite / assertive 兩個層級分流:error / warning 走 assertive(立即打斷),
      其餘走 polite(等空檔)。視覺 toast 改 presentational(無 live 語意),避免重複播報。
    -->
    <div class="base-toast-live-region" aria-atomic="true">
      <div role="status" aria-live="polite" aria-atomic="true">{{ politeMessage }}</div>
      <div role="alert" aria-live="assertive" aria-atomic="true">{{ assertiveMessage }}</div>
    </div>

    <!--
      每個有 toast 的 placement 各渲染一個固定區塊，彼此獨立堆疊。
      只在「該角落真的有 toast」時渲染區塊，避免空的 fixed 元素佔位攔截點擊。
    -->
    <div
      v-for="group in groups"
      :key="group.placement"
      class="base-toast-container"
      :class="`base-toast-container--${group.placement}`"
    >
      <TransitionGroup name="base-toast" tag="div" class="base-toast-container__list">
        <BaseToast
          v-for="item in group.items"
          :key="item.id"
          presentational
          :message="item.message"
          :title="item.title"
          :type="item.type"
          :duration="item.duration"
          :closable="item.closable"
          :progress="item.progress"
          @close="manager.dismiss(item.id)"
        />
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import BaseToast from '~/components/atoms/BaseToast.vue'
import { useToast } from '~/composables/useToast'
import type { ToastItem, ToastManager, ToastPlacement } from '~/composables/useToast'

export interface BaseToastContainerProps {
  /**
   * 要綁定的管理器實例；預設取全應用共用單例。
   * 需要多組獨立佇列（如測試或微前端）時可傳入自建的 `createToastManager()`。
   */
  manager?: ToastManager
}

const props = withDefaults(defineProps<BaseToastContainerProps>(), {
  manager: undefined,
})

// 預設綁全域單例：與任何 useToast() 呼叫端共享同一佇列。
const manager = props.manager ?? useToast()

// 固定的 placement 列舉順序，確保分組輸出穩定。
const PLACEMENTS: ToastPlacement[] = [
  'top-start',
  'top',
  'top-end',
  'bottom-start',
  'bottom',
  'bottom-end',
]

interface ToastGroup {
  placement: ToastPlacement
  items: ToastItem[]
}

// 依 placement 把佇列分組；空的 placement 不輸出，故 template 只渲染有內容的角落。
const groups = computed<ToastGroup[]>(() =>
  PLACEMENTS
    .map(placement => ({
      placement,
      items: manager.toasts.filter(toast => toast.placement === placement),
    }))
    .filter(group => group.items.length > 0),
)

// ── 持久 live region 文字注入 ────────────────────────────────────────────────
// 兩個層級各持有一段文字;新 toast 出現時依 type 把訊息寫進對應層級,
// 觸發常駐 announcer 朗讀(視覺 toast 已 presentational,不重複播報)。
const politeMessage = ref('')
const assertiveMessage = ref('')

// 已朗讀過的 id,避免同一筆因重渲 / 其他 toast 增減被重複播報;
// 並在離開佇列後清除,防止 Set 無限成長。
const announced = new Set<string>()

watch(
  () => manager.toasts.map(toast => toast.id),
  () => {
    for (const toast of manager.toasts) {
      if (announced.has(toast.id)) continue
      announced.add(toast.id)
      const text = [toast.title, toast.message].filter(Boolean).join(' ')
      if (toast.type === 'error' || toast.type === 'warning') {
        assertiveMessage.value = text
      }
      else {
        politeMessage.value = text
      }
    }
    const liveIds = new Set(manager.toasts.map(toast => toast.id))
    for (const id of announced) {
      if (!liveIds.has(id)) announced.delete(id)
    }
  },
)
</script>

<style scoped lang="scss">
// 持久 live region:視覺隱藏但保留在 a11y tree,僅供螢幕閱讀器朗讀。
.base-toast-live-region {
  position: fixed;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  border: 0;
  pointer-events: none;
}

.base-toast-container {
  position: fixed;
  z-index: var(--toast-z, 1200);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  // 空白區穿透點擊；個別 .base-toast 自身 pointer-events:auto 才可互動。
  pointer-events: none;

  &__list {
    display: contents; // TransitionGroup 需要實體 tag，但版面交給外層 flex
  }

  // ── 垂直定位：top-* 靠上、bottom-* 靠下 ──────────────────────────────────────
  // top-*：靠上、新訊息出現在最上緣（column-reverse 讓最新的排在視覺頂端）。
  &--top-start,
  &--top,
  &--top-end {
    top: 0;
    flex-direction: column-reverse;
  }

  // bottom-*：靠下、新訊息出現在最下緣（最新的排在最靠近底邊）。
  &--bottom-start,
  &--bottom,
  &--bottom-end {
    bottom: 0;
  }

  // ── 水平定位 ─────────────────────────────────────────────────────────────────
  &--top-start,
  &--bottom-start {
    left: 0;
    align-items: flex-start;
  }

  &--top-end,
  &--bottom-end {
    right: 0;
    align-items: flex-end;
  }

  &--top,
  &--bottom {
    left: 50%;
    align-items: center;
    transform: translateX(-50%);
  }
}

// ── 進出場：淡入 + 輕微滑移 + 縮放；移除時其餘 toast 平滑補位 ───────────────────
.base-toast-enter-active,
.base-toast-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.base-toast-move {
  transition: transform 0.25s ease;
}

.base-toast-enter-from,
.base-toast-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

// 離場時脫離 flow，讓其餘 toast 以 move transition 平滑補位（而非瞬間跳動）。
.base-toast-leave-active {
  position: absolute;
}

@media (prefers-reduced-motion: reduce) {
  .base-toast-enter-active,
  .base-toast-leave-active,
  .base-toast-move {
    transition: none;
  }
}
</style>
