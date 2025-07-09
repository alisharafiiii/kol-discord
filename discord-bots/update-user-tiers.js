const { config } = require('dotenv')
const path = require('path')
const { Redis } = require('@upstash/redis')
const readline = require('readline')

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('\n' + '='.repeat(80))
console.log('🔧 BULK USER TIER UPDATE TOOL')
console.log('='.repeat(80))
console.log('This tool allows you to update tiers for multiple users at once')
console.log('='.repeat(80) + '\n')

// Example tier assignments
const TIER_EXAMPLES = `
EXAMPLE TIER ASSIGNMENTS:
========================
Format: @handle tier

@user1 rising
@user2 star
@user3 legend
@user4 hero
@user5 micro

Available tiers: micro, rising, star, legend, hero
`

async function updateUserTier(handle, tier) {
  const normalizedHandle = handle.toLowerCase().replace('@', '')
  
  // Try ProfileService format first (profile:handle)
  const profileId = `profile:${normalizedHandle}`
  let profile = await redis.json.get(profileId)
  let foundProfileId = profileId
  
  // If not found, try legacy format via username index
  if (!profile) {
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`)
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        try {
          profile = await redis.json.get(userId)
          if (profile) {
            foundProfileId = userId
            break
          }
        } catch (err) {
          // Skip invalid entries
        }
      }
    }
  }
  
  // If still not found, check ProfileService index
  if (!profile) {
    const profileIds = await redis.smembers(`idx:profile:handle:${normalizedHandle}`)
    if (profileIds && profileIds.length > 0) {
      for (const pid of profileIds) {
        try {
          profile = await redis.json.get(pid)
          if (profile) {
            foundProfileId = pid
            break
          }
        } catch (err) {
          // Skip invalid entries
        }
      }
    }
  }
  
  if (!profile) {
    return { success: false, message: `Profile not found for @${normalizedHandle}` }
  }
  
  const oldTier = profile.tier || 'micro'
  
  // Update profile tier
  await redis.json.set(foundProfileId, '$.tier', tier)
  
  // Update tier indexes
  await redis.srem(`idx:profile:tier:${oldTier}`, foundProfileId)
  await redis.sadd(`idx:profile:tier:${tier}`, foundProfileId)
  
  // If user has Discord connection, update that too
  if (profile.discordId) {
    const connectionKey = `engagement:connection:${profile.discordId}`
    const connection = await redis.json.get(connectionKey)
    if (connection) {
      await redis.json.set(connectionKey, '$.tier', tier)
    }
  }
  
  return { 
    success: true, 
    message: `Updated @${normalizedHandle}: ${oldTier} → ${tier}`,
    discordUpdated: !!profile.discordId
  }
}

async function processBulkUpdate() {
  console.log(TIER_EXAMPLES)
  console.log('\nPaste your tier assignments (one per line)')
  console.log('Format: @handle tier')
  console.log('Type "done" when finished:\n')
  
  const updates = []
  
  const processLine = (line) => {
    return new Promise((resolve) => {
      rl.question('> ', (input) => {
        if (input.toLowerCase() === 'done') {
          resolve(null)
        } else {
          const parts = input.trim().split(/\s+/)
          if (parts.length === 2) {
            const [handle, tier] = parts
            const validTiers = ['micro', 'rising', 'star', 'legend', 'hero']
            if (validTiers.includes(tier.toLowerCase())) {
              updates.push({ handle, tier: tier.toLowerCase() })
              console.log(`  ✓ Queued: ${handle} → ${tier}`)
            } else {
              console.log(`  ❌ Invalid tier: ${tier}`)
            }
          } else if (input.trim()) {
            console.log(`  ❌ Invalid format. Use: @handle tier`)
          }
          resolve(true)
        }
      })
    })
  }
  
  // Collect updates
  let continue_ = true
  while (continue_) {
    continue_ = await processLine()
  }
  
  if (updates.length === 0) {
    console.log('\nNo updates to process.')
    rl.close()
    return
  }
  
  console.log(`\n\nProcessing ${updates.length} tier updates...`)
  console.log('='.repeat(60))
  
  let successCount = 0
  let failCount = 0
  let discordUpdateCount = 0
  
  for (const update of updates) {
    const result = await updateUserTier(update.handle, update.tier)
    if (result.success) {
      console.log(`✅ ${result.message}`)
      successCount++
      if (result.discordUpdated) discordUpdateCount++
    } else {
      console.log(`❌ ${result.message}`)
      failCount++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY:')
  console.log(`  • Successful updates: ${successCount}`)
  console.log(`  • Failed updates: ${failCount}`)
  console.log(`  • Discord connections updated: ${discordUpdateCount}`)
  
  if (successCount > 0) {
    console.log('\n✅ Users will see their new tiers immediately in Discord!')
  }
  
  rl.close()
}

async function interactiveMode() {
  const choice = await new Promise((resolve) => {
    rl.question(`Choose an option:
1. Update single user
2. Bulk update multiple users
3. Show current user tiers
4. Exit

Your choice (1-4): `, resolve)
  })
  
  switch (choice) {
    case '1':
      const handle = await new Promise((resolve) => {
        rl.question('\nEnter Twitter handle (e.g., @username): ', resolve)
      })
      const tier = await new Promise((resolve) => {
        rl.question('Enter tier (micro/rising/star/legend/hero): ', resolve)
      })
      
      const validTiers = ['micro', 'rising', 'star', 'legend', 'hero']
      if (!validTiers.includes(tier.toLowerCase())) {
        console.log('❌ Invalid tier')
        rl.close()
        return
      }
      
      const result = await updateUserTier(handle, tier.toLowerCase())
      console.log(result.success ? `\n✅ ${result.message}` : `\n❌ ${result.message}`)
      
      if (result.discordUpdated) {
        console.log('   Discord connection also updated!')
      }
      
      rl.close()
      break
      
    case '2':
      await processBulkUpdate()
      break
      
    case '3':
      console.log('\nFetching user tiers...\n')
      
      // Get all connections to show current tiers
      let cursor = 0
      const tierCounts = {}
      const users = []
      
      do {
        const result = await redis.scan(cursor, {
          match: 'engagement:connection:*',
          count: 100
        })
        
        cursor = result[0]
        const connectionKeys = result[1]
        
        for (const key of connectionKeys) {
          const connection = await redis.json.get(key)
          if (connection) {
            const tier = connection.tier || 'micro'
            tierCounts[tier] = (tierCounts[tier] || 0) + 1
            users.push({
              handle: connection.twitterHandle,
              tier: tier,
              points: connection.totalPoints || 0
            })
          }
        }
      } while (cursor !== 0)
      
      // Sort by tier then points
      const tierOrder = { hero: 5, legend: 4, star: 3, rising: 2, micro: 1 }
      users.sort((a, b) => {
        const tierDiff = tierOrder[b.tier] - tierOrder[a.tier]
        if (tierDiff !== 0) return tierDiff
        return b.points - a.points
      })
      
      console.log('TIER DISTRIBUTION:')
      console.log('='.repeat(40))
      Object.entries(tierCounts).forEach(([tier, count]) => {
        console.log(`${tier.toUpperCase().padEnd(10)} ${count} users`)
      })
      
      console.log('\nTOP USERS BY TIER:')
      console.log('='.repeat(60))
      
      // Show top 5 from each tier
      const tiers = ['hero', 'legend', 'star', 'rising', 'micro']
      for (const tier of tiers) {
        const tierUsers = users.filter(u => u.tier === tier).slice(0, 5)
        if (tierUsers.length > 0) {
          console.log(`\n${tier.toUpperCase()}:`)
          tierUsers.forEach(u => {
            console.log(`  @${u.handle.padEnd(20)} ${u.points} pts`)
          })
        }
      }
      
      rl.close()
      break
      
    case '4':
      console.log('Goodbye!')
      rl.close()
      break
      
    default:
      console.log('Invalid choice')
      rl.close()
  }
}

// Run interactive mode
interactiveMode().catch((error) => {
  console.error('Error:', error)
  rl.close()
  process.exit(1)
}) 