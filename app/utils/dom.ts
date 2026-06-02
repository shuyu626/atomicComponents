/**
 * 鍵盤焦點移動工具：在容器內把焦點移到上 / 下一個可聚焦項目，
 * 自動跳過 disabled / 無 tabindex 的節點，到頭尾會繞回另一端。
 * 供 roving tabindex 元件（Tabs / Toolbar / Menu）共用。
 */

// 決定「往哪個方向找下一個」的函式型別。
interface TraversalFunction {
  (container: HTMLElement, currentFocus: HTMLElement | null): HTMLElement | null
}

/** 容器內第一個元素（自動跳過文字 / 註解等非元素節點） */
export function firstChild(container: HTMLElement): HTMLElement | null {
  return container.firstElementChild as HTMLElement | null
}

/** 容器內最後一個元素（自動跳過文字 / 註解等非元素節點） */
export function lastChild(container: HTMLElement): HTMLElement | null {
  return container.lastElementChild as HTMLElement | null
}

/** 下一個兄弟元素；到尾則繞回第一個 */
export function nextItem(
  container: HTMLElement,
  item: HTMLElement | null,
): HTMLElement | null {
  if (item && item.nextElementSibling) {
    return item.nextElementSibling as HTMLElement
  }
  return firstChild(container)
}

/** 上一個兄弟元素；到頭則繞回最後一個 */
export function previousItem(
  container: HTMLElement,
  item: HTMLElement | null,
): HTMLElement | null {
  if (item && item.previousElementSibling) {
    return item.previousElementSibling as HTMLElement
  }
  return lastChild(container)
}

/**
 * 沿 `traversalFn` 方向找到下一個可聚焦元素並 `focus()`。
 * 可聚焦 = 有 `tabindex` 且未被 disabled / `aria-disabled`。
 * 繞一圈回起點仍找不到就回 `false`（避免無限迴圈）。
 *
 * @returns 是否成功移動焦點
 */
export function moveFocus(
  container: HTMLElement,
  currentFocus: HTMLElement | null,
  traversalFn: TraversalFunction,
): boolean {
  let nextFocus = traversalFn(container, currentFocus)
  // 繞回第一個候選 = 整圈都沒有可聚焦項目。
  const start = nextFocus

  while (nextFocus) {
    const disabled =
      (nextFocus instanceof HTMLButtonElement && nextFocus.disabled) ||
      nextFocus.getAttribute('aria-disabled') === 'true'

    if (nextFocus.hasAttribute('tabindex') && !disabled) {
      nextFocus.focus()
      return true
    }

    nextFocus = traversalFn(container, nextFocus)
    if (nextFocus === start) return false
  }

  return false
}
