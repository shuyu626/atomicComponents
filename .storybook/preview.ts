import { setup, type Preview } from '@storybook/vue3-vite'
import { defineComponent, h } from 'vue'

/**
 * 在 Storybook 環境（無 Nuxt Router）中，提供 NuxtLink 的輕量 stub。
 * 將 `to` prop 直接對應到 `href`，讓 BaseLink / BaseButton 的內部路由 prop
 * 可以正常預覽。
 *
 * Storybook v10 變更：`setup` 改為從 framework 套件 import 並「呼叫」，
 * 不再支援 `export function setup(app)` 的舊寫法（v7/v8 慣例）。
 * 舊寫法在 v10 下會被忽略，stub 從未註冊 → BaseLink fallback 到
 * RouterLink 分支但無 router context → 子節點不渲染（畫面看似空白連結）。
 */
const NuxtLinkStub = defineComponent({
  name: 'NuxtLink',
  props: {
    to:     { type: [String, Object], default: undefined },
    target: { type: String,           default: undefined },
    rel:    { type: String,           default: undefined },
  },
  setup(props, { slots, attrs }) {
    return () =>
      h(
        'a',
        {
          href:   typeof props.to === 'string' ? props.to : '#',
          target: props.target,
          rel:    props.rel,
          ...attrs,
        },
        slots.default?.(),
      )
  },
})

setup((app) => {
  app.component('NuxtLink', NuxtLinkStub)
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
