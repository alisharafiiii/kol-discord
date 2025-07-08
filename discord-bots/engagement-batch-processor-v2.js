const { config } = require('dotenv')
const { Redis } = require('@upstash/redis')
const { TwitterApi } = require('twitter-api-v2')
const { nanoid } = require('nanoid')
const { toEdtIsoString, getEdtDateString } = require('./lib/timezone')
const fs = require('fs').promises
const path = require('path')

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// Initialize Twitter API
const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
})

const readOnlyClient = twitterClient.readOnly

// Rate Limiting Configuration
const RATE_LIMIT = {
  MAX_REQUESTS_PER_WINDOW: 120, // Basic Twitter API limit per hour
  WINDOW_DURATION_MS: 60 * 60 * 1000, // 1 hour
  MAX_TWEETS_PER_BATCH: 60, // 60 tweets * 2 API calls = 120 requests
}

// ========== IMPROVEMENT: Prevent Concurrent Batches ==========
// Global variable to track if a batch is currently running
let isBatchRunning = false

// Logging Configuration
const LOG_DIR = path.join(__dirname, '..', 'logs', 'batch_processor_logs')
const LOG_FILE = path.join(LOG_DIR, `batch_${getEdtDateString(new Date())}.log`)

// Ensure log directory exists
async function ensureLogDir() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating log directory:', error)
  }
}

// Log function
async function log(level, message, data = {}) {
  const timestamp = toEdtIsoString(new Date())
  const logEntry = {
    timestamp,
    level,
    message,
    ...data
  }
  
  // Console log
  const levelEmoji = {
    'INFO': 'ℹ️',
    'WARN': '⚠️',
    'ERROR': '❌',
    'SUCCESS': '✅',
    'DEBUG': '🔍'
  }
  console.log(`${levelEmoji[level] || '📝'} [${timestamp}] ${message}`, data)
  
  // File log
  try {
    await ensureLogDir()
    await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + '\n')
  } catch (error) {
    console.error('Error writing to log file:', error)
  }
}

// Rate limit tracking
async function checkRateLimit() {
  const rateLimitKey = 'engagement:rateLimit:current'
  const windowKey = 'engagement:rateLimit:windowStart'
  
  const now = Date.now()
  const windowStart = await redis.get(windowKey) || 0
  
  // Check if we're in a new window
  if (now - windowStart > RATE_LIMIT.WINDOW_DURATION_MS) {
    // New window, reset counter
    await redis.set(windowKey, now)
    await redis.set(rateLimitKey, 0)
    return { 
      allowed: true, 
      current: 0, 
      remaining: RATE_LIMIT.MAX_REQUESTS_PER_WINDOW,
      resetTime: now + RATE_LIMIT.WINDOW_DURATION_MS
    }
  }
  
  // Get current count
  const current = parseInt(await redis.get(rateLimitKey) || 0)
  const resetTime = parseInt(windowStart) + RATE_LIMIT.WINDOW_DURATION_MS
  
  if (current >= RATE_LIMIT.MAX_REQUESTS_PER_WINDOW) {
    const timeUntilReset = resetTime - now
    return { 
      allowed: false, 
      current, 
      remaining: 0,
      resetIn: Math.ceil(timeUntilReset / 1000 / 60), // minutes
      resetTime
    }
  }
  
  return { 
    allowed: true, 
    current, 
    remaining: RATE_LIMIT.MAX_REQUESTS_PER_WINDOW - current,
    resetTime
  }
}

// Increment rate limit counter
async function incrementRateLimit(count = 1) {
  const rateLimitKey = 'engagement:rateLimit:current'
  await redis.incrby(rateLimitKey, count)
}

// ====== SMART RATE LIMIT HANDLING ======
// Global variable to track Twitter's rate limit reset time
let twitterRateLimitReset = null

// Extract rate limit info from Twitter API error
function extractRateLimitInfo(error) {
  // Check various possible locations for rate limit headers
  const headers = error?.headers || error?.response?.headers || error?._headers || {}
  const resetTime = headers['x-rate-limit-reset'] || headers['X-Rate-Limit-Reset']
  
  if (resetTime) {
    // Convert Unix timestamp to milliseconds
    return parseInt(resetTime) * 1000
  }
  
  return null
}
// ======================================

// Update batch status for real-time UI updates
async function updateBatchStatus(batchId, status, data = {}) {
  const batchKey = `engagement:batch:${batchId}`
  const batch = await redis.json.get(batchKey)
  
  if (batch) {
    const updated = {
      ...batch,
      status,
      ...data,
      lastUpdated: toEdtIsoString(new Date())
    }
    
    await redis.json.set(batchKey, '$', updated)
    
    // Publish update for real-time notifications
    await redis.publish('engagement:batch:updates', JSON.stringify({
      batchId,
      status,
      ...data
    }))
  }
}

// Process a single tweet with rate limiting
async function processTweet(tweet, batchId, shouldAwardPoints = true) {
  const startTime = Date.now()
  const engagements = []
  let apiCallsUsed = 0
  
  console.log(`\n📝 Processing tweet ${tweet.tweetId} by @${tweet.authorHandle}`)
  
  try {
    // First check rate limit
    const currentRateStatus = await checkRateLimit()
    console.log(`   🔍 Current API usage: ${currentRateStatus.current}/${RATE_LIMIT.MAX_REQUESTS_PER_WINDOW} (${currentRateStatus.remaining} remaining)`)
    
    if (!currentRateStatus.allowed) {
      console.log(`   ❌ Rate limit exceeded - skipping tweet`)
      return {
        engagements: [],
        apiCallsUsed: 0,
        error: 'Rate limit exceeded'
      }
    }
    
    // Fetch retweets
    console.log(`   📊 Fetching retweets...`)
    try {
      const retweetsData = await readOnlyClient.v2.tweetRetweetedBy(tweet.tweetId, {
        max_results: 100,
        'user.fields': ['username']
      })
      
      await incrementRateLimit()
      apiCallsUsed++
      
      // Process retweets
      if (retweetsData && retweetsData.data && Array.isArray(retweetsData.data)) {
        for (const user of retweetsData.data) {
          if (user && user.username && user.username !== tweet.authorHandle) {
            engagements.push({
              type: 'retweet',
              username: user.username.toLowerCase()
            })
          }
        }
        console.log(`   ✅ Found ${retweetsData.data.length} retweets (API calls used: ${apiCallsUsed})`)
      } else {
        console.log(`   ✅ Found 0 retweets (API calls used: ${apiCallsUsed})`)
      }
    } catch (retweetError) {
      // Handle rate limit
      if (retweetError.code === 429 || retweetError.statusCode === 429) {
        const resetTime = extractRateLimitInfo(retweetError)
        if (resetTime) {
          twitterRateLimitReset = resetTime
        }
        throw retweetError
      }
      console.log(`   ⚠️ Failed to fetch retweets: ${retweetError.message}`)
      await log('WARN', `Failed to fetch retweets for ${tweet.tweetId}`, {
        error: retweetError.message
      })
    }
    
    // Fetch replies
    console.log(`   📊 Fetching replies...`)
    try {
      const repliesData = await readOnlyClient.v2.search(
        `conversation_id:${tweet.tweetId}`,
        {
          max_results: 100,
          'tweet.fields': ['author_id', 'conversation_id'],
          expansions: ['author_id'],
          'user.fields': ['username']
        }
      )
      
      await incrementRateLimit()
      apiCallsUsed++
      
      // Process replies  
      let replies = []
      if (!Array.isArray(repliesData.data) && repliesData.data && repliesData.data.data) {
        replies = repliesData.data.data
      } else if (Array.isArray(repliesData.data)) {
        replies = repliesData.data
      }
      
      if (replies && replies.length > 0 && repliesData.includes?.users) {
        const authorMap = new Map()
        repliesData.includes.users.forEach(user => {
          authorMap.set(user.id, user.username)
        })
        
        for (const reply of replies) {
          const username = authorMap.get(reply.author_id)
          if (username && username !== tweet.authorHandle) {
            engagements.push({
              type: 'reply',
              username: username.toLowerCase()
            })
          }
        }
        console.log(`   ✅ Found ${replies.length} replies (API calls used: ${apiCallsUsed})`)
      } else {
        console.log(`   ✅ Found 0 replies (API calls used: ${apiCallsUsed})`)
      }
    } catch (repliesError) {
      // Handle rate limit
      if (repliesError.code === 429 || repliesError.statusCode === 429) {
        const resetTime = extractRateLimitInfo(repliesError)
        if (resetTime) {
          twitterRateLimitReset = resetTime
        }
        throw repliesError
      }
      console.log(`   ⚠️ Failed to fetch replies: ${repliesError.message}`)
      await log('WARN', `Failed to fetch replies for ${tweet.tweetId}`, {
        error: repliesError.message
      })
    }
    
    // Log final API usage for this tweet
    const finalRateStatus = await checkRateLimit()
    console.log(`   📈 Tweet processing complete:`)
    console.log(`      • Engagements found: ${engagements.length}`)
    console.log(`      • API calls used: ${apiCallsUsed}`)
    console.log(`      • API remaining: ${finalRateStatus.remaining}`)
    
    if (finalRateStatus.remaining < 5) {
      console.log(`   ⚠️  WARNING: Only ${finalRateStatus.remaining} API calls remaining!`)
    }
    
    const processingTime = Date.now() - startTime
    await log('INFO', `Processed tweet ${tweet.tweetId}`, {
      engagements: engagements.length,
      apiCallsUsed,
      processingTime: `${processingTime}ms`,
      remainingApiCalls: finalRateStatus.remaining
    })
    
    return {
      engagements,
      apiCallsUsed
    }
    
  } catch (error) {
    return {
      engagements: [],
      apiCallsUsed: 0,
      error: error.message
    }
  }
}

// Award points for engagements
async function awardPoints(tweet, engagements, batchId) {
  const pointsAwarded = []
  const usersAwardedLikePoints = new Set()
  const pointsSummary = {
    likes: 0,
    retweets: 0,
    replies: 0,
    total: 0
  }
  
  for (const engagement of engagements) {
    // CRITICAL: Skip if user is engaging with their own tweet
    if (engagement.username.toLowerCase() === tweet.authorHandle.toLowerCase()) {
      await log('DEBUG', `Skipping self-engagement: @${engagement.username} on their own tweet ${tweet.tweetId}`)
      continue
    }
    
    const connection = await redis.get(`engagement:twitter:${engagement.username}`)
    
    if (!connection) {
      continue
    }
    
    const userConnection = await redis.json.get(`engagement:connection:${connection}`)
    if (!userConnection) {
      continue
    }
    
    // Get tier rules
    const tier = userConnection.tier || 'micro'
    const scenarios = await redis.json.get(`engagement:scenarios:${tier}`)
    const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
    
    // Handle retweets
    if (engagement.type === 'retweet') {
      const retweetRule = await redis.json.get(`engagement:rules:${tier}-retweet`)
      const points = Math.round((retweetRule?.points || 35) * bonusMultiplier)
      
      // Check if already awarded
      const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`)
      if (!existingLog) {
        // Log points calculation
        console.log(`💰 Awarding RETWEET points:`)
        console.log(`   • User: @${engagement.username} (${tier} tier)`)
        console.log(`   • Base Points: ${retweetRule?.points || 35}`)
        console.log(`   • Multiplier: ${bonusMultiplier}x`)
        console.log(`   • Total Points: ${points}`)
        
        // Award retweet points
        const logId = nanoid()
        await redis.json.set(`engagement:log:${logId}`, '$', {
          id: logId,
          tweetId: tweet.tweetId,
          userDiscordId: connection,
          interactionType: 'retweet',
          points: points,
          timestamp: toEdtIsoString(new Date()),
          batchId,
          bonusMultiplier
        })
        
        await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`, logId)
        await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', points)
        
        // Add to user's engagement history
        await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: logId })
        
        pointsAwarded.push({
          username: engagement.username,
          discordId: connection,
          type: 'retweet',
          points: points
        })
        
        pointsSummary.retweets += points
        
        // Also award like points for retweets
        if (!usersAwardedLikePoints.has(connection)) {
          const likeRule = await redis.json.get(`engagement:rules:${tier}-like`)
          const likePoints = Math.round((likeRule?.points || 10) * bonusMultiplier)
          
          console.log(`   • Auto-awarding LIKE points: ${likePoints}`)
          
          const likeLogId = nanoid()
          await redis.json.set(`engagement:log:${likeLogId}`, '$', {
            id: likeLogId,
            tweetId: tweet.tweetId,
            userDiscordId: connection,
            interactionType: 'like',
            points: likePoints,
            timestamp: toEdtIsoString(new Date()),
            batchId,
            bonusMultiplier
          })
          
          await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:like`, likeLogId)
          await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', likePoints)
          
          // Add to user's engagement history
          await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: likeLogId })
          
          usersAwardedLikePoints.add(connection)
          
          pointsAwarded.push({
            username: engagement.username,
            discordId: connection,
            type: 'like',
            points: likePoints
          })
          
          pointsSummary.likes += likePoints
        }
      }
    }
    
    // Handle replies
    if (engagement.type === 'reply') {
      const replyRule = await redis.json.get(`engagement:rules:${tier}-reply`)
      const points = Math.round((replyRule?.points || 20) * bonusMultiplier)
      
      // Check if already awarded
      const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:reply`)
      if (!existingLog) {
        // Log points calculation
        console.log(`💰 Awarding REPLY/COMMENT points:`)
        console.log(`   • User: @${engagement.username} (${tier} tier)`)
        console.log(`   • Base Points: ${replyRule?.points || 20}`)
        console.log(`   • Multiplier: ${bonusMultiplier}x`)
        console.log(`   • Total Points: ${points}`)
        
        // Award reply points
        const logId = nanoid()
        await redis.json.set(`engagement:log:${logId}`, '$', {
          id: logId,
          tweetId: tweet.tweetId,
          userDiscordId: connection,
          interactionType: 'reply',
          points: points,
          timestamp: toEdtIsoString(new Date()),
          batchId,
          bonusMultiplier
        })
        
        await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:reply`, logId)
        await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', points)
        
        // Add to user's engagement history
        await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: logId })
        
        pointsAwarded.push({
          username: engagement.username,
          discordId: connection,
          type: 'reply',
          points: points
        })
        
        pointsSummary.replies += points
        
        // Also award like points for replies
        if (!usersAwardedLikePoints.has(connection)) {
          const likeRule = await redis.json.get(`engagement:rules:${tier}-like`)
          const likePoints = Math.round((likeRule?.points || 10) * bonusMultiplier)
          
          console.log(`   • Auto-awarding LIKE points: ${likePoints}`)
          
          const likeLogId = nanoid()
          await redis.json.set(`engagement:log:${likeLogId}`, '$', {
            id: likeLogId,
            tweetId: tweet.tweetId,
            userDiscordId: connection,
            interactionType: 'like',
            points: likePoints,
            timestamp: toEdtIsoString(new Date()),
            batchId,
            bonusMultiplier
          })
          
          await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:like`, likeLogId)
          await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', likePoints)
          
          // Add to user's engagement history
          await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: likeLogId })
          
          usersAwardedLikePoints.add(connection)
          
          pointsAwarded.push({
            username: engagement.username,
            discordId: connection,
            type: 'like',
            points: likePoints
          })
          
          pointsSummary.likes += likePoints
        }
      }
    }
  }
  
  pointsSummary.total = pointsSummary.likes + pointsSummary.retweets + pointsSummary.replies
  
  // Log points summary if any were awarded
  if (pointsSummary.total > 0) {
    await log('INFO', `Points awarded for tweet ${tweet.tweetId}`, {
      summary: pointsSummary,
      userCount: pointsAwarded.filter((p, i, self) => 
        self.findIndex(x => x.discordId === p.discordId) === i
      ).length
    })
  }
  
  return pointsAwarded
}

// Main batch processing function
async function processBatch() {
  // ========== IMPROVEMENT: Prevent Concurrent Batches ==========
  // Check if a batch is already running
  if (isBatchRunning) {
    await log('WARN', '⚠️ Batch already running, skipping new trigger.')
    console.log('⚠️ Batch already running, skipping new trigger.')
    return null
  }
  
  // Set the flag to indicate a batch is now running
  isBatchRunning = true
  
  const batchId = nanoid()
  const batchStartTime = new Date()
  
  await log('INFO', '🚀 Starting batch processing', { 
    batchId,
    startTime: toEdtIsoString(batchStartTime) 
  })
  
  // ========== LOG CURRENT POINTS CONFIGURATION ==========
  console.log('\n' + '='.repeat(60))
  console.log('📊 FETCHING CURRENT POINTS CONFIGURATION')
  console.log('='.repeat(60))
  
  // Fetch and display current point rules from database
  const tiers = ['micro', 'rising', 'star', 'legend', 'hero']
  const pointsConfig = {}
  
  for (const tier of tiers) {
    const retweetRule = await redis.json.get(`engagement:rules:${tier}-retweet`)
    const replyRule = await redis.json.get(`engagement:rules:${tier}-reply`)
    const likeRule = await redis.json.get(`engagement:rules:${tier}-like`)
    
    pointsConfig[tier] = {
      retweet: retweetRule?.points || 35,
      reply: replyRule?.points || 20,
      like: likeRule?.points || 10
    }
    
    console.log(`\n📌 ${tier.toUpperCase()} Tier Points:`)
    console.log(`   • Retweet: ${pointsConfig[tier].retweet} points`)
    console.log(`   • Reply/Comment: ${pointsConfig[tier].reply} points`)
    console.log(`   • Like: ${pointsConfig[tier].like} points (auto-awarded with RT/Reply)`)
  }
  
  await log('INFO', '📊 Points configuration loaded', { pointsConfig })
  console.log('\n' + '='.repeat(60) + '\n')

  // ========== CHECK AND LOG RATE LIMIT STATUS ==========
  const initialRateCheck = await checkRateLimit()
  
  console.log('🔍 TWITTER API RATE LIMIT STATUS')
  console.log('='.repeat(40))
  console.log(`📈 Requests Used: ${initialRateCheck.current}/${RATE_LIMIT.MAX_REQUESTS_PER_WINDOW}`)
  console.log(`📉 Requests Remaining: ${initialRateCheck.remaining}`)
  console.log(`⏰ Reset Time: ${initialRateCheck.resetTime ? toEdtIsoString(new Date(initialRateCheck.resetTime)) : 'Unknown'}`)
  console.log(`✅ Can Proceed: ${initialRateCheck.allowed ? 'YES' : 'NO'}`)
  
  if (initialRateCheck.remaining < 10) {
    console.log('⚠️  WARNING: Approaching rate limit! Only ${initialRateCheck.remaining} requests remaining.')
  }
  
  await log('INFO', '📊 Initial rate limit check', {
    current: initialRateCheck.current,
    remaining: initialRateCheck.remaining,
    allowed: initialRateCheck.allowed,
    resetTime: initialRateCheck.resetTime ? toEdtIsoString(new Date(initialRateCheck.resetTime)) : null
  })
  
  console.log('='.repeat(40) + '\n')
  
  if (!initialRateCheck.allowed) {
    await log('ERROR', '❌ Cannot start batch - rate limit exceeded', {
      resetIn: initialRateCheck.resetIn
    })
    // ========== IMPROVEMENT: Prevent Concurrent Batches ==========
    isBatchRunning = false
    throw new Error(`Rate limit exceeded. Reset in ${initialRateCheck.resetIn} minutes`)
  }
  
  // Create batch job
  const batchJob = {
    id: batchId,
    startedAt: toEdtIsoString(batchStartTime),
    status: 'running',
    tweetsProcessed: 0,
    engagementsFound: 0,
    pointsAwarded: 0,
    apiCallsUsed: 0,
    errors: [],
    summary: {
      retweets: 0,
      replies: 0,
      uniqueUsers: new Set()
    }
  }
  
  await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  await redis.zadd('engagement:batches', { score: Date.now(), member: batchId })
  
  try {
    // Get tweets from last 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    const tweetIds = await redis.zrange('engagement:tweets:recent', cutoff, '+inf', { 
      byScore: true,
      count: RATE_LIMIT.MAX_TWEETS_PER_BATCH 
    })
    
    await log('INFO', `📊 Found ${tweetIds.length} tweets from last 24 hours`, { 
      batchId,
      tweetCount: tweetIds.length,
      maxAllowed: RATE_LIMIT.MAX_TWEETS_PER_BATCH
    })
    
    if (tweetIds.length === 0) {
      batchJob.status = 'completed'
      batchJob.completedAt = toEdtIsoString(new Date())
      await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
      await log('INFO', '✅ No tweets to process', { batchId })
      // ========== IMPROVEMENT: Prevent Concurrent Batches ==========
      isBatchRunning = false
      return batchJob
    }
    
    await updateBatchStatus(batchId, 'processing', {
      totalTweets: tweetIds.length
    })
    
    let totalApiCalls = 0
    let totalEngagements = 0
    let totalPointsAwarded = 0
    const errors = []
    const engagementSummary = {
      retweets: 0,
      replies: 0,
      uniqueUsers: new Set()
    }
    
    // Process each tweet
    for (let i = 0; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i]
      const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
      
      if (!tweet) {
        await log('WARN', `Tweet data not found: ${tweetId}`)
        continue
      }
      
      // Update progress
      await updateBatchStatus(batchId, 'processing', {
        progress: Math.round((i + 1) / tweetIds.length * 100),
        currentTweet: i + 1,
        totalTweets: tweetIds.length
      })
      
      try {
        // Process tweet
        const result = await processTweet(tweet, batchId, true)
        totalApiCalls += result.apiCallsUsed
        
        if (result.error) {
          errors.push({
            tweetId: tweet.tweetId,
            error: result.error
          })
        } else {
          totalEngagements += result.engagements.length
          
          // Update engagement summary
          result.engagements.forEach(eng => {
            if (eng.type === 'retweet') engagementSummary.retweets++
            if (eng.type === 'reply') engagementSummary.replies++
            engagementSummary.uniqueUsers.add(eng.username)
          })
          
          // Award points
          const points = await awardPoints(tweet, result.engagements, batchId)
          totalPointsAwarded += points.reduce((sum, p) => sum + p.points, 0)
        }
        
        batchJob.tweetsProcessed++
      } catch (tweetError) {
        // ====== SMART RATE LIMIT HANDLING ======
        if (tweetError.code === 429 || tweetError.statusCode === 429) {
          const now = new Date()
          const nowEdt = toEdtIsoString(now)
          
          // Get reset time from stored value or error
          const resetTime = twitterRateLimitReset || extractRateLimitInfo(tweetError)
          
          if (resetTime) {
            const resetDate = new Date(resetTime)
            const resetEdt = toEdtIsoString(resetDate)
            const waitMs = resetTime - now.getTime()
            const waitMinutes = Math.ceil(waitMs / 1000 / 60)
            
            // Clear logs and show rate limit message
            console.log('\n\n')
            console.log('====== RATE LIMIT HIT ======')
            console.log(`⚠️  Rate limit hit at ${nowEdt}`)
            console.log(`⏰  Reset time: ${resetEdt}`)
            console.log(`⏸️  Pausing batch for ${waitMinutes} minutes`)
            console.log('============================\n')
            
            await log('WARN', `⚠️ Rate limit hit at ${nowEdt}. Pausing batch until ${resetEdt}.`, {
              batchId,
              hitTime: nowEdt,
              resetTime: resetEdt,
              waitMinutes,
              tweetsProcessed: batchJob.tweetsProcessed,
              tweetsRemaining: tweetIds.length - i
            })
            
            // Update batch status
            batchJob.status = 'paused_rate_limit'
            batchJob.pausedAt = nowEdt
            batchJob.willResumeAt = resetEdt
            await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
            
            // Set timer to automatically restart
            if (waitMs > 0) {
              console.log(`⏱️  Setting timer for ${waitMinutes} minutes...`)
              
              setTimeout(async () => {
                console.log('\n')
                console.log('====== RATE LIMIT RESET ======')
                console.log(`🔄 Rate limit reset. Restarting batch now.`)
                console.log(`⏰  Current time: ${toEdtIsoString(new Date())}`)
                console.log('==============================\n')
                
                await log('INFO', '🔄 Rate limit reset. Restarting batch now.', {
                  batchId,
                  resumeTime: toEdtIsoString(new Date())
                })
                
                // Clear the rate limit reset time
                twitterRateLimitReset = null
                
                // Restart batch processing
                try {
                  await processBatch()
                } catch (restartError) {
                  console.error('❌ Failed to restart batch:', restartError.message)
                  await log('ERROR', 'Failed to restart batch after rate limit reset', {
                    error: restartError.message,
                    batchId
                  })
                }
              }, waitMs)
            }
            
            // Stop current processing
            isBatchRunning = false
            return batchJob
          } else {
            // No reset time available, log error and stop
            console.log('\n⚠️  Rate limit hit but no reset time available')
            await log('ERROR', 'Rate limit hit but no reset time in response', {
              batchId,
              error: tweetError.message
            })
            
            batchJob.status = 'failed'
            batchJob.error = 'Rate limit hit - no reset time available'
            await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
            
            isBatchRunning = false
            return batchJob
          }
        }
        // ======================================
        
        // Other errors - log and continue
        errors.push({
          tweetId: tweet.tweetId,
          error: tweetError.message
        })
        
        await log('ERROR', `Failed to process tweet ${tweet.tweetId}`, {
          error: tweetError.message
        })
      }
    }
    
    // Update final batch status
    batchJob.status = 'completed'
    batchJob.completedAt = toEdtIsoString(new Date())
    batchJob.engagementsFound = totalEngagements
    batchJob.pointsAwarded = totalPointsAwarded
    batchJob.apiCallsUsed = totalApiCalls
    batchJob.errors = errors
    batchJob.summary = {
      retweets: engagementSummary.retweets,
      replies: engagementSummary.replies,
      uniqueUsers: engagementSummary.uniqueUsers.size
    }
    
    await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
    await updateBatchStatus(batchId, 'completed', batchJob)
    
    // Calculate duration
    const duration = Date.now() - batchStartTime.getTime()
    const durationMinutes = Math.round(duration / 1000 / 60)
    
    // Log comprehensive summary
    await log('SUCCESS', '✅ Batch processing completed', {
      batchId,
      duration: `${durationMinutes} minutes`,
      summary: {
        tweetsProcessed: batchJob.tweetsProcessed,
        engagementsFound: totalEngagements,
        pointsAwarded: totalPointsAwarded,
        apiCallsUsed: totalApiCalls,
        retweets: engagementSummary.retweets,
        replies: engagementSummary.replies,
        uniqueUsers: engagementSummary.uniqueUsers.size,
        errors: errors.length
      }
    })
    
    // Log rate limit status
    const finalRateCheck = await checkRateLimit()
    await log('INFO', '📊 Rate limit status', {
      used: finalRateCheck.current,
      remaining: finalRateCheck.remaining,
      limit: RATE_LIMIT.MAX_REQUESTS_PER_WINDOW,
      percentUsed: Math.round((finalRateCheck.current / RATE_LIMIT.MAX_REQUESTS_PER_WINDOW) * 100)
    })
    
    // Update batch status in Redis (last 10 batches)
    const batchStatus = {
      batchId,
      timestamp: toEdtIsoString(new Date()),
      tweetsProcessed: batchJob.tweetsProcessed,
      engagementsFound: totalEngagements,
      pointsAwarded: totalPointsAwarded,
      apiCallsUsed: totalApiCalls,
      duration: durationMinutes
    }
    
    await redis.lpush('engagement:batch:status', JSON.stringify(batchStatus))
    await redis.ltrim('engagement:batch:status', 0, 9) // Keep last 10
    
    // ========== IMPROVEMENT: Prevent Concurrent Batches ==========
    isBatchRunning = false
    
    // Trim old batches (keep only last 100)
    const oldBatches = await redis.zrange('engagement:batches', 0, -101)
    if (oldBatches.length > 0) {
      await redis.zrem('engagement:batches', ...oldBatches)
      for (const oldId of oldBatches) {
        await redis.del(`engagement:batch:${oldId}`)
      }
    }
    
    // ========== CLEAR CACHES AFTER BATCH ==========
    // Clear engagement caches to ensure fresh data
    const cacheKeys = await redis.keys('engagement:cache:*')
    if (cacheKeys.length > 0) {
      await redis.del(...cacheKeys)
      console.log(`🗑️ Cleared ${cacheKeys.length} cache entries after batch completion`)
      await log('INFO', `Cleared ${cacheKeys.length} cache entries`, { batchId })
    }
    
    await log('SUCCESS', `✅ Batch completed successfully`, {
      batchId,
      startTime: toEdtIsoString(batchStartTime),
      endTime: toEdtIsoString(new Date()),
      duration: `${(Date.now() - batchStartTime.getTime()) / 1000}s`,
      summary: {
        tweetsProcessed: batchJob.tweetsProcessed,
        engagementsFound: totalEngagements,
        pointsAwarded: totalPointsAwarded,
        apiCallsUsed: totalApiCalls,
        retweets: engagementSummary.retweets,
        replies: engagementSummary.replies,
        uniqueUsers: engagementSummary.uniqueUsers.size,
        errors: errors.length
      }
    })
    
  } catch (error) {
    batchJob.status = 'failed'
    batchJob.error = error.message
    
    await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
    await updateBatchStatus(batchId, 'failed', { error: error.message })
    
    await log('ERROR', '❌ Batch processing failed', {
      batchId,
      error: error.message,
      stack: error.stack
    })
    
    // ========== IMPROVEMENT: Prevent Concurrent Batches ==========
    isBatchRunning = false
    
    throw error
  }
  
  return batchJob
}

// Export for use in other modules
module.exports = {
  processBatch,
  processTweet,
  checkRateLimit,
  log
}

// Run if called directly
if (require.main === module) {
  processBatch()
    .then(result => {
      console.log('✅ Batch processing completed:', result)
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ Batch processing failed:', error)
      process.exit(1)
    })
} 