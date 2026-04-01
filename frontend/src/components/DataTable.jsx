import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Copy, Check, Download, SlidersHorizontal, ChevronDown, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import DatePicker from 'react-multi-date-picker'
import persian from 'react-date-object/calendars/persian'
import persian_fa from 'react-date-object/locales/persian_fa'
import { toJalali, gregorianStrToDate, dateObjToGregorianStr } from '../utils/jalali'

const COLUMN_LABELS = {
  numberr: 'شماره', name: 'نام', sp: 'کارشناس',
  province: 'استان',
  registration_date: 'اولین ثبت',
  first_purchase_date: 'اولین خرید',
  last_purchase_date: 'آخرین خرید',
  total_purchases: 'تعداد خرید',
  total_amount: 'مبلغ خرید',
  description: 'توضیحات',
  score: 'امتیاز',
  loyalty_level: 'سطح وفاداری',
  chini: 'چینی', dakheli: 'داخلی', zaban: 'زبان',
  book: 'کتاب', carman: 'کارمن', azmoon: 'آزمون',
  ghabooli: 'قبولی', garage: 'گاراژ', hoz: 'حضوری',
  kia: 'کره‌ای', milyarder: 'میلیاردر', 'gds-tuts': 'GDS دوره',
  gds: 'GDS', 'tpms-tuts': 'TPMS', zed: 'ضد سرقت',
  kmc: 'KMC', carmap: 'کارمپ', eps: 'EPS',
  products: 'محصولات',
}

// Backend-generated labels (must match product_name_map in processor.py)
const PRODUCT_BACKEND_LABELS = {
  chini: 'دوره آنلاین چینی', dakheli: 'دوره آنلاین داخلی', zaban: 'دوره زبان فنی',
  book: 'کتاب زبان فنی', carman: 'دستگاه دیاگ', hoz: 'دوره حضوری',
  kia: 'دوره آنلاین کره‌ای', milyarder: 'دوره تعمیرکار میلیاردر',
  'gds-tuts': 'دوره GDS', gds: 'نرم افزار GDS', 'tpms-tuts': 'دوره TPMS',
  zed: 'دوره ضد سرقت', kmc: 'وبینار KMC', carmap: 'کارمپ', eps: 'فرمان برقی حضوری',
}
export const BACKEND_LABEL_TO_KEY = Object.fromEntries(
  Object.entries(PRODUCT_BACKEND_LABELS).map(([k, v]) => [v, k])
)

export const PRODUCT_KEYS = [
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

// Loyalty levels must match calculate_loyalty_level() in processor.py
const LOYALTY_LEVELS = [
  { key: 'Bronze',   label: 'برنزی',   bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-400' },
  { key: 'Silver',   label: 'نقره‌ای',  bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-400' },
  { key: 'Gold',     label: 'طلایی',   bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400' },
  { key: 'Platinum', label: 'پلاتینیوم', bg: 'bg-cyan-100',  text: 'text-cyan-700',   border: 'border-cyan-400' },
  { key: 'Diamond',  label: 'الماسی',  bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-400' },
]

const LOYALTY_MAP = Object.fromEntries(LOYALTY_LEVELS.map(l => [l.key, l]))

const PAGE_SIZE = 20

const inDateRange = (val, from, to) => {
  if (!from && !to) return true
  if (!val) return false
  if (from && val < from) return false
  if (to && val > to) return false
  return true
}

const inNumRange = (val, min, max) => {
  if (min === '' && max === '') return true
  if (val === null || val === undefined) return false
  const n = Number(val)
  if (isNaN(n)) return false
  if (min !== '' && n < Number(min)) return false
  if (max !== '' && n > Number(max)) return false
  return true
}

export default function DataTable({ records, columns, onAdd, sessionId, filterHichi, onClearHichi, onSetHichi, expertNames = {}, productNames = {} }) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterSp, setFilterSp] = useState('')
  const [page, setPage] = useState(1)
  const [copiedNumber, setCopiedNumber] = useState(null)
  const [showProductFilter, setShowProductFilter] = useState(false)
  const [productFilters, setProductFilters] = useState({})

  // Advanced filters
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showProvinceFilter, setShowProvinceFilter] = useState(false)
  const [provinceSearch, setProvinceSearch] = useState('')
  const [filterProvince, setFilterProvince] = useState(new Set())
  const [filterRegFrom, setFilterRegFrom] = useState('')
  const [filterRegTo, setFilterRegTo] = useState('')
  const [filterFirstPurchFrom, setFilterFirstPurchFrom] = useState('')
  const [filterFirstPurchTo, setFilterFirstPurchTo] = useState('')
  const [filterLastPurchFrom, setFilterLastPurchFrom] = useState('')
  const [filterLastPurchTo, setFilterLastPurchTo] = useState('')
  const [filterTotalPurchMin, setFilterTotalPurchMin] = useState('')
  const [filterTotalPurchMax, setFilterTotalPurchMax] = useState('')
  const [filterAmountMin, setFilterAmountMin] = useState('')
  const [filterAmountMax, setFilterAmountMax] = useState('')
  const [filterScoreMin, setFilterScoreMin] = useState('')
  const [filterScoreMax, setFilterScoreMax] = useState('')
  const [filterLoyalty, setFilterLoyalty] = useState(new Set())

  const productDropRef = useRef(null)
  const provinceDropRef = useRef(null)

  const experts = [...new Set(records.map(r => r.sp).filter(Boolean))]
  const provinceOptions = [...new Set(records.map(r => r.province).filter(Boolean))].sort()

  useEffect(() => {
    const handler = (e) => {
      if (productDropRef.current && !productDropRef.current.contains(e.target))
        setShowProductFilter(false)
      if (provinceDropRef.current && !provinceDropRef.current.contains(e.target))
        setShowProvinceFilter(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleProduct = (key) => {
    if (filterHichi) onClearHichi()
    setProductFilters(prev => {
      const cur = prev[key]
      if (cur === undefined) return { ...prev, [key]: true }
      if (cur === true) return { ...prev, [key]: false }
      const next = { ...prev }
      delete next[key]
      return next
    })
    setPage(1)
  }

  const toggleProvince = (val) => {
    setFilterProvince(prev => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
    setPage(1)
  }

  const toggleLoyalty = (key) => {
    setFilterLoyalty(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setPage(1)
  }

  const clearProductFilters = () => { setProductFilters({}); setPage(1) }

  const clearAdvanced = () => {
    setFilterProvince(new Set())
    setProvinceSearch('')
    setFilterRegFrom(''); setFilterRegTo('')
    setFilterFirstPurchFrom(''); setFilterFirstPurchTo('')
    setFilterLastPurchFrom(''); setFilterLastPurchTo('')
    setFilterTotalPurchMin(''); setFilterTotalPurchMax('')
    setFilterAmountMin(''); setFilterAmountMax('')
    setFilterScoreMin(''); setFilterScoreMax('')
    setFilterLoyalty(new Set())
    setPage(1)
  }

  const activeProductCount = Object.keys(productFilters).length
  const advancedCount =
    filterProvince.size +
    (filterRegFrom || filterRegTo ? 1 : 0) +
    (filterFirstPurchFrom || filterFirstPurchTo ? 1 : 0) +
    (filterLastPurchFrom || filterLastPurchTo ? 1 : 0) +
    (filterTotalPurchMin !== '' || filterTotalPurchMax !== '' ? 1 : 0) +
    (filterAmountMin !== '' || filterAmountMax !== '' ? 1 : 0) +
    (filterScoreMin !== '' || filterScoreMax !== '' ? 1 : 0) +
    filterLoyalty.size

  const filtered = records.filter(row => {
    const matchSearch =
      !search ||
      String(row.numberr || '').includes(search) ||
      String(row.name || '').includes(search)

    const matchSp = !filterSp || row.sp === filterSp

    const matchProduct = Object.entries(productFilters).every(([key, val]) =>
      val
        ? (row[key] != null && row[key] !== '')
        : (row[key] == null || row[key] === '')
    )

    const matchProvince = filterProvince.size === 0 || filterProvince.has(row.province)
    const matchReg      = inDateRange(row.registration_date, filterRegFrom, filterRegTo)
    const matchFirstP   = inDateRange(row.first_purchase_date, filterFirstPurchFrom, filterFirstPurchTo)
    const matchLastP    = inDateRange(row.last_purchase_date, filterLastPurchFrom, filterLastPurchTo)
    const matchPurchCnt = inNumRange(row.total_purchases, filterTotalPurchMin, filterTotalPurchMax)
    const matchAmount   = inNumRange(row.total_amount, filterAmountMin, filterAmountMax)
    const matchScore    = inNumRange(row.score, filterScoreMin, filterScoreMax)
    const matchLoyalty  = filterLoyalty.size === 0 || filterLoyalty.has(row.loyalty_level)

    const matchHichi = !filterHichi || row.hichi

    return matchSearch && matchSp && matchProduct && matchHichi &&
           matchProvince && matchReg && matchFirstP && matchLastP &&
           matchPurchCnt && matchAmount && matchScore && matchLoyalty
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
        } else if (col === 'loyalty_level' && row.loyalty_level) {
          obj[label] = LOYALTY_MAP[row.loyalty_level]?.label ?? row.loyalty_level
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

  const filterStateIcon = (key) => {
    const val = productFilters[key]
    if (val === true)  return <span className="text-emerald-500 font-bold text-xs">✓ دارد</span>
    if (val === false) return <span className="text-red-400 font-bold text-xs">✗ ندارد</span>
    return <span className="text-slate-300 text-xs">—</span>
  }

  const DATE_COLS = new Set(['registration_date', 'first_purchase_date', 'last_purchase_date'])

  const renderCell = (col, row) => {
    if (DATE_COLS.has(col)) return toJalali(row[col])
    if (col === 'numberr') {
      return (
        <div className="flex items-center gap-2">
          <span>{row.numberr}</span>
          <button
            onClick={e => { e.stopPropagation(); copyPhone(row.numberr) }}
            className="text-slate-400 hover:text-blue-500 transition-colors"
            title="کپی شماره"
          >
            {copiedNumber === row.numberr
              ? <Check size={14} className="text-green-500" />
              : <Copy size={14} />}
          </button>
        </div>
      )
    }
    if (col === 'sp') return expertNames[row.sp] || row.sp || '—'
    if (col === 'products') {
      if (row.hichi) {
        return (
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs">
            بدون محصول
          </span>
        )
      }
      if (!row.products) return <span>—</span>
      const remapped = row.products.split(' | ').map(segment => {
        const key = BACKEND_LABEL_TO_KEY[segment.trim()]
        return key ? (productNames[key] || segment) : segment
      }).join(' | ')
      return <span>{remapped}</span>
    }
    if (col === 'loyalty_level') {
      if (!row.loyalty_level) return <span className="text-slate-300">—</span>
      const lvl = LOYALTY_MAP[row.loyalty_level]
      if (!lvl) return <span>{row.loyalty_level}</span>
      return (
        <span className={`${lvl.bg} ${lvl.text} px-2 py-0.5 rounded-full text-xs font-semibold`}>
          {lvl.label}
        </span>
      )
    }
    return row[col] ?? '—'
  }

  const filteredProvinces = provinceOptions.filter(p =>
    p.toLowerCase().includes(provinceSearch.toLowerCase())
  )

  return (
    <div className="space-y-3">
      {/* ─── Row 1: main filters ─── */}
      <div className="flex flex-wrap gap-3 items-center">

        {/* search */}
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

        {/* expert */}
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-blue-300"
          value={filterSp}
          onChange={e => { setFilterSp(e.target.value); setPage(1) }}
        >
          <option value="">همه کارشناسان</option>
          {experts.map(e => <option key={e} value={e}>{expertNames[e] || e}</option>)}
        </select>

        {/* products 3-state */}
        <div className="relative" ref={productDropRef}>
          <button
            onClick={() => setShowProductFilter(p => !p)}
            className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors
              ${activeProductCount > 0
                ? 'border-blue-400 bg-blue-50 text-blue-700'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <SlidersHorizontal size={15} />
            محصولات
            {activeProductCount > 0 && (
              <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5
                flex items-center justify-center">
                {activeProductCount}
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
                {activeProductCount > 0 && (
                  <button onClick={clearProductFilters}
                    className="text-xs text-red-400 hover:text-red-600 shrink-0">
                    پاک
                  </button>
                )}
              </div>
              {PRODUCT_KEYS.map(({ key, label }) => (
                <button key={key} onClick={() => toggleProduct(key)}
                  className={`w-full flex items-center justify-between rounded px-2 py-1 text-sm
                    transition-colors text-right
                    ${productFilters[key] === true  ? 'bg-emerald-50 text-emerald-700'
                    : productFilters[key] === false ? 'bg-red-50 text-red-600'
                    : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  <span>{productNames[key] || label}</span>
                  {filterStateIcon(key)}
                </button>
              ))}
              <div className="border-t border-slate-200 mt-1 pt-1">
                <button
                  onClick={() => {
                    if (filterHichi) { onClearHichi(); return }
                    setProductFilters({})
                    onSetHichi()
                    setPage(1)
                  }}
                  className={`w-full flex items-center justify-between rounded px-2 py-1 text-sm
                    transition-colors text-right
                    ${filterHichi
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-slate-500 hover:bg-amber-50 hover:text-amber-700'}`}
                >
                  <span>بدون محصول</span>
                  {filterHichi
                    ? <span className="text-amber-500 font-bold text-xs">✓ فعال</span>
                    : <span className="text-slate-300 text-xs">—</span>}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* advanced toggle */}
        <button
          onClick={() => setShowAdvanced(p => !p)}
          className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm transition-colors
            ${advancedCount > 0
              ? 'border-purple-400 bg-purple-50 text-purple-700'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
          فیلترهای بیشتر
          {advancedCount > 0 && (
            <span className="bg-purple-500 text-white text-xs rounded-full w-5 h-5
              flex items-center justify-center">
              {advancedCount}
            </span>
          )}
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>

        <span className="text-sm text-slate-400 self-center">
          {filtered.length.toLocaleString('fa-IR')} نتیجه
        </span>

        {filterHichi && (
          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-3 py-1.5 rounded-full border border-amber-300">
            بدون محصول
            <button onClick={onClearHichi} className="hover:text-amber-900 font-bold mr-1">×</button>
          </span>
        )}

        <div className="flex gap-2 mr-auto">
          <button onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600
              text-white text-sm rounded-lg px-4 py-2 transition-colors">
            <Download size={15} />
            خروجی اکسل
          </button>
          {onAdd && (
            <button onClick={onAdd}
              className="flex items-center bg-blue-600 hover:bg-blue-700
                text-white text-sm rounded-lg px-3 py-2 transition-colors">
              <Plus size={15} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Row 2: advanced filters panel ─── */}
      {showAdvanced && (
        <div className="border border-slate-200 rounded-xl bg-slate-50 p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-600">فیلترهای پیشرفته</span>
            {advancedCount > 0 && (
              <button onClick={clearAdvanced}
                className="text-xs text-red-400 hover:text-red-600">
                پاک کردن همه
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* province — searchable checkbox */}
            <div className="space-y-1" ref={provinceDropRef}>
              <label className="text-xs font-medium text-slate-500">استان</label>
              <div className="relative">
                <button
                  onClick={() => setShowProvinceFilter(p => !p)}
                  className={`w-full flex items-center justify-between border rounded-lg px-3 py-2 text-sm bg-white
                    ${filterProvince.size > 0
                      ? 'border-purple-400 text-purple-700'
                      : 'border-slate-200 text-slate-600'}`}
                >
                  <span>
                    {filterProvince.size > 0
                      ? `${filterProvince.size} استان انتخاب شده`
                      : 'همه استان‌ها'}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showProvinceFilter && (
                  <div className="absolute top-full mt-1 right-0 z-30 bg-white border border-slate-200
                    rounded-xl shadow-lg p-2 w-full min-w-[200px] max-h-52 flex flex-col">
                    <input
                      type="text"
                      placeholder="جستجو..."
                      className="border border-slate-200 rounded px-2 py-1 text-sm mb-2
                        focus:outline-none focus:ring-1 focus:ring-blue-300"
                      value={provinceSearch}
                      onChange={e => setProvinceSearch(e.target.value)}
                    />
                    <div className="overflow-y-auto flex-1 space-y-0.5">
                      {provinceOptions.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">داده‌ای موجود نیست</p>
                      ) : filteredProvinces.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-2">نتیجه‌ای یافت نشد</p>
                      ) : filteredProvinces.map(p => (
                        <label key={p}
                          className="flex items-center gap-2 px-2 py-1 rounded
                            hover:bg-slate-50 cursor-pointer text-sm">
                          <input type="checkbox" checked={filterProvince.has(p)}
                            onChange={() => toggleProvince(p)}
                            className="accent-purple-500" />
                          {p}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* registration date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">تاریخ اولین ثبت</label>
              <div className="flex gap-2">
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterRegFrom)}
                  onChange={d => { setFilterRegFrom(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="از" />
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterRegTo)}
                  onChange={d => { setFilterRegTo(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="تا" />
              </div>
            </div>

            {/* first purchase date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">تاریخ اولین خرید</label>
              <div className="flex gap-2">
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterFirstPurchFrom)}
                  onChange={d => { setFilterFirstPurchFrom(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="از" />
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterFirstPurchTo)}
                  onChange={d => { setFilterFirstPurchTo(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="تا" />
              </div>
            </div>

            {/* last purchase date range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">تاریخ آخرین خرید</label>
              <div className="flex gap-2">
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterLastPurchFrom)}
                  onChange={d => { setFilterLastPurchFrom(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="از" />
                <DatePicker calendar={persian} locale={persian_fa} portal
                  value={gregorianStrToDate(filterLastPurchTo)}
                  onChange={d => { setFilterLastPurchTo(dateObjToGregorianStr(d)); setPage(1) }}
                  inputClass="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full focus:outline-none focus:ring-1 focus:ring-blue-300 cursor-pointer"
                  containerClassName="w-full" placeholder="تا" />
              </div>
            </div>

            {/* total purchases range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">تعداد خرید (از — تا)</label>
              <div className="flex gap-2 items-center">
                <input type="number" min="0" placeholder="از"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterTotalPurchMin}
                  onChange={e => { setFilterTotalPurchMin(e.target.value); setPage(1) }} />
                <span className="text-slate-300 shrink-0">—</span>
                <input type="number" min="0" placeholder="تا"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterTotalPurchMax}
                  onChange={e => { setFilterTotalPurchMax(e.target.value); setPage(1) }} />
              </div>
            </div>

            {/* total amount range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">مبلغ خرید (از — تا)</label>
              <div className="flex gap-2 items-center">
                <input type="number" min="0" placeholder="از"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterAmountMin}
                  onChange={e => { setFilterAmountMin(e.target.value); setPage(1) }} />
                <span className="text-slate-300 shrink-0">—</span>
                <input type="number" min="0" placeholder="تا"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterAmountMax}
                  onChange={e => { setFilterAmountMax(e.target.value); setPage(1) }} />
              </div>
            </div>

            {/* score range */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">امتیاز مشتری (از — تا)</label>
              <div className="flex gap-2 items-center">
                <input type="number" min="0" placeholder="از"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterScoreMin}
                  onChange={e => { setFilterScoreMin(e.target.value); setPage(1) }} />
                <span className="text-slate-300 shrink-0">—</span>
                <input type="number" min="0" placeholder="تا"
                  className="border border-slate-200 rounded-lg px-2 py-2 text-sm bg-white w-full
                    focus:outline-none focus:ring-1 focus:ring-blue-300"
                  value={filterScoreMax}
                  onChange={e => { setFilterScoreMax(e.target.value); setPage(1) }} />
              </div>
            </div>

            {/* loyalty level multi-select badges */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">سطح وفاداری</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {LOYALTY_LEVELS.map(({ key, label, bg, text, border }) => (
                  <button key={key} onClick={() => toggleLoyalty(key)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors
                      ${filterLoyalty.has(key)
                        ? `${bg} ${text} ${border}`
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── Table ─── */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {visibleCols.map(col => (
                <th key={col}
                  className="px-4 py-3 text-right text-slate-600 font-semibold
                    whitespace-nowrap border-b border-slate-200">
                  {COLUMN_LABELS[col] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((row, i) => (
              <tr
                key={i}
                className="hover:bg-blue-50 transition-colors cursor-pointer"
                onClick={() => sessionId && navigate(`/profile/${sessionId}/${row.numberr}`)}
              >
                {visibleCols.map(col => (
                  <td key={col}
                    className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-xs truncate"
                    title={col !== 'numberr' ? String(row[col] ?? '') : undefined}>
                    {renderCell(col, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">
            قبلی
          </button>
          <span className="text-sm text-slate-600">
            صفحه {page.toLocaleString('fa-IR')} از {totalPages.toLocaleString('fa-IR')}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40">
            بعدی
          </button>
        </div>
      )}
    </div>
  )
}
