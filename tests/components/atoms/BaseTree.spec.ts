import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BaseTree from '~/components/atoms/BaseTree.vue'
import type { BaseTreeNode } from '~/components/atoms/BaseTree.vue'

const nodes: BaseTreeNode[] = [
  { key: 1, label: 'Fruits', children: [
    { key: 11, label: 'Apple' },
    { key: 12, label: 'Banana' },
  ] },
  { key: 2, label: 'Veggies', children: [
    { key: 21, label: 'Carrot' },
  ] },
]

function itemWith(w: ReturnType<typeof mount>, text: string) {
  return w.findAll('.base-tree__item').find((li) => li.text().includes(text))!
}

describe('BaseTree — skeleton', () => {
  it('renders role="tree" with top-level items collapsed by default', () => {
    const w = mount(BaseTree, { props: { nodes }, attachTo: document.body })
    expect(w.find('ul.base-tree').attributes('role')).toBe('tree')
    expect(w.findAll('.base-tree__item')).toHaveLength(2)
    w.unmount()
  })

  it('expands a node on toggle click, revealing children', async () => {
    const w = mount(BaseTree, { props: { nodes }, attachTo: document.body })
    await w.findAll('.base-tree__toggle')[0].trigger('click')
    expect(w.findAll('.base-tree__item')).toHaveLength(4)
    expect(w.emitted('update:expanded')!.at(-1)![0]).toContain(1)
    w.unmount()
  })

  it('defaultExpandAll expands every parent initially', () => {
    const w = mount(BaseTree, { props: { nodes, defaultExpandAll: true }, attachTo: document.body })
    expect(w.findAll('.base-tree__item')).toHaveLength(5)
    w.unmount()
  })
})

describe('BaseTree — selection', () => {
  it('selects a node on label click and marks aria-selected', async () => {
    const w = mount(BaseTree, { props: { nodes, defaultExpandAll: true }, attachTo: document.body })
    const apple = itemWith(w, 'Apple')
    await apple.find('.base-tree__label').trigger('click')
    expect(w.emitted('update:selected')!.at(-1)![0]).toBe(11)
    expect(apple.attributes('aria-selected')).toBe('true')
    w.unmount()
  })

  it('does not select disabled nodes', async () => {
    const withDisabled: BaseTreeNode[] = [{ key: 1, label: 'X', disabled: true }]
    const w = mount(BaseTree, { props: { nodes: withDisabled }, attachTo: document.body })
    await w.find('.base-tree__label').trigger('click')
    expect(w.emitted('update:selected')).toBeFalsy()
    w.unmount()
  })
})

describe('BaseTree — checkbox linkage', () => {
  it('checking a parent checks all children', async () => {
    const w = mount(BaseTree, { props: { nodes, checkable: true, defaultExpandAll: true }, attachTo: document.body })
    await itemWith(w, 'Fruits').find('input[type="checkbox"]').setValue(true)
    const keys = w.emitted('update:checked')!.at(-1)![0] as number[]
    expect(keys).toEqual(expect.arrayContaining([11, 12]))
    w.unmount()
  })

  it('parent is indeterminate when only some children are checked', () => {
    const w = mount(BaseTree, {
      props: { nodes, checkable: true, defaultExpandAll: true, checked: [11] },
      attachTo: document.body,
    })
    const cb = itemWith(w, 'Fruits').find('input[type="checkbox"]').element as HTMLInputElement
    expect(cb.indeterminate).toBe(true)
    w.unmount()
  })

  it('checkStrictly leaves parent/child independent', async () => {
    const w = mount(BaseTree, {
      props: { nodes, checkable: true, checkStrictly: true, defaultExpandAll: true },
      attachTo: document.body,
    })
    await itemWith(w, 'Fruits').find('input[type="checkbox"]').setValue(true)
    const keys = w.emitted('update:checked')!.at(-1)![0] as number[]
    expect(keys).toEqual([1])
    w.unmount()
  })
})

describe('BaseTree — lazy', () => {
  it('loads children on first expand via load()', async () => {
    const roots: BaseTreeNode[] = [{ key: 1, label: 'Root' }]
    const load = async (node: BaseTreeNode): Promise<BaseTreeNode[]> =>
      [{ key: 11, label: 'Child of ' + node.label, isLeaf: true }]
    const w = mount(BaseTree, { props: { nodes: roots, lazy: true, load }, attachTo: document.body })
    await w.find('.base-tree__toggle').trigger('click')
    await nextTick(); await nextTick()
    expect(w.findAll('.base-tree__item')).toHaveLength(2)
    expect(w.text()).toContain('Child of Root')
    w.unmount()
  })
})

describe('BaseTree — keyboard a11y', () => {
  it('has a single roving tabindex=0 item', () => {
    const w = mount(BaseTree, { props: { nodes }, attachTo: document.body })
    const zeros = w.findAll('.base-tree__item').filter((li) => li.attributes('tabindex') === '0')
    expect(zeros).toHaveLength(1)
    w.unmount()
  })

  it('ArrowRight expands a collapsed parent', async () => {
    const w = mount(BaseTree, { props: { nodes }, attachTo: document.body })
    await w.findAll('.base-tree__item')[0].trigger('keydown', { key: 'ArrowRight' })
    expect(w.emitted('update:expanded')!.at(-1)![0]).toContain(1)
    w.unmount()
  })

  it('exposes getCheckedKeys', () => {
    const w = mount(BaseTree, { props: { nodes, checkable: true, checked: [11] }, attachTo: document.body })
    expect((w.vm as unknown as { getCheckedKeys: () => number[] }).getCheckedKeys()).toContain(11)
    w.unmount()
  })
})

// ── roving tabindex 在收合後仍有效 (C1-3 regression) ──────────────────────────────
// activeFocusKey 過去只看 focusedKey，未檢查它是否仍可見；聚焦節點被收合後所有 treeitem
// 都變 tabindex=-1，鍵盤永遠 Tab 不進來。修正後會退回第一個可見節點。
describe('BaseTree — roving tabindex survives collapse (C1-3 regression)', () => {
  it('聚焦節點被收合後，仍恰有一個可見 treeitem 保持 tabindex=0', async () => {
    const w = mount(BaseTree, { props: { nodes, defaultExpandAll: true }, attachTo: document.body })
    // 鍵盤下移，把 focusedKey 設到第一個父的子節點（Apple, key 11）
    await w.find('.base-tree__item').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    // 收合全部：先前聚焦的子節點不再可見
    ;(w.vm as unknown as { collapseAll: () => void }).collapseAll()
    await nextTick()
    const focusable = w.findAll('.base-tree__item').filter((i) => i.attributes('tabindex') === '0')
    expect(focusable).toHaveLength(1)
    w.unmount()
  })
})
