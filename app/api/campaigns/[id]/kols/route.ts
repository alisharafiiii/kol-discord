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
    
    // Add KOL to campaign
    const kol = await CampaignKOLService.addKOLToCampaign({
      campaignId,
      campaignName: data.campaignName || campaignId,
      kolHandle: data.kolHandle.replace('@', ''),
      kolName: data.kolName,
      kolImage: data.kolImage,
      tier: data.tier,
      budget: data.budget,
      platform: data.platform,
      addedBy: auth.user?.twitterHandle || auth.user?.name || 'unknown',
    })
    
    return NextResponse.json(kol)
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
    
    // Update KOL
    const updated = await CampaignKOLService.updateCampaignKOL(kolId, updates)
    
    return NextResponse.json(updated)
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