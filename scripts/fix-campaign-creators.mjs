#!/usr/bin/env node

import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// Mapping of incorrect names to correct handles
const creatorMappings = {
  'nabu.base.eth': 'sharafi_eth',
  // Add more mappings if needed
}

async function fixCampaignCreators() {
  try {
    console.log('\n🔧 Fixing campaign creators...\n')

    // Get all campaigns
    const allCampaigns = await redis.smembers('campaigns:all')
    let fixedCount = 0
    
    for (const campaignId of allCampaigns) {
      const campaign = await redis.json.get(campaignId)
      if (!campaign) continue
      
      const currentCreator = campaign.createdBy
      
      // Check if this creator needs to be fixed
      if (creatorMappings[currentCreator]) {
        const correctHandle = creatorMappings[currentCreator]
        
        console.log(`📋 Campaign: ${campaign.name} (${campaignId})`)
        console.log(`   Current creator: ${currentCreator}`)
        console.log(`   Fixing to: ${correctHandle}`)
        
        // Update the campaign
        campaign.createdBy = correctHandle
        campaign.updatedAt = new Date().toISOString()
        
        await redis.json.set(campaignId, '$', campaign)
        console.log(`   ✅ Fixed!\n`)
        
        fixedCount++
      }
    }
    
    console.log(`\n✅ Fixed ${fixedCount} campaign(s)`)
    
    // Show final summary
    console.log('\n📊 Campaign creators after fix:')
    const creatorCount = {}
    
    for (const campaignId of allCampaigns) {
      const campaign = await redis.json.get(campaignId)
      if (!campaign) continue
      
      const creator = campaign.createdBy || 'unknown'
      creatorCount[creator] = (creatorCount[creator] || 0) + 1
    }
    
    Object.entries(creatorCount).forEach(([creator, count]) => {
      console.log(`   ${creator}: ${count} campaign(s)`)
    })
    
  } catch (error) {
    console.error('Error fixing campaign creators:', error)
  }
}

// Run the fix
fixCampaignCreators() 