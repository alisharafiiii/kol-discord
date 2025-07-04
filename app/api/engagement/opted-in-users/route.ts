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
    
    // Get all connections
    const connections = await redis.keys('engagement:connection:*')
    const users = []
    
    for (const connectionKey of connections) {
      const connection = await redis.json.get(connectionKey) as any
      if (!connection) continue
      
      // Get user profile for profile picture
      const profile = await ProfileService.getProfileByHandle(connection.twitterHandle)
      
      // Get Discord user info
      let discordUsername = ''
      let discordServers = []
      try {
        const discordUser = await redis.json.get(`discord:user:${connection.discordId}`) as any
        if (discordUser) {
          discordUsername = discordUser.username || ''
          
          // Get servers (projects) the user is part of
          if (discordUser.projects && discordUser.projects.length > 0) {
            for (const projectId of discordUser.projects) {
              const project = await DiscordService.getProject(projectId)
              if (project) {
                discordServers.push(project.serverName)
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching Discord info for ${connection.discordId}:`, error)
      }
      
      // Get engagement stats
      let tweetsSubmitted = 0
      let totalLikes = 0
      let totalRetweets = 0
      let totalComments = 0
      
      // Count submitted tweets
      const submittedTweetKeys = await redis.keys('engagement:tweet:*')
      for (const tweetKey of submittedTweetKeys) {
        const tweet = await redis.json.get(tweetKey) as any
        if (tweet && tweet.submitterDiscordId === connection.discordId) {
          tweetsSubmitted++
        }
      }
      
      // Get engagement logs for this user
      const engagementLogs = await EngagementService.getUserEngagements(connection.discordId, 1000)
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
        }
      }
      
      users.push({
        discordId: connection.discordId,
        twitterHandle: connection.twitterHandle,
        discordUsername,
        discordServers,
        tier: connection.tier || 'micro',
        totalPoints: connection.totalPoints || 0,
        profilePicture: profile?.profileImageUrl || null,
        tweetsSubmitted,
        totalLikes,
        totalRetweets,
        totalComments
      })
    }
    
    // Sort by total points descending
    users.sort((a, b) => b.totalPoints - a.totalPoints)
    
    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching opted-in users:', error)
    return NextResponse.json({ error: 'Failed to fetch opted-in users' }, { status: 500 })
  }
} 