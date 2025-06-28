#!/usr/bin/env node
import { Redis } from '@upstash/redis'
import { config } from 'dotenv'

config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function analyzeProfileDuplicates() {
  console.log('🔍 PROFILE DUPLICATION ANALYSIS\n')
  console.log('This script will analyze profile duplicates WITHOUT making any changes.\n')
  
  try {
    // Step 1: Get all user profile keys
    console.log('Step 1: Collecting all profile keys...')
    const userKeys = await redis.keys('user:*')
    const profileKeys = await redis.keys('profile:*')
    const allKeys = [...new Set([...userKeys, ...profileKeys])]
    
    console.log(`Found ${userKeys.length} user:* keys`)
    console.log(`Found ${profileKeys.length} profile:* keys`)
    console.log(`Total unique keys: ${allKeys.length}\n`)
    
    // Step 2: Build handle map
    console.log('Step 2: Analyzing profiles by Twitter handle...')
    const handleMap = new Map() // normalized handle -> array of profiles
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
            profile: {
              id: profile.id,
              name: profile.name,
              handle: handle,
              role: profile.role,
              status: profile.approvalStatus,
              created: profile.createdAt,
              updated: profile.updatedAt,
              discordId: profile.discordId,
              hasImage: !!profile.profileImageUrl
            }
          })
        } else {
          noHandleProfiles.push({ key, profile })
        }
      } catch (err) {
        errors.push({ key, error: err.message })
      }
    }
    
    console.log(`✅ Analyzed ${handleMap.size} unique Twitter handles`)
    console.log(`⚠️  ${noHandleProfiles.length} profiles without Twitter handles`)
    console.log(`❌ ${errors.length} profiles with errors\n`)
    
    // Step 3: Find duplicates
    console.log('Step 3: Identifying duplicates...')
    const duplicates = []
    const recentDuplicates = [] // Created in last 24 hours
    const caseSensitiveDuplicates = []
    
    for (const [normalized, profiles] of handleMap) {
      if (profiles.length > 1) {
        // Check if it's a case sensitivity issue
        const uniqueHandles = new Set(profiles.map(p => p.profile.handle))
        const isCaseSensitive = uniqueHandles.size > 1
        
        // Check for recent duplicates
        const now = Date.now()
        const hasRecent = profiles.some(p => {
          if (!p.profile.created) return false
          const created = new Date(p.profile.created).getTime()
          return (now - created) < 24 * 60 * 60 * 1000
        })
        
        const dupInfo = {
          normalized,
          count: profiles.length,
          profiles: profiles.sort((a, b) => {
            // Sort by creation date (oldest first)
            const aTime = a.profile.created ? new Date(a.profile.created).getTime() : 0
            const bTime = b.profile.created ? new Date(b.profile.created).getTime() : 0
            return aTime - bTime
          })
        }
        
        duplicates.push(dupInfo)
        if (isCaseSensitive) caseSensitiveDuplicates.push(dupInfo)
        if (hasRecent) recentDuplicates.push(dupInfo)
      }
    }
    
    console.log(`Found ${duplicates.length} handles with duplicates\n`)
    
    // Step 4: Detailed duplicate report
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('DUPLICATE PROFILES REPORT')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    // Show recent duplicates first (most concerning)
    if (recentDuplicates.length > 0) {
      console.log('🚨 RECENT DUPLICATES (Created in last 24 hours):')
      console.log('These might indicate an active duplication bug!\n')
      
      for (const dup of recentDuplicates) {
        console.log(`Handle: ${dup.normalized} (${dup.count} profiles)`)
        for (const p of dup.profiles) {
          const age = p.profile.created ? 
            Math.floor((Date.now() - new Date(p.profile.created).getTime()) / (1000 * 60 * 60)) + ' hours ago' :
            'Unknown age'
          console.log(`  - ${p.key}`)
          console.log(`    Name: ${p.profile.name || 'No name'}`)
          console.log(`    Handle: ${p.profile.handle}`)
          console.log(`    Role: ${p.profile.role}, Status: ${p.profile.status}`)
          console.log(`    Created: ${age}`)
          if (p.profile.discordId) console.log(`    Discord: ${p.profile.discordId}`)
        }
        console.log('')
      }
    }
    
    // Show case-sensitive duplicates
    if (caseSensitiveDuplicates.length > 0) {
      console.log('⚠️  CASE-SENSITIVE DUPLICATES:')
      console.log('These are duplicates due to different letter casing\n')
      
      for (const dup of caseSensitiveDuplicates.slice(0, 5)) {
        const handles = [...new Set(dup.profiles.map(p => p.profile.handle))]
        console.log(`Handle variations: ${handles.join(', ')}`)
        console.log(`Keys: ${dup.profiles.map(p => p.key).join(', ')}\n`)
      }
      
      if (caseSensitiveDuplicates.length > 5) {
        console.log(`... and ${caseSensitiveDuplicates.length - 5} more case-sensitive duplicates\n`)
      }
    }
    
    // Step 5: Check indexes
    console.log('Step 5: Checking username indexes...')
    let indexIssues = 0
    
    for (const [normalized, profiles] of handleMap) {
      const indexEntries = await redis.smembers(`idx:username:${normalized}`)
      
      if (indexEntries.length !== profiles.length) {
        indexIssues++
        if (indexIssues <= 5) {
          console.log(`Index mismatch for ${normalized}:`)
          console.log(`  Profiles found: ${profiles.length}`)
          console.log(`  Index entries: ${indexEntries.length}`)
          console.log(`  Index values: ${indexEntries.join(', ')}`)
          console.log(`  Profile keys: ${profiles.map(p => p.key).join(', ')}\n`)
        }
      }
    }
    
    if (indexIssues > 5) {
      console.log(`... and ${indexIssues - 5} more index mismatches\n`)
    }
    
    // Step 6: Pattern analysis
    console.log('Step 6: Analyzing ID patterns...')
    const idPatterns = {}
    
    for (const key of allKeys) {
      const pattern = key.replace(/:[^:]+$/, ':*')
      idPatterns[pattern] = (idPatterns[pattern] || 0) + 1
    }
    
    console.log('Profile ID patterns found:')
    for (const [pattern, count] of Object.entries(idPatterns).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${pattern}: ${count} profiles`)
    }
    
    // Step 7: Summary and recommendations
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    
    console.log(`Total profiles analyzed: ${allKeys.length}`)
    console.log(`Unique Twitter handles: ${handleMap.size}`)
    console.log(`Handles with duplicates: ${duplicates.length}`)
    console.log(`Total duplicate profiles: ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)}`)
    console.log(`Recent duplicates (24h): ${recentDuplicates.length}`)
    console.log(`Case-sensitive duplicates: ${caseSensitiveDuplicates.length}`)
    console.log(`Index mismatches: ${indexIssues}\n`)
    
    console.log('ROOT CAUSES IDENTIFIED:')
    console.log('1. Case sensitivity - handles with different casing create duplicates')
    console.log('2. Multiple ID formats - user:*, profile:*, different prefixes')
    console.log('3. Index inconsistencies - indexes not matching actual profiles')
    
    if (recentDuplicates.length > 0) {
      console.log('\n🚨 ACTIVE DUPLICATION DETECTED!')
      console.log(`${recentDuplicates.length} duplicate profiles were created in the last 24 hours.`)
      console.log('This suggests an active bug in profile creation logic.')
    }
    
  } catch (error) {
    console.error('Error analyzing profiles:', error)
  }
}

analyzeProfileDuplicates() 