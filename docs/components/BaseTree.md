# BaseTree

樹狀檢視。單一檔案:內部把 `nodes` 依展開狀態展平成可見清單,渲染 `<ul role="tree">`,每列 `<li role="treeitem">` 帶 `aria-level` / `aria-expanded` / `aria-selected` / `aria-checked`,縮排以 `padding-inline-start`。Checkbox 複用 `BaseCheckbox`(父子連動 / indeterminate);lazy 載入複用 `BaseSpinner`。

## 節點型別

```ts
export type BaseTreeKey = string | number

export interface BaseTreeNode {
  key: BaseTreeKey          // 唯一
  label: string
  children?: BaseTreeNode[]
  disabled?: boolean        // 不可選 / 不可勾 / 不參與級聯
  isLeaf?: boolean          // lazy 模式標記葉節點(無展開箭頭)
}
```

## Props

| prop | 型別 | 預設 | 說明 |
|---|---|---|---|
| `nodes` | `BaseTreeNode[]` | `[]` | 樹資料 |
| `selectable` | `boolean` | `true` | 單選高亮 current(`v-model:selected`);**僅葉節點可被選取**,父節點點擊只切換展開 / 收合 |
| `checkable` | `boolean` | `false` | 顯示 checkbox(`v-model:checked`) |
| `checkStrictly` | `boolean` | `false` | true 時父子勾選不連動 |
| `defaultExpandAll` | `boolean` | `false` | 初始展開所有父節點(非受控預設) |
| `lazy` | `boolean` | `false` | 動態載入子節點 |
| `load` | `(node) => Promise<BaseTreeNode[]>` | — | lazy 載入器 |
| `disabled` | `boolean` | `false` | 全域停用 |
| `indent` | `number`(px) | `18` | 每層縮排 |

## v-model(全部具名)

| model | 型別 | 說明 |
|---|---|---|
| `v-model:expanded` | `BaseTreeKey[]` | 展開中的 key |
| `v-model:selected` | `BaseTreeKey \| undefined` | 選取的 key(單選) |
| `v-model:checked` | `BaseTreeKey[]` | 勾選的 key(非 strict 時含完全勾選的父節點) |

```vue
<script setup lang="ts">
import { ref } from 'vue'
import type { BaseTreeKey, BaseTreeNode } from '~/components/atoms/BaseTree.vue'

const nodes: BaseTreeNode[] = [/* ... */]
const expanded = ref<BaseTreeKey[]>([])
const selected = ref<BaseTreeKey>()
const checked = ref<BaseTreeKey[]>([])
</script>

<template>
  <BaseTree
    :nodes="nodes"
    checkable
    v-model:expanded="expanded"
    v-model:selected="selected"
    v-model:checked="checked"
  />
</template>
```

## Slots

| slot | scoped props | 說明 |
|---|---|---|
| `node` | `{ node, level, expanded, checked, selected }` | 自訂節點內容,取代 label |
| `icon` | `{ node, expanded }` | 節點前的 icon |
| `empty` | — | 無資料時的內容 |

## Expose

| 方法 | 說明 |
|---|---|
| `expandAll()` | 展開所有父節點 |
| `collapseAll()` | 收合全部 |
| `getCheckedKeys()` | 取得目前勾選的 key(複本) |

## 行為

- **展開 / 收合**:點箭頭切換;`defaultExpandAll` 初始展開所有父節點。
- **單選**:`selectable` 時**只有葉節點可被選取**——點葉節點高亮並更新 `v-model:selected`;點父節點僅切換展開 / 收合,**不會**更新 `v-model:selected`;停用節點不可選。
- **Checkbox 連動**:勾父 → 級聯所有啟用子孫;部分子勾 → 父 `indeterminate`;子變動回算祖先。`checkStrictly` 關閉級聯。
- **Lazy**:`lazy` + `load` 時,展開未載入的非葉節點會呼叫 `load(node)`,期間顯示 inline spinner,結果快取。
- **Lazy × Checkbox 邊界**:`lazy` 且**尚未載入子節點**的父節點,勾選時視為葉節點——只勾選自己、不級聯;之後展開載入子節點,已勾選狀態**不會**自動下推到新載入的子節點(父節點會因「子孫未全勾」回算為未勾 / indeterminate)。需要載入後同步時,由 caller 在 `load` resolve 後自行更新 `v-model:checked`。

## A11y

- `<ul role="tree">` / `<li role="treeitem">`,帶 `aria-level` / `aria-expanded` / `aria-selected` / `aria-checked`。
- Roving tabindex(可見清單上恰一個 `tabindex=0`),鍵盤:

| 按鍵 | 行為 |
|---|---|
| ↑ / ↓ | 上 / 下一個可見節點 |
| → | 收合中的父 → 展開;已展開 → 進第一個子 |
| ← | 已展開 → 收合;否則 → 回父節點 |
| Home / End | 第一 / 最後可見節點 |
| Enter | 葉節點 → 選取(selectable);父節點 → 展開 / 收合 |
| Space | 切換 checkbox(checkable) |

## 反模式

- ❌ 用遞迴子元件堆疊(本元件用資料扁平化,單檔、效能友善)。
- ❌ 用 `index` 當 key(節點用穩定的 `key` 欄位)。

## 主題化 token

`--tree-accent`(選取底色 / 焦點)、`--tree-row-hover-bg`、`--tree-row-selected-bg`、`--tree-row-height`、`--tree-color`。覆寫範例:

```css
.my-tree { --tree-accent: #059669; --tree-row-height: 36px; }
```
