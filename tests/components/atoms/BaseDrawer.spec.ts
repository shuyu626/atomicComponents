import { describe, it, expect, vi, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BaseDrawer from '~/components/atoms/BaseDrawer.vue'

// ── Mock focus-trap ─────────────────────────────────────────────────────────
//
// BaseDrawer 透過 useOverlay 啟用 focus-trap。focus-trap 依賴真實瀏覽器焦點 /
// tabbable 計算，在 happy-dom 下不穩定且非本元件職責。以 stub 取代 createFocusTrap，
// 讓測試聚焦在 BaseDrawer 自身行為（anchor / size / a11y / slots / 關閉）。
vi.mock('focus-trap', () => ({
  createFocusTrap: () => ({
    activate: vi.fn(),
    deactivate: vi.fn(),
  }),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────
//
// Teleport stub：把 teleport 內容渲染在原地，wrapper.find 才能查到面板。
// attachTo body：讓 panel 進入 document，符合 overlay 真實掛載情境。
function createWrapper(
  props: Record<string, unknown> = {},
  slots: Record<string, string> = {},
) {
  return mount(BaseDrawer, {
    props: { modelValue: true, ...props },
    slots,
    attachTo: document.body,
    global: { stubs: { teleport: true } },
  })
}

const wrappers: ReturnType<typeof mount>[] = []
function track<T extends ReturnType<typeof mount>>(wrapper: T): T {
  wrappers.push(wrapper)
  return wrapper
}

// 每個測試後卸載：清掉共用的 popups 單例堆疊與 focus-trap，避免測試互相污染。
afterEach(() => {
  while (wrappers.length) wrappers.pop()?.unmount()
})

describe('BaseDrawer', () => {
  // ── Open / close rendering ────────────────────────────────────────────────
  describe('rendering', () => {
    it('does NOT render the panel when modelValue is false', () => {
      const wrapper = track(createWrapper({ modelValue: false }))
      expect(wrapper.find('.base-drawer').exists()).toBe(false)
    })

    it('renders the panel when modelValue is true', () => {
      const wrapper = track(createWrapper({ modelValue: true }))
      expect(wrapper.find('.base-drawer').exists()).toBe(true)
      expect(wrapper.find('.base-drawer__panel').exists()).toBe(true)
    })
  })

  // ── Anchor ────────────────────────────────────────────────────────────────
  describe('anchor', () => {
    it('defaults to the right anchor', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer').classes()).toContain('base-drawer--right')
    })

    it.each(['top', 'right', 'bottom', 'left'] as const)(
      'applies base-drawer--%s for anchor="%s"',
      (anchor) => {
        const wrapper = track(createWrapper({ anchor }))
        expect(wrapper.find('.base-drawer').classes()).toContain(`base-drawer--${anchor}`)
      },
    )
  })

  // ── Size ──────────────────────────────────────────────────────────────────
  describe('size', () => {
    it('defaults to 320px on --drawer-size', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer').attributes('style')).toContain('--drawer-size: 320px')
    })

    it('appends px to a numeric size', () => {
      const wrapper = track(createWrapper({ size: 480 }))
      expect(wrapper.find('.base-drawer').attributes('style')).toContain('--drawer-size: 480px')
    })

    it('passes a string size through unchanged', () => {
      const wrapper = track(createWrapper({ size: '50%' }))
      expect(wrapper.find('.base-drawer').attributes('style')).toContain('--drawer-size: 50%')
    })
  })

  // ── Title & a11y ──────────────────────────────────────────────────────────
  describe('title & accessibility', () => {
    it('renders the title text', () => {
      const wrapper = track(createWrapper({ title: '設定' }))
      expect(wrapper.find('.base-drawer__title').text()).toBe('設定')
    })

    it('marks the panel as role=dialog with aria-modal', () => {
      const wrapper = track(createWrapper({ title: '設定' }))
      const panel = wrapper.find('.base-drawer__panel')
      expect(panel.attributes('role')).toBe('dialog')
      expect(panel.attributes('aria-modal')).toBe('true')
    })

    it('links the panel to the title via aria-labelledby', () => {
      const wrapper = track(createWrapper({ title: '設定' }))
      const panel = wrapper.find('.base-drawer__panel')
      const titleId = wrapper.find('.base-drawer__title').attributes('id')
      expect(titleId).toBeTruthy()
      expect(panel.attributes('aria-labelledby')).toBe(titleId)
      expect(panel.attributes('aria-label')).toBeUndefined()
    })

    it('falls back to aria-label when there is no title', () => {
      const wrapper = track(createWrapper({ ariaLabel: '側邊面板' }))
      const panel = wrapper.find('.base-drawer__panel')
      expect(panel.attributes('aria-label')).toBe('側邊面板')
      expect(panel.attributes('aria-labelledby')).toBeUndefined()
    })
  })

  // ── Close button ──────────────────────────────────────────────────────────
  describe('close button', () => {
    it('renders a close button by default', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer__close').exists()).toBe(true)
    })

    it('hides the close button when hideCloseButton is true', () => {
      const wrapper = track(createWrapper({ hideCloseButton: true }))
      expect(wrapper.find('.base-drawer__close').exists()).toBe(false)
    })

    it('defaults the close button aria-label to 關閉', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer__close').attributes('aria-label')).toBe('關閉')
    })

    it('overrides the close button aria-label via closeLabel', () => {
      const wrapper = track(createWrapper({ closeLabel: 'Close' }))
      expect(wrapper.find('.base-drawer__close').attributes('aria-label')).toBe('Close')
    })

    it('emits update:modelValue=false when the close button is clicked', async () => {
      const wrapper = track(createWrapper())
      await wrapper.find('.base-drawer__close').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })
  })

  // ── Backdrop ──────────────────────────────────────────────────────────────
  describe('backdrop', () => {
    it('renders a backdrop by default', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer__backdrop').exists()).toBe(true)
    })

    it('hides the backdrop when hideBackdrop is true', () => {
      const wrapper = track(createWrapper({ hideBackdrop: true }))
      expect(wrapper.find('.base-drawer__backdrop').exists()).toBe(false)
    })
  })

  // ── Closing behavior (wired through useOverlay) ───────────────────────────
  describe('closing behavior', () => {
    it('closes on Escape when it is the top overlay', async () => {
      const wrapper = track(createWrapper())
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does NOT close on Escape when closeOnEscape is false', async () => {
      const wrapper = track(createWrapper({ closeOnEscape: false }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('closes when pressing then releasing on the backdrop area', async () => {
      const wrapper = track(createWrapper())
      const overlay = wrapper.find('.base-drawer')
      // mousedown 起始於面板外 → click 放開也在外 → 視為點擊外部關閉。
      await overlay.trigger('mousedown')
      await overlay.trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('does NOT close on backdrop click when closeOnBackdrop is false', async () => {
      const wrapper = track(createWrapper({ closeOnBackdrop: false }))
      const overlay = wrapper.find('.base-drawer')
      await overlay.trigger('mousedown')
      await overlay.trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('does NOT close when the press starts inside the panel (drag-select guard)', async () => {
      const wrapper = track(createWrapper())
      // 起始於面板內（mousedown 在 panel），放開到外部 → 不該誤關。
      await wrapper.find('.base-drawer__panel').trigger('mousedown')
      await wrapper.find('.base-drawer').trigger('click')
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  // ── Slots ─────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders default slot content in the body', () => {
      const wrapper = track(createWrapper({}, { default: '<p class="content">內容</p>' }))
      expect(wrapper.find('.base-drawer__body .content').exists()).toBe(true)
    })

    it('exposes close() to the default slot', async () => {
      const wrapper = track(
        createWrapper({}, { default: '<button class="inner-close" @click="close">X</button>' }),
      )
      await wrapper.find('.inner-close').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('renders the footer slot when provided', () => {
      const wrapper = track(createWrapper({}, { footer: '<div class="foot">footer</div>' }))
      expect(wrapper.find('.base-drawer__footer .foot').exists()).toBe(true)
    })

    it('does NOT render the footer when no footer slot is provided', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer__footer').exists()).toBe(false)
    })

    it('renders custom title slot content', () => {
      const wrapper = track(
        createWrapper({ title: 'fallback' }, { title: '<span class="custom-title">自訂</span>' }),
      )
      expect(wrapper.find('.custom-title').exists()).toBe(true)
    })
  })

  // ── Background image (Vuetify-style) ──────────────────────────────────────
  describe('background image', () => {
    it('renders the background image when the image prop is set', () => {
      const wrapper = track(createWrapper({ image: '/bg.jpg' }))
      const img = wrapper.find('.base-drawer__image img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('/bg.jpg')
    })

    it('marks the background image as decorative', () => {
      const wrapper = track(createWrapper({ image: '/bg.jpg' }))
      expect(wrapper.find('.base-drawer__image').attributes('aria-hidden')).toBe('true')
      // 純裝飾圖：alt 為空字串，螢幕閱讀器略過。
      expect(wrapper.find('.base-drawer__image img').attributes('alt')).toBe('')
    })

    it('does NOT render an image layer without image prop or #image slot', () => {
      const wrapper = track(createWrapper())
      expect(wrapper.find('.base-drawer__image').exists()).toBe(false)
    })

    it('renders the #image slot, overriding the default img', () => {
      const wrapper = track(createWrapper({}, { image: '<div class="custom-bg"></div>' }))
      expect(wrapper.find('.base-drawer__image .custom-bg').exists()).toBe(true)
      expect(wrapper.find('.base-drawer__image img').exists()).toBe(false)
    })
  })

  // ── beforeClose hook (Element Plus-style) ─────────────────────────────────
  describe('beforeClose', () => {
    it('intercepts the close button: calls beforeClose, does not close yet', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(createWrapper({ beforeClose }))
      await wrapper.find('.base-drawer__close').trigger('click')
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('closes only after beforeClose invokes done()', async () => {
      const beforeClose = vi.fn((done: () => void) => done())
      const wrapper = track(createWrapper({ beforeClose }))
      await wrapper.find('.base-drawer__close').trigger('click')
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    })

    it('gates the Esc close path through beforeClose', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(createWrapper({ beforeClose }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      await nextTick()
      expect(beforeClose).toHaveBeenCalledTimes(1)
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    it('does not run beforeClose on programmatic (v-model) close', async () => {
      const beforeClose = vi.fn()
      const wrapper = track(createWrapper({ beforeClose }))
      await wrapper.setProps({ modelValue: false })
      expect(beforeClose).not.toHaveBeenCalled()
    })
  })

  // ── Lifecycle events (Element Plus-style) ─────────────────────────────────
  //
  // open / close（動畫「前」）由 watch(open) 發出，不依賴 transition → 確定可測；掛載即開啟
  // 者另由 onMounted 補發 open，避免「只發 opened、不發 open」的不對稱。
  // opened / closed（動畫「後」）由 <Transition> after-hook 發出，需真實 transition。
  describe('lifecycle events', () => {
    const mountReal = (props: Record<string, unknown>) =>
      mount(BaseDrawer, {
        props,
        attachTo: document.body,
        global: { stubs: { teleport: true, transition: false } },
      })

    it('emits open when it starts opening', async () => {
      const wrapper = track(createWrapper({ modelValue: false }))
      await wrapper.setProps({ modelValue: true })
      expect(wrapper.emitted('open')).toHaveLength(1)
    })

    it('emits close when it starts closing', async () => {
      const wrapper = track(createWrapper({ modelValue: true }))
      await wrapper.setProps({ modelValue: false })
      expect(wrapper.emitted('close')).toHaveLength(1)
    })

    it('emits open on mount when already open (no opened-without-open asymmetry)', () => {
      const wrapper = track(createWrapper({ modelValue: true }))
      expect(wrapper.emitted('open')).toHaveLength(1)
    })

    // opened 由 after-enter / after-appear 發出，需 transition 完成；用假計時器推進 rAF / timeout。
    it('emits opened after the open transition finishes', async () => {
      vi.useFakeTimers()
      try {
        const wrapper = track(mountReal({ modelValue: false }))
        await wrapper.setProps({ modelValue: true })
        await vi.advanceTimersByTimeAsync(1000)
        expect(wrapper.emitted('opened')).toBeTruthy()
      }
      finally {
        vi.useRealTimers()
      }
    })

    // closed 由 after-leave 發出，與已驗證的 opened（after-enter）是同一條 wiring。happy-dom
    // 無法完成 Vue 的「離場」transition（元素移除路徑），任何計時器策略都推不動 after-leave，
    // 屬環境限制而非元件問題，故 skip、交由 Storybook 視覺驗證離場行為。
    it.skip('emits closed after the close transition finishes (happy-dom cannot drive leave)', () => {})
  })

  // ── withHeader (Element Plus-style) ───────────────────────────────────────
  describe('withHeader', () => {
    it('hides the entire header when withHeader is false, even with a title', () => {
      const wrapper = track(createWrapper({ title: '設定', withHeader: false }))
      expect(wrapper.find('.base-drawer__header').exists()).toBe(false)
      expect(wrapper.find('.base-drawer__close').exists()).toBe(false)
    })

    it('renders the header by default', () => {
      const wrapper = track(createWrapper({ title: '設定' }))
      expect(wrapper.find('.base-drawer__header').exists()).toBe(true)
    })
  })
})
