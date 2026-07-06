import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseFileUpload from '~/components/atoms/BaseFileUpload.vue'

function fileOf(name: string, size: number, type = 'text/plain'): File {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}
function setInputFiles(input: HTMLInputElement, files: File[]) {
  const dt = new DataTransfer()
  files.forEach((f) => dt.items.add(f))
  try {
    input.files = dt.files
  }
  catch {
    Object.defineProperty(input, 'files', { configurable: true, value: dt.files })
  }
  input.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('BaseFileUpload — skeleton', () => {
  it('renders a dropzone and hidden file input', () => {
    const w = mount(BaseFileUpload, { attachTo: document.body })
    expect(w.find('.base-file-upload__dropzone').attributes('role')).toBe('button')
    expect(w.find('input.base-file-upload__input').attributes('type')).toBe('file')
    w.unmount()
  })

  it('adds selected files to v-model and lists them', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: true }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('a.txt', 100), fileOf('b.txt', 200)])
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toHaveLength(2)
    expect(w.findAll('.base-file-upload__item')).toHaveLength(2)
    w.unmount()
  })
})

describe('BaseFileUpload — validation', () => {
  it('rejects files over maxSize and emits error(size)', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: true, maxSize: 150 }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('ok.txt', 100), fileOf('big.txt', 999)])
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toHaveLength(1)
    expect((w.emitted('error')!.at(-1)![0] as { reason: string }).reason).toBe('size')
    w.unmount()
  })

  it('rejects by accept mismatch and emits error(type)', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: true, accept: 'image/*' }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('doc.txt', 10, 'text/plain'), fileOf('pic.png', 10, 'image/png')])
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toHaveLength(1)
    expect((w.emitted('error')!.at(-1)![0] as { reason: string }).reason).toBe('type')
    w.unmount()
  })

  it('single mode keeps only the last file', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: false }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('a.txt', 10)])
    await w.vm.$nextTick()
    setInputFiles(input, [fileOf('b.txt', 10)])
    await w.vm.$nextTick()
    const last = w.emitted('update:modelValue')!.at(-1)![0] as File[]
    expect(last).toHaveLength(1)
    expect(last[0].name).toBe('b.txt')
    w.unmount()
  })

  it('emits exceed when over maxFiles', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: true, maxFiles: 1 }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('a.txt', 10), fileOf('b.txt', 10)])
    await w.vm.$nextTick()
    expect(w.emitted('exceed')).toBeTruthy()
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toHaveLength(1)
    w.unmount()
  })

  it('toggles dragging class on dragover/leave', async () => {
    const w = mount(BaseFileUpload, { attachTo: document.body })
    const zone = w.find('.base-file-upload__dropzone')
    await zone.trigger('dragover')
    expect(zone.classes()).toContain('base-file-upload__dropzone--dragging')
    await zone.trigger('dragleave')
    expect(zone.classes()).not.toContain('base-file-upload__dropzone--dragging')
    w.unmount()
  })
})

describe('BaseFileUpload — a11y naming', () => {
  it('links the dropzone to the field label via aria-labelledby when label is set', () => {
    const w = mount(BaseFileUpload, { props: { label: '附件' }, attachTo: document.body })
    const zone = w.find('.base-file-upload__dropzone')

    const labelledby = zone.attributes('aria-labelledby')
    expect(labelledby).toBeTruthy()
    // labelledby 指到 BaseFormField 的 label 元素,且內容即使用者的 label
    const labelEl = document.getElementById(labelledby!)
    expect(labelEl).not.toBeNull()
    expect(labelEl!.textContent).toContain('附件')
    // labelledby 優先:不再補固定的 aria-label
    expect(zone.attributes('aria-label')).toBeUndefined()
    w.unmount()
  })

  it('falls back to aria-label (triggerLabel) when no label is provided', () => {
    const w = mount(BaseFileUpload, { attachTo: document.body })
    const zone = w.find('.base-file-upload__dropzone')
    expect(zone.attributes('aria-labelledby')).toBeUndefined()
    expect(zone.attributes('aria-label')).toBe('上傳檔案')
    w.unmount()
  })
})

describe('BaseFileUpload — thumbnails', () => {
  it('renders an img thumbnail for image files', async () => {
    const w = mount(BaseFileUpload, { props: { multiple: true, accept: 'image/*' }, attachTo: document.body })
    const input = w.find('input.base-file-upload__input').element as HTMLInputElement
    setInputFiles(input, [fileOf('pic.png', 10, 'image/png')])
    await w.vm.$nextTick()
    expect(w.find('.base-file-upload__thumb').exists()).toBe(true)
    w.unmount()
  })
})
