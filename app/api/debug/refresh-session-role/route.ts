import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ProfileService } from '@/lib/services/profile-service'
import { redis } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No session found. Please sign in.' }, { status: 401 })
    }
    
    // Get Twitter handle from session
    const twitterHandle = (session as any)?.twitterHandle || session?.user?.name
    
    if (!twitterHandle) {
      return NextResponse.json({ 
        error: 'No Twitter handle found in session'
      }, { status: 400 })
    }
    
    // Normalize handle
    const normalizedHandle = twitterHandle.toLowerCase().replace('@', '')
    
    // Get current role from database
    const profile = await ProfileService.getProfileByHandle(normalizedHandle)
    
    if (!profile) {
      return NextResponse.json({ 
        error: 'Profile not found in database',
        twitterHandle: normalizedHandle
      }, { status: 404 })
    }
    
    // Force session invalidation by setting an invalidation timestamp
    // This will cause the JWT callback to return null and force re-authentication
    const invalidationKey = `auth:invalidate:${normalizedHandle}`
    await redis.set(invalidationKey, Date.now().toString(), 'EX', 60) // Expire after 60 seconds
    
    return NextResponse.json({
      success: true,
      message: 'Session invalidation triggered. Please sign out and sign back in to refresh your role.',
      currentDatabaseRole: profile.role,
      currentDatabaseApprovalStatus: profile.approvalStatus,
      instructions: [
        '1. Sign out using the logout button or menu',
        '2. Sign back in with Twitter',
        '3. Your session will have the updated role from the database',
        `4. Your current database role is: ${profile.role}`
      ]
    })
  } catch (error) {
    console.error('Refresh session role error:', error)
    return NextResponse.json({ 
      error: 'Failed to refresh session role',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 