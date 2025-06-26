#!/usr/bin/env node

import { Redis } from '@upstash/redis'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

async function checkAllCampaigns() {
  try {
    console.log(`\n📊 Checking all campaigns...\n`)

    // Get all campaigns
    const allCampaigns = await redis.smembers('campaigns:all')
    
    if (!allCampaigns || allCampaigns.length === 0) {
      console.log('❌ No campaigns found')
      return
    }

    console.log(`Found ${allCampaigns.length} campaign(s):\n`)

    // Check each campaign
    for (const campaignId of allCampaigns) {
      const campaign = await redis.json.get(campaignId)
      if (campaign && campaign[0]) {
        const campaignData = campaign[0]
        console.log(`📋 Campaign: ${campaignData.name}`)
        console.log(`   ID: ${campaignId}`)
        console.log(`   Slug: ${campaignData.slug}`)
        console.log(`   Created by: ${campaignData.createdBy}`)
        console.log(`   Status: ${campaignData.status}`)
        console.log(`   Team members: ${campaignData.teamMembers ? campaignData.teamMembers.join(', ') : 'none'}`)
        console.log(`   KOLs: ${campaignData.kols ? campaignData.kols.length : 0}`)
        console.log(`   Created: ${campaignData.createdAt}`)
        console.log()
      }
    }

    // Check creator campaigns
    console.log('\n📊 Campaign creators summary:')
    const creators = new Map()
    
    for (const campaignId of allCampaigns) {
      const campaign = await redis.json.get(campaignId)
      if (campaign && campaign[0]) {
        const campaignData = campaign[0]
        const creator = campaignData.createdBy
        if (!creators.has(creator)) {
          creators.set(creator, [])
        }
        creators.get(creator).push(campaignData.name)
      }
    }
    
    for (const [creator, campaigns] of creators) {
      console.log(`\n${creator}: ${campaigns.length} campaign(s)`)
      campaigns.forEach(name => console.log(`  - ${name}`))
    }

  } catch (error) {
    console.error('Error checking campaigns:', error)
  }
}

checkAllCampaigns() 