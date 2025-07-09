const { config } = require('dotenv')
const path = require('path')
const { Redis } = require('@upstash/redis')

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

console.log('\n' + '='.repeat(80))
console.log('🔄 RESETTING ENGAGEMENT SYSTEM')
console.log('='.repeat(80))
console.log('This will:')
console.log('  ✅ Reset all user points to 0')
console.log('  ✅ Clear all tweets from the queue')
console.log('  ✅ Clear all engagement logs')
console.log('  ✅ Keep user connections intact')
console.log('='.repeat(80) + '\n')

async function resetEngagementSystem() {
  try {
    const startTime = Date.now()
    
    // 1. Reset all user points to 0
    console.log('📊 Step 1: Resetting user points...')
    console.log('='.repeat(50))
    
    let cursor = 0
    let userCount = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:connection:*',
        count: 100
      })
      
      cursor = result[0]
      const connectionKeys = result[1]
      
      for (const key of connectionKeys) {
        const connection = await redis.json.get(key)
        if (connection) {
          // Reset points to 0
          await redis.json.set(key, '$.totalPoints', 0)
          userCount++
          
          if (userCount % 10 === 0) {
            console.log(`   • Reset ${userCount} users so far...`)
          }
        }
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Reset points for ${userCount} users`)
    
    // 2. Clear all tweets from the queue
    console.log('\n📊 Step 2: Clearing tweet queue...')
    console.log('='.repeat(50))
    
    // Clear recent tweets sorted set
    const tweetCount = await redis.zcard('engagement:tweets:recent')
    await redis.del('engagement:tweets:recent')
    console.log(`   ✅ Removed ${tweetCount} tweets from queue`)
    
    // Delete all tweet data
    cursor = 0
    let deletedTweets = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:tweet:*',
        count: 100
      })
      
      cursor = result[0]
      const tweetKeys = result[1]
      
      if (tweetKeys.length > 0) {
        await redis.del(...tweetKeys)
        deletedTweets += tweetKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Deleted ${deletedTweets} tweet records`)
    
    // 3. Clear all engagement logs
    console.log('\n📊 Step 3: Clearing engagement logs...')
    console.log('='.repeat(50))
    
    cursor = 0
    let deletedLogs = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:log:*',
        count: 100
      })
      
      cursor = result[0]
      const logKeys = result[1]
      
      if (logKeys.length > 0) {
        await redis.del(...logKeys)
        deletedLogs += logKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Deleted ${deletedLogs} engagement logs`)
    
    // 4. Clear interaction records
    console.log('\n📊 Step 4: Clearing interaction records...')
    console.log('='.repeat(50))
    
    cursor = 0
    let deletedInteractions = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:interaction:*',
        count: 100
      })
      
      cursor = result[0]
      const interactionKeys = result[1]
      
      if (interactionKeys.length > 0) {
        await redis.del(...interactionKeys)
        deletedInteractions += interactionKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Deleted ${deletedInteractions} interaction records`)
    
    // 5. Clear user engagement history
    console.log('\n📊 Step 5: Clearing user engagement history...')
    console.log('='.repeat(50))
    
    cursor = 0
    let clearedHistories = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:user:*:logs',
        count: 100
      })
      
      cursor = result[0]
      const historyKeys = result[1]
      
      if (historyKeys.length > 0) {
        await redis.del(...historyKeys)
        clearedHistories += historyKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Cleared ${clearedHistories} user histories`)
    
    // 6. Clear batch records
    console.log('\n📊 Step 6: Clearing batch records...')
    console.log('='.repeat(50))
    
    // Clear batch sorted set
    const batchCount = await redis.zcard('engagement:batches')
    await redis.del('engagement:batches')
    
    // Clear batch data
    cursor = 0
    let deletedBatches = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:batch:*',
        count: 100
      })
      
      cursor = result[0]
      const batchKeys = result[1]
      
      if (batchKeys.length > 0) {
        await redis.del(...batchKeys)
        deletedBatches += batchKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Deleted ${batchCount} batch records`)
    
    // 7. Clear rate limit counters
    console.log('\n📊 Step 7: Resetting rate limits...')
    console.log('='.repeat(50))
    
    await redis.del('engagement:rateLimit:current')
    await redis.del('engagement:rateLimit:windowStart')
    console.log('   ✅ Rate limit counters reset')
    
    // 8. Clear any caches
    console.log('\n📊 Step 8: Clearing caches...')
    console.log('='.repeat(50))
    
    cursor = 0
    let clearedCaches = 0
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:cache:*',
        count: 100
      })
      
      cursor = result[0]
      const cacheKeys = result[1]
      
      if (cacheKeys.length > 0) {
        await redis.del(...cacheKeys)
        clearedCaches += cacheKeys.length
      }
    } while (cursor !== 0)
    
    console.log(`   ✅ Cleared ${clearedCaches} cache entries`)
    
    // Summary
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n\n✅ ENGAGEMENT SYSTEM RESET COMPLETE!')
    console.log('='.repeat(60))
    console.log(`   • Users reset: ${userCount} (all points set to 0)`)
    console.log(`   • Tweets cleared: ${tweetCount + deletedTweets}`)
    console.log(`   • Logs cleared: ${deletedLogs}`)
    console.log(`   • Interactions cleared: ${deletedInteractions}`)
    console.log(`   • Time taken: ${duration} seconds`)
    
    console.log('\n💡 What\'s still intact:')
    console.log('   ✅ User connections (Twitter ↔ Discord links)')
    console.log('   ✅ User profiles and tiers')
    console.log('   ✅ Engagement rules and point values')
    console.log('   ✅ Discord bot configuration')
    
    console.log('\n📌 Next steps:')
    console.log('   1. New tweets submitted from now will be processed')
    console.log('   2. All users start with 0 points')
    console.log('   3. No old tweets will be processed')
    console.log('   4. The system is ready for a fresh start!')
    
    console.log('\n⚠️  IMPORTANT: The engagement bot will process new tweets')
    console.log('   starting from the next batch cycle (every 30 minutes)')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

// Add confirmation prompt
const readline = require('readline')
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('⚠️  WARNING: This will reset ALL user points to 0 and clear ALL tweets!')
console.log('   User connections will be preserved.\n')

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close()
    resetEngagementSystem()
  } else {
    console.log('\n❌ Reset cancelled')
    rl.close()
    process.exit(0)
  }
}) 