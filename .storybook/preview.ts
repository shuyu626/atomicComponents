import type { Preview } from '@storybook/vue3-vite'
import type { App } from 'vue'
import { defineComponent, h } from 'vue'

/**
 * 在 Storybook 環境（無 Nuxt Router）中，提供 NuxtLink 的輕量 stub。
 * 將 `to` prop 直接對應到 `href`，讓 BaseButton 的 `to` prop 可以正常預覽。
 *
 * Storybook 會自動識別此具名 export，並在 Vue app 建立時呼叫。
 */
export function setup(app: App): void {
  app.component(
    'NuxtLink',
    defineComponent({
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
    }),
  )
}

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
