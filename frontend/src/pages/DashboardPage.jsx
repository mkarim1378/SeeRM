import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Users, Package, AlertTriangle, Download, ArrowRight, CheckCircle } from 'lucide-react'
import axios from 'axios'
import ExpertsPieChart from '../components/Charts/ExpertsPieChart'
import ProductsBarChart from '../components/Charts/ProductsBarChart'
import DataTable from '../components/DataTable'
import AddPurchaseModal from '../components/AddPurchaseModal'

export default function DashboardPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [records, setRecords] = useState([])
  const [columns, setColumns] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [filterHichi, setFilterHichi] = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem(`result_${sessionId}`)
    if (!stored) { navigate('/'); return }
    setData(JSON.parse(stored))

    axios.get(`/api/results/${sessionId}`)
      .then(res => {
        setRecords(res.data.records)
        setColumns(res.data.columns)
      })
      .catch(() => navigate('/'))
  }, [sessionId, navigate])

  const handleAddSuccess = async (record) => {
    const isNew = !records.some(r => String(r.numberr) === String(record.numberr))

    const res = await axios.get(`/api/results/${sessionId}`)
    setRecords(res.data.records)

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
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">داشبورد نتایج</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800
              bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm transition"
          >
            <ArrowRight size={16} />
            فایل جدید
          </button>
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
          <ExpertsPieChart data={data.experts_stats} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-bold text-slate-700 mb-4">محبوب‌ترین محصولات</h2>
          <ProductsBarChart data={data.products_stats} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-bold text-slate-700 mb-4">جدول مشتریان</h2>
        {records.length === 0
          ? <p className="text-center text-slate-400 py-8 text-sm">در حال بارگذاری...</p>
          : <DataTable records={records} columns={columns} onAdd={() => setShowModal(true)} sessionId={sessionId} filterHichi={filterHichi} onClearHichi={() => setFilterHichi(false)} />
        }
      </div>
    </div>
  )
}
