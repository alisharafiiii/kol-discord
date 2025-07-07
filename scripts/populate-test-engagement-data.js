#!/usr/bin/env node

/**
 * Populate test engagement data for dashboard testing
 */

const dotenv = require('dotenv')
const path = require('path')
const { nanoid } = require('nanoid')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function main() {
  const discordId = process.argv[2] || '918575895374082078' // sharafi's discord ID
  const days = parseInt(process.argv[3]) || 7
  
  console.log(`\n🎯 Populating ${days} days of test engagement data for Discord ID: ${discordId}\n`)

  // Check if connection exists
  const connection = await redis.json.get(`engagement:connection:${discordId}`)
  if (!connection) {
    console.log('❌ Discord connection not found')
    return
  }
  
  console.log(`✅ Found connection for @${connection.twitterHandle}`)
  
  // Create sample engagement logs for the past N days
  const now = new Date()
  let totalPoints = 0
  const engagementTypes = ['like', 'retweet', 'reply']
  const basePoints = { like: 10, retweet: 35, reply: 20 }
  
  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    
    // Generate 2-8 random engagements per day
    const numEngagements = Math.floor(Math.random() * 7) + 2
    
    console.log(`\n📅 Day ${date.toISOString().split('T')[0]}:`)
    
    for (let i = 0; i < numEngagements; i++) {
      const type = engagementTypes[Math.floor(Math.random() * engagementTypes.length)]
      const points = basePoints[type]
      const logId = nanoid()
      
      // Random time during the day
      const timestamp = new Date(date)
      timestamp.setHours(Math.floor(Math.random() * 24))
      timestamp.setMinutes(Math.floor(Math.random() * 60))
      
      // Create log entry
      const log = {
        id: logId,
        tweetId: nanoid(), // fake tweet ID
        userDiscordId: discordId,
        interactionType: type,
        points: points,
        timestamp: timestamp.toISOString(),
        batchId: 'test-batch',
        bonusMultiplier: 1.0
      }
      
      // Save log
      await redis.json.set(`engagement:log:${logId}`, '$', log)
      
      // Add to user's logs sorted set
      await redis.zadd(`engagement:user:${discordId}:logs`, { 
        score: timestamp.getTime(), 
        member: logId 
      })
      
      totalPoints += points
      console.log(`   - ${type}: ${points} points at ${timestamp.toLocaleTimeString()}`)
    }
  }
  
  // Update total points
  const currentTotalPoints = connection.totalPoints || 0
  const newTotalPoints = currentTotalPoints + totalPoints
  
  await redis.json.set(`engagement:connection:${discordId}`, '$.totalPoints', newTotalPoints)
  
  console.log('\n✅ Test data populated successfully!')
  console.log(`📊 Summary:`)
  console.log(`   - Days: ${days}`)
  console.log(`   - Points added: ${totalPoints}`)
  console.log(`   - Total points: ${currentTotalPoints} -> ${newTotalPoints}`)
  
  // Verify the data
  console.log('\n🔍 Verifying data:')
  const logsKey = `engagement:user:${discordId}:logs`
  const logCount = await redis.zcount(logsKey, '-inf', '+inf')
  console.log(`   - Total logs in sorted set: ${logCount}`)
  
  // Get recent logs
  const recentLogs = await redis.zrange(logsKey, 0, 4, { rev: true })
  console.log(`   - Most recent ${recentLogs.length} log IDs:`)
  for (const logId of recentLogs) {
    const log = await redis.json.get(`engagement:log:${logId}`)
    if (log) {
      console.log(`     • ${log.interactionType}: ${log.points} points`)
    }
  }
  
  console.log('\n✅ Dashboard should now show data!')
}

main().catch(console.error) 