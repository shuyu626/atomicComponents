<template>
  <!--
    role="group"：把整組頭像標成一個語意群組。建議由使用端透過 attrs 傳
    aria-label（如 aria-label="專案成員"）給這個群組一個名稱。
  -->
  <div
    class="base-avatar-group"
    role="group"
  >
    <component :is="renderGroup()" />
  </div>
</template>

<script setup lang="ts">
import { cloneVNode, Fragment, h } from 'vue'

import type { VNode } from 'vue'

import BaseAvatar from './BaseAvatar.vue'

import resolveSlotChildren from '~/helpers/resolveSlotChildren'

export interface BaseAvatarGroupProps {
  /**
   * 最多顯示幾個頭像，超出的數量收斂成 `+N`。小於 1 會被夾為 1。
   * @default 3
   */
  max?: number
  /**
   * 統一套用到群組內每個 avatar 的尺寸（覆寫子層各自的 `size`）。
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | `${number}` | number
  /**
   * 統一套用到群組內每個 avatar 的圓角（覆寫子層各自的 `rounded`）。
   * @default 'full'
   */
  rounded?: `${number}` | number | 'full'
}

interface BaseAvatarGroupSlots {
  /** 放一組 `<BaseAvatar>`；群組會統一尺寸 / 圓角並裁切到 `max`。 */
  default?: () => VNode[]
}

const props = withDefaults(defineProps<BaseAvatarGroupProps>(), {
  max: 3,
  size: 'md',
  rounded: 'full',
})

const slots = defineSlots<BaseAvatarGroupSlots>()

/**
 * 以 render function（而非 computed）解析 slot 並組裝群組。
 *
 * computed 只在「被追蹤的響應依賴」變動時重算，但 slot 內容變動**不算**響應依賴；
 * 用 computed 會讓子 avatar 動態增減（如 `v-for` 清單變長）時吃到舊快取。改成每次
 * render 重新解析，子節點變動即時反映。
 */
function renderGroup() {
  const nodes = resolveSlotChildren(slots.default?.())
  if (!nodes || !nodes.length) return undefined

  const length = nodes.length

  // 夾成 ≥ 1 的整數：避免分數 max 算出 `+2.5` 這種非整數計數。
  let max = Math.floor(Number(props.max))
  if (Number.isNaN(max) || max < 1) max = 1

  // 統一覆寫子 avatar 的尺寸 / 圓角，確保群組視覺一致。
  const shared = { size: props.size, rounded: props.rounded }

  // 保持「DOM 順序＝閱讀順序」（不像參考實作那樣 reverse），改用遞減 z-index
  // 讓前面的頭像疊在後面之上，兼顧視覺堆疊與螢幕閱讀器的正確朗讀順序。
  // key 沿用原 vnode 的 key，沒有才用 index fallback（`node.key ?? index`）：
  // 當 slot 來源是動態清單（v-for）時，保留原 key 才能讓 Vue 依身分（而非位置）
  // diff，避免清單增減 / 重排時把狀態 patch 到錯的 avatar 上。
  const visible: VNode[] = nodes
    .slice(0, max)
    .map((node, index) =>
      cloneVNode(node, {
        ...shared,
        key: node.key ?? index,
        style: { zIndex: length - index },
      }),
    )

  // 超出 max：補一個 `+N` 頭像，置於尾端（z-index 最低，與其他頭像一致地往後疊）。
  if (length > max) {
    visible.push(
      h(BaseAvatar, { ...shared, style: { zIndex: 0 } }, () => `+${length - max}`),
    )
  }

  return h(Fragment, visible)
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseAvatarGroup — 頭像群組（重疊堆疊 + 溢出收斂）
 *
 * 用 :deep() 觸及插槽傳入的 .base-avatar（其帶的是呼叫端 scopeId，
 * 故不能用一般 scoped 選取，需 :deep 穿透）。外觀走 --avatar-group-* token。
 *
 *   .base-avatar-group { --avatar-group-overlap: 0.75rem; --avatar-group-ring: 2px solid #000; }
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 用 :where() 包起來（specificity 0），否則 scoped 會幫選擇器加上
 * [data-v-xxx]、specificity 高於使用端的覆寫 class，導致 token 改不動。
 * --avatar-group-overlap 為相鄰頭像的重疊量；數值越小、頭像距離拉得越開。
 */
:where(.base-avatar-group) {
  --avatar-group-overlap: 0.5rem;
  --avatar-group-ring: 2px solid #fff;
}

.base-avatar-group {
  display: inline-flex;
  align-items: center;

  :deep(.base-avatar) {
    position: relative;
    border: var(--avatar-group-ring);
  }

  // 後續頭像往左位移，形成重疊堆疊。
  :deep(.base-avatar + .base-avatar) {
    margin-left: calc(var(--avatar-group-overlap) * -1);
  }
}
</style>
