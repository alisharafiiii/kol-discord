import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { checkAuth } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    // Check auth - only admins can trigger notification processing
    const authResult = await checkAuth(request)
    if (!authResult.authenticated || authResult.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { limit = 10 } = await request.json()
    
    // Process pending notifications
    await NotificationService.processPending(limit)
    
    // Get updated queue status
    const status = await NotificationService.getQueueStatus()
    
    return NextResponse.json({
      success: true,
      status
    })
    
  } catch (error: any) {
    console.error('Error processing notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process notifications' },
      { status: 500 }
    )
  }
} 