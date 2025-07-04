import { NextRequest, NextResponse } from 'next/server'
import { EngagementService } from '@/lib/services/engagement-service'
import { checkAuth } from '@/lib/auth-utils'
import { redis } from '@/lib/redis'

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const auth = await checkAuth(request, ['admin', 'core', 'viewer'])
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Get recent engagement logs from all users
    const allLogs = []
    const connectionKeys = await redis.keys('engagement:connection:*')
    
    for (const connectionKey of connectionKeys) {
      const connection = await redis.json.get(connectionKey) as any
      if (!connection) continue
      
      // Get recent logs for this user
      const logIds = await redis.zrange(
        `engagement:user:${connection.discordId}:logs`,
        -limit,
        -1,
        { rev: true }
      )
      
      for (const logId of logIds) {
        const log = await redis.json.get(`engagement:log:${logId}`) as any
        if (log) {
          // Get tweet info for context
          let tweetAuthor = 'Unknown'
          try {
            const tweet = await EngagementService.getTweet(log.tweetId)
            if (tweet) {
              tweetAuthor = tweet.authorHandle
            }
          } catch (error) {
            console.error('Error fetching tweet:', error)
          }
          
          allLogs.push({
            id: log.id,
            userId: connection.discordId,
            userName: `@${connection.twitterHandle}`,
            points: log.points,
            action: log.interactionType,
            timestamp: log.timestamp,
            description: `${log.interactionType === 'reply' ? 'Commented on' : log.interactionType === 'retweet' ? 'Retweeted' : 'Liked'} @${tweetAuthor}'s tweet`,
            tier: connection.tier,
            batchId: log.batchId
          })
        }
      }
    }
    
    // Sort by timestamp descending
    allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    // Limit to requested amount
    const transactions = allLogs.slice(0, limit)
    
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
} 