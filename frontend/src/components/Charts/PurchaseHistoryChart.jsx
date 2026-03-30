import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const PRODUCT_LABELS = {
  chini: 'دوره چینی', dakheli: 'دوره داخلی', zaban: 'زبان فنی',
  book: 'کتاب زبان', carman: 'دستگاه دیاگ', azmoon: 'آزمون',
  ghabooli: 'قبولی', garage: 'گاراژ', hoz: 'دوره حضوری',
  kia: 'دوره کره‌ای', milyarder: 'میلیاردر', 'gds-tuts': 'دوره GDS',
  gds: 'نرم‌افزار GDS', 'tpms-tuts': 'دوره TPMS', zed: 'ضد سرقت',
  kmc: 'وبینار KMC', carmap: 'کارمپ', eps: 'فرمان برقی',
}

export default function PurchaseHistoryChart({ customer }) {
  const data = Object.entries(PRODUCT_LABELS)
    .filter(([col]) => customer[col] === 1)
    .map(([, label]) => ({ name: label, value: 1 }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-slate-400 text-sm">
        بدون خرید
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 36, 80)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="name"
          width={155}
          tick={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: 12, fill: '#374151' }}
        />
        <Tooltip
          formatter={() => ['خریداری شده']}
          contentStyle={{ fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' }}
        />
        <Bar dataKey="value" fill="#3b82f6" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
