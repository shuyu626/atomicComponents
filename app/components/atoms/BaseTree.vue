<template>
  <ul
    ref="treeRef"
    class="base-tree"
    role="tree"
    :aria-multiselectable="checkable || undefined"
  >
    <li
      v-for="flat in visible"
      :key="flat.node.key"
      class="base-tree__item"
      :class="{
        'base-tree__item--selected': selectable && selected === flat.node.key,
        'base-tree__item--disabled': disabled || flat.node.disabled,
      }"
      role="treeitem"
      :data-key="flat.node.key"
      :aria-level="flat.level + 1"
      :aria-expanded="flat.hasChildren ? flat.expanded : undefined"
      :aria-selected="selectable ? (selected === flat.node.key) : undefined"
      :aria-checked="ariaChecked(flat.node)"
      :aria-disabled="(disabled || flat.node.disabled) || undefined"
      :tabindex="flat.node.key === activeFocusKey ? 0 : -1"
      :style="{ paddingInlineStart: `${flat.level * indent + 8}px` }"
      @click="onItemClick(flat)"
      @keydown="onKeydown($event, flat)"
    >
      <button
        v-if="flat.hasChildren"
        type="button"
        class="base-tree__toggle"
        :class="{ 'base-tree__toggle--expanded': flat.expanded }"
        tabindex="-1"
        :aria-label="flat.expanded ? '收合' : '展開'"
        @click.stop="toggleExpand(flat.node)"
      >
        <BaseSpinner
          v-if="loadingKeys.has(flat.node.key)"
          size="sm"
        />
        <svg
          v-else
          class="base-tree__chevron"
          viewBox="0 0 24 24"
          width="16"
          height="16"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M9 6l6 6-6 6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span
        v-else
        class="base-tree__spacer"
        aria-hidden="true"
      />

      <BaseCheckbox
        v-if="checkable"
        class="base-tree__checkbox"
        :model-value="isChecked(flat.node)"
        :indeterminate="isIndeterminate(flat.node)"
        :disabled="disabled || flat.node.disabled"
        @update:model-value="(value) => onCheck(flat.node, value === true)"
        @click.stop
      />

      <span
        v-if="$slots.icon"
        class="base-tree__icon"
      >
        <slot
          name="icon"
          :node="flat.node"
          :expanded="flat.expanded"
        />
      </span>

      <span class="base-tree__label">
        <slot
          name="node"
          :node="flat.node"
          :level="flat.level"
          :expanded="flat.expanded"
          :checked="isChecked(flat.node)"
          :selected="selected === flat.node.key"
        >{{ flat.node.label }}</slot>
      </span>
    </li>

    <li
      v-if="!visible.length"
      class="base-tree__empty"
    >
      <slot name="empty">無資料</slot>
    </li>
  </ul>
</template>

<script lang="ts">
/** 節點 key 型別（需唯一）。 */
export type BaseTreeKey = string | number

/** 樹節點。 */
export interface BaseTreeNode {
  /** 唯一 key。 */
  key: BaseTreeKey
  /** 顯示文字。 */
  label: string
  /** 子節點。 */
  children?: BaseTreeNode[]
  /** 停用（不可選 / 不可勾 / 不參與級聯）。 */
  disabled?: boolean
  /** lazy 模式標記為葉節點（不顯示展開箭頭、不觸發 load）。 */
  isLeaf?: boolean
}
</script>

<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'

import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import BaseSpinner from '~/components/atoms/BaseSpinner.vue'

export interface BaseTreeProps {
  /** 樹資料。 @default [] */
  nodes?: BaseTreeNode[]
  /** 單選高亮 current（`v-model:selected`）。 @default true */
  selectable?: boolean
  /** 顯示 checkbox（`v-model:checked`）。 @default false */
  checkable?: boolean
  /** true 時父子勾選不連動。 @default false */
  checkStrictly?: boolean
  /** 初始展開所有父節點（非受控預設）。 @default false */
  defaultExpandAll?: boolean
  /** 動態載入子節點。 @default false */
  lazy?: boolean
  /** lazy 載入器：展開未載入的非葉節點時呼叫,回傳其子節點。 */
  load?: (node: BaseTreeNode) => Promise<BaseTreeNode[]>
  /** 全域停用。 @default false */
  disabled?: boolean
  /** 每層縮排（px）。 @default 18 */
  indent?: number
}

const props = withDefaults(defineProps<BaseTreeProps>(), {
  nodes: () => [],
  selectable: true,
  checkable: false,
  checkStrictly: false,
  defaultExpandAll: false,
  lazy: false,
  load: undefined,
  disabled: false,
  indent: 18,
})

defineSlots<{
  /** 自訂節點內容,取代 label。scoped props：`node`、`level`、`expanded`、`checked`、`selected`。 */
  node?: (props: { node: BaseTreeNode; level: number; expanded: boolean; checked: boolean; selected: boolean }) => unknown
  /** 節點前的 icon。scoped props：`node`、`expanded`。 */
  icon?: (props: { node: BaseTreeNode; expanded: boolean }) => unknown
  /** 無資料時的內容。 */
  empty?: () => unknown
}>()

/** 展開中的 key（具名 v-model）。 */
const expanded = defineModel<BaseTreeKey[]>('expanded', { default: () => [] })
/** 選取的 key（具名 v-model,單選）。 */
const selected = defineModel<BaseTreeKey | undefined>('selected')
/** 勾選的 key（具名 v-model）。 */
const checked = defineModel<BaseTreeKey[]>('checked', { default: () => [] })

const treeRef = ref<HTMLUListElement | null>(null)

// lazy 載入的子節點快取 / 已載入 / 載入中 key。
const lazyChildren = reactive(new Map<BaseTreeKey, BaseTreeNode[]>())
const loadedKeys = reactive(new Set<BaseTreeKey>())
const loadingKeys = reactive(new Set<BaseTreeKey>())

// ── 節點解析 ────────────────────────────────────────────────────────────────
function resolveChildren(node: BaseTreeNode): BaseTreeNode[] {
  if (props.lazy) {
    const cached = lazyChildren.get(node.key)
    if (cached) return cached
  }
  return node.children ?? []
}

function hasChildren(node: BaseTreeNode): boolean {
  if (props.lazy) {
    if (node.isLeaf) return false
    const cached = lazyChildren.get(node.key)
    if (cached) return cached.length > 0
    // 尚未載入的非葉節點:顯示展開箭頭。
    return !node.children?.length ? true : node.children.length > 0
  }
  return !!node.children?.length
}

/** key → node、key → parentKey 對照（含 lazy 已載入的子節點）。 */
const maps = computed(() => {
  const nodeMap = new Map<BaseTreeKey, BaseTreeNode>()
  const parentMap = new Map<BaseTreeKey, BaseTreeKey | undefined>()
  const walk = (list: BaseTreeNode[], parent?: BaseTreeKey) => {
    for (const node of list) {
      nodeMap.set(node.key, node)
      parentMap.set(node.key, parent)
      const children = resolveChildren(node)
      if (children.length) walk(children, node.key)
    }
  }
  walk(props.nodes)
  return { nodeMap, parentMap }
})

interface FlatNode {
  node: BaseTreeNode
  level: number
  hasChildren: boolean
  expanded: boolean
}

const expandedSet = computed(() => new Set(expanded.value))

/** 扁平化的可見節點清單（依展開狀態遞迴展平）。 */
const visible = computed<FlatNode[]>(() => {
  const out: FlatNode[] = []
  const walk = (list: BaseTreeNode[], level: number) => {
    for (const node of list) {
      const hc = hasChildren(node)
      const isExpanded = expandedSet.value.has(node.key)
      out.push({ node, level, hasChildren: hc, expanded: isExpanded })
      if (hc && isExpanded) {
        const children = resolveChildren(node)
        if (children.length) walk(children, level + 1)
      }
    }
  }
  walk(props.nodes, 0)
  return out
})

function allParentKeys(): BaseTreeKey[] {
  const keys: BaseTreeKey[] = []
  const walk = (list: BaseTreeNode[]) => {
    for (const node of list) {
      const children = resolveChildren(node)
      if (children.length) {
        keys.push(node.key)
        walk(children)
      }
    }
  }
  walk(props.nodes)
  return keys
}

// 非受控且 defaultExpandAll:初始展開所有父節點。
if (props.defaultExpandAll && expanded.value.length === 0) {
  expanded.value = allParentKeys()
}

// ── 展開 / 收合 ─────────────────────────────────────────────────────────────
async function toggleExpand(node: BaseTreeNode) {
  if (props.disabled) return
  const set = new Set(expanded.value)

  if (set.has(node.key)) {
    set.delete(node.key)
    expanded.value = [...set]
    return
  }

  // 展開:lazy 且尚未載入的非葉節點 → 先 load。
  if (
    props.lazy
    && props.load
    && !node.isLeaf
    && !loadedKeys.has(node.key)
    && !node.children?.length
  ) {
    loadingKeys.add(node.key)
    try {
      const children = await props.load(node)
      lazyChildren.set(node.key, children)
      loadedKeys.add(node.key)
    }
    catch (error) {
      // 載入失敗:不展開、不標記 loaded(下次展開可重試),避免 unhandled rejection。
      if (import.meta.env.DEV) console.error('[BaseTree] lazy load failed', error)
      return
    }
    finally {
      loadingKeys.delete(node.key)
    }
  }

  set.add(node.key)
  expanded.value = [...set]
}

// ── 單選 ────────────────────────────────────────────────────────────────────
function onSelect(node: BaseTreeNode) {
  if (props.disabled || node.disabled || !props.selectable) return
  // 只有葉節點(最後一層)可被選取並顯示選取背景;父節點僅供展開 / 收合。
  if (hasChildren(node)) return
  selected.value = node.key
  focusedKey.value = node.key
}

/** 點列：有子節點 → 展開 / 收合(不顯示選取背景);葉節點 → 選取。點整列皆可觸發。 */
function onItemClick(flat: FlatNode) {
  if (props.disabled || flat.node.disabled) return
  // 同步鍵盤 roving 焦點,讓後續方向鍵從點擊處接續。
  focusedKey.value = flat.node.key
  if (flat.hasChildren) {
    toggleExpand(flat.node)
    return
  }
  onSelect(flat.node)
}

// ── Checkbox 連動 ──────────────────────────────────────────────────────────
const checkedSet = computed(() => new Set(checked.value))

/** 某節點的全部啟用子孫 key（含中間節點,供級聯用）。 */
function descendantKeys(node: BaseTreeNode): BaseTreeKey[] {
  const keys: BaseTreeKey[] = []
  const walk = (n: BaseTreeNode) => {
    for (const child of resolveChildren(n)) {
      if (!child.disabled) keys.push(child.key)
      walk(child)
    }
  }
  walk(node)
  return keys
}

type CheckState = 'checked' | 'indeterminate' | 'unchecked'

/**
 * 一次 bottom-up 走訪算出每個 key 的勾選狀態（葉看自身,父看子孫聚合）。
 * 預算成 map,讓 render 時每節點 O(1) 讀取,避免逐節點遞迴子樹的 O(n²)。
 */
const checkStateMap = computed(() => {
  const map = new Map<BaseTreeKey, CheckState>()
  const compute = (node: BaseTreeNode): CheckState => {
    const children = resolveChildren(node)
    let state: CheckState
    if (!children.length) {
      state = checkedSet.value.has(node.key) ? 'checked' : 'unchecked'
    }
    else {
      let allChecked = true
      let noneChecked = true
      for (const child of children) {
        const childState = compute(child)
        if (childState !== 'checked') allChecked = false
        if (childState !== 'unchecked') noneChecked = false
      }
      state = allChecked ? 'checked' : noneChecked ? 'unchecked' : 'indeterminate'
    }
    map.set(node.key, state)
    return state
  }
  for (const node of props.nodes) compute(node)
  return map
})

/** 依目前 checkedSet 推導節點勾選狀態（葉看自身,父看子孫聚合）。 */
function checkState(node: BaseTreeNode): CheckState {
  return checkStateMap.value.get(node.key) ?? 'unchecked'
}

/** 對局部 set 判斷是否「完全勾選」（供級聯後回算祖先）。 */
function isFullyChecked(node: BaseTreeNode, set: Set<BaseTreeKey>): boolean {
  const children = resolveChildren(node)
  if (!children.length) return set.has(node.key)
  return children.every((child) => isFullyChecked(child, set))
}

function isChecked(node: BaseTreeNode): boolean {
  return props.checkStrictly ? checkedSet.value.has(node.key) : checkState(node) === 'checked'
}

function isIndeterminate(node: BaseTreeNode): boolean {
  return !props.checkStrictly && checkState(node) === 'indeterminate'
}

function ariaChecked(node: BaseTreeNode): 'true' | 'false' | 'mixed' | undefined {
  if (!props.checkable) return undefined
  if (isIndeterminate(node)) return 'mixed'
  return isChecked(node) ? 'true' : 'false'
}

function onCheck(node: BaseTreeNode, value: boolean) {
  const set = new Set(checked.value)

  if (props.checkStrictly) {
    if (value) set.add(node.key)
    else set.delete(node.key)
    checked.value = [...set]
    return
  }

  // 級聯自身 + 啟用子孫。
  const targets = [node.key, ...descendantKeys(node)]
  for (const key of targets) {
    if (value) set.add(key)
    else set.delete(key)
  }

  // 回算祖先:所有子孫皆勾 → 祖先勾,否則移除。
  let parent = maps.value.parentMap.get(node.key)
  while (parent !== undefined) {
    const parentNode = maps.value.nodeMap.get(parent)
    if (parentNode) {
      if (isFullyChecked(parentNode, set)) set.add(parent)
      else set.delete(parent)
    }
    parent = maps.value.parentMap.get(parent)
  }

  checked.value = [...set]
}

// ── 鍵盤 roving ─────────────────────────────────────────────────────────────
const focusedKey = ref<BaseTreeKey | undefined>(undefined)
const activeFocusKey = computed(() => focusedKey.value ?? visible.value[0]?.node.key)

function focusItem(key: BaseTreeKey | undefined) {
  if (key == null) return
  focusedKey.value = key
  nextTick(() => {
    treeRef.value
      ?.querySelector<HTMLElement>(`.base-tree__item[data-key="${String(key)}"]`)
      ?.focus()
  })
}

function moveBy(delta: number) {
  const list = visible.value
  const current = list.findIndex((flat) => flat.node.key === activeFocusKey.value)
  const nextIndex = Math.min(Math.max(current + delta, 0), list.length - 1)
  focusItem(list[nextIndex]?.node.key)
}

function onKeydown(event: KeyboardEvent, flat: FlatNode) {
  const { node } = flat
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      moveBy(1)
      break
    case 'ArrowUp':
      event.preventDefault()
      moveBy(-1)
      break
    case 'Home':
      event.preventDefault()
      focusItem(visible.value[0]?.node.key)
      break
    case 'End':
      event.preventDefault()
      focusItem(visible.value[visible.value.length - 1]?.node.key)
      break
    case 'ArrowRight':
      event.preventDefault()
      if (flat.hasChildren && !flat.expanded) toggleExpand(node)
      else if (flat.hasChildren && flat.expanded) moveBy(1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (flat.hasChildren && flat.expanded) toggleExpand(node)
      else {
        const parent = maps.value.parentMap.get(node.key)
        if (parent != null) focusItem(parent)
      }
      break
    case 'Enter':
      event.preventDefault()
      // 與點擊一致:父節點展開 / 收合,葉節點選取。
      onItemClick(flat)
      break
    case ' ':
      if (props.checkable && !props.disabled && !node.disabled) {
        event.preventDefault()
        onCheck(node, !isChecked(node))
      }
      break
    default:
      break
  }
}

defineExpose({
  /** 展開所有父節點。 */
  expandAll: () => { expanded.value = allParentKeys() },
  /** 收合全部。 */
  collapseAll: () => { expanded.value = [] },
  /** 取得目前勾選的 key（複本）。 */
  getCheckedKeys: (): BaseTreeKey[] => [...checked.value],
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseTree — 樹狀檢視（單一檔案,扁平化可見清單）
 *
 * 內部把 nodes 依展開狀態展平成可見清單,渲染 <ul role="tree">,每列 <li role="treeitem">
 * 帶 aria-level / aria-expanded / aria-selected / aria-checked,縮排以 padding-inline-start。
 * checkbox 複用 BaseCheckbox(父子連動 / indeterminate);lazy 載入時複用 BaseSpinner。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-tree {
  // token
  --tree-accent: #1d4ed8;
  --tree-row-hover-bg: #f3f4f6;
  --tree-row-selected-bg: color-mix(in srgb, var(--tree-accent) 12%, transparent);
  --tree-row-height: 32px;
  --tree-color: #1f2937;

  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--tree-color);
  font-size: 0.875rem;

  &__item {
    display: flex;
    align-items: center;
    column-gap: 4px;
    min-height: var(--tree-row-height);
    padding-right: 8px;
    border-radius: 6px;
    outline: none;
    cursor: pointer;

    &:hover {
      background: var(--tree-row-hover-bg);
    }

    &:focus-visible {
      outline: 2px solid var(--tree-accent);
      outline-offset: -2px;
    }

    &--selected {
      background: var(--tree-row-selected-bg);
    }

    &--disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

    @media (pointer: coarse) {
      min-height: 44px;
    }
  }

  &__toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    padding: 0;
    color: #6b7280;
    background: transparent;
    border: 0;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
      color: #1f2937;
    }
  }

  &__chevron {
    transition: transform 0.15s ease;
  }

  &__toggle--expanded &__chevron,
  &__toggle--expanded .base-tree__chevron {
    transform: rotate(90deg);
  }

  &__spacer {
    display: inline-block;
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  &__checkbox {
    flex-shrink: 0;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    color: #6b7280;
  }

  &__label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    padding: 2px 4px;
    cursor: pointer;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__empty {
    padding: 12px;
    color: #9ca3af;
    text-align: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-tree__chevron {
    transition: none;
  }
}
</style>
