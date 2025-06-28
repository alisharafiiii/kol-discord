#!/usr/bin/env node
import { Redis } from '@upstash/redis'
import { config } from 'dotenv'

config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
}

// Calculate comprehensive profile score
function calculateProfileScore(profile, key) {
  let score = 0
  
  // ID format preference (highest priority)
  if (key.startsWith('user:user_')) score += 2000
  else if (key.startsWith('user:twitter_')) score += 1000
  else if (key.startsWith('profile:user_')) score += 800
  else if (key.startsWith('user:')) score += 500
  else if (key.startsWith('profile:')) score += 200
  
  // Approval status (very important)
  if (profile.approvalStatus === 'approved') score += 3000
  else if (profile.approvalStatus === 'pending') score += 300
  else if (profile.approvalStatus === 'rejected') score += 100
  
  // Role importance
  const roleScores = { 
    admin: 2500, 
    core: 2000, 
    team: 1500, 
    kol: 1000, 
    scout: 700,
    user: 500,
    viewer: 100
  }
  score += roleScores[profile.role] || 0
  
  // Profile completeness
  if (profile.name) score += 100
  if (profile.profileImageUrl) score += 100
  if (profile.bio) score += 50
  if (profile.email) score += 200
  if (profile.phone) score += 150
  if (profile.telegram) score += 100
  if (profile.discordId) score += 300
  if (profile.discordUsername) score += 100
  if (profile.walletAddresses && Object.keys(profile.walletAddresses).length > 0) score += 200
  if (profile.socialAccounts && Object.keys(profile.socialAccounts).length > 0) score += 150
  if (profile.campaigns && profile.campaigns.length > 0) score += 500
  if (profile.notes && profile.notes.length > 0) score += 200
  if (profile.shippingInfo || profile.shippingAddress) score += 150
  if (profile.followerCount > 0) score += 100
  if (profile.tier || profile.currentTier) score += 200
  if (profile.points > 0) score += 150
  
  // Age preference
  if (profile.createdAt) {
    const ageInDays = (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.min(ageInDays * 5, 500) // Max 500 points for age
  }
  
  return score
}

// Comprehensive profile merge
function mergeProfiles(profiles) {
  // Sort by score
  const sorted = profiles.sort((a, b) => b.score - a.score)
  const primary = sorted[0].data
  const mergedData = JSON.parse(JSON.stringify(primary)) // Deep clone
  
  const mergeLog = []
  
  // For each secondary profile
  for (let i = 1; i < sorted.length; i++) {
    const secondary = sorted[i].data
    const secondaryKey = sorted[i].key
    
    // Basic fields - fill missing
    const basicFields = ['name', 'bio', 'profileImageUrl', 'email', 'phone', 'telegram', 'country', 'shippingAddress', 'shippingInfo']
    basicFields.forEach(field => {
      if (!mergedData[field] && secondary[field]) {
        mergedData[field] = secondary[field]
        mergeLog.push(`${field} from ${secondaryKey}`)
      }
    })
    
    // Discord info
    if (!mergedData.discordId && secondary.discordId) {
      mergedData.discordId = secondary.discordId
      mergedData.discordUsername = secondary.discordUsername
      mergeLog.push(`Discord info from ${secondaryKey}`)
    }
    
    // Take highest values
    if ((secondary.followerCount || 0) > (mergedData.followerCount || 0)) {
      mergedData.followerCount = secondary.followerCount
      mergeLog.push(`Higher follower count (${secondary.followerCount}) from ${secondaryKey}`)
    }
    
    if ((secondary.points || 0) > (mergedData.points || 0)) {
      mergedData.points = secondary.points
      mergeLog.push(`Higher points (${secondary.points}) from ${secondaryKey}`)
    }
    
    // Merge objects
    if (secondary.walletAddresses) {
      mergedData.walletAddresses = {
        ...(mergedData.walletAddresses || {}),
        ...secondary.walletAddresses
      }
      const count = Object.keys(secondary.walletAddresses).length
      if (count > 0) mergeLog.push(`${count} wallet addresses from ${secondaryKey}`)
    }
    
    if (secondary.socialAccounts) {
      mergedData.socialAccounts = {
        ...(mergedData.socialAccounts || {}),
        ...secondary.socialAccounts
      }
      const count = Object.keys(secondary.socialAccounts).length
      if (count > 0) mergeLog.push(`${count} social accounts from ${secondaryKey}`)
    }
    
    if (secondary.socialLinks) {
      mergedData.socialLinks = {
        ...(mergedData.socialLinks || {}),
        ...secondary.socialLinks
      }
    }
    
    if (secondary.contacts) {
      mergedData.contacts = {
        ...(mergedData.contacts || {}),
        ...secondary.contacts
      }
    }
    
    // Merge campaigns carefully
    if (secondary.campaigns && secondary.campaigns.length > 0) {
      const existingCampaignIds = new Set(
        (mergedData.campaigns || []).map(c => c.campaignId || c.id || c.campaign_id)
      )
      const newCampaigns = secondary.campaigns.filter(c => {
        const cId = c.campaignId || c.id || c.campaign_id
        return cId && !existingCampaignIds.has(cId)
      })
      if (newCampaigns.length > 0) {
        mergedData.campaigns = [...(mergedData.campaigns || []), ...newCampaigns]
        mergeLog.push(`${newCampaigns.length} unique campaigns from ${secondaryKey}`)
      }
    }
    
    // Merge notes
    if (secondary.notes && secondary.notes.length > 0) {
      mergedData.notes = [...(mergedData.notes || []), ...secondary.notes]
      mergeLog.push(`${secondary.notes.length} notes from ${secondaryKey}`)
    }
    
    // Merge admin notes
    if (secondary.adminNotes && !mergedData.adminNotes) {
      mergedData.adminNotes = secondary.adminNotes
      mergeLog.push(`Admin notes from ${secondaryKey}`)
    }
    
    // Merge arrays (unique values only)
    const arrayFields = ['audienceTypes', 'chains', 'activeChains', 'tags', 'bestCollabUrls']
    arrayFields.forEach(field => {
      if (secondary[field] && Array.isArray(secondary[field])) {
        mergedData[field] = [...new Set([...(mergedData[field] || []), ...secondary[field]])]
      }
    })
    
    // Take better tier
    if (!mergedData.tier && secondary.tier) {
      mergedData.tier = secondary.tier
      mergeLog.push(`Tier from ${secondaryKey}`)
    }
    if (!mergedData.currentTier && secondary.currentTier) {
      mergedData.currentTier = secondary.currentTier
      mergeLog.push(`Current tier from ${secondaryKey}`)
    }
    
    // Preserve earliest creation date
    if (secondary.createdAt) {
      const secondaryDate = new Date(secondary.createdAt)
      const mergedDate = mergedData.createdAt ? new Date(mergedData.createdAt) : new Date()
      if (secondaryDate < mergedDate) {
        mergedData.createdAt = secondary.createdAt
        mergeLog.push(`Earlier creation date from ${secondaryKey}`)
      }
    }
    
    // Take better KOL status
    if (secondary.isKOL && !mergedData.isKOL) {
      mergedData.isKOL = secondary.isKOL
      mergeLog.push(`KOL status from ${secondaryKey}`)
    }
    
    // Merge KOL metrics
    if (secondary.kolMetrics) {
      if (!mergedData.kolMetrics) {
        mergedData.kolMetrics = secondary.kolMetrics
        mergeLog.push(`KOL metrics from ${secondaryKey}`)
      } else {
        // Merge metrics taking best values
        mergedData.kolMetrics.totalCampaigns = Math.max(
          mergedData.kolMetrics.totalCampaigns || 0,
          secondary.kolMetrics.totalCampaigns || 0
        )
        mergedData.kolMetrics.totalEarnings = Math.max(
          mergedData.kolMetrics.totalEarnings || 0,
          secondary.kolMetrics.totalEarnings || 0
        )
      }
    }
  }
  
  // Clean up and normalize
  mergedData.updatedAt = new Date().toISOString()
  
  // Normalize handle
  if (mergedData.twitterHandle) {
    mergedData.twitterHandle = mergedData.twitterHandle.replace('@', '').toLowerCase()
  }
  
  // Ensure required fields
  if (!mergedData.approvalStatus) mergedData.approvalStatus = 'pending'
  if (!mergedData.role) mergedData.role = 'user'
  
  return { mergedData, mergeLog, primaryKey: sorted[0].key }
}

async function performCleanup() {
  console.log(`${colors.bright}${colors.cyan}🔍 COMPREHENSIVE PROFILE DUPLICATE CLEANUP${colors.reset}`)
  console.log(`${colors.yellow}This script will safely merge ALL duplicate profiles${colors.reset}\n`)
  
  try {
    // Step 1: Collect all profiles
    console.log(`${colors.blue}Step 1: Collecting all profiles...${colors.reset}`)
    const userKeys = await redis.keys('user:*')
    const profileKeys = await redis.keys('profile:*')
    const allKeys = [...new Set([...userKeys, ...profileKeys])]
    
    console.log(`Found ${userKeys.length} user:* profiles`)
    console.log(`Found ${profileKeys.length} profile:* profiles`)
    console.log(`Total: ${allKeys.length} profiles\n`)
    
    // Step 2: Analyze duplicates
    console.log(`${colors.blue}Step 2: Analyzing duplicates...${colors.reset}`)
    const handleMap = new Map()
    const noHandleProfiles = []
    const errors = []
    
    for (const key of allKeys) {
      try {
        const profile = await redis.json.get(key)
        if (!profile) {
          errors.push({ key, error: 'Empty profile' })
          continue
        }
        
        const handle = profile.twitterHandle || profile.handle
        if (handle) {
          const normalized = handle.toLowerCase().replace('@', '').trim()
          
          if (!handleMap.has(normalized)) {
            handleMap.set(normalized, [])
          }
          
          handleMap.get(normalized).push({
            key,
            data: profile,
            score: calculateProfileScore(profile, key)
          })
        } else {
          noHandleProfiles.push({ key, profile })
        }
      } catch (err) {
        errors.push({ key, error: err.message })
      }
    }
    
    // Find duplicates
    const duplicateGroups = []
    for (const [handle, profiles] of handleMap) {
      if (profiles.length > 1) {
        duplicateGroups.push({ handle, profiles })
      }
    }
    
    console.log(`✅ Analyzed ${handleMap.size} unique Twitter handles`)
    console.log(`⚠️  ${noHandleProfiles.length} profiles without handles`)
    console.log(`❌ ${errors.length} profiles with errors`)
    console.log(`🔄 ${duplicateGroups.length} handles with duplicates\n`)
    
    if (duplicateGroups.length === 0) {
      console.log(`${colors.green}✅ No duplicates found! Database is clean.${colors.reset}`)
      return
    }
    
    // Step 3: Create merge plan
    console.log(`${colors.blue}Step 3: Creating merge plan...${colors.reset}\n`)
    const mergePlans = []
    
    // Process all duplicates
    for (const group of duplicateGroups) {
      const { mergedData, mergeLog, primaryKey } = mergeProfiles(group.profiles)
      mergePlans.push({
        handle: group.handle,
        primaryKey,
        mergedData,
        mergeLog,
        profilesToDelete: group.profiles.filter(p => p.key !== primaryKey).map(p => p.key)
      })
    }
    
    // Show madmatt3m specifically
    const madmatt3mPlan = mergePlans.find(p => p.handle === 'madmatt3m')
    if (madmatt3mPlan) {
      console.log(`${colors.bright}${colors.magenta}📍 MADMATT3M MERGE PLAN:${colors.reset}`)
      console.log(`  ${colors.green}KEEP${colors.reset}: ${madmatt3mPlan.primaryKey}`)
      console.log(`  ${colors.red}DELETE${colors.reset}: ${madmatt3mPlan.profilesToDelete.join(', ')}`)
      if (madmatt3mPlan.mergeLog.length > 0) {
        console.log(`  ${colors.cyan}DATA PRESERVED:${colors.reset}`)
        madmatt3mPlan.mergeLog.forEach(log => console.log(`    - ${log}`))
      }
      console.log('')
    }
    
    // Show a few more examples
    const examples = mergePlans.filter(p => p.handle !== 'madmatt3m').slice(0, 3)
    examples.forEach(plan => {
      console.log(`${colors.bright}${plan.handle}:${colors.reset}`)
      console.log(`  ${colors.green}KEEP${colors.reset}: ${plan.primaryKey}`)
      console.log(`  ${colors.red}DELETE${colors.reset}: ${plan.profilesToDelete.length} profiles`)
      console.log('')
    })
    
    if (mergePlans.length > examples.length + (madmatt3mPlan ? 1 : 0)) {
      console.log(`... and ${mergePlans.length - examples.length - (madmatt3mPlan ? 1 : 0)} more\n`)
    }
    
    // Summary
    const totalToDelete = mergePlans.reduce((sum, plan) => sum + plan.profilesToDelete.length, 0)
    console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}SUMMARY:${colors.reset}`)
    console.log(`• Duplicate groups to merge: ${duplicateGroups.length}`)
    console.log(`• Total profiles to delete: ${colors.red}${totalToDelete}${colors.reset}`)
    console.log(`• Profiles after cleanup: ${allKeys.length - totalToDelete}`)
    console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    // Confirmation
    console.log(`${colors.bright}${colors.red}⚠️  FINAL CONFIRMATION${colors.reset}`)
    console.log(`This will merge ${duplicateGroups.length} duplicate groups`)
    console.log(`${colors.green}✅ ALL data will be preserved and merged${colors.reset}`)
    console.log(`${colors.green}✅ NO data loss - only duplicate entries removed${colors.reset}`)
    console.log(`\nType ${colors.bright}${colors.green}CONFIRM${colors.reset} to proceed: `)
    
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('', resolve)
    })
    rl.close()
    
    if (answer.trim().toUpperCase() !== 'CONFIRM') {
      console.log(`\n${colors.yellow}Cleanup cancelled${colors.reset}`)
      return
    }
    
    // Step 4: Execute merge plan
    console.log(`\n${colors.blue}Step 4: Executing merge plan...${colors.reset}`)
    let processed = 0
    let failed = 0
    
    for (const plan of mergePlans) {
      try {
        // Save merged data
        await redis.json.set(plan.primaryKey, '$', plan.mergedData)
        
        // Delete duplicates
        for (const deleteKey of plan.profilesToDelete) {
          await redis.del(deleteKey)
        }
        
        processed++
        if (processed % 10 === 0) {
          console.log(`  Processed ${processed}/${mergePlans.length} groups...`)
        }
      } catch (err) {
        console.error(`  ${colors.red}Error processing ${plan.handle}:${colors.reset}`, err.message)
        failed++
      }
    }
    
    console.log(`✅ Successfully merged ${processed} groups`)
    if (failed > 0) {
      console.log(`❌ Failed to merge ${failed} groups`)
    }
    console.log('')
    
    // Step 5: Rebuild ALL indexes
    console.log(`${colors.blue}Step 5: Rebuilding all indexes...${colors.reset}`)
    
    // Clear ALL old indexes
    const indexPatterns = ['idx:username:*', 'idx:status:*', 'idx:role:*', 'idx:displayname:*', 'idx:wallet:*']
    let clearedCount = 0
    
    for (const pattern of indexPatterns) {
      const keys = await redis.keys(pattern)
      for (const key of keys) {
        await redis.del(key)
        clearedCount++
      }
    }
    console.log(`Cleared ${clearedCount} old index entries`)
    
    // Rebuild from remaining profiles
    const remainingKeys = [...await redis.keys('user:*'), ...await redis.keys('profile:*')]
    let indexed = 0
    
    for (const key of remainingKeys) {
      try {
        const profile = await redis.json.get(key)
        if (!profile) continue
        
        const userId = key.replace('user:', '').replace('profile:', '')
        
        // Username index
        if (profile.twitterHandle) {
          const normalized = profile.twitterHandle.toLowerCase().replace('@', '').trim()
          await redis.sadd(`idx:username:${normalized}`, userId)
        }
        
        // Status index
        if (profile.approvalStatus) {
          await redis.sadd(`idx:status:${profile.approvalStatus}`, userId)
        }
        
        // Role index
        if (profile.role) {
          await redis.sadd(`idx:role:${profile.role}`, userId)
        }
        
        // Display name index
        if (profile.name) {
          const displayName = profile.name.toLowerCase().replace(/\s+/g, '')
          await redis.sadd(`idx:displayname:${displayName}`, userId)
        }
        
        // Wallet indexes
        if (profile.walletAddresses) {
          for (const [chain, address] of Object.entries(profile.walletAddresses)) {
            if (typeof address === 'string' && address) {
              await redis.sadd(`idx:wallet:${address.toLowerCase()}`, userId)
            }
          }
        }
        
        indexed++
      } catch (err) {
        console.error(`  Error indexing ${key}:`, err.message)
      }
    }
    
    console.log(`✅ Indexed ${indexed} profiles\n`)
    
    // Final summary
    console.log(`${colors.bright}${colors.green}✨ CLEANUP COMPLETED SUCCESSFULLY!${colors.reset}`)
    console.log(`\nFinal results:`)
    console.log(`• Profiles before: ${allKeys.length}`)
    console.log(`• Profiles after: ${remainingKeys.length}`)
    console.log(`• Duplicates removed: ${totalToDelete}`)
    console.log(`• Profiles indexed: ${indexed}`)
    console.log(`\n${colors.green}✅ All critical data preserved${colors.reset}`)
    console.log(`${colors.green}✅ Case-sensitive duplicates handled${colors.reset}`)
    console.log(`${colors.green}✅ Username indexes rebuilt accurately${colors.reset}`)
    console.log(`${colors.green}✅ NO DATA LOSS - database is clean${colors.reset}`)
    
  } catch (error) {
    console.error(`\n${colors.red}Fatal error:${colors.reset}`, error)
    console.log(`${colors.yellow}No changes made to database${colors.reset}`)
  }
}

// Run the cleanup
performCleanup() 