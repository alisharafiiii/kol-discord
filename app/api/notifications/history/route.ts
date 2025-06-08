import { NextResponse } from 'next/server'
import { NotificationService } from '@/lib/notification-service'
import { checkAuth } from '@/lib/auth-utils'

export async function GET(request: Request) {
  try {
    // Check auth
    const authResult = await checkAuth(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as any
    const email = searchParams.get('email')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    // Admins can see all notifications, others only their own
    const filterEmail = authResult.role === 'admin' ? email : undefined
    
    // For non-admins, we would need to lookup their email from their profile
    // This is a limitation of the current auth system
    if (!filterEmail && authResult.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Email filtering not available for non-admin users',
        message: 'Please contact an admin to view your notifications'
      }, { status: 400 })
    }
    
    const notifications = await NotificationService.getHistory({
      type,
      email: filterEmail || undefined,
      limit
    })
    
    return NextResponse.json({
      notifications,
      count: notifications.length
    })
    
  } catch (error: any) {
    console.error('Error fetching notification history:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
} 