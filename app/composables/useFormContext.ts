import { inject, provide } from 'vue'

import type { InjectionKey } from 'vue'

/** 欄位向表單註冊的最小介面；useValidation 的 validate / reset 即符合此形狀。 */
export interface FormFieldRegistration {
  /** 強制驗證（set touched）；回傳是否通過。 */
  validate: () => boolean
  /** 清除 touched 與錯誤顯示（不動值）。 */
  reset: () => void
}

export interface FormContext {
  /** 註冊欄位；回傳反註冊函式（欄位卸載時呼叫）。 */
  register: (field: FormFieldRegistration) => () => void
}

/** BaseForm ↔ useValidation 的 provide/inject 契約 key。 */
export const formContextKey: InjectionKey<FormContext> = Symbol('base-form-context')

/**
 * BaseForm setup 內呼叫：建立欄位 registry 並 provide。
 * registry 用普通 Set（非響應式）——只在 validate / reset 時遍歷，不驅動渲染。
 */
export function provideFormContext(): { fields: ReadonlySet<FormFieldRegistration>; context: FormContext } {
  const fields = new Set<FormFieldRegistration>()
  const context: FormContext = {
    register(field) {
      fields.add(field)
      return () => fields.delete(field)
    },
  }
  provide(formContextKey, context)
  return { fields, context }
}

/** useValidation 內呼叫：不在 BaseForm 內時回傳 null（行為完全不變）。 */
export function injectFormContext(): FormContext | null {
  return inject(formContextKey, null)
}
