<template>
  <div
    :id="meta?.tabpanelId"
    ref="panel"
    class="base-tab-panel"
    :role="meta ? 'tabpanel' : undefined"
    :aria-labelledby="meta?.id"
    :tabindex="tabindex"
    :hidden="hidden"
  >
    <slot v-if="renderContent" />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onMounted, ref, watch } from 'vue'

import { BASE_TABS_INJECT_KEY } from '~/components/atoms/BaseTabs.vue'
import isNullOrUndefined from '~/utils/isNullOrUndefined'

export interface BaseTabPanelProps {
  /** 對應某個 tab 的 `value`；等於目前選中值時顯示 */
  value: unknown
  /**
   * @default false 延遲掛載：首次顯示前不渲染內容，第一次顯示後才渲染並保持掛載（之後切走仍保留狀態）。
   */
  lazy?: boolean
}

const props = defineProps<BaseTabPanelProps>()

// BaseTabs 傳下來的 context；單獨使用（無父層）時為 null，退化成普通 <div>。
const context = inject(BASE_TABS_INJECT_KEY, null)

// 查自己對應的 tab / panel id，用來接 aria 關聯（查不到 / 無 context 時為 null）。
const meta = computed(() => {
  if (isNullOrUndefined(context)) return null
  return context.lookup.value.get(props.value) ?? null
})

// 不是選中值就隱藏；無 context 時一律顯示，交給 caller 控制。
const hidden = computed(() => {
  if (isNullOrUndefined(context)) return false
  return props.value !== context.current.value
})

// lazy：記住「曾經顯示過」，第一次顯示後就一直渲染（保留狀態）。
const hasBeenShown = ref(false)
watch(
  hidden,
  (isHidden) => {
    if (!isHidden) hasBeenShown.value = true
  },
  { immediate: true },
)
const renderContent = computed(() => !props.lazy || hasBeenShown.value)

// tabindex：面板內若已有可聚焦元素，面板本身就不該再吃一個 Tab 停靠點（WAI-ARIA）。
// 預設 false（SSR 與首次渲染一致避免 hydration mismatch），掛載後再實際偵測。
const panel = ref<HTMLElement | null>(null)
const selfFocusable = ref(false)
// 原生可被 Tab 鍵聚焦的元素類型，注意：排除 tabindex="-1"（程式化聚焦用，不能被 Tab 鍵
// 聚焦）與 disabled / hidden 的控制項——它們同樣不可被 Tab，不該算「面板已有可聚焦元素」，
// 否則面板內只剩 disabled 按鈕時，面板不補 tabindex、鍵盤永遠進不了面板內容。
const FOCUSABLE_SELECTOR =
  'a[href]:not([hidden]),area[href],button:not([disabled]):not([hidden]),input:not([disabled]):not([hidden]),select:not([disabled]):not([hidden]),textarea:not([disabled]):not([hidden]),[tabindex]:not([tabindex="-1"]):not([hidden]),[contenteditable="true"],audio[controls],video[controls],iframe:not([hidden])'

// 面板裡沒有任何能被 Tab 的元素 → 面板自己需要當停靠點
function syncSelfFocusable() {
  const el = panel.value
  // 面板存在(!!el),而且面板內找不到可聚焦元素
  selfFocusable.value = !!el && !el.querySelector(FOCUSABLE_SELECTOR)
}

onMounted(syncSelfFocusable)
// 顯示狀態或內容渲染改變後重新偵測（lazy 內容是顯示後才出現的）。
watch([hidden, renderContent], () => nextTick(syncSelfFocusable))

const tabindex = computed(() =>
  meta.value && !hidden.value && selfFocusable.value ? 0 : undefined,
)

defineSlots<{
  /** 面板內容 */
  default(props: Record<string, never>): unknown
}>()
</script>

<style scoped lang="scss">
.base-tab-panel {
  // 面板本身可被鍵盤聚焦（WAI-ARIA：面板內無可聚焦元素時應可被 Tab 到）
  &:focus-visible {
    outline: 2px solid var(--tabs-focus-ring, #2563eb);
    outline-offset: 2px;
  }
}
</style>
