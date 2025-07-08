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
console.log('🚀 ENGAGEMENT PAGE PERFORMANCE TEST')
console.log('='.repeat(80))
console.log('This test will measure the /engagement page load times')
console.log('='.repeat(80) + '\n')

async function measurePerformance() {
  try {
    // First, clear any existing caches
    console.log('🗑️  Clearing existing caches...')
    const cacheKeys = await redis.keys('engagement:cache:*')
    if (cacheKeys.length > 0) {
      await redis.del(...cacheKeys)
      console.log(`   Cleared ${cacheKeys.length} cache entries`)
    }
    
    // Test 1: First load (no cache)
    console.log('\n📊 Test 1: First load (no cache)')
    console.log('='.repeat(40))
    
    let startTime = Date.now()
    
    // Simulate fetching opted-in users (main bottleneck)
    console.log('   Fetching all connections...')
    const connections = await redis.keys('engagement:connection:*')
    console.log(`   Found ${connections.length} connections`)
    
    // Count how long it takes to process all users
    const users = []
    const seenHandles = new Set()
    
    for (const connectionKey of connections) {
      const connection = await redis.json.get(connectionKey)
      if (!connection) continue
      
      const handle = connection.twitterHandle?.toLowerCase()
      if (!handle || seenHandles.has(handle)) continue
      seenHandles.add(handle)
      
      users.push({
        discordId: connection.discordId,
        twitterHandle: connection.twitterHandle,
        tier: connection.tier || 'micro',
        totalPoints: connection.totalPoints || 0
      })
    }
    
    const firstLoadTime = Date.now() - startTime
    console.log(`   ✅ First load completed in ${firstLoadTime}ms`)
    console.log(`   Processed ${users.length} unique users`)
    
    // Test 2: Load with optimized method (batching)
    console.log('\n📊 Test 2: Optimized batch loading')
    console.log('='.repeat(40))
    
    startTime = Date.now()
    
    const batchSize = 50
    const optimizedUsers = []
    const optimizedSeenHandles = new Set()
    
    for (let i = 0; i < connections.length; i += batchSize) {
      const batch = connections.slice(i, i + batchSize)
      const batchPromises = batch.map(async (connectionKey) => {
        const connection = await redis.json.get(connectionKey)
        if (!connection) return null
        
        const handle = connection.twitterHandle?.toLowerCase()
        if (!handle || optimizedSeenHandles.has(handle)) return null
        optimizedSeenHandles.add(handle)
        
        return {
          discordId: connection.discordId,
          twitterHandle: connection.twitterHandle,
          tier: connection.tier || 'micro',
          totalPoints: connection.totalPoints || 0
        }
      })
      
      const batchResults = await Promise.all(batchPromises)
      optimizedUsers.push(...batchResults.filter(Boolean))
    }
    
    const optimizedLoadTime = Date.now() - startTime
    console.log(`   ✅ Optimized load completed in ${optimizedLoadTime}ms`)
    console.log(`   Processed ${optimizedUsers.length} unique users`)
    console.log(`   Speed improvement: ${Math.round((1 - optimizedLoadTime/firstLoadTime) * 100)}%`)
    
    // Test 3: Cached load
    console.log('\n📊 Test 3: Cached load')
    console.log('='.repeat(40))
    
    // Store in cache
    await redis.setex('engagement:cache:opted-in-users', 300, JSON.stringify(optimizedUsers))
    
    startTime = Date.now()
    const cached = await redis.get('engagement:cache:opted-in-users')
    const cachedUsers = cached ? JSON.parse(cached) : []
    const cachedLoadTime = Date.now() - startTime
    
    console.log(`   ✅ Cached load completed in ${cachedLoadTime}ms`)
    console.log(`   Retrieved ${cachedUsers.length} users from cache`)
    console.log(`   Speed improvement over first load: ${Math.round((1 - cachedLoadTime/firstLoadTime) * 100)}%`)
    
    // Summary
    console.log('\n' + '='.repeat(80))
    console.log('📊 PERFORMANCE SUMMARY')
    console.log('='.repeat(80))
    console.log(`Sequential processing:  ${firstLoadTime}ms`)
    console.log(`Batch processing:       ${optimizedLoadTime}ms (${Math.round((1 - optimizedLoadTime/firstLoadTime) * 100)}% faster)`)
    console.log(`Cached response:        ${cachedLoadTime}ms (${Math.round((1 - cachedLoadTime/firstLoadTime) * 100)}% faster)`)
    console.log('='.repeat(80))
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:')
    console.log('1. Cache is refreshed every 5 minutes automatically')
    console.log('2. Batch processing reduces Redis calls significantly')
    console.log('3. Background jobs can pre-populate user stats')
    console.log('4. Consider pagination for very large datasets')
    
  } catch (error) {
    console.error('❌ Error during performance test:', error)
  } finally {
    process.exit(0)
  }
}

// Run the test
measurePerformance() 