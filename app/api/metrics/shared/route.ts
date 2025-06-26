import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const shareId = searchParams.get('shareId') || searchParams.get('id')
    
    console.log('[Shared Metrics] Share ID requested:', shareId)
    console.log('[Shared Metrics] Search params:', Object.fromEntries(searchParams.entries()))
    
    if (!shareId) {
      console.error('[Shared Metrics] No share ID provided')
      return NextResponse.json({ error: 'Share ID required' }, { status: 400 })
    }
    
    // Fetch share link data
    const shareData = await redis.get(`metrics:share:${shareId}`)
    
    console.log('[Shared Metrics] Share data from Redis:', shareData)
    
    if (!shareData) {
      console.error('[Shared Metrics] Share link not found:', shareId)
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 })
    }
    
    // Handle if shareData is already an object or needs parsing
    let parsedShareData
    if (typeof shareData === 'string') {
      parsedShareData = JSON.parse(shareData)
    } else if (typeof shareData === 'object' && shareData !== null) {
      parsedShareData = shareData
    } else {
      console.error('[Shared Metrics] Unexpected share data type:', typeof shareData)
      return NextResponse.json({ error: 'Invalid share data format' }, { status: 500 })
    }
    
    console.log('[Shared Metrics] Parsed share data:', parsedShareData)
    
    // Fetch metrics for the campaign
    const metricsKey = `metrics:${parsedShareData.campaignId}`
    const entries = await redis.lrange(metricsKey, 0, -1)
    
    console.log('[Shared Metrics] Found', entries.length, 'entries for campaign:', parsedShareData.campaignId)
    
    const parsedEntries = entries.map(entry => {
      try {
        // Handle if entry is already an object or needs parsing
        if (typeof entry === 'string') {
          return JSON.parse(entry)
        } else if (typeof entry === 'object' && entry !== null) {
          return entry
        } else {
          console.warn('[Shared Metrics] Unexpected entry type:', typeof entry)
          return null
        }
      } catch (parseError) {
        console.error('[Shared Metrics] Failed to parse entry:', parseError)
        return null
      }
    }).filter(Boolean)
    
    // Reverse to show oldest first
    parsedEntries.reverse()
    
    // Fetch campaign info if it exists
    let campaign = null
    try {
      const campaignKey = `metrics:campaign:${parsedShareData.campaignId}`
      const campaignData = await redis.get(campaignKey)
      if (campaignData) {
        if (typeof campaignData === 'string') {
          campaign = JSON.parse(campaignData)
        } else if (typeof campaignData === 'object') {
          campaign = campaignData
        }
      }
    } catch (error) {
      console.error('[Shared Metrics] Error fetching campaign:', error)
    }

    const response = { 
      entries: parsedEntries,
      campaign: campaign || { 
        id: parsedShareData.campaignId, 
        name: parsedShareData.campaignName || 'Campaign Metrics',
        highlights: []
      }
    }
    
    console.log('[Shared Metrics] Returning response with', response.entries.length, 'entries')

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Shared Metrics] Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 