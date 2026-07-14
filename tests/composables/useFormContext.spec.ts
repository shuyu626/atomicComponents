import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'

import { provideFormContext, injectFormContext } from '~/composables/useFormContext'
import type { FormFieldRegistration } from '~/composables/useFormContext'
import BaseTextField from '~/components/atoms/BaseTextField.vue'
import { required } from '~/utils/validators'

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * 在元件 setup 內呼叫 provideFormContext（provide 需活躍的元件實例），
 * 並把 children 掛在同一元件底下，讓子元件的 inject 能沿元件樹找到這個 context。
 */
function mountWithForm(renderChildren: () => ReturnType<typeof h> | (ReturnType<typeof h>)[]) {
  let form!: ReturnType<typeof provideFormContext>
  const wrapper = mount(
    defineComponent({
      setup() {
        form = provideFormContext()
        return () => h('div', renderChildren())
      },
    }),
  )
  return { wrapper, form }
}

describe('useFormContext', () => {
  it('provideFormContext() 初始 fields 為空集合', () => {
    const { form } = mountWithForm(() => [])
    expect(form.fields.size).toBe(0)
  })

  it('register 後 fields.size 為 1；呼叫回傳的反註冊函式後歸零', () => {
    const { form } = mountWithForm(() => [])
    const field: FormFieldRegistration = { validate: () => true, reset: () => {} }

    const unregister = form.context.register(field)
    expect(form.fields.size).toBe(1)
    expect(form.fields.has(field)).toBe(true)

    unregister()
    expect(form.fields.size).toBe(0)
  })

  it('子元件（內部呼叫 useValidation）掛載後自動出現在 fields', () => {
    const { form } = mountWithForm(() => h(BaseTextField, { modelValue: '', rules: [required()] }))
    expect(form.fields.size).toBe(1)
  })

  it('子元件 v-if 卸載後自動反註冊（幽靈欄位不殘留）', async () => {
    const show = ref(true)
    let form!: ReturnType<typeof provideFormContext>
    mount(
      defineComponent({
        setup() {
          form = provideFormContext()
          return () => h('div', show.value ? h(BaseTextField, { modelValue: '', rules: [required()] }) : null)
        },
      }),
    )

    expect(form.fields.size).toBe(1)

    show.value = false
    await nextTick()

    expect(form.fields.size).toBe(0)
  })

  it('injectFormContext() 在無 provider 時回傳 null', () => {
    let ctx: ReturnType<typeof injectFormContext> | undefined
    const wrapper = mount(
      defineComponent({
        setup() {
          ctx = injectFormContext()
          return () => h('div')
        },
      }),
    )
    expect(ctx).toBeNull()
    wrapper.unmount()
  })

  it('無 provider 時 useValidation 行為不變（回歸：error/message/validate 照舊）', async () => {
    const wrapper = mount(BaseTextField, {
      props: { modelValue: '', rules: [required('必填')] },
    })

    // 未碰過：不顯示錯誤
    expect(wrapper.find('.base-form-field').classes()).not.toContain('base-form-field--error')
    expect(wrapper.find('.base-form-field__message').text()).toBe('')

    // blur 後顯示錯誤（touched-gated 行為照舊）
    await wrapper.find('input').trigger('blur')
    expect(wrapper.find('.base-form-field').classes()).toContain('base-form-field--error')
    expect(wrapper.find('.base-form-field__message').text()).toBe('必填')

    // validate() 仍可強制驗證並回報結果
    const vm = wrapper.vm as unknown as { validate: () => boolean; reset: () => void }
    expect(vm.validate()).toBe(false)
    vm.reset()
    await nextTick()
    expect(wrapper.find('.base-form-field').classes()).not.toContain('base-form-field--error')
  })

  it('兩個子元件註冊後，逐一呼叫 fields 內的 validate() 能各自 set touched（錯誤訊息各自顯示）', async () => {
    const { wrapper, form } = mountWithForm(() => [
      h(BaseTextField, { modelValue: '', rules: [required('欄位一必填')] }),
      h(BaseTextField, { modelValue: '', rules: [required('欄位二必填')] }),
    ])

    expect(form.fields.size).toBe(2)

    // 模擬 BaseForm submit 時的整表驗證：逐一呼叫已註冊欄位的 validate()。
    for (const field of form.fields) field.validate()
    await nextTick()

    const messages = wrapper.findAll('.base-form-field__message').map(m => m.text())
    expect(messages).toEqual(['欄位一必填', '欄位二必填'])
  })
})
