'use client'

import { useState, useEffect } from 'react'
import { X, Upload, Check, Trash2 } from './icons'
import type { CampaignKOL, KOLTier, CampaignStage, DeviceStatus, PaymentStatus, SocialPlatform } from '@/lib/types/profile'

interface EditKOLModalProps {
  campaignId: string
  kol: CampaignKOL
  onClose: () => void
  onKOLUpdated: (kol: CampaignKOL) => void
  onKOLRemoved: (kolHandle: string) => void
}

export default function EditKOLModal({ campaignId, kol, onClose, onKOLUpdated, onKOLRemoved }: EditKOLModalProps) {
  // Form state - initialize with existing values
  const [kolName, setKolName] = useState(kol.kolName)
  const [kolImage, setKolImage] = useState(kol.kolImage || '')
  const [tier, setTier] = useState<KOLTier>(kol.tier)
  const [contact, setContact] = useState('')  // CampaignKOL doesn't have contact, will need to fetch from profile
  const [stage, setStage] = useState<CampaignStage>(kol.stage)
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(kol.deviceStatus || 'na')
  const [budget, setBudget] = useState(kol.budget?.toString() || '')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(kol.paymentStatus || 'pending')
  const [links, setLinks] = useState(kol.links?.join(', ') || '')
  const [platform, setPlatform] = useState<SocialPlatform>(kol.platform || 'twitter')
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState('')
  
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
    if (!kolName || !budget) {
      setError('Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/kols`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kolHandle: kol.kolHandle,
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
        throw new Error(data.error || 'Failed to update KOL')
      }
      
      const updatedKOL = await res.json()
      onKOLUpdated(updatedKOL)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to update KOL')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Remove KOL from campaign
  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove this KOL from the campaign?')) {
      return
    }
    
    setIsRemoving(true)
    setError('')
    
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/kols?kolHandle=${encodeURIComponent(kol.kolHandle)}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove KOL')
      }
      
      onKOLRemoved(kol.kolHandle)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to remove KOL')
    } finally {
      setIsRemoving(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-black border border-green-500 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-green-500">
          <h2 className="text-xl font-bold text-green-300">Edit KOL Details</h2>
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
            {/* KOL Info Header */}
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-4">
                {kolImage && (
                  <img
                    src={kolImage}
                    alt={kolName}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-green-300">@{kol.kolHandle}</h3>
                  <p className="text-sm text-green-400">{kolName}</p>
                  {kol.lastSyncedAt && (
                    <p className="text-xs text-green-500">
                      Last updated: {new Date(kol.lastSyncedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            {/* Two column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <span className="text-green-300">Change Picture</span>
                    </div>
                  </label>
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
            <div>
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
            
            {/* Tweet Metrics - if available */}
            {kol.metrics && kol.metrics.length > 0 && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-300 mb-2">Tweet Performance</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-green-400">Views:</span>{' '}
                    <span className="text-green-300">{kol.totalViews?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-green-400">Engagement:</span>{' '}
                    <span className="text-green-300">{kol.totalEngagement?.toLocaleString() || 0}</span>
                  </div>
                  <div>
                    <span className="text-green-400">Rate:</span>{' '}
                    <span className="text-green-300">{(kol.engagementRate || 0).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-green-400">Score:</span>{' '}
                    <span className="text-green-300">{kol.score?.toFixed(0) || 0}</span>
                  </div>
                </div>
                {kol.lastSyncedAt && (
                  <p className="text-xs text-green-500 mt-2">
                    Last synced: {new Date(kol.lastSyncedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-500 rounded">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-green-500 flex justify-between">
          <button
            onClick={handleRemove}
            disabled={isRemoving}
            className="px-4 py-2 bg-red-900 text-red-100 rounded hover:bg-red-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRemoving ? (
              <>
                <div className="w-4 h-4 border-2 border-red-100 border-t-transparent rounded-full animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Remove from Campaign
              </>
            )}
          </button>
          
          <div className="flex gap-3">
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
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 