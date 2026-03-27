import { Routes, Route, Navigate } from 'react-router-dom'
import UploadPage from './pages/UploadPage'
import ProcessingPage from './pages/ProcessingPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100" dir="rtl">
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/processing/:sessionId" element={<ProcessingPage />} />
        <Route path="/dashboard/:sessionId" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}
