import { Comment, Fragment, Text, h } from 'vue'

import type { VNode } from 'vue'

/**
 * 把「非互動內容」（純文字 / `<svg>`）包進一個可聚焦的 `<span role="button">`，
 * 讓它具備 button 語意與鍵盤可達性。reference slot 傳純文字 / svg 時用得到。
 */
function wrapTextContent(child: VNode): VNode {
  return h('span', { role: 'button', tabindex: 0 }, [child])
}

/**
 * 從一組 VNode 中找出「第一個可作為觸發錨點的合法子節點」。
 *
 * 元件需要一個**單一、真實存在的 DOM 元素**來掛 `aria-*` 屬性、量測位置、接事件。
 * 這個 helper 負責把 slot 的 VNode 陣列正規化成那一個節點：
 *
 * - **註解節點**（`v-if` 關掉時留下的 placeholder）→ 跳過
 * - **純文字 / `<svg>`** → 包一層 `<span role="button" tabindex="0">`（補可聚焦語意）
 * - **Fragment**（`<template>` / 多根節點）→ 遞迴往內找第一個合法節點
 * - **其他元素 / 元件**（`<button>`、`<a>`…）→ 直接回傳
 *
 * 含 Vue API（`h` / `VNode` 型別），依專案規範不放 `utils/`，改放 `helpers/`。
 *
 * @returns 找到的 VNode；整組都不合法時回傳 `null`
 */
export default function findFirstLegitChild(
  children: VNode[] | undefined,
): VNode | null {
  if (!children) return null

  for (const child of children) {
    // 註解節點（如 v-if=false 的佔位）不是真實元素，略過。
    if (child.type === Comment) continue

    // 純文字或 svg 本身不具 button 語意，包成可聚焦 span（包整個節點，svg 標籤才不會被丟掉）。
    if (child.type === Text || child.type === 'svg') {
      return wrapTextContent(child)
    }

    // Fragment（多根 / <template>）往內遞迴，取第一個合法節點。
    if (child.type === Fragment) {
      return findFirstLegitChild(child.children as VNode[])
    }

    // 一般元素 / 元件直接當錨點。
    return child
  }

  return null
}
