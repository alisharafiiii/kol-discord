#!/usr/bin/env node

const { Redis } = require('@upstash/redis')
require('dotenv').config({ path: '.env.local' })

async function verifyResetComplete() {
  console.log('🔍 Verifying Factory Reset Status')
  console.log('==================================\n')
  
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })
  
  let issues = []
  
  console.log('1️⃣ Checking for User Data...')
  const connectionKeys = await redis.keys('engagement:connection:*')
  console.log(`   User connections found: ${connectionKeys.length}`)
  if (connectionKeys.length > 0) issues.push('User connections still exist')
  
  const twitterKeys = await redis.keys('engagement:twitter:*')
  console.log(`   Twitter mappings found: ${twitterKeys.length}`)
  if (twitterKeys.length > 0) issues.push('Twitter mappings still exist')
  
  console.log('\n2️⃣ Checking for Tweet Data...')
  const tweetKeys = await redis.keys('engagement:tweet:*')
  console.log(`   Tweets found: ${tweetKeys.length}`)
  if (tweetKeys.length > 0) issues.push('Tweets still exist')
  
  const tweetIdKeys = await redis.keys('engagement:tweetid:*')
  console.log(`   Tweet IDs found: ${tweetIdKeys.length}`)
  if (tweetIdKeys.length > 0) issues.push('Tweet IDs still exist')
  
  console.log('\n3️⃣ Checking for Transaction Data...')
  const transactionKeys = await redis.keys('engagement:transaction:*')
  console.log(`   Transactions found: ${transactionKeys.length}`)
  if (transactionKeys.length > 0) issues.push('Transactions still exist')
  
  const deductionKeys = await redis.keys('engagement:deduction:*')
  console.log(`   Deductions found: ${deductionKeys.length}`)
  if (deductionKeys.length > 0) issues.push('Deductions still exist')
  
  console.log('\n4️⃣ Checking for Batch Jobs...')
  const batchKeys = await redis.keys('engagement:batch:*')
  console.log(`   Batch jobs found: ${batchKeys.length}`)
  if (batchKeys.length > 0) issues.push('Batch jobs still exist')
  
  console.log('\n5️⃣ Checking for Pending Queues...')
  const pendingKeys = await redis.keys('engagement:pending:*')
  console.log(`   Pending queues found: ${pendingKeys.length}`)
  if (pendingKeys.length > 0) issues.push('Pending queues still exist')
  
  console.log('\n6️⃣ Checking for Configuration...')
  const tierConfig = await redis.json.get('engagement:tier-config:micro')
  if (tierConfig) {
    console.log(`   Micro tier config found:`)
    console.log(`     - Submission cost: ${tierConfig.submissionCost} points`)
    if (tierConfig.submissionCost !== 500) {
      issues.push(`Submission cost is ${tierConfig.submissionCost}, should be 500`)
    }
  } else {
    console.log('   No tier configuration found (OK for fresh start)')
  }
  
  console.log('\n7️⃣ Checking for Caches and Indexes...')
  const cacheKeys = await redis.keys('engagement:cache:*')
  console.log(`   Cache entries found: ${cacheKeys.length}`)
  if (cacheKeys.length > 0) issues.push('Cache entries still exist')
  
  const indexKeys = await redis.keys('idx:engagement:*')
  console.log(`   Index entries found: ${indexKeys.length}`)
  if (indexKeys.length > 0) issues.push('Index entries still exist')
  
  console.log('\n8️⃣ Checking All Engagement Keys...')
  const allEngagementKeys = await redis.keys('engagement:*')
  console.log(`   Total engagement keys found: ${allEngagementKeys.length}`)
  
  console.log('\n=====================================')
  
  if (issues.length === 0 && allEngagementKeys.length === 0) {
    console.log('✅ VERIFICATION COMPLETE - SYSTEM FULLY RESET!')
    console.log('\n🎯 Status:')
    console.log('- All user data: ✅ CLEARED')
    console.log('- All points data: ✅ CLEARED')
    console.log('- All tweet history: ✅ CLEARED')
    console.log('- All configurations: ✅ CLEARED')
    console.log('- Submission cost: Ready to be set to 500 points')
    console.log('\n✨ The engagement system is ready for a fresh start!')
  } else {
    console.log('⚠️  ISSUES FOUND:')
    issues.forEach(issue => console.log(`   - ${issue}`))
    console.log(`\n   Total engagement keys remaining: ${allEngagementKeys.length}`)
    console.log('\n   Run factory-reset-engagement.js again to clear remaining data')
  }
}

verifyResetComplete().catch(console.error) 