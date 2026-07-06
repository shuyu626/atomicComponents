import { describe, it, expect, afterEach, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Ref } from 'vue'

import { useOverlayLifecycle } from '~/composables/useOverlayLifecycle'
import type {
  OverlayBeforeClose,
  UseOverlayLifecycleReturn,
} from '~/composables/useOverlayLifecycle'

// ── Helpers ──────────────────────────────────────────────────────────────────

interface SetupOptions {
  /** 掛載當下的初始開關狀態。 @default false */
  initialOpen?: boolean
  /** 關閉前攔截（getter 每次取即時值，模擬 props.beforeClose）。 */
  beforeClose?: OverlayBeforeClose
}

interface SetupResult {
  wrapper: ReturnType<typeof mount>
  open: Ref<boolean>
  /** 依發生順序記錄的生命週期事件（'open' / 'close'），對應元件的 emit。 */
  events: string[]
  api: UseOverlayLifecycleReturn
}

/** 在元件 setup 內呼叫 useOverlayLifecycle（watch / onMounted 需活躍的元件實例）。 */
function setup(options: SetupOptions = {}): SetupResult {
  const open = ref(options.initialOpen ?? false)
  const events: string[] = []
  let api!: UseOverlayLifecycleReturn

  const wrapper = mount(
    defineComponent({
      setup() {
        api = useOverlayLifecycle(open, {
          beforeClose: () => options.beforeClose,
          emitOpen: () => events.push('open'),
          emitClose: () => events.push('close'),
        })
        return () => h('div')
      },
    }),
  )

  return { wrapper, open, events, api }
}

let active: SetupResult | null = null

function track(s: SetupResult): SetupResult {
  active = s
  return s
}

afterEach(() => {
  active?.wrapper.unmount()
  active = null
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useOverlayLifecycle', () => {
  // ── 生命週期 emit ────────────────────────────────────────────────────────────
  describe('open / close lifecycle emits', () => {
    it('emits open then close in order as the model toggles', async () => {
      const { open, events } = track(setup())
      expect(events).toEqual([])

      open.value = true
      await nextTick()
      expect(events).toEqual(['open'])

      open.value = false
      await nextTick()
      expect(events).toEqual(['open', 'close'])
    })

    it('guardedOpen mirrors the model and opening never intercepts', async () => {
      const beforeClose = vi.fn()
      const { open, api, events } = track(setup({ beforeClose }))

      api.guardedOpen.value = true
      await nextTick()
      expect(open.value).toBe(true)
      expect(api.guardedOpen.value).toBe(true)
      expect(beforeClose).not.toHaveBeenCalled() // 開啟方向不攔截
      expect(events).toEqual(['open'])
    })

    // 掛載時即為開啟者 watch 不會觸發 → onMounted 補發 open，
    // 修正 <Transition appear> 只發 opened 的不對稱。
    it('emits an initial open on mount when already open', () => {
      const { events } = track(setup({ initialOpen: true }))
      expect(events).toEqual(['open'])
    })

    it('does not emit anything on mount when initially closed', () => {
      const { events } = track(setup())
      expect(events).toEqual([])
    })
  })

  // ── beforeClose 攔截 ─────────────────────────────────────────────────────────
  describe('beforeClose interception', () => {
    it('close() without beforeClose closes immediately', async () => {
      const { open, api, events } = track(setup({ initialOpen: true }))

      api.close()
      await nextTick()
      expect(open.value).toBe(false)
      expect(events).toEqual(['open', 'close'])
    })

    it('intercepts closing until done() is invoked', async () => {
      // done 不呼叫 → 維持開啟、不發 close。
      let done!: () => void
      const beforeClose = vi.fn((d: () => void) => { done = d })
      const { open, api, events } = track(setup({ initialOpen: true, beforeClose }))

      api.guardedOpen.value = false
      await nextTick()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(open.value).toBe(true)
      expect(events).toEqual(['open'])

      // 之後呼叫 done() 才真正關閉。
      done()
      await nextTick()
      expect(open.value).toBe(false)
      expect(events).toEqual(['open', 'close'])
    })

    it('supports async beforeClose (done resolved in a Promise)', async () => {
      let resolve!: () => void
      const gate = new Promise<void>((r) => { resolve = r })
      const beforeClose: OverlayBeforeClose = (done) => {
        void gate.then(done)
      }
      const { open, api, events } = track(setup({ initialOpen: true, beforeClose }))

      api.close()
      await nextTick()
      expect(open.value).toBe(true) // Promise 未 resolve → 攔截中

      resolve()
      await gate
      await nextTick()
      expect(open.value).toBe(false)
      expect(events).toEqual(['open', 'close'])
    })

    // 父層透過 v-model 直接改值屬於程式化關閉：不過 beforeClose，但生命週期照發。
    it('does not intercept programmatic close via the model ref', async () => {
      const beforeClose = vi.fn()
      const { open, events } = track(setup({ initialOpen: true, beforeClose }))

      open.value = false
      await nextTick()
      expect(beforeClose).not.toHaveBeenCalled()
      expect(open.value).toBe(false)
      expect(events).toEqual(['open', 'close'])
    })
  })
})
