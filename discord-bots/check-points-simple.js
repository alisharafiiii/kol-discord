const path = require('path')
const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const { Redis } = require('@upstash/redis')

async function checkPoints() {
  console.log('🔍 Checking points system status...\n')
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
  
  try {
    // Check recent deductions (indicates bot is processing submissions)
    console.log('💸 Recent Point Deductions (last 5):')
    const deductionIds = await redis.zrange('engagement:deductions:recent', -5, -1)
    
    if (deductionIds.length === 0) {
      console.log('   No recent deductions found')
    } else {
      for (const id of deductionIds) {
        const deduction = await redis.json.get(`engagement:deduction:${id}`)
        if (deduction) {
          console.log(`   @${deduction.twitterHandle}: ${deduction.points} points`)
          console.log(`   Action: ${deduction.action}`)
          console.log(`   Time: ${deduction.timestamp}`)
          console.log('   ---')
        }
      }
    }
    
    // Check a few user connections for points
    console.log('\n👥 Sample User Points:')
    const sampleUsers = [
      '232290532089561090',  // Example Discord ID
      '1185633764577390663',
      '1093993305539489814'
    ]
    
    for (const userId of sampleUsers) {
      const connKey = `engagement:connection:${userId}`
      const exists = await redis.exists(connKey)
      if (exists) {
        const conn = await redis.json.get(connKey)
        console.log(`   Discord ID: ${userId}`)
        console.log(`   Twitter: @${conn.twitterHandle}`)
        console.log(`   Points: ${conn.totalPoints}`)
        console.log(`   Tier: ${conn.tier}`)
        console.log('   ---')
      }
    }
    
    // Check pending tweets for today
    const today = new Date().toISOString().split('T')[0]
    console.log(`\n📝 Pending tweets for ${today}:`)
    const pendingToday = await redis.smembers(`engagement:pending:${today}`)
    console.log(`   Found ${pendingToday.length} pending tweets`)
    
    if (pendingToday.length > 0) {
      console.log('\n   Last 3 tweets:')
      for (const tweetId of pendingToday.slice(-3)) {
        const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
        if (tweet) {
          console.log(`   - @${tweet.authorHandle}: ${tweet.url}`)
          console.log(`     Tier: ${tweet.tier}, Submitted: ${tweet.submittedAt}`)
        }
      }
    }
    
    // Check batch processing status
    console.log('\n⚙️  Batch Processing:')
    const lastBatchKey = await redis.zrange('engagement:batches', -1, -1)
    if (lastBatchKey.length > 0) {
      const lastBatch = await redis.json.get(`engagement:batch:${lastBatchKey[0]}`)
      if (lastBatch) {
        console.log(`   Last batch: ${lastBatchKey[0]}`)
        console.log(`   Status: ${lastBatch.status}`)
        console.log(`   Started: ${lastBatch.startedAt}`)
        console.log(`   Tweets processed: ${lastBatch.tweetsProcessed || 0}`)
        console.log(`   Points awarded: ${lastBatch.totalPointsAwarded || 0}`)
      }
    } else {
      console.log('   No batch jobs found')
    }
    
    console.log('\n✅ Check complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

checkPoints() 