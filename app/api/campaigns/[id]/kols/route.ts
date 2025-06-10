import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { CampaignKOLService } from '@/lib/services/campaign-kol-service'
import { checkAuth } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaignId = params.id
    
    // Get KOLs for the campaign
    const kols = await CampaignKOLService.getCampaignKOLs(campaignId)
    
    return NextResponse.json(kols)
  } catch (error) {
    console.error('Error fetching campaign KOLs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch KOLs' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth - only admin, core, and team can add KOLs
    const auth = await checkAuth(request, ['admin', 'core', 'team'])
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!auth.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const campaignId = params.id
    const data = await request.json()
    
    // Validate required fields
    if (!data.kolHandle || !data.kolName || !data.tier || !data.budget || !data.platform) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Parse contact field if provided
    if (data.contact) {
      data.contact = CampaignKOLService.parseContact(data.contact)
    }
    
    // Prepare KOL data for campaign library
    const kolData = {
      handle: data.kolHandle.replace('@', ''),
      name: data.kolName,
      pfp: data.kolImage,
      tier: data.tier,
      budget: data.budget,
      platform: Array.isArray(data.platform) ? data.platform : [data.platform],
      stage: 'reached-out' as const,
      device: 'N/A' as const,
      payment: 'pending' as const,
      views: 0,
      links: [],
      contact: data.contact,
    }
    
    // Use the campaign library's function which properly updates the embedded KOL array
    const { addKOLToCampaign } = await import('@/lib/campaign')
    const userHandle = auth.user?.twitterHandle || auth.user?.name || 'unknown'
    
    const updatedCampaign = await addKOLToCampaign(campaignId, kolData, userHandle)
    
    if (!updatedCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // Also add to the service's data structure to keep profile sync
    const kol = await CampaignKOLService.addKOLToCampaign({
      campaignId,
      campaignName: data.campaignName || campaignId,
      kolHandle: data.kolHandle.replace('@', ''),
      kolName: data.kolName,
      kolImage: data.kolImage,
      tier: data.tier,
      budget: parseFloat(data.budget) || 0,
      platform: data.platform,
      addedBy: userHandle,
    })
    
    // Return the newly added KOL from the campaign
    const newKOL = updatedCampaign.kols[updatedCampaign.kols.length - 1]
    return NextResponse.json(newKOL)
  } catch (error) {
    console.error('Error adding KOL to campaign:', error)
    return NextResponse.json(
      { error: 'Failed to add KOL' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth
    const auth = await checkAuth(request, ['admin', 'core', 'team'])
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!auth.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const campaignId = params.id
    const { kolId, ...updates } = await request.json()
    
    if (!kolId) {
      return NextResponse.json(
        { error: 'KOL ID is required' },
        { status: 400 }
      )
    }
    
    // Parse contact field if updated
    if (updates.contact) {
      updates.contact = CampaignKOLService.parseContact(updates.contact)
    }
    
    // Use the campaign library's function which properly updates the embedded KOL array
    const { updateKOLInCampaign } = await import('@/lib/campaign')
    const userHandle = auth.user?.twitterHandle || auth.user?.name || 'unknown'
    
    const updatedCampaign = await updateKOLInCampaign(campaignId, kolId, updates, userHandle)
    
    if (!updatedCampaign) {
      return NextResponse.json(
        { error: 'Campaign or KOL not found' },
        { status: 404 }
      )
    }
    
    // Also update in the service's data structure to keep them in sync
    await CampaignKOLService.updateCampaignKOL(kolId, updates)
    
    // Return the updated KOL
    const updatedKOL = updatedCampaign.kols.find(k => k.id === kolId)
    return NextResponse.json(updatedKOL)
  } catch (error) {
    console.error('Error updating KOL:', error)
    return NextResponse.json(
      { error: 'Failed to update KOL' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check auth
    const auth = await checkAuth(request, ['admin', 'core'])
    if (!auth.authenticated) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    if (!auth.hasAccess) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }
    
    const campaignId = params.id
    const { kolId } = await request.json()
    
    if (!kolId) {
      return NextResponse.json(
        { error: 'KOL ID is required' },
        { status: 400 }
      )
    }
    
    const userHandle = auth.user?.twitterHandle || auth.user?.name || 'unknown'
    const userRole = auth.role || 'user'
    const isAdmin = ['admin', 'core'].includes(userRole)
    
    // Get the campaign first
    const { getCampaign } = await import('@/lib/campaign')
    const campaign = await getCampaign(campaignId)
    
    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }
    
    // For admins, bypass the permission check by updating the campaign directly
    if (isAdmin) {
      campaign.kols = campaign.kols.filter(k => k.id !== kolId)
      campaign.updatedAt = new Date().toISOString()
      
      const { redis } = await import('@/lib/redis')
      await redis.json.set(campaignId, '$', campaign as any)
    } else {
      // For non-admins, use the regular function with permission checks
      const { removeKOLFromCampaign } = await import('@/lib/campaign')
      const updatedCampaign = await removeKOLFromCampaign(campaignId, kolId, userHandle)
      
      if (!updatedCampaign) {
        return NextResponse.json(
          { error: 'Failed to remove KOL' },
          { status: 400 }
        )
      }
    }
    
    // Also remove from the service's data structure to keep them in sync
    await CampaignKOLService.removeKOLFromCampaign(campaignId, kolId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing KOL:', error)
    return NextResponse.json(
      { error: 'Failed to remove KOL' },
      { status: 500 }
    )
  }
} 