// Enhanced Engagement Batch Processor with Detailed Logging
const { Redis } = require('@upstash/redis')
const { TwitterApi } = require('twitter-api-v2')
const path = require('path')
const fs = require('fs')
const { nanoid } = require('nanoid')

// Load environment variables from the root .env.local file
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Initialize Twitter API Client in read-only mode
const readOnlyClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
}).readOnly

// Store the current rate limit reset time
let twitterRateLimitReset = null

// Enhanced logging helper
function logSection(title, emoji = '📋') {
  console.log(`\n${emoji} ${title}`)
  console.log('─'.repeat(60))
}

function logTweetHeader(index, total, tweetId) {
  console.log(`\n${'━'.repeat(70)}`)
  console.log(`📌 TWEET ${index}/${total} | ID: ${tweetId}`)
  console.log('─'.repeat(70))
}

function logEngagementSummary(type, count, details = []) {
  console.log(`\n   ${type}:`)
  console.log(`   ├─ Total Found: ${count}`)
  if (details.length > 0) {
    details.forEach((detail, i) => {
      const prefix = i === details.length - 1 ? '└─' : '├─'
      console.log(`   ${prefix} ${detail}`)
    })
  }
}

function logBatchSummary(stats) {
  logSection('BATCH PROCESSING COMPLETE', '✅')
  console.log(`   Duration: ${stats.duration}`)
  console.log(`   Tweets Processed: ${stats.tweetsProcessed}`)
  console.log(`   Total Engagements: ${stats.engagementsFound}`)
  console.log(`   Points Awarded: ${stats.totalPointsAwarded}`)
  console.log(`   Rate Limits Hit: ${stats.rateLimitsHit}`)
  console.log(`   Errors: ${stats.errors}`)
}

// Extract rate limit information from Twitter API error
function extractRateLimitInfo(error) {
  try {
    // Check various possible locations for rate limit info
    const rateLimitReset = error.rateLimit?.reset || 
                          error._rateLimit?.reset || 
                          error.data?.rateLimit?.reset ||
                          error.headers?.['x-rate-limit-reset']
                          
    if (rateLimitReset) {
      return parseInt(rateLimitReset) * 1000 // Convert to milliseconds
    }
    
    // If no rate limit info, default to 15 minutes from now
    return Date.now() + (15 * 60 * 1000)
  } catch (e) {
    // Default to 15 minutes from now if we can't parse the error
    return Date.now() + (15 * 60 * 1000)
  }
}

async function processBatch(metricsOnlyMode = false) {
  const batchStartTime = Date.now()
  const batchStats = {
    tweetsProcessed: 0,
    engagementsFound: 0,
    totalPointsAwarded: 0,
    rateLimitsHit: 0,
    errors: 0,
    userEngagements: new Map() // Track engagements per user
  }

  logSection('STARTING ENGAGEMENT BATCH PROCESSING', '🚀')
  console.log(`   Mode: ${metricsOnlyMode ? 'METRICS ONLY' : 'FULL ENGAGEMENT'}`)
  console.log(`   Started: ${new Date().toLocaleString()}`)
  
  // Check if we're still rate limited
  if (twitterRateLimitReset && twitterRateLimitReset > Date.now()) {
    const waitTime = Math.ceil((twitterRateLimitReset - Date.now()) / 1000 / 60)
    console.log(`\n⚠️  RATE LIMITED: Waiting ${waitTime} more minutes until ${new Date(twitterRateLimitReset).toLocaleTimeString()}`)
    return
  }
  
  // Check for existing batch job or create new one
  const pendingBatches = await redis.zrange('engagement:batches', Date.now() - (2 * 60 * 60 * 1000), '+inf', { byScore: true })
  
  let batchId
  let batchJob
  
  for (const existingBatchId of pendingBatches) {
    const existingBatch = await redis.json.get(`engagement:batch:${existingBatchId}`)
    if (existingBatch && (existingBatch.status === 'running' || existingBatch.status === 'paused_rate_limit')) {
      batchId = existingBatchId
      batchJob = existingBatch
      console.log(`   Resuming existing batch: ${batchId}`)
      break
    }
  }
  
  if (!batchId) {
    batchId = nanoid()
    batchJob = {
      id: batchId,
      startedAt: new Date(),
      status: 'running',
      tweetsProcessed: 0,
      engagementsFound: 0,
      totalPointsAwarded: 0
    }
    
    console.log(`   Creating new batch: ${batchId}`)
    await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
    await redis.zadd('engagement:batches', { score: Date.now(), member: batchId })
  }
  
  try {
    // Get recent tweets from last 24 hours
    const cutoff = Date.now() - (24 * 60 * 60 * 1000)
    const tweetIds = await redis.zrange('engagement:tweets:recent', cutoff, '+inf', { byScore: true })
    
    logSection('TWEETS TO PROCESS', '📊')
    console.log(`   Found: ${tweetIds.length} tweets from last 24 hours`)
    console.log(`   Time Window: ${new Date(cutoff).toLocaleString()} - Now`)
    
    if (tweetIds.length === 0) {
      console.log(`\n⚠️  No tweets found to process`)
      await finalizeBatch(batchId, batchJob, batchStats, batchStartTime)
      return
    }
    
    // Process each tweet
    for (let i = 0; i < tweetIds.length; i++) {
      const tweetId = tweetIds[i]
      logTweetHeader(i + 1, tweetIds.length, tweetId)
      
      try {
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
        if (!tweet) {
          console.log(`   ⚠️ Tweet data not found in Redis`)
          continue
        }
        
        console.log(`   Author: @${tweet.authorHandle}`)
        console.log(`   URL: ${tweet.url}`)
        console.log(`   Submitted: ${new Date(tweet.submittedAt).toLocaleString()}`)
        
        // Process the tweet
        const tweetStats = await processSingleTweet(tweet, tweetId, batchId, metricsOnlyMode, batchStats)
        
        if (tweetStats) {
          batchStats.tweetsProcessed++
          batchStats.engagementsFound += tweetStats.engagements
          batchStats.totalPointsAwarded += tweetStats.pointsAwarded
          
          // Log tweet processing summary
          console.log(`\n   📊 Tweet Summary:`)
          console.log(`      ├─ Engagements Found: ${tweetStats.engagements}`)
          console.log(`      ├─ Points Awarded: ${tweetStats.pointsAwarded}`)
          console.log(`      └─ Users Engaged: ${tweetStats.usersEngaged}`)
        }
        
      } catch (error) {
        batchStats.errors++
        console.error(`\n   ❌ Error processing tweet: ${error.message}`)
        
        // Check for rate limit
        if (error.code === 429 || error.statusCode === 429) {
          await handleRateLimit(error, batchId, batchJob, batchStats)
          return
        }
      }
    }
    
    // Update Discord roles after processing all tweets
    await updateDiscordRoles(batchStats)
    
    // Finalize batch
    await finalizeBatch(batchId, batchJob, batchStats, batchStartTime)
    
  } catch (error) {
    console.error(`\n❌ Batch processing failed: ${error.message}`)
    batchJob.status = 'failed'
    batchJob.error = error.message
    await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  }
}

async function processSingleTweet(tweet, tweetId, batchId, metricsOnlyMode, batchStats) {
  const tweetStats = {
    engagements: 0,
    pointsAwarded: 0,
    usersEngaged: 0,
    retweets: [],
    comments: [],
    likes: []
  }
  
  try {
    // Fetch tweet data from Twitter API
    console.log(`\n   🔍 Fetching tweet data from Twitter API...`)
    const tweetData = await readOnlyClient.v2.singleTweet(tweet.tweetId, {
      'tweet.fields': ['public_metrics', 'author_id'],
      expansions: ['author_id']
    })
    
    if (!tweetData.data) {
      console.log(`   ❌ Tweet not found on Twitter`)
      return null
    }
    
    const metrics = tweetData.data.public_metrics
    console.log(`\n   📊 Tweet Metrics:`)
    console.log(`      ├─ Likes: ${metrics.like_count}`)
    console.log(`      ├─ Retweets: ${metrics.retweet_count}`)
    console.log(`      └─ Replies: ${metrics.reply_count}`)
    
    // Update metrics in Redis
    await redis.json.set(`engagement:tweet:${tweetId}`, '$.metrics', {
      likes: metrics.like_count,
      retweets: metrics.retweet_count,
      replies: metrics.reply_count
    })
    
    // Log rate limit info
    logRateLimit('Tweet Lookup', tweetData)
    
    if (metricsOnlyMode) {
      console.log(`\n   ⏭️ Skipping engagement processing (metrics-only mode)`)
      return tweetStats
    }
    
    // Process retweets
    const retweetStats = await processRetweets(tweet, tweetId, batchId, batchStats)
    tweetStats.retweets = retweetStats.users
    tweetStats.engagements += retweetStats.count
    tweetStats.pointsAwarded += retweetStats.points
    
    // Process comments/replies
    const commentStats = await processComments(tweet, tweetId, batchId, batchStats, retweetStats.awardedLikePoints)
    tweetStats.comments = commentStats.users
    tweetStats.engagements += commentStats.count
    tweetStats.pointsAwarded += commentStats.points
    
    // Calculate unique users engaged
    const uniqueUsers = new Set([
      ...retweetStats.users.map(u => u.discordId),
      ...commentStats.users.map(u => u.discordId)
    ])
    tweetStats.usersEngaged = uniqueUsers.size
    
    return tweetStats
    
  } catch (error) {
    console.error(`   ❌ Error processing tweet: ${error.message}`)
    throw error
  }
}

async function processRetweets(tweet, tweetId, batchId, batchStats) {
  const stats = {
    users: [],
    count: 0,
    points: 0,
    awardedLikePoints: new Set()
  }
  
  try {
    console.log(`\n   🔁 Processing Retweets...`)
    
    const retweetersResponse = await readOnlyClient.v2.tweetRetweetedBy(tweet.tweetId, {
      max_results: 100,
      'user.fields': ['username']
    })
    
    logRateLimit('Retweets', retweetersResponse)
    
    if (!retweetersResponse.data || retweetersResponse.data.length === 0) {
      console.log(`      └─ No retweets found`)
      return stats
    }
    
    const retweetDetails = []
    
    for (const retweeter of retweetersResponse.data) {
      // Skip self-engagement
      if (retweeter.username.toLowerCase() === tweet.authorHandle.toLowerCase()) {
        retweetDetails.push(`⚠️ Skipped @${retweeter.username} (self-engagement)`)
        continue
      }
      
      const connection = await redis.get(`engagement:twitter:${retweeter.username.toLowerCase()}`)
      if (!connection) {
        retweetDetails.push(`❌ @${retweeter.username} - Not connected to Discord`)
        continue
      }
      
      const userConnection = await redis.json.get(`engagement:connection:${connection}`)
      if (!userConnection) {
        retweetDetails.push(`⚠️ @${retweeter.username} - Connection data missing`)
        continue
      }
      
      // Check if already awarded
      const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:retweet`)
      if (existingLog) {
        retweetDetails.push(`⏭️ @${retweeter.username} - Already awarded`)
        continue
      }
      
      // Award retweet points
      const retweetPoints = await awardPoints(
        tweet.tweetId,
        connection,
        userConnection,
        'retweet',
        batchId,
        retweeter.username
      )
      
      if (retweetPoints > 0) {
        stats.users.push({
          username: retweeter.username,
          discordId: connection,
          points: retweetPoints,
          action: 'retweet'
        })
        stats.count++
        stats.points += retweetPoints
        
        // Track in batch stats
        updateUserEngagement(batchStats, retweeter.username, connection, 'retweet', retweetPoints)
        
        retweetDetails.push(`✅ @${retweeter.username} - ${retweetPoints} points (${userConnection.tier})`)
        
        // Award like points too
        if (!stats.awardedLikePoints.has(connection)) {
          const likePoints = await awardPoints(
            tweet.tweetId,
            connection,
            userConnection,
            'like',
            batchId,
            retweeter.username
          )
          
          if (likePoints > 0) {
            stats.points += likePoints
            stats.awardedLikePoints.add(connection)
            updateUserEngagement(batchStats, retweeter.username, connection, 'like', likePoints)
            retweetDetails.push(`   └─ +${likePoints} like points (auto-awarded)`)
          }
        }
      }
    }
    
    logEngagementSummary('🔁 RETWEETS', stats.count, retweetDetails)
    
  } catch (error) {
    if (error.code === 429 || error.statusCode === 429) {
      throw error // Propagate rate limit errors
    }
    console.log(`      ❌ Error fetching retweets: ${error.message}`)
  }
  
  return stats
}

async function processComments(tweet, tweetId, batchId, batchStats, usersWithLikePoints) {
  const stats = {
    users: [],
    count: 0,
    points: 0
  }
  
  try {
    console.log(`\n   💬 Processing Comments/Replies...`)
    
    const repliesResponse = await readOnlyClient.v2.search(`conversation_id:${tweet.tweetId}`, {
      max_results: 100,
      'tweet.fields': ['author_id', 'in_reply_to_user_id'],
      expansions: ['author_id'],
      'user.fields': ['username']
    })
    
    logRateLimit('Comments', repliesResponse)
    
    if (!repliesResponse.data || repliesResponse.data.length === 0) {
      console.log(`      └─ No comments found`)
      return stats
    }
    
    const commentDetails = []
    const repliers = new Map()
    
    // Extract unique repliers
    if (repliesResponse.includes?.users) {
      for (const tweet of repliesResponse.data) {
        const user = repliesResponse.includes.users.find(u => u.id === tweet.author_id)
        if (user && !repliers.has(user.id)) {
          repliers.set(user.id, user)
        }
      }
    }
    
    for (const [userId, replier] of repliers) {
      // Skip self-engagement
      if (replier.username.toLowerCase() === tweet.authorHandle.toLowerCase()) {
        commentDetails.push(`⚠️ Skipped @${replier.username} (self-engagement)`)
        continue
      }
      
      const connection = await redis.get(`engagement:twitter:${replier.username.toLowerCase()}`)
      if (!connection) {
        commentDetails.push(`❌ @${replier.username} - Not connected to Discord`)
        continue
      }
      
      const userConnection = await redis.json.get(`engagement:connection:${connection}`)
      if (!userConnection) {
        commentDetails.push(`⚠️ @${replier.username} - Connection data missing`)
        continue
      }
      
      // Check if already awarded
      const existingLog = await redis.get(`engagement:interaction:${tweet.tweetId}:${connection}:comment`)
      if (existingLog) {
        commentDetails.push(`⏭️ @${replier.username} - Already awarded`)
        continue
      }
      
      // Award comment points
      const commentPoints = await awardPoints(
        tweet.tweetId,
        connection,
        userConnection,
        'comment',
        batchId,
        replier.username
      )
      
      if (commentPoints > 0) {
        stats.users.push({
          username: replier.username,
          discordId: connection,
          points: commentPoints,
          action: 'comment'
        })
        stats.count++
        stats.points += commentPoints
        
        // Track in batch stats
        updateUserEngagement(batchStats, replier.username, connection, 'comment', commentPoints)
        
        commentDetails.push(`✅ @${replier.username} - ${commentPoints} points (${userConnection.tier})`)
        
        // Award like points if not already awarded
        if (!usersWithLikePoints.has(connection)) {
          const likePoints = await awardPoints(
            tweet.tweetId,
            connection,
            userConnection,
            'like',
            batchId,
            replier.username
          )
          
          if (likePoints > 0) {
            stats.points += likePoints
            updateUserEngagement(batchStats, replier.username, connection, 'like', likePoints)
            commentDetails.push(`   └─ +${likePoints} like points (auto-awarded)`)
          }
        }
      }
    }
    
    logEngagementSummary('💬 COMMENTS', stats.count, commentDetails)
    
  } catch (error) {
    if (error.code === 429 || error.statusCode === 429) {
      throw error // Propagate rate limit errors
    }
    console.log(`      ❌ Error fetching comments: ${error.message}`)
  }
  
  return stats
}

async function awardPoints(tweetId, discordId, userConnection, interactionType, batchId, username) {
  try {
    // Get tier rules
    const rule = await redis.json.get(`engagement:rules:${userConnection.tier}-${interactionType}`)
    const basePoints = rule?.points || { like: 10, retweet: 35, comment: 50 }[interactionType]
    
    // Get tier bonus multiplier
    const scenarios = await redis.json.get(`engagement:scenarios:tier${userConnection.tier}`)
    const bonusMultiplier = scenarios?.bonusMultiplier || 1.0
    const points = Math.round(basePoints * bonusMultiplier)
    
    // Create engagement log
    const logId = nanoid()
    const engagementLog = {
      id: logId,
      tweetId,
      userDiscordId: discordId,
      interactionType,
      points,
      timestamp: new Date(),
      batchId,
      bonusMultiplier
    }
    
    // Store the log
    await redis.json.set(`engagement:log:${logId}`, '$', engagementLog)
    await redis.zadd(`engagement:user:${discordId}:logs`, { score: Date.now(), member: logId })
    await redis.zadd(`engagement:tweet:${tweetId}:logs`, { score: Date.now(), member: logId })
    await redis.set(`engagement:interaction:${tweetId}:${discordId}:${interactionType}`, logId)
    
    // Update user points
    await redis.json.numincrby(`engagement:connection:${discordId}`, '$.totalPoints', points)
    
    return points
    
  } catch (error) {
    console.error(`      ❌ Error awarding points to ${username}: ${error.message}`)
    return 0
  }
}

function updateUserEngagement(batchStats, username, discordId, action, points) {
  const key = `@${username} (${discordId})`
  if (!batchStats.userEngagements.has(key)) {
    batchStats.userEngagements.set(key, {
      username,
      discordId,
      totalPoints: 0,
      actions: {}
    })
  }
  
  const userStats = batchStats.userEngagements.get(key)
  userStats.totalPoints += points
  
  if (!userStats.actions[action]) {
    userStats.actions[action] = { count: 0, points: 0 }
  }
  userStats.actions[action].count++
  userStats.actions[action].points += points
}

async function updateDiscordRoles(batchStats) {
  logSection('UPDATING DISCORD ROLES', '🎭')
  
  const roleUpdates = []
  
  for (const [key, userStats] of batchStats.userEngagements) {
    try {
      const connection = await redis.json.get(`engagement:connection:${userStats.discordId}`)
      if (!connection) continue
      
      const profile = await redis.json.get(`profile:user_${connection.twitterUsername}`)
      if (!profile) continue
      
      // Check if tier has changed
      const oldTier = profile.tier || profile.role || 'micro'
      const newTier = connection.tier
      
      if (oldTier !== newTier) {
        // Update profile tier
        await redis.json.set(`profile:user_${connection.twitterUsername}`, '$.tier', newTier)
        await redis.json.set(`profile:user_${connection.twitterUsername}`, '$.role', newTier)
        
        roleUpdates.push({
          username: userStats.username,
          discordId: userStats.discordId,
          oldTier,
          newTier,
          totalPoints: userStats.totalPoints
        })
        
        console.log(`   ✅ @${userStats.username}: ${oldTier} → ${newTier} (${connection.totalPoints} total points)`)
      }
    } catch (error) {
      console.error(`   ❌ Error updating role for ${userStats.username}: ${error.message}`)
    }
  }
  
  if (roleUpdates.length === 0) {
    console.log(`   No role changes needed`)
  } else {
    console.log(`\n   Summary: ${roleUpdates.length} role(s) updated`)
  }
  
  return roleUpdates
}

function logRateLimit(operation, response) {
  const rateLimit = response._rateLimit || response.rateLimit || 
                    response._realData?._rateLimit || response._realData?.rateLimit
  
  if (rateLimit) {
    const remaining = rateLimit.remaining
    const total = rateLimit.limit
    const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString()
    const percentage = Math.round((remaining / total) * 100)
    
    console.log(`\n   📊 Rate Limit (${operation}):`)
    console.log(`      ├─ Remaining: ${remaining}/${total} (${percentage}%)`)
    console.log(`      └─ Reset: ${resetTime}`)
    
    if (remaining === 0) {
      console.log(`      ⚠️ RATE LIMIT EXHAUSTED!`)
    } else if (percentage < 20) {
      console.log(`      ⚠️ Rate limit low!`)
    }
  }
}

async function handleRateLimit(error, batchId, batchJob, batchStats) {
  batchStats.rateLimitsHit++
  
  const resetTime = extractRateLimitInfo(error)
  twitterRateLimitReset = resetTime
  
  const now = Date.now()
  const waitMs = resetTime - now
  const waitMinutes = Math.ceil(waitMs / 1000 / 60)
  
  logSection('RATE LIMIT HIT', '⚠️')
  console.log(`   Hit at: ${new Date().toLocaleString()}`)
  console.log(`   Reset at: ${new Date(resetTime).toLocaleString()}`)
  console.log(`   Wait time: ${waitMinutes} minutes`)
  console.log(`   Progress: ${batchStats.tweetsProcessed} tweets processed`)
  console.log(`   Engagements found: ${batchStats.engagementsFound}`)
  
  // Update batch status
  batchJob.status = 'paused_rate_limit'
  batchJob.pausedAt = new Date().toISOString()
  batchJob.willResumeAt = new Date(resetTime).toISOString()
  batchJob.tweetsProcessed = batchStats.tweetsProcessed
  batchJob.engagementsFound = batchStats.engagementsFound
  await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  
  // Set timer to restart
  if (waitMs > 0) {
    console.log(`\n⏱️ Setting auto-restart timer for ${waitMinutes} minutes...`)
    
    setTimeout(async () => {
      logSection('RATE LIMIT RESET - RESUMING', '🔄')
      console.log(`   Time: ${new Date().toLocaleString()}`)
      
      twitterRateLimitReset = null
      
      try {
        await processBatch()
      } catch (error) {
        console.error('❌ Failed to restart batch:', error.message)
      }
    }, waitMs)
  }
}

async function finalizeBatch(batchId, batchJob, batchStats, startTime) {
  const duration = Math.round((Date.now() - startTime) / 1000)
  const minutes = Math.floor(duration / 60)
  const seconds = duration % 60
  
  batchStats.duration = `${minutes}m ${seconds}s`
  
  // Update batch job
  batchJob.status = 'completed'
  batchJob.completedAt = new Date()
  batchJob.tweetsProcessed = batchStats.tweetsProcessed
  batchJob.engagementsFound = batchStats.engagementsFound
  batchJob.totalPointsAwarded = batchStats.totalPointsAwarded
  batchJob.duration = duration
  
  await redis.json.set(`engagement:batch:${batchId}`, '$', batchJob)
  
  // Log final summary
  logBatchSummary(batchStats)
  
  // Log user engagement summary
  if (batchStats.userEngagements.size > 0) {
    logSection('USER ENGAGEMENT SUMMARY', '👥')
    
    // Sort users by points
    const sortedUsers = Array.from(batchStats.userEngagements.entries())
      .sort((a, b) => b[1].totalPoints - a[1].totalPoints)
      .slice(0, 10) // Top 10
    
    sortedUsers.forEach(([key, stats], index) => {
      console.log(`\n   ${index + 1}. @${stats.username} - ${stats.totalPoints} points`)
      Object.entries(stats.actions).forEach(([action, data]) => {
        console.log(`      └─ ${action}: ${data.count}x (${data.points} pts)`)
      })
    })
    
    if (batchStats.userEngagements.size > 10) {
      console.log(`\n   ... and ${batchStats.userEngagements.size - 10} more users`)
    }
  }
  
  // Save detailed batch log
  const logPath = path.join(__dirname, 'logs', `batch_${new Date().toISOString().split('T')[0]}.log`)
  const logContent = {
    batchId,
    timestamp: new Date().toISOString(),
    stats: batchStats,
    userEngagements: Object.fromEntries(batchStats.userEngagements)
  }
  
  fs.mkdirSync(path.dirname(logPath), { recursive: true })
  fs.appendFileSync(logPath, JSON.stringify(logContent) + '\n')
  
  console.log(`\n📁 Batch log saved to: ${logPath}`)
}

module.exports = { processBatch } 