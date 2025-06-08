'use client'

import { useState, useEffect } from 'react'
import { Calculator, Package, DollarSign, Users } from '@/components/icons'
import type { CampaignKOL } from '@/lib/types/profile'

interface BudgetCalculatorProps {
  kols: CampaignKOL[]
  campaignName: string
  onClose: () => void
}

interface BudgetBreakdown {
  kolPayments: number
  deviceCosts: number
  totalBudget: number
  averagePerKOL: number
  costPerView: number
  costPerEngagement: number
  devicesNeeded: number
  devicesPreparing: number
  devicesReceived: number
  devicesSentBefore: number
}

const DEVICE_COSTS = {
  phone: 800,
  tablet: 600,
  laptop: 1200,
  camera: 500,
  accessories: 100,
  shipping: 50
}

export default function BudgetCalculator({ kols, campaignName, onClose }: BudgetCalculatorProps) {
  const [deviceType, setDeviceType] = useState<keyof typeof DEVICE_COSTS>('phone')
  const [customDeviceCost, setCustomDeviceCost] = useState(0)
  const [includeShipping, setIncludeShipping] = useState(true)
  const [breakdown, setBreakdown] = useState<BudgetBreakdown>({
    kolPayments: 0,
    deviceCosts: 0,
    totalBudget: 0,
    averagePerKOL: 0,
    costPerView: 0,
    costPerEngagement: 0,
    devicesNeeded: 0,
    devicesPreparing: 0,
    devicesReceived: 0,
    devicesSentBefore: 0
  })
  
  // Calculate budget breakdown
  useEffect(() => {
    const kolPayments = kols.reduce((sum, kol) => sum + kol.budget, 0)
    
    // Count devices by status
    let devicesNeeded = 0
    let devicesPreparing = 0
    let devicesReceived = 0
    let devicesSentBefore = 0
    
    kols.forEach(kol => {
      switch (kol.deviceStatus) {
        case 'preparing':
          devicesPreparing++
          devicesNeeded++
          break
        case 'on_way':
          devicesNeeded++
          break
        case 'received':
          devicesReceived++
          break
        case 'sent_before':
          devicesSentBefore++
          break
        case 'na':
        default:
          // No device needed
          break
      }
    })
    
    // Calculate device costs
    const deviceUnitCost = customDeviceCost || DEVICE_COSTS[deviceType]
    const shippingCost = includeShipping ? DEVICE_COSTS.shipping * devicesNeeded : 0
    const deviceCosts = (deviceUnitCost * devicesNeeded) + shippingCost
    
    const totalBudget = kolPayments + deviceCosts
    const averagePerKOL = kols.length > 0 ? totalBudget / kols.length : 0
    
    // Calculate efficiency metrics
    const totalViews = kols.reduce((sum, kol) => sum + (kol.totalViews || 0), 0)
    const totalEngagement = kols.reduce((sum, kol) => sum + (kol.totalEngagement || 0), 0)
    const costPerView = totalViews > 0 ? totalBudget / totalViews : 0
    const costPerEngagement = totalEngagement > 0 ? totalBudget / totalEngagement : 0
    
    setBreakdown({
      kolPayments,
      deviceCosts,
      totalBudget,
      averagePerKOL,
      costPerView,
      costPerEngagement,
      devicesNeeded,
      devicesPreparing,
      devicesReceived,
      devicesSentBefore
    })
  }, [kols, deviceType, customDeviceCost, includeShipping])
  
  // Group KOLs by payment status
  const paymentGroups = kols.reduce((acc, kol) => {
    const status = kol.paymentStatus || 'pending'
    if (!acc[status]) acc[status] = { count: 0, amount: 0 }
    acc[status].count++
    acc[status].amount += kol.budget
    return acc
  }, {} as Record<string, { count: number; amount: number }>)
  
  // Group KOLs by tier
  const tierGroups = kols.reduce((acc, kol) => {
    if (!acc[kol.tier]) acc[kol.tier] = { count: 0, amount: 0 }
    acc[kol.tier].count++
    acc[kol.tier].amount += kol.budget
    return acc
  }, {} as Record<string, { count: number; amount: number }>)
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-green-500 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <div className="flex items-center gap-3">
            <Calculator className="w-6 h-6 text-green-300" />
            <h2 className="text-xl font-bold text-green-300">Budget Calculator - {campaignName}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-green-300 hover:text-green-100 transition-colors text-xl"
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Main Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-medium text-green-400">KOL Payments</h3>
              </div>
              <p className="text-2xl font-bold text-green-300">
                ${breakdown.kolPayments.toLocaleString()}
              </p>
              <p className="text-sm text-green-500 mt-1">
                {kols.length} KOLs
              </p>
            </div>
            
            <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-green-400" />
                <h3 className="text-sm font-medium text-green-400">Device Costs</h3>
              </div>
              <p className="text-2xl font-bold text-green-300">
                ${breakdown.deviceCosts.toLocaleString()}
              </p>
              <p className="text-sm text-green-500 mt-1">
                {breakdown.devicesNeeded} devices needed
              </p>
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-500 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-yellow-400" />
                <h3 className="text-sm font-medium text-yellow-400">Total Budget</h3>
              </div>
              <p className="text-2xl font-bold text-yellow-300">
                ${breakdown.totalBudget.toLocaleString()}
              </p>
              <p className="text-sm text-yellow-500 mt-1">
                ${breakdown.averagePerKOL.toFixed(0)} per KOL
              </p>
            </div>
          </div>
          
          {/* Device Calculator */}
          <div className="bg-green-900/10 border border-green-500 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-300 mb-4">Device Cost Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Device Type
                </label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value as keyof typeof DEVICE_COSTS)}
                  className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                >
                  <option value="phone">Phone ($800)</option>
                  <option value="tablet">Tablet ($600)</option>
                  <option value="laptop">Laptop ($1200)</option>
                  <option value="camera">Camera ($500)</option>
                  <option value="accessories">Accessories ($100)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-green-300 mb-2">
                  Custom Device Cost (optional)
                </label>
                <input
                  type="number"
                  value={customDeviceCost || ''}
                  onChange={(e) => setCustomDeviceCost(Number(e.target.value))}
                  placeholder={`Default: $${DEVICE_COSTS[deviceType]}`}
                  className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                />
              </div>
            </div>
            
            <div className="mt-3">
              <label className="flex items-center gap-2 text-green-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShipping}
                  onChange={(e) => setIncludeShipping(e.target.checked)}
                  className="w-4 h-4 bg-black border-2 border-green-500 rounded focus:ring-green-400"
                />
                Include shipping costs ($50 per device)
              </label>
            </div>
            
            {/* Device Status Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-300">{breakdown.devicesNeeded}</div>
                <div className="text-sm text-green-400">Need to Send</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-300">{breakdown.devicesPreparing}</div>
                <div className="text-sm text-yellow-400">Preparing</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-300">{breakdown.devicesReceived}</div>
                <div className="text-sm text-blue-400">Received</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-300">{breakdown.devicesSentBefore}</div>
                <div className="text-sm text-gray-400">Sent Before</div>
              </div>
            </div>
          </div>
          
          {/* Payment Status Breakdown */}
          <div className="bg-green-900/10 border border-green-500 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-300 mb-4">Payment Status</h3>
            <div className="space-y-2">
              {Object.entries(paymentGroups).map(([status, data]) => (
                <div key={status} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      status === 'paid' ? 'bg-green-900/50 text-green-300' :
                      status === 'approved' ? 'bg-blue-900/50 text-blue-300' :
                      status === 'rejected' ? 'bg-red-900/50 text-red-300' :
                      status === 'revision' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-900/50 text-gray-300'
                    }`}>
                      {status}
                    </span>
                    <span className="text-sm text-green-400">{data.count} KOLs</span>
                  </div>
                  <span className="text-green-300 font-medium">
                    ${data.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Tier Breakdown */}
          <div className="bg-green-900/10 border border-green-500 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-green-300 mb-4">Budget by Tier</h3>
            <div className="space-y-2">
              {Object.entries(tierGroups)
                .sort(([a], [b]) => {
                  const order = ['hero', 'legend', 'star', 'rising', 'micro']
                  return order.indexOf(a) - order.indexOf(b)
                })
                .map(([tier, data]) => {
                  const percentage = (data.amount / breakdown.kolPayments) * 100
                  return (
                    <div key={tier}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded ${
                            tier === 'hero' ? 'bg-yellow-900/50 text-yellow-300' :
                            tier === 'legend' ? 'bg-purple-900/50 text-purple-300' :
                            tier === 'star' ? 'bg-blue-900/50 text-blue-300' :
                            tier === 'rising' ? 'bg-green-900/50 text-green-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {tier}
                          </span>
                          <span className="text-sm text-green-400">{data.count} KOLs</span>
                        </div>
                        <span className="text-green-300 font-medium">
                          ${data.amount.toLocaleString()} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-green-900/20 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            tier === 'hero' ? 'bg-yellow-500' :
                            tier === 'legend' ? 'bg-purple-500' :
                            tier === 'star' ? 'bg-blue-500' :
                            tier === 'rising' ? 'bg-green-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
          
          {/* Efficiency Metrics */}
          {(breakdown.costPerView > 0 || breakdown.costPerEngagement > 0) && (
            <div className="bg-green-900/10 border border-green-500 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-300 mb-4">Efficiency Metrics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-green-400 mb-1">Cost per View</div>
                  <div className="text-xl font-bold text-green-300">
                    ${breakdown.costPerView.toFixed(3)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-green-400 mb-1">Cost per Engagement</div>
                  <div className="text-xl font-bold text-green-300">
                    ${breakdown.costPerEngagement.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          )}
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