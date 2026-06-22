import { Comment, Fragment, Text } from 'vue'

import type { VNode, VNodeArrayChildren } from 'vue'

import isString from '~/utils/isString'

/**
 * 把 slot 回傳的節點遞迴正規化成「真正可數的元件節點」清單。
 *
 * `<slot>` 取回的內容常夾雜雜訊：`v-if=false` 留下的註解佔位、`v-for` 包出的
 * Fragment（其 `children` 內可能又有註解 / 文字 / 巢狀 Fragment）、純文字、原生
 * 元素等。BaseAvatarGroup 需要「實際 avatar 數量」來算 `max` 裁切與 `+N`，這個
 * helper 負責濾掉雜訊、**遞迴攤平** Fragment 與陣列，只留下元件型節點。
 *
 * - **Fragment / 陣列**（`<template>` / `v-for` 多根）→ 遞迴往內取
 * - **註解**（`v-if=false` 佔位）/ **純文字** / **字串型 type（原生元素含 `<svg>`）** → 丟棄
 * - **元件節點**（物件型 `type`，如 `<BaseAvatar>`）→ 保留
 *
 * 含 Vue API（`Fragment` / `Comment` / `Text` 與型別），依專案規範放 `helpers/` 而非 `utils/`。
 *
 * > 修正參考實作兩處：
 * > 1. 原版 `import { Fragment } from 'vue'` 卻直接用 `Comment` / `Text`，比對到的是
 * >    瀏覽器全域建構子而非 Vue symbol，註解 / 文字過濾形同失效 → 補上正確 import。
 * > 2. 原版只攤平一層，Fragment 內的註解 / 文字 / 巢狀 Fragment 會漏接，造成數量
 * >    誤判（`+N` 算錯）→ 改為遞迴正規化。
 *
 * @returns 過濾後的元件 VNode 陣列；傳入 `undefined` 時回傳 `null`
 */
export default function resolveSlotChildren(
  nodes: VNodeArrayChildren | undefined,
): VNode[] | null {
  if (!nodes) return null

  const result: VNode[] = []

  for (const node of nodes) {
    // 原始型別（null / boolean / 純文字 / 數字）不是元素，略過。
    if (
      node == null
      || typeof node === 'boolean'
      || typeof node === 'string'
      || typeof node === 'number'
    ) {
      continue
    }

    // 陣列（巢狀 children）→ 遞迴攤平。
    if (Array.isArray(node)) {
      const inner = resolveSlotChildren(node)
      if (inner) result.push(...inner)
      continue
    }

    // Fragment（多根 / <template> / v-for）→ 往內遞迴。
    if (node.type === Fragment) {
      const inner = resolveSlotChildren(node.children as VNodeArrayChildren)
      if (inner) result.push(...inner)
      continue
    }

    // 註解、文字、字串型 type（原生元素含 svg）非元件節點，丟棄。
    if (node.type === Comment || node.type === Text || isString(node.type)) {
      continue
    }

    result.push(node)
  }

  return result
}
