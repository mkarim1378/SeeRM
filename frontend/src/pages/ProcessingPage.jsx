import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle, Circle, Loader } from 'lucide-react'

const steps = [
  'خواندن فایل Excel',
  'پاکسازی شماره‌ها',
  'ادغام رکوردهای تکراری',
  'محاسبه محصولات',
  'تولید آمار نهایی',
]

function mergeStats(oldStats, newStats) {
  const total = (oldStats.total || 0) + (newStats.total || 0)
  const hichi_count = (oldStats.hichi_count || 0) + (newStats.hichi_count || 0)

  const productMap = {}
  for (const p of [...(oldStats.products_stats || []), ...(newStats.products_stats || [])]) {
    productMap[p.product] = (productMap[p.product] || 0) + p.count
  }
  const products_stats = Object.entries(productMap)
    .map(([product, count]) => ({ product, count }))
    .sort((a, b) => b.count - a.count)

  const expertMap = {}
  for (const e of [...(oldStats.experts_stats || []), ...(newStats.experts_stats || [])]) {
    expertMap[e.name] = (expertMap[e.name] || 0) + e.count
  }
  const expertsTotal = Object.values(expertMap).reduce((a, b) => a + b, 0)
  const experts_stats = Object.entries(expertMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: expertsTotal ? Math.round(count / expertsTotal * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  return { ...newStats, total, hichi_count, products_stats, experts_stats }
}

export default function ProcessingPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { state } = useLocation()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    let step = 0
    const interval = setInterval(() => {
      step++
      setCurrentStep(step)
      if (step >= steps.length - 1) clearInterval(interval)
    }, 600)

    axios.post(`/api/process/${sessionId}`)
      .then((res) => {
        clearInterval(interval)
        setCurrentStep(steps.length)

        const { records, columns, ...newStats } = res.data

        let statsToStore = newStats
        if (state?.appendMode && state?.oldSessionId) {
          const oldRaw = sessionStorage.getItem(`result_${state.oldSessionId}`)
          if (oldRaw) {
            const oldStats = JSON.parse(oldRaw)
            statsToStore = { ...mergeStats(oldStats, newStats), appendFrom: state.oldSessionId }
          }
        }

        sessionStorage.setItem(`result_${sessionId}`, JSON.stringify(statsToStore))
        setTimeout(() => navigate(`/dashboard/${sessionId}`), 800)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || 'خطا در پردازش فایل')
      })

    return () => clearInterval(interval)
  }, [sessionId, navigate, state])

  const progress = Math.round((currentStep / steps.length) * 100)

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-800 mb-8 text-center">
          {state?.appendMode ? 'در حال افزودن داده...' : 'در حال پردازش...'}
        </h2>

        <div className="space-y-4 mb-8">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              {i < currentStep ? (
                <CheckCircle className="text-green-500 shrink-0" size={22} />
              ) : i === currentStep ? (
                <Loader className="text-blue-500 animate-spin shrink-0" size={22} />
              ) : (
                <Circle className="text-slate-300 shrink-0" size={22} />
              )}
              <span className={`text-sm ${
                i < currentStep ? 'text-green-700 font-medium' :
                i === currentStep ? 'text-blue-700 font-medium' :
                'text-slate-400'
              }`}>
                {step}
              </span>
            </div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-center text-sm text-slate-500 mt-2">{progress}%</p>

        {error && (
          <div className="mt-6 text-red-600 bg-red-50 p-3 rounded-lg text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
