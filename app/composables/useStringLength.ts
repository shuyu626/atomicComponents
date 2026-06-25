import { computed, toValue } from 'vue'

import type { ComputedRef, MaybeRefOrGetter } from 'vue'

/**
 * 以 grapheme cluster（使用者感知的「一個字」）計算字串長度。
 *
 * 優先用原生 `Intl.Segmenter`：emoji（含膚色 / ZWJ 組合，如 👨‍👩‍👧‍👦）、
 * 中日韓字元都正確算 1 個字。環境不支援時退回 `[...str]`（以 code point 迭代，
 * 仍比 `String.prototype.length` 的 UTF-16 code unit 準確，至少不會把單一字元拆成兩個）。
 */
// 模組層級共用單一 Segmenter（建構成本不低，避免每次計算都 new 一個）。
const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null

function graphemeLength(value: string): number {
  if (segmenter) {
    let count = 0
    for (const _ of segmenter.segment(value)) count++
    return count
  }
  return [...value].length
}

/**
 * 回傳字串「字數」的 computed（以 grapheme cluster 計）。
 *
 * 取代參考實作對 `string-length` 套件的相依，改用零依賴的原生 `Intl.Segmenter`
 * （見 {@link graphemeLength}）。供 BaseTextField 的 `showCount` 顯示輸入字數，
 * 確保 emoji / 中日韓字元計數與使用者直覺一致。
 *
 * @param value 字串，可為 ref / getter / 純值；變動時自動重算
 *
 * @example
 * const count = useStringLength(() => text.value)
 * count.value // text 為 'café' → 4；'👨‍👩‍👧‍👦' → 1
 */
export default function useStringLength(
  value: MaybeRefOrGetter<string>,
): ComputedRef<number> {
  return computed(() => graphemeLength(toValue(value)))
}
