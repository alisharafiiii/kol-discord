'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'
import { Plus, Share, X, Download, Upload, Edit2, Trash2, Image as ImageIcon, FileText } from 'lucide-react'

// Safe image component with error handling
interface SafeImageProps {
  src: string
  alt: string
  fallbackSrc?: string
  className?: string
  fill?: boolean
  sizes?: string
  width?: number
  height?: number
  style?: React.CSSProperties
}

const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  fallbackSrc, 
  className,
  fill,
  sizes,
  width,
  height,
  style
}) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    setImgSrc(src)
    setHasError(false)
  }, [src])
  
  const handleError = () => {
    if (!hasError) {
      // Use fallback if provided, otherwise generate one
      const fallback = fallbackSrc || `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(alt || 'default')}`
      setImgSrc(fallback)
      setHasError(true)
    }
  }
  
  // For external images, use regular img tag instead of Next.js Image
  // This avoids configuration issues with external domains
  if (!hasError && imgSrc && !imgSrc.startsWith('https://api.dicebear.com') && !imgSrc.startsWith('/')) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        style={fill ? { 
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style
        } : {
          width: width || 'auto',
          height: height || 'auto',
          ...style
        }}
      />
    )
  }
  
  // For DiceBear avatars and local images, use Next.js Image
  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        onError={handleError}
        style={style}
      />
    )
  }
  
  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 100}
      height={height || 100}
      className={className}
      onError={handleError}
      style={style}
    />
  )
}

interface MetricEntry {
  id: string
  platform: string
  url: string
  authorName: string
  authorPfp: string
  likes: number
  shares: number
  comments: number
  impressions: number
  keyHighlights: string
  screenshots: string[]
  createdAt: string
  createdBy: string
  updatedAt?: string
  updatedBy?: string
}

interface Highlight {
  id: string
  text: string
  isEditing?: boolean
}

interface Screenshot {
  id: string
  url: string
  notes: string
}

interface CollageImage {
  id: string
  url: string
  notes: string
  tempId?: string
}

interface CollagePlaceholder {
  id: string
  type: 'portrait' | 'square' | 'rectangle' | 'large'
  image?: CollageImage
  row: number
  col: number
  rowSpan: number
  colSpan: number
}

interface CollageTemplate {
  id: string
  name: string
  placeholders: CollagePlaceholder[]
  gridCols: number
  gridRows: number
}

interface Campaign {
  id: string
  name: string
  createdBy: string
  createdAt: string
  totalLikes: number
  totalShares: number
  totalComments: number
  totalImpressions: number
  highlights?: Highlight[]
  heroBanner?: string
  screenshots?: Screenshot[]
}

const PLATFORMS = [
  { value: 'twitter', label: '𝕏 (Twitter)', emoji: '𝕏' },
  { value: 'instagram', label: 'Instagram', emoji: '📷' },
  { value: 'linkedin', label: 'LinkedIn', emoji: '💼' },
  { value: 'twitch', label: 'Twitch', emoji: '🎮' },
  { value: 'youtube', label: 'YouTube', emoji: '📺' },
  { value: 'tiktok', label: 'TikTok', emoji: '🎵' },
  { value: 'telegram', label: 'Telegram', emoji: '📨' },
  { value: 'discord', label: 'Discord', emoji: '💬' },
  { value: 'other', label: 'Other', emoji: '🌐' }
]

export default function CampaignDetailPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const campaignId = params.campaignId as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [entries, setEntries] = useState<MetricEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<MetricEntry | null>(null)
  const [editingHighlights, setEditingHighlights] = useState(false)
  const [campaignHighlights, setCampaignHighlights] = useState<string[]>([])
  
  // Form states
  const [formData, setFormData] = useState({
    platform: 'twitter',
    url: '',
    authorName: '',
    authorPfp: '',
    likes: 0,
    shares: 0,
    comments: 0,
    impressions: 0,
    keyHighlights: '',
    screenshots: [] as string[]
  })
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const [autoFetching, setAutoFetching] = useState(false)
  
  // Add missing state variables
  const [newHighlight, setNewHighlight] = useState('')
  const [uploadingHero, setUploadingHero] = useState(false)
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [newScreenshot, setNewScreenshot] = useState<{ url: string, notes: string }>({ url: '', notes: '' })
  
  // New collage builder states
  const [collageMode, setCollageMode] = useState(false)
  const [collageImages, setCollageImages] = useState<CollageImage[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CollageTemplate | null>(null)
  const [collageLayout, setCollageLayout] = useState<CollagePlaceholder[]>([])
  const [draggedImage, setDraggedImage] = useState<CollageImage | null>(null)
  const [hoveredPlaceholder, setHoveredPlaceholder] = useState<string | null>(null)

  // Check permissions - TEMPORARILY DISABLED FOR TESTING
  const canEdit = true // session?.user?.role === 'admin' || session?.user?.role === 'core'

  // Helper to format numbers compactly
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  // Add scroll reveal effect
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeInUp')
          }
        })
      },
      { threshold: 0.1 }
    )

    // Observe all elements with reveal class
    const elements = document.querySelectorAll('.reveal')
    elements.forEach((el) => observer.observe(el))

    return () => {
      elements.forEach((el) => observer.unobserve(el))
    }
  }, [campaign, entries]) // Re-run when content changes

  useEffect(() => {
    if (campaignId) {
      fetchCampaignData()
    }
  }, [campaignId])

  const fetchCampaignData = async () => {
    try {
      // Fetch campaign details
      const campaignRes = await fetch(`${window.location.origin}/api/metrics/campaigns?id=${campaignId}`)
      
      if (campaignRes.ok) {
        const data = await campaignRes.json()
        if (data.campaign) {
          setCampaign(data.campaign)
          setCampaignHighlights(data.campaign.highlights || [])
          setScreenshots(data.campaign.screenshots || [])
        }
      }
      
      // Fetch entries
      const entriesRes = await fetch(`${window.location.origin}/api/metrics?campaign=${campaignId}`)
      
      if (entriesRes.ok) {
        const data = await entriesRes.json()
        setEntries(data.entries || [])
      }
    } catch (error) {
      console.error('Error fetching campaign data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !campaign) return

    setUploadingScreenshot(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('campaignId', campaignId)
    formData.append('type', 'screenshot')

    try {
      const res = await fetch(`${window.location.origin}/api/upload/campaign-image`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const { url } = await res.json()
        setNewScreenshot({ ...newScreenshot, url })
      }
    } catch (error) {
      console.error('Error uploading screenshot:', error)
      alert('Failed to upload screenshot')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const handlePostScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingScreenshot(true)
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    uploadFormData.append('campaignId', campaignId)
    uploadFormData.append('type', 'post-screenshot')

    try {
      const res = await fetch(`${window.location.origin}/api/upload/campaign-image`, {
        method: 'POST',
        body: uploadFormData
      })

      if (res.ok) {
        const { url } = await res.json()
        setFormData(prev => ({
          ...prev,
          screenshots: [...prev.screenshots, url]
        }))
      }
    } catch (error) {
      console.error('Error uploading post screenshot:', error)
      alert('Failed to upload screenshot')
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const handleAutoFetch = async () => {
    if (!formData.url || (!formData.url.includes('twitter.com') && !formData.url.includes('x.com'))) {
      alert('Please enter a valid Twitter/X URL')
      return
    }

    setAutoFetching(true)
    try {
      const res = await fetch(`${window.location.origin}/api/metrics/fetch-twitter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: formData.url })
      })

      if (res.ok) {
        const data = await res.json()
        setFormData(prev => ({
          ...prev,
          authorName: data.authorName || prev.authorName,
          authorPfp: data.authorPfp || prev.authorPfp,
          likes: data.likes || prev.likes,
          shares: data.retweets || prev.shares,
          comments: data.replies || prev.comments,
          impressions: data.impressions || prev.impressions
        }))
        alert('Twitter data fetched successfully!')
      } else {
        const errorData = await res.json()
        console.error('Fetch error:', errorData)
        alert('Failed to fetch Twitter data. You can still enter manually.')
      }
    } catch (error) {
      console.error('Error fetching Twitter data:', error)
      alert('Failed to fetch Twitter data. You can still enter manually.')
    } finally {
      setAutoFetching(false)
    }
  }

  // Helper to validate if URL is an image
  const isValidImageUrl = (url: string): boolean => {
    if (!url) return true // Empty is valid (will use fallback)
    
    try {
      const urlObj = new URL(url)
      
      // Check if URL ends with image extension
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
      const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().endsWith(ext))
      
      // Check if it's from known image hosting services
      const imageHosts = [
        'pbs.twimg.com',
        'api.dicebear.com',
        'imgur.com',
        'i.imgur.com',
        'cloudinary.com',
        'avatars.githubusercontent.com',
        'lh3.googleusercontent.com',
        'graph.facebook.com',
        'instagram.com',
        'cdninstagram.com',
        'scontent.cdninstagram.com'
      ]
      
      const isImageHost = imageHosts.some(host => urlObj.hostname.includes(host))
      
      // Check if URL contains common image paths
      const hasImagePath = url.includes('/photo') || url.includes('/image') || url.includes('/img') || url.includes('/avatar')
      
      return hasImageExtension || isImageHost || (hasImagePath && !url.includes('x.com') && !url.includes('twitter.com'))
    } catch {
      return false
    }
  }

  // Generate fallback avatar based on author name
  const getFallbackAvatar = (authorName: string) => {
    return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(authorName || 'default')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate author profile picture URL
    if (formData.authorPfp && !isValidImageUrl(formData.authorPfp)) {
      alert('Please enter a valid image URL for the author profile picture, or leave it empty to use a default avatar.')
      return
    }
    
    try {
      const method = editingEntry ? 'PUT' : 'POST'
      
      // Prepare data with fallback avatar if needed
      const dataToSend = {
        ...formData,
        authorPfp: formData.authorPfp && isValidImageUrl(formData.authorPfp) 
          ? formData.authorPfp 
          : getFallbackAvatar(formData.authorName),
        campaignId
      }
      
      const body = editingEntry 
        ? { ...dataToSend, entryId: editingEntry.id }
        : dataToSend
      
      console.log('[handleSubmit] Method:', method)
      console.log('[handleSubmit] Body:', body)
      console.log('[handleSubmit] Editing entry ID:', editingEntry?.id)
        
      const res = await fetch(`${window.location.origin}/api/metrics`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      console.log('[handleSubmit] Response status:', res.status)
      const responseData = await res.json()
      console.log('[handleSubmit] Response data:', responseData)

      if (res.ok) {
        await fetchCampaignData()
        setShowAddForm(false)
        resetForm()
      } else {
        alert(`Failed to save post: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error saving metric:', error)
      alert('Failed to save metric')
    }
  }

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return
    
    console.log('[handleDeleteEntry] Deleting entry ID:', entryId)
    console.log('[handleDeleteEntry] Campaign ID:', campaignId)
    
    try {
      const res = await fetch(`${window.location.origin}/api/metrics?campaign=${campaignId}&entryId=${entryId}`, {
        method: 'DELETE'
      })

      console.log('[handleDeleteEntry] Response status:', res.status)
      const responseData = await res.json()
      console.log('[handleDeleteEntry] Response data:', responseData)

      if (res.ok) {
        await fetchCampaignData()
      } else {
        console.error('Delete error:', responseData)
        alert(`Failed to delete entry: ${responseData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
      alert('Failed to delete entry')
    }
  }

  const handleUpdateHighlights = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: campaignId,
          highlights: campaignHighlights.filter(h => h.trim() !== '')
        })
      })

      if (res.ok) {
        const data = await res.json()
        setCampaign(data.campaign)
        setEditingHighlights(false)
        alert('Highlights updated successfully!')
      }
    } catch (error) {
      console.error('Error updating highlights:', error)
      alert('Failed to update highlights')
    }
  }

  const handleEditEntry = (entry: MetricEntry) => {
    setEditingEntry(entry)
    setFormData({
      platform: entry.platform,
      url: entry.url,
      authorName: entry.authorName,
      authorPfp: entry.authorPfp,
      likes: entry.likes,
      shares: entry.shares,
      comments: entry.comments,
      impressions: entry.impressions,
      keyHighlights: entry.keyHighlights,
      screenshots: entry.screenshots || []
    })
    setShowAddForm(true)
  }

  const handleShare = async () => {
    try {
      const res = await fetch(`${window.location.origin}/api/metrics/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId })
      })

      if (res.ok) {
        const data = await res.json()
        const url = `${window.location.origin}/metrics/share/${data.shareId}`
        navigator.clipboard.writeText(url)
        alert('Share link copied to clipboard!')
      } else {
        const errorData = await res.json()
        console.error('Share error:', errorData)
        alert('Failed to generate share link')
      }
    } catch (error) {
      console.error('Error generating share link:', error)
      alert('Failed to generate share link')
    }
  }

  const resetForm = () => {
    setFormData({
      platform: 'twitter',
      url: '',
      authorName: '',
      authorPfp: '',
      likes: 0,
      shares: 0,
      comments: 0,
      impressions: 0,
      keyHighlights: '',
      screenshots: []
    })
    setEditingEntry(null)
  }

  const calculateTotals = () => {
    return entries.reduce((acc, entry) => ({
      likes: acc.likes + entry.likes,
      shares: acc.shares + entry.shares,
      comments: acc.comments + entry.comments,
      impressions: acc.impressions + entry.impressions
    }), { likes: 0, shares: 0, comments: 0, impressions: 0 })
  }

  const handleAddHighlight = async () => {
    if (!newHighlight.trim() || !campaign) return

    const updatedHighlights = [
      ...(campaign.highlights || []),
      { id: Date.now().toString(), text: newHighlight.trim() }
    ]

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, highlights: updatedHighlights })
    })

    if (res.ok) {
      setCampaign({ ...campaign, highlights: updatedHighlights })
      setNewHighlight('')
    }
  }

  const handleDeleteHighlight = async (id: string) => {
    if (!campaign) return

    const updatedHighlights = campaign.highlights?.filter(h => h.id !== id) || []

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, highlights: updatedHighlights })
    })

    if (res.ok) {
      setCampaign({ ...campaign, highlights: updatedHighlights })
    }
  }

  const handleUpdateHighlight = async (id: string, newText: string) => {
    if (!campaign) return

    const updatedHighlights = campaign.highlights?.map(h => 
      h.id === id ? { ...h, text: newText, isEditing: false } : h
    ) || []

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, highlights: updatedHighlights })
    })

    if (res.ok) {
      setCampaign({ ...campaign, highlights: updatedHighlights })
    }
  }

  const handleHeroBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !campaign) return

    setUploadingHero(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('campaignId', campaignId)
    formData.append('type', 'hero')

    try {
      const res = await fetch(`${window.location.origin}/api/upload/campaign-image`, {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        const { url } = await res.json()
        
        // Update campaign with hero banner
        const updateRes = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: campaignId, heroBanner: url })
        })

        if (updateRes.ok) {
          setCampaign({ ...campaign, heroBanner: url })
        }
      }
    } catch (error) {
      console.error('Error uploading hero banner:', error)
      alert('Failed to upload hero banner')
    } finally {
      setUploadingHero(false)
    }
  }

  const handleAddScreenshot = async () => {
    if (!newScreenshot.url || !campaign) return

    const updatedScreenshots = [
      ...screenshots,
      { id: Date.now().toString(), ...newScreenshot }
    ]

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, screenshots: updatedScreenshots })
    })

    if (res.ok) {
      setScreenshots(updatedScreenshots)
      setCampaign({ ...campaign, screenshots: updatedScreenshots })
      setNewScreenshot({ url: '', notes: '' })
    }
  }

  const handleDeleteScreenshot = async (id: string) => {
    if (!campaign) return

    const updatedScreenshots = screenshots.filter(s => s.id !== id)

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, screenshots: updatedScreenshots })
    })

    if (res.ok) {
      setScreenshots(updatedScreenshots)
      setCampaign({ ...campaign, screenshots: updatedScreenshots })
    }
  }

  // Collage Builder Functions
  const handleCollageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaignId', campaignId)
      formData.append('type', 'collage-temp')

      try {
        const res = await fetch(`${window.location.origin}/api/upload/campaign-image`, {
          method: 'POST',
          body: formData
        })

        if (res.ok) {
          const { url } = await res.json()
          const newImage: CollageImage = {
            id: Date.now().toString() + i,
            url,
            notes: '',
            tempId: Date.now().toString() + i
          }
          setCollageImages(prev => [...prev, newImage])
        }
      } catch (error) {
        console.error('Error uploading collage image:', error)
      }
    }
  }

  const handleDragStart = (image: CollageImage) => {
    setDraggedImage(image)
  }

  const handleDragEnd = () => {
    setDraggedImage(null)
    setHoveredPlaceholder(null)
  }

  const handleDragOver = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault()
    setHoveredPlaceholder(placeholderId)
  }

  const handleDragLeave = () => {
    setHoveredPlaceholder(null)
  }

  const handleDrop = (e: React.DragEvent, placeholderId: string) => {
    e.preventDefault()
    if (!draggedImage || !selectedTemplate) return

    const updatedLayout = collageLayout.map(p => {
      if (p.id === placeholderId) {
        return { ...p, image: draggedImage }
      }
      // Remove image from previous placeholder if it was already placed
      if (p.image?.id === draggedImage.id) {
        return { ...p, image: undefined }
      }
      return p
    })

    setCollageLayout(updatedLayout)
    setHoveredPlaceholder(null)
  }

  const handleTemplateSelect = (template: CollageTemplate) => {
    setSelectedTemplate(template)
    setCollageLayout(template.placeholders.map(p => ({ ...p })))
  }

  const removeImageFromPlaceholder = (placeholderId: string) => {
    const updatedLayout = collageLayout.map(p => 
      p.id === placeholderId ? { ...p, image: undefined } : p
    )
    setCollageLayout(updatedLayout)
  }

  const saveCollage = async () => {
    if (!campaign || collageLayout.length === 0) return

    // Filter out placeholders without images and create final screenshots
    const finalScreenshots = collageLayout
      .filter(p => p.image)
      .map(p => ({
        id: Date.now().toString() + Math.random(),
        url: p.image!.url,
        notes: p.image!.notes || ''
      }))

    const updatedScreenshots = [...screenshots, ...finalScreenshots]

    const res = await fetch(`${window.location.origin}/api/metrics/campaigns`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: campaignId, screenshots: updatedScreenshots })
    })

    if (res.ok) {
      setScreenshots(updatedScreenshots)
      setCampaign({ ...campaign, screenshots: updatedScreenshots })
      setCollageMode(false)
      setCollageImages([])
      setSelectedTemplate(null)
      setCollageLayout([])
      setDraggedImage(null)
      setHoveredPlaceholder(null)
      alert('Collage saved successfully!')
    }
  }

  // Predefined collage templates
  const collageTemplates: CollageTemplate[] = [
    {
      id: 'default-five',
      name: 'Default (1 Portrait + 4)',
      gridCols: 3,
      gridRows: 2,
      placeholders: [
        { id: 'p1', type: 'portrait', row: 1, col: 1, rowSpan: 2, colSpan: 1 },
        { id: 'p2', type: 'rectangle', row: 1, col: 2, rowSpan: 1, colSpan: 1 },
        { id: 'p3', type: 'rectangle', row: 1, col: 3, rowSpan: 1, colSpan: 1 },
        { id: 'p4', type: 'rectangle', row: 2, col: 2, rowSpan: 1, colSpan: 1 },
        { id: 'p5', type: 'rectangle', row: 2, col: 3, rowSpan: 1, colSpan: 1 }
      ]
    },
    {
      id: 'single',
      name: 'Single Image',
      gridCols: 1,
      gridRows: 1,
      placeholders: [
        { id: 'p1', type: 'large', row: 1, col: 1, rowSpan: 1, colSpan: 1 }
      ]
    },
    {
      id: 'duo',
      name: 'Side by Side',
      gridCols: 2,
      gridRows: 1,
      placeholders: [
        { id: 'p1', type: 'portrait', row: 1, col: 1, rowSpan: 1, colSpan: 1 },
        { id: 'p2', type: 'portrait', row: 1, col: 2, rowSpan: 1, colSpan: 1 }
      ]
    },
    {
      id: 'hero-duo',
      name: 'Hero + Side',
      gridCols: 2,
      gridRows: 2,
      placeholders: [
        { id: 'p1', type: 'large', row: 1, col: 1, rowSpan: 2, colSpan: 1 },
        { id: 'p2', type: 'square', row: 1, col: 2, rowSpan: 1, colSpan: 1 },
        { id: 'p3', type: 'square', row: 2, col: 2, rowSpan: 1, colSpan: 1 }
      ]
    },
    {
      id: 'quad',
      name: '2x2 Grid',
      gridCols: 2,
      gridRows: 2,
      placeholders: [
        { id: 'p1', type: 'square', row: 1, col: 1, rowSpan: 1, colSpan: 1 },
        { id: 'p2', type: 'square', row: 1, col: 2, rowSpan: 1, colSpan: 1 },
        { id: 'p3', type: 'square', row: 2, col: 1, rowSpan: 1, colSpan: 1 },
        { id: 'p4', type: 'square', row: 2, col: 2, rowSpan: 1, colSpan: 1 }
      ]
    },
    {
      id: 'hero-quad',
      name: 'Hero + Grid',
      gridCols: 3,
      gridRows: 2,
      placeholders: [
        { id: 'p1', type: 'large', row: 1, col: 1, rowSpan: 2, colSpan: 2 },
        { id: 'p2', type: 'square', row: 1, col: 3, rowSpan: 1, colSpan: 1 },
        { id: 'p3', type: 'square', row: 2, col: 3, rowSpan: 1, colSpan: 1 }
      ]
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl animate-pulse">Loading campaign...</div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Campaign not found</h1>
          <button
            onClick={() => router.push('/metrics')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Campaigns
          </button>
        </div>
      </div>
    )
  }

  const totals = calculateTotals()

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 reveal">
          <div className="flex justify-between items-start">
            <div>
              <button
                onClick={() => router.push('/metrics')}
                className="text-sm text-gray-600 hover:text-gray-900 mb-2 flex items-center gap-1"
              >
                ← Back to Campaigns
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{campaign.name}</h1>
              <p className="text-gray-600 mt-2">
                Created on {new Date(campaign.createdAt).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={handleShare}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Share Report
            </button>
          </div>
        </div>

        {/* Hero Banner Section */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg p-6 mb-8 shadow-xl reveal">
          <h2 className="text-xl font-semibold mb-4 text-white">Hero Banner</h2>
          <p className="text-sm text-gray-400 mb-4">Recommended size: 1200x400px (3:1 ratio) for best display on all devices</p>
          
          {campaign?.heroBanner ? (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-lg z-10"></div>
              <div className="relative w-full" style={{ height: '400px' }}>
                <SafeImage
                  src={campaign.heroBanner} 
                  alt="Campaign hero banner" 
                  className="rounded-lg object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  fill
                  sizes="(max-width: 1280px) 100vw, 1280px"
                />
              </div>
              <label className="absolute bottom-4 right-4 cursor-pointer z-20">
                <input
                  type="file"
                  onChange={handleHeroBannerUpload}
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingHero}
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600/90 backdrop-blur text-white rounded-lg hover:bg-blue-700 transition-all">
                  <Upload className="w-4 h-4" />
                  Replace Banner
                </div>
              </label>
            </div>
          ) : (
            <label className="cursor-pointer">
              <input
                type="file"
                onChange={handleHeroBannerUpload}
                accept="image/*"
                className="hidden"
                disabled={uploadingHero}
              />
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 transition-colors bg-gradient-to-br from-gray-800/50 to-gray-700/50">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-400">
                  {uploadingHero ? 'Uploading...' : 'Click to upload hero banner'}
                </p>
              </div>
            </label>
          )}
        </div>

        {/* Campaign Highlights */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg p-6 mb-8 shadow-xl reveal">
          <h2 className="text-xl font-semibold mb-4 text-white">Campaign Highlights</h2>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Add a highlight..."
              value={newHighlight}
              onChange={(e) => setNewHighlight(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddHighlight()}
              className="flex-1 px-4 py-2 bg-gray-800/70 backdrop-blur rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
            />
            <button
              onClick={handleAddHighlight}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all"
            >
              Add
            </button>
          </div>

          <div className="space-y-2">
            {campaign?.highlights?.map((highlight) => (
              <div key={highlight.id} className="flex items-center gap-2 p-3 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-lg backdrop-blur">
                {highlight.isEditing ? (
                  <input
                    type="text"
                    defaultValue={highlight.text}
                    onBlur={(e) => handleUpdateHighlight(highlight.id, e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateHighlight(highlight.id, (e.target as HTMLInputElement).value)
                      }
                    }}
                    className="flex-1 px-2 py-1 bg-gray-700/50 rounded text-white"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 text-white">{highlight.text}</span>
                    <button
                      onClick={() => {
                        const updated = campaign.highlights?.map(h => 
                          h.id === highlight.id ? { ...h, isEditing: true } : h
                        ) || []
                        setCampaign({ ...campaign, highlights: updated })
                      }}
                      className="p-1 hover:bg-gray-600/50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-gray-300" />
                    </button>
                    <button
                      onClick={() => handleDeleteHighlight(highlight.id)}
                      className="p-1 hover:bg-gray-600/50 rounded text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Screenshot Gallery */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg p-6 mb-8 shadow-xl reveal">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Campaign Screenshots</h2>
            <div className="flex gap-2">
              {!collageMode && (
                <button
                  onClick={() => {
                    setCollageMode(true)
                    // Auto-select the default template
                    const defaultTemplate = collageTemplates.find(t => t.id === 'default-five')
                    if (defaultTemplate) {
                      handleTemplateSelect(defaultTemplate)
                    }
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                  Collage Builder
                </button>
              )}
              {collageMode && (
                <>
                  <button
                    onClick={saveCollage}
                    disabled={!collageLayout.some(p => p.image)}
                    className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 disabled:opacity-50 transition-all"
                  >
                    Save Collage
                  </button>
                  <button
                    onClick={() => {
                      setCollageMode(false)
                      setCollageImages([])
                      setSelectedTemplate(null)
                      setCollageLayout([])
                      setDraggedImage(null)
                      setHoveredPlaceholder(null)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:from-gray-700 hover:to-gray-800 transition-all"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          
          {!collageMode ? (
            <>
              {/* Traditional Screenshot Upload */}
              <div className="mb-6">
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Screenshot</label>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        onChange={handleScreenshotUpload}
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingScreenshot}
                      />
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center hover:border-gray-400 transition-colors bg-gradient-to-br from-gray-800/50 to-gray-700/50">
                        {newScreenshot.url ? (
                          <SafeImage
                            src={newScreenshot.url}
                            alt="Preview"
                            className="max-h-32 mx-auto"
                          />
                        ) : (
                          <div>
                            <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-400">
                              {uploadingScreenshot ? 'Uploading...' : 'Click to upload screenshot'}
                            </p>
                          </div>
                        )}
                      </div>
                    </label>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2 text-gray-300">Notes</label>
                    <textarea
                      placeholder="Add notes about this screenshot..."
                      value={newScreenshot.notes}
                      onChange={(e) => setNewScreenshot({ ...newScreenshot, notes: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-800/70 backdrop-blur rounded-lg resize-none text-white placeholder-gray-400"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={handleAddScreenshot}
                    disabled={!newScreenshot.url}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all"
                  >
                    Add Screenshot
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {screenshots.map((screenshot) => (
                  <div key={screenshot.id} className="bg-gradient-to-br from-gray-800/50 to-gray-700/50 rounded-lg p-4 backdrop-blur">
                    <SafeImage
                      src={screenshot.url} 
                      alt="Campaign screenshot" 
                      className="w-full rounded-lg mb-3 object-cover hover:scale-[1.02] transition-transform cursor-pointer"
                      style={{ maxHeight: '200px' }}
                    />
                    <p className="text-sm text-gray-300 mb-3">{screenshot.notes}</p>
                    <button
                      onClick={() => handleDeleteScreenshot(screenshot.id)}
                      className="text-red-400 hover:text-red-300 text-sm transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              {/* Collage Builder Mode */}
              <div className="space-y-6">
                {/* Template Selection */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Choose a Template</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {collageTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 hover:border-gray-400 bg-gray-800/50'
                        }`}
                      >
                        <div 
                          className="grid gap-1 mb-2 aspect-square"
                          style={{
                            gridTemplateColumns: `repeat(${template.gridCols}, 1fr)`,
                            gridTemplateRows: `repeat(${template.gridRows}, 1fr)`
                          }}
                        >
                          {template.placeholders.map((p) => (
                            <div
                              key={p.id}
                              className="bg-gray-600 rounded"
                              style={{
                                gridColumn: `${p.col} / span ${p.colSpan}`,
                                gridRow: `${p.row} / span ${p.rowSpan}`
                              }}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-300">{template.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Image Tray */}
                <div>
                  <h3 className="text-lg font-medium text-white mb-3">Image Gallery</h3>
                  <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur">
                    <div className="mb-4">
                      <label className="cursor-pointer inline-block">
                        <input
                          type="file"
                          multiple
                          onChange={handleCollageImageUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          Upload Images
                        </div>
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-40 overflow-y-auto">
                      {collageImages.map((image) => (
                        <div
                          key={image.id}
                          draggable
                          onDragStart={() => handleDragStart(image)}
                          onDragEnd={handleDragEnd}
                          className="relative aspect-square cursor-move hover:opacity-80 transition-opacity"
                        >
                          <SafeImage
                            src={image.url}
                            alt="Collage image"
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ))}
                      {collageImages.length === 0 && (
                        <div className="col-span-full text-center py-8 text-gray-400">
                          Upload images to start building your collage
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collage Preview */}
                {selectedTemplate && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-3">Collage Preview</h3>
                    <div className="bg-gray-800/50 rounded-lg p-6 backdrop-blur">
                      <div 
                        className="grid gap-2 mx-auto"
                        style={{
                          gridTemplateColumns: `repeat(${selectedTemplate.gridCols}, 1fr)`,
                          gridTemplateRows: `repeat(${selectedTemplate.gridRows}, 200px)`,
                          maxWidth: '800px'
                        }}
                      >
                        {collageLayout.map((placeholder) => (
                          <div
                            key={placeholder.id}
                            onDragOver={(e) => handleDragOver(e, placeholder.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, placeholder.id)}
                            className={`relative rounded-lg overflow-hidden transition-all ${
                              hoveredPlaceholder === placeholder.id ? 'ring-2 ring-purple-500' : ''
                            }`}
                            style={{
                              gridColumn: `${placeholder.col} / span ${placeholder.colSpan}`,
                              gridRow: `${placeholder.row} / span ${placeholder.rowSpan}`
                            }}
                          >
                            {placeholder.image ? (
                              <>
                                <SafeImage
                                  src={placeholder.image.url}
                                  alt="Placed image"
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => removeImageFromPlaceholder(placeholder.id)}
                                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs hover:bg-red-600 transition-colors"
                                >
                                  ×
                                </button>
                              </>
                            ) : (
                              <div className="w-full h-full bg-gray-700 border-2 border-dashed border-gray-600 flex items-center justify-center">
                                <div className="text-center">
                                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                                  <p className="text-xs text-gray-500">
                                    {placeholder.type === 'portrait' && 'Portrait (Tall)'}
                                    {placeholder.type === 'square' && 'Square'}
                                    {placeholder.type === 'rectangle' && 'Rectangle (Wide)'}
                                    {placeholder.type === 'large' && 'Large'}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">Drag image here</p>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {/* Visual guide */}
                      <div className="mt-6 text-center text-sm text-gray-400">
                        <p>Drag images from the gallery above into the placeholders</p>
                        <p className="mt-1">Click × to remove an image • Images auto-scale to fit</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Totals Summary */}
        <div className="bg-gradient-to-br from-white via-gray-50 to-white rounded-lg shadow-md p-4 mb-8 border border-gray-100 reveal">
          <h2 className="text-lg font-semibold mb-3">Campaign Totals</h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-blue-100 rounded hover:from-blue-100 hover:to-blue-200 transition-all cursor-pointer">
              <p className="text-xl font-bold text-blue-600">{formatNumber(totals.likes)}</p>
              <p className="text-xs text-gray-600">Likes</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-green-50 to-green-100 rounded hover:from-green-100 hover:to-green-200 transition-all cursor-pointer">
              <p className="text-xl font-bold text-green-600">{formatNumber(totals.shares)}</p>
              <p className="text-xs text-gray-600">Shares</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-purple-100 rounded hover:from-purple-100 hover:to-purple-200 transition-all cursor-pointer">
              <p className="text-xl font-bold text-purple-600">{formatNumber(totals.comments)}</p>
              <p className="text-xs text-gray-600">Comments</p>
            </div>
            <div className="text-center p-2 bg-gradient-to-br from-orange-50 to-orange-100 rounded hover:from-orange-100 hover:to-orange-200 transition-all cursor-pointer">
              <p className="text-xl font-bold text-orange-600">{formatNumber(totals.impressions)}</p>
              <p className="text-xs text-gray-600">Impressions</p>
            </div>
          </div>
        </div>

        {/* Posts Management */}
        <div className="bg-white rounded-lg shadow-md p-6 reveal">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Posts & Metrics</h2>
            {canEdit && (
              <button
                onClick={() => {
                  resetForm()
                  setShowAddForm(!showAddForm)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {showAddForm ? 'Cancel' : 'Add Post'}
              </button>
            )}
          </div>

          {/* Add/Edit Form */}
          {showAddForm && canEdit && (
            <form onSubmit={handleSubmit} className="border-t pt-4 mt-4 space-y-4">
              <h3 className="text-lg font-medium mb-3 text-gray-900">
                {editingEntry ? 'Edit Post' : 'Add New Post'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Platform
                  </label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                  >
                    {PLATFORMS.map(platform => (
                      <option key={platform.value} value={platform.value} className="text-gray-900">
                        {platform.emoji} {platform.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Post URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                      placeholder="https://twitter.com/..."
                      required
                    />
                    {formData.platform === 'twitter' && (
                      <button
                        type="button"
                        onClick={handleAutoFetch}
                        disabled={autoFetching}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                      >
                        {autoFetching ? 'Fetching...' : 'Auto-Fetch'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Author Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={formData.authorName}
                    onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Author Profile Picture URL
                  </label>
                  <input
                    type="url"
                    value={formData.authorPfp}
                    onChange={(e) => setFormData(prev => ({ ...prev, authorPfp: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                    placeholder="https://example.com/image.jpg (optional)"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter a direct image URL or leave empty for auto-generated avatar
                  </p>
                </div>

                {/* Metrics */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Likes
                  </label>
                  <input
                    type="number"
                    value={formData.likes}
                    onChange={(e) => setFormData(prev => ({ ...prev, likes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shares/Retweets
                  </label>
                  <input
                    type="number"
                    value={formData.shares}
                    onChange={(e) => setFormData(prev => ({ ...prev, shares: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments/Replies
                  </label>
                  <input
                    type="number"
                    value={formData.comments}
                    onChange={(e) => setFormData(prev => ({ ...prev, comments: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Impressions/Views
                  </label>
                  <input
                    type="number"
                    value={formData.impressions}
                    onChange={(e) => setFormData(prev => ({ ...prev, impressions: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                    min="0"
                  />
                </div>
              </div>

              {/* Key Highlights */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Post Highlights
                </label>
                <textarea
                  value={formData.keyHighlights}
                  onChange={(e) => setFormData(prev => ({ ...prev, keyHighlights: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  rows={2}
                  placeholder="Brief summary of this specific post..."
                />
              </div>

              {/* Screenshots */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Screenshots
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePostScreenshotUpload}
                    disabled={uploadingScreenshot}
                    className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {uploadingScreenshot && <p className="text-sm text-gray-500">Uploading...</p>}
                  <div className="flex gap-2 flex-wrap">
                    {formData.screenshots.map((url, idx) => (
                      <div key={idx} className="relative w-20 h-20">
                        <SafeImage
                          src={url}
                          alt={`Screenshot ${idx + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            screenshots: prev.screenshots.filter((_, i) => i !== idx)
                          }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingEntry ? 'Update Post' : 'Add Post'}
              </button>
            </form>
          )}

          {/* Posts List */}
          <div className="mt-6 space-y-2 reveal-stagger">
            {entries.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No posts added yet. Click "Add Post" to get started.</p>
            ) : (
              entries.map((entry) => {
                const platform = PLATFORMS.find(p => p.value === entry.platform)
                return (
                  <div key={entry.id} className="border rounded p-2 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2 flex-1 items-center">
                        {/* Author Profile Picture - Bigger */}
                        {entry.authorPfp && (
                          <div className="relative w-10 h-10 flex-shrink-0">
                            <SafeImage
                              src={entry.authorPfp}
                              alt={entry.authorName}
                              fallbackSrc={getFallbackAvatar(entry.authorName)}
                              fill
                              sizes="40px"
                              className="rounded-full object-cover"
                            />
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-xs">{platform?.emoji}</span>
                            <h4 className="font-medium text-xs truncate">{entry.authorName}</h4>
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              →
                            </a>
                          </div>

                          {/* Metrics - Very compact with clickable gradient boxes */}
                          <div className="flex gap-1 text-xs">
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gradient-to-br from-red-50 to-red-100 px-1.5 py-0.5 rounded hover:from-red-100 hover:to-red-200 transition-all"
                              title={`${entry.likes} likes`}
                            >
                              <span>❤️{formatNumber(entry.likes)}</span>
                            </a>
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gradient-to-br from-green-50 to-green-100 px-1.5 py-0.5 rounded hover:from-green-100 hover:to-green-200 transition-all"
                              title={`${entry.shares} shares`}
                            >
                              <span>🔄{formatNumber(entry.shares)}</span>
                            </a>
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gradient-to-br from-blue-50 to-blue-100 px-1.5 py-0.5 rounded hover:from-blue-100 hover:to-blue-200 transition-all"
                              title={`${entry.comments} comments`}
                            >
                              <span>💬{formatNumber(entry.comments)}</span>
                            </a>
                            <a
                              href={entry.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-gradient-to-br from-purple-50 to-purple-100 px-1.5 py-0.5 rounded hover:from-purple-100 hover:to-purple-200 transition-all"
                              title={`${entry.impressions} impressions`}
                            >
                              <span>👁️{formatNumber(entry.impressions)}</span>
                            </a>
                          </div>

                          {/* Highlights - Only show if exists, very compact */}
                          {entry.keyHighlights && (
                            <p className="text-xs text-gray-500 truncate mt-0.5" title={entry.keyHighlights}>
                              {entry.keyHighlights}
                            </p>
                          )}
                        </div>

                        {/* Screenshots - Tiny thumbnails */}
                        {entry.screenshots && entry.screenshots.length > 0 && (
                          <div className="flex gap-0.5">
                            {entry.screenshots.slice(0, 2).map((url, idx) => (
                              <div key={idx} className="relative w-8 h-8">
                                <SafeImage
                                  src={url}
                                  alt={`Screenshot ${idx + 1}`}
                                  fill
                                  sizes="80px"
                                  className="object-cover rounded"
                                />
                              </div>
                            ))}
                            {entry.screenshots.length > 2 && (
                              <span className="text-xs text-gray-400 flex items-center px-1">
                                +{entry.screenshots.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions - Tiny buttons */}
                      {canEdit && (
                        <div className="flex gap-1 ml-2 flex-shrink-0">
                          <button
                            onClick={() => handleEditEntry(entry)}
                            className="px-1.5 py-0.5 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Del
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </main>
  )
} 