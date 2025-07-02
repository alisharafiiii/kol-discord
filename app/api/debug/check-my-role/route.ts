import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Get the session
    const session: any = await getServerSession(authOptions as any)
    
    if (!session) {
      return NextResponse.json({ 
        error: 'No session found',
        authenticated: false 
      })
    }
    
    // Get Twitter handle from session
    const twitterHandle = session?.twitterHandle || 
                         session?.user?.username ||
                         session?.user?.handle ||
                         session?.user?.name
    
    // Find user in Redis
    let userProfile = null
    let userRole = null
    
    if (twitterHandle) {
      const cleanHandle = twitterHandle.replace('@', '').toLowerCase()
      const userIds = await redis.smembers(`idx:username:${cleanHandle}`)
      
      if (userIds && userIds.length > 0) {
        const userData = await redis.json.get(`user:${userIds[0]}`)
        userProfile = userData
        userRole = userData?.role || 'user'
      }
    }
    
    return NextResponse.json({
      session: {
        twitterHandle,
        user: session.user,
        role: session.role,
        approvalStatus: session.approvalStatus,
        rawSession: session
      },
      database: {
        userProfile,
        role: userRole,
        handle: twitterHandle
      },
      debug: {
        message: 'Use this information to debug role issues',
        expectedRoles: ['admin', 'core', 'kol', 'scout', 'viewer', 'user'],
        yourRole: userRole
      }
    })
  } catch (error) {
    console.error('Error checking role:', error)
    return NextResponse.json({ 
      error: 'Failed to check role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 