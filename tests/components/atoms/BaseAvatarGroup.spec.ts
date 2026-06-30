import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

import BaseAvatarGroup from '~/components/atoms/BaseAvatarGroup.vue'
import BaseAvatar from '~/components/atoms/BaseAvatar.vue'

/** 掛載群組並塞入 `count` 個 BaseAvatar。 */
function mountGroup(props: Record<string, unknown> = {}, count = 3) {
  return mount(BaseAvatarGroup, {
    props,
    slots: {
      default: () =>
        Array.from({ length: count }, (_, i) => h(BaseAvatar, { alt: `u${i}` })),
    },
  })
}

describe('BaseAvatarGroup', () => {
  it('exposes role="group" on the root', () => {
    expect(mountGroup({}, 2).find('.base-avatar-group').attributes('role')).toBe('group')
  })

  // ── max 裁切 + +N ─────────────────────────────────────────────────────────────
  describe('max / overflow', () => {
    it('renders every avatar and no +N when count <= max', () => {
      const w = mountGroup({ max: 3 }, 3)
      expect(w.findAll('.base-avatar')).toHaveLength(3)
      expect(w.text()).not.toContain('+')
    })

    it('caps at max and appends a +N counter', () => {
      const w = mountGroup({ max: 3 }, 5)
      // 3 個可見 + 1 個 +N
      expect(w.findAll('.base-avatar')).toHaveLength(4)
      expect(w.text()).toContain('+2')
    })

    it('clamps max < 1 to 1', () => {
      const w = mountGroup({ max: 0 }, 5)
      expect(w.findAll('.base-avatar')).toHaveLength(2) // 1 可見 + +4
      expect(w.text()).toContain('+4')
    })

    it('floors fractional max', () => {
      const w = mountGroup({ max: 2.5 }, 5)
      expect(w.findAll('.base-avatar')).toHaveLength(3) // 2 可見 + +3
      expect(w.text()).toContain('+3')
    })
  })

  // ── 統一覆寫尺寸 / 圓角 ────────────────────────────────────────────────────────
  describe('shared size / rounded', () => {
    it('overrides children size with the group size', () => {
      const first = mountGroup({ size: 'lg' }, 2).find('.base-avatar')
      expect(first.classes()).toContain('base-avatar--lg')
    })
  })

  // ── 堆疊層次 ──────────────────────────────────────────────────────────────────
  describe('stacking order', () => {
    it('assigns descending z-index so earlier avatars sit on top', () => {
      const avatars = mountGroup({ max: 5 }, 3).findAll('.base-avatar')
      const z = (i: number) =>
        Number((avatars[i]!.element as HTMLElement).style.zIndex)
      expect(z(0)).toBeGreaterThan(z(1))
      expect(z(1)).toBeGreaterThan(z(2))
    })
  })

  // ── 響應式（修正 computed → render function 的快取陷阱）─────────────────────────
  describe('reactivity', () => {
    it('reflects dynamically added children', async () => {
      const Parent = defineComponent({
        components: { BaseAvatarGroup, BaseAvatar },
        setup() {
          const items = ref([1, 2])
          return { items }
        },
        template: `
          <BaseAvatarGroup :max="10">
            <BaseAvatar v-for="i in items" :key="i" :alt="String(i)" />
          </BaseAvatarGroup>
        `,
      })

      const w = mount(Parent)
      expect(w.findAll('.base-avatar')).toHaveLength(2)

      ;(w.vm as unknown as { items: number[] }).items.push(3)
      await nextTick()

      expect(w.findAll('.base-avatar')).toHaveLength(3)
    })
  })

  // ── cloneVNode key（沿用原 key，動態清單 diff 不誤 patch）────────────────────
  describe('keyed children diffing', () => {
    it('keeps each avatar bound to its key when the list reorders', async () => {
      const Parent = defineComponent({
        components: { BaseAvatarGroup, BaseAvatar },
        setup() {
          const items = ref([
            { id: 'a', src: '/a.jpg', alt: 'A' },
            { id: 'b', src: '/b.jpg', alt: 'B' },
          ])
          return { items }
        },
        template: `
          <BaseAvatarGroup :max="10">
            <BaseAvatar v-for="it in items" :key="it.id" :src="it.src" :alt="it.alt" />
          </BaseAvatarGroup>
        `,
      })

      const w = mount(Parent)
      // 讓 A（index 0）的圖片載入失敗，進入 fallback（不再有 <img>）
      await w.findAll('img')[0]!.trigger('error')
      expect(w.findAll('img').map((i) => i.attributes('alt'))).toEqual(['B'])

      // 反轉清單：key 沿用原 vnode key，A 的 error 狀態應跟著 key 移動到 index 1，
      // 仍只有 B 有 <img>。若 key 退化成 index，A 的舊 instance 會收到 B 的 src、
      // 重置 error 而錯誤地顯示出兩張 <img>。
      ;(w.vm as unknown as { items: { id: string }[] }).items.reverse()
      await nextTick()
      expect(w.findAll('img').map((i) => i.attributes('alt'))).toEqual(['B'])
    })
  })

  it('renders nothing for an empty default slot', () => {
    const w = mount(BaseAvatarGroup, { slots: { default: () => [] } })
    expect(w.findAll('.base-avatar')).toHaveLength(0)
  })
})
