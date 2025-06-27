#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function checkTrackedChannels() {
  console.log('🔍 Checking Discord Tracked Channels\n')
  
  const projects = [
    { id: 'project:discord:OVPuPOX3_zHBnLUscRbdM', name: 'Ledger' },
    { id: 'project:discord:pype0pAxNMSU9k0LDSkF4', name: 'NABULINES' }
  ]
  
  for (const project of projects) {
    console.log(`\n📊 Project: ${project.name}`)
    
    const projectData = await redis.json.get(project.id)
    if (!projectData) {
      console.log('❌ Project not found!')
      continue
    }
    
    console.log(`Tracked Channels: ${projectData.trackedChannels?.length || 0}`)
    
    if (projectData.trackedChannels && projectData.trackedChannels.length > 0) {
      console.log('\nChannel IDs:')
      for (const channelId of projectData.trackedChannels) {
        console.log(`  - ${channelId}`)
        
        // Check if there are any messages in this channel
        const channelMessageIds = await redis.smembers(`discord:messages:channel:${channelId}`)
        if (channelMessageIds.length > 0) {
          console.log(`    Messages: ${channelMessageIds.length}`)
          
          // Get last message
          const lastMsgId = channelMessageIds[channelMessageIds.length - 1]
          const lastMsg = await redis.json.get(lastMsgId)
          if (lastMsg) {
            const msgDate = new Date(lastMsg.timestamp)
            const hoursAgo = Math.round((new Date() - msgDate) / (1000 * 60 * 60))
            console.log(`    Last message: ${hoursAgo}h ago in #${lastMsg.channelName}`)
          }
        } else {
          console.log(`    Messages: 0 (no messages tracked)`)
        }
      }
    }
    
    // Check server info
    console.log(`\nServer: ${projectData.serverName} (${projectData.serverId})`)
    console.log(`Active: ${projectData.isActive}`)
  }
  
  console.log('\n\n💡 Notes:')
  console.log('1. If channels show 0 messages, they might be newly added')
  console.log('2. Check bot permissions in those channels')
  console.log('3. Make sure the bot has message read permissions')
  console.log('4. The analytics bot must be in the Discord server')
}

checkTrackedChannels().catch(console.error) 