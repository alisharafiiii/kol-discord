'use client'

import { useState, useEffect } from 'react'
import { X, Search, Upload, Check } from './icons'
import type { KOLTier, CampaignStage, DeviceStatus, PaymentStatus, SocialPlatform } from '@/lib/types/profile'

interface AddKOLModalProps {
  campaignId: string
  campaignName: string
  onClose: () => void
  onKOLAdded: (kol: any) => void
}

export default function AddKOLModal({ campaignId, campaignName, onClose, onKOLAdded }: AddKOLModalProps) {
  // Form state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedKOL, setSelectedKOL] = useState<any>(null)
  
  // KOL details
  const [kolHandle, setKolHandle] = useState('')
  const [kolName, setKolName] = useState('')
  const [kolImage, setKolImage] = useState('')
  const [tier, setTier] = useState<KOLTier>('star')
  const [contact, setContact] = useState('')
  const [stage, setStage] = useState<CampaignStage>('reached_out')
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('na')
  const [budget, setBudget] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending')
  const [links, setLinks] = useState('')
  const [platform, setPlatform] = useState<SocialPlatform>('twitter')
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  
  // Search for approved KOLs
  useEffect(() => {
    const searchKOLs = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([])
        return
      }
      
      setIsSearching(true)
      try {
        const res = await fetch(`/api/profile/search?q=${encodeURIComponent(searchTerm)}&approved=true`)
        if (res.ok) {
          const data = await res.json()
          setSearchResults(data)
        }
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setIsSearching(false)
      }
    }
    
    const debounce = setTimeout(searchKOLs, 300)
    return () => clearTimeout(debounce)
  }, [searchTerm])
  
  // Handle KOL selection from search
  const selectKOL = (kol: any) => {
    setSelectedKOL(kol)
    setKolHandle(kol.handle || kol.twitterHandle || '')
    setKolName(kol.name || '')
    setKolImage(kol.image || kol.profileImageUrl || '')
    if (kol.tier) setTier(kol.tier)
    setSearchTerm('')
    setSearchResults([])
  }
  
  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // For now, convert to base64 - in production, upload to a service
    const reader = new FileReader()
    reader.onload = (e) => {
      setKolImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }
  
  // Format contact field
  const formatContact = (value: string): string => {
    // Show formatted version in UI
    if (value.startsWith('@')) {
      return `Telegram: ${value}`
    }
    return value
  }
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Validate required fields
    if (!kolHandle || !kolName || !budget) {
      setError('Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/kols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          kolHandle,
          kolName,
          kolImage,
          tier,
          contact,
          stage,
          deviceStatus,
          budget: parseFloat(budget),
          paymentStatus,
          links: links.split(',').map(l => l.trim()).filter(Boolean),
          platform,
        })
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to add KOL')
      }
      
      const newKOL = await res.json()
      onKOLAdded(newKOL)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to add KOL')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-green-500 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <h2 className="text-xl font-bold text-green-300">Add KOL to Campaign</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-green-900/50 rounded transition-colors"
          >
            <X className="w-5 h-5 text-green-300" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Search existing KOLs */}
            <div>
              <label className="block text-sm font-medium text-green-300 mb-1">
                Search Approved KOLs
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or handle..."
                  className="w-full pl-10 pr-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                />
              </div>
              
              {/* Search results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-green-500 rounded max-h-40 overflow-y-auto">
                  {searchResults.map((kol) => (
                    <button
                      key={kol.id}
                      type="button"
                      onClick={() => selectKOL(kol)}
                      className="w-full p-2 hover:bg-green-900/50 text-left flex items-center gap-2 transition-colors"
                    >
                      {kol.profileImageUrl && (
                        <img
                          src={kol.profileImageUrl}
                          alt={kol.name}
                          className="w-8 h-8 rounded-full"
                        />
                      )}
                      <div>
                        <div className="text-green-300">{kol.name}</div>
                        <div className="text-xs text-green-500">@{kol.twitterHandle}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-green-500/30 pt-4">
              <p className="text-sm text-green-400 mb-4">Or add manually:</p>
              
              {/* Two column layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Handle */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Handle *
                  </label>
                  <input
                    type="text"
                    value={kolHandle}
                    onChange={(e) => setKolHandle(e.target.value)}
                    placeholder="@username"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                    required
                  />
                </div>
                
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={kolName}
                    onChange={(e) => setKolName(e.target.value)}
                    placeholder="Display name"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                    required
                  />
                </div>
                
                {/* Profile Picture */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="flex items-center gap-2 px-3 py-2 bg-black border border-green-500 rounded hover:bg-green-900/30 transition-colors">
                        <Upload className="w-4 h-4 text-green-300" />
                        <span className="text-green-300">Upload</span>
                      </div>
                    </label>
                    {kolImage && (
                      <img
                        src={kolImage}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                  </div>
                </div>
                
                {/* Tier */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Tier *
                  </label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value as KOLTier)}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="hero">Hero</option>
                    <option value="legend">Legend</option>
                    <option value="star">Star</option>
                    <option value="rising">Rising</option>
                    <option value="micro">Micro</option>
                  </select>
                </div>
                
                {/* Contact */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="@telegram or email"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                  />
                  {contact && (
                    <p className="text-xs text-green-400 mt-1">{formatContact(contact)}</p>
                  )}
                </div>
                
                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={stage}
                    onChange={(e) => setStage(e.target.value as CampaignStage)}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="reached_out">Reached Out</option>
                    <option value="waiting_device">Waiting for Device</option>
                    <option value="waiting_brief">Waiting for Brief</option>
                    <option value="posted">Posted</option>
                    <option value="preparing">Preparing</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                
                {/* Device Status */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Device
                  </label>
                  <select
                    value={deviceStatus}
                    onChange={(e) => setDeviceStatus(e.target.value as DeviceStatus)}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="na">N/A</option>
                    <option value="preparing">Preparing</option>
                    <option value="on_way">On the Way</option>
                    <option value="received">Received</option>
                    <option value="issue">Issue</option>
                    <option value="sent_before">Sent Before</option>
                  </select>
                </div>
                
                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Budget *
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                    required
                  />
                </div>
                
                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Payment
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                    <option value="revision">Revision</option>
                  </select>
                </div>
                
                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Platform *
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as SocialPlatform)}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="twitter">Twitter</option>
                    <option value="instagram">Instagram</option>
                    <option value="youtube">YouTube</option>
                    <option value="tiktok">TikTok</option>
                    <option value="twitch">Twitch</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
              </div>
              
              {/* Links - full width */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-green-300 mb-1">
                  Links
                </label>
                <textarea
                  value={links}
                  onChange={(e) => setLinks(e.target.value)}
                  placeholder="Enter links separated by commas"
                  rows={2}
                  className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                />
                <p className="text-xs text-green-400 mt-1">
                  Separate multiple links with commas
                </p>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500 rounded">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-green-500 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-green-300 hover:text-green-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-green-100 border-t-transparent rounded-full animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Add KOL
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 