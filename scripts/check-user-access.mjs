#!/usr/bin/env node

import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function checkUserAccess(handle) {
  try {
    console.log(`\n🔍 Checking access for user: ${handle}\n`)

    // Normalize handle
    const normalized = handle.toLowerCase().replace('@', '')
    console.log(`Normalized handle: ${normalized}`)

    // Get user IDs from index
    const userIds = await redis.smembers(`idx:username:${normalized}`)
    if (!userIds || userIds.length === 0) {
      console.log('❌ User not found in index')
      return
    }

    console.log(`Found ${userIds.length} user ID(s):`, userIds)

    // Check each user profile
    for (const userId of userIds) {
      console.log(`\n📋 Profile ${userId}:`)
      
      const profile = await redis.json.get(`user:${userId}`)
      if (!profile) {
        console.log('  ❌ Profile not found')
        continue
      }

      console.log('  Username:', profile.username)
      console.log('  Twitter Handle:', profile.twitterHandle)
      console.log('  Role:', profile.role || 'none')
      console.log('  Approval Status:', profile.approvalStatus)
      console.log('  Created:', profile.createdAt)
      console.log('  Updated:', profile.updatedAt)
      
      // Check team memberships
      const allCampaigns = await redis.smembers('campaigns:all')
      const teamMemberships = []
      
      for (const campaignId of allCampaigns) {
        const campaign = await redis.json.get(campaignId)
        if (campaign && campaign[0]) {
          const campaignData = campaign[0]
          if (campaignData.teamMembers && campaignData.teamMembers.includes(normalized)) {
            teamMemberships.push({
              id: campaignId,
              name: campaignData.name,
              role: 'team member'
            })
          }
          if (campaignData.createdBy === normalized) {
            teamMemberships.push({
              id: campaignId,
              name: campaignData.name,
              role: 'creator'
            })
          }
        }
      }
      
      console.log(`\n  Campaign access (${teamMemberships.length} campaigns):`)
      for (const membership of teamMemberships) {
        console.log(`    - ${membership.name} (${membership.role})`)
      }
    }

    // Check if user has the correct role permissions
    console.log('\n📊 Access Summary:')
    console.log('- Profile exists:', userIds.length > 0 ? '✅' : '❌')
    
    const primaryProfile = userIds.length > 0 ? await redis.json.get(`user:${userIds[0]}`) : null
    if (primaryProfile) {
      const role = primaryProfile.role || 'none'
      console.log('- Current role:', role)
      console.log('- Approval status:', primaryProfile.approvalStatus)
      
      console.log('\n🔐 Expected access with role', role + ':')
      switch(role) {
        case 'admin':
          console.log('  ✅ Full access to all campaigns')
          console.log('  ✅ Can view analytics for all campaigns')
          console.log('  ✅ Can edit settings/brief for all campaigns')
          console.log('  ✅ Can add/edit/delete KOLs in all campaigns')
          break
        case 'core':
          console.log('  ✅ Full access to campaigns where they are team members')
          console.log('  ✅ Can view analytics for their campaigns')
          console.log('  ✅ Can edit settings/brief for their campaigns')
          console.log('  ✅ Can add/edit KOLs in their campaigns')
          console.log('  ❌ Cannot delete campaigns')
          break
        case 'team':
          console.log('  ✅ Can view campaigns where they are team members')
          console.log('  ✅ Can add/edit KOLs in their campaigns')
          console.log('  ✅ Can sync tweets in their campaigns')
          console.log('  ❌ Cannot edit settings/brief')
          console.log('  ❌ Cannot open KOL profiles')
          break
        case 'viewer':
          console.log('  ✅ Can view all campaigns')
          console.log('  ✅ Can view analytics only')
          console.log('  ❌ Cannot edit anything')
          break
        default:
          console.log('  ❌ No special access (only campaigns they created or are team members of)')
      }
    }

  } catch (error) {
    console.error('Error checking user access:', error)
  } finally {
    // Redis quit not needed with Upstash
  }
}

// Get handle from command line
const handle = process.argv[2]
if (!handle) {
  console.log('Usage: npm run check:user-access <handle>')
  process.exit(1)
}

checkUserAccess(handle) 