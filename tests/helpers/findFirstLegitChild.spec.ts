import { describe, it, expect } from 'vitest'
import { Comment, Fragment, Text, createVNode, h } from 'vue'

import findFirstLegitChild from '~/helpers/findFirstLegitChild'

const comment = () => createVNode(Comment, null, 'if')
const text = (content: string) => createVNode(Text, null, content)
const fragment = (children: unknown[]) => createVNode(Fragment, null, children as never)

describe('findFirstLegitChild', () => {
  it('undefined / 全空陣列回傳 null', () => {
    expect(findFirstLegitChild(undefined)).toBeNull()
    expect(findFirstLegitChild([])).toBeNull()
  })

  it('回傳第一個一般元素，並跳過前面的註解節點', () => {
    const button = h('button')
    expect(findFirstLegitChild([comment(), button])).toBe(button)
  })

  it('純文字包成可聚焦的 span[role=button]', () => {
    const found = findFirstLegitChild([text('hi')])
    expect(found?.type).toBe('span')
    expect(found?.props?.role).toBe('button')
    expect(found?.props?.tabindex).toBe(0)
  })

  it('Fragment 往內遞迴取得第一個合法節點', () => {
    const button = h('button')
    expect(findFirstLegitChild([fragment([comment(), button])])).toBe(button)
  })

  it('空 Fragment（如 v-for 空陣列）不終止搜尋，繼續掃後續兄弟節點', () => {
    const button = h('button')
    expect(findFirstLegitChild([fragment([]), button])).toBe(button)
  })

  it('Fragment 內全是註解時也繼續掃後續兄弟節點', () => {
    const button = h('button')
    expect(findFirstLegitChild([fragment([comment(), comment()]), button])).toBe(button)
  })

  it('整組都不合法（註解 + 空 Fragment）回傳 null', () => {
    expect(findFirstLegitChild([comment(), fragment([comment()])])).toBeNull()
  })
})
