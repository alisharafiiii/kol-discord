const { config } = require('dotenv')
const { Redis } = require('@upstash/redis')
const { TwitterApi } = require('twitter-api-v2')
const { nanoid } = require('nanoid')

// Load environment variables
config({ path: '.env.local' })

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

// Process batch job
async function processBatch(forceDetailedCheck = false) {
  console.log('🔄 Starting batch processing...')
  console.log('📋 Configuration:')
  console.log(`   - Redis configured: ${!!process.env.UPSTASH_REDIS_REST_URL}`)
  console.log(`   - Twitter API Key: ${process.env.TWITTER_API_KEY ? process.env.TWITTER_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`)
  console.log(`   - Twitter Access Token: ${process.env.TWITTER_ACCESS_TOKEN ? process.env.TWITTER_ACCESS_TOKEN.substring(0, 8) + '...' : 'NOT SET'}`)
  console.log(`   - Twitter API Version: v2`)
  console.log(`   - Authentication Type: OAuth 1.0a (User Context)`)
  
  // Declare variable in proper scope
  let hoursSinceLastCheck = 0
  
  // Check if we should do detailed engagement processing
  const lastDetailedCheck = await redis.get('engagement:lastDetailedCheck')
  hoursSinceLastCheck = lastDetailedCheck ? 
    (Date.now() - parseInt(lastDetailedCheck)) / (1000 * 60 * 60) : 
    Infinity
  
  const shouldDoDetailedCheck = forceDetailedCheck || hoursSinceLastCheck >= 1 // Check every hour
  
  if (shouldDoDetailedCheck) {
    console.log(`\n🔍 Running DETAILED engagement check (last check: ${hoursSinceLastCheck.toFixed(1)} hours ago)`)
    await redis.set('engagement:lastDetailedCheck', Date.now())
  } else {
    console.log(`\n📊 Running METRICS ONLY update (next detailed check in ${(1 - hoursSinceLastCheck).toFixed(1)} hours)`)
  }
  
  // Create batch job
  const batchId = nanoid()
  const batchJob = {
    id: batchId,
    startedAt: new Date(),
    status: 'running',
    tweetsProcessed: 0,
    engagementsFound: 0
  }
  
  await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  await redis.zadd('engagement:batches', { score: Date.now(), member: batchId })
  
  try {
    // Get recent tweets from last 24 hours (stored as sorted set)
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    const tweetIds = await redis.zrange('engagement:tweets:recent', cutoff, '+inf', { byScore: true })
    
    console.log(`📊 Found ${tweetIds.length} tweets from last 24 hours to process`)
    
    let tweetsProcessed = 0
    let engagementsFound = 0
    let metricsUpdated = 0
    
    for (const tweetId of tweetIds) {
      let tweetEngagements = 0 // Track engagements per tweet
      try {
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
        if (!tweet) {
          console.log(`⚠️  Tweet data not found in Redis for ID: ${tweetId}`)
          continue
        }
        
        console.log(`\n📌 Processing tweet ${tweet.tweetId}...`)
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
        
        // Get users who liked the tweet
        console.log(`\n   👍 Attempting to get users who liked the tweet...`)
        let likersResponse
        try {
          // Log the API request details
          const likesParams = {
            max_results: 100,
            'user.fields': ['username']
          }
          console.log(`   📤 API Request:`)
          console.log(`      Endpoint: GET /2/tweets/${tweet.tweetId}/liking_users`)
          console.log(`      Full URL: https://api.twitter.com/2/tweets/${tweet.tweetId}/liking_users`)
          console.log(`      Parameters:`, JSON.stringify(likesParams, null, 2))
          
          likersResponse = await readOnlyClient.v2.tweetLikedBy(tweet.tweetId, likesParams)
          
          // Log the full response
          console.log(`   📥 API Response:`)
          console.log(`      HTTP Status: ${likersResponse._realData?._response?.statusCode || 'Unknown'}`)
          console.log(`      Has Data: ${!!likersResponse.data}`)
          console.log(`      Data Length: ${likersResponse.data?.length || 0}`)
          
          if (likersResponse.data && likersResponse.data.length > 0) {
            console.log(`      First 3 users: ${likersResponse.data.slice(0, 3).map(u => u.username).join(', ')}`)
          }
          
          if (likersResponse.errors) {
            console.log(`      Errors:`, JSON.stringify(likersResponse.errors, null, 2))
          }
          
          // Log raw response for debugging
          console.log(`      Raw Response Body:`, JSON.stringify({
            data: likersResponse.data?.length ? `Array[${likersResponse.data.length}]` : likersResponse.data,
            meta: likersResponse.meta,
            errors: likersResponse.errors
          }, null, 2))
          
          // Log rate limit info
          const likesRateLimit = likersResponse._rateLimit || likersResponse.rateLimit || 
                                 likersResponse._realData?._rateLimit || likersResponse._realData?.rateLimit;
          if (likesRateLimit) {
            console.log(`   📊 Rate Limit (liking_users):`)
            console.log(`      Limit: ${likesRateLimit.limit}`)
            console.log(`      Remaining: ${likesRateLimit.remaining}`)
            console.log(`      Reset: ${new Date(likesRateLimit.reset * 1000).toLocaleTimeString()}`)
            if (likesRateLimit.remaining === 0) {
              console.log(`      ⚠️ RATE LIMIT REACHED! Reset at ${new Date(likesRateLimit.reset * 1000).toLocaleTimeString()}`)
            }
          } else {
            // Rate limit info not available - likely due to API access level
            console.log(`   📊 Rate Limit: Not available (Essential API access may not provide rate limit headers)`);
          }
        } catch (likeError) {
          console.log(`   ❌ ERROR getting likes:`)
          console.log(`      Message: ${likeError.message}`)
          console.log(`      Error Code: ${likeError.code || 'N/A'}`)
          console.log(`      HTTP Status: ${likeError.statusCode || likeError.status || 'N/A'}`)
          
          if (likeError.data) {
            console.log(`      Error Response Body:`, JSON.stringify(likeError.data, null, 2))
          }
          
          if (likeError.errors) {
            console.log(`      Twitter API Errors:`, JSON.stringify(likeError.errors, null, 2))
          }
          
          likersResponse = { data: [] }
        }
        
        // Handle paginated response
        if (likersResponse.data && likersResponse.data.length > 0) {
          console.log(`   ✅ Found ${likersResponse.data.length} users who liked the tweet`)
          for (const liker of likersResponse.data) {
            const connection = await redis.get(`engagement:twitter:${liker.username.toLowerCase()}`)
            if (connection) {
              console.log(`      👤 User @${liker.username} is connected (Discord ID: ${connection})`)
              // User is connected, award points
              const userConnection = await redis.json.get(`engagement:connection:${connection}`)
              if (userConnection) {
                const pointRule = await redis.json.get(`engagement:rules:${userConnection.tier}-like`)
                const basePoints = pointRule?.points || 1
                
                // Get tier scenarios for bonus multiplier
                const scenarios = await redis.json.get(`engagement:scenarios:tier${userConnection.tier}`)
                const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
                const points = Math.round(basePoints * bonusMultiplier)
                
                // Check if already logged
                const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:like`)
                if (!existingLog) {
                  // Log engagement
                  const logId = nanoid()
                  const log = {
                    id: logId,
                    tweetId: tweet.tweetId,
                    userDiscordId: connection,
                    interactionType: 'like',
                    points,
                    timestamp: new Date(),
                    batchId,
                    bonusMultiplier
                  }
                  
                  await redis.json.set(`engagement:log:${logId}`, '$', log)
                  await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: logId })
                  await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: logId })
                  await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:like`, logId)
                  
                  // Update user points
                  await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', points)
                  
                  engagementsFound++
                  tweetEngagements++
                  console.log(`✅ Awarded ${points} points to ${liker.username} for liking (x${bonusMultiplier} bonus)`)
                } else {
                  console.log(`      ⏭️  Skipping @${liker.username} - already awarded points for this like`)
                }
              } else {
                console.log(`      ⚠️  Connection data not found for Discord ID: ${connection}`)
              }
            } else {
              console.log(`      ❌ User @${liker.username} not connected to Discord`)
            }
          }
        } else {
          console.log(`   ⚠️  No likes found or unable to retrieve likes data`)
          if (metrics.like_count > 0) {
            console.log(`   🚫 ISSUE: Tweet has ${metrics.like_count} likes but API returned 0 results`)
            console.log(`      This indicates Twitter API access level limitation (need Elevated access)`)
          }
        }
        
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
          console.log(`   ❌ ERROR getting retweets:`)
          console.log(`      Message: ${retweetError.message}`)
          console.log(`      Error Code: ${retweetError.code || 'N/A'}`)
          console.log(`      HTTP Status: ${retweetError.statusCode || retweetError.status || 'N/A'}`)
          
          if (retweetError.data) {
            console.log(`      Error Response Body:`, JSON.stringify(retweetError.data, null, 2))
          }
          
          if (retweetError.errors) {
            console.log(`      Twitter API Errors:`, JSON.stringify(retweetError.errors, null, 2))
          }
          
          retweetersResponse = { data: [] }
        }
        
        // Handle paginated response
        if (retweetersResponse.data && retweetersResponse.data.length > 0) {
          console.log(`   ✅ Found ${retweetersResponse.data.length} users who retweeted`)
          for (const retweeter of retweetersResponse.data) {
            const connection = await redis.get(`engagement:twitter:${retweeter.username.toLowerCase()}`)
            if (connection) {
              console.log(`      👤 User @${retweeter.username} is connected (Discord ID: ${connection})`)
              const userConnection = await redis.json.get(`engagement:connection:${connection}`)
              if (userConnection) {
                const pointRule = await redis.json.get(`engagement:rules:${userConnection.tier}-retweet`)
                const basePoints = pointRule?.points || 2
                
                // Get tier scenarios for bonus multiplier
                const scenarios = await redis.json.get(`engagement:scenarios:tier${userConnection.tier}`)
                const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
                const points = Math.round(basePoints * bonusMultiplier)
                
                const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`)
                if (!existingLog) {
                  const logId = nanoid()
                  const log = {
                    id: logId,
                    tweetId: tweet.tweetId,
                    userDiscordId: connection,
                    interactionType: 'retweet',
                    points,
                    timestamp: new Date(),
                    batchId,
                    bonusMultiplier
                  }
                  
                  await redis.json.set(`engagement:log:${logId}`, '$', log)
                  await redis.zadd(`engagement:user:${connection}:logs`, { score: Date.now(), member: logId })
                  await redis.zadd(`engagement:tweet:${tweet.tweetId}:logs`, { score: Date.now(), member: logId })
                  await redis.set(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`, logId)
                  
                  await redis.json.numincrby(`engagement:connection:${connection}`, '$.totalPoints', points)
                  
                  engagementsFound++
                  tweetEngagements++
                  console.log(`✅ Awarded ${points} points to ${retweeter.username} for retweeting (x${bonusMultiplier} bonus)`)
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
        
        console.log(`\n   ✅ Finished processing tweet ${tweet.tweetId}`)
        console.log(`   Total engagements awarded for this tweet: ${tweetEngagements}`)
        
        tweetsProcessed++
        
      } catch (error) {
        console.error(`\n❌ Error processing tweet ${tweetId}:`)
        console.error(`   Message: ${error.message}`)
        if (error.code) {
          console.error(`   Code: ${error.code}`)
        }
        if (error.stack) {
          console.error(`   Stack trace:`)
          console.error(error.stack.split('\n').map(line => `     ${line}`).join('\n'))
        }
      }
    }
    
    // Update batch job
    await redis.json.set(`engagement:batch:${batchId}`, '$', {
      ...batchJob,
      completedAt: new Date(),
      status: 'completed',
      tweetsProcessed,
      engagementsFound
    })
    
    console.log(`\n📊 Batch Processing Summary:`)
    console.log(`   - Batch ID: ${batchId}`)
    console.log(`   - Mode: ${shouldDoDetailedCheck ? 'DETAILED (metrics + engagement)' : 'METRICS ONLY'}`)
    console.log(`   - Tweets processed: ${tweetsProcessed}`)
    console.log(`   - Metrics updated: ${metricsUpdated}`)
    if (shouldDoDetailedCheck) {
      console.log(`   - Total engagements awarded: ${engagementsFound}`)
    }
    console.log(`   - Status: Completed successfully`)
    
    // Add rate limit summary
    console.log(`\n🔑 API Usage Note:`)
    if (shouldDoDetailedCheck) {
      console.log(`   - Detailed checks run hourly to minimize API calls`)
      console.log(`   - If you see "⚠️ RATE LIMIT REACHED!" above, wait until reset time`)
      console.log(`   - Force detailed check with: node discord-bots/engagement-batch-processor.js --force-detailed`)
    } else {
      console.log(`   - Only tweet metrics were updated (likes, RTs, replies)`)
      console.log(`   - No engagement points were processed in this run`)
      console.log(`   - Next detailed check scheduled in ${(1 - hoursSinceLastCheck).toFixed(1)} hours`)
    }
    
    console.log(`\n✅ Batch processing completed!`)
    
  } catch (error) {
    console.error('Batch processing error:', error)
    
    // Update batch job with error
    await redis.json.set(`engagement:batch:${batchId}`, '$.status', 'failed')
    await redis.json.set(`engagement:batch:${batchId}`, '$.error', error.message)
  }
}

// Run immediately if called directly
if (require.main === module) {
  // Check for --force-detailed flag
  const forceDetailed = process.argv.includes('--force-detailed')
  
  processBatch(forceDetailed)
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error)
      process.exit(1)
    })
}

module.exports = { processBatch } 