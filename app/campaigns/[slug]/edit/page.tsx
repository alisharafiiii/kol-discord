'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Campaign } from '@/lib/campaign'
import type { Project } from '@/lib/project'

// Cache for projects
let projectsCache: Project[] | null = null
let projectsCacheTime = 0
// Cache for approved users
let approvedUsersCache: string[] | null = null
let approvedUsersCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default function EditCampaignPage({ params }: { params: { slug: string } }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<Campaign['status']>('active')
  const [projectBudgets, setProjectBudgets] = useState<Record<string, { usd: string; devices: string }>>({})
  const [projectDetails, setProjectDetails] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<string[]>([])
  const [teamMemberInput, setTeamMemberInput] = useState('')
  const [approvedUsers, setApprovedUsers] = useState<string[]>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const userDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        const res = await fetch(`/api/campaigns/slug/${params.slug}`)
        if (res.ok) {
          const data = await res.json()
          setCampaign(data)
          setName(data.name)
          setStartDate(data.startDate.split('T')[0])
          setEndDate(data.endDate.split('T')[0])
          setStatus(data.status)
          setProjectBudgets(data.projectBudgets || {})
          setTeamMembers(data.teamMembers || [])
        } else {
          router.push('/campaigns')
        }
      } catch (error) {
        console.error('Error fetching campaign:', error)
        router.push('/campaigns')
      } finally {
        setLoading(false)
      }
    }
    fetchCampaign()
  }, [params.slug, router])

  // Fetch project details
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
        
        const filtered = list.filter((p: Project) => campaign.projects.includes(p.id))
        setProjectDetails(filtered)
      } catch (err) {
        console.error('Error fetching projects:', err)
      }
    }
    getProjects()
  }, [campaign])

  // Fetch approved users
  useEffect(() => {
    const fetchApprovedUsers = async () => {
      // Check if cache is valid
      if (approvedUsersCache && Date.now() - approvedUsersCacheTime < CACHE_DURATION) {
        setApprovedUsers(approvedUsersCache)
        return
      }

      try {
        const res = await fetch('/api/users?approved=true')
        const data = await res.json()
        
        if (Array.isArray(data)) {
          const handles = data.map((user: any) => user.handle || user.twitterHandle?.replace('@', ''))
          const validHandles = handles.filter(Boolean)
          
          // Update cache
          approvedUsersCache = validHandles
          approvedUsersCacheTime = Date.now()
          
          setApprovedUsers(validHandles)
        }
      } catch (error) {
        console.error('Error fetching approved users:', error)
        setApprovedUsers([])
      }
    }
    
    fetchApprovedUsers()
  }, [])

  // Handle click outside for dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredUsers = approvedUsers.filter(handle => 
    handle.toLowerCase().includes(teamMemberInput.toLowerCase()) &&
    !teamMembers.includes(handle) &&
    handle !== session?.user?.name &&
    handle !== campaign?.createdBy
  )

  const addTeamMember = (handle: string) => {
    setTeamMembers(prev => [...prev, handle])
    setTeamMemberInput('')
    setShowUserDropdown(false)
  }

  const removeTeamMember = (handle: string) => {
    setTeamMembers(prev => prev.filter(h => h !== handle))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaign) return

    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          status,
          projectBudgets,
          teamMembers
        })
      })

      if (res.ok) {
        router.push(`/campaigns/${campaign.slug}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Failed to update campaign')
      }
    } catch (error) {
      console.error('Error updating campaign:', error)
      alert('Failed to update campaign')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-green-300 font-sans p-6">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">Loading campaign...</div>
        </div>
      </div>
    )
  }

  if (!campaign) return null

  const isOwner = session?.user?.name === campaign.createdBy
  const isTeamMember = campaign.teamMembers.includes(session?.user?.name || '')
  const canEdit = isOwner || isTeamMember

  if (!canEdit) {
    router.push(`/campaigns/${campaign.slug}`)
    return null
  }

  return (
    <div className="min-h-screen bg-black text-green-300 font-sans p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">EDIT CAMPAIGN</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase mb-2">Campaign Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-green-300 text-green-300 focus:outline-none focus:border-green-400"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300 focus:outline-none focus:border-green-400"
                required
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300 focus:outline-none focus:border-green-400"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Campaign['status'])}
              className="w-full px-3 py-2 bg-black border border-green-300 text-green-300 focus:outline-none focus:border-green-400"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Team Members - Only show for campaign owner */}
          {isOwner && (
            <div>
              <label className="block text-xs uppercase mb-2">Team Members</label>
              <div className="relative" ref={userDropdownRef}>
                <input
                  type="text"
                  value={teamMemberInput}
                  onChange={(e) => setTeamMemberInput(e.target.value)}
                  onFocus={() => setShowUserDropdown(true)}
                  placeholder="Search approved users..."
                  className="w-full px-3 py-2 bg-black border border-green-300 text-green-300 focus:outline-none focus:border-green-400"
                />
                {showUserDropdown && teamMemberInput && (
                  <div className="absolute top-full left-0 right-0 bg-black border border-green-300 max-h-48 overflow-y-auto z-20 mt-1">
                    {filteredUsers.length === 0 ? (
                      <div className="p-2 text-gray-500 text-sm">No users found</div>
                    ) : (
                      filteredUsers.map(handle => (
                        <div
                          key={handle}
                          onClick={() => addTeamMember(handle)}
                          className="p-2 cursor-pointer hover:bg-green-900"
                        >
                          @{handle}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              {teamMembers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {teamMembers.map(handle => (
                    <span
                      key={handle}
                      className="px-2 py-1 bg-green-900 border border-green-300 text-xs flex items-center gap-2"
                    >
                      <img
                        src={`https://unavatar.io/twitter/${handle}`}
                        alt={handle}
                        className="w-5 h-5 rounded-full"
                      />
                      @{handle}
                      <button
                        type="button"
                        onClick={() => removeTeamMember(handle)}
                        className="ml-1 text-red-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project Budgets */}
          {projectDetails.length > 0 && (
            <div>
              <label className="block text-xs uppercase mb-2">Project Budgets</label>
              <div className="space-y-4">
                {projectDetails.map(project => {
                  const budget = projectBudgets[project.id] || { usd: '', devices: '' }
                  return (
                    <div key={project.id} className="border border-green-700 p-3 rounded">
                      <div className="font-bold text-sm mb-2">{project.twitterHandle}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs uppercase mb-1">Budget (USD)</label>
                          <input
                            type="number"
                            value={budget.usd}
                            onChange={e => setProjectBudgets(prev => ({ 
                              ...prev, 
                              [project.id]: { ...budget, usd: e.target.value } 
                            }))}
                            className="w-full px-2 py-1 bg-black border border-green-300 text-green-300 text-sm focus:outline-none focus:border-green-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase mb-1">Devices (model & qty)</label>
                          <input
                            type="text"
                            value={budget.devices}
                            onChange={e => setProjectBudgets(prev => ({ 
                              ...prev, 
                              [project.id]: { ...budget, devices: e.target.value } 
                            }))}
                            placeholder="e.g. iPhone 15 x2"
                            className="w-full px-2 py-1 bg-black border border-green-300 text-green-300 text-sm focus:outline-none focus:border-green-400"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-green-900 border border-green-300 hover:bg-green-800 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/campaigns/${campaign.slug}`)}
              className="px-4 py-2 border border-green-300 hover:bg-green-900"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 