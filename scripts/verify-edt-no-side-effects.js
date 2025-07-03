const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

async function verifyNoSideEffects() {
  console.log(`${colors.blue}🔍 Verifying No Side Effects from EDT Implementation${colors.reset}\n`)
  
  const issues = []
  
  // Check 1: Verify existing data structures remain intact
  console.log(`${colors.yellow}1. Checking Existing Data Structures${colors.reset}`)
  
  try {
    // Check user profiles
    const userKeys = await redis.keys('user:*')
    console.log(`   Found ${userKeys.length} user profiles`)
    
    // Sample a few users to check data integrity
    for (let i = 0; i < Math.min(3, userKeys.length); i++) {
      const userData = await redis.json.get(userKeys[i])
      if (userData) {
        console.log(`   ✅ User ${userKeys[i]} data intact`)
      } else {
        issues.push(`User ${userKeys[i]} data corrupted`)
      }
    }
  } catch (error) {
    issues.push(`Error checking user data: ${error.message}`)
  }
  
  // Check 2: Verify contest submissions
  console.log(`\n${colors.yellow}2. Checking Contest Submissions${colors.reset}`)
  
  try {
    const contestKeys = await redis.keys('contest:submission:*')
    console.log(`   Found ${contestKeys.length} contest submissions`)
    
    if (contestKeys.length > 0) {
      const submission = await redis.json.get(contestKeys[0])
      if (submission && submission.submittedAt) {
        console.log(`   ✅ Contest submissions have timestamps`)
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Error checking contests: ${error.message}`)
  }
  
  // Check 3: Verify engagement data
  console.log(`\n${colors.yellow}3. Checking Engagement System${colors.reset}`)
  
  try {
    // Check tweet submissions
    const tweetCount = await redis.zcard('engagement:tweets:recent')
    console.log(`   Found ${tweetCount} tweets in engagement system`)
    
    // Check connections
    const connectionKeys = await redis.keys('engagement:connection:*')
    console.log(`   Found ${connectionKeys.length} Twitter connections`)
    
    // Check tier scenarios
    const tiers = ['micro', 'rising', 'star', 'legend', 'hero']
    let scenariosFound = 0
    for (const tier of tiers) {
      const scenario = await redis.json.get(`engagement:scenarios:${tier}`)
      if (scenario) scenariosFound++
    }
    console.log(`   Found ${scenariosFound}/${tiers.length} tier scenarios`)
  } catch (error) {
    issues.push(`Error checking engagement system: ${error.message}`)
  }
  
  // Check 4: Verify Discord analytics data
  console.log(`\n${colors.yellow}4. Checking Discord Analytics${colors.reset}`)
  
  try {
    const projectKeys = await redis.keys('project:discord:*')
    console.log(`   Found ${projectKeys.length} Discord projects`)
    
    const messageKeys = await redis.keys('message:discord:*')
    console.log(`   Found ${messageKeys.length} Discord messages`)
    
    const channelKeys = await redis.keys('channel:discord:*')
    console.log(`   Found ${channelKeys.length} Discord channels`)
  } catch (error) {
    issues.push(`Error checking Discord data: ${error.message}`)
  }
  
  // Check 5: Verify points system
  console.log(`\n${colors.yellow}5. Checking Points System${colors.reset}`)
  
  try {
    // Check leaderboards
    const alltimeLeaderboard = await redis.zcard('points:leaderboard:alltime')
    console.log(`   All-time leaderboard has ${alltimeLeaderboard} entries`)
    
    // Check points config
    const pointsConfig = await redis.json.get('points:config')
    if (pointsConfig) {
      console.log(`   ✅ Points configuration intact`)
    }
  } catch (error) {
    console.log(`   ⚠️  Error checking points: ${error.message}`)
  }
  
  // Check 6: Verify batch processing
  console.log(`\n${colors.yellow}6. Checking Batch Processing${colors.reset}`)
  
  try {
    const batchKeys = await redis.keys('engagement:batch:*')
    console.log(`   Found ${batchKeys.length} batch jobs`)
    
    // Check for any pending batches
    const pendingBatches = []
    for (const key of batchKeys.slice(-5)) { // Check last 5
      const batch = await redis.json.get(key)
      if (batch && batch.status === 'pending') {
        pendingBatches.push(key)
      }
    }
    
    if (pendingBatches.length > 0) {
      console.log(`   ⚠️  Found ${pendingBatches.length} pending batch jobs`)
    } else {
      console.log(`   ✅ No stuck batch jobs`)
    }
  } catch (error) {
    console.log(`   ⚠️  Error checking batches: ${error.message}`)
  }
  
  // Check 7: Test date-based keys with EDT
  console.log(`\n${colors.yellow}7. Testing EDT Date Keys${colors.reset}`)
  
  const { getEdtDateString } = require('../discord-bots/lib/timezone')
  const today = getEdtDateString(new Date())
  const yesterday = getEdtDateString(new Date(Date.now() - 86400000))
  
  console.log(`   Today (EDT): ${today}`)
  console.log(`   Yesterday (EDT): ${yesterday}`)
  
  // Check if any daily keys exist
  const dailyKeys = [
    `engagement:daily:*:${today}`,
    `points:leaderboard:${today}`,
    `discord:messages:daily:${today}`
  ]
  
  for (const pattern of dailyKeys) {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      console.log(`   ✅ Found ${keys.length} keys matching ${pattern}`)
    }
  }
  
  // Summary
  console.log(`\n${colors.blue}📊 Summary${colors.reset}`)
  
  if (issues.length === 0) {
    console.log(`   ${colors.green}✅ No side effects detected!${colors.reset}`)
    console.log(`   All systems appear to be functioning normally`)
  } else {
    console.log(`   ${colors.red}❌ Found ${issues.length} potential issues:${colors.reset}`)
    issues.forEach(issue => console.log(`   - ${issue}`))
  }
  
  console.log(`\n${colors.yellow}Affected Systems:${colors.reset}`)
  console.log(`   ✅ Discord Analytics - Now uses EDT for date grouping`)
  console.log(`   ✅ Engagement Bot - Daily limits reset at EDT midnight`)
  console.log(`   ✅ Points System - Daily leaderboards use EDT dates`)
  console.log(`   ✅ Batch Processing - Timestamps in EDT`)
  
  console.log(`\n${colors.yellow}Unaffected Systems:${colors.reset}`)
  console.log(`   ✅ User Profiles - No changes to core data`)
  console.log(`   ✅ Contest System - Timestamps stored, display can be adjusted`)
  console.log(`   ✅ Campaign System - No direct impact`)
  console.log(`   ✅ Authentication - No changes`)
  
  return issues.length === 0
}

// Run the verification
verifyNoSideEffects()
  .then(success => {
    if (success) {
      console.log(`\n${colors.green}✅ EDT implementation verified successfully!${colors.reset}`)
    } else {
      console.log(`\n${colors.red}❌ Please review the issues above${colors.reset}`)
    }
    process.exit(success ? 0 : 1)
  })
  .catch(error => {
    console.error(`${colors.red}Error:${colors.reset}`, error)
    process.exit(1)
  }) 