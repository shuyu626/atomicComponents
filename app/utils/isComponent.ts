import isFunction from './isFunction'

import type { Component } from 'vue'

/**
 * Type guard：value 是否為 Vue 元件（而非純字串 / 其他值）。
 *
 * 用於 `prepend` / `append` 這類「字串或元件二擇一」的 prop：是元件就用
 * `<component :is>` 渲染，否則當文字輸出。判斷涵蓋三種元件形態：
 * - 函式型元件（functional component，本身就是 render function）
 * - Options / 物件型元件（帶 `render`）
 * - `<script setup>` / Composition 元件（帶 `setup`）
 *
 * 字串、數字、`null` / `undefined` 一律回 `false`。
 *
 * @see https://stackoverflow.com/questions/66953115/how-to-check-if-an-object-is-a-vue-component-in-vue3
 *
 * @example
 * isComponent(MyIcon)   // true
 * isComponent('$')      // false
 */
export default function isComponent(value: unknown): value is Component {
  return (
    isFunction(value)
    || isFunction((value as { render?: unknown } | null)?.render)
    || isFunction((value as { setup?: unknown } | null)?.setup)
  )
}
