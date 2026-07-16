import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BaseScrollbar from '~/components/atoms/BaseScrollbar.vue'

// ── Helpers ────────────────────────────────────────────────────────────────────
//
// happy-dom 沒有真實版面，offsetHeight / scrollHeight 等幾何全為 0，overlay 捲軸
// 因此永遠不會出現。測試一律「手動在 viewport 元素上以 defineProperty 灌入幾何」，
// 再手動觸發 ResizeObserver callback → update()，讓 thumb 尺寸算出來、track 渲染
// （元件靠 ResizeObserver 觀察 viewport + content，happy-dom 不會真的派發 resize）。
//
// scrollTop / scrollLeft 改成可讀寫的儲存屬性，讓拖曳 / 點軌道的寫入能被讀回驗證。

/** 收集所有 ResizeObserver callback，讓測試能手動派發 resize 通知。 */
type ResizeCallback = (entries: Array<{ target: Element }>) => void

const resizeCallbacks = new Set<ResizeCallback>()

class ResizeObserverStub {
  private readonly callback: ResizeCallback

  constructor(callback: ResizeCallback) {
    this.callback = callback
    resizeCallbacks.add(callback)
  }

  observe() {}
  unobserve() {}

  disconnect() {
    resizeCallbacks.delete(this.callback)
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)

interface Geometry {
  offsetHeight?: number
  scrollHeight?: number
  offsetWidth?: number
  scrollWidth?: number
}

/** 在元素上灌入唯讀幾何 + 可讀寫的 scrollTop / scrollLeft。 */
function stubGeometry(el: HTMLElement, geo: Geometry) {
  for (const [key, value] of Object.entries(geo)) {
    Object.defineProperty(el, key, { configurable: true, get: () => value })
  }
  let scrollTop = 0
  let scrollLeft = 0
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (v: number) => { scrollTop = v },
  })
  Object.defineProperty(el, 'scrollLeft', {
    configurable: true,
    get: () => scrollLeft,
    set: (v: number) => { scrollLeft = v },
  })
}

/** 帶 clientX / clientY 的 PointerEvent（happy-dom 不自動帶座標；track / thumb 計算讀 viewport 座標）。 */
function pointerEvent(
  type: string,
  init: { clientX?: number; clientY?: number; button?: number; ctrlKey?: boolean } = {},
) {
  const ev = new PointerEvent(type, { bubbles: true, button: init.button ?? 0, ctrlKey: init.ctrlKey })
  Object.defineProperty(ev, 'clientX', { get: () => init.clientX ?? 0 })
  Object.defineProperty(ev, 'clientY', { get: () => init.clientY ?? 0 })
  return ev
}

/** 建立帶 deltaX / deltaY / deltaMode 的 WheelEvent，預設 cancelable 讓 preventDefault() 生效可被觀察。 */
function wheelEvent(
  init: { deltaX?: number; deltaY?: number; deltaMode?: number } = {},
) {
  return new WheelEvent('wheel', {
    bubbles: true,
    cancelable: true,
    deltaX: init.deltaX ?? 0,
    deltaY: init.deltaY ?? 0,
    deltaMode: init.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL,
  })
}

function mountScrollbar(props: { native?: boolean } = {}) {
  return mount(BaseScrollbar, {
    props,
    slots: { default: () => h('div', { class: 'content' }, 'long content') },
    attachTo: document.body,
  })
}

type Wrapper = ReturnType<typeof mountScrollbar>

const viewportOf = (w: Wrapper) =>
  w.find('.base-scrollbar__viewport').element as HTMLElement

/** 灌幾何後派發 resize 通知觸發 update()，讓 thumb 尺寸重算、track 渲染。 */
async function applyGeometry(w: Wrapper, geo: Geometry) {
  // useResizeObserver 走 flush: 'post' watch，先等一輪讓 observe 完成
  await nextTick()
  stubGeometry(viewportOf(w), geo)
  // 以 content 元素為 target 派發（模擬「內容尺寸變化」被 ResizeObserver 抓到）
  const content = w.find('.base-scrollbar__content').element
  for (const callback of resizeCallbacks) callback([{ target: content }])
  await nextTick()
  await nextTick()
}

const VERTICAL_OVERFLOW: Geometry = {
  offsetHeight: 100,
  scrollHeight: 400,
  offsetWidth: 100,
  scrollWidth: 100,
}

let active: Wrapper | null = null
const track = (w: Wrapper) => (active = w)

afterEach(() => {
  active?.unmount()
  active = null
})

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('BaseScrollbar', () => {
  // ── 基本渲染 ──────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders the default slot inside the viewport', () => {
      const w = track(mountScrollbar())
      const viewport = w.find('.base-scrollbar__viewport')
      expect(viewport.exists()).toBe(true)
      expect(viewport.find('.content').text()).toBe('long content')
    })

    it('gives the viewport an id so aria-controls can target it', () => {
      const w = track(mountScrollbar())
      expect(viewportOf(w).id).toBeTruthy()
    })

    it('does not render any overlay track before content overflows', () => {
      const w = track(mountScrollbar())
      expect(w.find('.base-scrollbar__track').exists()).toBe(false)
    })
  })

  // ── native 模式 ───────────────────────────────────────────────────────────────
  describe('native mode', () => {
    it('adds the --native modifier class', () => {
      const w = track(mountScrollbar({ native: true }))
      expect(w.classes()).toContain('base-scrollbar--native')
    })

    it('never renders overlay tracks even when content overflows', async () => {
      const w = track(mountScrollbar({ native: true }))
      await applyGeometry(w, VERTICAL_OVERFLOW)
      expect(w.find('.base-scrollbar__track').exists()).toBe(false)
    })
  })

  // ── overlay 出現條件 ──────────────────────────────────────────────────────────
  describe('overlay tracks', () => {
    it('renders a vertical scrollbar when content overflows vertically', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const vertical = w.find('.base-scrollbar__track--vertical')
      expect(vertical.exists()).toBe(true)
      expect(vertical.attributes('role')).toBe('scrollbar')
      expect(vertical.attributes('aria-orientation')).toBe('vertical')
      // 水平方向沒溢出 → 不渲染水平軌道
      expect(w.find('.base-scrollbar__track--horizontal').exists()).toBe(false)
    })

    it('renders a horizontal scrollbar when content overflows horizontally', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, {
        offsetHeight: 100,
        scrollHeight: 100,
        offsetWidth: 100,
        scrollWidth: 400,
      })

      const horizontal = w.find('.base-scrollbar__track--horizontal')
      expect(horizontal.exists()).toBe(true)
      expect(horizontal.attributes('aria-orientation')).toBe('horizontal')
      expect(w.find('.base-scrollbar__track--vertical').exists()).toBe(false)
    })

    it('renders both tracks and flags --both when content overflows on both axes', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, {
        offsetHeight: 100,
        scrollHeight: 400,
        offsetWidth: 100,
        scrollWidth: 400,
      })

      expect(w.find('.base-scrollbar__track--vertical').exists()).toBe(true)
      expect(w.find('.base-scrollbar__track--horizontal').exists()).toBe(true)
      // --both modifier 讓兩條 track 各自讓出對方寬度，避免右下角重疊
      expect(w.classes()).toContain('base-scrollbar--both')
    })

    it('does not render a track when content fits without overflow', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, {
        offsetHeight: 100,
        scrollHeight: 100,
        offsetWidth: 100,
        scrollWidth: 100,
      })
      expect(w.find('.base-scrollbar__track').exists()).toBe(false)
    })

    it('points the scrollbar aria-controls at the viewport id', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)
      expect(w.find('.base-scrollbar__track--vertical').attributes('aria-controls'))
        .toBe(viewportOf(w).id)
    })

    it('exposes the scroll progress through aria-valuenow', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const vertical = () => w.find('.base-scrollbar__track--vertical')
      expect(vertical().attributes('aria-valuenow')).toBe('0')

      // 捲到一半：scrollTop 150 / (scrollHeight 400 - offsetHeight 100) = 0.5 → 50
      const viewport = viewportOf(w)
      viewport.scrollTop = 150
      await w.find('.base-scrollbar__viewport').trigger('scroll')
      expect(vertical().attributes('aria-valuenow')).toBe('50')
    })
  })

  // ── 拖曳 thumb ────────────────────────────────────────────────────────────────
  describe('thumb dragging', () => {
    it('scrolls the viewport when the thumb is dragged', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const thumb = w.find('.base-scrollbar__track--vertical .base-scrollbar__thumb').element as HTMLElement
      const viewport = viewportOf(w)

      thumb.dispatchEvent(pointerEvent('pointerdown', { clientY:0 }))
      // 指標下移 48px：offset = 48 / (offsetHeight 100 - GAP 4) = 0.5 → scrollTop = 0.5 * 400 = 200
      document.dispatchEvent(pointerEvent('pointermove', { clientY:48 }))
      expect(viewport.scrollTop).toBe(200)

      document.dispatchEvent(pointerEvent('pointerup'))
    })

    it('ignores non-primary button / ctrl+click on the thumb', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const thumb = w.find('.base-scrollbar__track--vertical .base-scrollbar__thumb').element as HTMLElement
      const viewport = viewportOf(w)

      thumb.dispatchEvent(pointerEvent('pointerdown', { clientY:0, button: 2 }))
      document.dispatchEvent(pointerEvent('pointermove', { clientY:48 }))
      // 右鍵按下不啟動拖曳 → scrollTop 不變
      expect(viewport.scrollTop).toBe(0)
    })
  })

  // ── 自動隱藏 ──────────────────────────────────────────────────────────────────
  describe('auto-hide', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    it('shows on scroll then hides the track after the idle delay', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const thumbTrack = () => w.find('.base-scrollbar__track--vertical').element as HTMLElement

      await w.find('.base-scrollbar__viewport').trigger('scroll')
      // active=true → v-show 顯示（display 非 none）
      expect(thumbTrack().style.display).not.toBe('none')

      vi.advanceTimersByTime(1000)
      await nextTick()
      // 閒置 1s 後自動隱藏
      expect(thumbTrack().style.display).toBe('none')
    })
  })

  // ── track 點擊 / 退化幾何 guard ────────────────────────────────────────────────
  describe('track interaction & ratio guard', () => {
    it('點擊軌道空白處捲向點擊位置（thumb 經 firstElementChild 取得）', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const thumbEl = w.find('.base-scrollbar__track--vertical .base-scrollbar__thumb').element as HTMLElement
      const viewport = viewportOf(w)

      // 灌入 track / thumb 幾何，讓點擊換算具確定性（happy-dom 預設皆為 0）。
      Object.defineProperty(trackEl, 'offsetHeight', { configurable: true, get: () => 100 })
      Object.defineProperty(thumbEl, 'offsetHeight', { configurable: true, get: () => 20 })
      trackEl.getBoundingClientRect = () =>
        ({ top: 0, left: 0, right: 0, bottom: 100, width: 0, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

      trackEl.dispatchEvent(pointerEvent('pointerdown', { clientY:50 }))
      // position = |0 - 50| = 50；thumbHalf = 20/2 = 10
      // scrollTop = (50 - 10) * (scrollHeight 400 / track 100) = 40 * 4 = 160
      expect(viewport.scrollTop).toBe(160)
    })

    it('退化幾何（分母趨近 0）不渲染軌道，且捲動不拋錯（ratio guard）', async () => {
      const w = track(mountScrollbar())
      // offsetHeight 扣 GAP 後 ≈ originalHeight，分母趨近 0 → 無 guard 會算出 Infinity/NaN
      await applyGeometry(w, { offsetHeight: 24, scrollHeight: 20, offsetWidth: 24, scrollWidth: 20 })

      expect(w.find('.base-scrollbar__track').exists()).toBe(false)
      expect(() => w.find('.base-scrollbar__viewport').trigger('scroll')).not.toThrow()
    })
  })

  // ── track 覆蓋區滾輪死角（track 浮在 viewport 之上，滾輪需手動轉發）───────────
  describe('wheel over track forwards scroll to viewport', () => {
    it('vertical track 滾輪把 deltaY 轉發給 viewport.scrollTop 並吃掉事件', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const viewport = viewportOf(w)

      const ev = wheelEvent({ deltaY: 50 })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollTop).toBe(50)
      expect(ev.defaultPrevented).toBe(true)
    })

    it('vertical track 已捲到底時再往下滾，不 preventDefault（讓事件冒泡給頁面）', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const viewport = viewportOf(w)
      // max scrollTop = scrollHeight 400 - offsetHeight 100 = 300
      viewport.scrollTop = 300

      const ev = wheelEvent({ deltaY: 50 })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollTop).toBe(300)
      expect(ev.defaultPrevented).toBe(false)
    })

    it('vertical track 已捲到頂時再往上滾，不 preventDefault', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const viewport = viewportOf(w)

      const ev = wheelEvent({ deltaY: -50 })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollTop).toBe(0)
      expect(ev.defaultPrevented).toBe(false)
    })

    it('horizontal track 滾輪優先吃 deltaX', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, { offsetHeight: 100, scrollHeight: 100, offsetWidth: 100, scrollWidth: 400 })

      const trackEl = w.find('.base-scrollbar__track--horizontal').element as HTMLElement
      const viewport = viewportOf(w)

      const ev = wheelEvent({ deltaX: 30, deltaY: 999 })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollLeft).toBe(30)
      expect(ev.defaultPrevented).toBe(true)
    })

    it('horizontal track 滾輪 deltaX 為 0 時，把 deltaY 轉為橫向捲動（常見滑鼠只有縱向滾輪）', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, { offsetHeight: 100, scrollHeight: 100, offsetWidth: 100, scrollWidth: 400 })

      const trackEl = w.find('.base-scrollbar__track--horizontal').element as HTMLElement
      const viewport = viewportOf(w)

      const ev = wheelEvent({ deltaX: 0, deltaY: 40 })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollLeft).toBe(40)
      expect(ev.defaultPrevented).toBe(true)
    })

    it('deltaMode 為 line 時換算成 px（約 16px / 行）', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const viewport = viewportOf(w)

      const ev = wheelEvent({ deltaY: 2, deltaMode: WheelEvent.DOM_DELTA_LINE })
      trackEl.dispatchEvent(ev)

      expect(viewport.scrollTop).toBe(32)
      expect(ev.defaultPrevented).toBe(true)
    })
  })

  // ── 卸載清理（補洩漏點）───────────────────────────────────────────────────────
  describe('cleanup on unmount', () => {
    it('removes document drag listeners on unmount', () => {
      const remove = vi.spyOn(document, 'removeEventListener')
      const w = mountScrollbar()
      w.unmount()
      expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function))
      expect(remove).toHaveBeenCalledWith('pointerup', expect.any(Function))
      remove.mockRestore()
    })
  })

  // ── track 點擊使用 viewport 座標 (C1-2 regression) ────────────────────────────
  // 過去用 event.pageY（document 座標）減 rect.top（viewport 座標），頁面捲動後產生
  // 等同捲動量的固定偏移。修正後改用 clientY（與 getBoundingClientRect 同座標系）。
  describe('track click uses viewport coordinates (C1-2 regression)', () => {
    it('track 頂端有 offset 時以 clientY - rect.top 計算', async () => {
      const w = track(mountScrollbar())
      await applyGeometry(w, VERTICAL_OVERFLOW)

      const trackEl = w.find('.base-scrollbar__track--vertical').element as HTMLElement
      const thumbEl = w.find('.base-scrollbar__track--vertical .base-scrollbar__thumb').element as HTMLElement
      const viewport = viewportOf(w)

      Object.defineProperty(trackEl, 'offsetHeight', { configurable: true, get: () => 100 })
      Object.defineProperty(thumbEl, 'offsetHeight', { configurable: true, get: () => 20 })
      // track 在 viewport 中 top=30（版面偏移 / 頁面捲動）
      trackEl.getBoundingClientRect = () =>
        ({ top: 30, left: 0, right: 0, bottom: 130, width: 0, height: 100, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect

      // 點擊 viewport 座標 clientY=80 → position = |30 - 80| = 50
      trackEl.dispatchEvent(pointerEvent('pointerdown', { clientY: 80 }))
      // scrollTop = (50 - 10) * (scrollHeight 400 / track 100) = 40 * 4 = 160
      expect(viewport.scrollTop).toBe(160)
    })
  })
})

describe('BaseScrollbar — native 切換與鍵盤可及性', () => {
  function mockViewportSize(viewport: HTMLElement) {
    Object.defineProperty(viewport, 'offsetHeight', { value: 200, configurable: true })
    Object.defineProperty(viewport, 'scrollHeight', { value: 800, configurable: true })
    Object.defineProperty(viewport, 'offsetWidth', { value: 200, configurable: true })
    Object.defineProperty(viewport, 'scrollWidth', { value: 200, configurable: true })
  }

  it('執行期 native true→false 會重算 thumb（垂直軌道出現，而非停在 0）', async () => {
    const w = mount(BaseScrollbar, {
      props: { native: true },
      slots: { default: () => h('div', { style: 'height: 800px' }, 'content') },
      attachTo: document.body,
    })
    mockViewportSize(w.find('.base-scrollbar__viewport').element as HTMLElement)

    await w.setProps({ native: false })
    await nextTick()
    expect(w.find('.base-scrollbar__track--vertical').exists()).toBe(true)
    w.unmount()
  })

  it('viewport 可被鍵盤聚焦（tabindex=0）——原生捲軸被隱藏後鍵盤仍能捲動', () => {
    const w = mount(BaseScrollbar, {
      slots: { default: () => h('div', 'content') },
    })
    expect(w.find('.base-scrollbar__viewport').attributes('tabindex')).toBe('0')
    w.unmount()
  })
})
