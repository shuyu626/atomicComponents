import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseTree from '~/components/atoms/BaseTree.vue'
import type { BaseTreeKey, BaseTreeNode } from '~/components/atoms/BaseTree.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseTree 是單一檔案的樹狀檢視:內部把 nodes 依展開狀態展平成可見清單,渲染
// <ul role="tree">。支援展開 / 收合、單選高亮、checkbox 父子連動(indeterminate)、
// checkStrictly、defaultExpandAll、lazy 動態載入。三個具名 v-model:expanded / selected /
// checked。checkbox 複用 BaseCheckbox,lazy 複用 BaseSpinner。

const WRAP = (inner: string) =>
  `<div style="max-width:360px;padding:24px;font-family:system-ui">${inner}</div>`

const sample: BaseTreeNode[] = [
  { key: 1, label: '前端', children: [
    { key: 11, label: 'Vue', children: [
      { key: 111, label: 'Composition API' },
      { key: 112, label: 'Options API' },
    ] },
    { key: 12, label: 'React' },
  ] },
  { key: 2, label: '後端', children: [
    { key: 21, label: 'Node.js' },
    { key: 22, label: 'Go' },
  ] },
  { key: 3, label: '設計' },
]

const meta = {
  title: 'Atoms/BaseTree',
  component: BaseTree,
  tags: ['autodocs'],
  argTypes: {
    nodes: { control: { type: 'object' }, description: '樹資料 `BaseTreeNode[]`' },
    selectable: { control: { type: 'boolean' }, description: '單選高亮(v-model:selected)。預設 true' },
    checkable: { control: { type: 'boolean' }, description: '顯示 checkbox(v-model:checked)。預設 false' },
    checkStrictly: { control: { type: 'boolean' }, description: 'true 時父子不連動。預設 false' },
    defaultExpandAll: { control: { type: 'boolean' }, description: '初始展開所有父節點。預設 false' },
    lazy: { control: { type: 'boolean' }, description: '動態載入子節點。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '全域停用。預設 false' },
    indent: { control: { type: 'number' }, description: '每層縮排(px)。預設 18' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    nodes: sample,
    selectable: true,
    checkable: false,
    defaultExpandAll: false,
    indent: 18,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseTree },
    setup() {
      const expanded = ref<BaseTreeKey[]>([1])
      const selected = ref<BaseTreeKey>()
      const checked = ref<BaseTreeKey[]>([])
      return { args, expanded, selected, checked }
    },
    template: WRAP(`
      <BaseTree v-bind="args" v-model:expanded="expanded" v-model:selected="selected" v-model:checked="checked" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">selected: {{ selected }} · checked: {{ checked }}</p>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic —— 展開 / 收合
// ─────────────────────────────────────────────────────────────────────────────

export const Basic: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      return { sample, expanded: ref<BaseTreeKey[]>([1, 11]) }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" v-model:expanded="expanded" />
    `),
  }),
  parameters: {
    docs: { description: { story: '點箭頭展開 / 收合;`v-model:expanded` 綁展開中的 key 陣列。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Selectable —— 單選高亮
// ─────────────────────────────────────────────────────────────────────────────

export const Selectable: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      const selected = ref<BaseTreeKey>(111)
      return { sample, selected, expanded: ref<BaseTreeKey[]>([1, 11]) }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" v-model:expanded="expanded" v-model:selected="selected" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">selected: {{ selected }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '點 label 高亮該節點並更新 `v-model:selected`(單一 key)。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkable —— checkbox 父子連動
// ─────────────────────────────────────────────────────────────────────────────

export const Checkable: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      const checked = ref<BaseTreeKey[]>([112])
      return { sample, checked, expanded: ref<BaseTreeKey[]>([1, 11, 2]) }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" checkable v-model:expanded="expanded" v-model:checked="checked" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">checked: {{ checked }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`checkable`:勾父級聯所有子;部分子勾時父顯示 indeterminate(半選)。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CheckStrictly —— 父子獨立
// ─────────────────────────────────────────────────────────────────────────────

export const CheckStrictly: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      return { sample, checked: ref<BaseTreeKey[]>([]), expanded: ref<BaseTreeKey[]>([1, 11]) }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" checkable check-strictly v-model:expanded="expanded" v-model:checked="checked" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`checkStrictly`:勾選不級聯,父子各自獨立。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// DefaultExpandAll
// ─────────────────────────────────────────────────────────────────────────────

export const DefaultExpandAll: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      return { sample }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" default-expand-all />
    `),
  }),
  parameters: {
    docs: { description: { story: '`defaultExpandAll`:初始展開所有父節點。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Lazy —— 動態載入
// ─────────────────────────────────────────────────────────────────────────────

export const Lazy: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      const roots: BaseTreeNode[] = [
        { key: 'a', label: '節點 A' },
        { key: 'b', label: '節點 B' },
      ]
      let seq = 0
      const load = (node: BaseTreeNode): Promise<BaseTreeNode[]> =>
        new Promise((resolve) => {
          setTimeout(() => {
            seq += 1
            resolve([
              { key: `${node.key}-1`, label: `${node.label} / 子 ${seq}`, isLeaf: true },
              { key: `${node.key}-2`, label: `${node.label} / 子 ${seq + 1}`, isLeaf: true },
            ])
          }, 600)
        })
      return { roots, load }
    },
    template: WRAP(`
      <BaseTree :nodes="roots" lazy :load="load" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`lazy` + `load`:展開時才呼叫 `load(node)`,載入中顯示 inline spinner,結果快取。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomNode —— #node slot
// ─────────────────────────────────────────────────────────────────────────────

export const CustomNode: Story = {
  render: () => ({
    components: { BaseTree },
    setup() {
      return { sample, expanded: ref<BaseTreeKey[]>([1, 11]) }
    },
    template: WRAP(`
      <BaseTree :nodes="sample" v-model:expanded="expanded">
        <template #node="{ node }">
          <span style="display:inline-flex;align-items:center;gap:6px">
            <span style="width:6px;height:6px;border-radius:50%;background:#1d4ed8"></span>
            {{ node.label }}
          </span>
        </template>
      </BaseTree>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#node` 自訂節點內容(scoped props:`node` / `level` / `expanded` / `checked` / `selected`)。' } },
  },
}
