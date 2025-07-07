import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { ProfileService } from '@/lib/services/profile-service'
import { EngagementService } from '@/lib/services/engagement-service'

export async function GET(request: NextRequest) {
  try {
    console.log('[Dashboard API] Request received')
    
    // Get session
    const session = await getServerSession(authOptions)
    console.log('[Dashboard API] Session:', session ? 'Found' : 'Not found', session?.user?.name)
    
    // Add detailed debug logging
    console.log('[Dashboard API] Session details:', {
      hasSession: !!session,
      userName: session?.user?.name,
      userEmail: session?.user?.email,
      userImage: session?.user?.image,
      twitterHandle: (session as any)?.twitterHandle,
      fullSessionUser: JSON.stringify(session?.user),
      fullSession: JSON.stringify(session)
    })
    
    // Get Twitter handle from session - it might be in different places
    let twitterHandle = null
    if ((session as any)?.twitterHandle) {
      twitterHandle = (session as any).twitterHandle
    } else if (session?.user?.name && !session.user.name.includes('.eth')) {
      // If user.name doesn't look like an ENS name, use it
      twitterHandle = session.user.name
    }
    
    if (!twitterHandle) {
      console.log('[Dashboard API] No Twitter handle found in session')
      return NextResponse.json({ error: 'Twitter handle not found in session' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Get user profile
    console.log('[Dashboard API] Looking up profile for Twitter handle:', twitterHandle)
    const profile = await ProfileService.getProfileByHandle(twitterHandle)
    
    console.log('[Dashboard API] Profile lookup result:', {
      found: !!profile,
      profileId: profile?.id,
      profileHandle: profile?.twitterHandle,
      profileName: profile?.name
    })
    
    if (!profile) {
      console.log('[Dashboard API] Profile not found for:', twitterHandle)
      
      // Check if we can find profile with variations
      const variations = [
        twitterHandle,
        twitterHandle.replace('@', ''),
        '@' + twitterHandle,
        twitterHandle.toLowerCase(),
        twitterHandle.toUpperCase()
      ]
      
      console.log('[Dashboard API] Trying variations:', variations)
      for (const variation of variations) {
        const varProfile = await ProfileService.getProfileByHandle(variation)
        if (varProfile) {
          console.log('[Dashboard API] Found profile with variation:', variation)
          break
        }
      }
      
      return NextResponse.json({ error: 'Profile not found' }, { 
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Get Discord connection - use the Twitter handle
    const discordConnection = await redis.get(`engagement:twitter:${twitterHandle.toLowerCase()}`)
    console.log('[Dashboard API] Discord connection:', discordConnection ? 'Found' : 'Not found')
    
    if (!discordConnection) {
      return NextResponse.json({ error: 'Discord account not linked' }, { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      })
    }

    // Get engagement data
    const engagementData = await redis.json.get(`engagement:connection:${discordConnection}`) as any
    if (!engagementData) {
      return NextResponse.json({ error: 'Engagement data not found' }, { status: 404 })
    }

    // Get weekly points (last 7 days)
    const weeklyPoints = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      
      // Get points for this day
      const dayStart = date.getTime()
      const dayEnd = dayStart + (24 * 60 * 60 * 1000)
      
      // Get engagement logs for this day
      const logs = await EngagementService.getUserEngagements(discordConnection, 1000)
      const dayLogs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime()
        return logTime >= dayStart && logTime < dayEnd
      })
      
      const dayPoints = dayLogs.reduce((sum, log) => sum + log.points, 0)
      
      weeklyPoints.push({
        date: dateStr,
        points: dayPoints
      })
    }

    // Get recent transactions (last 10)
    const recentLogs = await EngagementService.getUserEngagements(discordConnection, 10)
    const recentTransactions = recentLogs.map(log => ({
      id: log.id,
      action: log.interactionType,
      points: log.points,
      timestamp: log.timestamp,
      description: getTransactionDescription(log)
    }))

    // Return dashboard data
    return NextResponse.json({
      user: {
        discordId: discordConnection,
        twitterHandle: twitterHandle || '',
        profilePicture: profile.profileImageUrl || (session?.user?.image || ''),
        totalPoints: engagementData.totalPoints || 0,
        tier: engagementData.tier || 'micro'
      },
      weeklyPoints,
      recentTransactions
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    })
  }
}

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

function getTransactionDescription(log: any): string {
  const actionMap: Record<string, string> = {
    like: 'Liked a tweet',
    retweet: 'Retweeted',
    reply: 'Replied to tweet',
    comment: 'Commented on tweet',
    submit: 'Submitted tweet',
    bonus: 'Bonus points',
    adjustment: 'Points adjustment'
  }
  
  return actionMap[log.interactionType] || log.interactionType
} 