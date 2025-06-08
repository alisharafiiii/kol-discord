'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { getCampaignBySlug } from '@/lib/campaign'
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

export default function CampaignPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddKOL, setShowAddKOL] = useState(false)
  const [showCharts, setShowCharts] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [projectDetails, setProjectDetails] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/campaigns/slug/${params.slug}`)
      if (res.ok) {
        const data = await res.json()
        setCampaign(data)
      } else if (res.status === 404) {
        router.push('/campaigns')
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
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
      if (!campaign || campaign.projects.length === 0) {
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
        const filtered = list.filter((p: Project) => campaign.projects.includes(p.id))
        setProjectDetails(filtered)
      } catch (err) {
        console.error('Error fetching projects for campaign page:', err)
      }
    }
    getProjects()
  }, [campaign])

  const isOwner = session?.user?.name === campaign?.createdBy
  const isTeamMember = campaign?.teamMembers.includes(session?.user?.name || '')
  const canEdit = !!(isOwner || isTeamMember)

  const handleKOLUpdate = async (kolId: string, updates: Partial<KOL>) => {
    if (!campaign || !canEdit) return

    try {
      const res = await fetch(`/api/campaigns/${campaign.id}/kols`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kolId, ...updates })
      })

      if (res.ok) {
        const updatedCampaign = await res.json()
        setCampaign(updatedCampaign)
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
        const updatedCampaign = await res.json()
        setCampaign(updatedCampaign)
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
        const updatedCampaign = await res.json()
        setCampaign(updatedCampaign)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-green-300 font-sans p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">Loading campaign...</div>
        </div>
      </div>
    )
  }

  if (!campaign) {
    return null
  }

  return (
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
                <div>Created by: {campaign.createdBy.startsWith('@') ? campaign.createdBy : `@${campaign.createdBy}`}</div>
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
                <button
                  onClick={() => router.push(`/campaigns/${campaign.slug}/kols`)}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-blue-900 border border-blue-300 hover:bg-blue-800 text-blue-300 text-sm md:text-base"
                >
                  👥 KOL Manager
                </button>
                <button
                  onClick={() => setShowAddKOL(true)}
                  className="px-3 py-1.5 md:px-4 md:py-2 bg-green-900 border border-green-300 hover:bg-green-800 text-sm md:text-base"
                >
                  + Add KOL
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-3 py-1.5 md:px-4 md:py-2 border border-green-300 hover:bg-green-900 text-sm md:text-base"
                >
                  Edit Campaign
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Team Members */}
        {campaign.teamMembers.length > 0 && (
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

        {/* KOL Table */}
        <div className="overflow-x-auto">
          <h3 className="text-xs md:text-sm uppercase mb-4">KOLs ({campaign.kols.length})</h3>
          <KOLTable
            kols={campaign.kols}
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
        {showCharts && campaign.kols.length > 0 && (
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
  )
} 