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
console.log('🧹 CLEARING STUCK INTERACTIONS')
console.log('='.repeat(80))
console.log('This will allow users to get points for tweets they engage with again')
console.log('='.repeat(80) + '\n')

async function clearStuckInteractions() {
  try {
    // First, let's see how many interaction records exist
    console.log('📊 Step 1: Analyzing interaction records...')
    console.log('='.repeat(50))
    
    // Get some recent tweets to check
    const recentTweetIds = await redis.zrange('engagement:tweets:recent', -20, -1, { rev: true })
    
    let totalInteractions = 0
    let tweetCount = 0
    
    for (const tweetId of recentTweetIds) {
      const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
      if (!tweet) continue
      
      tweetCount++
      
      // Count interactions for this tweet using SCAN instead of KEYS
      let cursor = 0
      let interactionsForTweet = 0
      
      do {
        const result = await redis.scan(cursor, {
          match: `engagement:interaction:${tweet.tweetId}:*`,
          count: 100
        })
        cursor = result[0]
        interactionsForTweet += result[1].length
      } while (cursor !== 0)
      
      if (interactionsForTweet > 0) {
        console.log(`\n📌 Tweet ${tweet.tweetId} by @${tweet.authorHandle}`)
        console.log(`   • Interactions locked: ${interactionsForTweet}`)
        totalInteractions += interactionsForTweet
      }
    }
    
    console.log(`\n📊 Summary:`)
    console.log(`   • Tweets checked: ${tweetCount}`)
    console.log(`   • Total interaction locks: ${totalInteractions}`)
    
    if (totalInteractions === 0) {
      console.log('\n✅ No stuck interactions found!')
      return
    }
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: Clearing interaction records will allow users to get points again')
    console.log('   for tweets they\'ve already engaged with.')
    console.log('\n   This should only be done if:')
    console.log('   1. Users are complaining about missing points')
    console.log('   2. You\'ve verified the points configuration is correct')
    console.log('   3. You understand this may result in duplicate points')
    
    console.log('\n🧹 Step 2: Clearing interaction records...')
    console.log('='.repeat(50))
    
    // Clear interactions for recent tweets
    let clearedCount = 0
    
    for (const tweetId of recentTweetIds) {
      const tweet = await redis.json.get(`engagement:tweet:${tweetId}`)
      if (!tweet) continue
      
      // Clear interactions using SCAN and DEL
      let cursor = 0
      const keysToDelete = []
      
      do {
        const result = await redis.scan(cursor, {
          match: `engagement:interaction:${tweet.tweetId}:*`,
          count: 100
        })
        cursor = result[0]
        keysToDelete.push(...result[1])
      } while (cursor !== 0)
      
      if (keysToDelete.length > 0) {
        // Delete in batches
        for (let i = 0; i < keysToDelete.length; i += 50) {
          const batch = keysToDelete.slice(i, i + 50)
          await redis.del(...batch)
          clearedCount += batch.length
        }
        console.log(`   ✅ Cleared ${keysToDelete.length} locks for tweet ${tweet.tweetId}`)
      }
    }
    
    console.log(`\n✅ Cleared ${clearedCount} interaction records!`)
    console.log('   Users can now get points for these tweets again.')
    
    // Additional recommendations
    console.log('\n\n💡 NEXT STEPS:')
    console.log('='.repeat(60))
    console.log('\n1. Trigger a manual batch to reprocess recent tweets:')
    console.log('   node trigger-manual-batch.js')
    
    console.log('\n2. Monitor the next few batches for:')
    console.log('   - Increased points awarded')
    console.log('   - Users reporting they got their points')
    
    console.log('\n3. Consider implementing a time-based expiry:')
    console.log('   - Auto-clear interactions older than 7 days')
    console.log('   - Allow users to re-engage with older content')
    
  } catch (error) {
    console.error('❌ Error clearing interactions:', error)
  } finally {
    process.exit(0)
  }
}

// Run the cleanup
clearStuckInteractions() 