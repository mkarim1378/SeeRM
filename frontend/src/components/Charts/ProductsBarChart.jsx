import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function ProductsBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(data.length * 24, 20)}>
      <BarChart
        data={data}
        layout="vertical"
        barCategoryGap={1}
        margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
      >
        <XAxis type="number" tick={{ fontFamily: 'Vazirmatn, sans-serif', fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="product"
          width={155}
          interval={0}
          tick={{
            fontFamily: 'Vazirmatn, sans-serif',
            fontSize: 12,
            fill: '#374151',
            textAnchor: 'start',
            dx: -20,
          }}
        />
        <Tooltip
          contentStyle={{ fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' }}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={10} />
      </BarChart>
    </ResponsiveContainer>
  )
}
