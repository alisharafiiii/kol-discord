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
console.log('🔧 MANUAL TIER SYNC')
console.log('='.repeat(80))
console.log('Syncing tiers for specific users')
console.log('='.repeat(80) + '\n')

async function syncUserTier(handle, expectedTier) {
  try {
    console.log(`\n🔄 Syncing @${handle} to ${expectedTier} tier...`)
    
    // Find profile
    let profile = null
    let profileId = null
    
    // Try different formats
    const profileIds = [
      `profile:${handle}`,
      `twitter_${handle}`,
      `user_${handle}`,
      `user:${handle}`
    ]
    
    for (const id of profileIds) {
      try {
        const data = await redis.json.get(id)
        if (data) {
          profile = data
          profileId = id
          break
        }
      } catch (e) {
        // Skip
      }
    }
    
    // Also check indexes
    if (!profile) {
      const userIds = await redis.smembers(`idx:username:${handle}`)
      if (userIds && userIds.length > 0) {
        profileId = userIds[0]
        profile = await redis.json.get(profileId)
      }
    }
    
    if (!profile) {
      console.log(`   ❌ No profile found`)
      return
    }
    
    console.log(`   ✓ Found profile at: ${profileId}`)
    console.log(`   • Current profile tier: ${profile.tier || 'micro'}`)
    
    // Update profile tier - MUST be quoted as JSON string
    await redis.json.set(profileId, '$.tier', `"${expectedTier}"`)
    console.log(`   ✓ Updated profile tier to: ${expectedTier}`)
    
    // Find Discord connection
    const discordId = profile.discordId
    if (!discordId) {
      console.log(`   ⚠️  No Discord ID in profile`)
      // Try to find via reverse lookup
      const reverseDiscordId = await redis.get(`engagement:twitter:${handle}`)
      if (reverseDiscordId) {
        console.log(`   ✓ Found Discord ID via reverse lookup: ${reverseDiscordId}`)
        
        // Update engagement connection - MUST be quoted as JSON string
        const connKey = `engagement:connection:${reverseDiscordId}`
        await redis.json.set(connKey, '$.tier', `"${expectedTier}"`)
        console.log(`   ✓ Updated engagement connection tier`)
      }
    } else {
      // Update engagement connection - MUST be quoted as JSON string
      const connKey = `engagement:connection:${discordId}`
      const conn = await redis.json.get(connKey)
      if (conn) {
        await redis.json.set(connKey, '$.tier', `"${expectedTier}"`)
        console.log(`   ✓ Updated engagement connection tier`)
      } else {
        console.log(`   ⚠️  No engagement connection found`)
      }
    }
    
    console.log(`   ✅ Sync complete for @${handle}`)
    
  } catch (error) {
    console.error(`   ❌ Error syncing @${handle}:`, error.message)
  }
}

async function main() {
  // Users to sync with their expected tiers
  const usersToSync = [
    { handle: 'sharafi_eth', tier: 'legend' },  // Admin user - legend tier
    { handle: 'saoweb3', tier: 'micro' },       // All other users are micro
    { handle: 'hopcofficial', tier: 'micro' },
    { handle: 'emahmad0', tier: 'micro' },
    { handle: 'yaldamasoudi', tier: 'micro' },
    { handle: 'salimteymouri', tier: 'micro' },
    { handle: 'danialrh_7', tier: 'micro' }
  ]
  
  console.log(`Syncing ${usersToSync.length} users...\n`)
  
  for (const user of usersToSync) {
    await syncUserTier(user.handle, user.tier)
  }
  
  console.log('\n\n✅ MANUAL SYNC COMPLETE!')
  console.log('='.repeat(60))
  console.log('Users should now see correct tiers in:')
  console.log('• Discord bot /leaderboard command')
  console.log('• Admin engagement panel')
  console.log('\n💡 To verify, run: node diagnose-tier-sync.js')
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err)
  process.exit(1)
}) 