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

describe('BaseDatePicker — roving tabindex 不斷鏈', () => {
  function focusableDays(): HTMLElement[] {
    return Array.from(
      document.body.querySelectorAll<HTMLElement>('.base-date-picker__day[tabindex="0"]'),
    )
  }

  it('滑鼠翻月後，視圖內仍有一格 tabindex=0（鍵盤可 Tab 進日曆），且夾回同號日', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-15' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    expect(focusableDays()).toHaveLength(1)

    document.body.querySelector<HTMLElement>('.base-date-picker__nav--next-month')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const focusable = focusableDays()
    expect(focusable).toHaveLength(1)
    expect(focusable[0]!.dataset.iso).toBe('2026-08-15')
  })

  it('月份快選（pickMonth）切換視圖後同樣不斷鏈', async () => {
    const w = track(mount(BaseDatePicker, {
      props: { modelValue: '2026-07-15' }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()

    // 點標題月份 → 月快選 → 點 10 月
    document.body.querySelector<HTMLElement>('[aria-label="選擇月份"]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    const octCell = Array.from(
      document.body.querySelectorAll<HTMLElement>('.base-date-picker__quick-cell'),
    ).find((el) => el.textContent?.trim() === '10月')
    octCell!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const focusable = focusableDays()
    expect(focusable).toHaveLength(1)
    expect(focusable[0]!.dataset.iso).toBe('2026-10-15')
  })

  it('滑鼠翻月後，夾回的同號日若被停用 → 改取同月最近的可用日（不落在 disabled 格）', async () => {
    const w = track(mount(BaseDatePicker, {
      props: {
        modelValue: '2026-07-15',
        disabledDate: (d: Date) => d.getMonth() === 7 && d.getDate() === 15, // 8/15 停用
      },
      attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()

    document.body.querySelector<HTMLElement>('.base-date-picker__nav--next-month')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    const focusable = focusableDays()
    expect(focusable).toHaveLength(1)
    expect(focusable[0]!.dataset.iso).toBe('2026-08-16')
    expect((focusable[0] as HTMLButtonElement).disabled).toBe(false)
  })

  it('開啟面板時基準日之後全停用 → 反向找可用日（僅限過去日期的 picker 仍可鍵盤進入）', async () => {
    const cutoff = new Date(2026, 6, 20).getTime() // 7/20（含）之後全部停用
    const w = track(mount(BaseDatePicker, {
      props: {
        modelValue: '2026-07-31',
        disabledDate: (d: Date) => d.getTime() >= cutoff,
      },
      attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()

    const focusable = focusableDays()
    expect(focusable).toHaveLength(1)
    expect(focusable[0]!.dataset.iso).toBe('2026-07-19')
  })

  it('方向鍵移動遇到 disabled 日時沿方向跳到下一個可用日（焦點不消失）', async () => {
    const w = track(mount(BaseDatePicker, {
      props: {
        modelValue: '2026-07-15',
        disabledDate: (d: Date) => d.getMonth() === 6 && d.getDate() === 16,
      },
      attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()

    const day15 = document.body.querySelector<HTMLElement>('.base-date-picker__day[data-iso="2026-07-15"]')!
    day15.focus()
    day15.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick(); await nextTick()

    expect((document.activeElement as HTMLElement | null)?.dataset.iso).toBe('2026-07-17')
    expect(focusableDays()[0]?.dataset.iso).toBe('2026-07-17')
  })
})

// ── range 雙面板鍵盤導覽 ──────────────────────────────────────────────────────
// 過去 onGridKeydown 在 range 模式恆呼叫 setLeftView(target)：左面板永遠跟著焦點日，
// 導致 (a) 右面板從來拿不到 tabindex=0 → 整個右面板是鍵盤死區（Tab 只到得了起始日）；
// (b) 往前跨月時右面板不動 → 兩面板出現月份斷層（7月|8月 → ArrowUp → 6月|8月，7 月消失）。
// 修正後：目標日已在任一面板內就不動視圖（焦點自然移進右面板）；跨出畫面才最小幅度
// 移動，並維持雙面板連續（右 = 左 + 1）。
describe('BaseDatePicker — range 雙面板鍵盤導覽', () => {
  function panes(): HTMLElement[] {
    return Array.from(document.body.querySelectorAll<HTMLElement>('.base-date-picker__month'))
  }
  /** 各面板標題的月份文字，如 ['7月', '8月']。 */
  function paneMonths(): string[] {
    return panes().map(
      (p) => p.querySelectorAll('.base-date-picker__title-btn')[1]?.textContent?.trim() ?? '',
    )
  }
  function focusableDays(): HTMLElement[] {
    return Array.from(
      document.body.querySelectorAll<HTMLElement>('.base-date-picker__day[tabindex="0"]'),
    )
  }
  function dayEl(iso: string): HTMLElement | null {
    return document.body.querySelector<HTMLElement>(`.base-date-picker__day[data-iso="${iso}"]`)
  }
  /** 焦點格所在的面板索引（0=左 1=右）；找不到回 -1。 */
  function focusedPaneIndex(): number {
    return panes().findIndex((p) => p.querySelector('.base-date-picker__day[tabindex="0"]'))
  }
  async function pressOnFocused(key: string) {
    const el = focusableDays()[0]
    if (!el) throw new Error('沒有可聚焦的日格')
    el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
    await nextTick(); await nextTick()
  }

  async function openRange(modelValue: [string, string] = ['2026-07-15', '2026-08-20']) {
    const w = track(mount(BaseDatePicker, {
      props: { range: true, modelValue }, attachTo: document.body,
    }))
    await control(w).trigger('click'); await nextTick()
    return w
  }

  it('往後跨過左面板月底 → 焦點移進右面板，視圖不動', async () => {
    await openRange()
    expect(paneMonths()).toEqual(['7月', '8月'])

    // 7/15 → 7/31（跳到月底）→ 再往後一天即進入右面板的 8/1
    dayEl('2026-07-31')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    for (let i = 0; i < 40; i++) {
      if (focusableDays()[0]?.dataset.iso === '2026-08-01') break
      await pressOnFocused('ArrowRight')
    }

    expect(focusableDays()[0]?.dataset.iso).toBe('2026-08-01')
    expect(focusedPaneIndex()).toBe(1) // 焦點確實落在右面板
    expect(paneMonths()).toEqual(['7月', '8月']) // 目標可見 → 視圖不動
  })

  it('右面板的日格可被鍵盤聚焦與選取（不再是鍵盤死區）', async () => {
    const w = await openRange()
    // 直接把焦點推進右面板
    for (let i = 0; i < 40; i++) {
      if (focusedPaneIndex() === 1) break
      await pressOnFocused('ArrowRight')
    }
    expect(focusedPaneIndex()).toBe(1)

    const iso = focusableDays()[0]!.dataset.iso!
    await pressOnFocused('Enter') // 右面板日格 = 新的 pendingStart
    await pressOnFocused('ArrowRight')
    await pressOnFocused('Enter') // 選定結束日

    const emitted = w.emitted('update:modelValue')!.at(-1)![0] as [string, string]
    expect(emitted[0]).toBe(iso)
    expect(emitted[1] > iso).toBe(true)
  })

  it('往前跨出左面板 → 雙面板維持連續（6月|7月，不留下 6月|8月 的斷層）', async () => {
    await openRange()
    expect(paneMonths()).toEqual(['7月', '8月'])

    await pressOnFocused('ArrowUp') // 7/8
    await pressOnFocused('ArrowUp') // 7/1
    await pressOnFocused('ArrowUp') // 6/24 → 跨出左面板

    expect(focusableDays()[0]?.dataset.iso).toBe('2026-06-24')
    expect(paneMonths()).toEqual(['6月', '7月'])
    expect(focusedPaneIndex()).toBe(0)
  })

  it('往後跨出右面板 → 面板整體前進且維持連續（8月|9月）', async () => {
    await openRange(['2026-08-30', '2026-08-31'])
    expect(paneMonths()).toEqual(['8月', '9月'])

    await pressOnFocused('ArrowDown') // 9/6 → 已在右面板月份內，視圖不動
    expect(paneMonths()).toEqual(['8月', '9月'])
    expect(focusedPaneIndex()).toBe(1)

    await pressOnFocused('PageDown') // 10/6 → 跨出右面板
    expect(focusableDays()[0]?.dataset.iso).toBe('2026-10-06')
    expect(paneMonths()).toEqual(['9月', '10月'])
  })

  it('在可見月份內移動不改變面板月份', async () => {
    await openRange()
    await pressOnFocused('ArrowRight')
    expect(focusableDays()[0]?.dataset.iso).toBe('2026-07-16')
    expect(paneMonths()).toEqual(['7月', '8月'])
  })

  it('任何時刻整組面板恰有一格 tabindex=0（Tab 恆可進入日曆）', async () => {
    await openRange()
    for (const key of ['ArrowRight', 'ArrowDown', 'PageDown', 'ArrowUp', 'PageUp', 'Home', 'End']) {
      await pressOnFocused(key)
      expect(focusableDays()).toHaveLength(1)
    }
  })
})
