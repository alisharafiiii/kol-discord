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
console.log('🧹 CLEARING STUCK INTERACTIONS (FAST VERSION)')
console.log('='.repeat(80))
console.log('This will clear ALL interaction locks to allow re-awarding points')
console.log('='.repeat(80) + '\n')

async function clearAllInteractions() {
  try {
    console.log('📊 Scanning for interaction records...')
    console.log('='.repeat(50))
    
    let cursor = 0
    let totalKeys = 0
    let deletedKeys = 0
    const startTime = Date.now()
    
    // Use a single SCAN to find all interaction keys
    do {
      console.log(`\r⏳ Scanning... Found ${totalKeys} keys so far...`)
      
      const result = await redis.scan(cursor, {
        match: 'engagement:interaction:*',
        count: 1000  // Larger batch size for faster scanning
      })
      
      cursor = result[0]
      const keys = result[1]
      totalKeys += keys.length
      
      // Delete keys in batches
      if (keys.length > 0) {
        // Delete in chunks of 100
        for (let i = 0; i < keys.length; i += 100) {
          const batch = keys.slice(i, i + 100)
          await redis.del(...batch)
          deletedKeys += batch.length
          console.log(`\r⏳ Scanning... Found ${totalKeys} keys, deleted ${deletedKeys}...`)
        }
      }
    } while (cursor !== 0)
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    
    console.log('\n\n✅ CLEANUP COMPLETE!')
    console.log('='.repeat(60))
    console.log(`   • Total interaction locks found: ${totalKeys}`)
    console.log(`   • Total deleted: ${deletedKeys}`)
    console.log(`   • Time taken: ${duration} seconds`)
    
    if (deletedKeys > 0) {
      console.log('\n💡 Users can now receive points for all tweets again!')
      console.log('\n📌 Next steps:')
      console.log('   1. Run: node trigger-manual-batch.js')
      console.log('   2. Monitor the logs for increased points being awarded')
    } else {
      console.log('\n✅ No interaction locks found - system is clean!')
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

// Run immediately
clearAllInteractions() 