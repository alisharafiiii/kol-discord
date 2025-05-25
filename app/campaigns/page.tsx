'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import CampaignModal from '@/components/CampaignModal'
import CampaignCard from '@/components/CampaignCard'
import type { Campaign } from '@/lib/campaign'

export default function CampaignsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<Campaign['status'] | 'all'>('all')
  const [isApproved, setIsApproved] = useState<boolean | null>(null)

  // Fetch campaigns
  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const url = activeTab === 'my' ? '/api/campaigns?user=true' : '/api/campaigns'
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setCampaigns(data)
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaigns()
  }, [activeTab])

  // Check approval status once session available
  useEffect(() => {
    if (!session) return
    if (isApproved !== null) return

    const handle = (session as any)?.twitterHandle || session.user?.name || ''
    if (!handle) return

    const normalized = encodeURIComponent(handle.replace('@',''))

    ;(async () => {
      try {
        const res = await fetch(`/api/user/profile?handle=${normalized}`)
        const data = await res.json()
        if (data.user?.approvalStatus === 'approved') {
          setIsApproved(true)
        } else {
          setIsApproved(false)
          router.replace('/access-denied')
        }
      } catch {
        setIsApproved(false)
        router.replace('/access-denied')
      }
    })()
  }, [session, isApproved, router])

  // Filter campaigns based on search and status
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.createdBy.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleCampaignCreated = (campaign: Campaign) => {
    setCampaigns(prev => [campaign, ...prev])
    setShowModal(false)
  }

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to delete campaign')
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      alert('Failed to delete campaign')
    }
  }

  if (isApproved === false) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-green-300 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-xl md:text-2xl font-bold">CAMPAIGN MANAGEMENT</h1>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/scout')}
              className="px-3 py-1.5 md:px-4 md:py-2 border border-green-300 hover:bg-green-900 text-sm md:text-base"
            >
              Scout Projects
            </button>
            {session?.user && (
              <button
                onClick={() => setShowModal(true)}
                className="px-3 py-1.5 md:px-4 md:py-2 bg-green-900 border border-green-300 hover:bg-green-800 text-sm md:text-base"
              >
                + New Campaign
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 md:gap-4 mb-4 md:mb-6">
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 md:px-4 md:py-2 border text-sm md:text-base ${
              activeTab === 'my' 
                ? 'border-green-300 bg-green-900' 
                : 'border-gray-600 hover:border-green-300'
            }`}
          >
            My Campaigns
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 md:px-4 md:py-2 border text-sm md:text-base ${
              activeTab === 'all' 
                ? 'border-green-300 bg-green-900' 
                : 'border-gray-600 hover:border-green-300'
            }`}
          >
            All Campaigns
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 md:mb-6 flex flex-col sm:flex-row gap-2 md:gap-4">
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-1.5 md:px-4 md:py-2 bg-black border border-green-300 text-green-300 placeholder-green-700 text-sm md:text-base"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Campaign['status'] | 'all')}
            className="px-3 py-1.5 md:px-4 md:py-2 bg-black border border-green-300 text-green-300 text-sm md:text-base"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Campaigns Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-pulse">Loading campaigns...</div>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No campaigns found</p>
            {session?.user && activeTab === 'my' && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-3 py-1.5 md:px-4 md:py-2 border border-green-300 hover:bg-green-900 text-sm md:text-base"
              >
                Create your first campaign
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
            {filteredCampaigns.map(campaign => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onDelete={handleDeleteCampaign}
                currentUser={session?.user?.name || undefined}
              />
            ))}
          </div>
        )}

        {/* Campaign Modal */}
        {showModal && (
          <CampaignModal
            onClose={() => setShowModal(false)}
            onCampaignCreated={handleCampaignCreated}
          />
        )}
      </div>
    </div>
  )
} 