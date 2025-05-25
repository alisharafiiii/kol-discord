import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { addKOLToCampaign, updateKOLInCampaign, removeKOLFromCampaign } from '@/lib/campaign'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const kolData = await request.json()
    
    // Validate required fields
    if (!kolData.handle || !kolData.name) {
      return NextResponse.json(
        { error: 'Missing required fields: handle and name' }, 
        { status: 400 }
      )
    }
    
    // Set defaults for required fields
    const kol = {
      handle: kolData.handle,
      name: kolData.name,
      stage: kolData.stage || 'reached-out',
      device: kolData.device || 'N/A',
      budget: kolData.budget || 'free',
      payment: kolData.payment || 'pending',
      views: kolData.views || 0,
      links: kolData.links || [],
      platform: kolData.platform || []
    }
    
    const campaign = await addKOLToCampaign(params.id, kol, session.user.name)
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error adding KOL to campaign:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to add KOL' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { kolId, ...updates } = await request.json()
    
    if (!kolId) {
      return NextResponse.json({ error: 'KOL ID required' }, { status: 400 })
    }
    
    const campaign = await updateKOLInCampaign(params.id, kolId, updates, session.user.name)
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign or KOL not found' }, { status: 404 })
    }
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error updating KOL:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to update KOL' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { kolId } = await request.json()
    
    if (!kolId) {
      return NextResponse.json({ error: 'KOL ID required' }, { status: 400 })
    }
    
    const campaign = await removeKOLFromCampaign(params.id, kolId, session.user.name)
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    return NextResponse.json(campaign)
  } catch (error: any) {
    console.error('Error removing KOL:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to remove KOL' }, { status: 500 })
  }
} 