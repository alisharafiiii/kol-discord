const path = require('path')
const envPath = path.join(__dirname, '..', '.env.local')
require('dotenv').config({ path: envPath })

const { ResilientRedis } = require('./lib/redis-resilient.js')

async function testRedis() {
  console.log('🔍 Testing Redis connection...')
  
  const redis = new ResilientRedis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
    botName: 'Test Script'
  })
  
  // Wait for initial connection
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  try {
    // Test basic operations
    console.log('Testing ping...')
    await redis.ping()
    console.log('✅ Ping successful')
    
    // Test get operation
    console.log('Testing get operation...')
    const testKey = 'engagement:test:connection'
    await redis.set(testKey, 'working', { ex: 60 })
    const value = await redis.get(testKey)
    console.log('✅ Get/Set successful:', value)
    
    // Test keys operation
    console.log('Testing keys operation...')
    const keys = await redis.keys('engagement:points:*')
    console.log(`✅ Found ${keys.length} points keys`)
    
    // Cleanup
    await redis.del(testKey)
    redis.destroy()
    
    console.log('\n✅ All Redis operations successful!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Redis test failed:', error.message)
    process.exit(1)
  }
}

testRedis() 