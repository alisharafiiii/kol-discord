import { ResilientRedis } from './lib/redis-resilient.mjs'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
const envPath = join(__dirname, '..', '.env.local')
config({ path: envPath })

console.log('🧪 Testing Resilient Redis Wrapper\n')

const redis = new ResilientRedis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  botName: 'Test Bot'
})

// Wait for connection
setTimeout(async () => {
  try {
    console.log('1️⃣ Testing keys() method...')
    const projectKeys = await redis.keys('project:discord:*')
    console.log(`   Found ${projectKeys.length} keys:`, projectKeys)
    
    if (projectKeys.length > 0) {
      console.log('\n2️⃣ Testing json.get() method...')
      const firstKey = projectKeys[0]
      const project = await redis.json.get(firstKey)
      console.log(`   Raw project data:`, project)
      console.log(`   Type of project:`, typeof project)
      console.log(`   Got project:`, project?.name || 'No name')
      console.log(`   Project ID:`, project?.id)
      console.log(`   Is Active:`, project?.isActive)
      console.log(`   Tracked Channels:`, project?.trackedChannels?.length)
    }
    
    console.log('\n3️⃣ Testing regular get() method...')
    const testGet = await redis.get('test-key-doesnt-exist')
    console.log(`   Get non-existent key:`, testGet)
    
    console.log('\n✅ All tests completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    redis.destroy()
    process.exit(0)
  }
}, 2000) // Wait 2 seconds for connection 