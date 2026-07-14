import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import { mount } from '@vue/test-utils'

import BaseSkeleton from '~/components/atoms/BaseSkeleton.vue'
import type { BaseSkeletonProps } from '~/components/atoms/BaseSkeleton.vue'

function mountSkeleton(props: BaseSkeletonProps = {}, slots = {}) {
  return mount(BaseSkeleton, { props, slots })
}

describe('BaseSkeleton', () => {
  // ── variant ──
  it('renders text variant by default', () => {
    expect(mountSkeleton().classes()).toContain('base-skeleton--text')
  })
  it.each(['text', 'circular', 'rectangular', 'rounded'] as const)(
    'applies variant class for %s',
    (variant) => {
      expect(mountSkeleton({ variant }).classes()).toContain(`base-skeleton--${variant}`)
    },
  )

  // ── size ──
  it('applies numeric width/height as px css vars', () => {
    const style = mountSkeleton({ width: 40, height: 40 }).attributes('style')
    expect(style).toContain('--skeleton-width: 40px')
    expect(style).toContain('--skeleton-height: 40px')
  })
  it('applies string width as-is', () => {
    expect(mountSkeleton({ width: '60%' }).attributes('style')).toContain('--skeleton-width: 60%')
  })
  it('omits size vars when not provided', () => {
    expect(mountSkeleton().attributes('style') ?? '').not.toContain('--skeleton-width')
  })

  // ── animation ──
  it('applies pulse animation class by default', () => {
    expect(mountSkeleton().classes()).toContain('base-skeleton--pulse')
  })
  it.each(['pulse', 'wave', 'none'] as const)('applies animation class for %s', (animation) => {
    expect(mountSkeleton({ animation }).classes()).toContain(`base-skeleton--${animation}`)
  })

  // ── loading / slot ──
  it('renders skeleton and hides slot content while loading', () => {
    const w = mountSkeleton({ loading: true }, { default: () => h('p', 'done') })
    expect(w.find('.base-skeleton').exists()).toBe(true)
    expect(w.find('p').exists()).toBe(false)
  })
  it('renders slot content without wrapper when loading=false', () => {
    const w = mountSkeleton({ loading: false }, { default: () => h('p', 'done') })
    expect(w.find('.base-skeleton').exists()).toBe(false)
    expect(w.find('p').text()).toBe('done')
  })
  it('renders nothing when loading=false and no slot', () => {
    expect(mountSkeleton({ loading: false }).html()).not.toContain('base-skeleton')
  })

  // ── a11y ──
  describe('a11y', () => {
    it('marks skeleton as aria-hidden', () => {
      expect(mountSkeleton().attributes('aria-hidden')).toBe('true')
    })
    it('exposes no role', () => {
      expect(mountSkeleton().attributes('role')).toBeUndefined()
    })
  })
})
