import { ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BaseFileUpload from '~/components/atoms/BaseFileUpload.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BaseFileUpload 是受控 / 展示型上傳:只負責選檔 / 拖放 / 清單 / 前端驗證(型別 / 大小 /
// 數量),不發任何上傳請求(副作用交給 caller)。v-model 綁 File[],被拒檔以 error 事件
// 回報。包在 BaseFormField 內,狀態色走 --field-* token。

const WRAP = (inner: string) =>
  `<div style="max-width:480px;padding:24px;font-family:system-ui">${inner}</div>`

const NAMES = (files: File[]) => files.map((f) => f.name).join(', ')

const meta = {
  title: 'Atoms/BaseFileUpload',
  component: BaseFileUpload,
  tags: ['autodocs'],
  argTypes: {
    accept: { control: { type: 'text' }, description: '原生 accept(image/*、.pdf,.doc)' },
    multiple: { control: { type: 'boolean' }, description: '是否可多檔。預設 false' },
    maxSize: { control: { type: 'number' }, description: '單檔大小上限(bytes)' },
    maxFiles: { control: { type: 'number' }, description: '檔案數上限' },
    drag: { control: { type: 'boolean' }, description: '顯示拖放區。預設 true' },
    showFileList: { control: { type: 'boolean' }, description: '顯示已選檔清單。預設 true' },
    label: { control: { type: 'text' }, description: '標籤文字' },
    labelPlacement: { control: { type: 'inline-radio' }, options: ['left', 'top'], description: '標籤位置。預設 left' },
    message: { control: { type: 'text' }, description: '輔助 / 驗證訊息' },
    error: { control: { type: 'boolean' }, description: '錯誤狀態。預設 false' },
    required: { control: { type: 'boolean' }, description: '必填。預設 false' },
    disabled: { control: { type: 'boolean' }, description: '停用。預設 false' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    label: '附件',
    labelPlacement: 'top',
    multiple: true,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BaseFileUpload },
    setup() {
      const files = ref<File[]>([])
      return { args, files, NAMES }
    },
    template: WRAP(`
      <BaseFileUpload v-bind="args" v-model="files" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">files: {{ NAMES(files) || '(空)' }}</p>
    `),
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Single —— 單檔
// ─────────────────────────────────────────────────────────────────────────────

export const Single: Story = {
  render: () => ({
    components: { BaseFileUpload },
    setup() {
      const files = ref<File[]>([])
      return { files, NAMES }
    },
    template: WRAP(`
      <BaseFileUpload v-model="files" label="頭像" label-placement="top" />
      <p style="margin-top:12px;font-size:13px;color:#6b7280">files: {{ NAMES(files) || '(空)' }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '單檔模式(預設):新選 / 拖放的檔會取代舊檔。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiple —— 多檔
// ─────────────────────────────────────────────────────────────────────────────

export const Multiple: Story = {
  render: () => ({
    components: { BaseFileUpload },
    setup() {
      const files = ref<File[]>([])
      return { files, NAMES }
    },
    template: WRAP(`
      <BaseFileUpload v-model="files" multiple label="附件" label-placement="top">
        <template #tip>支援多檔;拖曳或點擊皆可</template>
      </BaseFileUpload>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">files: {{ NAMES(files) || '(空)' }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`multiple`:可累加多檔;清單每列可單獨移除。`#tip` slot 放提示文字。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept —— 限定型別
// ─────────────────────────────────────────────────────────────────────────────

export const Accept: Story = {
  render: () => ({
    components: { BaseFileUpload },
    setup() {
      const files = ref<File[]>([])
      const onError = (e: { file: File; reason: string }) =>
        window.alert(`「${e.file.name}」被拒絕:${e.reason}`)
      return { files, onError }
    },
    template: WRAP(`
      <BaseFileUpload v-model="files" multiple accept="image/*" label="僅圖片" label-placement="top" @error="onError">
        <template #tip>僅接受圖片(image/*)</template>
      </BaseFileUpload>
    `),
  }),
  parameters: {
    docs: { description: { story: '`accept="image/*"`:非圖片檔被拒並觸發 `error({ reason: "type" })`(此例彈 alert)。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MaxSize / MaxFiles —— 大小 / 數量上限
// ─────────────────────────────────────────────────────────────────────────────

export const Limits: Story = {
  render: () => ({
    components: { BaseFileUpload },
    setup() {
      const files = ref<File[]>([])
      const log = ref('')
      const onError = (e: { file: File; reason: string }) => { log.value = `拒絕 ${e.file.name}:${e.reason}` }
      const onExceed = (e: { limit: number }) => { log.value = `超過上限 ${e.limit} 個` }
      return { files, log, onError, onExceed, NAMES }
    },
    template: WRAP(`
      <BaseFileUpload v-model="files" multiple :max-size="1024" :max-files="3" label="限制" label-placement="top" @error="onError" @exceed="onExceed">
        <template #tip>單檔 ≤ 1KB;最多 3 個</template>
      </BaseFileUpload>
      <p style="margin-top:12px;font-size:13px;color:#6b7280">{{ log }}</p>
    `),
  }),
  parameters: {
    docs: { description: { story: '`maxSize`(bytes)超出 → `error("size")`;`maxFiles` 超出 → `exceed`,並只保留上限內的檔。' } },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// States —— disabled / error
// ─────────────────────────────────────────────────────────────────────────────

export const States: Story = {
  render: () => ({
    components: { BaseFileUpload },
    setup() {
      return { a: ref<File[]>([]), b: ref<File[]>([]) }
    },
    template: WRAP(`
      <div style="display:flex;flex-direction:column;gap:20px">
        <BaseFileUpload v-model="a" label="停用" label-placement="top" disabled />
        <BaseFileUpload v-model="b" label="錯誤" label-placement="top" error message="請上傳必要文件" />
      </div>
    `),
  }),
  parameters: {
    docs: { description: { story: '狀態透過 --field-* token 傳遞:`disabled` 不可點 / 拖放;`error` 邊框 / 訊息轉紅。' } },
  },
}
