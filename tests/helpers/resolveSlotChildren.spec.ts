import { describe, it, expect } from 'vitest'
import {
  createCommentVNode,
  createTextVNode,
  defineComponent,
  Fragment,
  h,
} from 'vue'

import resolveSlotChildren from '~/helpers/resolveSlotChildren'

// 元件型節點（物件型 type）才會被保留；用一個最小元件當測試對象。
const Dummy = defineComponent({ name: 'Dummy', render: () => null })

describe('resolveSlotChildren', () => {
  it('returns null for undefined', () => {
    expect(resolveSlotChildren(undefined)).toBeNull()
  })

  it('keeps component vnodes, drops native elements / text / comment / raw strings', () => {
    const a = h(Dummy)
    const b = h(Dummy)
    const res = resolveSlotChildren([
      a,
      h('div'), // 原生元素（字串型 type）→ 丟棄
      createTextVNode('text'), // 文字 → 丟棄
      createCommentVNode('v-if'), // 註解 → 丟棄
      'raw string', // 原始字串 → 丟棄
      b,
    ])

    expect(res).toHaveLength(2)
    expect(res?.[0]).toBe(a)
    expect(res?.[1]).toBe(b)
  })

  it('flattens a fragment and drops noise inside it (v-if-false-in-v-for case)', () => {
    const a = h(Dummy)
    const b = h(Dummy)
    // 模擬 <Cmp v-for> 中夾帶 v-if=false：Fragment children 內含註解佔位。
    const fragment = h(Fragment, [a, createCommentVNode('v-if false'), b])

    const res = resolveSlotChildren([fragment])

    expect(res).toHaveLength(2)
  })

  it('flattens nested fragments recursively', () => {
    const a = h(Dummy)
    const outer = h(Fragment, [h(Fragment, [a])])

    expect(resolveSlotChildren([outer])).toHaveLength(1)
  })
})
