import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Package, AlertTriangle, Download, CheckCircle, Settings, Plus, ChevronDown } from 'lucide-react'
import axios from 'axios'
import ExpertsPieChart from '../components/Charts/ExpertsPieChart'
import ProductsBarChart from '../components/Charts/ProductsBarChart'
import DataTable from '../components/DataTable'
import { PRODUCTS, BACKEND_LABEL_TO_KEY, PRODUCT_LABEL_MAP } from '../utils/products'
import AddPurchaseModal from '../components/AddPurchaseModal'
import { getSettings } from '../utils/settings'

// Keys that appear in processor.py's product_name_map (used to rebuild row.products string)
const BACKEND_PRODUCT_KEYS = Object.values(BACKEND_LABEL_TO_KEY)

// Merge two records for the same customer:
// - sp (expert): keep from old
// - products: union of both (1 wins over null)
// - numeric stats: sum
// - dates: earliest first, latest last
function mergeCustomerRecords(oldRec, newRec) {
  const mergedProducts = {}
  for (const { key } of PRODUCTS) {
    mergedProducts[key] = (oldRec[key] === 1 || newRec[key] === 1) ? 1 : null
  }

  const productStr = BACKEND_PRODUCT_KEYS
    .filter(k => mergedProducts[k] === 1)
    .map(k => PRODUCT_LABEL_MAP[k])
    .filter(Boolean)
    .join(' | ') || null

  const hasAnyProduct = PRODUCTS.some(({ key }) => mergedProducts[key] === 1)

  const minDate = (a, b) => !a ? b : !b ? a : a < b ? a : b
  const maxDate = (a, b) => !a ? b : !b ? a : a > b ? a : b

  return {
    ...oldRec,
    ...mergedProducts,
    products: productStr,
    hichi: hasAnyProduct ? null : 1,
    total_purchases: (oldRec.total_purchases || 0) + (newRec.total_purchases || 0),
    total_amount: (oldRec.total_amount || 0) + (newRec.total_amount || 0),
    score: (oldRec.score || 0) + (newRec.score || 0),
    registration_date: minDate(oldRec.registration_date, newRec.registration_date),
    first_purchase_date: minDate(oldRec.first_purchase_date, newRec.first_purchase_date),
    last_purchase_date: maxDate(oldRec.last_purchase_date, newRec.last_purchase_date),
  }
}

// Merge old and new record arrays:
// - duplicates (same phone): merged with mergeCustomerRecords (old takes priority for sp)
// - unique to old: kept as-is
// - unique to new: appended
function mergeRecordArrays(oldRecords, newRecords) {
  const oldMap = new Map(oldRecords.map(r => [String(r.numberr), r]))
  const result = []

  for (const [phone, oldRec] of oldMap) {
    const newRec = newRecords.find(r => String(r.numberr) === phone)
    result.push(newRec ? mergeCustomerRecords(oldRec, newRec) : oldRec)
  }
  for (const newRec of newRecords) {
    if (!oldMap.has(String(newRec.numberr))) result.push(newRec)
  }
  return result
}

async function fetchAndMerge(sessionId, appendFrom) {
  const sessions = appendFrom ? [sessionId, appendFrom] : [sessionId]
  const results = await Promise.allSettled(sessions.map(id => axios.get(`/api/results/${id}`)))

  const fetched = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value.data)

  if (!fetched.length) throw new Error('no results')

  const columns = fetched[0].columns
  if (fetched.length === 2) {
    // fetched[0] = new session, fetched[1] = old session → old takes priority for sp
    return { records: mergeRecordArrays(fetched[1].records, fetched[0].records), columns }
  }
  return { records: fetched[0].records, columns }
}

export default function DashboardPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [records, setRecords] = useState([])
  const [columns, setColumns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [filterHichi, setFilterHichi] = useState(false)
  const [settings] = useState(() => getSettings())
  const [showFileMenu, setShowFileMenu] = useState(false)
  const [showRestartModal, setShowRestartModal] = useState(false)
  const fileMenuRef = useRef()

  useEffect(() => {
    const handler = (e) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target))
        setShowFileMenu(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem(`result_${sessionId}`)
    if (!stored) { navigate('/'); return }
    const parsed = JSON.parse(stored)
    setData(parsed)

    fetchAndMerge(sessionId, parsed.appendFrom)
      .then(({ records, columns }) => {
        setRecords(records)
        setColumns(columns)
      })
      .catch(() => navigate('/'))
  }, [sessionId, navigate])

  const handleAddSuccess = async (record) => {
    const isNew = !records.some(r => String(r.numberr) === String(record.numberr))

    fetchAndMerge(sessionId, data?.appendFrom)
      .then(({ records }) => setRecords(records))

    if (isNew) {
      setData(prev => {
        const updated = { ...prev, total: prev.total + 1 }
        sessionStorage.setItem(`result_${sessionId}`, JSON.stringify(updated))
        return updated
      })
    }

    setToast(isNew ? 'مشتری با موفقیت ثبت شد' : 'اطلاعات مشتری ویرایش شد')
    setTimeout(() => setToast(''), 3000)
  }

  if (!data) return null

  const statCards = [
    {
      label: 'کل مشتریان',
      value: data.total.toLocaleString('fa-IR'),
      icon: <Users size={28} className="text-blue-500" />,
      bg: 'bg-blue-50'
    },
    {
      label: 'بدون محصول',
      value: data.hichi_count.toLocaleString('fa-IR'),
      icon: <AlertTriangle size={28} className="text-amber-500" />,
      bg: 'bg-amber-50'
    },
    {
      label: 'انواع محصولات',
      value: data.products_stats.filter(p => p.count > 0).length,
      icon: <Package size={28} className="text-green-500" />,
      bg: 'bg-green-50'
    },
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm">
          <CheckCircle size={16} />
          {toast}
        </div>
      )}

      {showModal && (
        <AddPurchaseModal
          sessionId={sessionId}
          records={records}
          onClose={() => setShowModal(false)}
          onSuccess={handleAddSuccess}
          productNames={settings.productNames || {}}
        />
      )}

      {/* Restart Confirmation Modal */}
      {showRestartModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4" dir="rtl">
            <h3 className="text-lg font-bold text-slate-800">شروع مجدد</h3>
            <p className="text-sm text-slate-600">
              آیا مطمئن هستید؟ جدول فعلی با{' '}
              <span className="font-bold text-slate-800">
                {data.total.toLocaleString('fa-IR')} مشتری
              </span>{' '}
              پاک خواهد شد.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRestartModal(false)}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                انصراف
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
              >
                بله، شروع مجدد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">داشبورد نتایج</h1>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => navigate('/settings', { state: { sessionId } })}
            className="text-slate-500 hover:text-slate-700 transition"
            title="تنظیمات"
          >
            <Settings size={20} />
          </button>

          {/* Split Button */}
          <div className="relative flex" ref={fileMenuRef}>
            <button
              onClick={() => navigate(`/upload?mode=append&from=${sessionId}`)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800
                bg-white border border-slate-200 border-l-0 px-4 py-2 rounded-r-lg text-sm transition"
            >
              <Plus size={15} />
              افزودن داده
            </button>
            <button
              onClick={() => setShowFileMenu(p => !p)}
              className="flex items-center bg-white border border-slate-200 px-2 py-2 rounded-l-lg text-sm
                text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition"
            >
              <ChevronDown size={14} />
            </button>
            {showFileMenu && (
              <div className="absolute top-full mt-1 right-0 z-20 bg-white border border-slate-200
                rounded-xl shadow-lg py-1 w-52">
                <button
                  onClick={() => { setShowFileMenu(false); navigate(`/upload?mode=append&from=${sessionId}`) }}
                  className="w-full text-right px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  افزودن به جدول فعلی
                </button>
                <button
                  onClick={() => { setShowFileMenu(false); setShowRestartModal(true) }}
                  className="w-full text-right px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  شروع مجدد (پاک کردن جدول)
                </button>
              </div>
            )}
          </div>

          <a
            href={`/api/download/${sessionId}`}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700
              text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Download size={16} />
            دانلود Excel
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => {
          const isHichi = card.label === 'بدون محصول'
          return (
            <div
              key={i}
              onClick={isHichi ? () => setFilterHichi(p => !p) : undefined}
              className={`${card.bg} rounded-xl p-5 flex items-center gap-4
                ${isHichi ? 'cursor-pointer hover:brightness-95 transition-all' : ''}
                ${isHichi && filterHichi ? 'ring-2 ring-amber-400' : ''}`}
            >
              {card.icon}
              <div>
                <p className="text-2xl font-bold text-slate-800">{card.value}</p>
                <p className="text-sm text-slate-500">
                  {card.label}
                  {isHichi && filterHichi && <span className="mr-2 text-amber-600 text-xs font-semibold">● فیلتر فعال</span>}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-4">
            توزیع مشتریان بین کارشناسان
          </h2>
          <ExpertsPieChart data={data.experts_stats.map(e => ({
            ...e,
            name: settings.expertNames?.[e.name] || e.name
          }))} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-4">محبوب‌ترین محصولات</h2>
          <ProductsBarChart data={data.products_stats.map(p => {
            const key = BACKEND_LABEL_TO_KEY[p.product]
            return { ...p, product: (key && settings.productNames?.[key]) || p.product }
          })} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-slate-700 mb-4">جدول مشتریان</h2>
        {records.length === 0
          ? <p className="text-center text-slate-400 py-8 text-sm">در حال بارگذاری...</p>
          : <DataTable
              records={records}
              columns={columns}
              onAdd={() => setShowModal(true)}
              sessionId={sessionId}
              filterHichi={filterHichi}
              onClearHichi={() => setFilterHichi(false)}
              onSetHichi={() => setFilterHichi(true)}
              expertNames={settings.expertNames || {}}
              productNames={settings.productNames || {}}
            />
        }
      </div>
    </div>
  )
}
