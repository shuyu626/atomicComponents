<template>
  <a
    v-if="isExternal"
    :href="href"
    :target="target"
    :rel="rel"
  >
    <slot />
  </a>
  <component
    v-else-if="hasNuxtLink"
    :is="NuxtLinkComp"
    :to="linkTo"
    :target="target"
    :rel="rel"
  >
    <slot />
  </component>
  <RouterLink
    v-else
    :ref="resolveRef"
    :to="linkTo"
    :target="target"
    :rel="rel"
  >
    <slot />
  </RouterLink>
</template>

<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  resolveComponent,
  shallowRef,
} from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'
import { hasProtocol } from 'ufo'

import createIntersectionObserver from '~/utils/createIntersectionObserver'
import preloadRouterLinkComponents from '~/utils/preloadRouterLinkComponents'

// ── Module-level helpers ─────────────────────────────────
//
// 不依賴 props / refs，提到 module 層級避免每個 BaseLink 實例都重建一份
// （列表頁 100+ link 場景下省一點點開銷，更重要的是邏輯與元件實例解耦）。

/**
 * 排程一個 idle callback，回傳可被 `cancelIdle` 取消的 id。
 *   - 優先用 `requestIdleCallback`（Chrome、Firefox、Safari 15.4+）
 *   - 舊 Safari 等沒此 API 的環境 fallback 到 `setTimeout(_, 200)`
 *     （200ms：避開 first paint 競爭，貼近 idle 精神）
 *   - SSR (`typeof window === 'undefined'`) return 0，搭配 `cancelIdle` 內部 guard
 */
function scheduleIdle(cb: () => void): number {
  if (typeof window === 'undefined') return 0
  return typeof window.requestIdleCallback === 'function'
    ? window.requestIdleCallback(cb)
    : window.setTimeout(cb, 200)
}

function cancelIdle(id: number): void {
  if (typeof window === 'undefined') return
  const cancel = typeof window.cancelIdleCallback === 'function'
    ? window.cancelIdleCallback.bind(window)
    : window.clearTimeout.bind(window)
  cancel(id)
}

// ── Props ────────────────────────────────────────────────

export interface BaseLinkProps {
  /** 路由位置（內部）或 URL 字串（外部） @default '' */
  to?: RouteLocationRaw
  /** 連結開啟目標，`_blank` 自動附加 `rel="noopener noreferrer"` */
  target?: '_blank' | '_parent' | '_self' | '_top'
  /** 強制視為外部連結（即使 `to` 是相對路徑） @default false */
  external?: boolean
}

const props = withDefaults(defineProps<BaseLinkProps>(), {
  to: '',
  target: undefined,
  external: false,
})

defineSlots<{
  default(props: Record<string, never>): unknown
}>()

// ── Component setup ──────────────────────────────────────

const router = useRouter()
const linkRef = shallowRef<Element>()

/**
 * 連結元件 fallback chain（在元件 mount 時一次決定）：
 *   1. NuxtLink — Nuxt 環境（含 Storybook stub），享自動 prefetch / SSR
 *   2. RouterLink — 純 Vite + vue-router SPA（preload 由本元件補強）
 *   3. <a> — 外部連結 / 無 router 環境
 *
 * resolveComponent 找不到時會回傳「元件名稱字串」而非 component，須用 typeof 檢查。
 */
const NuxtLinkComp = resolveComponent('NuxtLink')
const hasNuxtLink = typeof NuxtLinkComp !== 'string'

/**
 * 收斂 `to` 型別為 `RouteLocationRaw` 後給 NuxtLink / RouterLink 使用。
 *
 * 為什麼需要：`BaseLinkProps.to?: RouteLocationRaw` 是 optional，
 * 即使 `withDefaults` 給了預設 `''`，TS 在 template 內仍可能殘留 undefined 推導
 * （Volar 的嚴格度因版本而異），而 RouterLink 的 `to` 不接受 undefined。
 * 用 computed 一次性收斂,template 端不再需要 inline cast。
 */
const linkTo = computed<RouteLocationRaw>(() => props.to ?? '')

/** 給 <a> 用的 href：to 是 object 時透過 router.resolve 取出字串 */
const href = computed<string | undefined>(() => {
  if (typeof props.to === 'object') {
    // router 可能在無 router context 環境（測試 / 非 router app）為 undefined，
    // 用 optional chaining 防禦避免 crash —— 取不到時回 undefined 讓 <a> 不渲染 href
    return router?.resolve(props.to).href || undefined
  }
  return props.to || undefined
})

/**
 * 外部連結判斷優先序：
 *   1. external prop 顯式
 *   2. target 非 _self（_blank / _parent / _top）
 *   3. to 是 route object → 一律內部
 *   4. to 為空字串 或 含 protocol（http://、mailto:、相對 protocol //）
 */
const isExternal = computed<boolean>(() => {
  if (props.external) return true
  if (props.target && props.target !== '_self') return true
  if (typeof props.to === 'object') return false
  return props.to === '' || hasProtocol(props.to, { acceptRelative: true })
})

const rel = computed<string | undefined>(() =>
  props.target === '_blank' ? 'noopener noreferrer' : undefined,
)

// ── RouterLink 路徑的 viewport-based preload 補強 ────────────────
//
// 流程（為什麼這樣設計）：
//
//   onMounted
//     │
//     ├─ hasNuxtLink? ─Y─→ return（NuxtLink 已內建 prefetch，不重複實作）
//     │
//     ↓
//   scheduleIdle（瀏覽器 idle 才執行，避免阻塞 LCP / TTI）
//     │  ├─ 舊 Safari 沒 requestIdleCallback → fallback setTimeout(_, 200)
//     │  └─ SSR → typeof window guard，schedule 回傳 0 不執行
//     ↓
//   雙重檢查：linkRef 已 unmount？isExternal 中途變更？→ 跳過
//     ↓
//   createIntersectionObserver().observe(linkRef)
//     │  └─ helper 內含 SSR / 舊瀏覽器 no-op fallback
//     ↓
//   link 進入 viewport
//     ↓
//   unobserve（preload 只跑一次）
//     ↓
//   preloadRouterLinkComponents(async)
//     │  ├─ 路由級 dedup（同 path 在 router 實例生命週期只 preload 一次）
//     │  ├─ 失敗吞錯 + dev warn（內聚在 helper，呼叫端不需處理）
//     │  └─ 失敗時 path 從 cache 移除，下次仍可重試
//
//   onBeforeUnmount
//     ├─ cancelIdleCallback（若 idle 尚未 fire）
//     └─ unobserve（若 observer 已建立但 link 尚未進 viewport）

function resolveRef(instance: unknown): void {
  linkRef.value = (instance as ComponentPublicInstance | null)?.$el
}

let idleId: number | undefined
let unobserve: (() => void) | null = null

onMounted(() => {
  // Nuxt 環境：NuxtLink 已內建 prefetch，自家 preload 跳過
  if (hasNuxtLink) return

  idleId = scheduleIdle(() => {
    // idle 後再次檢查：元件可能已 unmount、props.to 可能已變成外部 URL
    if (!linkRef.value || isExternal.value) return

    const io = createIntersectionObserver()
    unobserve = io.observe(linkRef.value, () => {
      // 進入 viewport：立即 unobserve，preload 只觸發一次
      unobserve?.()
      unobserve = null
      // async preload：錯誤吞掉與 dev warn 已內聚在 helper 內，呼叫端不需再處理
      preloadRouterLinkComponents(props.to, router)
    })
  })
})

onBeforeUnmount(() => {
  // 取消尚未 fire 的 idle callback
  if (idleId !== undefined) cancelIdle(idleId)

  // observer 已建但 link 尚未進 viewport 的情況：unobserve 清理
  unobserve?.()
  unobserve = null
})
</script>
