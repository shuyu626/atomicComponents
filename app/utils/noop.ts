/**
 * No-op：空函式。
 *
 * 常見用途：
 *   - `.catch(noop)` 吞掉預期可被忽略的 async 錯誤
 *   - 預設 callback prop（避免呼叫 undefined）
 *   - 條件分支的 placeholder
 */
export default function noop(): void {}
