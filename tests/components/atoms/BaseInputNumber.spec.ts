import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'

import BaseInputNumber from '~/components/atoms/BaseInputNumber.vue'
import { required } from '~/utils/validators'

function mountField(
  props: Record<string, unknown> = {},
  options: Record<string, unknown> = {},
) {
  return mount(BaseInputNumber, { props, ...options })
}

const lastEmit = (
  w: ReturnType<typeof mountField>,
  event = 'update:modelValue',
) => w.emitted(event)?.at(-1)

const findInput = (w: ReturnType<typeof mountField>) => w.find('input.base-input-number__input')
const findIncrease = (w: ReturnType<typeof mountField>) => w.find('.base-input-number__button--increase')
const findDecrease = (w: ReturnType<typeof mountField>) => w.find('.base-input-number__button--decrease')

describe('BaseInputNumber', () => {
  // ── 結構 / aria（spinbutton pattern）────────────────────────────────────────
  describe('structure & spinbutton aria', () => {
    it('renders input[type=text][inputmode=decimal][role=spinbutton] inside a BaseFormField', () => {
      const w = mountField()
      expect(w.find('.base-form-field').exists()).toBe(true)
      const input = findInput(w)
      expect(input.exists()).toBe(true)
      expect(input.attributes('type')).toBe('text')
      expect(input.attributes('inputmode')).toBe('decimal')
      expect(input.attributes('role')).toBe('spinbutton')
    })

    it('sets aria-valuemin / aria-valuemax only when the bounds are finite', () => {
      const bounded = findInput(mountField({ min: 1, max: 9 }))
      expect(bounded.attributes('aria-valuemin')).toBe('1')
      expect(bounded.attributes('aria-valuemax')).toBe('9')

      const unbounded = findInput(mountField())
      expect(unbounded.attributes('aria-valuemin')).toBeUndefined()
      expect(unbounded.attributes('aria-valuemax')).toBeUndefined()

      const infinite = findInput(mountField({ min: Number.NEGATIVE_INFINITY, max: Number.POSITIVE_INFINITY }))
      expect(infinite.attributes('aria-valuemin')).toBeUndefined()
      expect(infinite.attributes('aria-valuemax')).toBeUndefined()
    })

    it('syncs aria-valuenow with the model and omits it when the model is null', async () => {
      const w = mountField({ modelValue: 5 })
      expect(findInput(w).attributes('aria-valuenow')).toBe('5')

      await findInput(w).trigger('keydown', { key: 'ArrowUp' })
      expect(findInput(w).attributes('aria-valuenow')).toBe('6')

      const empty = mountField({ modelValue: null })
      expect(findInput(empty).attributes('aria-valuenow')).toBeUndefined()
    })
  })

  // ── v-model 顯示值 ───────────────────────────────────────────────────────────
  describe('v-model display', () => {
    it('reflects the model onto the input element', () => {
      expect(findInput(mountField({ modelValue: 5 })).element.value).toBe('5')
    })

    it('formats the display with toFixed when precision is set', () => {
      expect(findInput(mountField({ modelValue: 5, precision: 2 })).element.value).toBe('5.00')
    })
  })

  // ── draft 機制（輸入中間態不寫 model）───────────────────────────────────────
  describe('draft (intermediate input states)', () => {
    it('does not touch the model while typing intermediate states like "1." or "-"', async () => {
      const w = mountField({ modelValue: 1 })
      const input = findInput(w)

      await input.setValue('1.')
      expect(w.emitted('update:modelValue')).toBeUndefined()
      expect(input.element.value).toBe('1.')

      await input.setValue('-')
      expect(w.emitted('update:modelValue')).toBeUndefined()
      expect(input.element.value).toBe('-')
    })
  })

  // ── blur commit ─────────────────────────────────────────────────────────────
  describe('commit on blur', () => {
    it('parses and rounds the typed value with roundToPrecision semantics when precision is set', async () => {
      const w = mountField({ modelValue: 5, precision: 2 })
      const input = findInput(w)
      await input.setValue('12.345')
      await input.trigger('blur')
      expect(lastEmit(w)).toEqual([12.35])
      expect(lastEmit(w, 'change')).toEqual([12.35])
    })

    it('clamps the typed value to max on commit', async () => {
      const w = mountField({ modelValue: 5, max: 10 })
      const input = findInput(w)
      await input.setValue('42')
      await input.trigger('blur')
      expect(lastEmit(w)).toEqual([10])
    })

    it('restores the display and keeps the model untouched when the draft is unparseable', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)
      await input.setValue('abc')
      await input.trigger('blur')
      expect(w.emitted('update:modelValue')).toBeUndefined()
      expect(w.emitted('change')).toBeUndefined()
      expect(input.element.value).toBe('5')
    })

    it('commits null when the input is cleared', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)
      await input.setValue('')
      await input.trigger('blur')
      expect(lastEmit(w)).toEqual([null])
      expect(lastEmit(w, 'change')).toEqual([null])
    })
  })

  // ── Enter commit（不擋表單隱式送出）─────────────────────────────────────────
  describe('commit on Enter', () => {
    it('commits the draft on Enter without preventDefault (keeps implicit form submission)', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)
      await input.setValue('7')

      const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      input.element.dispatchEvent(event)
      await nextTick()

      expect(lastEmit(w)).toEqual([7])
      expect(event.defaultPrevented).toBe(false)
    })
  })

  // ── 鍵盤步進 ─────────────────────────────────────────────────────────────────
  describe('keyboard stepping', () => {
    it('steps ±step with ArrowUp / ArrowDown (and prevents default scrolling)', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)

      const up = new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true, cancelable: true })
      input.element.dispatchEvent(up)
      await nextTick()
      expect(lastEmit(w)).toEqual([6])
      expect(up.defaultPrevented).toBe(true)

      await input.trigger('keydown', { key: 'ArrowDown' })
      expect(lastEmit(w)).toEqual([5])
    })

    it('fixes the 0.1 float error: three ArrowUp with step 0.1 yield exactly 0.3', async () => {
      const w = mountField({ modelValue: 0, step: 0.1 })
      const input = findInput(w)
      await input.trigger('keydown', { key: 'ArrowUp' })
      await input.trigger('keydown', { key: 'ArrowUp' })
      await input.trigger('keydown', { key: 'ArrowUp' })
      expect(lastEmit(w)).toEqual([0.3])
    })

    it('steps from clamp(0 + step) when the model is null (min=5 yields 5)', async () => {
      const w = mountField({ modelValue: null, min: 5 })
      await findInput(w).trigger('keydown', { key: 'ArrowUp' })
      expect(lastEmit(w)).toEqual([5])
    })

    it('type then ArrowUp steps from the typed value (draft committed first, no data loss)', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)

      await input.setValue('7')
      expect(w.emitted('update:modelValue')).toBeUndefined() // 輸入中仍不寫 model

      await input.trigger('keydown', { key: 'ArrowUp' })
      // 先 commit draft（7），再從 7 步進到 8——鍵入的 7 不會被默默丟棄
      expect(w.emitted('update:modelValue')).toEqual([[7], [8]])
      expect(input.element.value).toBe('8')
    })

    it('jumps to min / max with Home / End when the bounds are finite', async () => {
      const w = mountField({ modelValue: 5, min: 1, max: 9 })
      const input = findInput(w)

      await input.trigger('keydown', { key: 'Home' })
      expect(lastEmit(w)).toEqual([1])

      await input.trigger('keydown', { key: 'End' })
      expect(lastEmit(w)).toEqual([9])
    })

    it('Home / End are no-ops when the bounds are unset', async () => {
      const w = mountField({ modelValue: 5 })
      const input = findInput(w)
      await input.trigger('keydown', { key: 'Home' })
      await input.trigger('keydown', { key: 'End' })
      expect(w.emitted('update:modelValue')).toBeUndefined()
    })
  })

  // ── ± 按鈕 ───────────────────────────────────────────────────────────────────
  describe('step buttons', () => {
    it('steps on button press and emits change with the committed value', async () => {
      const w = mountField({ modelValue: 5 })

      await findIncrease(w).trigger('pointerdown')
      await findIncrease(w).trigger('pointerup')
      expect(lastEmit(w)).toEqual([6])
      expect(lastEmit(w, 'change')).toEqual([6])

      await findDecrease(w).trigger('pointerdown')
      await findDecrease(w).trigger('pointerup')
      expect(lastEmit(w)).toEqual([5])
      expect(lastEmit(w, 'change')).toEqual([5])
    })

    it('does not emit change when the committed value is unchanged (step at the bound)', async () => {
      const w = mountField({ modelValue: 10, max: 10 })
      await findInput(w).trigger('keydown', { key: 'ArrowUp' })
      expect(w.emitted('update:modelValue')).toBeUndefined()
      expect(w.emitted('change')).toBeUndefined()
    })

    it('disables the matching button at the exact bound', () => {
      const atMax = mountField({ modelValue: 10, max: 10 })
      expect(findIncrease(atMax).attributes('disabled')).toBeDefined()
      expect(findDecrease(atMax).attributes('disabled')).toBeUndefined()

      const atMin = mountField({ modelValue: 1, min: 1 })
      expect(findDecrease(atMin).attributes('disabled')).toBeDefined()
      expect(findIncrease(atMin).attributes('disabled')).toBeUndefined()
    })

    describe('long-press auto repeat (fake timers)', () => {
      beforeEach(() => vi.useFakeTimers())
      afterEach(() => vi.useRealTimers())

      it('repeats after 500ms then every 80ms, and stops on pointerup', async () => {
        const w = mountField({ modelValue: 0 })
        const increase = findIncrease(w)

        // pointerdown：先立即步進一次
        await increase.trigger('pointerdown')
        expect(w.emitted('update:modelValue')).toHaveLength(1)

        // 首次延遲 500ms 後開始連發，之後每 80ms 一次 → 500 + 160 ≥ 3 次
        vi.advanceTimersByTime(500)
        vi.advanceTimersByTime(160)
        const fired = w.emitted('update:modelValue')?.length ?? 0
        expect(fired).toBeGreaterThanOrEqual(3)

        // pointerup 停止連發
        await increase.trigger('pointerup')
        vi.advanceTimersByTime(1000)
        expect(w.emitted('update:modelValue')).toHaveLength(fired)
      })

      it('self-stops when the bound is reached mid-press and never resumes (no orphaned timer)', async () => {
        const w = mountField({ modelValue: 8, max: 10 })
        const increase = findIncrease(w)

        // 模擬 WebKit 情境：到界後按鈕轉 disabled、pointerup 被抑制（本測試刻意不觸發 pointerup）
        await increase.trigger('pointerdown') // 8 → 9
        vi.advanceTimersByTime(500) // 9 → 10（到界）
        vi.advanceTimersByTime(80) // 10 → 10 值未變 → tick 內自我停止
        const fired = w.emitted('update:modelValue')?.length ?? 0
        expect(lastEmit(w)).toEqual([10])

        // 遠超過數個 tick 也不再步進
        vi.advanceTimersByTime(2000)
        expect(w.emitted('update:modelValue')).toHaveLength(fired)

        // 之後鍵入較小值 commit，也不會恢復幽靈步進
        const input = findInput(w)
        await input.setValue('3')
        await input.trigger('blur')
        expect(lastEmit(w)).toEqual([3])
        const afterCommit = w.emitted('update:modelValue')?.length ?? 0
        vi.advanceTimersByTime(2000)
        expect(w.emitted('update:modelValue')).toHaveLength(afterCommit)
        expect(lastEmit(w)).toEqual([3])
      })
    })
  })

  // ── 父層綁定 v-model（受控模式）──────────────────────────────────────────────
  // defineModel 受控語意：父層綁 v-model 時，寫 model.value 不會同步回讀（要等父層
  // flush 才回流）。同 tick 內「寫後讀」會拿到舊值——本區塊固定以真實父元件掛載，
  // 守住這條其他測試（僅傳 modelValue prop、無 update 監聽）走不到的路徑。
  describe('controlled v-model (parent-bound)', () => {
    function mountControlled(initial: number | null, extra: Record<string, unknown> = {}) {
      const Host = defineComponent({
        components: { BaseInputNumber },
        setup() {
          const value = ref<number | null>(initial)
          return { value, extra }
        },
        template: '<BaseInputNumber v-model="value" v-bind="extra" />',
      })
      return mount(Host)
    }

    const findHostInput = (w: ReturnType<typeof mountControlled>) =>
      w.find<HTMLInputElement>('input.base-input-number__input')

    it('type then ArrowUp steps from the just-committed draft (7 → 8), not the stale model', async () => {
      const w = mountControlled(null)
      const input = findHostInput(w)

      await input.setValue('7')
      await input.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      expect(w.vm.value).toBe(8)
    })

    it('type then ArrowUp emits the full change sequence [4, 5] (no stale-model dedupe)', async () => {
      // 受控下 commit 的 changed 判斷若回讀 model，第二次 commit 會拿打字前的舊值
      // 誤判「值沒變」而漏發 change——v-model 正確但事件流與最終值不一致。
      const w = mountControlled(5)
      const input = findHostInput(w)

      await input.setValue('4')
      await input.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      expect(w.vm.value).toBe(5)
      expect(w.findComponent(BaseInputNumber).emitted('change')).toEqual([[4], [5]])
    })

    it('derives step precision from the just-committed draft (7.25 + 1 → 8.25)', async () => {
      const w = mountControlled(5)
      const input = findHostInput(w)

      await input.setValue('7.25')
      await input.trigger('keydown', { key: 'ArrowUp' })
      await nextTick()

      expect(w.vm.value).toBe(8.25)
    })

    describe('long-press auto repeat (fake timers)', () => {
      beforeEach(() => vi.useFakeTimers())
      afterEach(() => vi.useRealTimers())

      it('keeps repeating past the first tick when parent-bound', async () => {
        const w = mountControlled(0)
        const increase = w.find('.base-input-number__button--increase')

        await increase.trigger('pointerdown') // 立即步進 0 → 1
        expect(w.vm.value).toBe(1)

        await vi.advanceTimersByTimeAsync(500) // → 2
        await vi.advanceTimersByTimeAsync(160) // → 3、4
        expect(w.vm.value).toBeGreaterThanOrEqual(4)

        await increase.trigger('pointerup')
      })

      it('still self-stops at the bound when parent-bound', async () => {
        const w = mountControlled(8, { max: 10 })
        const increase = w.find('.base-input-number__button--increase')

        await increase.trigger('pointerdown') // 8 → 9
        await vi.advanceTimersByTimeAsync(500) // 9 → 10（到界）
        await vi.advanceTimersByTimeAsync(80) // 值未變 → 自我停止
        expect(w.vm.value).toBe(10)

        await vi.advanceTimersByTimeAsync(2000)
        expect(w.vm.value).toBe(10)
      })
    })
  })

  // ── controls 佈局 ────────────────────────────────────────────────────────────
  describe('controls layout', () => {
    it('renders no buttons with controls=false', () => {
      const w = mountField({ controls: false })
      expect(w.find('.base-input-number__button').exists()).toBe(false)
    })

    it('applies the layout modifier class for controlsPosition', () => {
      // 預設 right（右側上下疊排）；both 需明確指定。
      expect(mountField().find('.base-input-number').classes())
        .toContain('base-input-number--controls-right')
      expect(mountField({ controlsPosition: 'both' }).find('.base-input-number').classes())
        .toContain('base-input-number--controls-both')
    })

    it('keeps the buttons out of the tab order and hidden from AT', () => {
      const w = mountField()
      for (const button of w.findAll('.base-input-number__button')) {
        expect(button.attributes('tabindex')).toBe('-1')
        expect(button.attributes('aria-hidden')).toBe('true')
      }
    })
  })

  // ── validation (rules) ──────────────────────────────────────────────────────
  describe('validation (rules)', () => {
    it('shows the rule error via BaseFormField and sets aria-invalid after blur on empty', async () => {
      const w = mountField({ rules: [required('此欄位為必填')] })
      await findInput(w).trigger('blur')
      expect(w.find('.base-form-field').classes()).toContain('base-form-field--error')
      expect(w.find('.base-form-field__message').text()).toContain('此欄位為必填')
      expect(findInput(w).attributes('aria-invalid')).toBe('true')
    })
  })

  // ── disabled / readonly ─────────────────────────────────────────────────────
  describe('disabled / readonly', () => {
    it('disabled: sets the input attribute, disables both buttons, and ignores keyboard stepping', async () => {
      const w = mountField({ modelValue: 5, disabled: true })
      expect(findInput(w).attributes('disabled')).toBeDefined()
      expect(findIncrease(w).attributes('disabled')).toBeDefined()
      expect(findDecrease(w).attributes('disabled')).toBeDefined()

      await findInput(w).trigger('keydown', { key: 'ArrowUp' })
      expect(w.emitted('update:modelValue')).toBeUndefined()
    })

    it('readonly: sets the input attribute, disables both buttons, and ignores keyboard stepping', async () => {
      const w = mountField({ modelValue: 5, readonly: true })
      expect(findInput(w).attributes('readonly')).toBeDefined()
      expect(findIncrease(w).attributes('disabled')).toBeDefined()
      expect(findDecrease(w).attributes('disabled')).toBeDefined()

      await findInput(w).trigger('keydown', { key: 'ArrowDown' })
      expect(w.emitted('update:modelValue')).toBeUndefined()
    })
  })

  // ── 欄位轉發 / 事件轉發 ─────────────────────────────────────────────────────
  describe('field & event forwarding', () => {
    it('forwards the label to BaseFormField and associates it with the input', () => {
      const w = mountField({ label: '數量' })
      expect(w.find('.base-form-field__label-content').text()).toBe('數量')
      const forAttr = w.find('label').attributes('for')
      expect(forAttr).toBeTruthy()
      expect(findInput(w).attributes('id')).toBe(forAttr)
    })

    it('forwards native focus / blur events from the input', async () => {
      const w = mountField({}, { attachTo: document.body })
      const input = findInput(w)

      await input.trigger('focus')
      await input.trigger('blur')

      expect(w.emitted('focus')).toHaveLength(1)
      expect(w.emitted('blur')).toHaveLength(1)
      expect(w.emitted('focus')?.[0][0]).toBeInstanceOf(Event)
    })
  })
})
