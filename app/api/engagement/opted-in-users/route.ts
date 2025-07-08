import { NextRequest, NextResponse } from 'next/server'
import { EngagementService } from '@/lib/services/engagement-service'
import { DiscordService } from '@/lib/services/discord-service'
import { ProfileService } from '@/lib/services/profile-service'
import { checkAuth } from '@/lib/auth-utils'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const auth = await checkAuth(request, ['admin', 'core', 'viewer'])
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('[OptedInUsers API] Fetching optimized user data...')
    const startTime = Date.now()
    
    // Use optimized method with caching
    const users = await EngagementService.getOptedInUsersOptimized()
    
    const duration = Date.now() - startTime
    console.log(`[OptedInUsers API] Returned ${users.length} users in ${duration}ms`)
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching opted-in users:', error)
    return NextResponse.json({ error: 'Failed to fetch opted-in users' }, { status: 500 })
  }
} 