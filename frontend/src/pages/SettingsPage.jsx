import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'

export default function SettingsPage() {
  const navigate = useNavigate()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings size={24} className="text-slate-600" />
          <h1 className="text-2xl font-bold text-slate-800">تنظیمات</h1>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800
            bg-white border border-slate-200 px-4 py-2 rounded-lg text-sm transition"
        >
          <ArrowLeft size={16} />
          بازگشت
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-400 text-sm">
        تنظیمات به زودی اضافه می‌شود.
      </div>
    </div>
  )
}
