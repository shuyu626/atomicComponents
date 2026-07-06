import { toValue, watchEffect } from 'vue'

import type { MaybeRefOrGetter, Ref } from 'vue'

export interface UseComposingModelOptions {
  /**
   * 是否把值轉成數字（如 `looseToNumber`：無法解析就保留原字串）。這是**完整判斷**，
   * 由呼叫端把所有來源（`.number` modifier、`type="number"`…）合併後傳入；
   * 不轉數字的控制項（如 textarea）不傳即可。 @default false
   */
  castToNumber?: MaybeRefOrGetter<boolean>
  /** 每次 input 事件後呼叫（組字中 / `.lazy` 期間也會呼叫），供 autosize 等即時量測掛鉤。 */
  onAfterInput?: () => void
}

export interface UseComposingModelReturn {
  /** 綁到控制項 `@compositionstart`。 */
  onCompositionStart: () => void
  /** 綁到控制項 `@compositionend`。 */
  onCompositionEnd: (event: Event) => void
  /** 綁到控制項 `@input`。 */
  onInput: (event: Event) => void
  /** 綁到控制項 `@change`。 */
  onChange: (event: Event) => void
}

/**
 * 文字型控制項（input / textarea）的「IME 組字 + v-model 同步」共用樣板：
 * 用 `defineModel` 取代 `vModelText` 內部 API 後，這裡手動補回其行為——
 *
 * - **IME 組字**：注音 / 拼音 / 日文等組字途中不提交中途值（`composing` 旗標），
 *   組字結束（compositionend）才提交最終值；`.lazy` 仍留待 change 提交。
 * - **modifiers**：`.trim` / `.lazy` 與數字轉型（見 {@link UseComposingModelOptions.castToNumber}）
 *   行為對齊原生 v-model；change（blur / Enter）一律提交並把顯示值正規化。
 * - **model → 控制項同步**：以 watchEffect 手動指派 `el.value` 並複刻 Vue
 *   `vModelText.beforeUpdate` 的守衛——聚焦中 / 組字中且「修整後的值與 model 相等」時
 *   不覆寫，避免吃掉使用者正在輸入的字（如 `.trim` 的尾隨空白、數字的 `"1."`）。
 *   用模板 ref + watchEffect 取代 `:value` 綁定（`:value` 會在每次 model 變動無條件覆寫）。
 *
 * @param model `defineModel` 回傳的 model ref（`castToNumber` 只該在 model 含 number 的控制項啟用）
 * @param modifiers `defineModel` 回傳的 modifiers（`.trim` / `.lazy`…）
 * @param inputRef 控制項的模板 ref（input / textarea）
 * @param options 差異掛鉤（數字轉型 / input 後回呼）
 *
 * @example
 * const [model, modifiers] = defineModel<string>()
 * const inputRef = ref<HTMLTextAreaElement | null>(null)
 * const { onCompositionStart, onCompositionEnd, onInput, onChange } =
 *   useComposingModel(model, modifiers, inputRef, { onAfterInput: calcTextareaHeight })
 */
export default function useComposingModel<T extends string | number>(
  model: Ref<T | undefined>,
  modifiers: Record<string, true | undefined>,
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null>,
  options: UseComposingModelOptions = {},
): UseComposingModelReturn {
  const shouldCast = (): boolean => toValue(options.castToNumber) ?? false

  /** 從 DOM 字串套用 modifier（trim → number），轉成最終要寫入 model 的值。 */
  function readValue(raw: string): T {
    let value: string | number = modifiers.trim ? raw.trim() : raw
    if (shouldCast()) {
      const parsed = Number.parseFloat(value)
      // 對齊 looseToNumber：無法解析（如空字串）就保留原字串，不硬塞 NaN。
      value = Number.isNaN(parsed) ? value : parsed
    }
    // castToNumber 僅在 model 型別含 number 的控制項啟用（見參數說明），此收斂安全。
    return value as T
  }

  // IME 組字狀態：組字途中不提交中途值，對齊原生 v-model（`vModelText` 以 `el.composing` 達成）。
  let composing = false

  function onCompositionStart() {
    composing = true
  }

  function onCompositionEnd(event: Event) {
    if (!composing) return
    composing = false
    // 組字結束才提交最終值；`.lazy` 仍留待 change 提交。
    if (!modifiers.lazy) {
      model.value = readValue((event.target as HTMLInputElement | HTMLTextAreaElement).value)
    }
  }

  function onInput(event: Event) {
    // 組字中 / `.lazy`（改在 change 提交）期間不更新 model，但 onAfterInput 掛鉤仍即時執行
    // （如 autosize 需要在組字中也調整高度）。
    if (composing || modifiers.lazy) {
      options.onAfterInput?.()
      return
    }
    model.value = readValue((event.target as HTMLInputElement | HTMLTextAreaElement).value)
    options.onAfterInput?.()
  }

  function onChange(event: Event) {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement
    // change（blur / Enter）一律提交：涵蓋 `.lazy`，也讓 `.trim` / 數字轉型在失焦後把
    // 顯示值正規化（去尾隨空白 / 去無效字元）——此時 model 可能未變、watchEffect 不會觸發，
    // 故在這裡直接把 el.value 同步成正規化後的字串。
    model.value = readValue(el.value)
    const canonical = model.value == null ? '' : String(model.value)
    if (el.value !== canonical) el.value = canonical
  }

  /**
   * model → 控制項同步：複刻 `vModelText.beforeUpdate` 的守衛——聚焦中且組字中 / `.lazy` /
   * 「修整後的值與 model 相等」時不覆寫，避免吃掉使用者正在輸入的字。
   */
  watchEffect(() => {
    const el = inputRef.value
    if (!el) return

    const value = model.value
    const next = value == null ? '' : String(value)

    if (typeof document !== 'undefined' && document.activeElement === el) {
      if (composing || modifiers.lazy) return
      if (modifiers.trim && el.value.trim() === String(value)) return
      if (shouldCast() && Number.parseFloat(el.value) === value) return
    }

    if (el.value !== next) el.value = next
  })

  return { onCompositionStart, onCompositionEnd, onInput, onChange }
}
