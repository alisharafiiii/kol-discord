import { NextRequest, NextResponse } from 'next/server'
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
    const seenHandles = new Set<string>()
    
    let totalPoints = 0
    let totalUsers = 0
    const userDiscordIds = new Set<string>()
    
    // First pass: collect unique users and total points
    for (const connectionKey of connections) {
      const connection = await redis.json.get(connectionKey) as any
      if (!connection) continue
      
      // Skip duplicates based on Twitter handle
      const handle = connection.twitterHandle?.toLowerCase()
      if (!handle || seenHandles.has(handle)) continue
      seenHandles.add(handle)
      
      totalUsers++
      totalPoints += connection.totalPoints || 0
      userDiscordIds.add(connection.discordId)
    }
    
    // Get recent tweets once
    const now = Date.now()
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    const recentTweetIds = await redis.zrange('engagement:tweets:recent', thirtyDaysAgo, now, { byScore: true })
    
    // Process tweets to count active users and total tweets
    let activeUsers = 0
    let totalTweets = 0
    const userTweetCounts = new Map<string, number>()
    
    // Fetch all tweets in parallel
    const tweetPromises = recentTweetIds.map(async (tweetId: string) => {
      const tweet = await redis.json.get(`engagement:tweet:${tweetId}`) as any
      return tweet
    })
    
    const tweets = await Promise.all(tweetPromises)
    
    // Count tweets per user
    for (const tweet of tweets) {
      if (tweet && userDiscordIds.has(tweet.submitterDiscordId)) {
        const currentCount = userTweetCounts.get(tweet.submitterDiscordId) || 0
        userTweetCounts.set(tweet.submitterDiscordId, currentCount + 1)
      }
    }
    
    // Calculate active users and total tweets
    Array.from(userTweetCounts).forEach(([discordId, count]) => {
      if (count > 0) {
        activeUsers++
        totalTweets += count
      }
    })
    
    const averagePoints = totalUsers > 0 ? Math.round(totalPoints / totalUsers) : 0
    
    return NextResponse.json({
      totalPoints,
      activeUsers,
      averagePoints,
      totalTweets,
      totalUsers
    })
    
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return NextResponse.json({ error: 'Failed to fetch user stats' }, { status: 500 })
  }
} 