#!/usr/bin/env node

const { Redis } = require('@upstash/redis')
require('dotenv').config({ path: '.env.local' })

async function factoryResetEngagement() {
  console.log('🚨 FACTORY RESET - ENGAGEMENT SYSTEM')
  console.log('=====================================')
  console.log('⚠️  WARNING: This will DELETE ALL engagement data!')
  console.log('=====================================\n')
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
  
  // Give 5 seconds to cancel
  console.log('Starting factory reset in 5 seconds... Press Ctrl+C to cancel\n')
  await new Promise(resolve => setTimeout(resolve, 5000))
  
  console.log('🔥 STARTING FACTORY RESET...\n')
  
  let totalDeleted = 0
  
  console.log('1️⃣ Deleting All User Connections...')
  const connectionKeys = await redis.keys('engagement:connection:*')
  for (const key of connectionKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${connectionKeys.length} user connections`)
  
  console.log('\n2️⃣ Deleting All Twitter Mappings...')
  const twitterKeys = await redis.keys('engagement:twitter:*')
  for (const key of twitterKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${twitterKeys.length} Twitter mappings`)
  
  console.log('\n3️⃣ Deleting All Tweets...')
  const tweetKeys = await redis.keys('engagement:tweet:*')
  for (const key of tweetKeys) {
    await redis.del(key)
    totalDeleted++
  }
  
  // Also clear tweet IDs and recent tweets
  const tweetIdKeys = await redis.keys('engagement:tweetid:*')
  for (const key of tweetIdKeys) {
    await redis.del(key)
    totalDeleted++
  }
  
  await redis.del('engagement:tweets:recent')
  totalDeleted++
  
  console.log(`   ✅ Deleted ${tweetKeys.length} tweets and related data`)
  
  console.log('\n4️⃣ Deleting All Transactions...')
  const transactionKeys = await redis.keys('engagement:transaction:*')
  for (const key of transactionKeys) {
    await redis.del(key)
    totalDeleted++
  }
  
  await redis.del('engagement:transactions:recent')
  totalDeleted++
  
  console.log(`   ✅ Deleted ${transactionKeys.length} transactions`)
  
  console.log('\n5️⃣ Deleting All Deductions...')
  const deductionKeys = await redis.keys('engagement:deduction:*')
  for (const key of deductionKeys) {
    await redis.del(key)
    totalDeleted++
  }
  
  await redis.del('engagement:deductions:recent')
  totalDeleted++
  
  console.log(`   ✅ Deleted ${deductionKeys.length} deductions`)
  
  console.log('\n6️⃣ Deleting All Batch Jobs...')
  const batchKeys = await redis.keys('engagement:batch:*')
  for (const key of batchKeys) {
    await redis.del(key)
    totalDeleted++
  }
  
  await redis.del('engagement:batches:history')
  await redis.del('engagement:batches:running')
  totalDeleted += 2
  
  console.log(`   ✅ Deleted ${batchKeys.length} batch jobs`)
  
  console.log('\n7️⃣ Deleting All Pending Tweets...')
  const pendingKeys = await redis.keys('engagement:pending:*')
  for (const key of pendingKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${pendingKeys.length} pending tweet queues`)
  
  console.log('\n8️⃣ Deleting All Daily Limits...')
  const dailyKeys = await redis.keys('engagement:daily:*')
  for (const key of dailyKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${dailyKeys.length} daily limit trackers`)
  
  console.log('\n9️⃣ Deleting All Interaction Logs...')
  // Use scan for large sets
  let logCount = 0
  let cursor = '0'
  do {
    const result = await redis.scan(cursor, { match: 'engagement:log:*', count: 100 })
    cursor = result[0]
    const keys = result[1]
    for (const key of keys) {
      await redis.del(key)
      logCount++
      totalDeleted++
    }
  } while (cursor !== '0')
  console.log(`   ✅ Deleted ${logCount} interaction logs`)
  
  console.log('\n🔟 Deleting All Tier Configurations...')
  const tierKeys = await redis.keys('engagement:tier-config:*')
  for (const key of tierKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${tierKeys.length} tier configurations`)
  
  console.log('\n1️⃣1️⃣ Deleting All Scenarios...')
  const scenarioKeys = await redis.keys('engagement:scenarios:*')
  for (const key of scenarioKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${scenarioKeys.length} scenario configurations`)
  
  console.log('\n1️⃣2️⃣ Deleting All Caches...')
  const cacheKeys = await redis.keys('engagement:cache:*')
  for (const key of cacheKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${cacheKeys.length} cache entries`)
  
  console.log('\n1️⃣3️⃣ Deleting All Custom Indexes...')
  const indexKeys = await redis.keys('idx:engagement:*')
  for (const key of indexKeys) {
    await redis.del(key)
    totalDeleted++
  }
  console.log(`   ✅ Deleted ${indexKeys.length} index entries`)
  
  console.log('\n✅ FACTORY RESET COMPLETE!')
  console.log('=====================================')
  console.log(`📊 Total keys deleted: ${totalDeleted}`)
  console.log('\n🎯 System Status:')
  console.log('- All user data: DELETED')
  console.log('- All points data: DELETED')
  console.log('- All tweet history: DELETED')
  console.log('- All transactions: DELETED')
  console.log('- All configurations: DELETED')
  console.log('- All caches: DELETED')
  console.log('\n✨ The engagement system is now completely reset!')
  console.log('   Ready for a fresh start.')
}

factoryResetEngagement().catch(console.error) 