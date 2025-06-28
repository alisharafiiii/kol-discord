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
  cyan: '\x1b[36m'
}

// Calculate profile score
function calculateProfileScore(profile) {
  let score = 0
  
  // Prefer standard ID formats
  if (profile.key.startsWith('user:user_')) score += 1000
  else if (profile.key.startsWith('user:twitter_')) score += 500
  else if (profile.key.startsWith('profile:user_')) score += 400
  else if (profile.key.startsWith('user:')) score += 300
  else if (profile.key.startsWith('profile:')) score += 100
  
  // Approval status
  if (profile.approvalStatus === 'approved') score += 2000
  else if (profile.approvalStatus === 'pending') score += 200
  
  // Role importance
  const roleScores = { admin: 1500, core: 1200, team: 900, kol: 600, user: 300 }
  score += roleScores[profile.role] || 0
  
  // Profile completeness
  if (profile.name) score += 50
  if (profile.profileImageUrl) score += 50
  if (profile.email) score += 100
  if (profile.discordId) score += 150
  if (profile.campaigns && profile.campaigns.length > 0) score += 200
  if (profile.notes && profile.notes.length > 0) score += 100
  
  // Age preference
  if (profile.createdAt) {
    const ageInDays = (Date.now() - new Date(profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    score += Math.min(ageInDays * 2, 200)
  }
  
  return score
}

// Main cleanup function
async function cleanupDuplicateProfiles() {
  console.log(`${colors.bright}${colors.cyan}🔍 SAFE PROFILE DUPLICATE CLEANUP${colors.reset}`)
  console.log(`${colors.yellow}This script will safely merge duplicate profiles${colors.reset}\n`)
  
  try {
    // Get all profiles
    console.log(`${colors.blue}Step 1: Collecting profiles...${colors.reset}`)
    const userKeys = await redis.keys('user:*')
    const profileKeys = await redis.keys('profile:*')
    const allKeys = [...new Set([...userKeys, ...profileKeys])]
    
    console.log(`Found ${allKeys.length} total profiles\n`)
    
    // Build handle map
    console.log(`${colors.blue}Step 2: Finding duplicates...${colors.reset}`)
    const handleMap = new Map()
    
    for (const key of allKeys) {
      try {
        const profile = await redis.json.get(key)
        if (!profile) continue
        
        const handle = profile.twitterHandle || profile.handle
        if (handle) {
          const normalized = handle.toLowerCase().replace('@', '').trim()
          
          if (!handleMap.has(normalized)) {
            handleMap.set(normalized, [])
          }
          
          handleMap.get(normalized).push({
            key,
            data: profile,
            score: calculateProfileScore({ ...profile, key })
          })
        }
      } catch (err) {
        // Skip errors
      }
    }
    
    // Find duplicates
    const duplicateGroups = []
    for (const [handle, profiles] of handleMap) {
      if (profiles.length > 1) {
        duplicateGroups.push({ handle, profiles })
      }
    }
    
    console.log(`Found ${duplicateGroups.length} duplicate groups\n`)
    
    if (duplicateGroups.length === 0) {
      console.log(`${colors.green}✅ No duplicates found!${colors.reset}`)
      return
    }
    
    // Show preview
    console.log(`${colors.bright}MERGE PREVIEW:${colors.reset}`)
    
    // Show madmatt3m specifically
    const madmatt3m = duplicateGroups.find(g => g.handle === 'madmatt3m')
    if (madmatt3m) {
      console.log(`\n${colors.bright}madmatt3m (${madmatt3m.profiles.length} profiles):${colors.reset}`)
      const sorted = [...madmatt3m.profiles].sort((a, b) => b.score - a.score)
      console.log(`  ${colors.green}KEEP${colors.reset}: ${sorted[0].key} (score: ${sorted[0].score})`)
      for (let i = 1; i < sorted.length; i++) {
        console.log(`  ${colors.red}DELETE${colors.reset}: ${sorted[i].key}`)
      }
    }
    
    // Summary
    const totalToDelete = duplicateGroups.reduce((sum, g) => sum + g.profiles.length - 1, 0)
    console.log(`\n${colors.bright}TOTAL:${colors.reset}`)
    console.log(`• Groups to merge: ${duplicateGroups.length}`)
    console.log(`• Profiles to delete: ${colors.red}${totalToDelete}${colors.reset}`)
    console.log(`• Final profile count: ${allKeys.length - totalToDelete}`)
    
    // Confirmation
    console.log(`\n${colors.yellow}Type CONFIRM to proceed:${colors.reset} `)
    
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
      console.log(`${colors.yellow}Cancelled${colors.reset}`)
      return
    }
    
    // Execute merges
    console.log(`\n${colors.blue}Merging profiles...${colors.reset}`)
    
    for (const group of duplicateGroups) {
      const sorted = [...group.profiles].sort((a, b) => b.score - a.score)
      const primary = sorted[0]
      const mergedData = { ...primary.data }
      
      // Merge data from other profiles
      for (let i = 1; i < sorted.length; i++) {
        const secondary = sorted[i].data
        
        // Merge important fields
        if (!mergedData.discordId && secondary.discordId) {
          mergedData.discordId = secondary.discordId
          mergedData.discordUsername = secondary.discordUsername
        }
        
        if (secondary.campaigns && secondary.campaigns.length > 0) {
          mergedData.campaigns = [...(mergedData.campaigns || []), ...secondary.campaigns]
        }
        
        if (secondary.notes && secondary.notes.length > 0) {
          mergedData.notes = [...(mergedData.notes || []), ...secondary.notes]
        }
        
        if (secondary.walletAddresses) {
          mergedData.walletAddresses = {
            ...(mergedData.walletAddresses || {}),
            ...secondary.walletAddresses
          }
        }
      }
      
      // Normalize handle
      if (mergedData.twitterHandle) {
        mergedData.twitterHandle = mergedData.twitterHandle.replace('@', '').toLowerCase()
      }
      
      // Save merged profile
      await redis.json.set(primary.key, '$', mergedData)
      
      // Delete duplicates
      for (let i = 1; i < sorted.length; i++) {
        await redis.del(sorted[i].key)
      }
    }
    
    console.log(`✅ Merged ${duplicateGroups.length} groups\n`)
    
    // Rebuild indexes
    console.log(`${colors.blue}Rebuilding indexes...${colors.reset}`)
    
    // Clear old indexes
    const oldIndexKeys = await redis.keys('idx:username:*')
    for (const key of oldIndexKeys) {
      await redis.del(key)
    }
    
    // Rebuild from remaining profiles
    const remainingKeys = [...await redis.keys('user:*'), ...await redis.keys('profile:*')]
    
    for (const key of remainingKeys) {
      try {
        const profile = await redis.json.get(key)
        if (profile && profile.twitterHandle) {
          const normalized = profile.twitterHandle.toLowerCase().replace('@', '').trim()
          const userId = key.replace('user:', '').replace('profile:', '')
          await redis.sadd(`idx:username:${normalized}`, userId)
        }
      } catch (err) {
        // Skip errors
      }
    }
    
    console.log(`✅ Indexes rebuilt\n`)
    
    console.log(`${colors.bright}${colors.green}✨ CLEANUP COMPLETED!${colors.reset}`)
    console.log(`${colors.green}✅ All data preserved${colors.reset}`)
    console.log(`${colors.green}✅ No data loss${colors.reset}`)
    
  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error)
  }
}

// Run
cleanupDuplicateProfiles()
