import { redis } from '../redis'
import { nanoid } from 'nanoid'
import { TwitterConnection, Tweet, EngagementLog, PointRule, LeaderboardEntry, BatchJob } from '../types/engagement'

export class EngagementService {
  // Twitter Connection Management
  static async connectTwitter(discordId: string, twitterHandle: string, tier: TwitterConnection['tier'] = 'micro'): Promise<TwitterConnection> {
    const connection: TwitterConnection = {
      discordId,
      twitterHandle: twitterHandle.toLowerCase().replace('@', ''),
      tier,
      connectedAt: new Date(),
      totalPoints: 0
    }
    
    await redis.json.set(`engagement:connection:${discordId}`, '$', connection as any)
    await redis.set(`engagement:twitter:${connection.twitterHandle}`, discordId)
    
    return connection
  }
  
  static async getConnection(discordId: string): Promise<TwitterConnection | null> {
    const connection = await redis.json.get(`engagement:connection:${discordId}`) as any
    return connection || null
  }
  
  static async getConnectionByTwitter(twitterHandle: string): Promise<TwitterConnection | null> {
    const handle = twitterHandle.toLowerCase().replace('@', '')
    const discordId = await redis.get(`engagement:twitter:${handle}`)
    if (!discordId) return null
    
    return this.getConnection(discordId)
  }
  
  static async updateUserTier(discordId: string, tier: TwitterConnection['tier']): Promise<void> {
    await redis.json.set(`engagement:connection:${discordId}`, '$.tier', tier)
  }
  
  // Tweet Management
  static async submitTweet(
    tweetId: string, 
    submitterDiscordId: string, 
    authorHandle: string,
    url: string,
    category?: string
  ): Promise<Tweet> {
    const tweet: Tweet = {
      id: nanoid(),
      tweetId: tweetId.split('/').pop() || tweetId, // Extract ID from URL if needed
      submitterDiscordId,
      submittedAt: new Date(),
      category,
      url,
      authorHandle: authorHandle.toLowerCase().replace('@', '')
    }
    
    await redis.json.set(`engagement:tweet:${tweet.id}`, '$', tweet as any)
    await redis.zadd('engagement:tweets:recent', { score: Date.now(), member: tweet.id })
    
    // Store by tweet ID for duplicate checking
    await redis.set(`engagement:tweetid:${tweet.tweetId}`, tweet.id)
    
    return tweet
  }
  
  static async getTweet(id: string): Promise<Tweet | null> {
    const tweet = await redis.json.get(`engagement:tweet:${id}`) as any
    return tweet || null
  }
  
  static async getRecentTweets(hours: number = 24): Promise<Tweet[]> {
    // Due to server clock issues, we'll get all tweets and sort by date
    // instead of using the time-based filter
    const limit = 100; // Get last 100 tweets
    const tweetIds = await redis.zrange('engagement:tweets:recent', 0, limit - 1, { rev: true })
    
    const tweets: Tweet[] = []
    for (const id of tweetIds) {
      const tweet = await this.getTweet(id)
      if (tweet) tweets.push(tweet)
    }
    
    // Sort by submittedAt date in descending order
    tweets.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    
    return tweets
  }
  
  static async checkDuplicateTweet(tweetId: string): Promise<boolean> {
    const exists = await redis.exists(`engagement:tweetid:${tweetId}`)
    return exists === 1
  }
  
  // Point Rules Management
  static async setPointRule(tier: number, interactionType: string, points: number): Promise<PointRule> {
    const rule: PointRule = {
      id: `${tier}-${interactionType}`,
      tier,
      interactionType: interactionType as any,
      points
    }
    
    await redis.json.set(`engagement:rules:${rule.id}`, '$', rule as any)
    return rule
  }
  
  static async getPointRule(tier: number, interactionType: string): Promise<PointRule | null> {
    const rule = await redis.json.get(`engagement:rules:${tier}-${interactionType}`) as any
    return rule || null
  }
  
  static async getAllPointRules(): Promise<PointRule[]> {
    const keys = await redis.keys('engagement:rules:*')
    const rules: PointRule[] = []
    
    for (const key of keys) {
      const rule = await redis.json.get(key) as any
      if (rule) rules.push(rule)
    }
    
    return rules
  }
  
  // Engagement Logging
  static async logEngagement(
    tweetId: string,
    userDiscordId: string,
    interactionType: string,
    points: number,
    batchId: string
  ): Promise<EngagementLog> {
    const log: EngagementLog = {
      id: nanoid(),
      tweetId,
      userDiscordId,
      interactionType: interactionType as any,
      points,
      timestamp: new Date(),
      batchId
    }
    
    await redis.json.set(`engagement:log:${log.id}`, '$', log as any)
    
    // Update user points
    const connection = await this.getConnection(userDiscordId)
    if (connection) {
      await redis.json.numincrby(`engagement:connection:${userDiscordId}`, '$.totalPoints', points)
    }
    
    // Add to user's engagement history
    await redis.zadd(`engagement:user:${userDiscordId}:logs`, { score: Date.now(), member: log.id })
    
    // Add to tweet's engagement logs
    await redis.zadd(`engagement:tweet:${tweetId}:logs`, { score: Date.now(), member: log.id })
    
    return log
  }
  
  static async getUserEngagements(discordId: string, limit: number = 50): Promise<EngagementLog[]> {
    const logIds = await redis.zrange(`engagement:user:${discordId}:logs`, 0, limit - 1, { rev: true })
    const logs: EngagementLog[] = []
    
    for (const id of logIds) {
      const log = await redis.json.get(`engagement:log:${id}`) as any
      if (log) logs.push(log)
    }
    
    return logs
  }
  
  // Batch Job Management
  static async createBatchJob(): Promise<BatchJob> {
    const job: BatchJob = {
      id: nanoid(),
      startedAt: new Date(),
      status: 'pending',
      tweetsProcessed: 0,
      engagementsFound: 0
    }
    
    await redis.json.set(`engagement:batch:${job.id}`, '$', job as any)
    await redis.zadd('engagement:batches', { score: Date.now(), member: job.id })
    
    return job
  }
  
  static async updateBatchJob(id: string, updates: Partial<BatchJob>): Promise<void> {
    for (const [key, value] of Object.entries(updates)) {
      await redis.json.set(`engagement:batch:${id}`, `$.${key}`, value as any)
    }
  }
  
  static async getRecentBatchJobs(limit: number = 10): Promise<BatchJob[]> {
    const jobIds = await redis.zrange('engagement:batches', 0, limit - 1, { rev: true })
    const jobs: BatchJob[] = []
    
    for (const id of jobIds) {
      const job = await redis.json.get(`engagement:batch:${id}`) as any
      if (job) jobs.push(job)
    }
    
    return jobs
  }
  
  // Leaderboard
  static async getLeaderboard(limit: number = 50): Promise<LeaderboardEntry[]> {
    // Check cache first
    const cacheKey = `engagement:cache:leaderboard:${limit}`
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log('[EngagementService] Returning cached leaderboard')
      return JSON.parse(cached)
    }
    
    console.log('[EngagementService] Building leaderboard from scratch...')
    const startTime = Date.now()
    
    const keys = await redis.keys('engagement:connection:*')
    const entries: LeaderboardEntry[] = []
    
    // Batch fetch all connections
    const batchSize = 50
    for (let i = 0; i < keys.length; i += batchSize) {
      const batchKeys = keys.slice(i, i + batchSize)
      const batchPromises = batchKeys.map(async (key: string) => {
        const connection = await redis.json.get(key) as TwitterConnection
        if (!connection) return null
        
        // For now, set weekly points to 0 to optimize initial load
        // We can calculate these in a background job
        return {
          discordId: connection.discordId,
          twitterHandle: connection.twitterHandle,
          tier: connection.tier,
          totalPoints: connection.totalPoints,
          weeklyPoints: 0,
          rank: 0
        } as LeaderboardEntry
      })
      
      const batchResults = await Promise.all(batchPromises)
      entries.push(...batchResults.filter(Boolean) as LeaderboardEntry[])
    }
    
    // Sort by total points and assign ranks
    entries.sort((a, b) => b.totalPoints - a.totalPoints)
    entries.forEach((entry, index) => {
      entry.rank = index + 1
    })
    
    const result = entries.slice(0, limit)
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(result))
    
    const duration = Date.now() - startTime
    console.log(`[EngagementService] Leaderboard built in ${duration}ms for ${entries.length} users`)
    
    return result
  }
  
  // Optimized method to get all opted-in users with minimal Redis calls
  static async getOptedInUsersOptimized(): Promise<any[]> {
    // Check cache first
    const cacheKey = 'engagement:cache:opted-in-users'
    const cached = await redis.get(cacheKey)
    if (cached) {
      console.log('[EngagementService] Returning cached opted-in users')
      return JSON.parse(cached)
    }
    
    console.log('[EngagementService] Building opted-in users list from scratch...')
    const startTime = Date.now()
    
    const connections = await redis.keys('engagement:connection:*')
    const users = []
    const seenHandles = new Set<string>()
    
    // Process in batches for better performance
    const batchSize = 50
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize)
      const batchPromises = batch.map(async (connectionKey: string) => {
        const connection = await redis.json.get(connectionKey) as any
        if (!connection) return null
        
        // Skip duplicates
        const handle = connection.twitterHandle?.toLowerCase()
        if (!handle || seenHandles.has(handle)) return null
        seenHandles.add(handle)
        
        // Basic user data - skip expensive lookups for now
        return {
          discordId: connection.discordId,
          twitterHandle: connection.twitterHandle,
          tier: connection.tier || 'micro',
          totalPoints: connection.totalPoints || 0,
          // These will be populated by a background job
          profilePicture: `https://unavatar.io/twitter/${connection.twitterHandle}`,
          discordUsername: '',
          discordServers: ['Nabulines'],
          tweetsSubmitted: 0,
          totalLikes: 0,
          totalRetweets: 0,
          totalComments: 0
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      users.push(...batchResults.filter(Boolean))
    }
    
    // Sort by total points
    users.sort((a, b) => b.totalPoints - a.totalPoints)
    
    // Cache for 5 minutes
    await redis.setex(cacheKey, 300, JSON.stringify(users))
    
    const duration = Date.now() - startTime
    console.log(`[EngagementService] Opted-in users built in ${duration}ms for ${users.length} users`)
    
    return users
  }
  
  // Method to update user stats in background
  static async updateUserStatsBackground(discordId: string): Promise<void> {
    try {
      // Count submitted tweets
      let tweetsSubmitted = 0
      const recentTweetIds = await redis.zrange('engagement:tweets:recent', 0, -1)
      for (const tweetId of recentTweetIds) {
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`) as any
        if (tweet && tweet.submitterDiscordId === discordId) {
          tweetsSubmitted++
        }
      }
      
      // Count engagements
      let totalLikes = 0, totalRetweets = 0, totalComments = 0
      const engagementLogs = await this.getUserEngagements(discordId, 1000)
      for (const log of engagementLogs) {
        switch (log.interactionType) {
          case 'like': totalLikes++; break
          case 'retweet': totalRetweets++; break
          case 'reply': totalComments++; break
        }
      }
      
      // Store stats
      await redis.hset(`engagement:user:${discordId}:stats`, {
        tweetsSubmitted,
        totalLikes,
        totalRetweets,
        totalComments,
        lastUpdated: Date.now()
      })
    } catch (error) {
      console.error(`Error updating stats for ${discordId}:`, error)
    }
  }
  
  // Clear caches
  static async clearCaches(): Promise<void> {
    const cacheKeys = await redis.keys('engagement:cache:*')
    if (cacheKeys.length > 0) {
      await redis.del(...cacheKeys)
      console.log(`[EngagementService] Cleared ${cacheKeys.length} cache entries`)
    }
  }
  
  // Default point rules setup - base points for all tiers
  static async setupDefaultRules(): Promise<void> {
    // Set base points (multipliers will be applied by tier)
    await this.setPointRule(1, 'like', 10)
    await this.setPointRule(1, 'retweet', 35)
    await this.setPointRule(1, 'reply', 20)
    
    // For backward compatibility, set the same base points for all tiers
    await this.setPointRule(2, 'like', 10)
    await this.setPointRule(2, 'retweet', 35)
    await this.setPointRule(2, 'reply', 20)
    
    await this.setPointRule(3, 'like', 10)
    await this.setPointRule(3, 'retweet', 35)
    await this.setPointRule(3, 'reply', 20)
  }
} 