import { PieChart, Pie, Cell } from 'recharts'

const LEVEL_CONFIG = {
  Bronze:   { pct: 20,  color: '#d97706', label: 'برنزی'     },
  Silver:   { pct: 40,  color: '#94a3b8', label: 'نقره‌ای'   },
  Gold:     { pct: 60,  color: '#f59e0b', label: 'طلایی'     },
  Platinum: { pct: 80,  color: '#06b6d4', label: 'پلاتینیوم' },
  Diamond:  { pct: 100, color: '#3b82f6', label: 'الماسی'    },
}

export default function SatisfactionGauge({ loyaltyLevel }) {
  const cfg = LEVEL_CONFIG[loyaltyLevel] ?? { pct: 0, color: '#e2e8f0', label: '—' }
  const data = [{ value: cfg.pct }, { value: 100 - cfg.pct }]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-48 h-24 overflow-hidden">
        <PieChart width={192} height={192}>
          <Pie
            data={data}
            cx={96}
            cy={96}
            startAngle={180}
            endAngle={0}
            innerRadius={58}
            outerRadius={88}
            dataKey="value"
            strokeWidth={0}
          >
            <Cell fill={cfg.color} />
            <Cell fill="#e2e8f0" />
          </Pie>
        </PieChart>
        <div className="absolute inset-x-0 bottom-0 flex justify-center">
          <span className="text-2xl font-bold text-slate-800">{cfg.pct}%</span>
        </div>
      </div>
      <span className="text-sm font-semibold text-slate-600">{cfg.label}</span>
    </div>
  )
}
