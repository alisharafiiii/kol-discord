'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

interface MetricEntry {
  id: string
  platform: string
  url: string
  authorName: string
  authorPfp: string
  likes: number
  shares: number
  comments: number
  impressions: number
  keyHighlights: string
  screenshots: string[]
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

interface MetricsCampaign {
  id: string
  name: string
  highlights: string[]
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

const PLATFORMS = [
  { value: 'twitter', label: '𝕏 (Twitter)', emoji: '𝕏' },
  { value: 'instagram', label: 'Instagram', emoji: '📷' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'twitch', label: 'Twitch', emoji: '🎮' },
  { value: 'youtube', label: 'YouTube', emoji: '📺' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'telegram', label: 'Telegram', emoji: '📨' },
  { value: 'discord', label: 'Discord', emoji: '💬' },
  { value: 'other', label: 'Other', emoji: '🌐' }
]

export default function MetricsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [campaigns, setCampaigns] = useState<MetricsCampaign[]>([])
  const [campaignStats, setCampaignStats] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState(false)
  
  // Campaign form states
  const [campaignName, setCampaignName] = useState('')

  // Check permissions - TEMPORARILY DISABLED FOR TESTING
  const canEdit = true // session?.user?.role === 'admin' || session?.user?.role === 'core'
  const canView = true // ['admin', 'core', 'hunter', 'kol', 'brand_mod', 'brand_hunter'].includes(session?.user?.role || '')

  // Fetch all campaigns on mount
  useEffect(() => {
    // TEMPORARILY DISABLED AUTH CHECK FOR TESTING
    // if (status === 'loading') return
    
    // if (!session || !canView) {
    //   router.push('/access-denied')
    //   return
    // }
    
    fetchAllCampaigns()
  }, []) // Removed session, status, canView dependencies for testing

  const fetchAllCampaigns = async () => {
    try {
      const res = await fetch('/api/metrics/campaigns')
      if (res.ok) {
        const data = await res.json()
        console.log('Fetched campaigns:', data.campaigns)
        setCampaigns(data.campaigns || [])
        
        // Fetch stats for each campaign
        for (const campaign of data.campaigns || []) {
          fetchCampaignStats(campaign.id)
        }
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCampaignStats = async (campaignId: string) => {
    try {
      const res = await fetch(`/api/metrics?campaign=${campaignId}`)
      if (res.ok) {
        const data = await res.json()
        const entries = data.entries || []
        
        // Calculate totals
        const totals = entries.reduce((acc: any, entry: MetricEntry) => ({
          likes: acc.likes + entry.likes,
          shares: acc.shares + entry.shares,
          comments: acc.comments + entry.comments,
          impressions: acc.impressions + entry.impressions,
          postCount: acc.postCount + 1
        }), { likes: 0, shares: 0, comments: 0, impressions: 0, postCount: 0 })
        
        setCampaignStats(prev => ({ ...prev, [campaignId]: totals }))
      }
    } catch (error) {
      console.error('Error fetching campaign stats:', error)
    }
  }

  const handleSaveCampaign = async () => {
    try {
      const newCampaignId = `campaign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const res = await fetch('/api/metrics/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newCampaignId,
          name: campaignName,
          highlights: [] // No highlights during creation
        })
      })

      if (res.ok) {
        setEditingCampaign(false)
        setCampaignName('')
        await fetchAllCampaigns() // Refresh the campaigns list
        alert('Campaign created successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to create campaign: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert('Failed to save campaign')
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl animate-pulse">Loading metrics...</div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Campaign Metrics</h1>
          <p className="text-lg text-gray-600">Track and analyze your social media campaign performance</p>
          
          {canEdit && (
            <button
              onClick={() => setEditingCampaign(true)}
              className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg transform transition-all hover:scale-105"
            >
              Create New Campaign
            </button>
          )}
        </div>

        {/* Campaign Creation Form */}
        {editingCampaign && canEdit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-xl p-8 max-w-lg w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Create New Campaign</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Enter campaign name..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleSaveCampaign}
                    disabled={!campaignName.trim()}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Create Campaign
                  </button>
                  <button
                    onClick={() => {
                      setEditingCampaign(false)
                      setCampaignName('')
                    }}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Cards */}
        {campaigns.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 text-lg">No campaigns created yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const stats = campaignStats[campaign.id] || { likes: 0, shares: 0, comments: 0, impressions: 0, postCount: 0 }
              
              return (
                <div
                  key={campaign.id}
                  onClick={() => {
                    // Use window.location for navigation to avoid port mismatch issues
                    window.location.href = `/metrics/${campaign.id}`
                  }}
                  className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer p-6 transform hover:scale-105 transition-transform block"
                >
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{campaign.name}</h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">{new Date(campaign.createdAt).toLocaleDateString()}</p>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-1">
                      <div className="text-center p-1 bg-gray-50 rounded">
                        <p className="text-sm font-bold text-blue-600">{formatNumber(stats.likes)}</p>
                        <p className="text-xs text-gray-600">Likes</p>
                      </div>
                      <div className="text-center p-1 bg-gray-50 rounded">
                        <p className="text-sm font-bold text-green-600">{formatNumber(stats.shares)}</p>
                        <p className="text-xs text-gray-600">Shares</p>
                      </div>
                      <div className="text-center p-1 bg-gray-50 rounded">
                        <p className="text-sm font-bold text-purple-600">{formatNumber(stats.comments)}</p>
                        <p className="text-xs text-gray-600">Comments</p>
                      </div>
                      <div className="text-center p-1 bg-gray-50 rounded">
                        <p className="text-sm font-bold text-orange-600">{formatNumber(stats.impressions)}</p>
                        <p className="text-xs text-gray-600">Impressions</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">{stats.postCount} posts tracked</span>
                    <span className="text-sm text-blue-600 font-medium">View Details →</span>
                  </div>
                  
                  {campaign.highlights && campaign.highlights.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">HIGHLIGHTS</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {campaign.highlights.slice(0, 2).map((highlight, idx) => (
                          <li key={idx} className="truncate">
                            • {typeof highlight === 'string' ? highlight : highlight.text}
                          </li>
                        ))}
                        {campaign.highlights.length > 2 && (
                          <li className="text-gray-500">+{campaign.highlights.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
} 