import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { StorybookConfig } from '@storybook/vue3-vite'
import vue from '@vitejs/plugin-vue'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appDir = resolve(__dirname, '../app')

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)', '../stories/**/*.mdx'],
  addons: [],
  framework: {
    name: '@storybook/vue3-vite',
    options: {
      /**
       * 改用 vue-component-meta 取代預設的 vue-docgen-api。
       * 後者 transform 會把 `;_sfc_main.__docgenInfo = …` 直接 append 到
       * .vue 原始 source；若先於 @vitejs/plugin-vue 執行，SFC parser 會
       * 在解析被污染的 source 時拋「Element is missing end tag」。
       * vue-component-meta 透過 vue-tsc 抓 type metadata，不修改 source。
       */
      docgen: 'vue-component-meta',
    },
  },
  docs: {},

  /**
   * @storybook/vue3-vite v10 並未內建 @vitejs/plugin-vue（僅處理 stories
   * 模板與 props 文件解析），因此 SFC 編譯需手動掛載，否則 production
   * build 時 esbuild 會將 .vue 檔誤判為 JSX 而失敗。
   *
   * 同時補上 `~` / `@` alias 對齊 Nuxt 4 預設 srcDir（`app/`）。Storybook 的
   * Vite 不會繼承 Nuxt 的 alias，元件內若用 `~/components/...` 路徑會 resolve fail。
   */
  viteFinal(config) {
    config.plugins ??= []
    config.plugins.push(vue())

    config.resolve ??= {}
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '~': appDir,
      '@': appDir,
    }

    return config
  },
}

export default config
