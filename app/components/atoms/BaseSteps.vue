<template>
  <!--
    純步驟指示器：只畫「節點 + 標題 + 說明 + 連接線」，不含內容面板 ——
    使用端自行用 v-if / v-show 依 v-model:current 切換各步內容（見 docs 的 wizard 範例）。
  -->
  <ol
    class="base-steps"
    :class="`base-steps--${direction}`"
  >
    <li
      v-for="(item, index) in items"
      :key="index"
      class="base-steps__item"
      :class="`base-steps__item--${statusOf(item, index)}`"
      :aria-current="index === current ? 'step' : undefined"
    >
      <component
        :is="clickable ? 'button' : 'div'"
        class="base-steps__header"
        :type="clickable ? 'button' : undefined"
        :disabled="clickable && item.disabled ? true : undefined"
        @click="onStepClick(item, index)"
      >
        <span
          class="base-steps__node"
          aria-hidden="true"
        >
          <slot
            name="icon"
            :item="item"
            :index="index"
            :status="statusOf(item, index)"
          >
            <svg
              v-if="statusOf(item, index) === 'finish'"
              class="base-steps__icon-svg"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
            <svg
              v-else-if="statusOf(item, index) === 'error'"
              class="base-steps__icon-svg"
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
            <template v-else>{{ index + 1 }}</template>
          </slot>
        </span>
        <span class="base-steps__sr-only">第 {{ index + 1 }} 步，共 {{ items.length }} 步{{ STATUS_SR_TEXT[statusOf(item, index)] }}</span>
        <span class="base-steps__texts">
          <span class="base-steps__title">
            <slot
              name="title"
              :item="item"
              :index="index"
              :status="statusOf(item, index)"
            >{{ item.title }}</slot>
          </span>
          <span
            v-if="item.description || $slots.description"
            class="base-steps__description"
          >
            <slot
              name="description"
              :item="item"
              :index="index"
              :status="statusOf(item, index)"
            >{{ item.description }}</slot>
          </span>
        </span>
      </component>
      <span
        v-if="index < items.length - 1"
        class="base-steps__line"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>

<script setup lang="ts">
export type BaseStepStatus = 'wait' | 'process' | 'finish' | 'error'

export interface BaseStepItem {
  /** 步驟標題。 */
  title: string
  /** 補充描述。 */
  description?: string
  /** 狀態覆寫；未設時由 current 位置自動推導。 */
  status?: BaseStepStatus
  /** clickable 模式下停用點擊。 @default false */
  disabled?: boolean
}

export interface BaseStepsProps {
  /** 步驟資料。 */
  items: BaseStepItem[]
  /**
   * 排列方向。
   * @default 'horizontal'
   */
  direction?: 'horizontal' | 'vertical'
  /**
   * 步驟可點擊切換（渲染為 button 並更新 v-model:current）。
   * @default false
   */
  clickable?: boolean
}

const props = withDefaults(defineProps<BaseStepsProps>(), {
  direction: 'horizontal',
  clickable: false,
})

/** 目前所在步驟（0-based）。 */
const current = defineModel<number>('current', { default: 0 })

const emit = defineEmits<{
  /** clickable 模式下點擊步驟時觸發（同時更新 v-model:current）。 */
  change: [index: number]
}>()

defineSlots<{
  /** 自訂節點圖示；預設 finish 顯示 ✓、error 顯示 ✕、其餘顯示編號。 */
  icon?: (props: { item: BaseStepItem; index: number; status: BaseStepStatus }) => unknown
  /** 自訂標題；預設顯示 item.title。 */
  title?: (props: { item: BaseStepItem; index: number; status: BaseStepStatus }) => unknown
  /** 自訂描述；預設顯示 item.description。 */
  description?: (props: { item: BaseStepItem; index: number; status: BaseStepStatus }) => unknown
}>()

/** 推導單步狀態：item.status 覆寫優先，否則依 current 位置。 */
function statusOf(item: BaseStepItem, index: number): BaseStepStatus {
  if (item.status) return item.status
  if (index < current.value) return 'finish'
  if (index === current.value) return 'process'
  return 'wait'
}

function onStepClick(item: BaseStepItem, index: number) {
  if (!props.clickable || item.disabled || index === current.value) return
  current.value = index
  emit('change', index)
}

/** sr-only 狀態後綴：讓狀態不只靠顏色／圖示傳達。 */
const STATUS_SR_TEXT: Record<BaseStepStatus, string> = {
  wait: '',
  process: '（進行中）',
  finish: '（已完成）',
  error: '（發生錯誤）',
}
</script>

<style scoped lang="scss">
/*
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * BaseSteps — 線性流程步驟指示器
 *
 * 純進度指示（node + title + description + 連接線），不含內容面板 —— 使用端
 * 自行搭配 v-if / v-show 依 v-model:current 切換各步內容（與 BaseTabs 的分工
 * 見 docs）。所有外觀抽成 --steps-* token，覆寫即可主題化：
 *
 *   .base-steps { --steps-accent: #7c3aed; --steps-icon-size: 32px; }
 *
 * 節點視覺採「實心語言」：finish／error 實心 accent／error 底 + 白色 ✓／✕，
 * process 實心 accent 底 + 白字編號、外加同色柔光暈 ring（box-shadow）凸顯
 * 目前所在步驟；wait 淡灰描邊 + 灰編號，視覺重量最輕。
 *
 * 橫向版式：節點置上、標籤置中於下（主流 stepper 版式），連接線以絕對定位
 * 貫穿於節點中心高度；直向版式維持節點在左、文字在右。
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

/*
 * 預設 token 以 :where()（specificity 0）宣告，確保使用端 class 覆寫得動。
 */
:where(.base-steps) {
  --steps-accent: #1d4ed8; // 對齊 --field-active-color
  --steps-on-accent: #fff; // process 實心底上的編號文字色
  --steps-wait-color: #9ca3af; // gray-400
  --steps-error-color: #dc2626; // 對齊 --field-danger-color
  --steps-icon-size: 30px;
  --steps-line-thickness: 2px;
  --steps-line-color: #e5e7eb;
  --steps-title-font-size: 0.875rem;
  --steps-title-color: #374151; // gray-700（process / finish）
  --steps-description-font-size: 0.75rem;
  --steps-description-color: #6b7280; // gray-500
  --steps-gap: 10px; // node 與文字之間的間距
  --steps-vertical-gap: 32px; // vertical 模式下每步之間的垂直間距

  display: flex;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ── 方向 ─────────────────────────────────────────────────── */
.base-steps--horizontal {
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
  // 被放進 flex row 容器時也要撐滿可用寬度（否則會縮成內容寬、擠在一側）。
  flex: 1 1 auto;
}

.base-steps--vertical {
  flex-direction: column;
}

/* ── item ─────────────────────────────────────────────────── */
.base-steps__item {
  display: flex;
  align-items: flex-start;
}

// 橫向：每步等寬直欄（節點在上、標籤置中在下），連接線以絕對定位跨到下一步。
.base-steps--horizontal .base-steps__item {
  position: relative;
  flex: 1 1 0%;
  flex-direction: column;
  align-items: center;
}

.base-steps--vertical .base-steps__item {
  position: relative;
  flex-direction: column;
  padding-bottom: var(--steps-vertical-gap);

  &:last-child {
    padding-bottom: 0;
  }
}

/* ── header（node + sr-only + texts）───────────────────────── */
.base-steps__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--steps-gap);
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: default;
  background: none;
  border: none;
}

// 橫向：header 轉直欄（節點上、標籤下）且置中。
.base-steps--horizontal .base-steps__header {
  flex-direction: column;
  text-align: center;
}

button.base-steps__header {
  cursor: pointer;
  border-radius: 6px;

  &:focus-visible {
    outline: 2px solid var(--steps-accent);
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5; // 對齊 BaseButton disabled
  }

  // 粗指標裝置：維持 28px node 視覺（不撐開版面、不移動連接線），
  // 改用透明 hit-area pseudo 擴大觸控區至 44×44（對齊 BaseButton --sm 做法，WCAG 2.5.5）。
  @media (pointer: coarse) {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: max(100%, 44px);
      height: max(100%, 44px);
      transform: translate(-50%, -50%);
    }
  }
}

// clickable hover：wait 步驟預覽「可前往」狀態——node 描邊與編號轉 accent，
// 給予與 BaseTabs / BaseButton 一致的 hover 回饋；process / finish / error
// 已自帶狀態色，不再疊 hover（避免 error 節點 hover 變 accent 的誤導）。
.base-steps__item--wait button.base-steps__header:hover:not(:disabled) .base-steps__node {
  color: var(--steps-accent);
  border-color: var(--steps-accent);
}

// 直向：文字與節點「垂直置中」對齊（單行標題置於節點正中，帶描述時整組置中）。
.base-steps--vertical .base-steps__header {
  align-items: center;
  width: 100%;
}

/* ── node（圓形節點）──────────────────────────────────────── */
// 基底 = wait：淡灰描邊 + 灰編號，視覺重量最輕（實心留給已發生／進行中的狀態）。
.base-steps__node {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: var(--steps-icon-size);
  height: var(--steps-icon-size);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1;
  color: var(--steps-wait-color);
  background-color: #fff; // 實底：讓貫穿的連接線不會透出節點後方
  border: var(--steps-line-thickness) solid var(--steps-line-color);
  border-radius: 50%;
  // 節點（含光暈）蓋在連接線之上——參考設計中線是「沒入」光暈後方的。
  position: relative;
  z-index: 1;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

// finish：實心 accent 底 + 白 ✓。
.base-steps__item--finish .base-steps__node {
  color: var(--steps-on-accent);
  background-color: var(--steps-accent);
  border-color: var(--steps-accent);
}

// process：實心 accent 底 + 白字編號，外加同色柔光暈 ring（明顯凸出於節點外）
// 凸顯目前所在步驟。
.base-steps__item--process .base-steps__node {
  color: var(--steps-on-accent);
  background-color: var(--steps-accent);
  border-color: var(--steps-accent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--steps-accent) 25%, transparent);
}

// error：實心 error 底 + 白 ✕（與 finish 同語言、只換色，錯誤一眼可辨）。
.base-steps__item--error .base-steps__node {
  color: var(--steps-on-accent);
  background-color: var(--steps-error-color);
  border-color: var(--steps-error-color);
}

.base-steps__icon-svg {
  display: block;
}

/* ── sr-only：視覺隱藏但保留給螢幕閱讀器（抄 BaseFormField 的 clip 寫法）─── */
.base-steps__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  white-space: nowrap;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  border: 0;
}

/* ── 文字（標題 / 描述）───────────────────────────────────── */
.base-steps__texts {
  display: flex;
  flex-direction: column;
  min-width: 0; // 允許長字串截斷 / 換行而非撐破
}

// 標題一律深灰（參考主流 stepper：步驟差異由節點承載，標題保持可讀），
// 僅 process / error 以 accent / error 色標記。
.base-steps__title {
  font-size: var(--steps-title-font-size);
  font-weight: 600;
  color: var(--steps-title-color);
  transition: color 0.15s ease; // hover / 狀態切換的顏色過場，與 node 一致
}

// 目前步驟的標題／描述用 accent 上色（與光暈 ring 呼應，一眼鎖定所在步驟）。
.base-steps__item--process .base-steps__title {
  color: var(--steps-accent);
}

.base-steps__item--error .base-steps__title {
  color: var(--steps-error-color);
}

.base-steps__description {
  margin-top: 2px;
  font-size: var(--steps-description-font-size);
  color: var(--steps-description-color);
  transition: color 0.15s ease;
}

.base-steps__item--process .base-steps__description {
  color: var(--steps-accent);
}

/* ── 連接線 ───────────────────────────────────────────────── */
.base-steps__line {
  flex-shrink: 0;
  background-color: var(--steps-line-color);
  transition: background-color 0.15s ease;
}

// 橫向：絕對定位貫穿於節點中心高度——從本步節點右緣延伸到下一步節點左緣
// （等寬直欄下，下一步節點中心位於本步 item 的 150% 處）。線在 DOM 上晚於本步
// header 但早於下一步節點，天然被下一步節點蓋住，不需 z-index。
.base-steps--horizontal .base-steps__line {
  position: absolute;
  top: calc((var(--steps-icon-size) - var(--steps-line-thickness)) / 2);
  left: calc(50% + var(--steps-icon-size) / 2);
  right: calc(-50% + var(--steps-icon-size) / 2);
  height: var(--steps-line-thickness);
}

.base-steps--vertical .base-steps__line {
  position: absolute;
  top: var(--steps-icon-size);
  bottom: 0;
  left: calc((var(--steps-icon-size) - var(--steps-line-thickness)) / 2);
  width: var(--steps-line-thickness);
  height: auto;
}

// 完成段（該步為 finish）線上 accent 色。
.base-steps__item--finish .base-steps__line {
  background-color: var(--steps-accent);
}

@media (prefers-reduced-motion: reduce) {
  .base-steps__node,
  .base-steps__title,
  .base-steps__line {
    transition: none;
  }
}
</style>
