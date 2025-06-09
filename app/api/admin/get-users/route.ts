import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { redis, InfluencerProfile } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    // Check if user is logged in with Twitter and is admin
    const session: any = await getServerSession(authOptions as any)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 })
    }
    
    // Get Twitter handle from session
    const twitterHandle = session?.twitterHandle || session?.user?.twitterHandle || session?.user?.name
    const normalizedHandle = twitterHandle?.toLowerCase().replace('@', '')
    
    console.log('[ADMIN GET-USERS] Twitter handle:', twitterHandle, 'Normalized:', normalizedHandle)
    
    // Check if user is sharafi_eth (hardcoded admin)
    if (normalizedHandle !== 'sharafi_eth') {
      // For non-sharafi_eth users, check their role in session
      const userRole = session?.user?.role || session?.role
      console.log('[ADMIN GET-USERS] User role:', userRole)
      
      if (userRole !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
      }
    }
    
    console.log('[ADMIN GET-USERS] Access granted, fetching users...')
    
    // Try to get users from Redis
    try {
      // Get all user keys from Redis
      const userKeys = await redis.keys('user:*')
      
      // Fetch all user profiles
      const users = await Promise.all(
        userKeys.map(async (key: string) => {
          const userId = key.replace('user:', '')
          const profile = await redis.json.get(key) as InfluencerProfile | null
          
          if (!profile) return null
          
          // Calculate total follower count from all social profiles
          let totalFollowers = profile.followerCount || 0
          
          // Use the twitter handle from socialAccounts if available
          let handleFromSocial = ''
          if (profile.socialAccounts && profile.socialAccounts.twitter && 
              typeof profile.socialAccounts.twitter === 'object' && 
              'handle' in profile.socialAccounts.twitter) {
            handleFromSocial = profile.socialAccounts.twitter.handle || ''
            // Also update followers from Twitter if available
            if ('followers' in profile.socialAccounts.twitter && 
                typeof profile.socialAccounts.twitter.followers === 'number') {
              totalFollowers = profile.socialAccounts.twitter.followers
            }
          }
          
          // Handle other social accounts for total follower count
          if (profile.socialAccounts) {
            Object.entries(profile.socialAccounts).forEach(([platform, account]) => {
              if (platform !== 'twitter' && account && typeof account === 'object') {
                if ('followers' in account && typeof account.followers === 'number') {
                  totalFollowers += account.followers
                }
                if ('subscribers' in account && typeof account.subscribers === 'number') {
                  totalFollowers += account.subscribers
                }
              }
            })
          }
          
          // Get Twitter handle from profile or social accounts
          const twitterHandle = profile.twitterHandle || 
                   (handleFromSocial ? `@${handleFromSocial.replace(/^@/, '')}` : null)
          
          // Create a normalized user object with consistent properties
          return {
            ...profile,
            // Use consistent ID scheme
            id: profile.id || userId,
            // Use the Twitter handle from profile or social accounts, ensuring it has @ prefix
            handle: twitterHandle,
            // Keep both totalFollowers for UI and followerCount for original data
            totalFollowers,
            followerCount: profile.followerCount || totalFollowers
          }
        })
      )
      
      // Filter out any null entries
      const validUsers = users.filter(Boolean) as any[]
      
      // Deduplicate by Twitter handle
      const uniqueUsersMap = new Map()
      
      validUsers.forEach(user => {
        const twitterHandle = user.handle?.toLowerCase() || user.twitterHandle?.toLowerCase()
        const key = twitterHandle || user.id
        
        if (!key) return
        
        if (uniqueUsersMap.has(key)) {
          const existing = uniqueUsersMap.get(key)
          
          if ((!existing.handle && user.handle) || 
              (user.totalFollowers > (existing.totalFollowers || 0))) {
            
            const mergedUser = {
              ...existing,
              ...user,
              totalFollowers: Math.max(user.totalFollowers || 0, existing.totalFollowers || 0),
              handle: user.handle || existing.handle,
              twitterHandle: user.twitterHandle || existing.twitterHandle
            }
            
            uniqueUsersMap.set(key, mergedUser)
          }
        } else {
          uniqueUsersMap.set(key, user)
        }
      })
      
      const uniqueUsers = Array.from(uniqueUsersMap.values())
      
      console.log(`[ADMIN GET-USERS] Returning ${uniqueUsers.length} users`)
      return NextResponse.json({ users: uniqueUsers })
      
    } catch (redisError) {
      console.error('[ADMIN GET-USERS] Redis error:', redisError)
      
      // If Redis is down, return empty array so admin panel still loads
      return NextResponse.json({ 
        users: [],
        error: 'Database connection failed - showing empty user list'
      })
    }
    
  } catch (error) {
    console.error('[ADMIN GET-USERS] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 