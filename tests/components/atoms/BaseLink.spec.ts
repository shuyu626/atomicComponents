import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseLink from '~/components/atoms/BaseLink.vue'

// ── Link stub: rendered as plain <a> ───────────────────────────────────────
//
// `environment: 'nuxt'` 預設提供 NuxtLink，但其內部依賴實際路由解析；測試只
// 關心 BaseLink 的 *決策邏輯*（external vs internal、target、rel、href 計算），
// 不關心下游元件實際行為 —— 用 stub 取代讓斷言面更穩定、不受 Nuxt 版本影響。
//
// 兩個位置都要設：
//   `components` → `resolveComponent('NuxtLink')` 在 setup time 找到 stub，
//                  使 `hasNuxtLink === true`，BaseLink 才會走 NuxtLink 分支
//   `stubs`      → render time 把 NuxtLink / RouterLink 換成 stub
const LinkStub = {
  name: 'LinkStub',
  props: ['to', 'target', 'rel'],
  template: `
    <a
      :href="typeof to === 'string' ? to : undefined"
      :target="target"
      :rel="rel"
    ><slot /></a>
  `,
}

function createWrapper(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(BaseLink, {
    props,
    slots,
    global: {
      components: { NuxtLink: LinkStub },
      stubs:      { NuxtLink: LinkStub, RouterLink: LinkStub },
    },
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('BaseLink', () => {
  // ── isExternal decision tree (priority order) ─────────────────────────────
  //
  // 對應 docs/components/BaseLink.md §4.2 的 5 條優先序：
  //   1. external prop 顯式
  //   2. target 非 _self
  //   3. to 是 route object → 內部
  //   4. to 為空字串 或 含 protocol
  //   5. 其他 → 內部
  describe('external link decisions', () => {
    it('treats as external when `external` prop is true (even for relative path)', () => {
      const wrapper = createWrapper({ external: true, to: '/foo' })
      // 走 v-if 分支：plain <a>，不是 LinkStub
      expect(wrapper.findComponent(LinkStub).exists()).toBe(false)
      expect(wrapper.element.tagName).toBe('A')
      expect(wrapper.attributes('href')).toBe('/foo')
    })

    it('treats as external when target is _blank', () => {
      const wrapper = createWrapper({ to: '/foo', target: '_blank' })
      expect(wrapper.findComponent(LinkStub).exists()).toBe(false)
    })

    it('treats as external when target is _parent', () => {
      expect(createWrapper({ to: '/foo', target: '_parent' }).findComponent(LinkStub).exists()).toBe(false)
    })

    it('treats as external when target is _top', () => {
      expect(createWrapper({ to: '/foo', target: '_top' }).findComponent(LinkStub).exists()).toBe(false)
    })

    it('treats as internal when target is _self (with relative path)', () => {
      // _self 不觸發外部判斷，to='/foo' 也非外部 → 走 NuxtLink 分支
      expect(createWrapper({ to: '/foo', target: '_self' }).findComponent(LinkStub).exists()).toBe(true)
    })

    it('treats as external when to is an absolute URL', () => {
      const wrapper = createWrapper({ to: 'https://example.com' })
      expect(wrapper.element.tagName).toBe('A')
      expect(wrapper.attributes('href')).toBe('https://example.com')
    })

    it('treats as external when to is mailto:', () => {
      expect(createWrapper({ to: 'mailto:foo@bar.com' }).attributes('href')).toBe('mailto:foo@bar.com')
    })

    it('treats as external when to is tel:', () => {
      expect(createWrapper({ to: 'tel:+886912345678' }).attributes('href')).toBe('tel:+886912345678')
    })

    it('treats as external when to is protocol-relative (//cdn.example.com)', () => {
      const wrapper = createWrapper({ to: '//cdn.example.com/foo' })
      expect(wrapper.findComponent(LinkStub).exists()).toBe(false)
    })

    it('treats as external when to is empty string', () => {
      const wrapper = createWrapper({ to: '' })
      // 空字串視為外部，走 <a> 但無 href
      expect(wrapper.findComponent(LinkStub).exists()).toBe(false)
      expect(wrapper.attributes('href')).toBeUndefined()
    })
  })

  // ── Internal link rendering ───────────────────────────────────────────────
  describe('internal link decisions', () => {
    it('renders link component when to is a relative path', () => {
      const link = createWrapper({ to: '/products' }).findComponent(LinkStub)
      expect(link.exists()).toBe(true)
      expect(link.props('to')).toBe('/products')
    })

    it('renders link component when to is a route object', () => {
      const link = createWrapper({ to: { name: 'home' } }).findComponent(LinkStub)
      expect(link.exists()).toBe(true)
      expect(link.props('to')).toEqual({ name: 'home' })
    })

    it('keeps internal when external prop is false explicitly', () => {
      expect(createWrapper({ to: '/foo', external: false }).findComponent(LinkStub).exists()).toBe(true)
    })
  })

  // ── rel attribute (security) ──────────────────────────────────────────────
  describe('rel attribute', () => {
    it('adds rel="noopener noreferrer" when target is _blank', () => {
      const wrapper = createWrapper({ to: 'https://example.com', target: '_blank' })
      expect(wrapper.attributes('rel')).toBe('noopener noreferrer')
    })

    it('does not add rel when target is _self', () => {
      expect(createWrapper({ to: 'https://example.com', target: '_self' }).attributes('rel')).toBeUndefined()
    })

    it('does not add rel when no target provided', () => {
      expect(createWrapper({ to: 'https://example.com' }).attributes('rel')).toBeUndefined()
    })
  })

  // ── target attribute ──────────────────────────────────────────────────────
  describe('target attribute', () => {
    it('passes target through to external <a>', () => {
      expect(createWrapper({ to: 'https://example.com', target: '_blank' }).attributes('target')).toBe('_blank')
    })

    // 內部連結（NuxtLink / RouterLink 分支）的 target 透傳屬下游元件責任，
    // BaseLink 只 binding `:target="target"`，邏輯上無可錯點，故不在此驗證。
  })

  // ── href computation ──────────────────────────────────────────────────────
  describe('href on <a> branch', () => {
    it('uses to as href when to is a string', () => {
      expect(createWrapper({ to: 'https://example.com' }).attributes('href')).toBe('https://example.com')
    })

    it('omits href when to is empty string', () => {
      expect(createWrapper({ to: '' }).attributes('href')).toBeUndefined()
    })

    it('omits href when external + to is route object but no router context', () => {
      // 防禦行為：useRouter() 在無 router context 環境回 undefined，
      // BaseLink 用 optional chaining 避免 crash，href 為 undefined。
      // 在有 router 的環境（Nuxt / Vite + vue-router）會解析出對應字串 href。
      const wrapper = createWrapper({ external: true, to: { path: '/foo' } })
      expect(wrapper.element.tagName).toBe('A')
      expect(wrapper.attributes('href')).toBeUndefined()
    })
  })

  // ── Slot rendering ────────────────────────────────────────────────────────
  describe('slot rendering', () => {
    it('renders default slot text content', () => {
      expect(createWrapper({ to: '/' }, { default: 'Home' }).text()).toBe('Home')
    })

    it('renders default slot HTML content (icon + text)', () => {
      const wrapper = createWrapper(
        { to: '/' },
        { default: '<span class="icon">★</span><span>Star</span>' },
      )
      expect(wrapper.find('.icon').exists()).toBe(true)
      expect(wrapper.text()).toContain('Star')
    })

    it('renders slot content in external <a> branch', () => {
      const wrapper = createWrapper(
        { to: 'https://example.com', target: '_blank' },
        { default: 'External' },
      )
      expect(wrapper.text()).toBe('External')
    })
  })

  // ── NOTE: RouterLink fallback path (hasNuxtLink === false) ───────────────
  //
  // Nuxt 測試環境永遠提供 NuxtLink，無法在不 mock vue 的情況下測「NuxtLink 不存在 →
  // RouterLink」這條分支。此路徑於純 Vite + vue-router SPA 才會啟用，建議在
  // 該專案的整合測試環境驗證。BaseLink template 中 v-else-if/v-else 兩條 branch
  // 邏輯相同（都傳 to/target/rel），不影響行為正確性。
})
