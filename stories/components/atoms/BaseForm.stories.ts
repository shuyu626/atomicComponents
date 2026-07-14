import type { StoryObj } from '@storybook/vue3-vite'
import { reactive, ref, useTemplateRef } from 'vue'
import BaseForm from '~/components/atoms/BaseForm.vue'
import BaseCheckbox from '~/components/atoms/BaseCheckbox.vue'
import BaseInputNumber from '~/components/atoms/BaseInputNumber.vue'
import BaseSelect from '~/components/atoms/BaseSelect.vue'
import type { BaseSelectOption } from '~/components/atoms/BaseSelect.vue'
import BaseTextField from '~/components/atoms/BaseTextField.vue'
import { email, required } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseForm 是「表單協調器」：<form novalidate> 包裝元件本身不持有欄位值，只在 submit
// 時把已自動註冊（見 docs/components/BaseForm.md §4）的表單控制項全部驗證一次
// （不短路），全過才 emit submit，否則 emit invalid 並（預設）捲動聚焦第一個錯誤欄位。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const BTN_PRIMARY =
  'align-self:flex-start;font:inherit;padding:6px 14px;border:1px solid #1d4ed8;border-radius:6px;background:#1d4ed8;color:#fff;cursor:pointer'
const BTN_GHOST =
  'font:inherit;padding:6px 14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#111827;cursor:pointer'

const fruits: BaseSelectOption<string>[] = [
  { label: '蘋果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '櫻桃', value: 'cherry' },
]

const meta = {
  title: 'Atoms/BaseForm',
  component: BaseForm,
  tags: ['autodocs'],
  argTypes: {
    scrollToError: {
      control: { type: 'boolean' },
      description: '驗證失敗時是否捲動並聚焦第一個錯誤欄位。預設 true',
    },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— TextField + Select + InputNumber + Checkbox 的完整表單
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  render: () => ({
    components: { BaseForm, BaseTextField, BaseSelect, BaseInputNumber, BaseCheckbox },
    setup() {
      const name = ref('')
      const mail = ref('')
      const fruit = ref<string>()
      const quantity = ref<number | null>(1)
      const agree = ref(false)

      const nameRules = [required('請輸入姓名')]
      const mailRules = [required('請輸入 Email'), email()]
      const fruitRules = [required('請選擇一項')]
      const quantityRules = [required('請輸入數量')]
      // 布林必填不能用 required()（其只吃 string | number）；改用自訂規則，
      // 且 required 不會把 false 視為空值，故必須明確比對 v === true。
      const agreeRules: ValidationRule<boolean | undefined>[] = [
        (v) => v === true || '請先同意服務條款才能送出',
      ]

      function onSubmit() {
        window.alert(
          JSON.stringify(
            {
              name: name.value,
              mail: mail.value,
              fruit: fruit.value,
              quantity: quantity.value,
              agree: agree.value,
            },
            null,
            2,
          ),
        )
      }

      return {
        name, mail, fruit, quantity, agree,
        fruits, nameRules, mailRules, fruitRules, quantityRules, agreeRules,
        onSubmit,
      }
    },
    template: WRAP(`
      <BaseForm style="display:flex;flex-direction:column;gap:16px" @submit="onSubmit">
        <BaseTextField v-model="name" label="姓名" label-placement="top" :rules="nameRules" />
        <BaseTextField v-model="mail" label="Email" label-placement="top" :rules="mailRules" />
        <BaseSelect v-model="fruit" :options="fruits" label="喜歡的水果" label-placement="top" placeholder="請選擇" :rules="fruitRules" />
        <BaseInputNumber v-model="quantity" label="數量" label-placement="top" :min="1" :max="10" :rules="quantityRules" />
        <BaseCheckbox v-model="agree" label="我同意服務條款" :rules="agreeRules" />
        <button type="submit" style="${BTN_PRIMARY}">送出</button>
      </BaseForm>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '4 種控制項（有 `rules` 者）掛載時全部自動註冊進整表驗證（見 docs §4「自動註冊機制」），使用端不需手動蒐集欄位 ref。submit 全過才觸發 `onSubmit`，這裡用 `alert` 顯示送出值。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ScrollToError —— 10+ 欄位長表單，示範捲動聚焦第一個錯誤欄位
// ─────────────────────────────────────────────────────────────────────────────

export const ScrollToError: Story = {
  render: () => ({
    components: { BaseForm, BaseTextField },
    setup() {
      const fieldDefs = Array.from({ length: 12 }, (_, i) => ({
        key: `f${i}`,
        label: `欄位 ${i + 1}`,
        // 只有第 10 個欄位必填：留空送出時，捲動 / 聚焦目標就是它，而非第一個欄位。
        required: i === 9,
      }))
      const values = reactive<Record<string, string>>(
        Object.fromEntries(fieldDefs.map((f) => [f.key, ''])),
      )
      const requiredRule = [required('此欄位必填')]

      return { fieldDefs, values, requiredRule }
    },
    template: `
      <div style="max-width:440px;padding:24px;font-family:system-ui">
        <p style="margin-bottom:12px;font-size:13px;color:#6b7280">
          容器內捲動、共 12 個欄位，只有「欄位 10」設 required。直接按送出，
          畫面會捲到「欄位 10」並自動聚焦（scrollIntoView + focus，見 docs §6 A11y）。
        </p>
        <div style="max-height:320px;overflow-y:auto;border:1px solid #e5e7eb;border-radius:8px;padding:16px">
          <BaseForm style="display:flex;flex-direction:column;gap:16px">
            <BaseTextField
              v-for="f in fieldDefs"
              :key="f.key"
              v-model="values[f.key]"
              :label="f.label"
              label-placement="top"
              :rules="f.required ? requiredRule : undefined"
            />
            <button type="submit" style="${BTN_PRIMARY}">送出</button>
          </BaseForm>
        </div>
      </div>
    `,
  }),
  parameters: {
    docs: {
      description: {
        story:
          '`scrollToError`（預設 `true`）在驗證失敗後把畫面捲到第一個 `.base-form-field--error` 並聚焦其內的可聚焦控制項；`prefers-reduced-motion` 時改用無動畫的瞬移（`behavior: "auto"`）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ManualControl —— 模板 ref 主動呼叫 validate() / resetValidation()
// ─────────────────────────────────────────────────────────────────────────────

export const ManualControl: Story = {
  render: () => ({
    components: { BaseForm, BaseTextField },
    setup() {
      const formRef = useTemplateRef('formRef')
      const name = ref('')
      const status = ref('尚未驗證')

      function callValidate() {
        status.value = formRef.value?.validate() ? '驗證通過' : '驗證失敗（有欄位未通過）'
      }
      function callReset() {
        formRef.value?.resetValidation()
        status.value = '已清除驗證顯示（欄位值不變）'
      }

      return { formRef, name, status, callValidate, callReset, nameRules: [required('請輸入姓名')] }
    },
    template: WRAP(`
      <BaseForm ref="formRef" style="display:flex;flex-direction:column;gap:16px">
        <BaseTextField v-model="name" label="姓名" label-placement="top" :rules="nameRules" />
      </BaseForm>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" style="${BTN_GHOST}" @click="callValidate">呼叫 validate()</button>
        <button type="button" style="${BTN_GHOST}" @click="callReset">呼叫 resetValidation()</button>
      </div>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">{{ status }}</p>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          '透過模板 ref 直接呼叫 `validate()` / `resetValidation()`，不侷限於 submit 事件——例如切換分頁前主動檢查、或提供獨立的「清除錯誤」按鈕。`resetValidation()` 只清驗證顯示，不動欄位值（見 docs §5）。',
      },
    },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// NativeSubmit —— Enter 隱式送出
// ─────────────────────────────────────────────────────────────────────────────

export const NativeSubmit: Story = {
  render: () => ({
    components: { BaseForm, BaseInputNumber },
    setup() {
      const quantity = ref<number | null>(1)
      const submitCount = ref(0)
      function onSubmit() {
        submitCount.value++
      }
      return { quantity, submitCount, onSubmit }
    },
    template: WRAP(`
      <BaseForm style="display:flex;flex-direction:column;gap:12px" @submit="onSubmit">
        <BaseInputNumber v-model="quantity" label="數量" label-placement="top" :min="1" :max="99" />
        <p style="font-size:13px;color:#6b7280">
          在輸入框內按 Enter 試試看：BaseInputNumber 的 Enter 只 commit 草稿，刻意「不」
          擋預設行為（不 preventDefault），瀏覽器接著會觸發原生的表單隱式送出——單欄位
          表單不需要額外按 submit 鈕。
        </p>
        <p style="font-size:13px;font-weight:600">submit 次數：{{ submitCount }}</p>
      </BaseForm>
    `),
  }),
  parameters: {
    docs: {
      description: {
        story:
          'BaseInputNumber 的 `onKeydown` 在 `Enter` 時只 `commitDraft()`、不呼叫 `preventDefault()`（見 BaseInputNumber.vue），保留瀏覽器原生的表單隱式送出；BaseForm 端不需要任何額外處理即可接住這條送出路徑。',
      },
    },
  },
}
