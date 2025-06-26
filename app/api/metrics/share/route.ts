import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'

export async function POST(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // Check if user can view metrics (and thus create share links)
    // const canView = ['admin', 'core', 'hunter', 'kol', 'brand_mod', 'brand_hunter'].includes(session?.user?.role || '')
    const canView = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canView) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { campaignId } = await request.json()
    
    // Fetch campaign data to include name
    let campaignName = 'Campaign Metrics'
    try {
      const campaignKey = `metrics:campaign:${campaignId}`
      const campaignData = await redis.get(campaignKey)
      if (campaignData) {
        const campaign = typeof campaignData === 'string' ? JSON.parse(campaignData) : campaignData
        campaignName = campaign.name || campaignName
      }
    } catch (error) {
      console.error('Error fetching campaign:', error)
    }
    
    // Generate unique share ID
    const shareId = nanoid()
    
    // Store share link metadata
    const shareData = {
      shareId,
      campaignId,
      campaignName,
      createdBy: session?.user?.id || session?.user?.email || 'test-user',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    }
    
    // Save share link to Redis with expiry using Upstash Redis
    await redis.set(
      `metrics:share:${shareId}`,
      JSON.stringify(shareData),
      {
        ex: 30 * 24 * 60 * 60 // 30 days in seconds
      }
    )
    
    return NextResponse.json({ shareId })
  } catch (error) {
    console.error('Error creating share link:', error)
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
} 