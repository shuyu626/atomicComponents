import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import BaseAvatar from '~/components/atoms/BaseAvatar.vue'

function mountAvatar(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = {},
) {
  return mount(BaseAvatar, { props, slots })
}

describe('BaseAvatar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 圖片渲染 ────────────────────────────────────────────────────────────────
  describe('image rendering', () => {
    it('renders an <img> with src/alt when src is provided', () => {
      const w = mountAvatar({ src: '/a.jpg', alt: 'Alex' })
      const img = w.find('img')
      expect(img.exists()).toBe(true)
      expect(img.attributes('src')).toBe('/a.jpg')
      expect(img.attributes('alt')).toBe('Alex')
    })

    it('does NOT mark the root as role="img" while the image displays (img alt carries semantics)', () => {
      const root = mountAvatar({ src: '/a.jpg', alt: 'Alex' }).find('.base-avatar')
      // 圖片正常顯示時交給 <img alt>，外層不重複掛 role/aria-label
      expect(root.attributes('role')).toBeUndefined()
      expect(root.attributes('aria-label')).toBeUndefined()
      expect(root.find('img').attributes('alt')).toBe('Alex')
    })

    it('marks the root as role="img" + aria-label only in fallback state (image failed)', async () => {
      const w = mountAvatar({ src: '/broken.jpg', alt: 'Alex' })
      const root = w.find('.base-avatar')
      // 載入中 / 成功：外層無 role
      expect(root.attributes('role')).toBeUndefined()

      await w.find('img').trigger('error')
      // 失敗後縮寫 fallback 需要 role="img" + aria-label 讓 SR 當成帶描述的圖片
      expect(root.attributes('role')).toBe('img')
      expect(root.attributes('aria-label')).toBe('Alex')
    })

    it('omits wrapper role/aria-label for decorative alt="" even after error (lets SR skip)', async () => {
      const w = mountAvatar({ src: '/a.jpg', alt: '' })
      const root = w.find('.base-avatar')
      // 內層 <img alt=""> 仍在，瀏覽器視為裝飾性圖
      expect(root.find('img').attributes('alt')).toBe('')
      expect(root.attributes('role')).toBeUndefined()

      await w.find('img').trigger('error')
      // 裝飾性頭像即使失敗也不掛 role，讓 SR 直接跳過
      expect(root.attributes('role')).toBeUndefined()
      expect(root.attributes('aria-label')).toBeUndefined()
    })

    it('renders default slot (no img / no role) when src is absent', () => {
      const w = mountAvatar({ alt: 'Alex' }, { default: () => 'AC' })
      expect(w.find('img').exists()).toBe(false)
      expect(w.find('.base-avatar').attributes('role')).toBeUndefined()
      expect(w.text()).toContain('AC')
    })
  })

  // ── 尺寸 ────────────────────────────────────────────────────────────────────
  describe('size', () => {
    it('adds a modifier class for named sizes and no img width/height attr', () => {
      const w = mountAvatar({ src: '/a.jpg', alt: 'a', size: 'lg' })
      expect(w.find('.base-avatar').classes()).toContain('base-avatar--lg')
      // 具名尺寸不輸出非法的 width="lg"
      expect(w.find('img').attributes('width')).toBeUndefined()
      expect(w.find('img').attributes('height')).toBeUndefined()
    })

    it('emits numeric width/height + --avatar-size for numeric sizes', () => {
      const w = mountAvatar({ src: '/a.jpg', alt: 'a', size: 48 })
      const root = w.find('.base-avatar').element as HTMLElement
      expect(w.find('img').attributes('width')).toBe('48')
      expect(w.find('img').attributes('height')).toBe('48')
      expect(root.style.getPropertyValue('--avatar-size')).toBe('48px')
      expect(w.find('.base-avatar').classes()).not.toContain('base-avatar--48')
    })

    it('defaults to the md modifier class', () => {
      const w = mountAvatar({ alt: 'a' }, { default: () => 'AC' })
      expect(w.find('.base-avatar').classes()).toContain('base-avatar--md')
    })

    it('maps each named size to its modifier class', () => {
      for (const size of ['sm', 'md', 'lg'] as const) {
        const w = mountAvatar({ alt: 'a', size }, { default: () => 'AC' })
        expect(w.find('.base-avatar').classes()).toContain(`base-avatar--${size}`)
      }
    })

    it('accepts numeric strings for size', () => {
      const w = mountAvatar({ src: '/a.jpg', alt: 'a', size: '64' })
      expect(w.find('img').attributes('width')).toBe('64')
      const root = w.find('.base-avatar').element as HTMLElement
      expect(root.style.getPropertyValue('--avatar-size')).toBe('64px')
    })
  })

  // ── 圓角 ────────────────────────────────────────────────────────────────────
  describe('rounded', () => {
    it('maps "full" to 9999px', () => {
      const root = mountAvatar({ alt: 'a', rounded: 'full' }).find('.base-avatar')
        .element as HTMLElement
      expect(root.style.getPropertyValue('--avatar-rounded')).toBe('9999px')
    })

    it('coerces numeric / numeric-string rounded to px', () => {
      const a = mountAvatar({ alt: 'a', rounded: 12 }).find('.base-avatar')
        .element as HTMLElement
      expect(a.style.getPropertyValue('--avatar-rounded')).toBe('12px')

      const b = mountAvatar({ alt: 'a', rounded: '8' }).find('.base-avatar')
        .element as HTMLElement
      expect(b.style.getPropertyValue('--avatar-rounded')).toBe('8px')
    })
  })

  // ── 載入失敗 fallback ─────────────────────────────────────────────────────────
  describe('error fallback', () => {
    it('swaps img for fallback content on @error', async () => {
      const w = mountAvatar({ src: '/broken.jpg', alt: 'Alex' }, { default: () => 'AC' })
      expect(w.find('img').exists()).toBe(true)

      await w.find('img').trigger('error')

      expect(w.find('img').exists()).toBe(false)
      expect(w.text()).toContain('AC')
    })

    it('prefers the #fallback slot over default on error', async () => {
      const w = mountAvatar(
        { src: '/broken.jpg', alt: 'Alex' },
        { default: () => 'AC', fallback: () => 'FB' },
      )
      await w.find('img').trigger('error')
      expect(w.text()).toContain('FB')
      expect(w.text()).not.toContain('AC')
    })

    it('falls back to alt text when no slot is given', async () => {
      const w = mountAvatar({ src: '/broken.jpg', alt: 'Alex' })
      await w.find('img').trigger('error')
      expect(w.text()).toContain('Alex')
    })

    it('resets error state when src changes (retries the new image)', async () => {
      const w = mountAvatar({ src: '/broken.jpg', alt: 'Alex' })
      await w.find('img').trigger('error')
      expect(w.find('img').exists()).toBe(false)

      await w.setProps({ src: '/working.jpg' })
      expect(w.find('img').exists()).toBe(true)
      expect(w.find('img').attributes('src')).toBe('/working.jpg')
    })
  })

  // ── priority ────────────────────────────────────────────────────────────────
  describe('priority', () => {
    it('defaults to lazy loading without fetchpriority', () => {
      const img = mountAvatar({ src: '/a.jpg', alt: 'a' }).find('img')
      expect(img.attributes('loading')).toBe('lazy')
      expect(img.attributes('fetchpriority')).toBeUndefined()
    })

    it('forces eager loading + high fetchpriority when priority is true', () => {
      const img = mountAvatar({ src: '/a.jpg', alt: 'a', priority: true }).find('img')
      expect(img.attributes('loading')).toBe('eager')
      expect(img.attributes('fetchpriority')).toBe('high')
    })
  })

  // ── 水合前圖片錯誤偵測 ────────────────────────────────────────────────────────
  describe('pre-hydration image error detection', () => {
    /**
     * 模擬「掛載前圖片已載入完成／失敗」：happy-dom 下以 Object.defineProperty
     * 覆寫 HTMLImageElement 原型的 complete / naturalWidth，並回傳還原函式。
     */
    function stubImageState(state: { complete: boolean, naturalWidth: number }): () => void {
      const proto = window.HTMLImageElement.prototype
      const original = {
        complete: Object.getOwnPropertyDescriptor(proto, 'complete'),
        naturalWidth: Object.getOwnPropertyDescriptor(proto, 'naturalWidth'),
      }
      Object.defineProperty(proto, 'complete', {
        configurable: true,
        get: () => state.complete,
      })
      Object.defineProperty(proto, 'naturalWidth', {
        configurable: true,
        get: () => state.naturalWidth,
      })
      return () => {
        for (const key of ['complete', 'naturalWidth'] as const) {
          const descriptor = original[key]
          if (descriptor) Object.defineProperty(proto, key, descriptor)
          else Reflect.deleteProperty(proto, key)
        }
      }
    }

    it('switches to fallback on mount when the image already failed before hydration', async () => {
      const restore = stubImageState({ complete: true, naturalWidth: 0 })
      try {
        // 圖片在水合前就 error：事件已 fire 完，只能靠掛載時檢查 naturalWidth 補救
        const w = mountAvatar({ src: '/broken.jpg', alt: 'Alex' }, { default: () => 'AC' })
        await nextTick()
        expect(w.find('img').exists()).toBe(false)
        expect(w.text()).toContain('AC')
      } finally {
        restore()
      }
    })

    it('keeps the image when it already finished loading successfully', async () => {
      const restore = stubImageState({ complete: true, naturalWidth: 128 })
      try {
        const w = mountAvatar({ src: '/a.jpg', alt: 'Alex' })
        await nextTick()
        expect(w.find('img').exists()).toBe(true)
      } finally {
        restore()
      }
    })

    it('does not treat a still-loading image as failed', async () => {
      const restore = stubImageState({ complete: false, naturalWidth: 0 })
      try {
        const w = mountAvatar({ src: '/a.jpg', alt: 'Alex' })
        await nextTick()
        expect(w.find('img').exists()).toBe(true)
      } finally {
        restore()
      }
    })
  })

  // ── 三層 fallback（slot → 文字 → 剪影）──────────────────────────────────────
  describe('three-tier fallback (slot → text → silhouette)', () => {
    it('renders the built-in silhouette when the image fails with no slot and no alt text', async () => {
      const w = mountAvatar({ src: '/broken.jpg', alt: '' })
      await w.find('img').trigger('error')
      const svg = w.find('svg.base-avatar__silhouette')
      expect(svg.exists()).toBe(true)
      // 剪影純裝飾，SR 必須跳過
      expect(svg.attributes('aria-hidden')).toBe('true')
    })

    it('renders the silhouette for a src-less avatar without slot and alt', () => {
      const w = mountAvatar()
      expect(w.find('svg.base-avatar__silhouette').exists()).toBe(true)
    })

    it('renders alt text for a src-less avatar without slot (text tier before silhouette)', () => {
      const w = mountAvatar({ alt: 'Alex' })
      expect(w.text()).toContain('Alex')
      expect(w.find('svg.base-avatar__silhouette').exists()).toBe(false)
    })

    it('never renders the silhouette when a slot provides content', async () => {
      const withDefault = mountAvatar({}, { default: () => 'AC' })
      expect(withDefault.find('svg.base-avatar__silhouette').exists()).toBe(false)

      const withFallback = mountAvatar({ src: '/broken.jpg', alt: '' }, { fallback: () => 'FB' })
      await withFallback.find('img').trigger('error')
      expect(withFallback.find('svg.base-avatar__silhouette').exists()).toBe(false)
      expect(withFallback.text()).toContain('FB')
    })
  })

  // ── 文字頭像自動配色 ──────────────────────────────────────────────────────────
  describe('auto background color for text avatars', () => {
    function autoBg(w: ReturnType<typeof mountAvatar>): string {
      return (w.find('.base-avatar').element as HTMLElement).style.getPropertyValue(
        '--avatar-auto-bg',
      )
    }

    it('injects deterministic auto colors: same text always yields the same palette entry', () => {
      const a = mountAvatar({ alt: 'Alex' })
      const b = mountAvatar({ alt: 'Alex' })
      expect(autoBg(a)).not.toBe('')
      expect(autoBg(a)).toBe(autoBg(b))
      const fg = (a.find('.base-avatar').element as HTMLElement).style.getPropertyValue(
        '--avatar-auto-color',
      )
      expect(fg).not.toBe('')
    })

    it('spreads different strings across the palette', () => {
      const names = ['Alex', 'Ben', 'Cara', 'Dan', 'Eve', 'Fay', 'Gus', 'Hana']
      const colors = new Set(names.map(name => autoBg(mountAvatar({ alt: name }))))
      expect(colors.size).toBeGreaterThan(1)
    })

    it('derives the hash key from default slot text when alt is absent', () => {
      const a = mountAvatar({}, { default: () => 'AC' })
      const b = mountAvatar({}, { default: () => 'AC' })
      expect(autoBg(a)).not.toBe('')
      expect(autoBg(a)).toBe(autoBg(b))
    })

    it('injects no auto colors when there is no displayable text', () => {
      expect(autoBg(mountAvatar())).toBe('')
    })

    it('never writes --avatar-bg inline so consumer class overrides can still win', () => {
      const w = mountAvatar({ alt: 'Alex' })
      const el = w.find('.base-avatar').element as HTMLElement
      // 自動配色只准注入 --avatar-auto-bg（inline）；--avatar-bg 只存在 :where() 預設層，
      // 使用端以任何 class 設 --avatar-bg 都能以 specificity 蓋過自動配色
      expect(el.style.getPropertyValue('--avatar-bg')).toBe('')
      expect(el.style.getPropertyValue('--avatar-auto-bg')).not.toBe('')
    })
  })

  // ── 數字尺寸字級縮放 ──────────────────────────────────────────────────────────
  describe('numeric size font scaling', () => {
    it('scales the fallback font with numeric sizes (size × 0.5, aligned with md 20/40)', () => {
      const root = mountAvatar({ alt: 'a', size: 48 }).find('.base-avatar')
        .element as HTMLElement
      expect(root.style.getPropertyValue('--avatar-auto-font-size')).toBe('24px')
    })

    it('accepts numeric strings for font scaling', () => {
      const root = mountAvatar({ alt: 'a', size: '64' }).find('.base-avatar')
        .element as HTMLElement
      expect(root.style.getPropertyValue('--avatar-auto-font-size')).toBe('32px')
    })

    it('does not inject the auto font var for named sizes (tokens stay in charge)', () => {
      const root = mountAvatar({ alt: 'a', size: 'lg' }, { default: () => 'A' }).find('.base-avatar')
        .element as HTMLElement
      expect(root.style.getPropertyValue('--avatar-auto-font-size')).toBe('')
    })
  })

  // ── a11y dev warning ──────────────────────────────────────────────────────────
  describe('dev warning for missing alt', () => {
    it('warns when src is set without alt', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountAvatar({ src: '/a.jpg' })
      expect(spy).toHaveBeenCalled()
    })

    it('does not warn for decorative alt="" or when alt is given', () => {
      const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      mountAvatar({ src: '/a.jpg', alt: '' })
      mountAvatar({ src: '/a.jpg', alt: 'Alex' })
      mountAvatar({ alt: undefined }) // 無 src 不該警告
      expect(spy).not.toHaveBeenCalled()
    })
  })
})
