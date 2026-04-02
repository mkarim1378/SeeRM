import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { UploadCloud, FileSpreadsheet, AlertCircle } from 'lucide-react'

export default function UploadPage() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const appendMode = searchParams.get('mode') === 'append'
  const oldSessionId = searchParams.get('from')

  const handleFile = (f) => {
    if (!f.name.match(/\.(xlsx|xls)$/)) {
      setError('لطفاً فقط فایل Excel انتخاب کنید')
      return
    }
    setError('')
    setFile(f)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await axios.post('/api/upload', formData)
      navigate(
        `/processing/${res.data.session_id}`,
        appendMode ? { state: { appendMode: true, oldSessionId } } : undefined
      )
    } catch (err) {
      setError('خطا در آپلود فایل. لطفاً دوباره تلاش کنید.')
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">
          {appendMode ? 'افزودن داده به جدول' : 'داشبورد مشتریان'}
        </h1>
        <p className="text-slate-500 text-center mb-8">
          {appendMode
            ? 'فایل Excel جدید را آپلود کنید تا به داده‌های فعلی اضافه شود'
            : 'فایل Excel خود را آپلود کنید'}
        </p>

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
            ${dragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}
            ${file ? 'border-green-400 bg-green-50' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => handleFile(e.target.files[0])}
          />
          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileSpreadsheet className="text-green-500" size={48} />
              <p className="text-green-700 font-medium">{file.name}</p>
              <p className="text-slate-400 text-sm">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <UploadCloud className="text-slate-400" size={48} />
              <p className="text-slate-600 font-medium">
                فایل را اینجا رها کنید
              </p>
              <p className="text-slate-400 text-sm">یا کلیک کنید</p>
              <p className="text-slate-300 text-xs">xlsx, xls</p>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300
            text-white font-bold py-3 rounded-xl transition-colors"
        >
          {uploading ? 'در حال آپلود...' : 'شروع پردازش'}
        </button>

        {appendMode && (
          <button
            onClick={() => navigate(-1)}
            className="mt-3 w-full text-slate-500 text-sm hover:text-slate-700 transition"
          >
            انصراف و بازگشت
          </button>
        )}
      </div>
    </div>
  )
}
