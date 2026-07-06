# 新增元件工作流程：測試 → Storybook

本文件規範本專案新增一個 Vue 元件後，**從測試到 Storybook 的完整作業順序**。
以 `BaseButton` 為對照範例，新元件（例如 `BaseInput`、`BaseDialog`）完全複製此流程即可。

---

## 📁 目錄結構

元件、測試、stories、文件**分目錄放置**，以相同的層級路徑互相對映：

```
app/components/atoms/[ComponentName].vue               ← 元件本體
tests/components/atoms/[ComponentName].spec.ts         ← Vitest 單元測試
stories/components/atoms/[ComponentName].stories.ts    ← Storybook stories
docs/components/[ComponentName].md                     ← API / 行為文件
```

> `atoms/` 內元件檔**扁平放置、不切子資料夾**；`tests/`、`stories/` 的目錄層級與 `app/components/` 一一對映，靠檔名即可互相跳轉。

---

## 🗺️ 流程總覽

```
完成元件
  ↓
① 寫 Vitest 單元測試 .spec.ts        ← 驗證「行為正確」
  ↓
② 跑測試 pnpm test                    ← 紅燈修到綠燈
  ↓
③ 寫 Storybook stories .stories.ts    ← 視覺化「所有 props 組合」
  ↓
④ 跑 Storybook pnpm storybook         ← 瀏覽器逐一檢視
  ↓
⑤ Build 驗證 pnpm storybook:build     ← 確保 production build 過關
  ↓
⑥ Checklist 確認 → commit
```

---

## 階段 ① — 寫單元測試

### 1.1 建立 spec 檔

**位置**：`tests/components/atoms/`，檔名 `[ComponentName].spec.ts`

### 1.2 起手範本

```ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '~/components/atoms/BaseButton.vue'

// ── Stub NuxtLink（測試環境無 Nuxt router）─────────────────
const NuxtLinkStub = {
  name: 'NuxtLink',
  props: ['to', 'target', 'rel'],
  template: '<a><slot /></a>',
}

function createWrapper(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(BaseButton, {
    props,
    slots,
    global: { stubs: { NuxtLink: NuxtLinkStub } },
  })
}

describe('BaseButton', () => {
  it('renders as <button> by default', () => {
    expect(createWrapper().element.tagName).toBe('BUTTON')
  })
})
```

### 1.3 測試覆蓋類別清單

對任何元件，**至少**寫滿這幾類測試：

| 類別 | 對應 BaseButton 的測試 |
|---|---|
| **Tag / 渲染分支** | 預設 `<button>`、有 `href` → `<a>`、有 `to` → NuxtLink |
| **Props 行為** | `disabled` / `loading` / `type` 是否正確反映到 DOM 屬性 |
| **Slots** | `default` / `prepend` / `append` / `loading` 是否各自渲染 |
| **Events** | `@click` 觸發、`disabled` 狀態下不該觸發 |
| **無障礙 a11y** | `aria-disabled` / `aria-busy` / icon-only 模式驗證 |
| **CSS class** | `variant` / `color` / `size` / `shape` 是否正確套到 root |

### 1.4 執行指令

```bash
# 一次性執行
pnpm test

# Watch 模式（推薦邊寫邊看）
pnpm test:watch

# 看覆蓋率報告
pnpm test:coverage
```

**判讀原則**：
- 紅燈 → 修元件或修測試 → 直到全綠
- **覆蓋率不是越高越好**，行為涵蓋到才是重點
- 涵蓋率產出 `coverage/lcov.info`，可送進 IDE 視覺化（推薦 VSCode `Coverage Gutters`）

---

## 階段 ② — 寫 Storybook stories

### 2.1 建立 stories 檔

**位置**：`stories/components/atoms/`，檔名 `[ComponentName].stories.ts`

### 2.2 Meta 區塊範本

每個 stories 檔的第一段：

```ts
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BaseButton from '~/components/atoms/BaseButton.vue'
import type { BaseButtonProps } from '~/components/atoms/BaseButton.vue'

const meta: Meta<typeof BaseButton> = {
  title: 'Atoms/BaseButton',          // sidebar 分類路徑
  component: BaseButton,
  tags: ['autodocs'],                  // 自動產生 Docs 頁
  argTypes: {                          // 設定 controls 介面
    variant: {
      control: { type: 'select' },
      options: ['solid', 'outline', 'ghost', 'text', 'link'],
      description: '按鈕外觀風格',
    },
    color: {
      control: { type: 'select' },
      options: ['primary', 'danger', 'success', 'warning', 'info', 'neutral'],
    },
    size:     { control: { type: 'select' }, options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    loading:  { control: 'boolean' },
  },
  render: (args: BaseButtonProps) => ({
    components: { BaseButton },
    setup() { return { args } },
    template: '<BaseButton v-bind="args">Button</BaseButton>',
  }),
}

export default meta
type Story = StoryObj<typeof meta>
```

### 2.3 Story 設計準則

每個 export 都是一個 story。建議拆成這幾類：

| Story 類型 | 目的 | 範例 |
|---|---|---|
| **Playground** | 含所有 controls，使用者互動試玩 | `Playground: Story = { args: { ... } }` |
| **Variants** | 並列展示所有外觀風格 | solid / outline / ghost / text / link |
| **Colors** | 並列展示所有語意色彩 | primary / danger / success / ... |
| **Sizes / Shapes** | 並列展示尺寸 / 形狀組合 | sm / md / lg |
| **States** | disabled / loading 等狀態 | 一次看全 |
| **WithIcons** | slot 使用情境 | prepend / append slot 範例 |
| **Matrix** | 多維交叉組合 | colors × variants 表格 |
| **AsLink / AsRouterLink** | 路由 / 外部連結情境 | `to="/home"` 或 `href="https://..."` |

### 2.4 範例：Variants story

```ts
export const Variants: Story = {
  render: () => ({
    components: { BaseButton },
    template: `
      <div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px">
        <BaseButton variant="solid">Solid</BaseButton>
        <BaseButton variant="outline">Outline</BaseButton>
        <BaseButton variant="ghost">Ghost</BaseButton>
        <BaseButton variant="text">Text</BaseButton>
        <BaseButton variant="link">Link</BaseButton>
      </div>
    `,
  }),
}
```

### 2.5 啟動 Storybook 視覺驗證

```bash
pnpm storybook
```

開啟 http://localhost:6006 ，左側 sidebar 找到 `Atoms > BaseButton`，逐一點 stories 確認：

- **視覺**：每個 variant / color / state 在實際 render 時符合預期
- **Controls 面板**：右下角可改 props 即時看結果（手動模糊測試）
- **Docs 頁**（autodocs 自動產的）：props 表格、預設值、description 完整

### 2.6 Production build 驗證

```bash
pnpm storybook:build
```

把 storybook 打包成靜態網站到 `storybook-static/`。

**這一步重要** — production build 的 transform pipeline 與 dev 不同（曾踩過 `vue-docgen-api` 污染 SFC source 的 bug，詳見「踩雷紀錄」章節）。**dev 過了不代表 build 過**，CI 跑的就是這個。

---

## ✅ 完成 Checklist

元件「真的做完」的條件：

- [ ] `pnpm test` 全綠，涵蓋 props / events / slots / a11y / 渲染分支
- [ ] `pnpm storybook` 開啟所有 stories 視覺正常
- [ ] `pnpm storybook:build` 編譯成功
- [ ] Controls 面板可互動修改所有 props
- [ ] Docs 頁面 props 表格完整顯示 description（使用 `vue-component-meta` docgen）
- [ ] 無 TypeScript / ESLint 錯誤
- [ ] Commit message 遵循 Conventional Commits

全部過了再 commit。

---

## ⚠️ 踩雷紀錄

### 雷 1：Storybook `vue-docgen-api` 污染 SFC source

**症狀**：`pnpm storybook:build` 失敗，錯誤訊息：
```
[vite:vue] BaseButton.vue (450:2000): Element is missing end tag.
```

但 `pnpm storybook` (dev) 沒事。直接用 `@vue/compiler-sfc` 解析也沒事。

**原因**：Storybook 預設的 `vue-docgen-api` plugin 在 transform 階段會把
`;_sfc_main.__docgenInfo = …` 直接 **append 到 .vue 原始 source**；若先於
`@vitejs/plugin-vue` 執行，SFC parser 看到污染後的 source 就會拋 element
missing end tag。

**修法**：`.storybook/main.ts` 內把 docgen plugin 改為 `vue-component-meta`：

```ts
framework: {
  name: '@storybook/vue3-vite',
  options: {
    docgen: 'vue-component-meta',   // 不修改 source，從 vue-tsc 抓 type
  },
}
```

### 雷 2：`@storybook/vue3-vite` 不內建 vue plugin

**症狀**：build 時 esbuild 把 `.vue` 檔誤判為 JSX：
```
ERROR: The JSX syntax extension is not currently enabled
```

**原因**：`@storybook/vue3-vite@10.x` 並未自動載入 `@vitejs/plugin-vue`，
只處理 stories 模板與 props 文件解析。SFC 編譯需手動掛載。

**修法**：`.storybook/main.ts` 內手動 push `vue()`：

```ts
import vue from '@vitejs/plugin-vue'

viteFinal(config) {
  config.plugins ??= []
  config.plugins.push(vue())
  return config
}
```

### 雷 3：BaseButton 在 Storybook 內 `resolveComponent('NuxtLink')` 拿不到

**症狀**：Storybook 預覽 `AsLink` story 時 console 警告 `NuxtLink` 未註冊。

**原因**：Storybook 跑在純 Vite 環境，沒有 Nuxt context，所以 `NuxtLink`、
auto-imports、`useRoute` 等 Nuxt 專屬 API 都不存在。

**修法**：在 `.storybook/preview.ts` 從 framework 套件 import `setup` 並**呼叫**它，全域註冊 NuxtLink stub（Storybook v10 不再支援 `export function setup(app)` 的 v7/v8 舊寫法，舊寫法會被靜默忽略、stub 從未註冊）：

```ts
import { setup, type Preview } from '@storybook/vue3-vite'
import { defineComponent, h } from 'vue'

const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: { to: ..., target: ..., rel: ... },
  setup(props, { slots, attrs }) {
    return () => h('a', { href: ..., ...attrs }, slots.default?.())
  },
})

setup((app) => {
  app.component('NuxtLink', NuxtLinkStub)
})
```

**設計提醒**：這個痛苦點其實是好的約束 — 它逼你在 atoms / molecules 層保持
Nuxt-agnostic。**只在 organisms / templates 層才依賴 Nuxt 專屬 API**。

---

## 💡 補充提醒

1. **TDD 風格更穩**：先寫測試看到紅燈，再寫元件邏輯讓它變綠。Superpowers 的
   `vue-testing` skill 有完整指引。
2. **Stories ≠ 測試**：Stories 是**展示與手動驗證**，不該取代 `.spec.ts`。
   未來想用 Storybook 的 interaction test addon 也可以，但仍是補充而非替代。
3. **a11y 視覺檢查**：未來可加 `@storybook/addon-a11y`（目前未裝）自動掃描。
4. **下個元件的起手式**：完全複製 BaseButton 的四檔結構（元件 / 測試 / stories / 文件，分屬四個目錄），只改內容。

---

## 🔗 相關檔案

- 元件範例：`app/components/atoms/BaseButton.vue`（測試 `tests/components/atoms/BaseButton.spec.ts`、stories `stories/components/atoms/BaseButton.stories.ts`、文件 `docs/components/BaseButton.md`）
- 測試配置：`vitest.config.ts`（`environment: 'nuxt'` + happy-dom）
- Storybook 配置：`.storybook/main.ts`、`.storybook/preview.ts`
- 元件架構規則：`~/.claude/rules/component-architecture.md`
- 函式複用規則：`~/.claude/rules/code-reuse.md`
