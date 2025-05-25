import { NextRequest, NextResponse } from 'next/server'
import { getCampaignBySlug } from '@/lib/campaign'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const campaign = await getCampaignBySlug(params.slug)
    
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
    
    return NextResponse.json(campaign)
  } catch (error) {
    console.error('Error fetching campaign by slug:', error)
    return NextResponse.json({ error: 'Failed to fetch campaign' }, { status: 500 })
  }
} 