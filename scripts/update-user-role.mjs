#!/usr/bin/env node

import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function updateUserRole(handle, role) {
  try {
    console.log(`\n🔧 Updating role for user: ${handle} to ${role}\n`)

    // Normalize handle
    const normalized = handle.toLowerCase().replace('@', '')
    
    // Get user IDs from index
    const userIds = await redis.smembers(`idx:username:${normalized}`)
    if (!userIds || userIds.length === 0) {
      console.log('❌ User not found in index')
      return
    }

    console.log(`Found ${userIds.length} user ID(s):`, userIds)

    // Update each user profile
    for (const userId of userIds) {
      const profile = await redis.json.get(`user:${userId}`)
      if (!profile) {
        console.log(`  ❌ Profile ${userId} not found`)
        continue
      }

      console.log(`\n📋 Updating profile ${userId}:`)
      console.log('  Current role:', profile.role || 'none')
      console.log('  Current approval:', profile.approvalStatus)
      
      // Update the entire profile with new values
      const updatedData = {
        ...profile,
        role: role,
        approvalStatus: ['admin', 'core'].includes(role) ? 'approved' : profile.approvalStatus,
        updatedAt: new Date().toISOString()
      }
      
      await redis.json.set(`user:${userId}`, '$', updatedData)
      
      if (['admin', 'core'].includes(role) && profile.approvalStatus !== 'approved') {
        console.log('  ✅ Approval status updated to: approved')
      }
      
      console.log('  ✅ Role updated to:', role)
      
      // Verify update
      const updatedProfile = await redis.json.get(`user:${userId}`)
      console.log('\n  Updated profile:')
      console.log('    Role:', updatedProfile.role)
      console.log('    Approval:', updatedProfile.approvalStatus)
    }
    
    console.log('\n✅ Role update complete!')
    
  } catch (error) {
    console.error('Error updating user role:', error)
  }
}

// Get arguments from command line
const handle = process.argv[2]
const role = process.argv[3]

if (!handle || !role) {
  console.log('Usage: npm run update:user-role <handle> <role>')
  console.log('Roles: admin, core, team, viewer, user')
  process.exit(1)
}

const validRoles = ['admin', 'core', 'team', 'viewer', 'user']
if (!validRoles.includes(role)) {
  console.log(`❌ Invalid role: ${role}`)
  console.log('Valid roles:', validRoles.join(', '))
  process.exit(1)
}

updateUserRole(handle, role) 