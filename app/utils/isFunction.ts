/**
 * Type guard：value 是否為 function。
 *
 * 比直接寫 `typeof x === 'function'` 多了型別收斂 — TS 在 true 分支會把
 * `unknown` 縮成 `Function` 型別，後續呼叫不需要再額外 cast。
 *
 * @example
 * const maybeFn: unknown = ...
 * if (isFunction(maybeFn)) {
 *   maybeFn()  // TS 知道這裡可以呼叫
 * }
 */
export default function isFunction(
  value: unknown,
): value is (...args: unknown[]) => unknown {
  return typeof value === 'function'
}
