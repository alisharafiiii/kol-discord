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
}

interface KOLProfile {
  handle: string
  name: string
  pfp?: string
  role?: string
  tier?: string
  status?: string
  email?: string
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
  notes?: string[]
}

export default function KOLProfileModal({ kolHandle, kolName, isOpen, onClose }: KOLProfileModalProps) {
  const { data: session } = useSession()
  const [profile, setProfile] = useState<KOLProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  
  const userRole = (session as any)?.role || (session as any)?.user?.role || 'user'
  const canAddNotes = ['admin', 'core'].includes(userRole)
  
  useEffect(() => {
    if (isOpen) {
      loadProfile()
    }
  }, [isOpen, kolHandle])
  
  const loadProfile = async () => {
    try {
      setLoading(true)
      // Fetch KOL data from all campaigns
      const campaignsRes = await fetch('/api/campaigns')
      if (!campaignsRes.ok) throw new Error('Failed to load campaigns')
      const campaigns = await campaignsRes.json()
      
      // Find all campaigns where this KOL participates
      const participations: CampaignParticipation[] = []
      let kolData: any = null
      
      campaigns.forEach((campaign: any) => {
        const kol = campaign.kols?.find((k: any) => k.handle === kolHandle)
        if (kol) {
          if (!kolData) kolData = kol
          participations.push({
            id: campaign.id,
            name: campaign.name,
            slug: campaign.slug,
            stage: kol.stage,
            payment: kol.payment,
            views: kol.views || 0,
            budget: kol.budget,
            device: kol.device,
          })
        }
      })
      
      // Try to get profile data
      let profileData = null
      try {
        const profileRes = await fetch(`/api/user/profile?handle=${kolHandle}`)
        if (profileRes.ok) {
          profileData = await profileRes.json()
        }
      } catch (err) {
        console.log('No user profile found for KOL')
      }
      
      setProfile({
        handle: kolHandle,
        name: kolName,
        pfp: kolData?.pfp || profileData?.user?.profileImageUrl,
        role: profileData?.user?.role || 'kol',
        tier: kolData?.tier,
        status: kolData?.device,
        email: profileData?.user?.email,
        telegram: kolData?.contact?.startsWith('@') ? kolData.contact : undefined,
        telegramGroup: kolData?.telegramGroup,
        shippingAddress: profileData?.user?.shippingAddress,
        campaigns: participations,
        notes: kolData?.notes || [],
      })
    } catch (error) {
      console.error('Error loading KOL profile:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAddNote = async () => {
    if (!newNote.trim() || !canAddNotes) return
    
    setAddingNote(true)
    try {
      // Add note with timestamp and user info
      const noteData = {
        text: newNote,
        author: session?.user?.name || 'Unknown',
        authorImage: session?.user?.image,
        timestamp: new Date().toISOString(),
      }
      
      // TODO: Save note to database
      setProfile(prev => prev ? {
        ...prev,
        notes: [...(prev.notes || []), JSON.stringify(noteData)]
      } : null)
      
      setNewNote('')
      
      // TODO: Send notification email
      // await fetch('/api/notifications/send', { ... })
      
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setAddingNote(false)
    }
  }
  
  const copyShippingAddress = () => {
    if (!profile?.shippingAddress) return
    
    const { addressLine1, addressLine2, city, postalCode, country } = profile.shippingAddress
    const fullAddress = [
      profile.name,
      addressLine1,
      addressLine2,
      [city, postalCode].filter(Boolean).join(' '),
      country
    ].filter(Boolean).join('\n')
    
    navigator.clipboard.writeText(fullAddress)
    alert('Address copied to clipboard!')
  }
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-2 border-green-300 p-6 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-green-300">KOL Profile</h2>
          <button
            onClick={onClose}
            className="text-green-300 hover:text-green-100 transition-colors text-2xl"
          >
            ✕
          </button>
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
                <p className="text-green-400">@{profile.handle}</p>
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
            
            {/* Contact Info */}
            <div>
              <h4 className="text-sm font-bold uppercase mb-2">Contact</h4>
              <div className="space-y-1 text-sm">
                {profile.email && (
                  <div><span className="text-green-500">Email:</span> {profile.email}</div>
                )}
                {profile.telegram && (
                  <div>
                    <span className="text-green-500">Telegram:</span>{' '}
                    <a href={`https://t.me/${profile.telegram.substring(1)}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      {profile.telegram}
                    </a>
                  </div>
                )}
                {profile.telegramGroup && (
                  <div>
                    <span className="text-green-500">Telegram Group:</span>{' '}
                    <a href={profile.telegramGroup} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                      Group Link
                    </a>
                  </div>
                )}
              </div>
            </div>
            
            {/* Campaign Participation */}
            <div>
              <h4 className="text-sm font-bold uppercase mb-2">Campaign Participation ({profile.campaigns.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {profile.campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border border-green-500 p-3 rounded cursor-pointer hover:bg-green-900/30 transition-colors"
                    onClick={() => window.open(`/campaigns/${campaign.slug}`, '_blank')}
                  >
                    <h5 className="font-bold text-sm mb-1">{campaign.name}</h5>
                    <div className="text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-green-500">Stage:</span>
                        <span className={
                          campaign.stage === 'done' ? 'text-green-400' :
                          campaign.stage === 'posted' ? 'text-blue-400' :
                          'text-yellow-400'
                        }>{campaign.stage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-500">Payment:</span>
                        <span className={
                          campaign.payment === 'paid' ? 'text-green-400' :
                          campaign.payment === 'approved' ? 'text-blue-400' :
                          'text-gray-400'
                        }>{campaign.payment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-500">Views:</span>
                        <span>{campaign.views.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-500">Budget:</span>
                        <span>{campaign.budget}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-500">Device:</span>
                        <span>{campaign.device}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Shipping Address */}
            {profile.shippingAddress && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-bold uppercase">Shipping Address</h4>
                  <button
                    onClick={copyShippingAddress}
                    className="text-xs px-2 py-1 border border-green-500 hover:bg-green-900/30 transition-colors"
                  >
                    📋 Copy All
                  </button>
                </div>
                <div className="text-sm bg-green-900/20 p-3 rounded border border-green-800">
                  <div>{profile.name}</div>
                  {profile.shippingAddress.addressLine1 && <div>{profile.shippingAddress.addressLine1}</div>}
                  {profile.shippingAddress.addressLine2 && <div>{profile.shippingAddress.addressLine2}</div>}
                  <div>
                    {[
                      profile.shippingAddress.city,
                      profile.shippingAddress.postalCode,
                    ].filter(Boolean).join(' ')}
                  </div>
                  {profile.shippingAddress.country && <div>{profile.shippingAddress.country}</div>}
                </div>
              </div>
            )}
            
            {/* Notes Section */}
            {canAddNotes && (
              <div>
                <h4 className="text-sm font-bold uppercase mb-2">Notes</h4>
                <div className="space-y-2 mb-3">
                  {profile.notes?.map((note, index) => {
                    try {
                      const noteData = JSON.parse(note)
                      return (
                        <div key={index} className="bg-green-900/20 p-3 rounded border border-green-800">
                          <div className="flex items-start gap-2 mb-1">
                            {noteData.authorImage && (
                              <img src={noteData.authorImage} alt={noteData.author} className="w-6 h-6 rounded-full" />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold text-green-400">{noteData.author}</span>
                                <span className="text-green-600">{new Date(noteData.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="text-sm mt-1">{noteData.text}</p>
                            </div>
                          </div>
                        </div>
                      )
                    } catch {
                      return (
                        <div key={index} className="bg-green-900/20 p-3 rounded border border-green-800 text-sm">
                          {note}
                        </div>
                      )
                    }
                  })}
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 px-3 py-2 bg-black border border-green-500 text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400 text-sm"
                    rows={2}
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || addingNote}
                    className="px-4 py-2 bg-green-900 text-green-100 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {addingNote ? '...' : 'Add'}
                  </button>
                </div>
              </div>
            )}
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