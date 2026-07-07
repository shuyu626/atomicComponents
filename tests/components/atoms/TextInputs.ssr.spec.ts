import { describe, it, expect } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

import BaseTextField from '~/components/atoms/BaseTextField.vue'
import BaseTextarea from '~/components/atoms/BaseTextarea.vue'

// ── SSR 首渲值 (C1-5 regression) ─────────────────────────────────────────────────
// TextField / Textarea 的值同步過去只靠 client 端 useComposingModel，SSR 首渲 HTML
// 完全沒有 value，「編輯表單回填」頁首屏空白、hydration 後才補值。修正後以初始值快照
// 綁 :value，讓 server 首渲即帶值（且不干擾 client 聚焦編輯 / .trim 行為）。
describe('文字輸入 SSR 首渲值 (C1-5 regression)', () => {
  it('BaseTextField SSR 首渲即輸出 value 屬性', async () => {
    const html = await renderToString(createSSRApp(BaseTextField, { modelValue: 'hello' }))
    expect(html).toContain('value="hello"')
  })

  it('BaseTextarea SSR 首渲即把值輸出為 textarea 內文', async () => {
    const html = await renderToString(createSSRApp(BaseTextarea, { modelValue: 'hello world' }))
    expect(html).toContain('hello world')
  })
})
