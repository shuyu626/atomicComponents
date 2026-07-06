# Atomic Components

基於 **Nuxt 4 + TypeScript** 的可重用元件庫，採用 **Atomic Design** 結構，整合 **Storybook 10** 視覺驗證與 **Vitest** 單元測試。元件設計強調**跨環境相容**（Nuxt / 純 Vite SPA）、**a11y 優先**、**CSS Token 可主題化**。

## 技術堆疊

| 類別 | 套件 |
|---|---|
| Runtime | Node.js 22（LTS） |
| Framework | Nuxt 4 / Vue 3.5 |
| 語言 | TypeScript（strict） |
| 樣式 | Sass（scoped SCSS + CSS Custom Properties） |
| 路由工具 | vue-router 5、`ufo` |
| 文件 / 視覺驗證 | Storybook 10（`@storybook/vue3-vite`） |
| 測試 | Vitest 4、`@vue/test-utils`、`@nuxt/test-utils`、`happy-dom` |
| 套件管理 | pnpm |

## 目錄結構

```
.
├── app/
│   ├── app.vue
│   ├── components/
│   │   ├── atoms/         # 最小可重用 UI 元件（BaseButton、BaseLink ...）
│   │   ├── molecules/     # 由 atoms 組合的小型功能單元（規劃中，目前為空）
│   │   ├── organisms/     # 由 molecules 組合的區塊（規劃中，目前為空）
│   │   └── templates/     # 頁面骨架（規劃中，目前為空）
│   ├── composables/       # 有響應式狀態的邏輯（useToast、usePagination、useValidation ...）
│   ├── helpers/           # 含 Vue API 的 VNode 工具（findFirstLegitChild、resolveSlotChildren）
│   └── utils/             # 純函式工具（isFunction、noop、IntersectionObserver helper ...）
├── docs/
│   └── components/        # 各元件設計規範與 API 文件
├── stories/               # Storybook stories（與 components/ 對映）
├── tests/                 # Vitest 測試（與 components/ 對映）
├── .storybook/            # Storybook 設定（含 NuxtLink stub）
├── public/                # 靜態資源
├── nuxt.config.ts
├── vitest.config.ts
└── tsconfig.json
```

> 命名規則：跨專案通用 UI 元件加 `Base` 前綴；功能模組專屬元件直接以功能名稱命名（不加前綴）。

## 快速開始

### 環境需求

- **Node.js 22**（LTS）— 建議透過 [nvm](https://github.com/nvm-sh/nvm) / [fnm](https://github.com/Schniz/fnm) / [Volta](https://volta.sh/) 等版本管理工具切換
- **pnpm** — 推薦版本管理工具

```bash
node -v   # 應顯示 v22.x.x
```

### 安裝

```bash
pnpm install
```

> 推薦使用 pnpm；若改用 npm / yarn / bun，需自行刪除 `pnpm-lock.yaml` 並重新生成 lockfile。

### 啟動開發伺服器

預設位址 `http://localhost:3000`：

```bash
pnpm dev
```

### 啟動 Storybook

預設位址 `http://localhost:6006`：

```bash
pnpm storybook
```

### 執行測試

```bash
pnpm test           # 跑一次
pnpm test:watch     # watch 模式
pnpm test:coverage  # 產生覆蓋率報告（v8 provider，輸出 text + lcov）
```

> 測試環境使用 `@nuxt/test-utils` + `happy-dom`，覆蓋率僅統計 `app/components/**`。

### 建構與預覽

```bash
pnpm build              # 建置 Nuxt 應用
pnpm preview            # 預覽 production build
pnpm generate           # 靜態站點生成（SSG）
pnpm storybook:build    # 建置靜態 Storybook（輸出至 storybook-static/）
```

## 開發約定

### 程式碼風格

- TypeScript strict mode，禁止 `any`；純型別 import 一律使用 `import type`
- Vue 3.4+ 雙向綁定統一使用 `defineModel<T>()`，禁止手寫 `modelValue` + `update:modelValue` 樣板
- Props 用泛型寫法明確定義型別：`defineProps<XxxProps>()`，有預設值搭配 `withDefaults()`
- Composable 與 utils 規則參考 `~/.claude/rules/code-reuse.md`（開發者本機的全域規範，不隨專案版控）

### 新增元件流程

1. **設計階段** — 先讀 `docs/components/component-design-spec.md`（若存在）對齊跨元件原則，確認 P0 props、slot 介面、a11y 要求
2. **實作** — 在 `app/components/<層級>/` 新增 `.vue` 檔
3. **文件** — 在 `docs/components/` 新增同名 `.md`，描述 API、行為、A11y、反模式
4. **Story** — 在 `stories/components/<層級>/` 新增 `.stories.ts`，列出所有 variant 組合矩陣
5. **測試** — 在 `tests/components/<層級>/` 新增 `.spec.ts`，覆蓋核心行為與邊界條件

### Commit 規範

採用 [Conventional Commits](https://www.conventionalcommits.org/)：

```
feat(atoms): add BaseInput component with stories, tests and docs
fix(atoms): correct BaseButton focus ring on Safari
chore(test): bump vitest to 4.2.0
docs(components): clarify BaseLink prefetch behavior
```

常用 `scope`：`atoms` / `molecules` / `organisms` / `templates` / `utils` / `storybook` / `test`。

## 設計理念

- **語意正交** — `variant`（外觀）× `color`（語意色）× `size`（尺寸）× `shape`（形狀）互相獨立，不交叉綁定
- **不假裝原生** — 互動元素優先使用 `<button>` / `<a>`，不重新發明鍵盤、focus、disabled、form integration
- **CSS Token 主題化** — 顏色 / 間距 / 圓角全走 CSS Custom Properties，跨專案落地時只需覆寫變數
- **跨環境相容** — 同一份元件可在 Nuxt 與純 Vite SPA 中運作（透過 `BaseLink` 的 fallback chain 抽象）
- **a11y 默認啟用** — `:focus-visible`、`aria-busy`、`aria-pressed`、`prefers-reduced-motion`、44×44 觸控目標、WCAG AA 對比度

## 延伸閱讀

- [Nuxt 4 Documentation](https://nuxt.com/docs/getting-started/introduction)
- [Storybook for Vue 3](https://storybook.js.org/docs/get-started/vue)
- [Vitest](https://vitest.dev/)
- [Vue 3 `defineModel`](https://vuejs.org/guide/components/v-model.html)
- 元件設計細節：見 [`docs/components/`](./docs/components/) 內各元件文件
- SSR 相容性與防護慣例：[`docs/components/ssr-compatibility.md`](./docs/components/ssr-compatibility.md)

## License

Private。
