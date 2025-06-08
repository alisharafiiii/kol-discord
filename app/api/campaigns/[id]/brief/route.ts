import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { getCampaign, updateCampaignBrief } from '@/lib/campaign'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const campaign = await getCampaign(params.id)
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      brief: campaign.brief || '',
      briefUpdatedAt: campaign.briefUpdatedAt,
      briefUpdatedBy: campaign.briefUpdatedBy
    })
  } catch (error) {
    console.error('Error fetching campaign brief:', error)
    return NextResponse.json({ error: 'Failed to fetch brief' }, { status: 500 })
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
    
    const { brief } = await request.json()
    
    if (!brief || typeof brief !== 'string') {
      return NextResponse.json({ error: 'Invalid brief content' }, { status: 400 })
    }
    
    const userHandle = (session as any).twitterHandle || session.user.name
    const updatedCampaign = await updateCampaignBrief(params.id, brief, userHandle)
    
    if (!updatedCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      brief: updatedCampaign.brief,
      briefUpdatedAt: updatedCampaign.briefUpdatedAt,
      briefUpdatedBy: updatedCampaign.briefUpdatedBy
    })
  } catch (error: any) {
    console.error('Error updating campaign brief:', error)
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    return NextResponse.json({ error: 'Failed to update brief' }, { status: 500 })
  }
} 