import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

import BaseForm from '~/components/atoms/BaseForm.vue'
import type { BaseFormProps } from '~/components/atoms/BaseForm.vue'
import BaseInputNumber from '~/components/atoms/BaseInputNumber.vue'
import BaseTextField from '~/components/atoms/BaseTextField.vue'
import { required } from '~/utils/validators'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * BaseForm 包 2 個帶 `rules: [required()]` 的 BaseTextField 作為基本盤。
 * 刻意不綁 `modelValue` prop —— defineModel 在完全沒收到該 prop 時會回退成
 * uncontrolled 的本地 ref，讓 `input.setValue()` 直接可用，不需額外接父層 ref。
 */
function mountBasicForm(
  props: Partial<BaseFormProps> = {},
  options: Record<string, unknown> = {},
) {
  return mount(BaseForm, {
    props,
    slots: {
      default: () => [
        h(BaseTextField, { rules: [required('欄位一必填')] }),
        h(BaseTextField, { rules: [required('欄位二必填')] }),
      ],
    },
    ...options,
  })
}

type BaseFormExpose = { validate: () => boolean; resetValidation: () => void }
const exposeOf = (vm: unknown) => vm as BaseFormExpose

const inputsOf = (w: ReturnType<typeof mountBasicForm>) => w.findAll('input')
const errorFieldsOf = (w: ReturnType<typeof mountBasicForm>) => w.findAll('.base-form-field--error')

describe('BaseForm', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── 結構 ─────────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders <form novalidate class="base-form">', () => {
      const form = mountBasicForm().find('form')
      expect(form.classes()).toContain('base-form')
      expect(form.attributes('novalidate')).toBeDefined()
    })
  })

  // ── submit / 驗證 ────────────────────────────────────────────────────────
  describe('submit & validation', () => {
    it('emits invalid (not submit) when a required field is empty', async () => {
      const w = mountBasicForm()
      await w.find('form').trigger('submit')
      expect(w.emitted('submit')).toBeUndefined()
      expect(w.emitted('invalid')).toHaveLength(1)
    })

    it('emits submit exactly once (not invalid) once all fields pass', async () => {
      const w = mountBasicForm()
      const inputs = inputsOf(w)
      await inputs[0].setValue('a')
      await inputs[1].setValue('b')
      await w.find('form').trigger('submit')
      expect(w.emitted('submit')).toHaveLength(1)
      expect(w.emitted('invalid')).toBeUndefined()
    })

    it('validates every field without short-circuiting — both errors show at once', async () => {
      const w = mountBasicForm()
      await w.find('form').trigger('submit')
      await nextTick()
      expect(errorFieldsOf(w)).toHaveLength(2)
    })

    it('prevents native submit (event.defaultPrevented)', async () => {
      const w = mountBasicForm()
      const inputs = inputsOf(w)
      await inputs[0].setValue('a')
      await inputs[1].setValue('b')
      await w.find('form').trigger('submit')
      const event = w.emitted('submit')?.[0]?.[0] as SubmitEvent
      expect(event.defaultPrevented).toBe(true)
    })

    it('submits directly when there are no registered fields', async () => {
      const w = mount(BaseForm, { slots: { default: () => [] } })
      await w.find('form').trigger('submit')
      expect(w.emitted('submit')).toHaveLength(1)
      expect(w.emitted('invalid')).toBeUndefined()
    })
  })

  // ── scrollToError ────────────────────────────────────────────────────────
  describe('scrollToError', () => {
    it('scrolls (block: center, smooth) & focuses the first error field by default', async () => {
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
      const w = mountBasicForm({}, { attachTo: document.body })

      await w.find('form').trigger('submit')
      await nextTick()

      expect(scrollSpy).toHaveBeenCalledTimes(1)
      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })

      const firstErrorInput = errorFieldsOf(w)[0].find('input').element
      expect(document.activeElement).toBe(firstErrorInput)

      w.unmount()
    })

    it('uses behavior: "auto" (no smooth scroll) under prefers-reduced-motion', async () => {
      // 對齊 BaseAccordion.spec.ts 的 reduced-motion stub 慣例。
      vi.spyOn(window, 'matchMedia').mockReturnValue({
        matches: true,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      } as unknown as MediaQueryList)
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})

      const w = mountBasicForm({}, { attachTo: document.body })
      await w.find('form').trigger('submit')
      await nextTick()

      expect(scrollSpy).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })

      w.unmount()
    })

    it('does not scroll when scrollToError is false', async () => {
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
      const w = mountBasicForm({ scrollToError: false })

      await w.find('form').trigger('submit')
      await nextTick()

      expect(scrollSpy).not.toHaveBeenCalled()
    })

    it('focuses the spinbutton input (not the aria-hidden ± button) when the first error field is a BaseInputNumber', async () => {
      // Regression：BaseInputNumber 預設 controlsPosition="both" 時，DOM 序上「−」按鈕排在
      // input 之前；FOCUSABLE_SELECTOR 若沒排除 aria-hidden / tabindex=-1，querySelector 會
      // 命中這顆按鈕，焦點落在 AT 使用者感知不到的元素上，aria-describedby 錯誤訊息永遠不會被朗讀。
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {})
      const w = mount(
        BaseForm,
        {
          slots: {
            default: () => [h(BaseInputNumber, { rules: [required('必填')] })],
          },
          attachTo: document.body,
        },
      )

      await w.find('form').trigger('submit')
      await nextTick()

      expect(scrollSpy).toHaveBeenCalledTimes(1)
      const spinbutton = w.find('input[role="spinbutton"]').element
      expect(document.activeElement).toBe(spinbutton)

      w.unmount()
    })
  })

  // ── expose：validate / resetValidation ──────────────────────────────────
  describe('expose', () => {
    it('validate() returns false while errors exist, true after filling every field', async () => {
      const w = mountBasicForm()
      expect(exposeOf(w.vm).validate()).toBe(false)
      await nextTick()

      const inputs = inputsOf(w)
      await inputs[0].setValue('a')
      await inputs[1].setValue('b')

      expect(exposeOf(w.vm).validate()).toBe(true)
    })

    it('resetValidation() clears error display but keeps values unchanged', async () => {
      const w = mountBasicForm()
      const inputs = inputsOf(w)
      // 欄位一填值、欄位二故意留空 → submit 後只有欄位二顯示錯誤。
      await inputs[0].setValue('a')
      await w.find('form').trigger('submit')
      await nextTick()
      expect(errorFieldsOf(w)).toHaveLength(1)

      exposeOf(w.vm).resetValidation()
      await nextTick()

      expect(errorFieldsOf(w)).toHaveLength(0)
      // resetValidation 只清驗證狀態（touched），值仍由使用端 v-model 持有、維持不變。
      expect(inputsOf(w)[0].element.value).toBe('a')
      expect(inputsOf(w)[1].element.value).toBe('')
    })
  })

  // ── 動態欄位（v-if 反註冊）───────────────────────────────────────────────
  describe('dynamic fields', () => {
    it('unregisters a v-if removed field — validate() no longer fails on its account', async () => {
      const show = ref(true)
      const wrapper = mount(
        defineComponent({
          setup() {
            return () =>
              h(BaseForm, null, {
                default: () => (show.value ? [h(BaseTextField, { rules: [required('必填')] })] : []),
              })
          },
        }),
      )
      const form = wrapper.findComponent(BaseForm)

      expect(exposeOf(form.vm).validate()).toBe(false)

      show.value = false
      await nextTick()

      expect(exposeOf(form.vm).validate()).toBe(true)
    })
  })

  // ── Enter 隱式送出 ────────────────────────────────────────────────────────
  describe('native submit via Enter', () => {
    it('Enter commits the field then submits the form', async () => {
      // BaseInputNumber 的 onKeydown 在 Enter 時只 commitDraft，刻意「不」呼叫
      // preventDefault，用意是保留瀏覽器原生的表單隱式送出（見 BaseInputNumber.vue）。
      // 但 happy-dom 的 HTMLInputElement 並未實作「Enter 觸發表單送出」這個瀏覽器 UA
      // 行為（DOM 事件層面 keydown 不會連動 submit），故這裡先 dispatch keydown.enter
      // 展示不擋預設行為，再改直接對 <form> 觸發等價的 submit 事件，驗證同一條
      // onSubmit 流程被觸發（等價路徑）。
      const w = mount(BaseForm, {
        slots: {
          default: () => [h(BaseInputNumber, { modelValue: 1, rules: [required('必填')] })],
        },
      })

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      w.find('input').element.dispatchEvent(enterEvent)
      expect(enterEvent.defaultPrevented).toBe(false)

      await w.find('form').trigger('submit')

      expect(w.emitted('submit')).toHaveLength(1)
    })
  })
})
