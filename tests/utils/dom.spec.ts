import { describe, it, expect, beforeEach } from 'vitest'

import {
  firstChild,
  lastChild,
  nextItem,
  previousItem,
  moveFocus,
} from '~/utils/dom'

// ── Helpers ──────────────────────────────────────────────────────────────────
//
// 以一排 <button> 模擬 tablist。預設每顆都帶 tabindex（roving tabindex 元件的
// 典型結構），各案例再依需要調整 disabled / 移除 tabindex。

function createTablist(
  configs: Array<{ disabled?: boolean; ariaDisabled?: boolean; noTabindex?: boolean }>,
): { container: HTMLElement; buttons: HTMLButtonElement[] } {
  const container = document.createElement('div')
  const buttons = configs.map((config) => {
    const button = document.createElement('button')
    if (!config.noTabindex) button.setAttribute('tabindex', '-1')
    if (config.disabled) button.disabled = true
    if (config.ariaDisabled) button.setAttribute('aria-disabled', 'true')
    container.appendChild(button)
    return button
  })
  document.body.appendChild(container)
  return { container, buttons }
}

beforeEach(() => {
  document.body.innerHTML = ''
})

// ── firstChild / lastChild ─────────────────────────────────────────────────

describe('firstChild / lastChild', () => {
  it('returns first / last element child', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    expect(firstChild(container)).toBe(buttons[0])
    expect(lastChild(container)).toBe(buttons[2])
  })

  it('skips leading / trailing text nodes', () => {
    const { container, buttons } = createTablist([{}, {}])
    container.insertBefore(document.createTextNode('  '), container.firstChild)
    container.appendChild(document.createTextNode('  '))
    expect(firstChild(container)).toBe(buttons[0])
    expect(lastChild(container)).toBe(buttons[1])
  })
})

// ── nextItem / previousItem (wrap-around) ────────────────────────────────────

describe('nextItem / previousItem', () => {
  it('moves to the adjacent sibling', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    expect(nextItem(container, buttons[0])).toBe(buttons[1])
    expect(previousItem(container, buttons[2])).toBe(buttons[1])
  })

  it('wraps from last to first and first to last', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    expect(nextItem(container, buttons[2])).toBe(buttons[0])
    expect(previousItem(container, buttons[0])).toBe(buttons[2])
  })

  it('returns the first / last child when item is null', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    expect(nextItem(container, null)).toBe(buttons[0])
    expect(previousItem(container, null)).toBe(buttons[2])
  })
})

// ── moveFocus ────────────────────────────────────────────────────────────────

describe('moveFocus', () => {
  it('focuses the next focusable element', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    const moved = moveFocus(container, buttons[0], nextItem)
    expect(moved).toBe(true)
    expect(document.activeElement).toBe(buttons[1])
  })

  it('skips a disabled element and focuses the next enabled one', () => {
    const { container, buttons } = createTablist([{}, { disabled: true }, {}])
    moveFocus(container, buttons[0], nextItem)
    expect(document.activeElement).toBe(buttons[2])
  })

  it('skips an aria-disabled element', () => {
    const { container, buttons } = createTablist([{}, { ariaDisabled: true }, {}])
    moveFocus(container, buttons[0], nextItem)
    expect(document.activeElement).toBe(buttons[2])
  })

  it('skips an element without tabindex', () => {
    const { container, buttons } = createTablist([{}, { noTabindex: true }, {}])
    moveFocus(container, buttons[0], nextItem)
    expect(document.activeElement).toBe(buttons[2])
  })

  it('wraps around to the first element from the last', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    moveFocus(container, buttons[2], nextItem)
    expect(document.activeElement).toBe(buttons[0])
  })

  it('focuses the first element when starting from null', () => {
    const { container, buttons } = createTablist([{}, {}, {}])
    moveFocus(container, null, nextItem)
    expect(document.activeElement).toBe(buttons[0])
  })

  it('returns false and does not loop forever when no element is focusable', () => {
    const { container } = createTablist([
      { disabled: true },
      { disabled: true },
      { disabled: true },
    ])
    const moved = moveFocus(container, null, nextItem)
    expect(moved).toBe(false)
  })
})
