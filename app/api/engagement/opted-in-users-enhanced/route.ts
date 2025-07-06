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
    
    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sort') || 'points'
    const order = searchParams.get('order') || 'desc'
    const search = searchParams.get('search') || ''
    
    // Validate parameters
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json({ error: 'Invalid pagination parameters' }, { status: 400 })
    }
    
    // Get all connections
    const connections = await redis.keys('engagement:connection:*')
    const users = []
    const seenHandles = new Set<string>()
    
    // Process connections in parallel for better performance
    const processPromises = connections.map(async (connectionKey: string) => {
      const connection = await redis.json.get(connectionKey) as any
      if (!connection) return null
      
      // Skip duplicates based on Twitter handle
      const handle = connection.twitterHandle?.toLowerCase()
      if (!handle || seenHandles.has(handle)) return null
      seenHandles.add(handle)
      
      // Get user data in parallel
      const [profile, discordData, engagementStats, recentActivity] = await Promise.all([
        // Get profile
        ProfileService.getProfileByHandle(connection.twitterHandle).catch(() => null),
        
        // Get Discord data
        redis.json.get(`discord:user:${connection.discordId}`).catch(() => null),
        
        // Get engagement stats
        getEngagementStats(connection.discordId),
        
        // Get recent activity
        getRecentActivity(connection.discordId)
      ])
      
      // Process Discord servers
      let discordUsername = ''
      let discordServers: string[] = []
      
      if (discordData) {
        discordUsername = (discordData as any).username || ''
        
        // Get servers
        if ((discordData as any).projects?.length > 0) {
          const serverPromises = (discordData as any).projects.map(async (projectId: string) => {
            const project = await DiscordService.getProject(projectId)
            return project?.serverName || null
          })
          
          const servers = await Promise.all(serverPromises)
          discordServers = servers.filter(Boolean) as string[]
        }
        
        if (discordServers.length === 0) {
          discordServers.push('Nabulines')
        }
      }
      
      // Use avatar service as fallback
      const profilePicture = profile?.profileImageUrl || `https://unavatar.io/twitter/${connection.twitterHandle}`
      
      return {
        discordId: connection.discordId,
        twitterHandle: connection.twitterHandle,
        discordUsername,
        discordServers,
        tier: connection.tier || 'micro',
        totalPoints: connection.totalPoints || 0,
        profilePicture,
        tweetsSubmitted: engagementStats.tweetsSubmitted,
        totalLikes: engagementStats.totalLikes,
        totalRetweets: engagementStats.totalRetweets,
        totalComments: engagementStats.totalComments,
        recentActivity
      }
    })
    
    // Wait for all processing to complete
    const processedUsers = await Promise.all(processPromises)
    const validUsers = processedUsers.filter(Boolean) as any[]
    
    // Apply search filter if provided
    let filteredUsers = validUsers
    if (search) {
      const searchLower = search.toLowerCase()
      filteredUsers = validUsers.filter(user => 
        user.twitterHandle.toLowerCase().includes(searchLower) ||
        user.discordUsername.toLowerCase().includes(searchLower) ||
        user.discordId.toLowerCase().includes(searchLower) ||
        user.discordServers.some((server: string) => server.toLowerCase().includes(searchLower))
      )
    }
    
    // Sort users
    filteredUsers.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'points':
          comparison = a.totalPoints - b.totalPoints
          break
        case 'tweets':
          comparison = a.tweetsSubmitted - b.tweetsSubmitted
          break
        case 'engagement':
          const aTotal = a.totalLikes + a.totalRetweets + a.totalComments
          const bTotal = b.totalLikes + b.totalRetweets + b.totalComments
          comparison = aTotal - bTotal
          break
        default:
          comparison = a.totalPoints - b.totalPoints
      }
      
      return order === 'desc' ? -comparison : comparison
    })
    
    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)
    
    return NextResponse.json({
      users: paginatedUsers,
      total: filteredUsers.length,
      page,
      limit,
      totalPages: Math.ceil(filteredUsers.length / limit)
    })
    
  } catch (error) {
    console.error('Error fetching opted-in users:', error)
    return NextResponse.json({ error: 'Failed to fetch opted-in users' }, { status: 500 })
  }
}

async function getEngagementStats(discordId: string) {
  try {
    let tweetsSubmitted = 0
    let totalLikes = 0
    let totalRetweets = 0
    let totalComments = 0
    
    // Count submitted tweets more efficiently using score range
    const now = Date.now()
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    const recentTweetIds = await redis.zrange('engagement:tweets:recent', thirtyDaysAgo, now, { byScore: true })
    
    // Check tweets in parallel
    const tweetChecks = recentTweetIds.map(async (tweetId: string) => {
      const tweet = await redis.json.get(`engagement:tweet:${tweetId}`) as any
      return tweet && tweet.submitterDiscordId === discordId
    })
    
    const results = await Promise.all(tweetChecks)
    tweetsSubmitted = results.filter(Boolean).length
    
    // Get engagement logs
    const engagementLogs = await EngagementService.getUserEngagements(discordId, 100)
    for (const log of engagementLogs) {
      switch (log.interactionType) {
        case 'like':
          totalLikes++
          break
        case 'retweet':
          totalRetweets++
          break
        case 'reply':
          totalComments++
          break
        case 'comment' as any:  // Handle comment as alias for reply
          totalComments++
          break
      }
    }
    
    return {
      tweetsSubmitted,
      totalLikes,
      totalRetweets,
      totalComments
    }
  } catch (error) {
    console.error(`Error getting engagement stats for ${discordId}:`, error)
    return {
      tweetsSubmitted: 0,
      totalLikes: 0,
      totalRetweets: 0,
      totalComments: 0
    }
  }
}

async function getRecentActivity(discordId: string) {
  try {
    // Get most recent engagement log
    const logIds = await redis.zrange(`engagement:user:${discordId}:logs`, -1, -1, { rev: true })
    if (logIds.length === 0) return []
    
    const recentLog = await redis.json.get(`engagement:log:${logIds[0]}`) as any
    if (!recentLog) return []
    
    return [{
      action: recentLog.interactionType,
      points: recentLog.points,
      timestamp: recentLog.timestamp
    }]
  } catch (error) {
    console.error(`Error getting recent activity for ${discordId}:`, error)
    return []
  }
} 