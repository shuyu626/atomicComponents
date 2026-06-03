import { computed, ref } from 'vue'
import type { StoryObj } from '@storybook/vue3-vite'
import BasePopover from '~/components/atoms/BasePopover.vue'

// ─────────────────────────────────────────────────────────────────────────────
// Meta
// ─────────────────────────────────────────────────────────────────────────────
//
// BasePopover 是「錨定式浮層」底座：以 #reference slot 為錨點，用 floating-ui 在其周邊
// 彈出 #default slot 內容，並 Teleport 到 <body> 脫離 overflow / z-index 裁切。
// 觸發方式（click / hover / focus / touch）、定位（flip / shift / arrow）、開關、Esc /
// click-outside、focus-trap 都內建。useId() / Teleport 在 Storybook 純 Vue 環境同樣可用。

const REF_BTN
  = 'padding:8px 14px;font:500 0.875rem system-ui;color:#fff;background:#1d4ed8;border:none;border-radius:6px;cursor:pointer'
const MENU_ITEM
  = 'display:block;width:100%;text-align:left;padding:6px 10px;font:0.875rem system-ui;color:#1f2937;background:none;border:none;border-radius:4px;cursor:pointer'

const meta = {
  title: 'Atoms/BasePopover',
  component: BasePopover,
  tags: ['autodocs'],
  argTypes: {
    trigger: {
      control: { type: 'select' },
      options: ['click', 'hover', 'focus', 'touch'],
      description: '觸發方式（可單選或陣列複選）。預設 click',
    },
    placement: {
      control: { type: 'select' },
      options: [
        'top', 'top-start', 'top-end',
        'right', 'right-start', 'right-end',
        'bottom', 'bottom-start', 'bottom-end',
        'left', 'left-start', 'left-end',
      ],
      description: '首選位置；空間不足時 flip / shift 自動調整',
    },
    offset: {
      control: { type: 'number' },
      description: '浮層與 reference 的間距（px）',
    },
    role: {
      control: { type: 'text' },
      description: '浮層 ARIA role（menu / listbox / dialog / tooltip…），並推導 aria-haspopup',
    },
    disabled: {
      control: { type: 'boolean' },
      description: '整體禁用：不可觸發、不渲染浮層',
    },
    disableFocusTrap: {
      control: { type: 'boolean' },
      description: '關閉焦點陷阱（預設僅在浮層內有可聚焦元素時啟用）',
    },
    hoverCloseDelay: {
      control: { type: 'number' },
      description: 'hover 觸發時，滑出到關閉的延遲（ms），用來吃掉跨 offset 間隙的 mouseleave',
    },
    autoFit: {
      control: { type: 'boolean' },
      description: '垂直放置時讓浮層寬度貼齊 reference（dropdown / select）',
    },
    modelValue: { control: false, description: '開關狀態（v-model，可不綁）' },
    arrow: { control: false, description: '箭頭定位設定（見 WithArrow story）' },
  },
}

export default meta
type Story = StoryObj

// ─────────────────────────────────────────────────────────────────────────────
// Playground —— Controls 面板可互動 trigger / placement / offset…
// ─────────────────────────────────────────────────────────────────────────────

export const Playground: Story = {
  args: {
    trigger: 'click',
    placement: 'bottom',
    offset: 8,
    role: 'dialog',
    disabled: false,
    disableFocusTrap: false,
    hoverCloseDelay: 120,
  },
  render: (args: Record<string, unknown>) => ({
    components: { BasePopover },
    setup() {
      return { args, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover v-bind="args">
          <template #reference>
            <button :style="REF_BTN">開啟浮層</button>
          </template>
          <template #default="{ close }">
            <div style="min-width:200px;font:0.875rem system-ui;color:#374151">
              <p style="margin:0 0 8px">這是 Popover 內容，可放任意 HTML / 元件。</p>
              <button :style="REF_BTN" @click="close">關閉</button>
            </div>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// ClickDropdown —— 點擊開啟的選單（最常見用法）
// ─────────────────────────────────────────────────────────────────────────────

export const ClickDropdown: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      const items = ['編輯', '複製', '封存', '刪除']
      const last = ref('')
      return { items, last, REF_BTN, MENU_ITEM }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <BasePopover placement="bottom-start" role="menu">
          <template #reference>
            <button :style="REF_BTN">動作選單 ▾</button>
          </template>
          <template #default="{ close }">
            <div style="min-width:140px;display:flex;flex-direction:column;gap:2px">
              <button
                v-for="item in items"
                :key="item"
                :style="MENU_ITEM"
                @mouseover="(e) => (e.target.style.background = '#f3f4f6')"
                @mouseout="(e) => (e.target.style.background = 'none')"
                @click="last = item; close()"
              >{{ item }}</button>
            </div>
          </template>
        </BasePopover>
        <p style="color:#6b7280;font-size:0.875rem">最後選擇：{{ last || '（尚未選擇）' }}</p>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// HoverTooltip —— hover 觸發的提示（含防閃爍延遲）
// ─────────────────────────────────────────────────────────────────────────────

export const HoverTooltip: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover trigger="hover" placement="top" role="tooltip" :offset="6">
          <template #reference>
            <button :style="REF_BTN">滑鼠移上來</button>
          </template>
          <template #default>
            <span style="font:0.8125rem system-ui;color:#374151">這是一段提示文字</span>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// FocusHint —— focus 觸發（適合非互動提示，如輸入框說明）
// ─────────────────────────────────────────────────────────────────────────────

export const FocusHint: Story = {
  render: () => ({
    components: { BasePopover },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover trigger="focus" placement="bottom-start" role="tooltip" disable-focus-trap>
          <template #reference>
            <input
              placeholder="點我聚焦"
              style="padding:8px 10px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px"
            />
          </template>
          <template #default>
            <span style="font:0.8125rem system-ui;color:#374151">密碼需至少 8 碼，含大小寫與數字</span>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Placements —— 各方向 + 對齊變體（點擊各鈕查看）
// ─────────────────────────────────────────────────────────────────────────────

export const Placements: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      const placements = [
        'top-start', 'top', 'top-end',
        'left', 'bottom', 'right',
        'bottom-start', 'bottom-end', 'left-start',
      ]
      return { placements }
    },
    template: `
      <div style="padding:120px;font-family:system-ui;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:560px;margin:0 auto">
        <BasePopover v-for="p in placements" :key="p" :placement="p" role="tooltip">
          <template #reference>
            <button style="width:100%;padding:8px;font:0.75rem system-ui;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">{{ p }}</button>
          </template>
          <template #default>
            <span style="font:0.75rem system-ui;color:#374151">placement="{{ p }}"</span>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// WithArrow —— 箭頭跟隨位置（翻轉時自動旋轉）
// ─────────────────────────────────────────────────────────────────────────────

export const WithArrow: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      // 用「穩定的 template ref + computed」組 arrow prop：computed 只在 arrowRef
      // 變動（掛載那一次）時重算，回傳的物件參考穩定。
      // ⚠️ 切勿用 :ref="(el) => state = {...}" 在 render 期間寫入新物件 —— 會與
      // floating-ui 的自動重算形成無限迴圈，導致瀏覽器當掉。
      const arrowRef = ref<HTMLElement | null>(null)
      const arrow = computed(() => ({ element: arrowRef.value, padding: 6 }))
      return { arrowRef, arrow, REF_BTN }
    },
    template: `
      <div style="padding:100px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover :arrow="arrow" placement="top">
          <template #reference>
            <button :style="REF_BTN">帶箭頭的浮層</button>
          </template>
          <template #default="{ arrowStyle }">
            <div style="max-width:220px;font:0.875rem system-ui;color:#374151">
              箭頭會跟著 reference 的相對位置移動，空間不足翻轉時也會自動轉向。
              <!--
                箭頭圖形本身要指向下方（▼）：元件的 arrowStyle 會依 placement 再旋轉到正確方位。
                用 clip-path 切三角形（保留真實尺寸讓 floating-ui 正確置中）；白色接續浮層、
                drop-shadow 讓白箭頭在白底上仍有輪廓。
              -->
              <div
                ref="arrowRef"
                :style="[arrowStyle, {
                  width:'14px', height:'7px', background:'#fff',
                  clipPath:'polygon(50% 100%, 0 0, 100% 0)',
                  filter:'drop-shadow(0 2px 1px rgba(0,0,0,0.07))',
                }]"
              />
            </div>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// AutoFitDropdown —— 浮層寬度貼齊 reference（select 樣式）
// ─────────────────────────────────────────────────────────────────────────────

export const AutoFitDropdown: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      const options = ['台北', '台中高鐵特區', '高雄']
      const selected = ref('請選擇城市')
      return { options, selected, MENU_ITEM }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover auto-fit placement="bottom-start" role="listbox">
          <template #reference>
            <button style="min-width:240px;display:flex;justify-content:space-between;padding:8px 12px;font:0.875rem system-ui;color:#1f2937;background:#fff;border:1px solid #d1d5db;border-radius:6px;cursor:pointer">
              <span>{{ selected }}</span><span>▾</span>
            </button>
          </template>
          <template #default="{ close }">
            <div style="display:flex;flex-direction:column;gap:2px">
              <button
                v-for="opt in options"
                :key="opt"
                :style="MENU_ITEM"
                @click="selected = opt; close()"
              >{{ opt }}</button>
            </div>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// FocusTrap —— 浮層內有可聚焦元素時，Tab 循環不跑出（Esc 關閉並還焦）
// ─────────────────────────────────────────────────────────────────────────────

export const FocusTrap: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover role="dialog" placement="bottom">
          <template #reference>
            <button :style="REF_BTN">開啟對話框</button>
          </template>
          <template #default="{ close }">
            <div style="min-width:240px;display:flex;flex-direction:column;gap:8px;font:0.875rem system-ui;color:#374151">
              <p style="margin:0">焦點被鎖在浮層內 —— 連按 Tab 不會跑到背景，Esc 可關閉。</p>
              <input placeholder="欄位一" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:4px" />
              <input placeholder="欄位二" style="padding:6px 8px;border:1px solid #d1d5db;border-radius:4px" />
              <div style="display:flex;gap:8px;justify-content:flex-end">
                <button style="padding:6px 12px;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer" @click="close">取消</button>
                <button :style="REF_BTN" @click="close">確定</button>
              </div>
            </div>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Controlled —— 外部 v-model 控制開關
// ─────────────────────────────────────────────────────────────────────────────

export const Controlled: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      const open = ref(false)
      return { open, REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;flex-direction:column;align-items:center;gap:12px">
        <button :style="REF_BTN" @click="open = !open">外部切換（目前：{{ open ? '開' : '關' }}）</button>
        <BasePopover v-model="open" placement="bottom">
          <template #reference>
            <button style="padding:8px 14px;font:0.875rem system-ui;border:1px solid #d1d5db;border-radius:6px;background:#fff;cursor:pointer">錨點（點此也可切換）</button>
          </template>
          <template #default="{ close }">
            <div style="min-width:180px;font:0.875rem system-ui;color:#374151">
              <p style="margin:0 0 8px">由父層 v-model 控制。</p>
              <button :style="REF_BTN" @click="close">關閉</button>
            </div>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}

// ─────────────────────────────────────────────────────────────────────────────
// Disabled —— 禁用：不可觸發
// ─────────────────────────────────────────────────────────────────────────────

export const Disabled: Story = {
  render: () => ({
    components: { BasePopover },
    setup() {
      return { REF_BTN }
    },
    template: `
      <div style="padding:80px;font-family:system-ui;display:flex;justify-content:center">
        <BasePopover disabled>
          <template #reference>
            <button :style="REF_BTN" style="opacity:0.5;cursor:not-allowed">已禁用（點擊無反應）</button>
          </template>
          <template #default>
            <span>不會顯示</span>
          </template>
        </BasePopover>
      </div>
    `,
  }),
}
