import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'

import BaseTable from '~/components/atoms/BaseTable.vue'
import type { TableColumn, TableSort } from '~/components/atoms/BaseTable.vue'

interface Row {
  id: number
  name: string
  age: number
}

const columns: TableColumn<Row>[] = [
  { key: 'name', label: '姓名', sortable: true },
  { key: 'age', label: '年齡', align: 'right' },
]

const items: Row[] = [
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 25 },
  { id: 3, name: 'Cara', age: 28 },
]

function mountTable(props: Record<string, unknown> = {}, slots: Record<string, unknown> = {}) {
  return mount(BaseTable, {
    props: { columns, items, ...props },
    slots,
  })
}

describe('BaseTable', () => {
  // ── 結構 ─────────────────────────────────────────────────────────────────────
  describe('structure', () => {
    it('renders a thead with one header cell per column', () => {
      const w = mountTable()
      const ths = w.findAll('thead th')
      expect(ths).toHaveLength(2)
      expect(ths[0].text()).toBe('姓名')
      expect(ths[1].text()).toBe('年齡')
    })

    it('renders one body row per item', () => {
      const w = mountTable()
      expect(w.findAll('tbody tr')).toHaveLength(3)
    })

    it('renders raw cell values by default', () => {
      const w = mountTable()
      const firstRow = w.findAll('tbody tr')[0]
      expect(firstRow.text()).toContain('Alice')
      expect(firstRow.text()).toContain('30')
    })

    it('applies the alignment modifier from the column', () => {
      const w = mountTable()
      const ageCell = w.findAll('tbody tr')[0].findAll('td')[1]
      expect(ageCell.classes()).toContain('base-table__cell--right')
    })

    it('applies a column width to the matching <col>', () => {
      const w = mountTable({
        columns: [{ key: 'name', label: '姓名', width: 120 }] satisfies TableColumn<Row>[],
      })
      const col = w.findAll('colgroup col').at(-1)
      expect(col?.attributes('style')).toContain('width: 120px')
    })
  })

  // ── 自訂渲染 ───────────────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('uses column.render to transform the displayed value', () => {
      const w = mountTable({
        columns: [
          { key: 'age', label: '年齡', render: (v: unknown) => `${v} 歲` },
        ] satisfies TableColumn<Row>[],
      })
      expect(w.find('tbody tr td').text()).toBe('30 歲')
    })

    it('renders the column:<key> slot over the default value', () => {
      const w = mountTable(
        {},
        {
          'column:name': (p: { value: unknown; index: number }) => `#${p.index}-${p.value}`,
        },
      )
      expect(w.findAll('tbody tr')[0].find('td').text()).toBe('#0-Alice')
    })

    it('renders the header:<key> slot over the label', () => {
      const w = mountTable({}, { 'header:name': () => '自訂表頭' })
      expect(w.findAll('thead th')[0].text()).toBe('自訂表頭')
    })

    it('applies a function-based bodyCellClass per cell', () => {
      const w = mountTable({
        columns: [
          {
            key: 'age',
            label: '年齡',
            bodyCellClass: (value: unknown) => ((value as number) >= 30 ? 'is-senior' : ''),
          },
        ] satisfies TableColumn<Row>[],
      })
      const cells = w.findAll('tbody td')
      expect(cells[0].classes()).toContain('is-senior') // Alice 30
      expect(cells[1].classes()).not.toContain('is-senior') // Bob 25
    })

    it('applies a static headRowClass and per-column class to the head', () => {
      const w = mountTable({
        headRowClass: 'head-row',
        columns: [
          { key: 'name', label: '姓名', class: 'name-col', headCellClass: 'name-head' },
        ] satisfies TableColumn<Row>[],
      })
      expect(w.find('thead tr').classes()).toContain('head-row')
      const th = w.find('thead th')
      expect(th.classes()).toContain('name-col')
      expect(th.classes()).toContain('name-head')
      // class（共用）也套到 body cell
      expect(w.find('tbody td').classes()).toContain('name-col')
    })

    it('applies a function-based bodyRowClass per row', () => {
      const w = mountTable({
        bodyRowClass: (_item: Row, index: number) => (index === 0 ? 'first-row' : ''),
      })
      const rows = w.findAll('tbody tr')
      expect(rows[0].classes()).toContain('first-row')
      expect(rows[1].classes()).not.toContain('first-row')
    })
  })

  // ── 空狀態 ─────────────────────────────────────────────────────────────────────
  describe('empty state', () => {
    it('shows the default empty message when items is empty', () => {
      const w = mountTable({ items: [] })
      expect(w.find('.base-table__empty').text()).toBe('暫無資料')
      expect(w.findAll('tbody tr')).toHaveLength(0)
    })

    it('renders a custom empty slot', () => {
      const w = mountTable({ items: [] }, { empty: () => '沒有符合的資料' })
      expect(w.find('.base-table__empty').text()).toBe('沒有符合的資料')
    })

    it('hides the empty block when there are items', () => {
      expect(mountTable().find('.base-table__empty').exists()).toBe(false)
    })
  })

  // ── caption ────────────────────────────────────────────────────────────────────
  describe('caption', () => {
    it('renders the caption prop', () => {
      const w = mountTable({ caption: '使用者列表' })
      const caption = w.find('caption')
      expect(caption.text()).toBe('使用者列表')
      expect(caption.classes()).toContain('base-table__caption--top')
    })

    it('reflects captionSide', () => {
      const w = mountTable({ caption: 'x', captionSide: 'hidden' })
      expect(w.find('caption').classes()).toContain('base-table__caption--hidden')
    })

    it('omits the caption when neither prop nor slot provided', () => {
      expect(mountTable().find('caption').exists()).toBe(false)
    })
  })

  // ── sticky header ──────────────────────────────────────────────────────────────
  describe('sticky header', () => {
    it('toggles the sticky modifier', () => {
      expect(mountTable().classes()).not.toContain('base-table--sticky')
      expect(mountTable({ stickyHeader: true }).classes()).toContain('base-table--sticky')
    })

    // sticky 時 tbody 才是捲動區、thead/tbody 走 table-layout:fixed，欄寬需從 <col>
    // 補到儲存格上才會被 fixed 佈局吃到（否則欄位等分、column.width 失效）。
    it('applies column.width onto th/td cells only in sticky mode', () => {
      const widthCols: TableColumn<Row>[] = [
        { key: 'name', label: '姓名', width: 200 },
        { key: 'age', label: '年齡' },
      ]

      // sticky：有 width 的欄，th / td 帶 inline width；沒 width 的欄不帶
      const sticky = mountTable({ columns: widthCols, stickyHeader: true })
      const stickyTh = sticky.findAll('thead th')
      const stickyTd = sticky.findAll('tbody tr:first-child td')
      expect(stickyTh[0].attributes('style')).toContain('width: 200px')
      expect(stickyTd[0].attributes('style')).toContain('width: 200px')
      expect(stickyTh[1].attributes('style') ?? '').not.toContain('width')

      // 非 sticky：欄寬走 <col>（colgroup），儲存格不帶 inline width
      const normal = mountTable({ columns: widthCols })
      expect(normal.find('thead th').attributes('style') ?? '').not.toContain('width')
      expect(normal.find('col:nth-child(1)').attributes('style') ?? '').toContain('width: 200px')
    })
  })

  // ── itemKey ────────────────────────────────────────────────────────────────────
  describe('itemKey', () => {
    it('accepts a function itemKey without error', () => {
      const w = mountTable({ itemKey: (item: Row) => `row-${item.id}` })
      expect(w.findAll('tbody tr')).toHaveLength(3)
    })
  })

  // ── click:row ──────────────────────────────────────────────────────────────────
  describe('events', () => {
    it('emits click:row with item and index', async () => {
      const w = mountTable()
      await w.findAll('tbody tr')[1].trigger('click')
      expect(w.emitted('click:row')).toBeTruthy()
      expect(w.emitted('click:row')![0]).toEqual([items[1], 1])
    })
  })

  // ── 排序 ───────────────────────────────────────────────────────────────────────
  describe('sorting', () => {
    it('hides the sort button when v-model:sort is not bound', () => {
      expect(mountTable().find('.base-table__sort').exists()).toBe(false)
    })

    it('shows the sort button for sortable columns when sort is bound', () => {
      const w = mountTable({ sort: {} as TableSort })
      // 只有 name 欄 sortable
      expect(w.findAll('.base-table__sort')).toHaveLength(1)
    })

    it('cycles direction asc → desc → none on repeated clicks', async () => {
      const w = mountTable({ sort: {} as TableSort })
      const button = w.find('.base-table__sort')

      await button.trigger('click')
      expect(w.emitted('update:sort')![0]).toEqual([{ column: 'name', direction: 'asc' }])

      await w.setProps({ sort: { column: 'name', direction: 'asc' } })
      await button.trigger('click')
      expect(w.emitted('update:sort')![1]).toEqual([{ column: 'name', direction: 'desc' }])

      await w.setProps({ sort: { column: 'name', direction: 'desc' } })
      await button.trigger('click')
      expect(w.emitted('update:sort')![2]).toEqual([{ column: undefined, direction: undefined }])
    })

    it('exposes aria-sort on sortable header cells', async () => {
      const w = mountTable({ sort: { column: 'name', direction: 'asc' } as TableSort })
      const ths = w.findAll('thead th')
      expect(ths[0].attributes('aria-sort')).toBe('ascending')

      await w.setProps({ sort: { column: 'name', direction: 'desc' } })
      expect(w.findAll('thead th')[0].attributes('aria-sort')).toBe('descending')
    })

    it('marks a non-active sortable column as aria-sort="none"', () => {
      const w = mountTable({ sort: { column: 'age', direction: 'asc' } as TableSort })
      // name 欄 sortable 但非作用中
      expect(w.findAll('thead th')[0].attributes('aria-sort')).toBe('none')
    })

    it('omits aria-sort on non-sortable columns', () => {
      const w = mountTable({ sort: {} as TableSort })
      // age 欄不可排序
      expect(w.findAll('thead th')[1].attributes('aria-sort')).toBeUndefined()
    })
  })

  // ── 選取 ───────────────────────────────────────────────────────────────────────
  describe('selection', () => {
    it('hides the select column when v-model:selected is not bound', () => {
      expect(mountTable().find('.base-table__cell--select').exists()).toBe(false)
    })

    it('shows a select column (header + one per row) when bound', () => {
      const w = mountTable({ selected: [] })
      expect(w.findAll('.base-table__cell--select')).toHaveLength(items.length + 1)
    })

    it('selecting a row emits update:selected as an Array', async () => {
      const w = mountTable({ selected: [] })
      const firstRowCheckbox = w.findAll('tbody .base-table__checkbox')[0]
      await firstRowCheckbox.setValue(true)
      expect(w.emitted('update:selected')![0]).toEqual([[items[0]]])
    })

    it('deselecting removes the item (no in-place mutation)', async () => {
      const initial = [items[0]]
      const w = mountTable({ selected: initial })
      await w.findAll('tbody .base-table__checkbox')[0].setValue(false)
      expect(w.emitted('update:selected')![0]).toEqual([[]])
      // 原陣列未被就地修改
      expect(initial).toEqual([items[0]])
    })

    it('supports a Set as the selection model', async () => {
      const w = mountTable({ selected: new Set<Row>() })
      await w.findAll('tbody .base-table__checkbox')[1].setValue(true)
      const emitted = w.emitted('update:selected')![0][0] as Set<Row>
      expect(emitted).toBeInstanceOf(Set)
      // 注意：Set 內為 props 的 reactive proxy，改用結構比對而非參考比對
      expect([...emitted]).toEqual([items[1]])
    })

    it('the header checkbox selects all rows', async () => {
      const w = mountTable({ selected: [] })
      await w.find('thead .base-table__checkbox').setValue(true)
      expect(w.emitted('update:selected')![0]).toEqual([items.slice()])
    })

    it('the header checkbox clears the selection when all selected', async () => {
      const w = mountTable({ selected: items.slice() })
      const header = w.find('thead .base-table__checkbox')
      expect((header.element as HTMLInputElement).checked).toBe(true)
      await header.setValue(false)
      expect(w.emitted('update:selected')![0]).toEqual([[]])
    })

    it('reflects pre-selected rows in their row checkbox checked state', () => {
      const w = mountTable({ selected: [items[0], items[2]] })
      const boxes = w.findAll('tbody .base-table__checkbox')
      expect((boxes[0].element as HTMLInputElement).checked).toBe(true)
      expect((boxes[1].element as HTMLInputElement).checked).toBe(false)
      expect((boxes[2].element as HTMLInputElement).checked).toBe(true)
    })

    it('reflects the indeterminate state on the header checkbox', () => {
      const w = mountTable({ selected: [items[0]] })
      const header = w.find('thead .base-table__checkbox').element as HTMLInputElement
      expect(header.indeterminate).toBe(true)
      expect(header.checked).toBe(false)
    })

    // 真實 v-model 回歸：父層用 ref 雙向綁定時，selected 內元素會被深層包成 reactive proxy，
    // 與 items prop 的原始物件參照不同。若選取以物件參照比對，全選 / 取消 / 列勾選狀態會失準
    // （列 checkbox 不跟著表頭一起勾選）。元件改以 toRaw 正規化比對後修正。
    describe('reactivity with real v-model (toRaw identity)', () => {
      function makeHost(initial: Row[] = []) {
        const Host = defineComponent({
          setup() {
            const selected = ref<Row[]>(initial)
            return { selected }
          },
          render() {
            return h(BaseTable, {
              'columns': columns,
              'items': items,
              'selected': this.selected,
              'onUpdate:selected': (v: Row[]) => { this.selected = v },
            })
          },
        })
        return mount(Host)
      }

      const rowStates = (w: ReturnType<typeof mount>) =>
        w.findAll('tbody .base-table__checkbox').map(
          (r) => (r.element as HTMLInputElement).checked,
        )

      it('header select-all checks every row checkbox', async () => {
        const w = makeHost()
        await w.find('thead .base-table__checkbox').setValue(true)
        await w.vm.$nextTick()
        expect(rowStates(w)).toEqual([true, true, true])
      })

      it('header clear unchecks every row checkbox', async () => {
        const w = makeHost(items.slice())
        expect(rowStates(w)).toEqual([true, true, true])
        await w.find('thead .base-table__checkbox').setValue(false)
        await w.vm.$nextTick()
        expect(rowStates(w)).toEqual([false, false, false])
      })

      it('single-row toggle add then remove reflects on that row', async () => {
        const w = makeHost()
        await w.findAll('tbody .base-table__checkbox')[1].setValue(true)
        await w.vm.$nextTick()
        expect(rowStates(w)).toEqual([false, true, false])
        await w.findAll('tbody .base-table__checkbox')[1].setValue(false)
        await w.vm.$nextTick()
        expect(rowStates(w)).toEqual([false, false, false])
      })
    })

    it('row clicks on the select cell do not bubble to click:row', async () => {
      const w = mountTable({ selected: [] })
      await w.find('tbody .base-table__cell--select').trigger('click')
      expect(w.emitted('click:row')).toBeFalsy()
    })
  })

  // ── 列鍵盤可達性 ───────────────────────────────────────────────────────────────
  describe('row keyboard accessibility', () => {
    it('omits tabindex/role and keyboard activation when click:row is not bound', async () => {
      const w = mountTable()
      const row = w.findAll('tbody tr')[0]
      expect(row.attributes('tabindex')).toBeUndefined()
      expect(row.attributes('role')).toBeUndefined()
      await row.trigger('keydown', { key: 'Enter' })
      expect(w.emitted('click:row')).toBeFalsy()
    })

    it('adds tabindex=0 without a role override when click:row is bound', () => {
      const w = mountTable({ 'onClick:row': () => {} })
      const row = w.findAll('tbody tr')[1]
      expect(row.attributes('tabindex')).toBe('0')
      // 不覆寫 role:role="button" 會蓋掉 tr 的 row 語意,連帶讓 td 失去 cell 語意
      expect(row.attributes('role')).toBeUndefined()
    })

    it('activates click:row on Enter', async () => {
      const w = mountTable({ 'onClick:row': () => {} })
      await w.findAll('tbody tr')[1].trigger('keydown', { key: 'Enter' })
      expect(w.emitted('click:row')![0]).toEqual([items[1], 1])
    })

    it('activates click:row on Space', async () => {
      const w = mountTable({ 'onClick:row': () => {} })
      await w.findAll('tbody tr')[2].trigger('keydown', { key: ' ' })
      expect(w.emitted('click:row')![0]).toEqual([items[2], 2])
    })

    it('ignores other keys', async () => {
      const w = mountTable({ 'onClick:row': () => {} })
      await w.findAll('tbody tr')[0].trigger('keydown', { key: 'a' })
      expect(w.emitted('click:row')).toBeFalsy()
    })
  })

  // ── 文案（i18n labels）─────────────────────────────────────────────────────────
  describe('labels (i18n)', () => {
    it('defaults all aria / empty text to Traditional Chinese', () => {
      const w = mountTable({ items: [], selected: [], sort: {} as TableSort })
      expect(w.find('thead .base-table__checkbox').attributes('aria-label')).toBe('全選')
      expect(w.find('.base-table__sort').attributes('aria-label')).toBe('依「姓名」排序')
      expect(w.find('.base-table__empty').text()).toBe('暫無資料')
    })

    it('uses the default selectRow label per row', () => {
      const w = mountTable({ selected: [] })
      const boxes = w.findAll('tbody .base-table__checkbox')
      expect(boxes[0].attributes('aria-label')).toBe('選取第 1 列')
      expect(boxes[2].attributes('aria-label')).toBe('選取第 3 列')
    })

    it('overrides selectAll / sortBy / empty with strings', () => {
      const w = mountTable({
        items: [],
        selected: [],
        sort: {} as TableSort,
        labels: { selectAll: 'Select all', sortBy: 'Sort', empty: 'No data' },
      })
      expect(w.find('thead .base-table__checkbox').attributes('aria-label')).toBe('Select all')
      expect(w.find('.base-table__sort').attributes('aria-label')).toBe('Sort')
      expect(w.find('.base-table__empty').text()).toBe('No data')
    })

    it('overrides selectRow with a string applied to every row', () => {
      const w = mountTable({ selected: [], labels: { selectRow: 'Select this row' } })
      const boxes = w.findAll('tbody .base-table__checkbox')
      expect(boxes[0].attributes('aria-label')).toBe('Select this row')
      expect(boxes[1].attributes('aria-label')).toBe('Select this row')
    })

    it('overrides sortBy / selectRow with functions', () => {
      const w = mountTable({
        selected: [],
        sort: {} as TableSort,
        labels: {
          sortBy: (label: string) => `Sort by ${label}`,
          selectRow: (index: number) => `Row ${index}`,
        },
      })
      expect(w.find('.base-table__sort').attributes('aria-label')).toBe('Sort by 姓名')
      expect(w.findAll('tbody .base-table__checkbox')[0].attributes('aria-label')).toBe('Row 0')
    })

    it('falls back per-field when only partial labels are given', () => {
      const w = mountTable({ items: [], labels: { empty: '查無資料' } })
      expect(w.find('.base-table__empty').text()).toBe('查無資料')
    })
  })

  // ── 跨頁選取邊界 ───────────────────────────────────────────────────────────────
  describe('cross-page selection boundary', () => {
    const stale = (n: number): Row[] =>
      Array.from({ length: n }, (_, i) => ({ id: 100 + i, name: `S${i}`, age: i }))

    it('is neither checked nor indeterminate when only off-page items are selected', () => {
      // 兩個非當頁殘留項目，當頁三項皆未選 → 不應誤判為半選
      const w = mountTable({ selected: stale(2) })
      const header = w.find('thead .base-table__checkbox').element as HTMLInputElement
      expect(header.checked).toBe(false)
      expect(header.indeterminate).toBe(false)
    })

    it('does not break when selected size exceeds current items', () => {
      // 殘留 4 項 > 當頁 3 項，當頁皆未選
      const w = mountTable({ selected: stale(4) })
      const header = w.find('thead .base-table__checkbox').element as HTMLInputElement
      expect(header.checked).toBe(false)
      expect(header.indeterminate).toBe(false)
    })

    it('is indeterminate when some current items are selected alongside off-page extras', () => {
      const w = mountTable({ selected: [...stale(2), items[0]] })
      const header = w.find('thead .base-table__checkbox').element as HTMLInputElement
      expect(header.checked).toBe(false)
      expect(header.indeterminate).toBe(true)
    })

    it('is fully checked when all current items are selected despite off-page extras', () => {
      const w = mountTable({ selected: [...stale(2), ...items] })
      const header = w.find('thead .base-table__checkbox').element as HTMLInputElement
      expect(header.checked).toBe(true)
      expect(header.indeterminate).toBe(false)
    })
  })

  // ── 跨頁選取 (C1-1 regression) ────────────────────────────────────────────────
  // toggleAll 過去以「當前頁 items 或 []」整批取代 selected，會摧毀其他頁的既有選取。
  // 修正後改為增量：全選＝把當前頁併入既有集合、取消＝只移除當前頁。
  describe('cross-page selection (C1-1 regression)', () => {
    // 模擬「其他頁」已選取、但不在當前 items 中的項目
    const otherPageRow: Row = { id: 99, name: 'OtherPage', age: 40 }

    it('全選當前頁時保留其他頁的既有選取 (Array)', async () => {
      const w = mountTable({ selected: [otherPageRow] })
      await w.find('thead .base-table__checkbox').setValue(true)
      const emitted = w.emitted('update:selected')!.at(-1)![0] as Row[]
      // 既有項在父層是 reactive proxy，用結構比對（toContainEqual）而非參考比對
      expect(emitted).toContainEqual(otherPageRow)
      for (const item of items) expect(emitted).toContainEqual(item)
      expect(emitted).toHaveLength(items.length + 1)
    })

    it('取消全選只移除當前頁，保留其他頁 (Array)', async () => {
      const w = mountTable({ selected: [otherPageRow, ...items] })
      await w.find('thead .base-table__checkbox').setValue(false)
      const emitted = w.emitted('update:selected')!.at(-1)![0] as Row[]
      expect(emitted).toEqual([otherPageRow])
    })

    it('Set 模型全選同樣保留其他頁選取', async () => {
      const w = mountTable({ selected: new Set<Row>([otherPageRow]) })
      await w.find('thead .base-table__checkbox').setValue(true)
      const emitted = w.emitted('update:selected')!.at(-1)![0] as Set<Row>
      expect(emitted).toBeInstanceOf(Set)
      // 既有項在父層是 reactive proxy，用結構比對
      expect([...emitted]).toContainEqual(otherPageRow)
      expect(emitted.size).toBe(items.length + 1)
    })
  })
})

describe('BaseTable — click:row 與儲存格互動元素', () => {
  it('點擊自訂欄 slot 內的按鈕不誤觸 click:row；點擊列的其他區域才觸發', async () => {
    const w = mountTable(
      {},
      { 'column:name': () => h('button', { class: 'cell-action', type: 'button' }, 'edit') },
    )

    await w.find('.cell-action').trigger('click')
    expect(w.emitted('click:row')).toBeUndefined()

    await w.findAll('tbody .base-table__row td')[1]!.trigger('click')
    expect(w.emitted('click:row')).toHaveLength(1)
  })

  it('鍵盤 Enter 落在儲存格內按鈕時同樣不誤觸 click:row（與滑鼠對稱）', async () => {
    // onRowKeydown 有 isRowClickable 守衛（讀 vnode props 的 onClick:row），需綁 listener 才會走鍵盤路徑
    const w = mountTable(
      { 'onClick:row': () => {} },
      { 'column:name': () => h('button', { class: 'cell-action', type: 'button' }, 'edit') },
    )

    await w.find('.cell-action').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('click:row')).toBeUndefined()

    await w.find('tbody .base-table__row').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('click:row')).toHaveLength(1)
  })
})
