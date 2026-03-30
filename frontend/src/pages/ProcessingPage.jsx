import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CheckCircle, Circle, Loader } from 'lucide-react'

const steps = [
  'خواندن فایل Excel',
  'پاکسازی شماره‌ها',
  'ادغام رکوردهای تکراری',
  'محاسبه محصولات',
  'تولید آمار نهایی',
]

export default function ProcessingPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    // شبیه‌سازی مراحل + فراخوانی API
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
        const { records, columns, ...stats } = res.data
        sessionStorage.setItem(`result_${sessionId}`, JSON.stringify(stats))
        setTimeout(() => navigate(`/dashboard/${sessionId}`), 800)
      })
      .catch ((err) => {
  console.log("FULL ERROR:", err)
  console.log("RESPONSE:", err.response)
  console.log("DATA:", err.response?.data)
  setError(err.response?.data?.detail || 'خطا در پردازش فایل')
})

    return () => clearInterval(interval)
  }, [sessionId, navigate])

  const progress = Math.round((currentStep / steps.length) * 100)

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
        <h2 className="text-xl font-bold text-slate-800 mb-8 text-center">
          در حال پردازش...
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
