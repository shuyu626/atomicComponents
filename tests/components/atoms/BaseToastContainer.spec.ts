import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import BaseToastContainer from '~/components/atoms/BaseToastContainer.vue'
import { createToastManager } from '~/composables/useToast'
import type { ToastManager } from '~/composables/useToast'

// ── Helpers ──────────────────────────────────────────────────────────────────

let manager: ToastManager
let wrapper: ReturnType<typeof mount> | null = null

function mountContainer() {
  wrapper = mount(BaseToastContainer, {
    props: { manager },
    attachTo: document.body,
  })
  return wrapper
}

/** 容器經 Teleport 送到 body，需直接查 document。 */
function containers(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll('.base-toast-container'))
}

function toastEls(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll('.base-toast'))
}

beforeEach(() => {
  // 計時器停用，避免自動消失干擾「渲染 / 移除」的判定。
  manager = createToastManager()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  document.body.querySelectorAll('.base-toast-container').forEach(el => el.remove())
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BaseToastContainer', () => {
  it('佇列為空時不渲染任何容器', () => {
    mountContainer()
    expect(containers()).toHaveLength(0)
  })

  it('渲染佇列中的 toast', async () => {
    mountContainer()
    manager.show({ message: 'a', duration: 0 })
    manager.show({ message: 'b', duration: 0 })
    await nextTick()

    expect(toastEls()).toHaveLength(2)
  })

  it('依 placement 分到不同容器', async () => {
    mountContainer()
    manager.show({ message: 'a', placement: 'top-end', duration: 0 })
    manager.show({ message: 'b', placement: 'bottom', duration: 0 })
    await nextTick()

    expect(document.body.querySelector('.base-toast-container--top-end')).not.toBeNull()
    expect(document.body.querySelector('.base-toast-container--bottom')).not.toBeNull()
    expect(containers()).toHaveLength(2)
  })

  it('同 placement 收進同一容器', async () => {
    mountContainer()
    manager.show({ message: 'a', placement: 'top-end', duration: 0 })
    manager.show({ message: 'b', placement: 'top-end', duration: 0 })
    await nextTick()

    expect(containers()).toHaveLength(1)
    expect(toastEls()).toHaveLength(2)
  })

  it('progress 設定流經佇列傳給 BaseToast', async () => {
    mountContainer()
    manager.show({ message: 'a', progress: true, duration: 3000 })
    await nextTick()

    expect(document.body.querySelector('.base-toast__progress')).not.toBeNull()
  })

  it('toast emit close 時自佇列移除', async () => {
    mountContainer()
    manager.show({ message: 'a', duration: 0 })
    await nextTick()
    expect(toastEls()).toHaveLength(1)

    // 點關閉鈕 → BaseToast emit close → 容器呼叫 manager.dismiss
    const closeButton = document.body.querySelector<HTMLButtonElement>('.base-toast__close')
    closeButton?.click()
    await nextTick()

    expect(manager.toasts).toHaveLength(0)
    expect(toastEls()).toHaveLength(0)
  })

  it('自動消失到期後自佇列移除', async () => {
    vi.useFakeTimers()
    mountContainer()
    manager.show({ message: 'a', duration: 1000 })
    await nextTick()
    expect(toastEls()).toHaveLength(1)

    vi.advanceTimersByTime(1000)
    await nextTick()

    expect(manager.toasts).toHaveLength(0)
    vi.useRealTimers()
  })
})
