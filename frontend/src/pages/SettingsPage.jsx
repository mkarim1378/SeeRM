import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Settings, Save } from 'lucide-react'
import axios from 'axios'
import { getSettings, saveSettings } from '../utils/settings'
import { PRODUCT_KEYS } from '../components/DataTable'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const sessionId = state?.sessionId

  const [productNames, setProductNames] = useState({})
  const [expertNames, setExpertNames] = useState({})
  const [experts, setExperts] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const s = getSettings()
    setProductNames(s.productNames || {})
    setExpertNames(s.expertNames || {})

    if (sessionId) {
      axios.get(`/api/results/${sessionId}`)
        .then(res => {
          const unique = [...new Set(res.data.records.map(r => r.sp).filter(Boolean))]
          setExperts(unique.sort())
        })
        .catch(() => {})
    }
  }, [sessionId])

  const handleSave = () => {
    saveSettings({ productNames, expertNames })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">تنظیمات</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700
              text-white px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            <Save size={15} />
            {saved ? 'ذخیره شد ✓' : 'ذخیره تنظیمات'}
          </button>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800
              bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm transition"
          >
            <ArrowLeft size={16} />
            بازگشت
          </button>
        </div>
      </div>

      {/* Product Names */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">نام محصولات</h2>
          <p className="text-sm text-slate-500 mt-1">
            نام نمایشی محصولات را ویرایش کنید. اگر خالی بماند، نام پیش‌فرض نمایش داده می‌شود.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PRODUCT_KEYS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label className="text-xs text-slate-400">{label}</label>
              <input
                type="text"
                placeholder={label}
                value={productNames[key] || ''}
                onChange={e => setProductNames(prev => ({ ...prev, [key]: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Expert Names */}
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">نام کارشناسان فروش</h2>
          <p className="text-sm text-slate-500 mt-1">
            برای هر کد کارشناس یک نام کامل وارد کنید. اگر خالی بماند، کد اصلی نمایش داده می‌شود.
          </p>
        </div>
        {experts.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">
            {sessionId
              ? 'کارشناسی در این فایل یافت نشد.'
              : 'برای مشاهده لیست کارشناسان، از داشبورد وارد تنظیمات شوید.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {experts.map(code => (
              <div key={code} className="space-y-1">
                <label className="text-xs text-slate-400">{code}</label>
                <input
                  type="text"
                  placeholder={code}
                  value={expertNames[code] || ''}
                  onChange={e => setExpertNames(prev => ({ ...prev, [code]: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm
                    focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
