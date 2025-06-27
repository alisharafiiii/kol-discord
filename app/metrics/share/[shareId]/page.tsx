'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'
import Image from 'next/image'

interface Screenshot {
  id: string
  url: string
  notes: string
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

interface SharedMetricsData {
  campaign: {
    id: string
    name: string
    highlights?: any[]
    heroBanner?: string
    screenshots?: Screenshot[]
  }
  entries: MetricEntry[]
}

// Safe image component with error handling
interface SafeImageProps {
  src: string
  alt: string
  className?: string
  fill?: boolean
  sizes?: string
  width?: number
  height?: number
  onClick?: () => void
}

const SafeImage: React.FC<SafeImageProps> = ({ 
  src, 
  alt, 
  className,
  fill,
  sizes,
  width,
  height,
  onClick
}) => {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)
  
  useEffect(() => {
    setImgSrc(src)
    setHasError(false)
  }, [src])
  
  const handleError = () => {
    if (!hasError) {
      // Use a fallback avatar based on the alt text
      const fallbackSrc = `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(alt || 'default')}`
      setImgSrc(fallbackSrc)
      setHasError(true)
    }
  }
  
  // For external images, use regular img tag instead of Next.js Image
  // This avoids configuration issues with external domains
  if (!hasError && imgSrc && !imgSrc.startsWith('https://api.dicebear.com')) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        onClick={onClick}
        style={fill ? { 
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        } : {
          width: width || 'auto',
          height: height || 'auto'
        }}
      />
    )
  }
  
  // For DiceBear avatars, use Next.js Image (it's a known domain)
  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt}
        fill
        sizes={sizes}
        className={className}
        onError={handleError}
        onClick={onClick}
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
      onClick={onClick}
    />
  )
}

const PLATFORM_INFO = {
  twitter: { 
    label: 'Twitter/X', 
    emoji: '𝕏',
    gradient: 'from-gray-700 to-black',
    color: '#000000'
  },
  instagram: { 
    label: 'Instagram', 
    emoji: '📷',
    gradient: 'from-purple-500 via-pink-500 to-orange-400',
    color: '#E4405F'
  },
  linkedin: { 
    label: 'LinkedIn', 
    emoji: '💼',
    gradient: 'from-blue-600 to-blue-800',
    color: '#0A66C2'
  },
  youtube: { 
    label: 'YouTube', 
    emoji: '🎥',
    gradient: 'from-red-600 to-red-800',
    color: '#FF0000'
  },
  facebook: { 
    label: 'Facebook', 
    emoji: '👍',
    gradient: 'from-blue-500 to-blue-700',
    color: '#1877F2'
  },
  telegram: { 
    label: 'Telegram', 
    emoji: '✈️',
    gradient: 'from-blue-400 to-blue-600',
    color: '#2AABEE'
  },
  tiktok: { 
    label: 'TikTok', 
    emoji: '🎵',
    gradient: 'from-black via-gray-800 to-pink-500',
    color: '#000000'
  },
  warpcast: { 
    label: 'Warpcast', 
    emoji: '🏰',
    gradient: 'from-purple-600 to-purple-800',
    color: '#7A46CC'
  },
  lens: { 
    label: 'Lens', 
    emoji: '🌿',
    gradient: 'from-green-500 to-green-700',
    color: '#00C853'
  },
  other: { 
    label: 'Other', 
    emoji: '🌐',
    gradient: 'from-gray-500 to-gray-700',
    color: '#6B7280'
  }
}

export default function SharedMetricsPage() {
  const { shareId } = useParams()
  const [data, setData] = useState<SharedMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typedTitle, setTypedTitle] = useState('')
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)
  const [imageZoom, setImageZoom] = useState(1)
  const [imagePan, setImagePan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 })

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
  }, [data]) // Re-run when data changes

  // Typing effect for campaign name
  useEffect(() => {
    if (data?.campaign.name) {
      let currentIndex = 0
      const targetText = data.campaign.name
      setTypedTitle('') // Reset when data changes
      
      const typingInterval = setInterval(() => {
        if (currentIndex <= targetText.length) {
          setTypedTitle(targetText.slice(0, currentIndex))
          currentIndex++
        } else {
          clearInterval(typingInterval)
        }
      }, 80) // Slower, more terminal-like speed

      return () => clearInterval(typingInterval)
    }
  }, [data?.campaign.name])

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!lightboxImage || !data?.campaign.screenshots) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxImage(null)
        setImageZoom(1)
        setImagePan({ x: 0, y: 0 })
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = data.campaign.screenshots.findIndex(s => s.url === lightboxImage)
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : data.campaign.screenshots.length - 1
        setLightboxImage(data.campaign.screenshots[prevIndex].url)
        setImageZoom(1)
        setImagePan({ x: 0, y: 0 })
      } else if (e.key === 'ArrowRight') {
        const currentIndex = data.campaign.screenshots.findIndex(s => s.url === lightboxImage)
        const nextIndex = currentIndex < data.campaign.screenshots.length - 1 ? currentIndex + 1 : 0
        setLightboxImage(data.campaign.screenshots[nextIndex].url)
        setImageZoom(1)
        setImagePan({ x: 0, y: 0 })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [lightboxImage, data?.campaign.screenshots])

  useEffect(() => {
    if (!shareId) return

    const fetchSharedMetrics = async () => {
      try {
        const res = await fetch(`/api/metrics/shared?shareId=${shareId}`)
        
        if (res.ok) {
          const sharedData = await res.json()
          console.log('SharedMetricsPage - Full data received:', sharedData)
          console.log('SharedMetricsPage - Entries:', sharedData.entries)
          console.log('SharedMetricsPage - Number of entries:', sharedData.entries?.length)
          if (sharedData.entries?.length > 0) {
            console.log('SharedMetricsPage - First entry:', sharedData.entries[0])
          }
          setData(sharedData)
        } else {
          if (res.status === 404) {
            setError('Share link not found or has expired')
          } else {
            setError('Failed to load shared metrics')
          }
        }
      } catch (error) {
        console.error('Error loading shared metrics:', error)
        setError('Error loading shared metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchSharedMetrics()
  }, [shareId])

  const calculateTotals = () => {
    if (!data?.entries) return { likes: 0, shares: 0, comments: 0, impressions: 0 }
    
    return data.entries.reduce((acc, entry) => ({
      likes: acc.likes + entry.likes,
      shares: acc.shares + entry.shares,
      comments: acc.comments + entry.comments,
      impressions: acc.impressions + entry.impressions
    }), { likes: 0, shares: 0, comments: 0, impressions: 0 })
  }

  // Helper to format numbers compactly
  const formatNumber = (num: number | string) => {
    // Ensure we're working with a number
    const n = typeof num === 'string' ? parseInt(num, 10) || 0 : num
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  // Calculate chart data
  const getChartData = () => {
    if (!data?.entries || data.entries.length === 0) return null

    // Platform distribution
    const platformCounts: Record<string, number> = {}
    const platformEngagement: Record<string, { likes: number; shares: number; comments: number }> = {}
    
    data.entries.forEach(entry => {
      const platform = entry.platform
      platformCounts[platform] = (platformCounts[platform] || 0) + 1
      
      if (!platformEngagement[platform]) {
        platformEngagement[platform] = { likes: 0, shares: 0, comments: 0 }
      }
      platformEngagement[platform].likes += entry.likes
      platformEngagement[platform].shares += entry.shares
      platformEngagement[platform].comments += entry.comments
    })

    const platformDistribution = Object.entries(platformCounts).map(([platform, count]) => ({
      name: PLATFORM_INFO[platform]?.label || platform,
      value: count,
      color: PLATFORM_INFO[platform]?.color || '#6B7280'
    }))

    const engagementByPlatform = Object.entries(platformEngagement).map(([platform, stats]) => ({
      platform: PLATFORM_INFO[platform]?.label || platform,
      likes: stats.likes,
      shares: stats.shares,
      comments: stats.comments
    }))

    // Daily engagement data
    const dailyEngagement: Record<string, number> = {}
    data.entries.forEach(entry => {
      const date = new Date(entry.createdAt).toLocaleDateString()
      const totalEngagement = entry.likes + entry.shares + entry.comments
      dailyEngagement[date] = (dailyEngagement[date] || 0) + totalEngagement
    })

    const dailyEngagementData = Object.entries(dailyEngagement)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, engagement]) => ({
        date,
        engagement
      }))

    // Platform impact radar data
    const platformImpact: Record<string, { engagement: number; reach: number; posts: number }> = {}
    data.entries.forEach(entry => {
      const platform = PLATFORM_INFO[entry.platform]?.label || entry.platform
      if (!platformImpact[platform]) {
        platformImpact[platform] = { engagement: 0, reach: 0, posts: 0 }
      }
      platformImpact[platform].engagement += entry.likes + entry.shares + entry.comments
      platformImpact[platform].reach += entry.impressions
      platformImpact[platform].posts += 1
    })

    const radarData = Object.entries(platformImpact).map(([platform, metrics]) => ({
      platform,
      engagement: Math.round(metrics.engagement / Math.max(metrics.posts, 1)), // avg per post
      reach: Math.round(metrics.reach / Math.max(metrics.posts, 1)), // avg per post
      posts: metrics.posts * 10 // scale up for visibility
    }))

    // Cumulative engagement area chart
    const sortedEntries = [...data.entries].sort((a, b) => 
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    
    let cumulativeLikes = 0
    let cumulativeShares = 0
    let cumulativeComments = 0
    
    const cumulativeData = sortedEntries.map(entry => {
      cumulativeLikes += entry.likes
      cumulativeShares += entry.shares
      cumulativeComments += entry.comments
      
      return {
        date: new Date(entry.createdAt).toLocaleDateString(),
        likes: cumulativeLikes,
        shares: cumulativeShares,
        comments: cumulativeComments,
        total: cumulativeLikes + cumulativeShares + cumulativeComments
      }
    })

    return { 
      platformDistribution, 
      engagementByPlatform, 
      dailyEngagementData,
      radarData,
      cumulativeData
    }
  }

  // Function to sync Twitter/X posts
  const handleSyncTwitterPosts = async () => {
    if (!data?.entries || syncing) return

    const twitterPosts = data.entries.filter(entry => entry.platform === 'twitter')
    if (twitterPosts.length === 0) return

    setSyncing(true)
    setSyncProgress({ current: 0, total: twitterPosts.length })
    
    try {
      // Collect all Twitter URLs
      const urls = twitterPosts.map(post => post.url)
      
      // Make a single batch request
      const fetchRes = await fetch(`${window.location.origin}/api/metrics/fetch-twitter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls })
      })
      
      if (!fetchRes.ok) {
        if (fetchRes.status === 429) {
          const data = await fetchRes.json()
          alert(`Twitter API rate limit reached. Please wait ${data.retryAfter || 60} seconds and try again.`)
          return
        }
        throw new Error('Failed to fetch Twitter data')
      }
      
      const { results, errors } = await fetchRes.json()
      let successCount = 0
      let failedCount = 0
      
      // Update all posts with the batch results
      for (const post of twitterPosts) {
        setSyncProgress({ current: successCount + failedCount + 1, total: twitterPosts.length })
        
        if (results[post.url]) {
          const tweetData = results[post.url]
          
          // Update the post in the metrics system
          const updateRes = await fetch(`${window.location.origin}/api/metrics`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              campaignId: data.campaign.id,
              entryId: post.id,
              likes: tweetData.likes,
              shares: tweetData.retweets,
              comments: tweetData.replies,
              impressions: tweetData.impressions,
              authorName: tweetData.authorName || post.authorName,
              authorPfp: tweetData.authorPfp || post.authorPfp
            })
          })

          if (updateRes.ok) {
            successCount++
          } else {
            console.error('Failed to update post:', post.id)
            failedCount++
          }
        } else if (errors[post.url]) {
          console.log(`Error for ${post.url}:`, errors[post.url])
          failedCount++
        } else {
          console.error('No data returned for post:', post.url)
          failedCount++
        }
      }

      // Refresh the page data
      const res = await fetch(`/api/metrics/shared?shareId=${shareId}`)
      if (res.ok) {
        const sharedData = await res.json()
        setData(sharedData)
      }

      // Show appropriate message based on results
      if (successCount > 0 && failedCount === 0) {
        alert(`Successfully synced all ${successCount} Twitter/X posts!`)
      } else if (successCount > 0 && failedCount > 0) {
        alert(`Successfully synced ${successCount} posts. ${failedCount} posts failed (may be deleted or protected).`)
      } else if (failedCount > 0) {
        alert(`Failed to sync ${failedCount} posts. They may have been deleted or are from protected accounts.`)
      }
    } catch (error) {
      console.error('Error syncing Twitter posts:', error)
      alert('Failed to sync posts. Please try again.')
    } finally {
      setSyncing(false)
      setSyncProgress({ current: 0, total: 0 })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading campaign metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600">No data found</h1>
        </div>
      </div>
    )
  }

  const totals = calculateTotals();
  const chartData = getChartData();

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Banner */}
      {data.campaign.heroBanner && (
        <div className="relative w-full h-[200px] md:h-[300px] lg:h-[400px] overflow-hidden reveal">
          <img 
            src={data.campaign.heroBanner} 
            alt={data.campaign.name}
            className="w-full h-full object-cover"
          />
          {/* Pixelated gradient overlay */}
          <div className="absolute inset-0">
            {/* Bottom gradient with pixelated effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            
            {/* Pixelated fade effect at edges */}
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(to right, 
                    rgba(0,0,0,0.4) 0%, 
                    transparent 10%, 
                    transparent 90%, 
                    rgba(0,0,0,0.4) 100%
                  ),
                  linear-gradient(to bottom, 
                    transparent 60%, 
                    rgba(0,0,0,0.1) 70%, 
                    rgba(0,0,0,0.3) 80%, 
                    rgba(0,0,0,0.6) 90%, 
                    rgba(0,0,0,0.8) 100%
                  )
                `
              }}
            />
            
            {/* Pixelated grid overlay */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  repeating-linear-gradient(
                    0deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 4px
                  ),
                  repeating-linear-gradient(
                    90deg,
                    transparent,
                    transparent 2px,
                    rgba(255,255,255,0.03) 2px,
                    rgba(255,255,255,0.03) 4px
                  )
                `,
                mixBlendMode: 'overlay'
              }}
            />
            
            {/* Noise texture for more depth */}
            <div 
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.4'/%3E%3C/svg%3E")`,
                mixBlendMode: 'multiply'
              }}
            />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 lg:p-12">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                <span className="text-green-400">&gt;</span> {typedTitle}
                {typedTitle.length < (data.campaign.name?.length || 0) && <span className="terminal-cursor"></span>}
              </h1>
              <p className="text-lg md:text-xl text-white/90 drop-shadow-md">Campaign Performance Report</p>
            </div>
          </div>
        </div>
      )}

      {/* Header (if no hero banner) */}
      {!data.campaign.heroBanner && (
        <div className="bg-white shadow-sm border-b border-gray-100 reveal">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                <span className="text-green-600">&gt;</span> {typedTitle}
                {typedTitle.length < (data.campaign.name?.length || 0) && <span className="terminal-cursor"></span>}
              </h1>
              <p className="text-gray-500">Campaign Performance Report</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Metrics Overview */}
        <div className="mb-12 reveal">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Total Engagement</h2>
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 text-center">
              <div className="text-lg mb-1">❤️</div>
              <div className="text-xl font-bold text-gray-900">{formatNumber(totals.likes)}</div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 text-center">
              <div className="text-lg mb-1">🔄</div>
              <div className="text-xl font-bold text-gray-900">{formatNumber(totals.shares)}</div>
              <div className="text-xs text-gray-500">Shares</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 text-center">
              <div className="text-lg mb-1">💬</div>
              <div className="text-xl font-bold text-gray-900">{formatNumber(totals.comments)}</div>
              <div className="text-xs text-gray-500">Comments</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-2 text-center relative overflow-hidden group">
              {/* Subtle glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-400/0 via-gray-400/10 to-gray-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              {/* Animated border glow */}
              <div 
                className="absolute inset-0 rounded-lg opacity-50"
                style={{
                  background: 'linear-gradient(45deg, transparent 30%, rgba(156, 163, 175, 0.3) 50%, transparent 70%)',
                  backgroundSize: '200% 200%',
                  animation: 'impressionShine 3s ease-in-out infinite'
                }}
              />
              
              <div className="relative z-10">
                <div className="text-lg mb-1">👁️</div>
                <div className="text-xl font-bold text-gray-900">{formatNumber(totals.impressions)}</div>
                <div className="text-xs text-gray-500">Impressions</div>
              </div>
              
              {/* Subtle pulse ring */}
              <div className="absolute inset-0 rounded-lg border border-gray-400/30 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Charts Section (without engagement over time) */}
        {chartData && data.entries.length > 0 && (
          <div className="mb-12 reveal">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Platform Distribution */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData.platformDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.platformDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Engagement by Platform */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement by Platform</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData.engagementByPlatform}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="platform" fontSize={12} angle={-45} textAnchor="end" height={70} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="likes" stackId="a" fill="#1a1a1a" />
                    <Bar dataKey="shares" stackId="a" fill="#6b7280" />
                    <Bar dataKey="comments" stackId="a" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Additional Analytics Charts */}
        {chartData && data.entries.length > 0 && (
          <div className="mb-12 reveal">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Advanced Analytics</h2>
            <div className="grid grid-cols-1 gap-6">
              
              {/* PFP Views Bubble Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers by Views</h3>
                <p className="text-sm text-gray-600 mb-4">Bubble size represents total impressions per post</p>
                <div className="relative h-96 bg-gray-50 rounded-lg overflow-x-auto overflow-y-hidden p-4">
                  <div className="flex flex-wrap gap-4 justify-center items-center min-w-max">
                    {data.entries
                      .filter(entry => entry.impressions > 0 && entry.authorPfp)
                      .sort((a, b) => b.impressions - a.impressions)
                      .slice(0, 10)
                      .map((entry, index) => {
                        const maxImpressions = Math.max(...data.entries.map(e => e.impressions));
                        const minSize = 60;
                        const maxSize = 120;
                        const size = minSize + ((entry.impressions / maxImpressions) * (maxSize - minSize));
                        
                        return (
                          <div
                            key={entry.id}
                            className="relative group cursor-pointer"
                            onClick={() => window.open(entry.url, '_blank')}
                            style={{ width: size, height: size }}
                          >
                            <div className="absolute inset-0 rounded-full overflow-hidden border-2 border-white shadow-lg hover:shadow-xl transition-all hover:scale-110">
                              <SafeImage
                                src={entry.authorPfp}
                                alt={entry.authorName}
                                fill
                                sizes={`${size}px`}
                                className="object-cover"
                              />
                            </div>
                            
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              <div className="bg-gray-800 text-white text-xs rounded-lg px-3 py-2">
                                <p className="font-medium">{entry.authorName}</p>
                                <p>{formatNumber(entry.impressions)} impressions</p>
                              </div>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-800"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Campaign Screenshots Gallery */}
        {data.campaign.screenshots && data.campaign.screenshots.length > 0 && (
          <div className="mb-12 reveal">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Campaign Gallery</h2>
            
            {/* Collage Layout */}
            <div className="relative">
              {data.campaign.screenshots.length === 1 ? (
                // Single image - full width
                <div className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(data.campaign.screenshots![0].url)}>
                  <img 
                    src={data.campaign.screenshots[0].url} 
                    alt="Campaign screenshot" 
                    className="w-full h-[400px] object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                  {data.campaign.screenshots[0].notes && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-white text-sm">{data.campaign.screenshots[0].notes}</p>
                    </div>
                  )}
                </div>
              ) : data.campaign.screenshots.length === 2 ? (
                // Two images - side by side
                <div className="grid grid-cols-2 gap-2">
                  {data.campaign.screenshots.map((screenshot) => (
                    <div key={screenshot.id} className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(screenshot.url)}>
                      <img 
                        src={screenshot.url} 
                        alt="Campaign screenshot" 
                        className="w-full h-[300px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                      {screenshot.notes && (
                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-white text-xs">{screenshot.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : data.campaign.screenshots.length === 3 ? (
                // Three images - one large, two small
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative group cursor-pointer overflow-hidden rounded-xl row-span-2" onClick={() => setLightboxImage(data.campaign.screenshots![0].url)}>
                    <img 
                      src={data.campaign.screenshots[0].url} 
                      alt="Campaign screenshot" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    {data.campaign.screenshots[0].notes && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white text-xs">{data.campaign.screenshots[0].notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {data.campaign.screenshots.slice(1, 3).map((screenshot) => (
                      <div key={screenshot.id} className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(screenshot.url)}>
                        <img 
                          src={screenshot.url} 
                          alt="Campaign screenshot" 
                          className="w-full h-[196px] object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                        {screenshot.notes && (
                          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                            <p className="text-white text-xs">{screenshot.notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : data.campaign.screenshots.length === 4 ? (
                // Four images - 2x2 grid
                <div className="grid grid-cols-2 gap-2">
                  {data.campaign.screenshots.map((screenshot) => (
                    <div key={screenshot.id} className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(screenshot.url)}>
                      <img 
                        src={screenshot.url} 
                        alt="Campaign screenshot" 
                        className="w-full h-[200px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                      {screenshot.notes && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-white text-xs">{screenshot.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // 5+ images - masonry/collage layout
                <div className="grid grid-cols-3 gap-2 auto-rows-[150px]">
                  {/* First image - large */}
                  <div className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(data.campaign.screenshots![0].url)}>
                    <img 
                      src={data.campaign.screenshots[0].url} 
                      alt="Campaign screenshot" 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    {data.campaign.screenshots[0].notes && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white text-sm">{data.campaign.screenshots[0].notes}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Calculate how many images to show based on whether we need the +more indicator */}
                  {data.campaign.screenshots.slice(1, data.campaign.screenshots.length > 5 ? 4 : 5).map((screenshot) => (
                    <div key={screenshot.id} className="relative group cursor-pointer overflow-hidden rounded-xl" onClick={() => setLightboxImage(screenshot.url)}>
                      <img 
                        src={screenshot.url} 
                        alt="Campaign screenshot" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                      {screenshot.notes && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                          <p className="text-white text-xs truncate">{screenshot.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Show more indicator if there are more than 5 images */}
                  {data.campaign.screenshots.length > 5 && (
                    <div 
                      className="relative group cursor-pointer overflow-hidden rounded-xl bg-gray-200 flex items-center justify-center"
                      onClick={() => setLightboxImage(data.campaign.screenshots![5].url)}
                    >
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-600">+{data.campaign.screenshots.length - 5}</p>
                        <p className="text-sm text-gray-500">more</p>
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity" />
                    </div>
                  )}
                </div>
              )}
              
              {/* Hover hint */}
              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                Click to expand
              </div>
            </div>
          </div>
        )}

        {/* Campaign Highlights - moved here after screenshots */}
        {data.campaign.highlights && data.campaign.highlights.length > 0 && (
          <div className="mb-12 reveal">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Key Highlights</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <ul className="space-y-3">
                {data.campaign.highlights.map((highlight, index) => (
                  <li key={highlight.id || index} className="flex items-start">
                    <span className="text-green-500 mr-3 mt-0.5">✓</span>
                    <span className="text-gray-700">{highlight.text || highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Posts - moved to the bottom */}
        <div className="mb-12 reveal">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Posts ({data.entries.length})
            </h2>
            
            {/* Sync button for Twitter/X posts */}
            {data.entries.some(entry => entry.platform === 'twitter') && (
              <button
                onClick={handleSyncTwitterPosts}
                disabled={syncing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  syncing 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {syncing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>
                      Syncing{syncProgress.total > 0 && ` (${syncProgress.current}/${syncProgress.total})`}...
                    </span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync Twitter/X ({data.entries.filter(e => e.platform === 'twitter').length})
                  </>
                )}
              </button>
            )}
          </div>
          
          {data.entries.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <p className="text-gray-500">No posts tracked yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {data.entries.map((entry) => {
                const platform = PLATFORM_INFO[entry.platform] || PLATFORM_INFO.other
                
                // Map platform to specific class names for Tailwind to detect
                const bgClasses = {
                  twitter: 'bg-gradient-to-br from-gray-700 to-black',
                  instagram: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
                  linkedin: 'bg-gradient-to-br from-blue-600 to-blue-800',
                  youtube: 'bg-gradient-to-br from-red-600 to-red-800',
                  facebook: 'bg-gradient-to-br from-blue-500 to-blue-700',
                  telegram: 'bg-gradient-to-br from-blue-400 to-blue-600',
                  tiktok: 'bg-gradient-to-br from-black via-gray-800 to-pink-500',
                  warpcast: 'bg-gradient-to-br from-purple-600 to-purple-800',
                  lens: 'bg-gradient-to-br from-green-500 to-green-700',
                  other: 'bg-gradient-to-br from-gray-500 to-gray-700'
                }
                
                // Use inline gradient styles instead of dynamic classes
                const gradientStyles = {
                  twitter: { background: 'linear-gradient(to bottom right, #374151, #000000)' },
                  instagram: { background: 'linear-gradient(to bottom right, #8B5CF6, #EC4899, #FB923C)' },
                  linkedin: { background: 'linear-gradient(to bottom right, #2563EB, #1E40AF)' },
                  youtube: { background: 'linear-gradient(to bottom right, #DC2626, #991B1B)' },
                  facebook: { background: 'linear-gradient(to bottom right, #3B82F6, #1D4ED8)' },
                  telegram: { background: 'linear-gradient(to bottom right, #60A5FA, #2563EB)' },
                  tiktok: { background: 'linear-gradient(to bottom right, #000000, #1F2937, #EC4899)' },
                  warpcast: { background: 'linear-gradient(to bottom right, #9333EA, #7C3AED)' },
                  lens: { background: 'linear-gradient(to bottom right, #10B981, #059669)' },
                  other: { background: 'linear-gradient(to bottom right, #6B7280, #374151)' }
                }
                
                try {
                  return (
                    <div 
                      key={entry.id} 
                      className="rounded-lg p-2 shadow-md hover:shadow-lg transition-shadow"
                      style={gradientStyles[entry.platform] || gradientStyles.other}
                    >
                      {/* Platform & Author - Ultra compact */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{platform.emoji}</span>
                        <div className="flex items-center gap-1.5 flex-1">
                          {entry.authorPfp && (
                            <div className="relative w-8 h-8 flex-shrink-0">
                              <SafeImage
                                src={entry.authorPfp}
                                alt={entry.authorName}
                                fill
                                sizes="32px"
                                className="rounded-full object-cover"
                              />
                            </div>
                          )}
                          <h4 className="font-medium text-xs text-white truncate">{entry.authorName}</h4>
                        </div>
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/80 hover:text-white text-xs"
                        >
                          →
                        </a>
                      </div>

                      {/* Metrics - Ultra compact white boxes */}
                      <div className="grid grid-cols-4 gap-0.5 mb-1">
                        <div className="bg-white rounded px-1 py-0.5 text-center border border-gray-200">
                          <div className="text-xs font-semibold text-gray-800">{formatNumber(entry.likes)}</div>
                          <div className="text-xs text-gray-600">❤️</div>
                        </div>
                        <div className="bg-white rounded px-1 py-0.5 text-center border border-gray-200">
                          <div className="text-xs font-semibold text-gray-800">{formatNumber(entry.shares)}</div>
                          <div className="text-xs text-gray-600">🔄</div>
                        </div>
                        <div className="bg-white rounded px-1 py-0.5 text-center border border-gray-200">
                          <div className="text-xs font-semibold text-gray-800">{formatNumber(entry.comments)}</div>
                          <div className="text-xs text-gray-600">💬</div>
                        </div>
                        <div className="bg-white rounded px-1 py-0.5 text-center border border-gray-200 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-100/0 via-gray-100/50 to-gray-100/0 opacity-60" />
                          <div className="relative">
                            <div className="text-xs font-semibold text-gray-800">{formatNumber(entry.impressions)}</div>
                            <div className="text-xs text-gray-600">👁️</div>
                          </div>
                        </div>
                      </div>

                      {/* Highlights - Very small */}
                      {entry.keyHighlights && (
                        <p className="text-xs text-white/90 truncate" title={entry.keyHighlights}>
                          {entry.keyHighlights}
                        </p>
                      )}

                      {/* Screenshots - Tiny */}
                      {entry.screenshots && entry.screenshots.length > 0 && (
                        <div className="flex gap-0.5 mt-1">
                          {entry.screenshots.slice(0, 2).map((url, idx) => (
                            <div key={idx} className="relative w-12 h-12">
                              <SafeImage
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                fill
                                sizes="48px"
                                className="object-cover rounded cursor-pointer hover:scale-110 transition-transform"
                                onClick={() => window.open(url, '_blank')}
                              />
                            </div>
                          ))}
                          {entry.screenshots.length > 2 && (
                            <span className="text-xs text-white/70 flex items-center px-1">
                              +{entry.screenshots.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                } catch (error) {
                  console.error('Error rendering entry:', error)
                  return null
                }
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            This report was generated using Nabulines Campaign Metrics
          </p>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setLightboxImage(null)
            setImageZoom(1)
            setImagePan({ x: 0, y: 0 })
          }}
        >
          <div className="relative max-w-7xl max-h-full w-full">
            {/* Close button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setLightboxImage(null)
                setImageZoom(1)
                setImagePan({ x: 0, y: 0 })
              }}
              className="absolute top-4 right-4 z-10 bg-white/10 backdrop-blur-sm text-white p-2 rounded-full hover:bg-white/20 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {/* Zoom controls */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full p-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setImageZoom(Math.max(0.5, imageZoom - 0.25))
                }}
                className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-white text-sm px-2 min-w-[60px] text-center">
                {Math.round(imageZoom * 100)}%
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setImageZoom(Math.min(3, imageZoom + 0.25))
                }}
                className="text-white p-2 rounded-full hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <div className="w-px h-6 bg-white/30 mx-1" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setImageZoom(1)
                  setImagePan({ x: 0, y: 0 })
                }}
                className="text-white p-2 rounded-full hover:bg-white/20 transition-colors text-xs"
              >
                Reset
              </button>
            </div>
            
            {/* Navigation arrows */}
            {data.campaign.screenshots && data.campaign.screenshots.length > 1 && (
              <>
                {/* Previous button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentIndex = data.campaign.screenshots!.findIndex(s => s.url === lightboxImage)
                    const prevIndex = currentIndex > 0 ? currentIndex - 1 : data.campaign.screenshots!.length - 1
                    setLightboxImage(data.campaign.screenshots![prevIndex].url)
                    setImageZoom(1)
                    setImagePan({ x: 0, y: 0 })
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/20 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Next button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const currentIndex = data.campaign.screenshots!.findIndex(s => s.url === lightboxImage)
                    const nextIndex = currentIndex < data.campaign.screenshots!.length - 1 ? currentIndex + 1 : 0
                    setLightboxImage(data.campaign.screenshots![nextIndex].url)
                    setImageZoom(1)
                    setImagePan({ x: 0, y: 0 })
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-sm text-white p-3 rounded-full hover:bg-white/20 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {/* Image container with zoom and pan */}
            <div 
              className="flex items-center justify-center h-[calc(100vh-8rem)] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onWheel={(e) => {
                e.preventDefault()
                const delta = e.deltaY > 0 ? -0.1 : 0.1
                setImageZoom(prev => Math.min(3, Math.max(0.5, prev + delta)))
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                if (imageZoom === 1) {
                  setImageZoom(2)
                } else {
                  setImageZoom(1)
                  setImagePan({ x: 0, y: 0 })
                }
              }}
              onMouseDown={(e) => {
                if (imageZoom > 1) {
                  setIsDragging(true)
                  setDragStart({ x: e.clientX - imagePan.x, y: e.clientY - imagePan.y })
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && imageZoom > 1) {
                  setImagePan({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  })
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              style={{ cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
            >
              <img 
                src={lightboxImage}
                alt="Campaign screenshot"
                className="max-h-full max-w-full select-none"
                style={{
                  transform: `scale(${imageZoom}) translate(${imagePan.x / imageZoom}px, ${imagePan.y / imageZoom}px)`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                  objectFit: 'contain'
                }}
                draggable={false}
              />
            </div>
            
            {/* Image notes and counter */}
            <div className="absolute bottom-4 left-4 right-4 text-center pointer-events-none">
              {data.campaign.screenshots && (
                <>
                  {/* Image counter */}
                  <div className="text-white/70 text-sm mb-2">
                    {data.campaign.screenshots.findIndex(s => s.url === lightboxImage) + 1} / {data.campaign.screenshots.length}
                  </div>
                  
                  {/* Image notes */}
                  {(() => {
                    const screenshot = data.campaign.screenshots.find(s => s.url === lightboxImage)
                    return screenshot?.notes ? (
                      <div className="bg-black/50 backdrop-blur-sm text-white p-3 rounded-lg max-w-2xl mx-auto">
                        <p className="text-sm">{screenshot.notes}</p>
                      </div>
                    ) : null
                  })()}
                  
                  {/* Zoom instructions */}
                  <div className="text-white/50 text-xs mt-2">
                    Scroll to zoom • Double-click to toggle zoom • Drag to pan when zoomed
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add impression shine animation styles */}
      <style jsx global>{`
        @keyframes impressionShine {
          0% {
            background-position: -200% center;
          }
          100% {
            background-position: 200% center;
          }
        }
      `}</style>
    </main>
  )
} 