import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '~/components/atoms/BaseButton.vue'
import BaseLink from '~/components/atoms/BaseLink.vue'

// ── Link stub: rendered as a plain <a> ─────────────────────────────────────
//
// BaseButton 委派 BaseLink 渲染連結;BaseLink 內部依 fallback chain 解析為
// NuxtLink / RouterLink / `<a>`。單元測試環境無 router,且 Nuxt env 提供的
// 真 NuxtLink 內部又用 RouterLink → 雙重 stub 攔截兩個分支都退回 `<a>`,
// 讓測試可在無 router 設定下驗證 DOM 行為。
const LinkStub = {
  name: 'LinkStub',
  props: ['to', 'target', 'rel'],
  template: '<a><slot /></a>',
}

function createWrapper(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(BaseButton, {
    props,
    slots,
    global: {
      components: { NuxtLink: LinkStub },
      stubs: { NuxtLink: LinkStub, RouterLink: LinkStub },
    },
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BaseButton', () => {
  // ── Tag rendering ────────────────────────────────────────────────────────
  describe('tag rendering', () => {
    it('renders as <button> by default', () => {
      expect(createWrapper().element.tagName).toBe('BUTTON')
    })

    it('renders as <a> when href is provided', () => {
      expect(createWrapper({ href: 'https://example.com' }).element.tagName).toBe('A')
    })

    it('renders as NuxtLink when to is provided', () => {
      const wrapper = createWrapper({ to: '/home' })
      expect(wrapper.element.tagName).toBe('A')
      // not a native button — no type attribute
      expect(wrapper.attributes('type')).toBeUndefined()
    })

    it('prefers to over href when both are provided', () => {
      const wrapper = createWrapper({ to: '/home', href: 'https://example.com' })
      const link = wrapper.findComponent(BaseLink)
      expect(link.exists()).toBe(true)
      expect(link.props('to')).toBe('/home')
    })

    it('sets type="button" by default', () => {
      expect(createWrapper().attributes('type')).toBe('button')
    })

    it('reflects type prop on native button', () => {
      expect(createWrapper({ type: 'submit' }).attributes('type')).toBe('submit')
    })

    it('does not set type on link element', () => {
      expect(createWrapper({ href: '/' }).attributes('type')).toBeUndefined()
    })
  })

  // ── Slots ────────────────────────────────────────────────────────────────
  describe('slots', () => {
    it('renders default slot inside label wrapper', () => {
      const wrapper = createWrapper({}, { default: 'Click me' })
      expect(wrapper.find('.base-button__label').text()).toBe('Click me')
    })

    it('renders prepend slot when provided', () => {
      const wrapper = createWrapper({}, { prepend: '<span class="icon">★</span>' })
      expect(wrapper.find('.base-button__prepend').exists()).toBe(true)
    })

    it('renders append slot when provided', () => {
      const wrapper = createWrapper({}, { append: '<span class="icon">→</span>' })
      expect(wrapper.find('.base-button__append').exists()).toBe(true)
    })

    it('does not render prepend wrapper when slot is absent', () => {
      expect(createWrapper().find('.base-button__prepend').exists()).toBe(false)
    })

    it('shows default spinner when loading', () => {
      expect(createWrapper({ loading: true }).find('.base-button__spinner').exists()).toBe(true)
    })

    it('renders custom loading slot instead of default spinner', () => {
      const wrapper = createWrapper({ loading: true }, { loading: '<span class="my-loader" />' })
      expect(wrapper.find('.my-loader').exists()).toBe(true)
      expect(wrapper.find('.base-button__spinner').exists()).toBe(false)
    })
  })

  // ── CSS classes ──────────────────────────────────────────────────────────
  describe('CSS classes', () => {
    it.each(['solid', 'outline', 'ghost', 'text', 'link'] as const)(
      'applies variant class: %s',
      (variant) => expect(createWrapper({ variant }).classes()).toContain(`base-button--${variant}`),
    )

    it.each(['sm', 'md', 'lg'] as const)(
      'applies size class: %s',
      (size) => expect(createWrapper({ size }).classes()).toContain(`base-button--${size}`),
    )

    it.each(['rectangle', 'square', 'circle', 'pill'] as const)(
      'applies shape class: %s',
      (shape) => expect(createWrapper({ shape }).classes()).toContain(`base-button--${shape}`),
    )

    it.each(['none', 'sm', 'md', 'lg', 'full'] as const)(
      'applies rounded class: %s',
      (rounded) => expect(createWrapper({ rounded }).classes()).toContain(`base-button--rounded-${rounded}`),
    )

    it.each(['primary', 'danger', 'success', 'warning', 'info', 'neutral'] as const)(
      'applies color class: %s',
      (color) => expect(createWrapper({ color }).classes()).toContain(`base-button--${color}`),
    )

    it('applies base-button--block when block is true', () => {
      expect(createWrapper({ block: true }).classes()).toContain('base-button--block')
    })

    it('applies is-disabled when disabled', () => {
      expect(createWrapper({ disabled: true }).classes()).toContain('is-disabled')
    })

    it('applies is-loading and is-disabled when loading', () => {
      const classes = createWrapper({ loading: true }).classes()
      expect(classes).toContain('is-loading')
      expect(classes).toContain('is-disabled')
    })
  })

  // ── Disabled state ───────────────────────────────────────────────────────
  describe('disabled state', () => {
    it('sets disabled attribute on native button', () => {
      expect(createWrapper({ disabled: true }).attributes('disabled')).toBeDefined()
    })

    it('does not set disabled attribute on link element', () => {
      expect(createWrapper({ href: '/', disabled: true }).attributes('disabled')).toBeUndefined()
    })

    it('sets aria-disabled on non-button element', () => {
      expect(createWrapper({ href: '/', disabled: true }).attributes('aria-disabled')).toBe('true')
    })

    it('sets tabindex="-1" on non-button element when disabled', () => {
      expect(createWrapper({ href: '/', disabled: true }).attributes('tabindex')).toBe('-1')
    })

    it('calls preventDefault on click when disabled', () => {
      // Native <button disabled> is prevented by the browser;
      // JS interception is only needed for non-button elements (links, etc.)
      const wrapper = createWrapper({ href: '/', disabled: true })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })

    it('stops propagation on click when disabled', () => {
      // stopPropagation 只阻止冒泡（父層 listener 不會收到），
      // 不會吃掉同一個 element 上其他 listener — 從父層偵測冒泡是否被擋。
      const wrapper = createWrapper({ href: '/', disabled: true })
      const parent = document.createElement('div')
      parent.appendChild(wrapper.element)
      let parentFired = false
      parent.addEventListener('click', () => { parentFired = true })
      wrapper.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(parentFired).toBe(false)
    })

    it('does not prevent click when enabled', () => {
      const wrapper = createWrapper({ href: '/' })
      let firedAfter = false
      wrapper.element.addEventListener('click', () => { firedAfter = true })
      wrapper.element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
      expect(firedAfter).toBe(true)
    })
  })

  // ── Loading state ────────────────────────────────────────────────────────
  describe('loading state', () => {
    it('shows loading overlay', () => {
      expect(createWrapper({ loading: true }).find('.base-button__loading').exists()).toBe(true)
    })

    it('hides content with visibility-hidden class', () => {
      expect(
        createWrapper({ loading: true }).find('.base-button__content').classes(),
      ).toContain('base-button__content--hidden')
    })

    it('sets aria-busy="true" when loading', () => {
      expect(createWrapper({ loading: true }).attributes('aria-busy')).toBe('true')
    })

    it('does not set aria-busy when not loading', () => {
      expect(createWrapper().attributes('aria-busy')).toBeUndefined()
    })

    it('sets native disabled when loading', () => {
      expect(createWrapper({ loading: true }).attributes('disabled')).toBeDefined()
    })

    it('prevents click on link element when loading', () => {
      const wrapper = createWrapper({ href: '/', loading: true })
      const event = new MouseEvent('click', { bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
    })
  })

  // ── Accessibility attributes ─────────────────────────────────────────────
  describe('accessibility attributes', () => {
    it('sets aria-label', () => {
      expect(createWrapper({ ariaLabel: 'Close' }).attributes('aria-label')).toBe('Close')
    })

    it('sets aria-pressed', () => {
      expect(createWrapper({ ariaPressed: true }).attributes('aria-pressed')).toBe('true')
    })

    it('sets aria-expanded to "false" when false', () => {
      expect(createWrapper({ ariaExpanded: false }).attributes('aria-expanded')).toBe('false')
    })

    it('sets aria-controls', () => {
      expect(createWrapper({ ariaControls: 'menu-123' }).attributes('aria-controls')).toBe('menu-123')
    })

    it('sets aria-haspopup', () => {
      expect(createWrapper({ ariaHaspopup: 'menu' }).attributes('aria-haspopup')).toBe('menu')
    })

    // button/toggle 語意屬性（aria-pressed / aria-expanded / aria-haspopup）只在
    // 委派成連結（BaseLink / <a>）時 *不* 輸出 —— 這些是 button 語意，不屬於 link。
    it('does not set aria-pressed on link element', () => {
      expect(createWrapper({ href: '/', ariaPressed: true }).attributes('aria-pressed')).toBeUndefined()
    })

    it('does not set aria-expanded on link element', () => {
      expect(createWrapper({ href: '/', ariaExpanded: false }).attributes('aria-expanded')).toBeUndefined()
    })

    it('does not set aria-haspopup on link element', () => {
      expect(createWrapper({ href: '/', ariaHaspopup: 'menu' }).attributes('aria-haspopup')).toBeUndefined()
    })
  })

  // ── icon-only dev warning ──────────────────────────────────────────────────
  describe('dev warning for icon-only without ariaLabel', () => {
    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('warns when iconOnly is true without ariaLabel', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      createWrapper({ iconOnly: true })
      expect(spy).toHaveBeenCalled()
    })

    it('does not warn when iconOnly is true with ariaLabel', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      createWrapper({ iconOnly: true, ariaLabel: 'Close' })
      expect(spy).not.toHaveBeenCalled()
    })

    it('does not warn when iconOnly is false', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      createWrapper({ iconOnly: false })
      createWrapper()
      expect(spy).not.toHaveBeenCalled()
    })
  })

  // ── Link behavior ────────────────────────────────────────────────────────
  describe('link behavior', () => {
    it('sets href on <a> element', () => {
      expect(createWrapper({ href: 'https://example.com' }).attributes('href')).toBe('https://example.com')
    })

    it('adds rel="noopener noreferrer" when target="_blank"', () => {
      const wrapper = createWrapper({ href: 'https://example.com', target: '_blank' })
      expect(wrapper.attributes('rel')).toBe('noopener noreferrer')
    })

    it('does not add rel for non-blank targets', () => {
      const wrapper = createWrapper({ href: 'https://example.com', target: '_self' })
      expect(wrapper.attributes('rel')).toBeUndefined()
    })
  })

  // ── Keyboard interaction (link branch: Space activation) ────────────────────
  //
  // 設計準則規定：以非 button 元素（<a> / BaseLink）呈現按鈕時，原生只支援 Enter，
  // 需手動補齊 Space 觸發，符合按鈕外觀的鍵盤預期。
  describe('keyboard interaction on link', () => {
    it('triggers click and prevents default on Space for a link element', () => {
      const wrapper = createWrapper({ href: '/' })
      const clickSpy = vi.spyOn(wrapper.element as HTMLElement, 'click')
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(clickSpy).toHaveBeenCalledTimes(1)
    })

    it('does not trigger click on Space when disabled', () => {
      const wrapper = createWrapper({ href: '/', disabled: true })
      const clickSpy = vi.spyOn(wrapper.element as HTMLElement, 'click')
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('does not trigger click on Space when loading', () => {
      const wrapper = createWrapper({ href: '/', loading: true })
      const clickSpy = vi.spyOn(wrapper.element as HTMLElement, 'click')
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(true)
      expect(clickSpy).not.toHaveBeenCalled()
    })

    it('does not intercept Space on the native <button> branch (native behavior applies)', () => {
      const wrapper = createWrapper()
      const clickSpy = vi.spyOn(wrapper.element as HTMLElement, 'click')
      const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
      wrapper.element.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      expect(clickSpy).not.toHaveBeenCalled()
    })
  })

  // ── href 外部連結語意 (C1-9 regression) ───────────────────────────────────────
  // href 過去只是 to 的 alias，無 protocol 的路徑（如 /file.pdf）會被判為內部路由走
  // SPA 導航，令 download 等原生行為失效。修正後 href 會強制 BaseLink 以原生 <a> 渲染。
  describe('href external semantics (C1-9 regression)', () => {
    it('使用 href 時委派 BaseLink 並標記為外部連結（原生 <a>，不走 SPA 路由）', () => {
      const link = createWrapper({ href: '/file.pdf' }).findComponent(BaseLink)
      expect(link.props('external')).toBe(true)
    })

    it('使用 to（內部路由）時不外部化', () => {
      const link = createWrapper({ to: '/home' }).findComponent(BaseLink)
      expect(link.props('external')).toBe(false)
    })

    it('同時給 to 與 href 時以 to 優先，不外部化', () => {
      const link = createWrapper({ to: '/home', href: '/file.pdf' }).findComponent(BaseLink)
      expect(link.props('external')).toBe(false)
    })
  })
})
