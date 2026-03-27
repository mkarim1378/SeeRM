import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, name, percentage }) => {
  const RADIAN = Math.PI / 180
  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={13}
      fontFamily="Vazirmatn, sans-serif"
    >
      {`${name} ${percentage}%`}
    </text>
  )
}

export default function ExpertsPieChart({ data }) {
  return (
    <PieChart width={420} height={300}>
      <Pie
        data={data}
        cx={200}
        cy={140}
        outerRadius={100}
        dataKey="count"
        nameKey="name"
        label={renderCustomizedLabel}
        labelLine={true}
      >
        {data.map((_, i) => (
          <Cell key={i} fill={COLORS[i % COLORS.length]} />
        ))}
      </Pie>
      <Tooltip
        formatter={(value, name) => [value, name]}
        contentStyle={{ fontFamily: 'Vazirmatn, sans-serif', direction: 'rtl' }}
      />
    </PieChart>
  )
}
