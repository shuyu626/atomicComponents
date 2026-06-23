import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

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

    it('row clicks on the select cell do not bubble to click:row', async () => {
      const w = mountTable({ selected: [] })
      await w.find('tbody .base-table__cell--select').trigger('click')
      expect(w.emitted('click:row')).toBeFalsy()
    })
  })
})
