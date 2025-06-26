import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Check if user can edit metrics (admin or core only)
    const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    
    if (!session || !canEdit) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign')
    
    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }
    
    console.log('[Delete All] Deleting all entries for campaign:', campaignId)
    
    // Delete the entire metrics list for this campaign
    const metricsKey = `metrics:${campaignId}`
    const result = await redis.del(metricsKey)
    
    console.log('[Delete All] Deletion result:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: `All entries deleted for campaign ${campaignId}` 
    })
  } catch (error) {
    console.error('[Delete All] Error:', error)
    return NextResponse.json({ error: 'Failed to delete all metrics' }, { status: 500 })
  }
} 