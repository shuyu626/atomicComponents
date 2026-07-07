import { describe, it, expect, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import BaseDatePicker from '~/components/atoms/BaseDatePicker.vue'
import { required } from '~/utils/validators'

function control(w: ReturnType<typeof mount>) {
  return w.find('.base-date-picker__control')
}
function panelEl(): HTMLElement | null {
  return document.body.querySelector('.base-date-picker__panel')
}
function dayButtons(): HTMLElement[] {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.base-date-picker__day'))
}
function inMonthDay(text: string): HTMLElement | undefined {
  return dayButtons().find(
    (b) => b.textContent?.trim() === text && !b.classList.contains('base-date-picker__day--adjacent'),
  )
}

let active: ReturnType<typeof mount> | null = null
function track(w: ReturnType<typeof mount>) { active = w; return w }
afterEach(() => {
  active?.unmount(); active = null
  document.body.querySelectorAll('.base-popover').forEach((el) => el.remove())
})

describe('BaseDatePicker — skeleton', () => {
  it('renders a role="button" control with placeholder', () => {
    const w = track(mount(BaseDatePicker, {
      props: { placeholder: '請選擇日期' }, attachTo: document.body,
    }))
    expect(control(w).attributes('role')).toBe('button')
    expect(w.find('.base-date-picker__text').text()).toBe('請選擇日期')
  })

  it('opens the calendar panel on click', async () => {
    const w = track(mount(BaseDatePicker, { attachTo: document.body }))
    expect(panelEl()).toBeNull()
    await control(w).trigger('click')
    await nextTick()
    expect(panelEl()).not.toBeNull()
    expect(dayButtons().length).toBeGreaterThan(0)
  })
})

describe('BaseDatePicker — single selection', () => {
  it('selects a day, updates v-model to ISO, and closes', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-10' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    inMonthDay('10')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    await control(w).trigger('click'); await nextTick()
    inMonthDay('11')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBe('2026-07-11')
    expect(panelEl()).toBeNull()
  })

  it('disables days outside [min, max]', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-10', min: '2026-07-05', max: '2026-07-20' },
      attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    expect(inMonthDay('1')!.hasAttribute('disabled')).toBe(true)
  })

  it('navigates months with header buttons', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-10' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    expect(document.body.querySelector('.base-date-picker__title')!.textContent).toContain('7月')
    ;(document.body.querySelector('.base-date-picker__nav--next-month') as HTMLElement).click()
    await nextTick()
    expect(document.body.querySelector('.base-date-picker__title')!.textContent).toContain('8月')
  })
})

describe('BaseDatePicker — range', () => {
  it('picks start then end and emits a sorted tuple', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { range: true, modelValue: undefined }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    expect(document.body.querySelectorAll('.base-date-picker__month').length).toBe(2)
    inMonthDay('10')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await nextTick()
    inMonthDay('5')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); await nextTick()
    const tuple = w.emitted('update:modelValue')!.at(-1)![0] as [string, string]
    expect(tuple[0] < tuple[1]).toBe(true)
    expect(panelEl()).toBeNull()
  })

  it('selects year and month independently per pane via clickable titles', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { range: true, modelValue: ['2026-03-10', '2026-08-20'] },
      attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()

    const panes = () => document.body.querySelectorAll('.base-date-picker__month')
    const titles = (pane: Element) =>
      Array.from(pane.querySelectorAll<HTMLElement>('.base-date-picker__title-btn'))
    const quickCell = (pane: Element, text: string) =>
      Array.from(pane.querySelectorAll<HTMLElement>('.base-date-picker__quick-cell'))
        .find((b) => b.textContent?.trim() === text)

    // 左面板 = 2026 3月,右面板 = 2026 4月(左 +1)。
    expect(titles(panes()[0])[0].textContent).toContain('2026')
    expect(titles(panes()[0])[1].textContent).toContain('3月')
    expect(titles(panes()[1])[1].textContent).toContain('4月')

    // 左面板:點年份標題 → 年快選 → 選 2020 → 月快選 → 選 6月。
    titles(panes()[0])[0].click(); await nextTick()
    quickCell(panes()[0], '2020')!.click(); await nextTick()
    quickCell(panes()[0], '6月')!.click(); await nextTick()
    expect(titles(panes()[0])[0].textContent).toContain('2020')
    expect(titles(panes()[0])[1].textContent).toContain('6月')

    // 右面板不受左面板影響,仍為 2026 4月(獨立)。
    expect(titles(panes()[1])[0].textContent).toContain('2026')
    expect(titles(panes()[1])[1].textContent).toContain('4月')

    // 右面板:獨立點月份標題 → 選 12月,左面板不變。
    titles(panes()[1])[1].click(); await nextTick()
    quickCell(panes()[1], '12月')!.click(); await nextTick()
    expect(titles(panes()[1])[1].textContent).toContain('12月')
    expect(titles(panes()[0])[1].textContent).toContain('6月')
  })
})

describe('BaseDatePicker — clear, validation, a11y', () => {
  it('clears the value via the clear button', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-10', clearable: true }, attachTo: document.body,
    }))
    await w.find('.base-date-picker__clear').trigger('click')
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toBeUndefined()
  })

  it('shows a required error only after the panel closes (touched)', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { rules: [required('請選擇日期')], label: '日期' }, attachTo: document.body,
    }))
    expect(w.text()).not.toContain('請選擇日期')
    await control(w).trigger('click'); await nextTick()
    await control(w).trigger('click'); await nextTick()
    expect(w.text()).toContain('請選擇日期')
  })

  it('exposes grid semantics', async () => {
    const w = track(mount(BaseDatePicker, { attachTo: document.body }))
    await control(w).trigger('click'); await nextTick()
    expect(document.body.querySelector('[role="grid"]')).not.toBeNull()
    expect(document.body.querySelector('.base-date-picker__day[role="gridcell"]')).not.toBeNull()
  })
})

// ── PageUp / PageDown 月底 clamp (C1-4 regression) ────────────────────────────────
// 過去以 new Date(y, m±1, d) 換月，來源日超過目標月天數時會溢位（5/31 PageUp → 5/1）。
// 修正後對目標月天數 clamp。此前 DatePicker 完全沒有鍵盤導航測試（bug 因此漏網）。
describe('BaseDatePicker — PageUp/PageDown 月底 clamp (C1-4 regression)', () => {
  function pressPageKey(key: 'PageUp' | 'PageDown') {
    document.body
      .querySelector('[role="grid"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
  }
  function focusedISO(): string | undefined {
    return document.body.querySelector<HTMLElement>(
      '.base-date-picker__day[tabindex="0"]',
    )?.dataset.iso
  }

  it('5/31 PageUp 落在 4/30（不溢位成 5/1）', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-05-31' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    pressPageKey('PageUp'); await nextTick()
    expect(focusedISO()).toBe('2026-04-30')
  })

  it('1/31 PageUp 跨年落在前一年 12/31', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-01-31' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    pressPageKey('PageUp'); await nextTick()
    expect(focusedISO()).toBe('2025-12-31')
  })
})
