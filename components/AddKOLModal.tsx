'use client'

import { useState, useEffect } from 'react'
import type { KOL } from '@/lib/campaign'

interface AddKOLModalProps {
  onClose: () => void
  onAdd: (kol: Omit<KOL, 'id' | 'lastUpdated'>) => void
}

export default function AddKOLModal({ onClose, onAdd }: AddKOLModalProps) {
  const [handle, setHandle] = useState('')
  const [name, setName] = useState('')
  const [stage, setStage] = useState<KOL['stage']>('reached-out')
  const [device, setDevice] = useState<KOL['device']>('N/A')
  const [budget, setBudget] = useState('')
  const [payment, setPayment] = useState<KOL['payment']>('pending')
  const [views, setViews] = useState<number | ''>('')
  const [links, setLinks] = useState('')
  const [platform, setPlatform] = useState('')
  const [contact, setContact] = useState('')
  const [tier, setTier] = useState<KOL['tier'] | ''>('')
  const [approvedUsers, setApprovedUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [pfpUrl, setPfpUrl] = useState<string | undefined>(undefined)
  const [uploadedImage, setUploadedImage] = useState<string | undefined>(undefined)

  // Fetch approved users
  useEffect(() => {
    fetch('/api/users?approved=true')
      .then(res => res.json())
      .then(data => {
        // Ensure data is an array before setting it
        if (Array.isArray(data)) {
          setApprovedUsers(data)
        } else {
          console.error('Users API did not return an array:', data)
          setApprovedUsers([])
        }
      })
      .catch(error => {
        console.error('Error fetching approved users:', error)
        setApprovedUsers([])
      })
  }, [])

  const filteredUsers = approvedUsers.filter(user => {
    const userHandle = user.handle || user.twitterHandle?.replace('@', '')
    return userHandle?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const selectUser = (user: any) => {
    const userHandle = user.handle || user.twitterHandle?.replace('@', '')
    setHandle(userHandle)
    setName(user.name || userHandle)
    setSearchTerm(userHandle)
    setShowDropdown(false)
    // Prefer provided profile image, otherwise build from unavatar.io
    const image = user.profileImageUrl || `https://unavatar.io/twitter/${userHandle}`
    setPfpUrl(image)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!handle || !name) {
      alert('Please provide both handle and name')
      return
    }

    const kol: Omit<KOL, 'id' | 'lastUpdated'> = {
      handle,
      name,
      stage,
      device,
      budget,
      payment,
      views: views === '' ? 0 : views,
      links: links.split(',').map(l => l.trim()).filter(Boolean),
      platform: platform ? [platform] : [],
      contact: contact || undefined,
      tier: tier || undefined,
      pfp: uploadedImage || pfpUrl || `https://unavatar.io/twitter/${handle}`
    }

    onAdd(kol)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setUploadedImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-black border-2 border-green-300 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">ADD KOL</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Search for approved users */}
          <div>
            <label className="block text-xs uppercase mb-2">Search KOL</label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search approved users..."
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              />
              {showDropdown && filteredUsers.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-black border border-green-300 max-h-48 overflow-y-auto z-10">
                  {filteredUsers.map(user => {
                    const userHandle = user.handle || user.twitterHandle?.replace('@', '')
                    const img = user.profileImageUrl || `https://unavatar.io/twitter/${userHandle}`
                    return (
                      <div
                        key={user.id || userHandle}
                        onClick={() => selectUser(user)}
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-green-900"
                      >
                        <img src={img} alt={userHandle} className="w-6 h-6 rounded-full" />
                        <div>
                          <div className="font-bold">@{userHandle}</div>
                          {user.name && <div className="text-xs text-gray-500">{user.name}</div>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Manual input fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-2">Handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
                required
              />
            </div>
            <div>
              {pfpUrl && (
                <div className="flex items-center gap-2 mb-2">
                  <img src={pfpUrl} alt="pfp" className="w-8 h-8 rounded-full" />
                  <span className="text-xs text-gray-400">Preview</span>
                </div>
              )}
              <label className="block text-xs uppercase mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-2">Tier</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as KOL['tier'] | '')}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              >
                <option value="">None</option>
                <option value="hero">Hero</option>
                <option value="star">Star</option>
                <option value="rising">Rising</option>
                <option value="micro">Micro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase mb-2">Contact</label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email, Telegram, etc"
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-2">Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as KOL['stage'])}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              >
                <option value="cancelled">Cancelled</option>
                <option value="reached-out">Reached Out</option>
                <option value="waiting-for-device">Waiting for Device</option>
                <option value="waiting-for-brief">Waiting for Brief</option>
                <option value="posted">Posted</option>
                <option value="preparing">Preparing</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase mb-2">Device</label>
              <select
                value={device}
                onChange={(e) => setDevice(e.target.value as KOL['device'])}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              >
                <option value="preparing">Preparing</option>
                <option value="received">Received</option>
                <option value="N/A">N/A</option>
                <option value="on-the-way">On the Way</option>
                <option value="sent-before">Sent Before</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase mb-2">Budget</label>
              <input
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="free, with device, or amount"
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              />
            </div>
            <div>
              <label className="block text-xs uppercase mb-2">Payment</label>
              <select
                value={payment}
                onChange={(e) => setPayment(e.target.value as KOL['payment'])}
                className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
              >
                <option value="approved">Approved</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Views</label>
            <input
              type="number"
              value={views}
              onChange={(e) => setViews(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
            />
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Links (comma separated)</label>
            <input
              type="text"
              value={links}
              onChange={(e) => setLinks(e.target.value)}
              placeholder="https://example.com, https://another.com"
              className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
            />
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full px-3 py-2 bg-black border border-green-300 text-green-300"
            >
              <option value="">Select Platform</option>
              <option value="twitter">Twitter/X</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
              <option value="tiktok">TikTok</option>
              <option value="linkedin">LinkedIn</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase mb-2">Profile Image</label>
            <div className="flex items-center gap-2">
              {uploadedImage && (
                <img 
                  src={uploadedImage} 
                  alt="Profile" 
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="text-xs"
              />
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <button
              type="submit"
              className="px-4 py-2 bg-green-900 border border-green-300 hover:bg-green-800"
            >
              Add KOL
            </button>
            <button
              type="button"
              onClick={onClose}
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