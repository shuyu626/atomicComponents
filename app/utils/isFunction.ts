type AnyFunction = (...args: never[]) => unknown

/**
 * Type guard：value 是否為 function。
 *
 * 用泛型 `Extract<T, Fn>` 而非固定的 `(...args) => unknown`，才能在 **union 型別**
 * （如 `keyof Item | ((item, index) => Key)`）中正確收斂：
 * - true 分支：收斂成 union 內**那個函式成員本身**（保留其原始參數 / 回傳型別），
 *   呼叫得到正確回傳型別（非 `unknown`）
 * - false 分支：把函式成員從 union 移除（如只剩 `keyof Item`，可安全當索引）
 *
 * （`Extract<T, Fn>` 必為 `T` 的子集，滿足 type predicate 對參數型別的可指派限制。）
 *
 * @example
 * // union：true 分支可呼叫並拿到正確回傳型別；else 分支排除函式
 * const key: keyof Item | ((i: Item) => PropertyKey) = ...
 * if (isFunction(key)) key(item)  // => PropertyKey
 * else item[key]                  // key: keyof Item
 */
export default function isFunction<T>(
  value: T,
): value is Extract<T, AnyFunction> {
  return typeof value === 'function'
}
