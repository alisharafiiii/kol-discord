'use client'

import { useState, useEffect } from 'react'
import { X, Search, Upload, Check } from './icons'
import { KOL } from '@/lib/campaign'
import { Product } from '@/lib/types/product'

interface AddKOLModalProps {
  campaignId: string
  campaignName: string
  onClose: () => void
  onKOLAdded: (kol: KOL) => void
}

export default function AddKOLModal({ campaignId, campaignName, onClose, onKOLAdded }: AddKOLModalProps) {
  // Search state
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Product state
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  
  // KOL form data
  const [kolData, setKolData] = useState({
    handle: '',
    name: '',
    pfp: '',
    tier: 'micro' as KOL['tier'],
    stage: 'reached out' as KOL['stage'],
    device: 'na' as KOL['device'],
    budget: '',
    payment: 'pending' as KOL['payment'],
    views: 0,
    contact: '',
    links: '',
    platform: ['twitter'] as string[],
    productId: '',
    productCost: 0
  })
  
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
  
  // Fetch products on mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products?active=true')
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (err) {
        console.error('Error fetching products:', err)
      } finally {
        setLoadingProducts(false)
      }
    }
    
    fetchProducts()
  }, [])
  
  // Handle KOL selection from search
  const selectKOL = (kol: any) => {
    setKolData({
      ...kolData,
      handle: kol.handle || kol.twitterHandle || '',
      name: kol.name || '',
      pfp: kol.image || kol.profileImageUrl || '',
      tier: kol.tier || 'micro'
    })
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
      setKolData({ ...kolData, pfp: e.target?.result as string })
    }
    reader.readAsDataURL(file)
  }
  
  // Handle product selection
  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product || null)
    setKolData({
      ...kolData,
      productId,
      productCost: product?.price || 0,
      budget: product ? `$${product.price}` : kolData.budget,
      device: product ? 'owned' : 'na'
    })
  }
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!kolData.handle || !kolData.name) {
      setError('Please fill in all required fields')
      return
    }
    
    setIsSubmitting(true)
    
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/kols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...kolData,
          handle: kolData.handle.replace('@', ''),
          links: kolData.links.split(',').map(l => l.trim()).filter(Boolean),
          views: parseInt(kolData.views.toString()) || 0,
          productId: selectedProduct?.id,
          productCost: selectedProduct?.price || 0
        })
      })
      
      if (!res.ok) {
        throw new Error('Failed to add KOL')
      }
      
      const newKOL = await res.json()
      onKOLAdded(newKOL)
      onClose()
    } catch (err) {
      setError('Failed to add KOL. Please try again.')
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
                    value={kolData.handle}
                    onChange={(e) => setKolData({...kolData, handle: e.target.value})}
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
                    value={kolData.name}
                    onChange={(e) => setKolData({...kolData, name: e.target.value})}
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
                    {kolData.pfp && (
                      <img
                        src={kolData.pfp}
                        alt="Preview"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    )}
                  </div>
                </div>
                
                {/* Tier */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Tier
                  </label>
                  <select
                    value={kolData.tier}
                    onChange={(e) => setKolData({...kolData, tier: e.target.value as NonNullable<KOL['tier']>})}
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
                    value={kolData.contact}
                    onChange={(e) => setKolData({...kolData, contact: e.target.value})}
                    placeholder="@telegram or email"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                  />
                </div>
                
                {/* Stage */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Stage
                  </label>
                  <select
                    value={kolData.stage}
                    onChange={(e) => setKolData({...kolData, stage: e.target.value as KOL['stage']})}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="reached out">Reached Out</option>
                    <option value="preparing">Preparing</option>
                    <option value="posted">Posted</option>
                    <option value="done">Done</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                {/* Product/Device */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Product/Device
                  </label>
                  {loadingProducts ? (
                    <div className="w-full bg-black border border-green-500 rounded px-3 py-2 text-gray-500">
                      Loading products...
                    </div>
                  ) : (
                    <select
                      value={selectedProduct?.id || ''}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                    >
                      <option value="">No product assigned</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - ${product.price} {product.stock !== undefined && product.stock > 0 ? `(${product.stock} available)` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedProduct && (
                    <p className="text-xs text-green-400 mt-1">
                      Product cost will be added to budget: ${selectedProduct.price}
                    </p>
                  )}
                </div>
                
                {/* Budget */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={kolData.budget}
                    onChange={(e) => setKolData({...kolData, budget: e.target.value})}
                    placeholder="e.g. $500 or free"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                  />
                  {selectedProduct && (
                    <p className="text-xs text-gray-500 mt-1">
                      Includes product cost
                    </p>
                  )}
                </div>
                
                {/* Payment Status */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Payment
                  </label>
                  <select
                    value={kolData.payment}
                    onChange={(e) => setKolData({...kolData, payment: e.target.value as KOL['payment']})}
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 focus:outline-none focus:border-green-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                
                {/* Platform */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Platform
                  </label>
                  <select
                    value={kolData.platform[0]}
                    onChange={(e) => setKolData({...kolData, platform: [e.target.value]})}
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
                
                {/* Initial Views */}
                <div>
                  <label className="block text-sm font-medium text-green-300 mb-1">
                    Initial Views
                  </label>
                  <input
                    type="number"
                    value={kolData.views}
                    onChange={(e) => setKolData({...kolData, views: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-black border border-green-500 rounded text-green-300 placeholder-green-700 focus:outline-none focus:border-green-400"
                  />
                </div>
              </div>
              
              {/* Links - full width */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-green-300 mb-1">
                  Links
                </label>
                <textarea
                  value={kolData.links}
                  onChange={(e) => setKolData({...kolData, links: e.target.value})}
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
              <div className="bg-red-900/20 border border-red-500 p-3 rounded text-sm text-red-400">
                {error}
              </div>
            )}
            
            {/* Submit buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-green-300 hover:text-green-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-green-900 text-green-100 rounded hover:bg-green-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add KOL'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 