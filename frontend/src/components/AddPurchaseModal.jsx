import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { X, ChevronDown } from 'lucide-react'

const PRODUCTS = [
  { col: 'chini', label: 'دوره آنلاین چینی' },
  { col: 'dakheli', label: 'دوره آنلاین داخلی' },
  { col: 'zaban', label: 'دوره زبان فنی' },
  { col: 'book', label: 'کتاب زبان فنی' },
  { col: 'carman', label: 'دستگاه دیاگ' },
  { col: 'azmoon', label: 'آزمون' },
  { col: 'ghabooli', label: 'قبولی' },
  { col: 'garage', label: 'گاراژ' },
  { col: 'hoz', label: 'دوره حضوری' },
  { col: 'kia', label: 'دوره آنلاین کره‌ای' },
  { col: 'milyarder', label: 'دوره تعمیرکار میلیاردر' },
  { col: 'gds-tuts', label: 'دوره GDS' },
  { col: 'gds', label: 'نرم افزار GDS' },
  { col: 'tpms-tuts', label: 'دوره TPMS' },
  { col: 'zed', label: 'دوره ضد سرقت' },
  { col: 'kmc', label: 'وبینار KMC' },
  { col: 'carmap', label: 'کارمپ' },
  { col: 'eps', label: 'فرمان برقی حضوری' },
]

// Normalize phone: strip leading 0 → 10-digit format stored in DB
function normalizePhone(p) {
  const d = p.replace(/\D/g, '')
  return d.startsWith('0') ? d.slice(1) : d
}

function validatePhone(p) {
  const d = p.replace(/\D/g, '')
  return (d.length === 10 && d.startsWith('9')) || (d.length === 11 && d.startsWith('09'))
}

function PhoneSearch({ value, onChange, onSelect, records }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const query = value.replace(/\D/g, '')
  const normalizedQuery = query.startsWith('0') ? query.slice(1) : query
  const filtered = query.length >= 3
    ? records.filter(r =>
        String(r.numberr || '').includes(normalizedQuery) ||
        String(r.name || '').toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : []

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
        placeholder="09xxxxxxxxx"
        dir="ltr"
        maxLength={11}
        inputMode="numeric"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(r => (
            <div
              key={r.numberr}
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(r); setOpen(false) }}
              className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer flex justify-between items-center"
            >
              <span className="text-slate-700">{r.name || '—'}</span>
              <span className="text-slate-400 text-xs" dir="ltr">0{r.numberr}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SearchableSelect({ value, onChange, disabledCols, placeholder }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = PRODUCTS.filter(p => p.label.includes(search) || p.col.includes(search))
  const selected = PRODUCTS.find(p => p.col === value)

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between border rounded-lg px-3 py-2 cursor-pointer text-sm bg-white hover:border-blue-400 select-none"
      >
        <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={14} className="text-slate-400 flex-shrink-0 mr-2" />
      </div>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="w-full px-3 py-2 text-sm border-b outline-none"
            onClick={e => e.stopPropagation()}
          />
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(p => {
              const isDisabled = disabledCols.includes(p.col) && p.col !== value
              return (
                <div
                  key={p.col}
                  onClick={() => { if (!isDisabled) { onChange(p.col); setOpen(false); setSearch('') } }}
                  className={`px-3 py-2 text-sm ${isDisabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-blue-50 text-slate-700 cursor-pointer'}`}
                >
                  {p.label}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AddPurchaseModal({ sessionId, records, onClose, onSuccess }) {
  const [page, setPage] = useState(1)
  const [phone, setPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [province, setProvince] = useState('')
  const [rows, setRows] = useState([{ col: '', amount: '' }])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedCols = rows.filter(r => r.col).map(r => r.col)

  const handleSelectExisting = (r) => {
    setPhone('0' + String(r.numberr))
    setCustomerName(r.name || '')
    setProvince(r.province || '')
  }

  const handleProductChange = (index, col) => {
    const updated = [...rows]
    updated[index] = { col, amount: '' }
    if (index === rows.length - 1 && selectedCols.length < PRODUCTS.length) {
      updated.push({ col: '', amount: '' })
    }
    setRows(updated)
  }

  const handleAmountChange = (index, amount) => {
    const updated = [...rows]
    updated[index] = { ...updated[index], amount }
    setRows(updated)
  }

  const totalAmount = rows
    .filter(r => r.col && r.amount)
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0)

  const buildProducts = () => {
    const result = {}
    rows.filter(r => r.col && r.amount).forEach(r => { result[r.col] = parseFloat(r.amount) || 0 })
    return result
  }

  const validate1 = () => {
    if (!phone.trim() || !customerName.trim() || !province.trim()) {
      setError('لطفاً تمام فیلدها را پر کنید')
      return false
    }
    if (!validatePhone(phone)) {
      setError('شماره موبایل را درست وارد کنید')
      return false
    }
    return true
  }

  const goToPage2 = () => {
    if (!validate1()) return
    setError('')
    setPage(2)
  }

  const normalizedPhone = normalizePhone(phone)

  const handleSave = async () => {
    if (!validate1()) return
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`/api/add_purchase/${sessionId}`, {
        phone: normalizedPhone, customer_name: customerName.trim(),
        province: province.trim(), products: {}, save_only: true
      })
      onSuccess(res.data.record)
      onClose()
    } catch {
      setError('خطا در ثبت مشتری')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitPurchase = async () => {
    const products = buildProducts()
    if (Object.keys(products).length === 0) { setError('حداقل یک محصول با مبلغ انتخاب کنید'); return }
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`/api/add_purchase/${sessionId}`, {
        phone: normalizedPhone, customer_name: customerName.trim(),
        province: province.trim(), products, save_only: false
      })
      onSuccess(res.data.record)
      onClose()
    } catch {
      setError('خطا در ثبت خرید')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-bold text-slate-800">
            {page === 1 ? 'افزودن مشتری' : 'ثبت خرید'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4 min-h-[280px]">
          {page === 1 && (
            <>
              <div>
                <label className="block text-sm text-slate-600 mb-1">شماره موبایل</label>
                <PhoneSearch
                  value={phone}
                  onChange={setPhone}
                  onSelect={handleSelectExisting}
                  records={records}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">نام مشتری</label>
                <input
                  value={customerName} onChange={e => setCustomerName(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="نام و نام خانوادگی"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">استان</label>
                <input
                  value={province} onChange={e => setProvince(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                  placeholder="نام استان"
                />
              </div>
            </>
          )}

          {page === 2 && (
            <>
              <div className="space-y-3">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className="flex-1">
                      <SearchableSelect
                        value={row.col}
                        onChange={(col) => handleProductChange(i, col)}
                        disabledCols={selectedCols}
                        placeholder="انتخاب محصول"
                      />
                    </div>
                    {row.col && (
                      <input
                        value={row.amount}
                        onChange={e => handleAmountChange(i, e.target.value)}
                        className="w-28 border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
                        placeholder="مبلغ"
                        type="number"
                        min="0"
                        dir="ltr"
                      />
                    )}
                  </div>
                ))}
              </div>
              {totalAmount > 0 && (
                <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  مجموع: <span className="font-bold text-slate-800">{totalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              )}
            </>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        <div className="flex gap-2 p-5 border-t">
          {page === 1 && (
            <>
              <button
                onClick={handleSave}
                disabled={loading}
                className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50"
              >
                ذخیره
              </button>
              <button
                onClick={goToPage2}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition"
              >
                صفحه بعد
              </button>
            </>
          )}
          {page === 2 && (
            <>
              <button
                onClick={() => { setPage(1); setError('') }}
                className="flex-1 border border-slate-300 text-slate-700 rounded-lg py-2 text-sm font-medium hover:bg-slate-50 transition"
              >
                صفحه قبل
              </button>
              <button
                onClick={handleSubmitPurchase}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? 'در حال ثبت...' : 'ثبت خرید'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
