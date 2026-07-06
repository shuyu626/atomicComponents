<template>
  <BaseFormField
    class="base-file-upload"
    v-bind="fieldProps"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>

    <template #default="{ id, labelledby, describedby, invalid, disabled: isDisabledState }">
      <div class="base-file-upload__body">
        <!--
          拖放區:role="button" 可鍵盤觸發檔案對話框;拖放事件切換 --dragging 狀態。
          真正的 <input type="file"> 視覺隱藏但仍由這裡的 open() 觸發。
          取名:有使用者 label(labelledby 存在)時以 aria-labelledby 關聯欄位標籤優先,
          此時不再補 aria-label;無 label 才退回固定的 triggerLabel。
        -->
        <div
          class="base-file-upload__dropzone"
          :class="{
            'base-file-upload__dropzone--dragging': isDragging,
            'base-file-upload__dropzone--disabled': isDisabledState,
            'base-file-upload__dropzone--no-drag': !drag,
          }"
          role="button"
          :tabindex="isDisabledState ? -1 : 0"
          :aria-labelledby="labelledby"
          :aria-label="labelledby ? undefined : triggerLabel"
          :aria-disabled="isDisabledState || undefined"
          :aria-describedby="describedby"
          @click="open"
          @keydown.enter.prevent="open"
          @keydown.space.prevent="open"
          @dragenter.prevent
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <input
            :id="id"
            ref="inputRef"
            class="base-file-upload__input"
            type="file"
            :accept="accept"
            :multiple="multiple"
            :disabled="isDisabledState"
            :aria-invalid="invalid"
            hidden
            @change="onChange"
          >

          <slot :open="open">
            <svg
              class="base-file-upload__cloud"
              viewBox="0 0 24 24"
              width="36"
              height="36"
              aria-hidden="true"
              focusable="false"
            >
              <path
                d="M7 18a4 4 0 0 1 0-8 5 5 0 0 1 9.6-1.5A3.5 3.5 0 0 1 18 18H7z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path
                d="M12 12v6m0-6l-2.2 2.2M12 12l2.2 2.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <!--
              視覺 CTA:拖放區本身即 role="button"(可鍵盤觸發),此處用 span 呈現按鈕樣式,
              點擊會冒泡到拖放區的 open(),避免 button 巢在 button 內造成的 ARIA 違規與重複 tab stop。
            -->
            <span class="base-file-upload__button">{{ triggerText }}</span>
            <span
              v-if="drag"
              class="base-file-upload__hint"
            >或將檔案拖曳到此處</span>
          </slot>
        </div>

        <div
          v-if="$slots.tip"
          class="base-file-upload__tip"
        >
          <slot name="tip" />
        </div>

        <!-- 已選檔清單。 -->
        <ul
          v-if="showFileList && files.length"
          class="base-file-upload__list"
        >
          <li
            v-for="(file, index) in files"
            :key="`${file.name}-${file.size}-${file.lastModified}`"
            class="base-file-upload__item"
          >
            <slot
              name="file"
              :file="file"
              :index="index"
              :remove="() => remove(index)"
            >
              <img
                v-if="isImage(file)"
                class="base-file-upload__thumb"
                :src="previewUrl(file)"
                :alt="file.name"
              >
              <svg
                v-else
                class="base-file-upload__file-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  d="M6 2h8l4 4v16H6z"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
                <path
                  d="M14 2v4h4"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linejoin="round"
                />
              </svg>

              <span class="base-file-upload__name">{{ file.name }}</span>
              <span class="base-file-upload__size">{{ formatBytes(file.size) }}</span>

              <button
                v-if="!isDisabledState"
                type="button"
                class="base-file-upload__remove"
                :aria-label="`移除 ${file.name}`"
                @click="remove(index)"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                  />
                </svg>
              </button>
            </slot>
          </li>
        </ul>
      </div>
    </template>

    <template
      v-if="displayMessage || $slots.message"
      #message="{ error }"
    >
      <slot
        name="message"
        :error="error"
        :message="displayMessage"
      >{{ displayMessage }}</slot>
    </template>
  </BaseFormField>
</template>

<script lang="ts">
/** 檔案被拒絕的原因。 */
export type FileUploadRejectReason = 'size' | 'type' | 'count'
</script>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import BaseFormField from '~/components/atoms/BaseFormField.vue'
import type { BaseFormFieldProps } from '~/components/atoms/BaseFormField.vue'
import useFieldValidation from '~/composables/useFieldValidation'
import useValidation from '~/composables/useValidation'
import formatBytes from '~/utils/formatBytes'
import type { ValidationRule } from '~/utils/validators'

export interface BaseFileUploadProps extends BaseFormFieldProps {
  /** 原生 `accept`(如 `image/*`、`.pdf,.doc`),同時作型別驗證。 */
  accept?: string
  /** 是否可多檔。 @default false */
  multiple?: boolean
  /** 單檔大小上限(bytes);超出 reject 並 emit `error`。 */
  maxSize?: number
  /** 檔案數上限;超出 reject 並 emit `exceed`。 */
  maxFiles?: number
  /** 顯示拖放區(關閉則僅點擊觸發)。 @default true */
  drag?: boolean
  /** 顯示已選檔清單。 @default true */
  showFileList?: boolean
  /** 拖放區 aria-label(i18n 覆寫點)。 @default '上傳檔案' */
  triggerLabel?: string
  /** 上傳按鈕文字(i18n 覆寫點)。 @default '選擇檔案' */
  triggerText?: string
  /** 驗證規則陣列(如「至少一檔」)。 */
  rules?: ValidationRule<File[]>[]
}

const props = withDefaults(defineProps<BaseFileUploadProps>(), {
  accept: undefined,
  multiple: false,
  maxSize: undefined,
  maxFiles: undefined,
  drag: true,
  showFileList: true,
  triggerLabel: '上傳檔案',
  triggerText: '選擇檔案',
  rules: undefined,
})

const emit = defineEmits<{
  /** 有檔案被拒絕(型別 / 大小)時逐檔觸發。 */
  error: [payload: { file: File; reason: FileUploadRejectReason }]
  /** 選檔數超過 `maxFiles` 時觸發(帶超出的檔與上限)。 */
  exceed: [payload: { files: File[]; limit: number }]
}>()

defineSlots<{
  /** 標籤內容,取代 `label` prop。 */
  label?: () => unknown
  /** 拖放區內容,取代預設「點擊或拖曳」。scoped prop:`open`(觸發檔案對話框)。 */
  default?: (props: { open: () => void }) => unknown
  /** 拖放區下方的提示文字。 */
  tip?: () => unknown
  /** 自訂清單列。scoped props:`file`、`index`、`remove`。 */
  file?: (props: { file: File; index: number; remove: () => void }) => unknown
  /** 訊息內容,取代 `message` prop。scoped props:`error`、`message`。 */
  message?: (props: { error: boolean; message?: string }) => unknown
}>()

/** v-model 一律以 `File[]` 保存(單檔時長度 0/1)。 */
const model = defineModel<File[]>({ default: () => [] })

const files = computed<File[]>(() => model.value ?? [])

const inputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

// ── 選檔 / 驗證 ─────────────────────────────────────────────────────────────
function open() {
  if (props.disabled) return
  inputRef.value?.click()
}

/** 依 `accept` 判斷檔案型別是否符合(支援 `image/*`、精確 mime、`.ext`)。 */
function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
  if (!tokens.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return tokens.some((token) => {
    if (token === '*/*' || token === '*') return true
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1))
    if (token.startsWith('.')) return name.endsWith(token)
    return type === token
  })
}

function addFiles(incoming: File[]) {
  const accepted: File[] = []
  for (const file of incoming) {
    if (props.accept && !matchesAccept(file, props.accept)) {
      emit('error', { file, reason: 'type' })
      continue
    }
    if (props.maxSize != null && file.size > props.maxSize) {
      emit('error', { file, reason: 'size' })
      continue
    }
    accepted.push(file)
  }

  if (!props.multiple) {
    // 單檔:以最後一個通過驗證的檔取代;無通過檔則保留原值。
    const last = accepted[accepted.length - 1]
    if (last) model.value = [last]
    return
  }

  let merged = [...files.value, ...accepted]
  if (props.maxFiles != null && merged.length > props.maxFiles) {
    emit('exceed', { files: accepted, limit: props.maxFiles })
    merged = merged.slice(0, props.maxFiles)
  }
  model.value = merged
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  // 清掉 input 值,讓「再次選同一個檔」也會觸發 change。
  input.value = ''
}

function remove(index: number) {
  const next = [...files.value]
  const [removed] = next.splice(index, 1)
  if (removed) revoke(removed)
  model.value = next
}

// ── 拖放 ────────────────────────────────────────────────────────────────────
function onDragOver() {
  if (!props.disabled && props.drag) isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}
function onDrop(event: DragEvent) {
  isDragging.value = false
  if (props.disabled || !props.drag) return
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}

// ── 圖片縮圖(object URL 生命週期,client-only)──────────────────────────────
const urlMap = new Map<File, string>()
const canUseObjectUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'

function isImage(file: File): boolean {
  return file.type.startsWith('image/')
}
function previewUrl(file: File): string {
  if (!isImage(file) || !canUseObjectUrl) return ''
  const cached = urlMap.get(file)
  if (cached) return cached
  try {
    const url = URL.createObjectURL(file)
    urlMap.set(file, url)
    return url
  }
  catch {
    return ''
  }
}
function revoke(file: File) {
  const url = urlMap.get(file)
  if (url && canUseObjectUrl) URL.revokeObjectURL(url)
  urlMap.delete(file)
}

// 檔案離開清單(單檔取代 / 外部改 v-model 等)時,回收其 object URL,避免洩漏與 File 被強引用。
watch(files, (list) => {
  const alive = new Set(list)
  for (const [file, url] of urlMap) {
    if (!alive.has(file)) {
      if (canUseObjectUrl) URL.revokeObjectURL(url)
      urlMap.delete(file)
    }
  }
})

onUnmounted(() => {
  if (canUseObjectUrl) urlMap.forEach((url) => URL.revokeObjectURL(url))
  urlMap.clear()
})

// ── 驗證 ────────────────────────────────────────────────────────────────────
const validation = useValidation<File[]>(
  () => files.value,
  () => props.rules,
)

/** 合併「外部 props」與「驗證結果」後轉發給 BaseFormField,詳見 `useFieldValidation`。 */
const { displayMessage, fieldProps } = useFieldValidation(() => props, validation)

defineExpose({
  /** 強制驗證;回傳是否通過。 */
  validate: validation.validate,
  /** 重置驗證顯示狀態。 */
  reset: validation.reset,
  /** 開啟檔案選擇對話框。 */
  open,
})
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseFileUpload — 受控 / 展示型上傳
 *
 * 只負責選檔 / 拖放 / 清單 / 前端驗證(型別 / 大小 / 數量);不發任何上傳請求
 * (副作用交給 caller / services 層)。v-model 綁 File[],被拒檔以 error 事件回報。
 * 包在 BaseFormField 內,狀態色讀 --field-* token。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

.base-file-upload {
  &__body {
    width: 100%;
  }

  &__dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 24px;
    color: #6b7280;
    text-align: center;
    background: var(--field-background, #fff);
    border: 1px dashed var(--field-color);
    border-radius: var(--field-radius);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;

    &:hover {
      border-color: var(--field-active-color);
    }

    &:focus-visible {
      border-color: var(--field-active-color);
      outline: 2px solid transparent;
      outline-offset: 2px;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--field-active-color) 22%, transparent);
    }

    &--dragging {
      border-color: var(--field-active-color);
      background: color-mix(in srgb, var(--field-active-color) 6%, #fff);
    }

    &--disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }

    // 不支援拖放時,改為實線邊框(不暗示可拖放),文案也不顯示拖曳提示。
    &--no-drag {
      border-style: solid;
    }
  }

  &__cloud {
    color: var(--field-active-color);
  }

  // 視覺 CTA(span):拖放區負責 focus / 鍵盤,故此處不含 focus / disabled 樣式。
  // cursor 由父層 dropzone 繼承(hover 為 pointer、disabled 為 not-allowed)。
  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 36px;
    padding: 0 18px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #fff;
    background: var(--field-active-color);
    border-radius: var(--field-radius);
    transition: filter 0.15s ease;

    @media (pointer: coarse) {
      min-height: 44px;
    }
  }

  // hover 拖放區任一處都讓 CTA 反饋(整區即按鈕)。
  &__dropzone:hover &__button {
    filter: brightness(0.94);
  }

  &__hint {
    font-size: 0.8125rem;
    color: #9ca3af;
  }

  &__input {
    // hidden 屬性已隱藏;此處確保即便被覆寫也不佔位。
    display: none;
  }

  &__tip {
    margin-top: 6px;
    font-size: 0.75rem;
    color: #9ca3af;
  }

  &__list {
    margin: 12px 0 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid #eef0f3;
    border-radius: 6px;

    & + & {
      margin-top: 8px;
    }
  }

  &__thumb {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 4px;
    background: #f3f4f6;
  }

  &__file-icon {
    flex-shrink: 0;
    color: #9ca3af;
  }

  &__name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    font-size: 0.875rem;
    color: #1f2937;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__size {
    flex-shrink: 0;
    font-size: 0.75rem;
    color: #9ca3af;
    font-variant-numeric: tabular-nums;
  }

  &__remove {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    color: #9ca3af;
    background: transparent;
    border: 0;
    border-radius: 50%;
    cursor: pointer;
    transition: color 0.12s ease, background-color 0.12s ease;

    &:hover {
      color: #dc2626;
      background: #fef2f2;
    }

    &:focus-visible {
      outline: 2px solid var(--field-active-color);
      outline-offset: 1px;
    }

    @media (pointer: coarse) {
      width: 44px;
      height: 44px;
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .base-file-upload__dropzone,
  .base-file-upload__button,
  .base-file-upload__remove {
    transition: none;
  }
}
</style>
