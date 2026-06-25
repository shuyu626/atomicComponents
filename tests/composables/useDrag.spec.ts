import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import type { Ref } from 'vue'

import useDrag from '~/composables/useDrag'

// ── Helpers ──────────────────────────────────────────────────────────────────

type DragApi = ReturnType<typeof useDrag>

interface SetupOptions {
  enabled?: boolean
  target?: () => HTMLElement | null
  boundary?: boolean
}

/** 在元件 setup 內呼叫 useDrag（composable 需活躍的元件實例才能掛生命週期）。 */
function setup(options: SetupOptions = {}) {
  let api!: DragApi
  const wrapper = mount(
    defineComponent({
      setup() {
        api = useDrag(() => options.enabled ?? true, {
          target: options.target,
          boundary: () => options.boundary ?? true,
        })
        return () => h('div')
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, api }
}

/** 模擬一次 pointerdown → 觸發 onDragStart。 */
function pointerDown(api: DragApi, x: number, y: number) {
  const target = document.createElement('div')
  api.onDragStart(
    new MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }) as PointerEvent,
  )
  return target
}

function pointerMove(x: number, y: number) {
  window.dispatchEvent(new MouseEvent('pointermove', { clientX: x, clientY: y }))
}

function pointerUp() {
  window.dispatchEvent(new MouseEvent('pointerup', {}))
}

let active: ReturnType<typeof setup> | null = null
function track(s: ReturnType<typeof setup>) {
  active = s
  return s
}

beforeEach(() => {
  // 固定視窗尺寸，讓邊界 clamp 測試可預期。
  Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true })
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true })
})

afterEach(() => {
  active?.wrapper.unmount()
  active = null
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useDrag', () => {
  it('starts with zero translate and not dragging', () => {
    const { api } = track(setup())
    expect(api.translate.value).toEqual({ x: 0, y: 0 })
    expect(api.isDragging.value).toBe(false)
  })

  it('translates by the pointer delta while dragging', async () => {
    const { api } = track(setup())
    pointerDown(api, 100, 100)
    expect(api.isDragging.value).toBe(true)

    pointerMove(140, 130)
    await nextTick()
    expect(api.translate.value).toEqual({ x: 40, y: 30 })
  })

  it('accumulates translate across multiple drags', async () => {
    const { api } = track(setup())
    pointerDown(api, 0, 0)
    pointerMove(20, 10)
    pointerUp()
    await nextTick()
    expect(api.translate.value).toEqual({ x: 20, y: 10 })

    // 第二次拖曳從目前位移繼續累加。
    pointerDown(api, 0, 0)
    pointerMove(5, 5)
    await nextTick()
    expect(api.translate.value).toEqual({ x: 25, y: 15 })
  })

  it('stops dragging and ignores further moves after pointerup', async () => {
    const { api } = track(setup())
    pointerDown(api, 0, 0)
    pointerMove(10, 10)
    pointerUp()
    expect(api.isDragging.value).toBe(false)

    pointerMove(999, 999)
    await nextTick()
    expect(api.translate.value).toEqual({ x: 10, y: 10 })
  })

  it('does nothing when disabled', async () => {
    const { api } = track(setup({ enabled: false }))
    pointerDown(api, 0, 0)
    expect(api.isDragging.value).toBe(false)
    pointerMove(50, 50)
    await nextTick()
    expect(api.translate.value).toEqual({ x: 0, y: 0 })
  })

  it('reset() returns translate to origin', async () => {
    const { api } = track(setup())
    pointerDown(api, 0, 0)
    pointerMove(30, 40)
    pointerUp()
    api.reset()
    await nextTick()
    expect(api.translate.value).toEqual({ x: 0, y: 0 })
  })

  it('clamps translate so the target stays within the viewport', async () => {
    const el = document.createElement('div')
    document.body.appendChild(el)

    const { api } = track(setup({ target: () => el }))
    // 元件零位移時位於 (left:400, top:300)、寬 200 高 100；
    // rect 隨已套用的 transform 平移（模擬真實 getBoundingClientRect 行為）。
    el.getBoundingClientRect = () => {
      const left = 400 + api.translate.value.x
      const top = 300 + api.translate.value.y
      return { left, top, width: 200, height: 100, right: left + 200, bottom: top + 100 } as DOMRect
    }

    pointerDown(api, 0, 0)

    // 想往右拖 9999：元件右緣 600 + tx ≤ 1000 → tx ≤ 400。
    pointerMove(9999, 0)
    await nextTick()
    expect(api.translate.value.x).toBe(400)

    // 想往左拖 -9999：元件左緣 400 + tx ≥ 0 → tx ≥ -400。
    pointerMove(-9999, 0)
    await nextTick()
    expect(api.translate.value.x).toBe(-400)

    document.body.removeChild(el)
  })

  it('removes window listeners on unmount (no leak)', async () => {
    const { wrapper, api } = track(setup())
    pointerDown(api, 0, 0)
    wrapper.unmount()
    active = null

    // 卸載後再丟事件不應再改動（且不報錯）。
    const before = { ...api.translate.value }
    pointerMove(123, 456)
    await nextTick()
    expect(api.translate.value).toEqual(before)
  })
})

// 型別煙霧測試：translate / isDragging 為 Ref。
function _typeSmoke(api: DragApi) {
  const _t: Ref<{ x: number, y: number }> = api.translate
  const _d: Ref<boolean> = api.isDragging
  return [_t, _d]
}
