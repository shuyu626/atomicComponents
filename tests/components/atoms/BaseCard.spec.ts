import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseCard from '~/components/atoms/BaseCard.vue'

function mountCard(
  props: Record<string, unknown> = {},
  slots: Record<string, unknown> = { default: () => 'Body' },
) {
  return mount(BaseCard, { props, slots })
}

const rootOf = (w: ReturnType<typeof mountCard>) => w.find('.base-card')

describe('BaseCard', () => {
  // ── 根元素（as）────────────────────────────────────────────────────────────────
  describe('root element', () => {
    it('renders a <div> by default', () => {
      expect(rootOf(mountCard()).element.tagName).toBe('DIV')
    })

    it('renders a <section> / <article> via the as prop', () => {
      expect(rootOf(mountCard({ as: 'section' })).element.tagName).toBe('SECTION')
      expect(rootOf(mountCard({ as: 'article' })).element.tagName).toBe('ARTICLE')
    })
  })

  // ── variant ─────────────────────────────────────────────────────────────────────
  describe('variant', () => {
    it('defaults to elevated', () => {
      expect(rootOf(mountCard()).classes()).toContain('base-card--elevated')
    })

    it('reflects outlined / filled', () => {
      expect(rootOf(mountCard({ variant: 'outlined' })).classes()).toContain('base-card--outlined')
      expect(rootOf(mountCard({ variant: 'filled' })).classes()).toContain('base-card--filled')
    })
  })

  // ── padding ───────────────────────────────────────────────────────────────────
  describe('padding', () => {
    it('defaults to md', () => {
      expect(rootOf(mountCard()).classes()).toContain('base-card--padding-md')
    })

    it('reflects none / sm / lg', () => {
      expect(rootOf(mountCard({ padding: 'none' })).classes()).toContain('base-card--padding-none')
      expect(rootOf(mountCard({ padding: 'sm' })).classes()).toContain('base-card--padding-sm')
      expect(rootOf(mountCard({ padding: 'lg' })).classes()).toContain('base-card--padding-lg')
    })
  })

  // ── hoverable ───────────────────────────────────────────────────────────────────
  describe('hoverable', () => {
    it('is off by default', () => {
      expect(rootOf(mountCard()).classes()).not.toContain('base-card--hoverable')
    })

    it('adds the modifier when enabled', () => {
      expect(rootOf(mountCard({ hoverable: true })).classes()).toContain('base-card--hoverable')
    })
  })

  // ── slots / 區段 ────────────────────────────────────────────────────────────────
  describe('sections', () => {
    it('renders the default slot inside __body', () => {
      const w = mountCard({}, { default: () => 'Hello body' })
      expect(w.find('.base-card__body').exists()).toBe(true)
      expect(w.find('.base-card__body').text()).toBe('Hello body')
    })

    it('renders media / header / footer only when their slots are provided', () => {
      const bare = mountCard()
      expect(bare.find('.base-card__media').exists()).toBe(false)
      expect(bare.find('.base-card__header').exists()).toBe(false)
      expect(bare.find('.base-card__footer').exists()).toBe(false)

      const full = mountCard({}, {
        media: () => '<img src="x.png" alt="">',
        header: () => 'Title',
        default: () => 'Body',
        footer: () => 'Actions',
      })
      expect(full.find('.base-card__media').exists()).toBe(true)
      expect(full.find('.base-card__header').text()).toBe('Title')
      expect(full.find('.base-card__body').text()).toBe('Body')
      expect(full.find('.base-card__footer').text()).toBe('Actions')
    })

    it('omits the body when no default slot is given', () => {
      const w = mountCard({}, { header: () => 'Only header' })
      expect(w.find('.base-card__body').exists()).toBe(false)
      expect(w.find('.base-card__header').exists()).toBe(true)
    })

    it('keeps reading order media → header → body → footer', () => {
      const w = mountCard({}, {
        media: () => 'M',
        header: () => 'H',
        default: () => 'B',
        footer: () => 'F',
      })
      const sections = w.findAll('.base-card > *').map((el) =>
        el.classes().find((c) => c.startsWith('base-card__')),
      )
      expect(sections).toEqual([
        'base-card__media',
        'base-card__header',
        'base-card__body',
        'base-card__footer',
      ])
    })
  })
})
