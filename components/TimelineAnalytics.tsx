'use client'

import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Eye, Heart, Users } from '@/components/icons'
import {
  InteractiveLineChart,
  InteractiveBarChart,
  MultiBarChart,
  CHART_COLORS
} from '@/components/charts/ChartComponents'
import type { CampaignKOL } from '@/lib/types/profile'

interface TimelineAnalyticsProps {
  kols: CampaignKOL[]
  campaignName: string
  startDate: string
  endDate: string
  onClose: () => void
}

interface TimelineData {
  name: string
  posts: number
  views: number
  engagement: number
  activeKOLs: number
}

export default function TimelineAnalytics({ 
  kols, 
  campaignName, 
  startDate, 
  endDate,
  onClose 
}: TimelineAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [selectedMetric, setSelectedMetric] = useState<'all' | 'views' | 'engagement' | 'posts'>('all')
  const [timelineData, setTimelineData] = useState<TimelineData[]>([])
  
  useEffect(() => {
    generateTimelineData()
  }, [kols, timeRange])
  
  const generateTimelineData = () => {
    // Generate date range
    const start = new Date(startDate)
    const end = new Date(endDate)
    const dates: Date[] = []
    
    const current = new Date(start)
    while (current <= end) {
      dates.push(new Date(current))
      
      switch (timeRange) {
        case 'daily':
          current.setDate(current.getDate() + 1)
          break
        case 'weekly':
          current.setDate(current.getDate() + 7)
          break
        case 'monthly':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }
    
    // Aggregate data by date
    const data: TimelineData[] = dates.map(date => {
      const dateStr = formatDate(date, timeRange)
      
      // Find KOLs who posted on this date (simulated - in real app would use actual post dates)
      const activeKOLs = kols.filter(kol => {
        // Simulate: assume KOLs posted randomly throughout the campaign
        const random = Math.random()
        return kol.stage === 'posted' || kol.stage === 'done' ? random > 0.3 : false
      })
      
      const posts = activeKOLs.length
      const views = activeKOLs.reduce((sum, kol) => sum + (kol.totalViews || 0) / dates.length, 0)
      const engagement = activeKOLs.reduce((sum, kol) => sum + (kol.totalEngagement || 0) / dates.length, 0)
      
      return {
        name: dateStr,
        posts,
        views: Math.round(views),
        engagement: Math.round(engagement),
        activeKOLs: activeKOLs.length
      }
    })
    
    setTimelineData(data)
  }
  
  const formatDate = (date: Date, range: 'daily' | 'weekly' | 'monthly') => {
    switch (range) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
  }
  
  // Calculate cumulative metrics
  const cumulativeData = timelineData.reduce((acc, curr, index) => {
    if (index === 0) {
      acc.push({
        name: curr.name,
        cumulativeViews: curr.views,
        cumulativeEngagement: curr.engagement,
        cumulativePosts: curr.posts
      })
    } else {
      const prev = acc[index - 1]
      acc.push({
        name: curr.name,
        cumulativeViews: prev.cumulativeViews + curr.views,
        cumulativeEngagement: prev.cumulativeEngagement + curr.engagement,
        cumulativePosts: prev.cumulativePosts + curr.posts
      })
    }
    return acc
  }, [] as any[])
  
  // Calculate growth rates
  const growthData = timelineData.map((curr, index) => {
    if (index === 0) return { name: curr.name, viewsGrowth: 0, engagementGrowth: 0 }
    
    const prev = timelineData[index - 1]
    const viewsGrowth = prev.views > 0 ? ((curr.views - prev.views) / prev.views) * 100 : 0
    const engagementGrowth = prev.engagement > 0 ? ((curr.engagement - prev.engagement) / prev.engagement) * 100 : 0
    
    return {
      name: curr.name,
      viewsGrowth: Math.round(viewsGrowth),
      engagementGrowth: Math.round(engagementGrowth)
    }
  })
  
  // Top performing days
  const topDays = [...timelineData]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
  
  // Summary stats
  const totalViews = timelineData.reduce((sum, d) => sum + d.views, 0)
  const totalEngagement = timelineData.reduce((sum, d) => sum + d.engagement, 0)
  const totalPosts = timelineData.reduce((sum, d) => sum + d.posts, 0)
  const avgViewsPerDay = totalViews / timelineData.length
  const avgEngagementPerDay = totalEngagement / timelineData.length
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-green-500 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-green-300" />
            <h2 className="text-xl font-bold text-green-300">Timeline Analytics - {campaignName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-green-300 hover:text-green-100 transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Controls */}
        <div className="p-4 border-b border-green-500 flex flex-wrap gap-4">
          <div>
            <label className="text-sm text-green-400 mb-1 block">Time Range</label>
            <div className="flex gap-2">
              {(['daily', 'weekly', 'monthly'] as const).map(range => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    timeRange === range
                      ? 'bg-green-900 text-green-100'
                      : 'border border-green-500 text-green-300 hover:bg-green-900/30'
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm text-green-400 mb-1 block">Metric View</label>
            <div className="flex gap-2">
              {(['all', 'views', 'engagement', 'posts'] as const).map(metric => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    selectedMetric === metric
                      ? 'bg-green-900 text-green-100'
                      : 'border border-green-500 text-green-300 hover:bg-green-900/30'
                  }`}
                >
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-1">Total Views</h3>
              <p className="text-2xl font-bold text-green-300">{totalViews.toLocaleString()}</p>
              <p className="text-xs text-green-500">Avg {Math.round(avgViewsPerDay).toLocaleString()}/day</p>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-1">Total Engagement</h3>
              <p className="text-2xl font-bold text-green-300">{totalEngagement.toLocaleString()}</p>
              <p className="text-xs text-green-500">Avg {Math.round(avgEngagementPerDay).toLocaleString()}/day</p>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-1">Total Posts</h3>
              <p className="text-2xl font-bold text-green-300">{totalPosts}</p>
              <p className="text-xs text-green-500">{timelineData.length} days tracked</p>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-1">Engagement Rate</h3>
              <p className="text-2xl font-bold text-green-300">
                {totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : 0}%
              </p>
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <h3 className="text-sm font-medium text-green-400 mb-1">Active KOLs</h3>
              <p className="text-2xl font-bold text-green-300">
                {kols.filter(k => k.stage === 'posted' || k.stage === 'done').length}
              </p>
            </div>
          </div>
          
          {/* Main Chart */}
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>
            {selectedMetric === 'all' ? (
              <InteractiveLineChart
                data={timelineData}
                lines={[
                  { dataKey: 'views', color: CHART_COLORS.green, name: 'Views' },
                  { dataKey: 'engagement', color: CHART_COLORS.blue, name: 'Engagement' },
                  { dataKey: 'posts', color: CHART_COLORS.yellow, name: 'Posts' }
                ]}
                height={300}
                showArea={true}
              />
            ) : (
              <InteractiveBarChart
                data={timelineData}
                dataKey={selectedMetric}
                color={
                  selectedMetric === 'views' ? CHART_COLORS.green :
                  selectedMetric === 'engagement' ? CHART_COLORS.blue :
                  CHART_COLORS.yellow
                }
                height={300}
              />
            )}
          </div>
          
          {/* Cumulative Growth */}
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Cumulative Growth</h3>
            <InteractiveLineChart
              data={cumulativeData}
              lines={[
                { dataKey: 'cumulativeViews', color: CHART_COLORS.green, name: 'Total Views' },
                { dataKey: 'cumulativeEngagement', color: CHART_COLORS.blue, name: 'Total Engagement' }
              ]}
              height={250}
            />
          </div>
          
          {/* Growth Rate */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Views Growth Rate (%)</h3>
              <InteractiveBarChart
                data={growthData}
                dataKey="viewsGrowth"
                color={CHART_COLORS.green}
                height={200}
              />
            </div>
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Engagement Growth Rate (%)</h3>
              <InteractiveBarChart
                data={growthData}
                dataKey="engagementGrowth"
                color={CHART_COLORS.blue}
                height={200}
              />
            </div>
          </div>
          
          {/* Top Performing Days */}
          <div className="bg-green-900/20 border border-green-500 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performing Days</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-green-500">
                    <th className="text-left p-3 text-green-300">Date</th>
                    <th className="text-left p-3 text-green-300">Views</th>
                    <th className="text-left p-3 text-green-300">Engagement</th>
                    <th className="text-left p-3 text-green-300">Posts</th>
                    <th className="text-left p-3 text-green-300">Eng Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {topDays.map((day, index) => (
                    <tr key={index} className="border-b border-green-500/30">
                      <td className="p-3 text-green-300">{day.date}</td>
                      <td className="p-3 text-green-300">{day.views.toLocaleString()}</td>
                      <td className="p-3 text-green-300">{day.engagement.toLocaleString()}</td>
                      <td className="p-3 text-green-300">{day.posts}</td>
                      <td className="p-3 text-green-300">
                        {day.views > 0 ? ((day.engagement / day.views) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-green-500 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
} 