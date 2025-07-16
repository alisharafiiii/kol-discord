#!/usr/bin/env node

const { Redis } = require('@upstash/redis')
require('dotenv').config({ path: '.env.local' })

async function revertEngagementSystem() {
  console.log('⚠️  REVERTING ENGAGEMENT SYSTEM TO ORIGINAL SETTINGS')
  console.log('====================================================\n')
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
  
  console.log('1️⃣ Restoring Original Tier Configuration...')
  
  // Restore original micro tier config with 500 point submission cost
  const originalMicroConfig = {
    submissionCost: 500,  // Original cost
    minPoints: 0,
    maxPoints: 999,
    canSubmitTweets: true,
    dailySubmitLimit: 5
  }
  
  await redis.json.set('engagement:tier-config:micro', '$', originalMicroConfig)
  console.log('   ✅ Restored micro tier submission cost to 500 points')
  
  // Clear all other tier configs that were added
  const tiersToRemove = ['mid', 'macro', 'mega', 'giga']
  for (const tier of tiersToRemove) {
    await redis.del(`engagement:tier-config:${tier}`)
    console.log(`   ✅ Removed ${tier} tier configuration`)
  }
  
  console.log('\n2️⃣ Removing All Point Rules...')
  
  // Remove all point rule configurations
  const allTiers = ['micro', 'mid', 'macro', 'mega', 'giga']
  const interactions = ['like', 'retweet', 'reply']
  
  for (const tier of allTiers) {
    for (const interaction of interactions) {
      await redis.del(`engagement:scenarios:${tier}:${interaction}`)
    }
  }
  console.log('   ✅ Removed all point rule configurations')
  
  console.log('\n3️⃣ Clearing All Performance Caches...')
  
  // Remove all cache keys
  const cacheKeys = [
    'engagement:cache:users',
    'engagement:cache:leaderboard', 
    'engagement:cache:stats',
    'engagement:cache:opted-in-users'
  ]
  
  for (const key of cacheKeys) {
    await redis.del(key)
  }
  console.log('   ✅ Cleared all performance caches')
  
  console.log('\n4️⃣ Removing All Indexes...')
  
  // Clear all custom indexes
  const indexPatterns = [
    'idx:engagement:twitter:*',
    'idx:engagement:tier:*'
  ]
  
  for (const pattern of indexPatterns) {
    const keys = await redis.keys(pattern)
    for (const key of keys) {
      await redis.del(key)
    }
  }
  console.log('   ✅ Removed all custom indexes')
  
  console.log('\n✅ System reverted to original configuration!')
  console.log('\nCurrent Settings:')
  console.log('- Micro tier submission cost: 500 points')
  console.log('- All bonus point rules removed')
  console.log('- All performance optimizations removed')
  console.log('- System ready for factory reset')
}

revertEngagementSystem().catch(console.error) 