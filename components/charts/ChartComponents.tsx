'use client'

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts'

// Color palette for charts
export const CHART_COLORS = {
  green: '#86efac',
  darkGreen: '#22c55e',
  lightGreen: '#bbf7d0',
  blue: '#60a5fa',
  darkBlue: '#3b82f6',
  yellow: '#fbbf24',
  purple: '#a78bfa',
  red: '#f87171',
  gray: '#9ca3af',
  orange: '#fb923c'
}

// Tier colors
export const TIER_COLORS: Record<string, string> = {
  hero: CHART_COLORS.yellow,
  legend: CHART_COLORS.purple,
  star: CHART_COLORS.blue,
  rising: CHART_COLORS.green,
  micro: CHART_COLORS.gray
}

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black border border-green-500 rounded p-3 shadow-lg">
        <p className="text-green-300 font-medium mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

// Bar Chart Component
interface BarChartData {
  name: string
  value: number
  [key: string]: any
}

interface InteractiveBarChartProps {
  data: BarChartData[]
  dataKey?: string
  color?: string
  showGrid?: boolean
  showLegend?: boolean
  height?: number
}

export function InteractiveBarChart({
  data,
  dataKey = 'value',
  color = CHART_COLORS.green,
  showGrid = true,
  showLegend = false,
  height = 300
}: InteractiveBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" />}
        <XAxis 
          dataKey="name" 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <YAxis 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ color: '#86efac' }} />}
        <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Multi-Bar Chart Component
interface MultiBarChartProps {
  data: any[]
  bars: Array<{ dataKey: string; color: string; name?: string }>
  height?: number
}

export function MultiBarChart({ data, bars, height = 300 }: MultiBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" />
        <XAxis 
          dataKey="name" 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <YAxis 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#86efac' }} />
        {bars.map((bar, index) => (
          <Bar 
            key={index}
            dataKey={bar.dataKey}
            fill={bar.color}
            name={bar.name || bar.dataKey}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// Pie Chart Component
interface PieChartData {
  name: string
  value: number
  color?: string
}

interface InteractivePieChartProps {
  data: PieChartData[]
  height?: number
  innerRadius?: number
  showLabels?: boolean
}

export function InteractivePieChart({
  data,
  height = 300,
  innerRadius = 0,
  showLabels = true
}: InteractivePieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabels ? ({
            cx,
            cy,
            midAngle,
            innerRadius,
            outerRadius,
            percent
          }) => {
            const radius = innerRadius + (outerRadius - innerRadius) * 0.5
            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180)
            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180)

            return (
              <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-medium"
              >
                {`${(percent * 100).toFixed(0)}%`}
              </text>
            )
          } : false}
          outerRadius={80}
          innerRadius={innerRadius}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS.green} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          wrapperStyle={{ color: '#86efac' }}
          formatter={(value) => <span style={{ color: '#86efac' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// Line Chart Component
interface LineChartData {
  name: string
  [key: string]: any
}

interface InteractiveLineChartProps {
  data: LineChartData[]
  lines: Array<{ dataKey: string; color: string; name?: string }>
  height?: number
  showArea?: boolean
}

export function InteractiveLineChart({
  data,
  lines,
  height = 300,
  showArea = false
}: InteractiveLineChartProps) {
  if (showArea) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" />
          <XAxis 
            dataKey="name" 
            stroke="#86efac"
            tick={{ fill: '#86efac', fontSize: 12 }}
          />
          <YAxis 
            stroke="#86efac"
            tick={{ fill: '#86efac', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ color: '#86efac' }} />
          {lines.map((line, index) => (
            <Area
              key={index}
              type="monotone"
              dataKey={line.dataKey}
              stroke={line.color}
              fill={line.color}
              fillOpacity={0.3}
              name={line.name || line.dataKey}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" />
        <XAxis 
          dataKey="name" 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <YAxis 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#86efac' }} />
        {lines.map((line, index) => (
          <Line
            key={index}
            type="monotone"
            dataKey={line.dataKey}
            stroke={line.color}
            name={line.name || line.dataKey}
            strokeWidth={2}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

// Radar Chart Component
interface RadarChartData {
  subject: string
  [key: string]: any
}

interface InteractiveRadarChartProps {
  data: RadarChartData[]
  dataKeys: Array<{ dataKey: string; color: string; name?: string }>
  height?: number
}

export function InteractiveRadarChart({
  data,
  dataKeys,
  height = 300
}: InteractiveRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#064e3b" />
        <PolarAngleAxis 
          dataKey="subject" 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          stroke="#86efac"
          tick={{ fill: '#86efac', fontSize: 10 }}
        />
        {dataKeys.map((item, index) => (
          <Radar
            key={index}
            name={item.name || item.dataKey}
            dataKey={item.dataKey}
            stroke={item.color}
            fill={item.color}
            fillOpacity={0.3}
          />
        ))}
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ color: '#86efac' }} />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// Progress Chart Component (for stage/status distributions)
interface ProgressData {
  name: string
  value: number
  total: number
  color?: string
}

export function ProgressChart({ data }: { data: ProgressData[] }) {
  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = (item.value / item.total) * 100
        return (
          <div key={index}>
            <div className="flex justify-between mb-1">
              <span className="text-sm text-green-300">{item.name}</span>
              <span className="text-sm text-green-400">
                {item.value} / {item.total} ({percentage.toFixed(0)}%)
              </span>
            </div>
            <div className="w-full bg-black rounded-full h-6 relative overflow-hidden border border-green-500/30">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: item.color || CHART_COLORS.green
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {percentage.toFixed(0)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
} 