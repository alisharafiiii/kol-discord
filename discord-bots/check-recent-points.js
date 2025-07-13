const path = require('path')
const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const { ResilientRedis } = require('./lib/redis-resilient.js')

async function checkRecentPoints() {
  console.log('🔍 Checking recent points activity...\n')
  
  const redis = new ResilientRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    botName: 'Points Check'
  })
  
  // Wait longer for connection
  console.log('⏳ Waiting for Redis connection...')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  // Check connection status
  if (!redis.isConnected) {
    console.log('❌ Redis is not connected after 5 seconds')
    console.log('Last error:', redis.lastError?.message || 'None')
    
    // Try a direct connection test
    console.log('\n🔍 Testing direct Redis connection...')
    const { Redis } = require('@upstash/redis')
    try {
      const directRedis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN
      })
      await directRedis.ping()
      console.log('✅ Direct connection successful!')
      
      // Use direct connection for checks
      console.log('\n📊 Using direct connection to check data...')
      
      // Check recent engagement logs
      const recentLogs = await directRedis.keys('engagement:log:*')
      console.log(`Found ${recentLogs.length} total engagement logs`)
      
      // Check user connections
      const connections = await directRedis.keys('engagement:connection:*')
      console.log(`Found ${connections.length} total user connections`)
      
      // Check a sample connection
      if (connections.length > 0) {
        const sampleConn = await directRedis.json.get(connections[0])
        console.log('\nSample connection:', {
          handle: sampleConn?.twitterHandle,
          points: sampleConn?.totalPoints,
          tier: sampleConn?.tier
        })
      }
      
    } catch (directError) {
      console.error('❌ Direct connection also failed:', directError.message)
    }
    
    process.exit(1)
  }
  
  try {
    // Original checking code...
    console.log('✅ Redis connected via resilient wrapper')
    
    // Check recent engagement logs
    console.log('\n📊 Recent Engagement Logs:')
    const recentLogs = await redis.keys('engagement:log:*')
    console.log(`Found ${recentLogs.length} total engagement logs`)
    
    // Get last 5 logs
    const lastFiveLogs = recentLogs.slice(-5)
    for (const logKey of lastFiveLogs) {
      const log = await redis.json.get(logKey)
      if (log) {
        console.log(`\n   Log: ${logKey}`)
        console.log(`   User: ${log.userDiscordId}`)
        console.log(`   Points: ${log.points}`)
        console.log(`   Type: ${log.interactionType}`)
        console.log(`   Time: ${log.timestamp}`)
      }
    }
    
    // Check user connections with points
    console.log('\n\n👥 User Connections with Points:')
    const connections = await redis.keys('engagement:connection:*')
    console.log(`Found ${connections.length} total user connections`)
    
    let usersWithPoints = 0
    for (const connKey of connections) {
      const conn = await redis.json.get(connKey)
      if (conn && conn.totalPoints > 0) {
        usersWithPoints++
        console.log(`\n   @${conn.twitterHandle}: ${conn.totalPoints} points`)
        console.log(`   Discord: ${conn.discordUsername || 'Not set'}`)
        console.log(`   Tier: ${conn.tier}`)
      }
    }
    console.log(`\n✅ ${usersWithPoints} users have points`)
    
    // Check recent deductions
    console.log('\n\n💸 Recent Point Deductions:')
    const deductions = await redis.keys('engagement:deduction:*')
    console.log(`Found ${deductions.length} total deductions`)
    
    const lastFiveDeductions = deductions.slice(-5)
    for (const dedKey of lastFiveDeductions) {
      const ded = await redis.json.get(dedKey)
      if (ded) {
        console.log(`\n   @${ded.twitterHandle}: ${ded.points} points`)
        console.log(`   Action: ${ded.action}`)
        console.log(`   Time: ${ded.timestamp}`)
      }
    }
    
    // Check pending tweets
    console.log('\n\n📝 Pending Tweets:')
    const pendingKeys = await redis.keys('engagement:pending:*')
    console.log(`Found ${pendingKeys.length} pending tweets`)
    
    for (const pendKey of pendingKeys.slice(-3)) {
      const tweets = await redis.smembers(pendKey)
      console.log(`\n   Date: ${pendKey.split(':').pop()}`)
      console.log(`   Tweets: ${tweets.length}`)
    }
    
    redis.destroy()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkRecentPoints() 