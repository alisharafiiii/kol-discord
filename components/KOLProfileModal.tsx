'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

interface KOLProfileModalProps {
  kolHandle: string
  kolName: string
  isOpen: boolean
  onClose: () => void
}

interface CampaignParticipation {
  id: string
  name: string
  slug: string
  stage: string
  payment: string
  views: number
  budget: string
  device: string
  platform?: string[]
  links?: string[]
  addedBy?: string
  lastUpdated?: string
}

interface KOLProfile {
  handle: string
  name: string
  pfp?: string
  role?: string
  tier?: string
  status?: string
  email?: string
  phone?: string
  telegram?: string
  telegramGroup?: string
  shippingAddress?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    postalCode?: string
    country?: string
  }
  campaigns: CampaignParticipation[]
  notes?: Array<{
    id?: string
    authorId: string
    authorName: string
    authorImage?: string
    content?: string
    text?: string
    createdAt?: string | Date
    campaignId?: string
    campaignName?: string
    campaignSlug?: string
  }>
  addedBy?: string
  totalViews?: number
  totalBudget?: number
  joinDate?: string
}

export default function KOLProfileModal({ kolHandle, kolName, isOpen, onClose }: KOLProfileModalProps) {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<KOLProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [selectedCampaignForNote, setSelectedCampaignForNote] = useState<string>('')
  const [isEditing, setIsEditing] = useState(false)
  const [editedProfile, setEditedProfile] = useState<any>(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [hasUserAccount, setHasUserAccount] = useState(false)
  
  const userRole = (session as any)?.role || (session as any)?.user?.role || 'user'
  const canAddNotes = ['admin', 'core'].includes(userRole)
  const canEdit = ['admin', 'core'].includes(userRole)
  
  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen, kolHandle])
  
  const loadProfile = async () => {
    if (!kolHandle) return
    
    setLoading(true)
    setError(null)
    
    try {
      const cleanHandle = kolHandle.replace('@', '')
      
      // Check if user exists in the system
      const profileRes = await fetch(`/api/user/profile?handle=${cleanHandle}`)
      const profileCheckData = await profileRes.json()
      
      // Check if this is a real user account or just a default response
      const userExists = profileCheckData.user && 
                        profileCheckData.user.id && 
                        profileCheckData.user.id !== cleanHandle.substring(0, 8) &&
                        profileCheckData.user.approvalStatus
      setHasUserAccount(userExists)
      
      // Fetch KOL data from all campaigns
      const campaignsRes = await fetch('/api/campaigns')
      const campaigns = await campaignsRes.json()
      
      // Find all campaigns where this KOL participates
      const kolCampaigns: CampaignParticipation[] = []
      let totalViews = 0
      let totalBudget = 0
      let kolInfo: Partial<KOLProfile> = {
        handle: kolHandle,
        name: kolName
      }
      
      campaigns.forEach((campaign: any) => {
        const kol = campaign.kols?.find((k: any) => 
          k.handle?.toLowerCase() === kolHandle.toLowerCase() ||
          k.kolHandle?.toLowerCase() === kolHandle.toLowerCase()
        )
        
        if (kol) {
          // Extract KOL info from first found instance
          if (!kolInfo.pfp && (kol.pfp || kol.kolImage)) {
            kolInfo.pfp = kol.pfp || kol.kolImage
          }
          if (!kolInfo.tier && kol.tier) {
            kolInfo.tier = kol.tier
          }
          
          const views = kol.views || kol.totalViews || 0
          const budget = typeof kol.budget === 'string' 
            ? parseInt(kol.budget.replace(/[^0-9]/g, '')) || 0
            : kol.budget || 0
          
          totalViews += views
          totalBudget += budget
          
          kolCampaigns.push({
            id: campaign.id,
            name: campaign.name,
            slug: campaign.slug,
            stage: kol.stage || 'reached out',
            payment: kol.payment || kol.paymentStatus || 'pending',
            views: views,
            budget: typeof kol.budget === 'string' ? kol.budget : `$${budget}`,
            device: kol.device || kol.deviceStatus || 'na',
            platform: kol.platform || ['twitter'],
            links: kol.links || [],
            addedBy: kol.addedBy,
            lastUpdated: kol.lastUpdated
          })
        }
      })
      
      // Try to get additional profile data from user profile
      let profileData = null
      try {
        console.log('Fetching profile for handle:', cleanHandle)
        
        if (userExists) {
          profileData = profileCheckData
          console.log('KOL Profile Data for', cleanHandle, ':', {
            hasUser: !!profileData.user,
            userData: profileData.user
          })
        }
      } catch (err) {
        console.error('Error fetching user profile:', err)
      }
      
      // Parse contact information from KOL data
      let parsedEmail = profileData?.user?.email
      let parsedTelegram = profileData?.user?.telegram || profileData?.user?.contacts?.telegram
      let parsedPhone = profileData?.user?.phone || profileData?.user?.phoneNumber || profileData?.user?.shippingInfo?.phone || profileData?.user?.contacts?.phone
      
      // Parse contact field which can contain multiple values
      // Only use this as fallback if we don't already have the data from the API
      if (kolInfo.pfp) {
        const contacts = kolInfo.pfp.split(',').map((c: string) => c.trim())
        contacts.forEach((contact: string) => {
          if (contact.includes('@') && contact.includes('.')) {
            // It's an email - only use if we don't have one
            parsedEmail = parsedEmail || contact
          } else if (contact.startsWith('@')) {
            // It's a telegram handle - only use if we don't have one
            parsedTelegram = parsedTelegram || contact
          } else if (contact.includes('t.me')) {
            // It's a telegram link - only use if we don't have one
            if (!parsedTelegram) {
              parsedTelegram = `@${contact.split('/').pop()}`
            }
          } else if (/^\+?[\d\s\-()]+$/.test(contact)) {
            // It's a phone number - only use if we don't have one
            parsedPhone = parsedPhone || contact
          }
        })
      }
      
      // Check for adminNotes in the old format
      let notes = profileData?.user?.notes || []
      
      // If no notes in the new format, check if adminNotes exists and convert it
      if ((!notes || notes.length === 0) && profileData?.user?.adminNotes) {
        console.log('Found adminNotes, converting to new format:', profileData.user.adminNotes)
        // Convert adminNotes string to notes array format
        const adminNotesText = profileData.user.adminNotes
        
        // Updated parsing logic to handle the actual format:
        // @username
        // •
        // date
        // content
        const noteSections = adminNotesText.split(/(?=@\w+\s*\n)/g).filter((section: string) => section.trim())
        
        notes = noteSections.map((section: string, index: number) => {
          const lines = section.split('\n').map((line: string) => line.trim()).filter(Boolean)
          
          if (lines.length >= 3) {
            // Extract username (remove @ if present)
            const author = lines[0].replace('@', '')
            
            // Find the date line (skip bullet lines)
            let dateLineIndex = 1
            while (dateLineIndex < lines.length && lines[dateLineIndex] === '•') {
              dateLineIndex++
            }
            
            const dateStr = lines[dateLineIndex] || ''
            // Everything after the date is content
            const content = lines.slice(dateLineIndex + 1).join(' ')
            
            return {
              id: `admin-note-${index}`,
              authorId: author,
              authorName: author,
              content: content,
              createdAt: dateStr,
              text: content // fallback field
            }
          }
          
          // Fallback for unstructured notes
          return {
            id: `admin-note-${index}`,
            authorId: 'admin',
            authorName: 'Admin',
            content: section.trim(),
            createdAt: profileData.user.updatedAt || profileData.user.createdAt,
            text: section.trim()
          }
        })
        
        console.log('Parsed adminNotes into:', notes)
      }
      
      setProfile({
        handle: kolHandle,
        name: profileData?.user?.name || kolName,
        pfp: kolInfo.pfp,
        role: profileData?.user?.role || 'kol',
        tier: kolInfo.tier,
        status: profileData?.user?.device || 'na',
        email: parsedEmail,
        phone: parsedPhone,
        telegram: parsedTelegram,
        telegramGroup: profileData?.user?.telegramGroup,
        shippingAddress: (() => {
          // Try shippingAddress first
          if (profileData?.user?.shippingAddress) {
            return profileData.user.shippingAddress
          }
          // Try shippingInfo format
          if (profileData?.user?.shippingInfo) {
            const info = profileData.user.shippingInfo
            // Build proper address structure
            return {
              addressLine1: info.fullName || info.addressLine1,
              addressLine2: info.fullName ? info.addressLine1 : info.addressLine2,
              city: info.city,
              postalCode: info.postalCode,
              country: info.country,
            }
          }
          // Try individual fields
          if (profileData?.user?.address1 || profileData?.user?.city || profileData?.user?.country) {
            return {
              addressLine1: profileData.user.address1,
              addressLine2: profileData.user.address2,
              city: profileData.user.city,
              postalCode: profileData.user.postalCode || profileData.user.zipCode,
              country: profileData.user.country,
            }
          }
          return undefined
        })(),
        campaigns: kolCampaigns,
        notes: notes,
        addedBy: profileData?.user?.addedBy,
        totalViews: totalViews,
        totalBudget: totalBudget,
        joinDate: profileData?.user?.createdAt || profileData?.user?.joinDate,
      })
      
      // No need to load notes separately - they're already in the profile data from the API
      // But we need to enrich them with campaign names if they have campaignId
      if (notes && notes.length > 0) {
        const enrichedNotes = notes.map((note: any) => {
          if (note.campaignId && !note.campaignName) {
            // Find the campaign this note belongs to
            const campaign = kolCampaigns.find(p => p.id === note.campaignId)
            if (campaign) {
              return {
                ...note,
                campaignName: campaign.name,
                campaignSlug: campaign.slug
              }
            }
          }
          return note
        })
        
        setProfile(prev => prev ? { ...prev, notes: enrichedNotes } : null)
      }
    } catch (error) {
      console.error('Error loading KOL profile:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddNote = async () => {
    if (!newNote.trim() || !canAddNotes || !selectedCampaignForNote) return
    
    setAddingNote(true)
    try {
      // Find the selected campaign
      const campaign = profile?.campaigns.find(c => c.id === selectedCampaignForNote)
      if (!campaign) {
        alert('Please select a campaign')
        return
      }
      
      // Find the KOL ID in the campaign
      const campaignRes = await fetch(`/api/campaigns/slug/${campaign.slug}`)
      if (!campaignRes.ok) throw new Error('Failed to load campaign')
      const campaignData = await campaignRes.json()
      
      const kol = campaignData.kols?.find((k: any) => k.handle === profile?.handle)
      if (!kol) throw new Error('KOL not found in campaign')
      
      // Add note via API
      const res = await fetch(`/api/campaigns/${campaign.id}/kols/${kol.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote })
      })
      
      if (!res.ok) throw new Error('Failed to add note')
      
      const { note } = await res.json()
      
      // Add to local state with additional info
      setProfile(prev => prev ? {
        ...prev,
        notes: [...(prev.notes || []), {
          ...note,
          authorImage: session?.user?.image,
          campaignName: campaign.name,
          campaignSlug: campaign.slug
        }]
      } : null)
      
      setNewNote('')
      setSelectedCampaignForNote('')
      
    } catch (error) {
      console.error('Error adding note:', error)
      alert('Failed to add note. Please try again.')
    } finally {
      setAddingNote(false)
    }
  }
  
  const copyAllContactInfo = () => {
    if (!profile) return
    
    const contactInfo = []
    
    // Add name
    contactInfo.push(`Name: ${profile.name}`)
    
    // Add email
    if (profile.email) {
      contactInfo.push(`Email: ${profile.email}`)
    }
    
    // Add phone
    if (profile.phone) {
      contactInfo.push(`Phone: ${profile.phone}`)
    }
    
    // Add telegram
    if (profile.telegram) {
      contactInfo.push(`Telegram: ${profile.telegram}`)
    }
    
    // Add shipping address
    if (profile.shippingAddress) {
      const { addressLine1, addressLine2, city, postalCode, country } = profile.shippingAddress
      const addressParts = [
        addressLine1,
        addressLine2,
        [city, postalCode].filter(Boolean).join(' '),
        country
      ].filter(Boolean)
      
      if (addressParts.length > 0) {
        contactInfo.push(`Address: ${addressParts.join(', ')}`)
      }
    }
    
    const fullContactInfo = contactInfo.join('\n')
    navigator.clipboard.writeText(fullContactInfo)
    
    // Show success message
    setShowCopySuccess(true)
    setTimeout(() => {
      setShowCopySuccess(false)
    }, 2000)
  }
  
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': case 'x': return '𝕏'
      case 'instagram': return '📷'
      case 'youtube': return '▶️'
      case 'tiktok': return '🎵'
      case 'linkedin': return '💼'
      case 'twitch': return '🎮'
      default: return platform.charAt(0).toUpperCase()
    }
  }
  
  const getDeviceStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'text-green-400'
      case 'sent-before': return 'text-green-400'
      case 'on-the-way': return 'text-blue-400'
      case 'preparing': return 'text-yellow-400'
      case 'N/A': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-2 border-green-300 p-6 font-mono">
        {/* Copy Success Notification */}
        {showCopySuccess && (
          <div className="absolute top-4 right-16 bg-green-900 text-green-100 px-4 py-2 rounded shadow-lg animate-pulse">
            ✓ Contact info copied to clipboard!
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-green-300">KOL Profile</h2>
          <div className="flex items-center gap-2">
            {canEdit && !isEditing && !loading && (
              <button
                onClick={() => {
                  setIsEditing(true)
                  setEditedProfile({
                    name: profile?.name || '',
                    email: profile?.email || '',
                    phone: profile?.phone || '',
                    telegram: profile?.telegram || '',
                    addressLine1: profile?.shippingAddress?.addressLine1 || '',
                    addressLine2: profile?.shippingAddress?.addressLine2 || '',
                    city: profile?.shippingAddress?.city || '',
                    postalCode: profile?.shippingAddress?.postalCode || '',
                    country: profile?.shippingAddress?.country || ''
                  })
                }}
                className="px-3 py-1 border border-green-300 text-green-300 hover:bg-green-900 hover:text-green-100 transition-colors text-sm"
              >
                Edit Profile
              </button>
            )}
            <button
              onClick={onClose}
              className="text-green-300 hover:text-green-100 transition-colors text-2xl"
            >
              ✕
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-8 text-green-300">
            <div className="animate-pulse">Loading profile...</div>
          </div>
        ) : profile ? (
          <div className="space-y-6 text-green-300">
            {/* Profile Header */}
            <div className="flex items-start gap-4 pb-6 border-b border-green-800">
              <img
                src={profile.pfp || `https://unavatar.io/twitter/${profile.handle}`}
                alt={profile.name}
                className="w-20 h-20 rounded-full border-2 border-green-500"
              />
              <div className="flex-1">
                <h3 className="text-lg font-bold">{profile.name}</h3>
                <p className="text-green-400">{profile.handle.startsWith('@') ? profile.handle : `@${profile.handle}`}</p>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  {profile.role && (
                    <span className={`px-2 py-1 rounded ${
                      profile.role === 'admin' ? 'bg-purple-900 text-purple-300' :
                      profile.role === 'core' ? 'bg-blue-900 text-blue-300' :
                      'bg-green-900 text-green-300'
                    }`}>
                      {profile.role.toUpperCase()}
                    </span>
                  )}
                  {profile.tier && (
                    <span className={`px-2 py-1 rounded ${
                      profile.tier === 'hero' ? 'bg-purple-600 text-white' :
                      profile.tier === 'legend' ? 'bg-orange-600 text-white' :
                      profile.tier === 'star' ? 'bg-yellow-500 text-black' :
                      profile.tier === 'rising' ? 'bg-blue-500 text-white' :
                      'bg-gray-600 text-white'
                    }`}>
                      {profile.tier.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* KOL Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-green-500 pb-4 border-b border-green-800">
              {profile.addedBy && (
                <div>
                  <span className="text-gray-500">Added by:</span> {profile.addedBy}
                </div>
              )}
              {profile.joinDate && (
                <div>
                  <span className="text-gray-500">Joined:</span> {new Date(profile.joinDate).toLocaleDateString()}
                </div>
              )}
              <div>
                <span className="text-gray-500">Active Campaigns:</span> {profile.campaigns.filter(c => c.stage !== 'cancelled').length}
              </div>
              <div>
                <span className="text-gray-500">Completed Campaigns:</span> {profile.campaigns.filter(c => c.stage === 'done').length}
              </div>
            </div>
            
            {/* Profile Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pb-6 border-b border-green-800">
              <div className="bg-green-900/20 p-3 rounded border border-green-800">
                <div className="text-xs text-green-500 uppercase">Total Campaigns</div>
                <div className="text-lg font-bold">{profile.campaigns.length}</div>
              </div>
              <div className="bg-green-900/20 p-3 rounded border border-green-800">
                <div className="text-xs text-green-500 uppercase">Total Views</div>
                <div className="text-lg font-bold">
                  {profile.campaigns.reduce((sum, c) => sum + c.views, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-900/20 p-3 rounded border border-green-800">
                <div className="text-xs text-green-500 uppercase">Total Budget</div>
                <div className="text-lg font-bold">
                  ${profile.campaigns.reduce((sum, c) => {
                    const budget = c.budget.replace(/[$,]/g, '')
                    return sum + (parseFloat(budget) || 0)
                  }, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-green-900/20 p-3 rounded border border-green-800">
                <div className="text-xs text-green-500 uppercase">Avg Views</div>
                <div className="text-lg font-bold">
                  {profile.campaigns.length > 0 
                    ? Math.round(profile.campaigns.reduce((sum, c) => sum + c.views, 0) / profile.campaigns.length).toLocaleString()
                    : 0}
                </div>
              </div>
              <div className="bg-green-900/20 p-3 rounded border border-green-800">
                <div className="text-xs text-green-500 uppercase">Success Rate</div>
                <div className="text-lg font-bold">
                  {profile.campaigns.length > 0 
                    ? Math.round((profile.campaigns.filter(c => c.stage === 'done' || c.stage === 'posted').length / profile.campaigns.length) * 100)
                    : 0}%
                </div>
              </div>
            </div>
            
            {/* Active Platforms */}
            <div className="pb-4 border-b border-green-800">
              <h4 className="text-xs text-gray-500 uppercase mb-2">Active Platforms</h4>
              <div className="flex gap-2">
                {(() => {
                  const allPlatforms = new Set<string>()
                  profile.campaigns.forEach(c => {
                    c.platform?.forEach(p => allPlatforms.add(p))
                  })
                  return Array.from(allPlatforms).map(platform => (
                    <span key={platform} className="text-lg" title={platform}>
                      {getPlatformIcon(platform)}
                    </span>
                  ))
                })()}
              </div>
            </div>
            
            {/* Contact Information Box */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold uppercase">Contact Information</h4>
                {!isEditing && canEdit && (
                  <div className="flex gap-2">
                    {!hasUserAccount && (
                      <span className="text-xs text-yellow-500 px-2 py-1 border border-yellow-500 rounded">
                        No User Account
                      </span>
                    )}
                    <button
                      onClick={copyAllContactInfo}
                      className={`text-xs px-3 py-1 border transition-all duration-200 rounded ${
                        showCopySuccess 
                          ? 'border-green-400 bg-green-900 text-green-100' 
                          : 'border-green-500 hover:bg-green-900/30'
                      }`}
                      id="copy-contact-btn"
                    >
                      {showCopySuccess ? '✓ Copied!' : '📋 Copy All'}
                    </button>
                  </div>
                )}
              </div>
              
              {isEditing ? (
                <div className="bg-green-900/20 p-4 rounded border border-green-800 space-y-3">
                  {/* Edit Form */}
                  <div>
                    <label className="text-green-500 text-xs">Name</label>
                    <input
                      type="text"
                      value={editedProfile.name}
                      onChange={(e) => setEditedProfile({...editedProfile, name: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="Display name"
                    />
                  </div>
                  
                  <div>
                    <label className="text-green-500 text-xs">Email</label>
                    <input
                      type="email"
                      value={editedProfile.email}
                      onChange={(e) => setEditedProfile({...editedProfile, email: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="email@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="text-green-500 text-xs">Phone</label>
                    <input
                      type="tel"
                      value={editedProfile.phone}
                      onChange={(e) => setEditedProfile({...editedProfile, phone: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="+1234567890"
                    />
                  </div>
                  
                  <div>
                    <label className="text-green-500 text-xs">Telegram</label>
                    <input
                      type="text"
                      value={editedProfile.telegram}
                      onChange={(e) => setEditedProfile({...editedProfile, telegram: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="@username"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-green-500 text-xs">Shipping Address</label>
                    <input
                      type="text"
                      value={editedProfile.addressLine1}
                      onChange={(e) => setEditedProfile({...editedProfile, addressLine1: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="Address Line 1"
                    />
                    <input
                      type="text"
                      value={editedProfile.addressLine2}
                      onChange={(e) => setEditedProfile({...editedProfile, addressLine2: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="Address Line 2 (optional)"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={editedProfile.city}
                        onChange={(e) => setEditedProfile({...editedProfile, city: e.target.value})}
                        className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={editedProfile.postalCode}
                        onChange={(e) => setEditedProfile({...editedProfile, postalCode: e.target.value})}
                        className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                        placeholder="Postal Code"
                      />
                    </div>
                    <input
                      type="text"
                      value={editedProfile.country}
                      onChange={(e) => setEditedProfile({...editedProfile, country: e.target.value})}
                      className="w-full px-2 py-1 bg-black border border-green-600 text-green-300 text-sm focus:outline-none focus:border-green-400"
                      placeholder="Country"
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditedProfile(null)
                      }}
                      className="px-3 py-1 border border-gray-600 text-gray-300 hover:bg-gray-900 text-sm transition-colors"
                      disabled={savingProfile}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setSavingProfile(true)
                        try {
                          const cleanHandle = profile!.handle.replace('@', '')
                          
                          // First check if this user exists in the system
                          const checkRes = await fetch(`/api/user/profile?handle=${cleanHandle}`)
                          const checkData = await checkRes.json()
                          
                          // If user doesn't exist (no user ID or user not found), we can't update their profile
                          if (!checkData.user || !checkData.user.id || checkData.user.id === cleanHandle.substring(0, 8)) {
                            alert('This KOL does not have a user account in the system. Profile editing is only available for registered users.')
                            setSavingProfile(false)
                            return
                          }
                          
                          const res = await fetch(`/api/user/profile`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              handle: cleanHandle,
                              name: editedProfile.name,
                              email: editedProfile.email,
                              phone: editedProfile.phone,
                              telegram: editedProfile.telegram,
                              contacts: {
                                ...(profile as any)?.contacts,
                                telegram: editedProfile.telegram
                              },
                              shippingAddress: {
                                addressLine1: editedProfile.addressLine1,
                                addressLine2: editedProfile.addressLine2,
                                city: editedProfile.city,
                                postalCode: editedProfile.postalCode,
                                country: editedProfile.country
                              }
                            })
                          })
                          
                          if (res.ok) {
                            // Update local state
                            setProfile(prev => prev ? {
                              ...prev,
                              name: editedProfile.name,
                              email: editedProfile.email,
                              phone: editedProfile.phone,
                              telegram: editedProfile.telegram,
                              contacts: {
                                ...(prev as any)?.contacts,
                                telegram: editedProfile.telegram
                              },
                              shippingAddress: {
                                addressLine1: editedProfile.addressLine1,
                                addressLine2: editedProfile.addressLine2,
                                city: editedProfile.city,
                                postalCode: editedProfile.postalCode,
                                country: editedProfile.country
                              }
                            } : null)
                            setIsEditing(false)
                            setEditedProfile(null)
                          } else {
                            const errorData = await res.json()
                            console.error('Failed to update profile:', errorData)
                            alert(`Failed to update profile: ${errorData.error || 'Unknown error'}`)
                          }
                        } catch (error) {
                          console.error('Error updating profile:', error)
                          alert('Failed to update profile. Please try again.')
                        } finally {
                          setSavingProfile(false)
                        }
                      }}
                      className="px-3 py-1 bg-green-900 text-green-100 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
                      disabled={savingProfile}
                    >
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-green-900/20 p-4 rounded border border-green-800 space-y-2">
                  {/* View Mode */}
                  {/* Name */}
                  <div className="flex">
                    <span className="text-green-500 w-24">Name:</span>
                    <span className="flex-1">{profile.name}</span>
                  </div>
                  
                  {/* Email */}
                  <div className="flex">
                    <span className="text-green-500 w-24">Email:</span>
                    <span className="flex-1">{profile.email || 'Not provided'}</span>
                  </div>
                  
                  {/* Phone */}
                  <div className="flex">
                    <span className="text-green-500 w-24">Phone:</span>
                    <span className="flex-1">{profile.phone || 'Not provided'}</span>
                  </div>
                  
                  {/* Telegram */}
                  <div className="flex">
                    <span className="text-green-500 w-24">Telegram:</span>
                    <span className="flex-1">
                      {profile.telegram ? (
                        <a href={`https://t.me/${profile.telegram.substring(1)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          {profile.telegram}
                        </a>
                      ) : (
                        'Not provided'
                      )}
                    </span>
                  </div>
                  
                  {/* Telegram Group */}
                  {profile.telegramGroup && (
                    <div className="flex">
                      <span className="text-green-500 w-24">TG Group:</span>
                      <span className="flex-1">
                        <a href={profile.telegramGroup} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                          Group Link
                        </a>
                      </span>
                    </div>
                  )}
                  
                  {/* Address */}
                  <div className="flex">
                    <span className="text-green-500 w-24">Address:</span>
                    <span className="flex-1">
                      {profile.shippingAddress ? (
                        <div className="space-y-1">
                          {profile.shippingAddress.addressLine1 && <div>{profile.shippingAddress.addressLine1}</div>}
                          {profile.shippingAddress.addressLine2 && <div>{profile.shippingAddress.addressLine2}</div>}
                          {(profile.shippingAddress.city || profile.shippingAddress.postalCode) && (
                            <div>
                              {[profile.shippingAddress.city, profile.shippingAddress.postalCode].filter(Boolean).join(' ')}
                            </div>
                          )}
                          {profile.shippingAddress.country && <div>{profile.shippingAddress.country}</div>}
                        </div>
                      ) : (
                        'Not provided'
                      )}
                    </span>
                  </div>
                  
                  {/* Edit Button - Only show for admin/core and if user has account */}
                  {canEdit && hasUserAccount && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => {
                          setIsEditing(true)
                          setEditedProfile({
                            name: profile.name || '',
                            email: profile.email || '',
                            phone: profile.phone || '',
                            telegram: profile.telegram || '',
                            addressLine1: profile.shippingAddress?.addressLine1 || '',
                            addressLine2: profile.shippingAddress?.addressLine2 || '',
                            city: profile.shippingAddress?.city || '',
                            postalCode: profile.shippingAddress?.postalCode || '',
                            country: profile.shippingAddress?.country || ''
                          })
                        }}
                        className="text-xs px-3 py-1 border border-green-500 text-green-300 hover:bg-green-900/30 transition-colors"
                      >
                        Edit Info
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Campaign Participation */}
            <div>
              <h4 className="text-sm font-bold uppercase mb-2">Campaign Participation ({profile.campaigns.length})</h4>
              <div className="space-y-3">
                {profile.campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border border-green-500 p-4 rounded hover:bg-green-900/30 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h5 
                        className="font-bold text-sm cursor-pointer hover:text-green-400"
                        onClick={() => window.open(`/campaigns/${campaign.slug}`, '_blank')}
                      >
                        {campaign.name} →
                      </h5>
                      <div className="flex gap-2">
                        {campaign.platform?.map(p => (
                          <span key={p} className="text-xs px-2 py-1 bg-green-900 rounded">
                            {getPlatformIcon(p)}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-green-500">Stage:</span>{' '}
                        <span className={
                          campaign.stage === 'done' ? 'text-green-400' :
                          campaign.stage === 'posted' ? 'text-blue-400' :
                          campaign.stage === 'cancelled' ? 'text-red-400' :
                          'text-yellow-400'
                        }>{campaign.stage}</span>
                      </div>
                      <div>
                        <span className="text-green-500">Payment:</span>{' '}
                        <span className={
                          campaign.payment === 'paid' ? 'text-green-400' :
                          campaign.payment === 'approved' ? 'text-blue-400' :
                          'text-gray-400'
                        }>{campaign.payment}</span>
                      </div>
                      <div>
                        <span className="text-green-500">Views:</span>{' '}
                        <span>{campaign.views.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-green-500">Budget:</span>{' '}
                        <span>{campaign.budget}</span>
                      </div>
                      <div>
                        <span className="text-green-500">Device:</span>{' '}
                        <span className={getDeviceStatusColor(campaign.device)}>{campaign.device}</span>
                      </div>
                      {campaign.addedBy && (
                        <div>
                          <span className="text-green-500">Added by:</span>{' '}
                          <span className="text-gray-400">{campaign.addedBy}</span>
                        </div>
                      )}
                    </div>
                    
                    {campaign.links && campaign.links.length > 0 && (
                      <div className="mt-2">
                        <span className="text-green-500 text-xs">Links:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {campaign.links.map((link, idx) => (
                            <a
                              key={idx}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Link {idx + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {campaign.lastUpdated && (
                      <div className="text-xs text-gray-500 mt-2">
                        Last updated: {new Date(campaign.lastUpdated).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Notes Section */}
            {(profile.notes && profile.notes.length > 0) || canAddNotes ? (
              <div>
                <h4 className="text-sm font-bold uppercase mb-2">Internal Notes</h4>
                <div className="space-y-2 mb-3 max-h-60 overflow-y-auto">
                  {profile.notes && profile.notes.length > 0 ? (
                    profile.notes
                      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                      .map((note, index) => (
                        <div key={note.id || index} className="bg-green-900/20 p-3 rounded border border-green-800">
                          <div className="flex items-start gap-2">
                            {note.authorImage ? (
                              <img 
                                src={note.authorImage} 
                                alt={note.authorName} 
                                className="w-8 h-8 rounded-full flex-shrink-0" 
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-green-800 flex items-center justify-center flex-shrink-0">
                                {note.authorName?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <span className="font-bold text-green-400 text-sm">
                                    {note.authorName || 'Unknown'}
                                  </span>
                                  {note.authorId && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      {note.authorId.startsWith('@') ? note.authorId : `@${note.authorId}`}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {new Date(note.createdAt || 0).toLocaleString()}
                                </span>
                              </div>
                              {note.campaignName && (
                                <div className="text-xs text-green-600 mb-1">
                                  Campaign: <a 
                                    href={`/campaigns/${note.campaignSlug}`} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {note.campaignName}
                                  </a>
                                </div>
                              )}
                              <p className="text-sm whitespace-pre-wrap">{note.content || note.text}</p>
                            </div>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-xs text-gray-500">No internal notes yet</p>
                  )}
                </div>
                
                {/* Add Note Form - Only for admin/core */}
                {canAddNotes && (
                  <div className="space-y-2">
                    {profile.campaigns.length > 0 && (
                      <select
                        value={selectedCampaignForNote}
                        onChange={(e) => setSelectedCampaignForNote(e.target.value)}
                        className="w-full px-3 py-2 bg-black border border-green-500 text-green-300 text-sm focus:outline-none focus:border-green-400"
                        disabled={addingNote}
                      >
                        <option value="">Select a campaign...</option>
                        {profile.campaigns.map(campaign => (
                          <option key={campaign.id} value={campaign.id}>
                            {campaign.name} ({campaign.stage})
                          </option>
                        ))}
                      </select>
                    )}
                    
                    <div className="flex gap-2">
                      <textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add an internal note..."
                        className="flex-1 px-3 py-2 bg-black border border-green-500 text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400 text-sm"
                        rows={2}
                        disabled={addingNote}
                      />
                      <button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addingNote || !selectedCampaignForNote}
                        className="px-4 py-2 bg-green-900 text-green-100 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {addingNote ? '...' : 'Add'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-8 text-red-400">
            Failed to load profile
          </div>
        )}
      </div>
    </div>
  )
} 