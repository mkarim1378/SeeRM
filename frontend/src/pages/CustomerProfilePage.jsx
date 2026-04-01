import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowRight, Star } from 'lucide-react'
import axios from 'axios'
import PurchaseHistoryChart from '../components/Charts/PurchaseHistoryChart'
import SatisfactionGauge from '../components/Charts/SatisfactionGauge'
import { toJalali } from '../utils/jalali'

import { PRODUCT_LABEL_MAP } from '../utils/products'

const LOYALTY_CONFIG = {
  Bronze:   { label: 'برنزی',    bg: 'bg-amber-100',  text: 'text-amber-700'  },
  Silver:   { label: 'نقره‌ای',  bg: 'bg-slate-100',  text: 'text-slate-600'  },
  Gold:     { label: 'طلایی',   bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Platinum: { label: 'پلاتینیوم', bg: 'bg-cyan-100',  text: 'text-cyan-700'   },
  Diamond:  { label: 'الماسی',  bg: 'bg-blue-100',   text: 'text-blue-700'   },
}

function InfoCard({ label, value, ltr }) {
  return (
    <div className="bg-white rounded-xl px-4 py-3 shadow-sm">
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-slate-800 ${ltr ? 'text-left' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value || '—'}
      </p>
    </div>
  )
}

function StatCard({ label, value, highlight }) {
  return (
    <div className="bg-white rounded-xl px-3 py-4 shadow-sm text-center">
      <p className={`text-lg font-bold ${highlight ? 'text-blue-600' : 'text-slate-800'}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-1">{label}</p>
    </div>
  )
}

export default function CustomerProfilePage() {
  const { sessionId, phone } = useParams()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState(null)
  const [purchasedProducts, setPurchasedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    axios.get(`/api/customer/${sessionId}/${phone}`)
      .then(res => {
        setCustomer(res.data.customer)
        setPurchasedProducts(res.data.purchased_products)
      })
      .catch(() => setError('مشتری یافت نشد'))
      .finally(() => setLoading(false))
  }, [sessionId, phone])

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-slate-400 text-sm">
      در حال بارگذاری...
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <p className="text-red-500">{error}</p>
      <button onClick={() => navigate(-1)} className="text-blue-600 text-sm hover:underline">بازگشت</button>
    </div>
  )

  const loyalty = LOYALTY_CONFIG[customer.loyalty_level]
  const initials = (customer.name || '؟').trim()[0]

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-5">
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-700 shrink-0">
          <ArrowRight size={20} />
        </button>
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 shrink-0">
          {initials}
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-800">{customer.name || '—'}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {loyalty && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${loyalty.bg} ${loyalty.text}`}>
                {loyalty.label}
              </span>
            )}
            {customer.score != null && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                <Star size={11} />
                {Number(customer.score).toLocaleString('fa-IR')} امتیاز
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Column 1: info */}
        <div className="space-y-3">
          <InfoCard label="نام" value={customer.name} />
          <InfoCard label="شماره موبایل" value={customer.numberr ? '0' + String(customer.numberr) : null} ltr />
          <InfoCard label="استان" value={customer.province} />
          <InfoCard label="کارشناس فروش" value={customer.sp} />
          <InfoCard label="تاریخ ثبت" value={toJalali(customer.registration_date)} />
          <InfoCard label="اولین خرید" value={toJalali(customer.first_purchase_date)} />
          <InfoCard label="آخرین خرید" value={toJalali(customer.last_purchase_date)} />
        </div>

        {/* Column 2: chart + stats + sms */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-700 mb-4">محصولات خریداری شده</h2>
            <PurchaseHistoryChart customer={customer} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="اولین خرید" value={toJalali(customer.first_purchase_date)} />
            <StatCard
              label="تعداد خرید"
              value={customer.total_purchases != null ? Number(customer.total_purchases).toLocaleString('fa-IR') : '—'}
              highlight
            />
            <StatCard
              label="مبلغ کل (ت)"
              value={customer.total_amount != null ? Number(customer.total_amount).toLocaleString('fa-IR') : '—'}
            />
          </div>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-bold transition">
            ارسال پیام
          </button>
        </div>

        {/* Column 3: gauge + products list */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-700 mb-4">سطح وفاداری</h2>
            <SatisfactionGauge loyaltyLevel={customer.loyalty_level} />
          </div>
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-700 mb-3">لیست محصولات</h2>
            {purchasedProducts.length === 0
              ? <p className="text-slate-400 text-sm">بدون خرید</p>
              : (
                <ul className="space-y-2">
                  {purchasedProducts.map(col => (
                    <li key={col} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      {PRODUCT_LABEL_MAP[col] || col}
                    </li>
                  ))}
                </ul>
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}
