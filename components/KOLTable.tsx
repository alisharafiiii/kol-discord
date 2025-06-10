'use client'

import { useState } from 'react'
import type { KOL } from '@/lib/campaign'
import KOLProfileModal from './KOLProfileModal'

interface KOLTableProps {
  kols: KOL[]
  onUpdate: (kolId: string, updates: Partial<KOL>) => void
  onDelete: (kolId: string) => void
  canEdit: boolean
}

export default function KOLTable({ kols, onUpdate, onDelete, canEdit }: KOLTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedKOL, setSelectedKOL] = useState<{ handle: string; name: string } | null>(null)

  const stages: KOL['stage'][] = ['reached out', 'preparing', 'posted', 'done', 'cancelled']
  const devices: KOL['device'][] = ['mobile', 'laptop', 'desktop', 'tablet', 'owned', 'na']
  const payments: KOL['payment'][] = ['pending', 'approved', 'paid', 'rejected']
  const tiers: KOL['tier'][] = ['hero', 'legend', 'star', 'rising', 'micro']

  const startEdit = (kolId: string, field: string, value: any) => {
    setEditingId(kolId)
    setEditingField(field)
    setEditValue(Array.isArray(value) ? value.join(', ') : String(value || ''))
  }

  const saveEdit = (kolId: string, field: string) => {
    let value: any = editValue
    
    if (field === 'views' || field === 'likes' || field === 'retweets' || field === 'comments') {
      value = parseInt(editValue) || 0
    } else if (field === 'links' || field === 'platform') {
      value = editValue.split(',').map(v => v.trim()).filter(Boolean)
    }
    
    onUpdate(kolId, { [field]: value })
    setEditingId(null)
    setEditingField(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingField(null)
    setEditValue('')
  }

  const getStageColor = (stage: KOL['stage']) => {
    switch (stage) {
      case 'done': return 'text-green-400'
      case 'posted': return 'text-blue-400'
      case 'cancelled': return 'text-red-400'
      case 'preparing': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getPaymentColor = (payment: KOL['payment']) => {
    switch (payment) {
      case 'paid': return 'text-green-400'
      case 'approved': return 'text-blue-400'
      case 'rejected': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getTierBadge = (tier?: KOL['tier']) => {
    switch (tier) {
      case 'hero': return { text: 'HERO', color: 'bg-purple-600 text-white' }
      case 'legend': return { text: 'LEGEND', color: 'bg-orange-600 text-white' }
      case 'star': return { text: 'STAR', color: 'bg-yellow-500 text-black' }
      case 'rising': return { text: 'RISING', color: 'bg-blue-500 text-white' }
      case 'micro': return { text: 'MICRO', color: 'bg-gray-600 text-white' }
      default: return null
    }
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'twitter': case 'x': return '𝕏'
      case 'instagram': return '📷'
      case 'youtube': return '▶️'
      case 'tiktok': return '🎵'
      case 'linkedin': return '💼'
      case 'facebook': return 'f'
      default: return platform[0]?.toUpperCase() || '?'
    }
  }

  const formatContactLink = (contact: string) => {
    // Add protocol if missing
    if (contact && !contact.match(/^https?:\/\//) && !contact.startsWith('mailto:')) {
      if (contact.includes('@') && !contact.includes('/')) {
        return `mailto:${contact}`
      } else if (contact.startsWith('t.me/') || contact.includes('telegram')) {
        return `https://${contact}`
      } else {
        return `https://${contact}`
      }
    }
    return contact
  }

  const getContactDisplay = (contact: string) => {
    if (contact.includes('@') && !contact.includes('/')) {
      return '✉️ Email'
    } else if (contact.includes('t.me') || contact.includes('telegram')) {
      return '💬 Telegram'
    } else if (contact.includes('wa.me') || contact.includes('whatsapp')) {
      return '📱 WhatsApp'
    } else {
      return '🔗 Contact'
    }
  }

  const shortenUrl = (url: string, maxLength: number = 25) => {
    try {
      const urlObj = new URL(url)
      const domain = urlObj.hostname.replace('www.', '')
      const path = urlObj.pathname
      
      // For Twitter/X links, show the username
      if (domain.includes('twitter.com') || domain.includes('x.com')) {
        const match = path.match(/\/([^\/]+)\/status/)
        if (match) return `x.com/${match[1]}/...`
      }
      
      // For other links, show domain + shortened path
      if (path.length > 1) {
        const shortPath = path.length > 15 ? path.substring(0, 12) + '...' : path
        return domain + shortPath
      }
      
      return domain
    } catch {
      // If URL parsing fails, just truncate
      return url.length > maxLength ? url.substring(0, maxLength) + '...' : url
    }
  }

  if (kols.length === 0) {
    return (
      <div className="border border-green-300 p-8 text-center">
        <p className="text-gray-500">No KOLs added yet</p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border border-green-300">
          <thead>
            <tr className="border-b border-green-300 bg-green-950">
              <th className="p-2 text-left text-xs uppercase">KOL</th>
              <th className="p-2 text-left text-xs uppercase">Tier</th>
              <th className="p-2 text-left text-xs uppercase">Stage</th>
              <th className="p-2 text-left text-xs uppercase">Device</th>
              <th className="p-2 text-left text-xs uppercase">Budget</th>
              <th className="p-2 text-left text-xs uppercase">Payment</th>
              <th className="p-2 text-left text-xs uppercase">Views</th>
              <th className="p-2 text-left text-xs uppercase">Likes</th>
              <th className="p-2 text-left text-xs uppercase">RTs</th>
              <th className="p-2 text-left text-xs uppercase">Comments</th>
              <th className="p-2 text-left text-xs uppercase">Contact</th>
              <th className="p-2 text-left text-xs uppercase">Links</th>
              <th className="p-2 text-left text-xs uppercase">Platform</th>
              {canEdit && <th className="p-2 text-left text-xs uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {kols.map(kol => (
              <tr key={kol.id} className="border-b border-green-300 hover:bg-green-950/30">
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    {kol.pfp ? (
                      <img src={kol.pfp} alt={kol.handle} className="w-8 h-8 rounded-full" />
                    ) : (
                      <img src={`https://unavatar.io/twitter/${kol.handle}`} alt={kol.handle} className="w-8 h-8 rounded-full" />
                    )}
                    <div>
                      <div 
                        className="font-medium cursor-pointer hover:text-green-400 transition-colors"
                        onClick={() => setSelectedKOL({ handle: kol.handle, name: kol.name })}
                      >
                        {kol.name}
                      </div>
                      <div className="text-xs text-gray-500">@{kol.handle}</div>
                    </div>
                  </div>
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'tier' ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'tier')}
                      className="bg-black border border-green-300 text-xs p-1"
                      autoFocus
                    >
                      <option value="">None</option>
                      {tiers.map(t => (
                        <option key={t} value={t}>{t ? t.toUpperCase() : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <div 
                      className="cursor-pointer"
                      onClick={() => canEdit && startEdit(kol.id, 'tier', kol.tier || '')}
                    >
                      {kol.tier && getTierBadge(kol.tier) ? (
                        <span className={`text-xs px-2 py-1 rounded font-bold ${getTierBadge(kol.tier)!.color}`}>
                          {getTierBadge(kol.tier)!.text}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">-</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'stage' ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'stage')}
                      className="bg-black border border-green-300 text-xs p-1"
                      autoFocus
                    >
                      {stages.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span 
                      className={`text-xs cursor-pointer ${getStageColor(kol.stage)}`}
                      onClick={() => canEdit && startEdit(kol.id, 'stage', kol.stage)}
                    >
                      {kol.stage}
                    </span>
                  )}
                </td>
                
                <td className="p-3 text-center">
                  {kol.productId ? (
                    <div className="text-xs">
                      <span className="text-green-400">Product Assigned</span>
                      {kol.productCost && (
                        <div className="text-green-300">${kol.productCost}</div>
                      )}
                    </div>
                  ) : (
                    <span className={`text-xs ${
                      kol.device === 'mobile' ? 'text-blue-400' :
                      kol.device === 'laptop' ? 'text-purple-400' :
                      kol.device === 'desktop' ? 'text-indigo-400' :
                      kol.device === 'tablet' ? 'text-cyan-400' :
                      kol.device === 'owned' ? 'text-green-400' :
                      'text-gray-400'
                    }`}>
                      {kol.device}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'budget' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'budget')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'budget')}
                      className="bg-black border border-green-300 text-xs p-1 w-24"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer"
                      onClick={() => canEdit && startEdit(kol.id, 'budget', kol.budget)}
                    >
                      {kol.budget}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'payment' ? (
                    <select
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'payment')}
                      className="bg-black border border-green-300 text-xs p-1"
                      autoFocus
                    >
                      {payments.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  ) : (
                    <span 
                      className={`text-xs cursor-pointer ${getPaymentColor(kol.payment)}`}
                      onClick={() => canEdit && startEdit(kol.id, 'payment', kol.payment)}
                    >
                      {kol.payment}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'views' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'views')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'views')}
                      className="bg-black border border-green-300 text-xs p-1 w-20"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer flex items-center gap-1"
                      onClick={() => canEdit && startEdit(kol.id, 'views', kol.views)}
                    >
                      <span className="opacity-50">👁️</span>
                      {kol.views.toLocaleString()}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'likes' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'likes')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'likes')}
                      className="bg-black border border-green-300 text-xs p-1 w-20"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer flex items-center gap-1"
                      onClick={() => canEdit && startEdit(kol.id, 'likes', kol.likes || 0)}
                    >
                      <span className="opacity-50">❤️</span>
                      {(kol.likes || 0).toLocaleString()}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'retweets' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'retweets')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'retweets')}
                      className="bg-black border border-green-300 text-xs p-1 w-20"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer flex items-center gap-1"
                      onClick={() => canEdit && startEdit(kol.id, 'retweets', kol.retweets || 0)}
                    >
                      <span className="opacity-50">🔁</span>
                      {(kol.retweets || 0).toLocaleString()}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'comments' ? (
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'comments')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'comments')}
                      className="bg-black border border-green-300 text-xs p-1 w-20"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs cursor-pointer flex items-center gap-1"
                      onClick={() => canEdit && startEdit(kol.id, 'comments', kol.comments || 0)}
                    >
                      <span className="opacity-50">💬</span>
                      {(kol.comments || 0).toLocaleString()}
                    </span>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'contact' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'contact')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'contact')}
                      className="bg-black border border-green-300 text-xs p-1 w-32"
                      placeholder="Email, Telegram, etc"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-xs cursor-pointer"
                      onClick={() => canEdit && startEdit(kol.id, 'contact', kol.contact || '')}
                    >
                      {kol.contact ? (
                        kol.contact.startsWith('@') ? (
                          <a 
                            href={`https://t.me/${kol.contact.substring(1)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:underline"
                          >
                            {kol.contact}
                          </a>
                        ) : kol.contact.includes('@') ? (
                          <a 
                            href={`mailto:${kol.contact}`}
                            className="text-green-400 hover:underline"
                          >
                            {kol.contact}
                          </a>
                        ) : (
                          kol.contact
                        )
                      ) : (
                        <span className="text-gray-500">No contact</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'links' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'links')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'links')}
                      className="bg-black border border-green-300 text-xs p-1 w-32"
                      placeholder="Comma separated"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="text-xs cursor-pointer"
                      onClick={() => canEdit && startEdit(kol.id, 'links', kol.links)}
                    >
                      {kol.links.length > 0 ? (
                        <div className="space-y-1">
                          {kol.links.map((link, i) => (
                            <a 
                              key={i} 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block text-blue-400 hover:underline truncate max-w-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {shortenUrl(link)}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">No links</span>
                      )}
                    </div>
                  )}
                </td>
                
                <td className="p-2">
                  {editingId === kol.id && editingField === 'platform' ? (
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => saveEdit(kol.id, 'platform')}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(kol.id, 'platform')}
                      className="bg-black border border-green-300 text-xs p-1 w-24"
                      placeholder="Comma separated"
                      autoFocus
                    />
                  ) : (
                    <div 
                      className="flex gap-1 cursor-pointer"
                      onClick={() => canEdit && startEdit(kol.id, 'platform', kol.platform)}
                    >
                      {kol.platform.length > 0 ? (
                        kol.platform.map(p => (
                          <span key={p} className="text-lg" title={p}>
                            {getPlatformIcon(p)}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">None</span>
                      )}
                    </div>
                  )}
                </td>
                
                {canEdit && (
                  <td className="p-2">
                    <button
                      onClick={() => onDelete(kol.id)}
                      className="text-red-500 hover:text-red-400 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* KOL Profile Modal */}
      {selectedKOL && (
        <KOLProfileModal
          kolHandle={selectedKOL.handle}
          kolName={selectedKOL.name}
          isOpen={!!selectedKOL}
          onClose={() => setSelectedKOL(null)}
        />
      )}
    </>
  )
} 