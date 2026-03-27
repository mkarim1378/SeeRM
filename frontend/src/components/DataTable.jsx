import { useState, useRef, useEffect } from 'react'
import { Search, Copy, Check, Download, SlidersHorizontal } from 'lucide-react'
import * as XLSX from 'xlsx'

const COLUMN_LABELS = {
  numberr: 'شماره', name: 'نام', sp: 'کارشناس',
  chini: 'چینی', dakheli: 'داخلی', zaban: 'زبان',
  book: 'کتاب', carman: 'کارمن', azmoon: 'آزمون',
  ghabooli: 'قبولی', garage: 'گاراژ', hoz: 'حضوری',
  kia: 'کره‌ای', milyarder: 'میلیاردر', 'gds-tuts': 'GDS دوره',
  gds: 'GDS', 'tpms-tuts': 'TPMS', zed: 'ضد سرقت',
  kmc: 'KMC', carmap: 'کارمپ', eps: 'EPS',
  products: 'محصولات',
}

const PRODUCT_KEYS = [
  { key: 'chini', label: 'چینی' },
  { key: 'dakheli', label: 'داخلی' },
  { key: 'zaban', label: 'زبان' },
  { key: 'book', label: 'کتاب' },
  { key: 'carman', label: 'کارمن' },
  { key: 'azmoon', label: 'آزمون' },
  { key: 'ghabooli', label: 'قبولی' },
  { key: 'garage', label: 'گاراژ' },
  { key: 'hoz', label: 'حضوری' },
  { key: 'kia', label: 'کره‌ای' },
  { key: 'milyarder', label: 'میلیاردر' },
  { key: 'gds-tuts', label: 'GDS دوره' },
  { key: 'gds', label: 'GDS' },
  { key: 'tpms-tuts', label: 'TPMS' },
  { key: 'zed', label: 'ضد سرقت' },
  { key: 'kmc', label: 'KMC' },
  { key: 'carmap', label: 'کارمپ' },
  { key: 'eps', label: 'EPS' },
]

const PAGE_SIZE = 20

export default function DataTable({ records, columns }) {
  const [search, setSearch] = useState('')
  const [filterSp, setFilterSp] = useState('')
  const [page, setPage] = useState(1)
  const [copiedNumber, setCopiedNumber] = useState(null)
  const [showProductFilter, setShowProductFilter] = useState(false)
  const [productFilters, setProductFilters] = useState({})
  const dropdownRef = useRef(null)

  const experts = [...new Set(records.map(r => r.sp).filter(Boolean))]

  // بستن dropdown با کلیک بیرون
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProductFilter(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // سیکل: undefined → true → false → undefined
  const toggleProduct = (key) => {
    setProductFilters(prev => {
      const current = prev[key]
      if (current === undefined) return { ...prev, [key]: true }
      if (current === true) return { ...prev, [key]: false }
      const next = { ...prev }
      delete next[key]
      return next
    })
    setPage(1)
  }

  const clearProductFilter = () => {
    setProductFilters({})
    setPage(1)
  }

  const activeFilterCount = Object.keys(productFilters).length

  const filtered = records.filter(row => {
    const matchSearch =
      !search ||
      String(row.numberr || '').includes(search) ||
      String(row.name || '').includes(search)

    const matchSp = !filterSp || row.sp === filterSp

    // AND: همه فیلترهای فعال باید صدق کنن
    const matchProduct = Object.entries(productFilters).every(([key, val]) =>
      val
        ? (row[key] != null && row[key] !== '')
        : (row[key] == null || row[key] === '')
    )

    return matchSearch && matchSp && matchProduct
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const visibleCols = columns.filter(c =>
    !['chini','dakheli','zaban','book','carman','azmoon',
      'ghabooli','garage','hoz','kia','milyarder','gds-tuts',
      'gds','tpms-tuts','zed','kmc','carmap','eps','hichi'].includes(c)
  )

  const copyPhone = (number) => {
    navigator.clipboard.writeText('0' + String(number))
    setCopiedNumber(number)
    setTimeout(() => setCopiedNumber(null), 2000)
  }

  const exportToExcel = () => {
    const data = filtered.map(row => {
      const obj = {}
      visibleCols.forEach(col => {
        const label = COLUMN_LABELS[col] || col
        if (col === 'numberr') {
          obj[label] = '0' + String(row.numberr ?? '')
        } else if (col === 'products') {
          obj[label] = row.hichi ? 'بدون محصول' : (row.products ?? '—')
        } else {
          obj[label] = row[col] ?? '—'
        }
      })
      return obj
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'مشتریان')
    XLSX.writeFile(wb, 'customers.xlsx')
  }

  // نمایش آیکون وضعیت هر محصول در dropdown
  const filterStateIcon = (key) => {
    const val = productFilters[key]
    if (val === true) return <span className="text-emerald-500 font-bold text-xs">✓ دارد</span>
    if (val === false) return <span className="text-red-400 font-bold text-xs">✗ ندارد</span>
    return <span className="text-slate-300 text-xs">—</span>
  }

  const renderCell = (col, row) => {
    if (col === 'numberr') {
      return (
        <div className="flex items-center gap-2">
          <span>{row.numberr}</span>
          <button
            onClick={() => copyPhone(row.numberr)}
            className="text-slate-400 hover:text-blue-500 transition-colors"
            title="کپی شماره"
          >
            {copiedNumber === row.numberr
              ? <Check size={14} className="text-green-500" />
              : <Copy size={14} />
            }
          </button>
        </div>
      )
    }
    if (col === 'products') {
      if (row.hichi) {
        return (
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
            بدون محصول
          </span>
        )
      }
      return <span>{row.products ?? '—'}</span>
    }
    return row[col] ?? '—'
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="جستجو نام یا شماره..."
            className="border border-slate-200 rounded-lg pr-9 pl-3 py-2 text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-300 w-56"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filterSp}
          onChange={e => { setFilterSp(e.target.value); setPage(1) }}
        >
          <option value="">همه کارشناسان</option>
          {experts.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {/* فیلتر محصولات — سه‌حالته */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProductFilter(p => !p)}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors
              ${activeFilterCount > 0
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
          >
            <SlidersHorizontal size={15} />
            محصولات
            {activeFilterCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5
                flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {showProductFilter && (
            <div className="absolute top-full mt-1 right-0 z-20 bg-white border border-slate-200
              rounded-xl shadow-lg p-3 w-64 space-y-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-slate-500">
                  کلیک = دارد &nbsp;|&nbsp; دوباره = ندارد &nbsp;|&nbsp; سه‌بار = خنثی
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearProductFilter}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0"
                  >
                    پاک
                  </button>
                )}
              </div>
              {PRODUCT_KEYS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleProduct(key)}
                  className={`w-full flex items-center justify-between rounded px-2 py-1 text-sm
                    transition-colors text-right
                    ${productFilters[key] === true
                      ? 'bg-emerald-50 text-emerald-700'
                      : productFilters[key] === false
                        ? 'bg-red-50 text-red-600'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <span>{label}</span>
                  {filterStateIcon(key)}
                </button>
              ))}
            </div>
          )}
        </div>

        <span className="text-sm text-slate-400 self-center">
          {filtered.length.toLocaleString('fa-IR')} نتیجه
        </span>

        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
            text-white text-sm rounded-lg px-4 py-2 transition-colors mr-auto"
        >
          <Download size={15} />
          خروجی اکسل
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {visibleCols.map(col => (
                <th
                  key={col}
                  className="px-4 py-3 text-right text-slate-600 font-semibold
                    whitespace-nowrap border-b border-slate-200"
                >
                  {COLUMN_LABELS[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                {visibleCols.map(col => (
                  <td
                    key={col}
                    className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-xs truncate"
                    title={col !== 'numberr' ? String(row[col] ?? '') : undefined}
                  >
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            قبلی
          </button>
          <span className="text-sm text-slate-600">
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  )
}
