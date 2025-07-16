#!/usr/bin/env node

const { Redis } = require('@upstash/redis')
require('dotenv').config({ path: '.env.local' })

async function completeFactoryReset() {
  console.log('🔧 Completing Factory Reset...\n')
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
  
  // Clear remaining engagement keys
  const patterns = [
    'engagement:log:*',
    'engagement:tier-config:*',
    'engagement:scenarios:*',
    'engagement:cache:*',
    'idx:engagement:*'
  ]
  
  let totalDeleted = 0
  
  for (const pattern of patterns) {
    console.log(`Clearing ${pattern}...`)
    let count = 0
    
    try {
      // Try keys first for small sets
      const keys = await redis.keys(pattern)
      if (keys.length < 100) {
        for (const key of keys) {
          await redis.del(key)
          count++
          totalDeleted++
        }
      } else {
        // Use scan for large sets
        let cursor = '0'
        do {
          const result = await redis.scan(cursor, { match: pattern, count: 100 })
          cursor = result[0]
          const scanKeys = result[1]
          for (const key of scanKeys) {
            await redis.del(key)
            count++
            totalDeleted++
          }
        } while (cursor !== '0')
      }
    } catch (e) {
      // If keys fails, use scan
      let cursor = '0'
      do {
        const result = await redis.scan(cursor, { match: pattern, count: 100 })
        cursor = result[0]
        const scanKeys = result[1]
        for (const key of scanKeys) {
          await redis.del(key)
          count++
          totalDeleted++
        }
      } while (cursor !== '0')
    }
    
    console.log(`   ✅ Deleted ${count} keys`)
  }
  
  console.log(`\n✅ Deleted ${totalDeleted} remaining keys`)
  console.log('Factory reset complete!')
}

completeFactoryReset().catch(console.error) 