import { NextRequest, NextResponse } from 'next/server'
import { redis, InfluencerProfile } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    const { userId, status } = await request.json()
    
    // Validate inputs
    if (!userId || !['approved', 'pending', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid user ID or status' }, { status: 400 })
    }
    
    // Get the user from Redis
    const userKey = `user:${userId}`
    const user = await redis.json.get(userKey) as InfluencerProfile | null
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Update status in Redis
    await redis.json.set(userKey, '$.approvalStatus', status)
    
    // Also update the status indexes
    const oldStatus = user.approvalStatus || 'pending'
    if (oldStatus !== status) {
      // Remove from old status set
      await redis.srem(`idx:status:${oldStatus}`, userId)
      // Add to new status set
      await redis.sadd(`idx:status:${status}`, userId)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
} 