import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import BaseRating from '~/components/atoms/BaseRating.vue'
import type { ValidationRule } from '~/utils/validators'

function mountRating(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(BaseRating, { props, slots, attachTo: document.body })
}

function stars(wrapper: ReturnType<typeof mountRating>) {
  return wrapper.findAll('.base-rating__star')
}

function radios(wrapper: ReturnType<typeof mountRating>) {
  return wrapper.findAll('input[type="radio"]')
}

function group(wrapper: ReturnType<typeof mountRating>) {
  return wrapper.find('.base-rating__stars')
}

describe('BaseRating', () => {
  // ── 渲染 ─────────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders `max` stars (default 5)', () => {
      expect(stars(mountRating()).length).toBe(5)
      expect(stars(mountRating({ max: 10 })).length).toBe(10)
    })

    it('floors a non-integer max and clamps negatives to 0', () => {
      expect(stars(mountRating({ max: 4.7 })).length).toBe(4)
      expect(stars(mountRating({ max: -3 })).length).toBe(0)
    })

    it('exposes role="radiogroup" when interactive', () => {
      expect(group(mountRating()).attributes('role')).toBe('radiogroup')
    })

    it('renders one radio per star plus an empty/clear radio', () => {
      // 非半星：max + 1（清除）
      expect(radios(mountRating({ max: 5 })).length).toBe(6)
      // 半星：max * 2 + 1
      expect(radios(mountRating({ max: 5, allowHalf: true })).length).toBe(11)
    })

    it('renders label via prop and links it with aria-labelledby', () => {
      const wrapper = mountRating({ label: '滿意度' })
      expect(wrapper.find('.base-rating__label').text()).toBe('滿意度')
      const labelledby = group(wrapper).attributes('aria-labelledby')
      expect(labelledby).toBeTruthy()
      expect(wrapper.find(`#${labelledby}`).text()).toBe('滿意度')
    })

    it('renders label via default slot', () => {
      const wrapper = mountRating({}, { default: () => '自訂標籤' })
      expect(wrapper.find('.base-rating__label').text()).toBe('自訂標籤')
    })

    it('falls back to aria-label when no label is given', () => {
      const wrapper = mountRating({ ariaLabel: '評價' })
      expect(group(wrapper).attributes('aria-label')).toBe('評價')
      expect(group(wrapper).attributes('aria-labelledby')).toBeUndefined()
    })

    it('applies size and color modifier classes', () => {
      const wrapper = mountRating({ size: 'large', color: 'success' })
      expect(wrapper.classes()).toContain('base-rating--large')
      expect(wrapper.classes()).toContain('base-rating--success')
    })
  })

  // ── v-model ──────────────────────────────────────────────────────────────────
  describe('v-model', () => {
    it('marks filled stars from modelValue', () => {
      const list = stars(mountRating({ modelValue: 3 }))
      expect(list[0].classes()).toContain('base-rating__star--full')
      expect(list[2].classes()).toContain('base-rating__star--full')
      expect(list[3].classes()).not.toContain('base-rating__star--full')
    })

    it('checks the matching radio for the current value', () => {
      const wrapper = mountRating({ modelValue: 3 })
      const radio = wrapper.find('input[value="3"]')
      expect((radio.element as HTMLInputElement).checked).toBe(true)
    })

    it('emits update:modelValue and change on selection', async () => {
      const wrapper = mountRating({ modelValue: 0 })
      await wrapper.find('input[value="4"]').setValue()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([4])
      expect(wrapper.emitted('change')?.at(-1)).toEqual([4])
    })

    it('selects the empty radio to represent 0', () => {
      const wrapper = mountRating({ modelValue: 0 })
      const empty = wrapper.find('.base-rating__input--empty')
      expect((empty.element as HTMLInputElement).checked).toBe(true)
    })
  })

  // ── clearable ─────────────────────────────────────────────────────────────────
  describe('clearable', () => {
    it('resets to 0 when mouse-clicking the already-selected star (default)', async () => {
      const wrapper = mountRating({ modelValue: 3 })
      // 滑鼠點擊 detail >= 1
      await wrapper.find('input[value="3"]').trigger('click', { detail: 1 })
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([0])
      expect(wrapper.emitted('change')?.at(-1)).toEqual([0])
    })

    it('does not reset when clearable is false', async () => {
      const wrapper = mountRating({ modelValue: 3, clearable: false })
      await wrapper.find('input[value="3"]').trigger('click', { detail: 1 })
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })

    // 鍵盤觸發的 click（Space / Enter，detail 為 0）不應歸零，避免方向鍵選取後按 Space 誤清除。
    it('does not reset on a keyboard-activated click (detail 0)', async () => {
      const wrapper = mountRating({ modelValue: 3 })
      await wrapper.find('input[value="3"]').trigger('click', { detail: 0 })
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  // ── allowHalf ─────────────────────────────────────────────────────────────────
  describe('allowHalf', () => {
    it('marks a half star for a .5 value', () => {
      const list = stars(mountRating({ modelValue: 2.5, allowHalf: true }))
      expect(list[1].classes()).toContain('base-rating__star--full')
      expect(list[2].classes()).toContain('base-rating__star--half')
      expect(list[2].classes()).not.toContain('base-rating__star--full')
    })

    it('emits a half value when selecting a half radio', async () => {
      const wrapper = mountRating({ modelValue: 0, allowHalf: true })
      await wrapper.find('input[value="2.5"]').setValue()
      expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([2.5])
    })

    it('renders a half-width fill overlay for a .5 value', () => {
      const wrapper = mountRating({ modelValue: 2.5, allowHalf: true })
      const fill = stars(wrapper)[2].find('.base-rating__icon--fill')
      expect(fill.attributes('style')).toContain('width: 50%')
    })
  })

  // ── readonly ──────────────────────────────────────────────────────────────────
  describe('readonly', () => {
    it('renders no inputs and uses role="img" with an aria-label', () => {
      const wrapper = mountRating({ modelValue: 3, readonly: true })
      expect(radios(wrapper).length).toBe(0)
      expect(group(wrapper).attributes('role')).toBe('img')
      expect(group(wrapper).attributes('aria-label')).toContain('3 / 5')
    })

    it('renders a fractional fill overlay for arbitrary decimals', () => {
      const wrapper = mountRating({ modelValue: 3.7, readonly: true })
      const fill = stars(wrapper)[3].find('.base-rating__icon--fill')
      expect(fill.attributes('style')).toContain('width: 70%')
    })
  })

  // ── disabled ──────────────────────────────────────────────────────────────────
  describe('disabled', () => {
    it('marks every radio disabled and applies the modifier class', () => {
      const wrapper = mountRating({ disabled: true })
      expect(wrapper.classes()).toContain('base-rating--disabled')
      radios(wrapper).forEach((r) => {
        expect(r.attributes('disabled')).toBeDefined()
      })
    })

    it('does not emit when disabled', async () => {
      const wrapper = mountRating({ disabled: true, modelValue: 0 })
      await wrapper.find('input[value="3"]').trigger('change')
      expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    })
  })

  // ── 自訂圖示 slot ──────────────────────────────────────────────────────────────
  describe('custom icon slots', () => {
    it('renders custom selected / unselected icons', () => {
      const wrapper = mountRating(
        { modelValue: 1 },
        {
          'icon:selected': () => '★',
          'icon:unselected': () => '☆',
        },
      )
      expect(wrapper.html()).toContain('★')
      expect(wrapper.html()).toContain('☆')
    })
  })

  // ── 驗證（rules）──────────────────────────────────────────────────────────────
  describe('validation', () => {
    const required: ValidationRule<number | undefined> = (v) => (!!v && v > 0) || '請給予評分'

    it('does not show an error before being touched', () => {
      const wrapper = mountRating({ modelValue: 0, rules: [required] })
      expect(wrapper.find('.base-rating--error').exists()).toBe(false)
    })

    it('shows the error after blur (touch)', async () => {
      const wrapper = mountRating({ modelValue: 0, rules: [required] })
      await wrapper.find('input[value="1"]').trigger('blur')
      expect(wrapper.text()).toContain('請給予評分')
      expect(wrapper.find('.base-rating--error').exists()).toBe(true)
    })

    it('exposes validate() and reset()', async () => {
      const wrapper = mountRating({ modelValue: 0, rules: [required] })
      const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
      expect(vm.validate()).toBe(false)
      await wrapper.vm.$nextTick()
      expect(wrapper.text()).toContain('請給予評分')
      vm.reset()
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.base-rating--error').exists()).toBe(false)
    })

    it('wires aria-describedby / aria-invalid when a message shows', () => {
      const wrapper = mountRating({ message: '請給予評分', error: true })
      expect(group(wrapper).attributes('aria-invalid')).toBe('true')
      const describedby = group(wrapper).attributes('aria-describedby')
      expect(describedby).toBeTruthy()
      expect(wrapper.find(`#${describedby}`).text()).toBe('請給予評分')
    })
  })
})
