'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  Cell,
  ZAxis
} from 'recharts'
import type { KOL } from '@/lib/campaign'

interface CampaignChartsProps {
  kols: KOL[]
  onClose: () => void
}

// Color scheme for charts
const COLORS = {
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  youtube: '#FF0000',
  tiktok: '#000000',
  linkedin: '#0077B5',
  telegram: '#0088CC',
  hero: '#9333ea',
  star: '#eab308',
  rising: '#9333ea', // Changed from blue to purple
  micro: '#6b7280'
}

export default function CampaignCharts({ kols, onClose }: CampaignChartsProps) {
  // Process data for charts
  const chartData = useMemo(() => {
    // Group by tier for stacked bar chart
    const tierData = kols.reduce((acc, kol) => {
      const tier = kol.tier || 'none'
      if (!acc[tier]) {
        acc[tier] = { tier, totalViews: 0, kols: [] }
      }
      acc[tier].totalViews += kol.views
      acc[tier].kols.push(kol)
      return acc
    }, {} as Record<string, { tier: string; totalViews: number; kols: KOL[] }>)

    // Convert to array and sort by tier order
    const tierOrder = ['hero', 'star', 'rising', 'micro', 'none']
    const stackedData = tierOrder
      .filter(tier => tierData[tier])
      .map(tier => {
        const data = tierData[tier]
        // Group by platform for stacking
        const platformViews = data.kols.reduce((acc, kol) => {
          kol.platform.forEach(platform => {
            if (!acc[platform]) acc[platform] = 0
            acc[platform] += kol.views / kol.platform.length // Distribute views across platforms
          })
          return acc
        }, {} as Record<string, number>)
        
        return {
          tier: tier.charAt(0).toUpperCase() + tier.slice(1),
          ...platformViews,
          total: data.totalViews
        }
      })

    // Bubble chart data
    const bubbleData = kols.map(kol => {
      // Parse budget to number
      let budgetValue = 0
      if (kol.budget && kol.budget !== 'free' && kol.budget !== 'with device') {
        budgetValue = parseFloat(kol.budget.replace(/[^0-9.-]+/g, '')) || 0
      }
      
      return {
        name: kol.name,
        handle: kol.handle,
        x: budgetValue,
        y: kol.views,
        z: getTierSize(kol.tier),
        tier: kol.tier || 'none',
        budget: kol.budget
      }
    })

    // Heatmap data
    const heatmapData = kols.map(kol => {
      let budgetValue = 0
      if (kol.budget && kol.budget !== 'free' && kol.budget !== 'with device') {
        budgetValue = parseFloat(kol.budget.replace(/[^0-9.-]+/g, '')) || 0
      }
      
      const costPerView = kol.views > 0 ? budgetValue / kol.views : 0
      
      return {
        name: kol.name,
        tier: kol.tier || 'none',
        costPerView,
        views: kol.views,
        budget: budgetValue
      }
    })

    // Get unique platforms for the stacked bar chart
    const platforms = Array.from(new Set(kols.flatMap(kol => kol.platform)))

    return { stackedData, bubbleData, heatmapData, platforms }
  }, [kols])

  function getTierSize(tier?: KOL['tier']) {
    switch (tier) {
      case 'hero': return 100
      case 'star': return 75
      case 'rising': return 50
      case 'micro': return 25
      default: return 15
    }
  }

  function getTierColor(tier?: KOL['tier'] | 'none') {
    switch (tier) {
      case 'hero': return '#9333ea'
      case 'star': return '#eab308'
      case 'rising': return '#9333ea'
      case 'micro': return '#6b7280'
      default: return '#374151'
    }
  }

  // Custom tooltip for bubble chart
  const BubbleTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black border border-green-300 p-2 text-xs">
          <p className="font-bold">{data.name}</p>
          <p>@{data.handle}</p>
          <p>Budget: {data.budget}</p>
          <p>Views: {data.y.toLocaleString()}</p>
          <p>Tier: {data.tier}</p>
        </div>
      )
    }
    return null
  }

  // Create heatmap grid
  const heatmapGrid = useMemo(() => {
    const tiers = ['hero', 'star', 'rising', 'micro', 'none']
    const grid = tiers.map(tier => {
      const tierKols = chartData.heatmapData.filter(kol => kol.tier === tier)
      return {
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        kols: tierKols.sort((a, b) => a.costPerView - b.costPerView)
      }
    })
    return grid.filter(row => row.kols.length > 0)
  }, [chartData.heatmapData])

  const getHeatmapColor = (costPerView: number) => {
    if (costPerView === 0) return '#1f2937' // Dark gray for free
    if (costPerView < 0.01) return '#065f46' // Dark green - excellent
    if (costPerView < 0.05) return '#059669' // Green - good
    if (costPerView < 0.1) return '#eab308' // Yellow - moderate
    if (costPerView < 0.5) return '#ea580c' // Orange - expensive
    return '#dc2626' // Red - very expensive
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-black border-2 border-green-300 p-4 sm:p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold">CAMPAIGN ANALYTICS</h2>
          <button
            onClick={onClose}
            className="text-green-300 hover:text-green-400 text-xl sm:text-2xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-6 sm:space-y-8">
          {/* Stacked Bar Chart */}
          <div>
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Total Views by Badge Tier</h3>
            <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
              <BarChart data={chartData.stackedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="tier" stroke="#10b981" tick={{ fontSize: 12 }} />
                <YAxis stroke="#10b981" tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#000', border: '1px solid #10b981', fontSize: '12px' }}
                  labelStyle={{ color: '#10b981' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                {chartData.platforms.map((platform, index) => (
                  <Bar 
                    key={platform}
                    dataKey={platform}
                    stackId="a"
                    fill={`hsl(${index * 360 / chartData.platforms.length}, 70%, 50%)`}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Bubble Chart */}
          <div>
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Views vs Budget per KOL</h3>
            <ResponsiveContainer width="100%" height={300} className="sm:h-[400px]">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Budget" 
                  stroke="#10b981"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Budget ($)', position: 'insideBottom', offset: -5, style: { fontSize: 12 } }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Views" 
                  stroke="#10b981"
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Views', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
                />
                <ZAxis type="number" dataKey="z" range={[30, 300]} />
                <Tooltip content={<BubbleTooltip />} />
                <Scatter name="KOLs" data={chartData.bubbleData}>
                  {chartData.bubbleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTierColor(entry.tier as KOL['tier'] | 'none')} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTierColor('hero') }}></span>
                Hero
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTierColor('star') }}></span>
                Star
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTierColor('rising') }}></span>
                Rising
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getTierColor('micro') }}></span>
                Micro
              </span>
            </div>
          </div>

          {/* Heatmap */}
          <div>
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Cost per View Heatmap</h3>
            <div className="overflow-x-auto">
              <table className="w-full border border-green-300 text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-green-300">
                    <th className="p-1.5 sm:p-2 text-left text-xs uppercase">Tier</th>
                    <th className="p-1.5 sm:p-2 text-left text-xs uppercase">KOLs (sorted by efficiency)</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapGrid.map(row => (
                    <tr key={row.tier} className="border-b border-green-300">
                      <td className="p-1.5 sm:p-2 font-bold">{row.tier}</td>
                      <td className="p-1.5 sm:p-2">
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {row.kols.map(kol => (
                            <div
                              key={kol.name}
                              className="px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs rounded"
                              style={{ backgroundColor: getHeatmapColor(kol.costPerView) }}
                              title={`${kol.name}: $${kol.costPerView.toFixed(3)}/view`}
                            >
                              {kol.name}
                              <span className="ml-1 text-[10px] opacity-75">
                                ${kol.costPerView.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-2 flex flex-wrap gap-1 sm:gap-2 text-xs">
                <span>Cost/View:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#065f46' }}></span>
                  &lt;$0.01
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#059669' }}></span>
                  &lt;$0.05
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#eab308' }}></span>
                  &lt;$0.10
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#ea580c' }}></span>
                  &lt;$0.50
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 sm:w-4 sm:h-4 rounded" style={{ backgroundColor: '#dc2626' }}></span>
                  &gt;$0.50
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 