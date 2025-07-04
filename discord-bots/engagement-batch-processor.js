const { config } = require('dotenv')
const { Redis } = require('@upstash/redis')
const { TwitterApi } = require('twitter-api-v2')
const { nanoid } = require('nanoid')
const { toEdtIsoString, getEdtDateString } = require('./lib/timezone')

// Load environment variables
const path = require('path')
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

// Process batch job
async function processBatch(metricsOnlyMode = false) {
  console.log('🔄 Starting batch processing...')
  console.log('📋 Configuration:')
  console.log(`   - Redis configured: ${!!process.env.UPSTASH_REDIS_REST_URL}`)
  console.log(`   - Twitter API Key: ${process.env.TWITTER_API_KEY ? process.env.TWITTER_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`)
  console.log(`   - Twitter Access Token: ${process.env.TWITTER_ACCESS_TOKEN ? process.env.TWITTER_ACCESS_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`)
  console.log(`   - Twitter API Version: v2`)
  console.log(`   - Authentication Type: OAuth 1.0a (User Context)`)
  console.log(`   - Mode: ${metricsOnlyMode ? '📊 METRICS ONLY' : '🚀 FULL ENGAGEMENT MODE (DEFAULT)'}`)
  
  // DEBUG: Check for pending batch jobs created by the API
  console.log(`\n🔍 DEBUG: Checking for pending batch jobs from API...`)
  const pendingJobIds = await redis.zrange('engagement:batches', 0, 5, { rev: true })
  for (const jobId of pendingJobIds) {
    const job = await redis.json.get(`engagement:batch:${jobId}`)
    if (job && job.status === 'pending') {
      console.log(`   ⚠️  Found pending job: ${jobId}`)
      console.log(`      Created: ${new Date(job.startedAt).toLocaleString()}`)
      console.log(`      Status: ${job.status}`)
      console.log(`      NOTE: This job was created by the API but not processed!`)
      
      // Update this pending job instead of creating a new one
      console.log(`   🔄 Updating pending job to 'running' status...`)
      job.status = 'running'
      await redis.json.set(`engagement:batch:${jobId}`, '$', job)
      
      // Use this job ID for processing
      const batchId = jobId
      const batchJob = job
      
      // Skip creating a new job and proceed with this one
      console.log(`   ✅ Using existing job ${batchId} for processing`)
      
      // Continue processing with this batch ID
      return processBatchWithId(batchId, batchJob, metricsOnlyMode)
    }
  }
  
  // No pending jobs found, create a new one
  const batchId = nanoid()
  const batchStartTime = new Date()
  const batchJob = {
    id: batchId,
    startedAt: batchStartTime,
    status: 'running',
    tweetsProcessed: 0,
    engagementsFound: 0
  }
  
  console.log(`\n🆕 Creating new batch job (no pending jobs found)...`)
  console.log(`   Batch ID: ${batchId}`)
  console.log(`   Started at: ${batchStartTime.toLocaleString()}`)
  console.log(`   Initial status: running`)
  
  await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  await redis.zadd('engagement:batches', { score: Date.now(), member: batchId })
  
  console.log(`   ✅ Batch job created and stored in Redis`)
  console.log(`   Key: engagement:batch:${batchId}`)
  console.log(`   ⚠️  NOTE: This job is separate from any jobs created via the API!`)
  
  // Continue with the new batch job
  return processBatchWithId(batchId, batchJob, metricsOnlyMode)
}

// Separate function to process with a specific batch ID
async function processBatchWithId(batchId, batchJob, metricsOnlyMode) {
  // By default, always run in FULL ENGAGEMENT MODE unless explicitly set to metrics-only
  const shouldDoDetailedCheck = !metricsOnlyMode
  
  if (shouldDoDetailedCheck) {
    console.log(`\n🚀 Running FULL ENGAGEMENT MODE - checking all interactions and awarding points`)
    console.log(`   - Will check retweets and award points`)
    console.log(`   - Will check comments/replies and award points`)
    console.log(`   - Will automatically award like points for users who RT/comment`)
    await redis.set('engagement:lastDetailedCheck', Date.now())
  } else {
    console.log(`\n📊 Running METRICS ONLY mode - updating tweet statistics without awarding points`)
    console.log(`   - Only updating like/RT/reply counts`)
    console.log(`   - NOT checking user engagements`)
    console.log(`   - NOT awarding any points`)
  }
  
  try {
    // Track points awarded per user for summary
    const userPointsSummary = new Map()
    
    // Get recent tweets from last 24 hours (stored as sorted set)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    const currentTime = Date.now()
    
    console.log(`\n🔍 DEBUG: Fetching tweets from Redis...`)
    console.log(`   Current time: ${new Date(currentTime).toLocaleString()} (${currentTime})`)
    console.log(`   Cutoff time: ${new Date(cutoff).toLocaleString()} (${cutoff})`)
    console.log(`   Time window: Last 24 hours`)
    
    const tweetIds = await redis.zrange('engagement:tweets:recent', cutoff, '+inf', { byScore: true })
    
    console.log(`\n📊 Found ${tweetIds.length} tweets from last 24 hours to process`)
    
    // Debug: Show all tweet IDs found
    if (tweetIds.length > 0) {
      console.log(`   Tweet IDs found: ${tweetIds.join(', ')}`)
      
      // Get details of all tweets to debug
      console.log(`\n📋 Tweet Details:`)
      for (const tweetId of tweetIds) {
        const tweetScore = await redis.zscore('engagement:tweets:recent', tweetId)
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
        if (tweet) {
          console.log(`   - ID: ${tweetId}`)
          console.log(`     Tweet ID: ${tweet.tweetId}`)
          console.log(`     Author: @${tweet.authorHandle}`)
          console.log(`     Submitted: ${new Date(tweet.submittedAt).toLocaleString()} (${tweet.submittedAt})`)
          console.log(`     Score in sorted set: ${tweetScore}`)
          console.log(`     URL: ${tweet.url}`)
        } else {
          console.log(`   - ID: ${tweetId} - ⚠️ WARNING: Tweet data missing in Redis!`)
        }
      }
    } else {
      console.log(`   ⚠️ No tweets found in the time window`)
      
      // Debug: Check if there are any tweets at all
      const allTweetIds = await redis.zrange('engagement:tweets:recent', 0, -1, { rev: true, withScores: true })
      if (allTweetIds.length > 0) {
        console.log(`\n   🔍 DEBUG: Found ${allTweetIds.length / 2} total tweets in Redis (showing latest 5):`)
        for (let i = 0; i < Math.min(10, allTweetIds.length); i += 2) {
          const id = allTweetIds[i]
          const score = allTweetIds[i + 1]
          const tweet = await redis.json.get(`engagement:tweet:${id}`)
          if (tweet) {
            console.log(`     - @${tweet.authorHandle}: ${new Date(parseInt(score)).toLocaleString()} (score: ${score})`)
          }
        }
      }
    }
    
    let tweetsProcessed = 0
    let engagementsFound = 0
    let metricsUpdated = 0
    
    console.log(`\n🔄 Starting to process ${tweetIds.length} tweets...`)
    
    for (const tweetId of tweetIds) {
      let tweetEngagements = 0 // Track engagements per tweet
      const tweetIndex = tweetIds.indexOf(tweetId) + 1
      
      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📌 Processing tweet ${tweetIndex}/${tweetIds.length} (Redis key: ${tweetId})`)
      
      try {
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
        if (!tweet) {
          console.log(`⚠️  SKIPPED: Tweet data not found in Redis for ID: ${tweetId}`)
          console.log(`   This tweet will not be processed or appear in admin panel`)
          continue
        }
        
        console.log(`   Tweet ID: ${tweet.tweetId}`)
        console.log(`   Author: @${tweet.authorHandle}`)
        console.log(`   URL: ${tweet.url}`)
        console.log(`   Submitted: ${new Date(tweet.submittedAt).toLocaleString()}`)
        
        // Get tweet metrics and engagements from Twitter API
        console.log(`   🔍 Fetching tweet data from Twitter API...`)
        const tweetData = await readOnlyClient.v2.singleTweet(tweet.tweetId, {
          'tweet.fields': ['public_metrics', 'author_id'],
          expansions: ['author_id']
        })
        
        if (!tweetData.data) {
          console.log(`   ❌ Tweet ${tweet.tweetId} not found on Twitter`)
          console.log(`   API Response:`, JSON.stringify(tweetData, null, 2))
          continue
        }
        
        console.log(`   ✅ Tweet found on Twitter`)
        
        // Log rate limit info
        const tweetRateLimit = tweetData._rateLimit || tweetData.rateLimit || 
                               tweetData._realData?._rateLimit || tweetData._realData?.rateLimit;
        if (tweetRateLimit) {
          console.log(`   📊 Rate Limit (singleTweet):`)
          console.log(`      Limit: ${tweetRateLimit.limit}`)
          console.log(`      Remaining: ${tweetRateLimit.remaining}`)
          console.log(`      Reset: ${new Date(tweetRateLimit.reset * 1000).toLocaleTimeString()}`)
          if (tweetRateLimit.remaining === 0) {
            console.log(`      ⚠️ RATE LIMIT REACHED! Reset at ${new Date(tweetRateLimit.reset * 1000).toLocaleTimeString()}`)
          }
        }
        
        // Update tweet metrics
        const metrics = tweetData.data.public_metrics
        console.log(`   📊 Tweet metrics:`)
        console.log(`      - Likes: ${metrics.like_count}`)
        console.log(`      - Retweets: ${metrics.retweet_count}`)
        console.log(`      - Replies: ${metrics.reply_count}`)
        
        await redis.json.set(`engagement:tweet:${tweetId}`, '$.metrics', {
          likes: metrics.like_count,
          retweets: metrics.retweet_count,
          replies: metrics.reply_count
        })
        
        console.log(`   ✅ Metrics updated successfully`)
        metricsUpdated++
        
        // Skip detailed engagement processing if not needed
        if (!shouldDoDetailedCheck) {
          console.log(`   ⏭️  Skipping detailed engagement processing (metrics-only mode)`)
          tweetsProcessed++
          continue
        }
        
        console.log(`   🎯 Proceeding with detailed engagement processing...`)
        
        // IMPORTANT: We do NOT use the tweetLikedBy endpoint
        // Instead, we automatically award like points to users who retweet or comment
        console.log(`\n   ℹ️  Automatic Like Points System:`)
        console.log(`   📌 Like points are automatically awarded to users who Retweet OR Comment`)
        console.log(`   📌 If a user both comments and retweets, they get like points only once`)
        
        // Track users who have been awarded like points to avoid duplicates
        const usersAwardedLikePoints = new Set()
        
        // Get users who retweeted
        console.log(`\n   🔁 Attempting to get users who retweeted...`)
        let retweetersResponse
        try {
          // Log the API request details
          const retweetsParams = {
            max_results: 100,
            'user.fields': ['username']
          }
          console.log(`   📤 API Request:`)
          console.log(`      Endpoint: GET /2/tweets/${tweet.tweetId}/retweeted_by`)
          console.log(`      Full URL: https://api.twitter.com/2/tweets/${tweet.tweetId}/retweeted_by`)
          console.log(`      Parameters:`, JSON.stringify(retweetsParams, null, 2))
          
          retweetersResponse = await readOnlyClient.v2.tweetRetweetedBy(tweet.tweetId, retweetsParams)
          
          // Log the full response
          console.log(`   📥 API Response:`)
          console.log(`      HTTP Status: ${retweetersResponse._realData?._response?.statusCode || 'Unknown'}`)
          console.log(`      Has Data: ${!!retweetersResponse.data}`)
          console.log(`      Data Length: ${retweetersResponse.data?.length || 0}`)
          
          if (retweetersResponse.data && retweetersResponse.data.length > 0) {
            console.log(`      First 3 users: ${retweetersResponse.data.slice(0, 3).map(u => u.username).join(', ')}`)
          }
          
          if (retweetersResponse.errors) {
            console.log(`      Errors:`, JSON.stringify(retweetersResponse.errors, null, 2))
          }
          
          // Log raw response for debugging
          console.log(`      Raw Response Body:`, JSON.stringify({
            data: retweetersResponse.data?.length ? `Array[${retweetersResponse.data.length}]` : retweetersResponse.data,
            meta: retweetersResponse.meta,
            errors: retweetersResponse.errors
          }, null, 2))
          
          // Log rate limit info
          const retweetsRateLimit = retweetersResponse._rateLimit || retweetersResponse.rateLimit || 
                                    retweetersResponse._realData?._rateLimit || retweetersResponse._realData?.rateLimit;
          if (retweetsRateLimit) {
            console.log(`   📊 Rate Limit (retweeted_by):`)
            console.log(`      Limit: ${retweetsRateLimit.limit}`)
            console.log(`      Remaining: ${retweetsRateLimit.remaining}`)
            console.log(`      Reset: ${new Date(retweetsRateLimit.reset * 1000).toLocaleTimeString()}`)
            if (retweetsRateLimit.remaining === 0) {
              console.log(`      ⚠️ RATE LIMIT REACHED! Reset at ${new Date(retweetsRateLimit.reset * 1000).toLocaleTimeString()}`)
            }
          } else {
            // Rate limit info not available - likely due to API access level
            console.log(`   📊 Rate Limit: Not available (Essential API access may not provide rate limit headers)`);
          }
        } catch (retweetError) {
          // ====== SMART RATE LIMIT HANDLING ======
          if (retweetError.code === 429 || retweetError.statusCode === 429) {
            const now = new Date()
            const resetTime = extractRateLimitInfo(retweetError)
            
            if (resetTime) {
              twitterRateLimitReset = resetTime
              const resetDate = new Date(resetTime)
              const waitMs = resetTime - now.getTime()
              const waitMinutes = Math.ceil(waitMs / 1000 / 60)
              
              console.log('\n\n')
              console.log('====== RATE LIMIT HIT ======')
              console.log(`⚠️  Rate limit hit at ${now.toLocaleString()}`)
              console.log(`⏰  Reset time: ${resetDate.toLocaleString()}`)
              console.log(`⏸️  Pausing batch for ${waitMinutes} minutes`)
              console.log('============================\n')
              
              // Update batch status
              batchJob.status = 'paused_rate_limit'
              batchJob.pausedAt = now.toISOString()
              batchJob.willResumeAt = resetDate.toISOString()
              await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
              
              // Set timer to automatically restart
              if (waitMs > 0) {
                console.log(`⏱️  Setting timer for ${waitMinutes} minutes...`)
                
                setTimeout(async () => {
                  console.log('\n')
                  console.log('====== RATE LIMIT RESET ======')
                  console.log(`🔄 Rate limit reset. Restarting batch now.`)
                  console.log(`⏰  Current time: ${new Date().toLocaleString()}`)
                  console.log('==============================\n')
                  
                  // Clear the rate limit reset time
                  twitterRateLimitReset = null
                  
                  // Restart batch processing
                  try {
                    await processBatch(metricsOnlyMode)
                  } catch (restartError) {
                    console.error('❌ Failed to restart batch:', restartError.message)
                  }
                }, waitMs)
              }
              
              // Exit function to stop processing
              return
            }
          }
          // ======================================
          
          console.log(`   ❌ ERROR getting retweets:`)
          console.log(`      Message: ${retweetError.message}`)
          console.log(`      Error Code: ${retweetError.code || 'N/A'}`)
          console.log(`      HTTP Status: ${retweetError.statusCode || retweetError.status || 'N/A'}`)
          
          if (retweetError.data) {
            console.log(`      Error Response Body:`, JSON.stringify(retweetError.data, null, 2))
          }
          
          retweetersResponse = { data: [] }
        }
        
        // Handle paginated response
        if (retweetersResponse.data && retweetersResponse.data.length > 0) {
          console.log(`   ✅ Found ${retweetersResponse.data.length} users who retweeted`)
          for (const retweeter of retweetersResponse.data) {
            // CRITICAL: Skip if user is retweeting their own tweet
            if (retweeter.username.toLowerCase() === tweet.authorHandle.toLowerCase()) {
              console.log(`      ⚠️  Skipping self-engagement: @${retweeter.username} retweeted their own tweet`)
              continue
            }
            
            const connection = await redis.get(`engagement:twitter:${retweeter.username.toLowerCase()}`)
            if (connection) {
              console.log(`      👤 User @${retweeter.username} is connected (Discord ID: ${connection})`)
              const userConnection = await redis.json.get(`engagement:connection:${connection}`)
              if (userConnection) {
                // Award retweet points
                const retweetRule = await redis.json.get(`engagement:rules:${userConnection.tier}-retweet`)
                const retweetBasePoints = retweetRule?.points || 35
                
                // Get tier scenarios for bonus multiplier
                const scenarios = await redis.json.get(`engagement:scenarios:tier${userConnection.tier}`)
                const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
                const retweetPoints = Math.round(retweetBasePoints * bonusMultiplier)
                
                const existingRetweetLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`)
                if (!existingRetweetLog) {
                  const retweetLogId = nanoid()
                  const retweetLog = {
                    id: retweetLogId,
                    tweetId: tweet.tweetId,
                    userDiscordId: connection,
                    interactionType: 'retweet',
                    points: retweetPoints,
                    timestamp: new Date(),
                    batchId,
                    bonusMultiplier
                  }
                  
                  await redis.json.set(`engagement:log:${retweetLogId}`, '$', retweetLog)
                  await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: retweetLogId })
                  await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: retweetLogId })
                  await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`, retweetLogId)
                  
                  await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', retweetPoints)
                  
                  engagementsFound++
                  tweetEngagements++
                  console.log(`✅ Awarded ${retweetPoints} points to @${retweeter.username} for retweeting (x${bonusMultiplier} bonus)`)
                  
                  // Track points in summary
                  const userKey = `@${retweeter.username} (${connection})`
                  if (!userPointsSummary.has(userKey)) {
                    userPointsSummary.set(userKey, { 
                      username: retweeter.username, 
                      discordId: connection, 
                      totalPoints: 0, 
                      tier: userConnection.tier,
                      actions: []
                    })
                  }
                  userPointsSummary.get(userKey).totalPoints += retweetPoints
                  userPointsSummary.get(userKey).actions.push(`RT: ${retweetPoints}pts`)
                  
                  // Also award like points (assuming they liked it if they retweeted)
                  if (!usersAwardedLikePoints.has(connection)) {
                    const likeRule = await redis.json.get(`engagement:rules:${userConnection.tier}-like`)
                    const likeBasePoints = likeRule?.points || 10
                    const likePoints = Math.round(likeBasePoints * bonusMultiplier)
                    
                    const existingLikeLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:like`)
                    if (!existingLikeLog) {
                      const likeLogId = nanoid()
                      const likeLog = {
                        id: likeLogId,
                        tweetId: tweet.tweetId,
                        userDiscordId: connection,
                        interactionType: 'like',
                        points: likePoints,
                        timestamp: new Date(),
                        batchId,
                        bonusMultiplier
                      }
                      
                      await redis.json.set(`engagement:log:${likeLogId}`, '$', likeLog)
                      await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: likeLogId })
                      await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: likeLogId })
                      await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:like`, likeLogId)
                      
                      await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', likePoints)
                      
                      engagementsFound++
                      tweetEngagements++
                      usersAwardedLikePoints.add(connection)
                      console.log(`✅ Awarded ${likePoints} points to @${retweeter.username} for implied like (x${bonusMultiplier} bonus)`)
                      
                      // Track like points in summary
                      userPointsSummary.get(userKey).totalPoints += likePoints
                      userPointsSummary.get(userKey).actions.push(`Like: ${likePoints}pts`)
                    }
                  }
                } else {
                  console.log(`      ⏭️  Skipping @${retweeter.username} - already awarded points for this retweet`)
                }
              } else {
                console.log(`      ⚠️  Connection data not found for Discord ID: ${connection}`)
              }
            } else {
              console.log(`      ❌ User @${retweeter.username} not connected to Discord`)
            }
          }
        } else {
          console.log(`   ⚠️  No retweets found or unable to retrieve retweet data`)
          if (metrics.retweet_count > 0) {
            console.log(`   🚫 ISSUE: Tweet has ${metrics.retweet_count} retweets but API returned 0 results`)
            console.log(`      This indicates Twitter API access level limitation (need Elevated access)`)
          }
        }
        
        // Get users who replied/commented
        console.log(`\n   💬 Attempting to get users who replied/commented...`)
        let repliesResponse
        try {
          // Search for replies to this tweet
          const repliesParams = {
            query: `conversation_id:${tweet.tweetId}`,
            max_results: 100,
            'tweet.fields': ['author_id', 'in_reply_to_user_id'],
            expansions: ['author_id'],
            'user.fields': ['username']
          }
          console.log(`   📤 API Request:`)
          console.log(`      Endpoint: GET /2/tweets/search/recent`)
          console.log(`      Query: conversation_id:${tweet.tweetId}`)
          
          repliesResponse = await readOnlyClient.v2.search(repliesParams.query, {
            max_results: repliesParams.max_results,
            'tweet.fields': repliesParams['tweet.fields'],
            expansions: repliesParams.expansions,
            'user.fields': repliesParams['user.fields']
          })
          
          // Log the full response
          console.log(`   📥 API Response:`)
          console.log(`      Has Data: ${!!repliesResponse.data}`)
          console.log(`      Data Length: ${repliesResponse.data?.length || 0}`)
          
          if (repliesResponse.data && repliesResponse.data.length > 0) {
            console.log(`      Found ${repliesResponse.data.length} replies`)
          }
          
          // Log rate limit info
          const repliesRateLimit = repliesResponse._rateLimit || repliesResponse.rateLimit || 
                                   repliesResponse._realData?._rateLimit || repliesResponse._realData?.rateLimit;
          if (repliesRateLimit) {
            console.log(`   📊 Rate Limit (search):`)
            console.log(`      Limit: ${repliesRateLimit.limit}`)
            console.log(`      Remaining: ${repliesRateLimit.remaining}`)
            console.log(`      Reset: ${new Date(repliesRateLimit.reset * 1000).toLocaleTimeString()}`)
            if (repliesRateLimit.remaining === 0) {
              console.log(`      ⚠️ RATE LIMIT REACHED! Reset at ${new Date(repliesRateLimit.reset * 1000).toLocaleTimeString()}`)
            }
          } else {
            // Rate limit info not available - likely due to API access level
            console.log(`   📊 Rate Limit: Not available (Essential API access may not provide rate limit headers)`);
          }
        } catch (replyError) {
          // ====== SMART RATE LIMIT HANDLING ======
          if (replyError.code === 429 || replyError.statusCode === 429) {
            const now = new Date()
            const resetTime = extractRateLimitInfo(replyError)
            
            if (resetTime) {
              twitterRateLimitReset = resetTime
              const resetDate = new Date(resetTime)
              const waitMs = resetTime - now.getTime()
              const waitMinutes = Math.ceil(waitMs / 1000 / 60)
              
              console.log('\n\n')
              console.log('====== RATE LIMIT HIT ======')
              console.log(`⚠️  Rate limit hit at ${now.toLocaleString()}`)
              console.log(`⏰  Reset time: ${resetDate.toLocaleString()}`)
              console.log(`⏸️  Pausing batch for ${waitMinutes} minutes`)
              console.log('============================\n')
              
              // Update batch status
              batchJob.status = 'paused_rate_limit'
              batchJob.pausedAt = now.toISOString()
              batchJob.willResumeAt = resetDate.toISOString()
              await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
              
              // Set timer to automatically restart
              if (waitMs > 0) {
                console.log(`⏱️  Setting timer for ${waitMinutes} minutes...`)
                
                setTimeout(async () => {
                  console.log('\n')
                  console.log('====== RATE LIMIT RESET ======')
                  console.log(`🔄 Rate limit reset. Restarting batch now.`)
                  console.log(`⏰  Current time: ${new Date().toLocaleString()}`)
                  console.log('==============================\n')
                  
                  // Clear the rate limit reset time
                  twitterRateLimitReset = null
                  
                  // Restart batch processing
                  try {
                    await processBatch(metricsOnlyMode)
                  } catch (restartError) {
                    console.error('❌ Failed to restart batch:', restartError.message)
                  }
                }, waitMs)
              }
              
              // Exit function to stop processing
              return
            }
          }
          // ======================================
          
          console.log(`   ❌ ERROR getting replies:`)
          console.log(`      Message: ${replyError.message}`)
          console.log(`      Error Code: ${replyError.code || 'N/A'}`)
          console.log(`      HTTP Status: ${replyError.statusCode || replyError.status || 'N/A'}`)
          
          if (replyError.data) {
            console.log(`      Error Response Body:`, JSON.stringify(replyError.data, null, 2))
          }
          
          repliesResponse = { data: [] }
        }
        
        // Handle replies
        if (repliesResponse.data && repliesResponse.data.length > 0 && repliesResponse.includes?.users) {
          console.log(`   ✅ Found ${repliesResponse.data.length} replies`)
          
          // Create a map of author IDs to usernames
          const authorMap = new Map()
          repliesResponse.includes.users.forEach(user => {
            authorMap.set(user.id, user.username)
          })
          
          for (const reply of repliesResponse.data) {
            const replierUsername = authorMap.get(reply.author_id)
            if (!replierUsername) continue
            
            // CRITICAL: Skip if user is replying to their own tweet
            if (replierUsername.toLowerCase() === tweet.authorHandle.toLowerCase()) {
              console.log(`      ⚠️  Skipping self-engagement: @${replierUsername} replied to their own tweet`)
              continue
            }
            
            const connection = await redis.get(`engagement:twitter:${replierUsername.toLowerCase()}`)
            if (connection) {
              console.log(`      👤 User @${replierUsername} is connected (Discord ID: ${connection})`)
              const userConnection = await redis.json.get(`engagement:connection:${connection}`)
              if (userConnection) {
                // Award reply points
                const replyRule = await redis.json.get(`engagement:rules:${userConnection.tier}-reply`)
                const replyBasePoints = replyRule?.points || 20
                
                // Get tier scenarios for bonus multiplier
                const scenarios = await redis.json.get(`engagement:scenarios:tier${userConnection.tier}`)
                const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
                const replyPoints = Math.round(replyBasePoints * bonusMultiplier)
                
                const existingReplyLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:reply`)
                if (!existingReplyLog) {
                  const replyLogId = nanoid()
                  const replyLog = {
                    id: replyLogId,
                    tweetId: tweet.tweetId,
                    userDiscordId: connection,
                    interactionType: 'reply',
                    points: replyPoints,
                    timestamp: new Date(),
                    batchId,
                    bonusMultiplier
                  }
                  
                  await redis.json.set(`engagement:log:${replyLogId}`, '$', replyLog)
                  await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: replyLogId })
                  await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: replyLogId })
                  await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:reply`, replyLogId)
                  
                  await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', replyPoints)
                  
                  engagementsFound++
                  tweetEngagements++
                  console.log(`✅ Awarded ${replyPoints} points to @${replierUsername} for replying (x${bonusMultiplier} bonus)`)
                  
                  // Track points in summary
                  const userKey = `@${replierUsername} (${connection})`
                  if (!userPointsSummary.has(userKey)) {
                    userPointsSummary.set(userKey, { 
                      username: replierUsername, 
                      discordId: connection, 
                      totalPoints: 0, 
                      tier: userConnection.tier,
                      actions: []
                    })
                  }
                  userPointsSummary.get(userKey).totalPoints += replyPoints
                  userPointsSummary.get(userKey).actions.push(`Reply: ${replyPoints}pts`)
                  
                  // Also award like points (assuming they liked it if they replied)
                  if (!usersAwardedLikePoints.has(connection)) {
                    const likeRule = await redis.json.get(`engagement:rules:${userConnection.tier}-like`)
                    const likeBasePoints = likeRule?.points || 10
                    const likePoints = Math.round(likeBasePoints * bonusMultiplier)
                    
                    const existingLikeLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:like`)
                    if (!existingLikeLog) {
                      const likeLogId = nanoid()
                      const likeLog = {
                        id: likeLogId,
                        tweetId: tweet.tweetId,
                        userDiscordId: connection,
                        interactionType: 'like',
                        points: likePoints,
                        timestamp: new Date(),
                        batchId,
                        bonusMultiplier
                      }
                      
                      await redis.json.set(`engagement:log:${likeLogId}`, '$', likeLog)
                      await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: likeLogId })
                      await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: likeLogId })
                      await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:like`, likeLogId)
                      
                      await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', likePoints)
                      
                      engagementsFound++
                      tweetEngagements++
                      usersAwardedLikePoints.add(connection)
                      console.log(`✅ Awarded ${likePoints} points to @${replierUsername} for implied like (x${bonusMultiplier} bonus)`)
                      
                      // Track like points in summary
                      userPointsSummary.get(userKey).totalPoints += likePoints
                      userPointsSummary.get(userKey).actions.push(`Like: ${likePoints}pts`)
                    }
                  }
                } else {
                  console.log(`      ⏭️  Skipping @${replierUsername} - already awarded points for this reply`)
                }
              } else {
                console.log(`      ⚠️  Connection data not found for Discord ID: ${connection}`)
              }
            } else {
              console.log(`      ❌ User @${replierUsername} not connected to Discord`)
            }
          }
        } else {
          console.log(`   ⚠️  No replies found or unable to retrieve reply data`)
          if (metrics.reply_count > 0) {
            console.log(`   🚫 ISSUE: Tweet has ${metrics.reply_count} replies but API returned 0 results`)
            console.log(`      This might indicate API access limitation`)
          }
        }
        
        console.log(`\n   ✅ Finished processing tweet ${tweet.tweetId}`)
        console.log(`   Total engagements awarded for this tweet: ${tweetEngagements}`)
        console.log(`   Status: SUCCESS - Tweet processed and metrics updated`)
        
        tweetsProcessed++
        
      } catch (error) {
        console.error(`\n❌ FAILED: Error processing tweet ${tweetId}`)
        console.error(`   Message: ${error.message}`)
        if (error.code) {
          console.error(`   Code: ${error.code}`)
        }
        if (error.stack) {
          console.error(`   Stack trace:`)
          console.error(error.stack.split('\n').map(line => `     ${line}`).join('\n'))
        }
        console.error(`   Status: FAILED - Tweet NOT processed`)
      }
      
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    }
    
    // Final summary of processing
    console.log(`\n📊 Processing Complete:`)
    console.log(`   - Total tweets found: ${tweetIds.length}`)
    console.log(`   - Successfully processed: ${tweetsProcessed}`)
    console.log(`   - Failed/Skipped: ${tweetIds.length - tweetsProcessed}`)
    
    // Update batch job
    console.log(`\n🔄 DEBUG: Updating batch job status...`)
    console.log(`   Batch ID: ${batchId}`)
    console.log(`   New status: completed`)
    
    const updatedBatchJob = {
      ...batchJob,
      completedAt: new Date(),
      status: 'completed',
      tweetsProcessed,
      engagementsFound
    }
    
    await redis.json.set(`engagement:batch:${batchId}`, '$', updatedBatchJob)
    
    // Verify the update
    const verifyJob = await redis.json.get(`engagement:batch:${batchId}`)
    console.log(`   ✅ Batch job updated successfully`)
    console.log(`   Verified status: ${verifyJob?.status || 'UNKNOWN'}`)
    
    console.log(`\n📊 Batch Processing Summary:`)
    console.log(`   - Batch ID: ${batchId}`)
    console.log(`   - Mode: ${shouldDoDetailedCheck ? 'FULL ENGAGEMENT MODE' : 'METRICS ONLY'}`)
    console.log(`   - Tweets processed: ${tweetsProcessed}`)
    console.log(`   - Metrics updated: ${metricsUpdated}`)
    if (shouldDoDetailedCheck) {
      console.log(`   - Total engagements awarded: ${engagementsFound}`)
      
      // Show detailed points awarded per user
      if (userPointsSummary.size > 0) {
        console.log(`\n💰 POINTS AWARDED SUMMARY:`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        
        // Sort by total points descending
        const sortedUsers = Array.from(userPointsSummary.entries())
          .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
        
        let grandTotalPoints = 0
        sortedUsers.forEach(([key, userData]) => {
          console.log(`\n👤 ${key}`)
          console.log(`   Tier: ${userData.tier.toUpperCase()}`)
          console.log(`   Actions: ${userData.actions.join(', ')}`)
          console.log(`   Total Points: ${userData.totalPoints}`)
          grandTotalPoints += userData.totalPoints
        })
        
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`🎯 GRAND TOTAL: ${grandTotalPoints} points awarded to ${userPointsSummary.size} users`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      } else {
        console.log(`\n   ⚠️  No points were awarded (no eligible engagements found)`)
      }
    }
    console.log(`\n   - Status: Completed successfully`)
    console.log(`   - Job stored at: engagement:batch:${batchId}`)
    
    // Add rate limit summary
    console.log(`\n🔑 API Usage Note:`)
    if (shouldDoDetailedCheck) {
      console.log(`   - Running in FULL ENGAGEMENT MODE (default)`)
      console.log(`   - Checking all retweets and comments`)
      console.log(`   - Automatically awarding like points to users who RT/comment`)
      console.log(`   - To run metrics-only: node discord-bots/engagement-batch-processor.js --metrics-only`)
    } else {
      console.log(`   - Running in METRICS ONLY mode`)
      console.log(`   - Only tweet metrics were updated (likes, RTs, replies)`)
      console.log(`   - No engagement points were processed`)
      console.log(`   - To run full engagement: node discord-bots/engagement-batch-processor.js (default)`)
    }
    
    console.log(`\n✅ Batch processing completed!`)
    
  } catch (error) {
    console.error('\n❌ CRITICAL: Batch processing error:', error)
    console.error(`   Error type: ${error.constructor.name}`)
    console.error(`   Error message: ${error.message}`)
    
    try {
      // Update batch job with error
      console.log(`\n🔄 DEBUG: Updating batch job with error status...`)
      const errorJobData = await redis.json.get(`engagement:batch:${batchId}`)
      if (errorJobData) {
        errorJobData.status = 'failed'
        errorJobData.error = error.message
        await redis.json.set(`engagement:batch:${batchId}`, '$', errorJobData)
      }
      
      // Verify the error update
      const errorJob = await redis.json.get(`engagement:batch:${batchId}`)
      console.log(`   Batch job updated with error`)
      console.log(`   Status: ${errorJob?.status || 'UNKNOWN'}`)
      console.log(`   Error: ${errorJob?.error || 'UNKNOWN'}`)
    } catch (updateError) {
      console.error(`   ❌ Failed to update batch job with error:`, updateError.message)
    }
  }
}

// Run immediately if called directly
if (require.main === module) {
  // Check for --metrics-only flag (default is full engagement mode)
  const metricsOnly = process.argv.includes('--metrics-only')
  
  if (metricsOnly) {
    console.log('📊 Starting in METRICS ONLY mode (--metrics-only flag detected)')
  } else {
    console.log('🚀 Starting in FULL ENGAGEMENT MODE (default)')
  }
  
  processBatch(metricsOnly)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { processBatch } 