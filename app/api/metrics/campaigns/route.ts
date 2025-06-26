import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'

const ALLOWED_ROLES = ['admin', 'core', 'hunter', 'kol', 'brand_mod', 'brand_hunter']

export async function GET(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    // const session = await getServerSession(authOptions)
    
    // if (!session?.user?.email || !ALLOWED_ROLES.includes(session.user.role || '')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('id')
    
    if (campaignId) {
      try {
        // Get specific campaign
        const campaign = await redis.get(`metrics:campaign:${campaignId}`)
        console.log('[Campaigns GET] Fetching campaign:', campaignId, 'Found:', !!campaign)
        if (!campaign) {
          // Return empty campaign data if not found
          return NextResponse.json({ 
            campaign: null 
          })
        }
        // Handle both object and string data
        const campaignData = typeof campaign === 'string' ? JSON.parse(campaign) : campaign
        return NextResponse.json({ campaign: campaignData })
      } catch (error) {
        console.error('Error fetching campaign:', error)
        // Return null campaign on error
        return NextResponse.json({ campaign: null })
      }
    } else {
      // Get all campaign IDs from the campaigns list
      try {
        const campaignIds = await redis.lrange('metrics:campaigns:list', 0, -1)
        console.log('[Campaigns GET] Campaign IDs from list:', campaignIds)
        const campaigns = []
        
        for (const id of campaignIds) {
          const campaignData = await redis.get(`metrics:campaign:${id}`)
          console.log('[Campaigns GET] Campaign data for', id, ':', !!campaignData, 'Type:', typeof campaignData)
          if (campaignData) {
            // Handle both object and string data
            try {
              const parsed = typeof campaignData === 'string' ? JSON.parse(campaignData) : campaignData
              campaigns.push(parsed)
            } catch (parseError) {
              console.error('[Campaigns GET] Error parsing campaign', id, ':', parseError)
            }
          }
        }
        
        console.log('[Campaigns GET] Returning', campaigns.length, 'campaigns')
        return NextResponse.json({ campaigns })
      } catch (error) {
        console.error('Error fetching campaigns list:', error)
        return NextResponse.json({ campaigns: [] })
      }
    }
  } catch (error) {
    console.error('Error in campaigns GET:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canEdit) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const data = await request.json()
    const campaignId = data.id || nanoid()
    
    console.log('[Campaigns POST] Creating campaign with ID:', campaignId)
    
    const campaign = {
      id: campaignId,
      name: data.name || 'Unnamed Campaign',
      highlights: data.highlights || [],
      createdAt: data.createdAt || new Date().toISOString(),
      createdBy: data.createdBy || session?.user?.id || session?.user?.email || 'test-user',
      updatedAt: new Date().toISOString(),
      updatedBy: session?.user?.id || session?.user?.email || 'test-user'
    }
    
    // Save campaign metadata
    await redis.set(`metrics:campaign:${campaignId}`, JSON.stringify(campaign))
    console.log('[Campaigns POST] Campaign saved to Redis')
    
    // Add campaign ID to the list
    await redis.lpush('metrics:campaigns:list', campaignId)
    console.log('[Campaigns POST] Campaign ID added to list')
    
    // Verify it was added
    const listSize = await redis.llen('metrics:campaigns:list')
    console.log('[Campaigns POST] List size after add:', listSize)
    
    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('Error saving campaign:', error)
    return NextResponse.json({ error: 'Failed to save campaign' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canEdit) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const data = await request.json()
    const { id, ...updates } = data
    
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    
    try {
      // Get existing campaign
      const existing = await redis.get(`metrics:campaign:${id}`)
      
      let campaign
      if (existing) {
        // Parse existing campaign data
        const existingCampaign = typeof existing === 'string' ? JSON.parse(existing) : existing
        
        // Update existing campaign - preserve all fields and update only provided ones
        campaign = {
          ...existingCampaign,
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: session?.user?.id || session?.user?.email || 'test-user'
        }
      } else {
        // Create new campaign if it doesn't exist
        campaign = {
          id,
          name: updates.name || 'Unnamed Campaign',
          highlights: updates.highlights || [],
          heroBanner: updates.heroBanner || null,
          screenshots: updates.screenshots || [],
          createdAt: new Date().toISOString(),
          createdBy: session?.user?.id || session?.user?.email || 'test-user',
          updatedAt: new Date().toISOString(),
          updatedBy: session?.user?.id || session?.user?.email || 'test-user'
        }
      }
      
      // Save campaign
      await redis.set(`metrics:campaign:${id}`, JSON.stringify(campaign))
      
      return NextResponse.json({ success: true, campaign })
    } catch (error) {
      console.error('Error updating campaign:', error)
      return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
    }
  } catch (error) {
    console.error('Error in PUT handler:', error)
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 })
  }
} 