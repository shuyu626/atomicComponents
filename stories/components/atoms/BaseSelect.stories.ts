import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseSelect from '~/components/atoms/BaseSelect.vue'
import type { BaseSelectOption } from '~/components/atoms/BaseSelect.vue'
import { required } from '~/utils/validators'
import type { ValidationRule } from '~/utils/validators'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseSelect 是包在 BaseFormField 內的下拉選擇控制項：補上 combobox 控制項與
// listbox 浮層（浮層的定位 / focus-trap / Esc / 點外關閉交給 BasePopover）。
// 支援單選、多選（Array 或 Set）、可搜尋（filterable），v-model 用 defineModel，
// 並整合 useValidation（rules / validate / reset）。所有狀態色走 --field-* token。

const WRAP = (inner: string) =>
  `<div style="max-width:440px;padding:24px;font-family:system-ui">${inner}</div>`

const fruits: BaseSelectOption<string>[] = [
  { label: '蘋果', value: 'apple' },
  { label: '香蕉', value: 'banana' },
  { label: '櫻桃', value: 'cherry' },
  { label: '葡萄', value: 'grape' },
  { label: '芒果（缺貨）', value: 'mango', disabled: true },
]

const meta = {
  title: 'Atoms/BaseSelect',
  component: BaseSelect,
  tags: ['autodocs'],
  argTypes: {
    options: { control: { type: 'object' }, description: '選項清單 `{ value, label, disabled? }[]`' },
    placeholder: { control: { type: 'text' }, description: 'placeholder 文字' },
    multiple: { control: { type: 'boolean' }, description: '多選（v-model 綁 Array 或 Set）。預設 false' },
    filterable: { control: { type: 'boolean' }, description: '可搜尋（浮層上方顯示 searchbox 即時過濾）。預設 false' },
    searchPlaceholder: { control: { type: 'text' }, description: 'filterable 時搜尋框 placeholder。預設「搜尋」' },
    clearable: { control: { type: 'boolean' }, description: '有選取時顯示叉叉清除鈕（hover 控制項才顯形）。預設 true' },
    chips: { control: { type: 'boolean' }, description: '多選時以可刪除的 chip 顯示已選項（取代逗號文字）。預設 false' },
    maxCollapseTags: { control: { type: 'number' }, description: 'chips 模式顯示上限：超過的收斂成一顆 +N（僅 multiple + chips 生效）。0=不限制。預設 0' },
    placement: {
      control: { type: 'select' },
      options: ['bottom-start', 'bottom', 'bottom-end', 'top-start', 'top', 'top-end'],
      description: '浮層位置。預設 bottom-start',
    },
    emptyText: { control: { type: 'text' }, description: '無選項時的提示文字。預設「查無選項」' },
    // 欄位語意（轉發給 BaseFormField）
    label: { control: { type: 'text' }, description: '標籤文字；有 #label slot 時以 slot 為準' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '標籤位置。預設 left' },
    labelWidth: { control: { type: 'text' }, description: 'label-left 時的標籤寬度。預設 fit-content' },
    hideLabel: { control: { type: 'boolean' }, description: '視覺隱藏標籤（保留 sr-only）。預設 false' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息；有 #message slot 時以 slot 為準' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填（標籤後顯示 *）。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
    readonly: { control: { type: 'boolean' }, description: '唯讀。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板把玩所有 props
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '水果',
    labelPlacement: 'top',
    placeholder: '請選擇水果',
    options: fruits,
    multiple: false,
    filterable: false,
    clearable: true,
    message: '',
    error: false,
    required: false,
    disabled: false,
    readonly: false,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseSelect },
    setup() {
      const value = ref<string>()
      return { args, value }
    },
    template: WRAP(`<BaseSelect v-bind="args" v-model="value" />`),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Single —— 單選
// ─────────────────────────────────────────────────────────────────────────────

export const Single: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return { value: ref<string>('banana'), fruits }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="fruits" label="水果" label-placement="top" placeholder="請選擇" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '單選模式：點選項即更新 v-model 並關閉浮層；選中項在最後方顯示打勾；停用的選項（芒果）不可選。滑入控制項會出現叉叉清除鈕（`clearable` 預設開）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple (Array) —— 多選綁陣列
// ─────────────────────────────────────────────────────────────────────────────

export const Multiple: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return { value: ref<string[]>(['apple', 'cherry']), fruits }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="fruits" multiple label="多選水果" label-placement="top" placeholder="可複選" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`multiple` 時 v-model 綁 `Array`：點選項 toggle 累加 / 移除，浮層保持開啟，顯示區以逗號串接已選 label。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Chips —— 多選以 chip 顯示（可單獨移除）
// ─────────────────────────────────────────────────────────────────────────────

export const Chips: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const skills: BaseSelectOption<string>[] = [
        { label: 'HTML', value: 'html' },
        { label: 'CSS', value: 'css' },
        { label: 'JavaScript', value: 'js' },
        { label: 'Vue', value: 'vue' },
        { label: 'React', value: 'react' },
        { label: 'Figma', value: 'figma' },
      ]
      return { value: ref<string[]>(['html', 'css', 'figma']), skills }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="skills" multiple chips filterable label="技能" label-placement="top" placeholder="選擇技能" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ value }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`multiple` + `chips`：已選項在控制項內以可刪除的 chip 顯示（複用 `BaseChip`），點 chip 的 × 單獨移除該值（不會連帶開合浮層）；chip 多時自動換行。可搭配 `filterable`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple (Set) —— 多選綁 Set
// ─────────────────────────────────────────────────────────────────────────────

export const MultipleSet: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return { value: ref<Set<string>>(new Set(['banana'])), fruits }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="fruits" multiple label="Set 多選" label-placement="top" placeholder="可複選" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">value: {{ [...value] }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: 'v-model 傳入 `Set` 時，元件維持 Set 容器（Set 進 Set 出），適合需要 O(1) 查找的大量選項場景。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Filterable —— 可搜尋
// ─────────────────────────────────────────────────────────────────────────────

export const Filterable: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const cities: BaseSelectOption<string>[] = [
        { label: 'Taipei', value: 'tpe' },
        { label: 'Taichung', value: 'txg' },
        { label: 'Tainan', value: 'tnn' },
        { label: 'Kaohsiung', value: 'khh' },
        { label: 'Hsinchu', value: 'hsz' },
      ]
      return { value: ref<string>(), cities }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="cities" filterable label="城市" label-placement="top" placeholder="請選擇城市" search-placeholder="輸入關鍵字搜尋" empty-text="找不到城市" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`filterable`：點開後**浮層上方為搜尋欄、下方為選項清單**，依 `label` 不分大小寫即時過濾；ArrowUp / ArrowDown 移動作用中項（aria-activedescendant），Enter 選取。控制項仍顯示已選 / placeholder。無結果顯示 `emptyText`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Clearable —— 叉叉清除
// ─────────────────────────────────────────────────────────────────────────────

export const Clearable: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return { a: ref<string>('apple'), b: ref<string>('banana'), fruits }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseSelect v-model="a" :options="fruits" label="可清除" label-placement="top" message="滑入控制項出現叉叉,點擊清空" />
        <BaseSelect v-model="b" :options="fruits" :clearable="false" label="不可清除" label-placement="top" message="clearable=false" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`clearable`（預設 `true`）：有選取時滑入 / 聚焦控制項會顯示叉叉清除鈕；單選清為 `undefined`、多選清為空 `Array` / `Set`。設 `:clearable="false"` 關閉。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— required / error / disabled / readonly
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return {
        a: ref<string>(),
        b: ref<string>('apple'),
        c: ref<string>('banana'),
        d: ref<string>('cherry'),
        fruits,
      }
    },
    template: WRAP(`
      <form style="display:flex;flex-direction:column;gap:20px" @submit.prevent>
        <BaseSelect v-model="a" :options="fruits" label="必填" label-placement="top" required message="此欄位為必選" placeholder="請選擇" />
        <BaseSelect v-model="b" :options="fruits" label="錯誤" label-placement="top" error message="選項不被允許" />
        <BaseSelect v-model="c" :options="fruits" label="停用" label-placement="top" disabled />
        <BaseSelect v-model="d" :options="fruits" label="唯讀" label-placement="top" readonly />
      </form>
    `),
  }),
  parameters: {
    docs: { description: { story: '狀態透過 --field-* token 傳遞：`error` 邊框 / 訊息轉紅、`disabled` / `readonly` 不可開啟；`required` 標籤後加 `*` 並綁 `aria-required`。combobox 控制項自行設定 `aria-haspopup="listbox"`，展開時 `aria-controls` 指向實際的 listbox `<ul>`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom slots —— #option / #display
// ─────────────────────────────────────────────────────────────────────────────

export const CustomSlots: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const users: BaseSelectOption<string>[] = [
        { label: 'Alice', value: 'alice' },
        { label: 'Bob', value: 'bob' },
        { label: 'Carol', value: 'carol' },
      ]
      return { value: ref<string>('alice'), users }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="users" label="負責人" label-placement="top">
        <template #option="{ label }">
          <span style="display:flex;align-items:center;gap:8px">
            <span style="width:22px;height:22px;border-radius:50%;background:#e0ecff;display:inline-flex;align-items:center;justify-content:center;font-size:12px">{{ label[0] }}</span>
            {{ label }}
          </span>
        </template>
        <template #display="{ selected }">
          指派給 <b>{{ selected?.label }}</b>
        </template>
      </BaseSelect>
    `),
  }),
  parameters: {
    docs: { description: { story: '`#option` 自訂選項渲染（scoped props：`value` / `label` / `selected` / `index`，內建打勾仍會顯示在最後方）；`#display` 自訂選取後的顯示（scoped prop：`selected`）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation —— rules + touched-gated
// ─────────────────────────────────────────────────────────────────────────────

export const Validation: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const value = ref<string>()
      const rules: ValidationRule<string | string[] | Set<string> | undefined>[] = [required('請選擇一個水果')]
      return { value, rules, fruits }
    },
    template: WRAP(`
      <BaseSelect v-model="value" :options="fruits" :rules="rules" label="水果" label-placement="top" placeholder="開啟後不選直接關閉看驗證" />
    `),
  }),
  parameters: {
    docs: { description: { story: '`rules` 為規則陣列；採 **touched-gated**——浮層第一次關閉（等同失焦）後才開始顯示錯誤。父層可用模板 ref 呼叫 `validate()`（submit 強制驗證）/ `reset()`。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Themed —— 覆寫 --field-* token
// ─────────────────────────────────────────────────────────────────────────────

export const Themed: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      return { value: ref<string>('apple'), fruits }
    },
    template: WRAP(`
      <BaseSelect class="t-select" v-model="value" :options="fruits" label="主題色" label-placement="top" />
      <style>
        .t-select { --field-height: 44px; --field-active-color: #db2777; --field-radius: 10px; }
      </style>
    `),
  }),
  parameters: {
    docs: { description: { story: '覆寫 `--field-height` / `--field-active-color` / `--field-radius` 等 token 即可主題化（combobox 外框、focus ring、已選項色自動跟著變）。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// ChipsCollapse —— maxCollapseTags 收斂成 +N（避免多選破版）
// ─────────────────────────────────────────────────────────────────────────────

export const ChipsCollapse: Story = {
  render: () => ({
    components: { BaseSelect },
    setup() {
      const skills: BaseSelectOption<string>[] = [
        { label: 'HTML', value: 'html' },
        { label: 'CSS', value: 'css' },
        { label: 'JavaScript', value: 'js' },
        { label: 'TypeScript', value: 'ts' },
        { label: 'Vue', value: 'vue' },
        { label: 'React', value: 'react' },
        { label: 'Nuxt', value: 'nuxt' },
        { label: 'Vite', value: 'vite' },
        { label: 'Figma', value: 'figma' },
      ]
      const collapsed = ref<string[]>(['html', 'css', 'js', 'ts', 'vue', 'react', 'nuxt'])
      const unlimited = ref<string[]>(['html', 'css', 'js', 'ts', 'vue', 'react', 'nuxt'])
      return { skills, collapsed, unlimited }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseSelect
          v-model="collapsed" :options="skills" multiple chips filterable
          :max-collapse-tags="3"
          label="maxCollapseTags = 3" label-placement="top"
          message="超過 3 顆收斂成 +N,滑到 +N 上可看被收斂的項目"
        />
        <BaseSelect
          v-model="unlimited" :options="skills" multiple chips filterable
          label="不設上限（預設 0）" label-placement="top"
          message="所有 chip 全展開,選很多時高度會往上長"
        />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '`maxCollapseTags`（對齊 Element Plus 語義）：chips 模式下只顯示前 N 顆可刪除 chip，其餘收斂成一顆不可刪除的 `+N`（被收斂項的 label 放在原生 `title`，hover 可見），避免多選過多時輸入框高度膨脹破版。上例上限 3、下例不設上限做對照。' } },
  },
}
