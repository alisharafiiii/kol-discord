'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Campaign, KOL } from '@/lib/campaign'
import type { Project } from '@/lib/project'
import KOLTable from '@/components/KOLTable'
import AddKOLModal from '@/components/AddKOLModal'
import CampaignCharts from '@/components/CampaignCharts'
import CampaignBrief from '@/components/CampaignBrief'
import EditCampaignModal from '@/components/EditCampaignModal'

// Cache for projects to avoid repeated fetches
let projectsCache: Project[] | null = null
let projectsCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-black text-green-300 font-sans p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-green-900 rounded w-1/4"></div>
          <div className="h-20 bg-green-900 rounded"></div>
          <div className="h-40 bg-green-900 rounded"></div>
          <div className="h-60 bg-green-900 rounded"></div>
        </div>
      </div>
    </div>
  )
}

export default function CampaignPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddKOL, setShowAddKOL] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [projectDetails, setProjectDetails] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [syncing, setSyncing] = useState(false)

  const fetchCampaign = async () => {
    try {
      setError(null)
      const res = await fetch(`/api/campaigns/slug/${params.slug}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data)
      } else if (res.status === 404) {
        setError('Campaign not found')
        setTimeout(() => router.push('/campaigns'), 2000)
      } else {
        setError('Failed to load campaign')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
      setError('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCampaign()
  }, [params.slug])

  // Fetch project details with caching
  useEffect(() => {
    const getProjects = async () => {
      if (!campaign || !campaign.projects || campaign.projects.length === 0) {
        setProjectDetails([])
        return
      }
      
      try {
        let list: Project[] = []
        
        // Check if cache is valid
        if (projectsCache && Date.now() - projectsCacheTime < CACHE_DURATION) {
          list = projectsCache
        } else {
          // Fetch fresh data
          const res = await fetch('/api/projects/all')
          const data = await res.json()
          list = Array.isArray(data) ? data : data?.projects || []
          
          // Update cache
          projectsCache = list
          projectsCacheTime = Date.now()
        }
        
        setAllProjects(list)
        const filtered = list.filter((p: Project) => campaign.projects?.includes(p.id))
        setProjectDetails(filtered)
      } catch (err) {
        console.error('Error fetching projects for campaign page:', err)
      }
    }
    getProjects()
  }, [campaign])

  const isOwner = session?.user?.name === campaign?.createdBy
  const isTeamMember = campaign?.teamMembers?.includes(session?.user?.name || '') || false
  const userRole = (session as any)?.role || (session as any)?.user?.role || 'user'
  const canEditByRole = ['admin', 'core', 'team'].includes(userRole)
  const canEdit = !!(isOwner || isTeamMember || canEditByRole)
  const canManage = ['admin', 'core'].includes(userRole)

  const handleKOLUpdate = async (kolId: string, updates: Partial<KOL>) => {
    if (!campaign || !canEdit) return

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/kols`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kolId, ...updates })
      })

      if (res.ok) {
        await fetchCampaign()
      }
    } catch (error) {
      console.error('Error updating KOL:', error)
    }
  }

  const handleKOLDelete = async (kolId: string) => {
    if (!campaign || !canEdit) return
    if (!confirm('Are you sure you want to remove this KOL?')) return

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/kols`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kolId })
      })

      if (res.ok) {
        await fetchCampaign()
      }
    } catch (error) {
      console.error('Error removing KOL:', error)
    }
  }

  const handleKOLAdd = async (kol: Omit<KOL, 'id' | 'lastUpdated'>) => {
    if (!campaign) return

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/kols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kol)
      })

      if (res.ok) {
        await fetchCampaign()
        setShowAddKOL(false)
      }
    } catch (error) {
      console.error('Error adding KOL:', error)
    }
  }

  const handleCampaignUpdate = async (updates: Partial<Campaign>) => {
    if (!campaign) return

    const res = await fetch(`/api/campaigns/${campaign.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })

    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to update campaign')
    }

    const updatedCampaign = await res.json()
    setCampaign(updatedCampaign)
    
    // Refresh project details if projects were updated
    if (updates.projects) {
      const filtered = allProjects.filter((p: Project) => updates.projects!.includes(p.id))
      setProjectDetails(filtered)
    }
  }

  const syncTweets = async () => {
    if (!campaign) return
    
    setSyncing(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/sync-tweets`, {
        method: 'POST'
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to sync tweets')
      }
      
      const data = await res.json()
      const result = data.result || data // Handle both nested and direct result
      
      // Reload campaign to show updated metrics
      await fetchCampaign()
      
      // Show appropriate message based on result
      if (result.synced === 0 && !result.rateLimited) {
        alert('No tweets with links found to sync')
      } else {
        alert(`Synced ${result.synced || 0} tweets, ${result.failed || 0} failed${result.rateLimited ? ' (rate limited)' : ''}`)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to sync tweets')
    } finally {
      setSyncing(false)
    }
  }

  // Show loading skeleton while data is being fetched
  if (loading) {
    return <LoadingSkeleton />
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-green-300 font-sans p-6">
        <div className="max-w-7xl mx-auto text-center py-20">
          <h2 className="text-xl mb-4">{error}</h2>
          <p className="text-gray-400">Redirecting to campaigns page...</p>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <div className="min-h-screen bg-black text-green-300 font-sans p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <button
              onClick={() => router.push('/campaigns')}
              className="text-xs mb-4 hover:text-green-400"
            >
              ← Back to campaigns
            </button>
            
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold mb-2">{campaign.name}</h1>
                <div className="text-xs md:text-sm space-y-1">
                  <div>Status: <span className="text-green-400">{campaign.status}</span></div>
                  <div>Period: {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}</div>
                  <div>Created by: {campaign.createdBy}</div>
                </div>
              </div>
              
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => router.push(`/campaigns/${campaign.slug}/analytics`)}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-purple-900 border border-purple-300 hover:bg-purple-800 text-purple-300 text-sm md:text-base"
                  >
                    📊 Analytics
                  </button>
                  {campaign.kols && campaign.kols.length > 0 && (
                    <button
                      onClick={() => setShowCharts(true)}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-purple-900 border border-purple-300 hover:bg-purple-800 text-purple-300 text-sm md:text-base"
                    >
                      📈 View Charts
                    </button>
                  )}
                  <button
                    onClick={syncTweets}
                    disabled={syncing}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-900 border border-blue-300 hover:bg-blue-800 text-blue-300 text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncing ? '🔄 Syncing...' : '🔄 Sync Tweets'}
                  </button>
                  <button
                    onClick={() => setShowAddKOL(true)}
                    className="px-3 py-1.5 md:px-4 md:py-2 bg-green-900 border border-green-300 hover:bg-green-800 text-sm md:text-base"
                  >
                    + Add KOL
                  </button>
                  {canManage && (
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-3 py-1.5 md:px-4 md:py-2 border border-green-300 hover:bg-green-900 text-sm md:text-base"
                    >
                      Edit Campaign
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Team Members */}
          {campaign.teamMembers && campaign.teamMembers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs md:text-sm uppercase mb-2">Team Members</h3>
              <div className="flex flex-wrap gap-2 md:gap-4">
                {campaign.teamMembers.map(member => (
                  <div key={member} className="flex items-center gap-2 px-2 py-1 bg-green-900 border border-green-300 text-xs rounded">
                    <img
                      src={`https://unavatar.io/twitter/${member}`}
                      alt={member}
                      className="w-5 h-5 md:w-6 md:h-6 rounded-full"
                      loading="lazy"
                    />
                    <span>@{member}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projectDetails.length > 0 && (
            <div className="mb-6 md:mb-8 font-sans">
              <h3 className="text-xs uppercase mb-4 text-gray-400">Project Assigned ({projectDetails.length})</h3>
              <div className="flex flex-wrap gap-4 md:gap-6">
                {projectDetails.map(project => (
                  <div key={project.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-900 border border-gray-600 rounded-lg">
                    <img
                      src={project.profileImageUrl || `https://unavatar.io/twitter/${project.twitterHandle}`}
                      alt={project.twitterHandle}
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover"
                      loading="lazy"
                    />
                    <div>
                      <div className="text-base md:text-lg font-bold">@{project.twitterHandle.replace('@', '')}</div>
                      {project.notes && (
                        <div className="text-xs md:text-sm text-gray-400 mt-1">{project.notes}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Campaign Brief */}
          <div className="mb-6 md:mb-8">
            <CampaignBrief
              brief={campaign.brief}
              briefUpdatedAt={campaign.briefUpdatedAt}
              briefUpdatedBy={campaign.briefUpdatedBy}
            />
          </div>

          {/* Campaign Stats */}
          {campaign.kols && campaign.kols.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-xs font-medium text-green-400 mb-1 uppercase">Total Budget</h3>
                <p className="text-xl md:text-2xl font-bold text-green-300">
                  ${campaign.kols.reduce((sum, kol) => {
                    const budgetNum = typeof kol.budget === 'number' 
                      ? kol.budget 
                      : parseFloat(kol.budget.replace(/[^0-9.-]+/g, '')) || 0
                    return sum + budgetNum
                  }, 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-xs font-medium text-green-400 mb-1 uppercase">Total Views</h3>
                <p className="text-xl md:text-2xl font-bold text-green-300">
                  {campaign.kols.reduce((sum, kol) => sum + (kol.views || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-xs font-medium text-green-400 mb-1 uppercase">Engagement</h3>
                <p className="text-xl md:text-2xl font-bold text-green-300">
                  {campaign.kols.reduce((sum, kol) => sum + ((kol.likes || 0) + (kol.retweets || 0) + (kol.comments || 0)), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-green-900/20 border border-green-500 rounded-lg p-4">
                <h3 className="text-xs font-medium text-green-400 mb-1 uppercase">Avg Eng. Rate</h3>
                <p className="text-xl md:text-2xl font-bold text-green-300">
                  {(() => {
                    const totalViews = campaign.kols.reduce((sum, kol) => sum + (kol.views || 0), 0)
                    const totalEngagement = campaign.kols.reduce((sum, kol) => sum + ((kol.likes || 0) + (kol.retweets || 0) + (kol.comments || 0)), 0)
                    return totalViews > 0 ? ((totalEngagement / totalViews) * 100).toFixed(2) : '0'
                  })()}%
                </p>
              </div>
            </div>
          )}

          {/* KOL Table */}
          <div className="overflow-x-auto">
            <h3 className="text-xs md:text-sm uppercase mb-4">KOLs ({campaign.kols?.length || 0})</h3>
            <KOLTable
              kols={campaign.kols || []}
              onUpdate={handleKOLUpdate}
              onDelete={handleKOLDelete}
              canEdit={canEdit}
            />
          </div>

          {/* Add KOL Modal */}
          {showAddKOL && (
            <AddKOLModal
              campaignId={campaign.id}
              campaignName={campaign.name}
              onClose={() => setShowAddKOL(false)}
              onKOLAdded={() => {
                setShowAddKOL(false)
                fetchCampaign() // Refresh campaign data
              }}
            />
          )}

          {/* Campaign Charts Modal */}
          {showCharts && campaign.kols && campaign.kols.length > 0 && (
            <CampaignCharts
              kols={campaign.kols}
              onClose={() => setShowCharts(false)}
            />
          )}

          {/* Edit Campaign Modal */}
          {showEditModal && (
            <EditCampaignModal
              campaign={campaign}
              projects={allProjects}
              onClose={() => setShowEditModal(false)}
              onSave={handleCampaignUpdate}
            />
          )}
        </div>
      </div>
    </Suspense>
  )
} 