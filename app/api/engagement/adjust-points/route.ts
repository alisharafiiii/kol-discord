import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { Redis } from '@upstash/redis'
import { toEdtIsoString } from '@/lib/utils/timezone'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check role
    const userRole = (session as any).role || (session.user as any)?.role
    if (!['admin', 'core'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { discordId, points, reason } = await request.json()
    
    if (!discordId || points === undefined || points === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }
    
    // Get user connection
    const connection = await redis.json.get(`engagement:connection:${discordId}`)
    if (!connection) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Update points
    const currentPoints = (connection as any).totalPoints || 0
    const newPoints = Math.max(0, currentPoints + points) // Ensure points don't go negative
    
    await redis.json.set(`engagement:connection:${discordId}`, '$.totalPoints', newPoints)
    
    // Create transaction log
    const transactionId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const transaction = {
      id: transactionId,
      userId: discordId,
      userName: `@${(connection as any).twitterHandle}`,
      points: points,
      action: 'manual_adjustment',
      timestamp: toEdtIsoString(new Date()),
      description: reason || 'Manual adjustment',
      adminId: (session.user as any).id,
      adminName: session.user?.name || 'Admin',
      previousBalance: currentPoints,
      newBalance: newPoints
    }
    
    // Save transaction
    await redis.json.set(`engagement:transaction:${transactionId}`, '$', transaction)
    await redis.zadd('engagement:transactions:recent', {
      score: Date.now(),
      member: transactionId
    })
    
    // Log the adjustment
    console.log(`[Points Adjustment] Admin ${session.user?.name} adjusted ${points} points for @${(connection as any).twitterHandle} (${discordId}). Reason: ${reason || 'Manual adjustment'}`)
    
    return NextResponse.json({ 
      success: true,
      message: `Successfully adjusted ${points > 0 ? '+' : ''}${points} points`,
      newBalance: newPoints,
      transaction
    })
    
  } catch (error) {
    console.error('[Adjust Points API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 