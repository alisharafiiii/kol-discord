#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { Redis } = require('@upstash/redis')

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function checkAnalyticsUpdate() {
  console.log('🔍 Checking Discord Analytics Update Status\n')
  
  const projects = [
    { id: 'project:discord:OVPuPOX3_zHBnLUscRbdM', name: 'Ledger' },
    { id: 'project:discord:pype0pAxNMSU9k0LDSkF4', name: 'NABULINES' }
  ]
  
  for (const project of projects) {
    console.log(`\n📊 Project: ${project.name}`)
    console.log(`ID: ${project.id}`)
    
    // Get message count
    const messageIds = await redis.smembers(`discord:messages:project:${project.id}`)
    console.log(`Total messages: ${messageIds.length}`)
    
    // Get last 5 messages to check timestamps
    if (messageIds.length > 0) {
      console.log('\nLast 5 messages:')
      const lastMessages = messageIds.slice(-5)
      
      for (const msgId of lastMessages) {
        const message = await redis.json.get(msgId)
        if (message) {
          const msgDate = new Date(message.timestamp)
          const now = new Date()
          const hoursAgo = Math.round((now - msgDate) / (1000 * 60 * 60))
          
          console.log(`  - ${msgDate.toLocaleString()} (${hoursAgo}h ago): "${message.content.substring(0, 50)}..."`)
        }
      }
    }
    
    // Check project stats
    const projectData = await redis.json.get(project.id)
    if (projectData?.stats) {
      console.log('\nProject Stats:')
      console.log(`  Total Messages: ${projectData.stats.totalMessages || 0}`)
      console.log(`  Total Users: ${projectData.stats.totalUsers || 0}`)
      console.log(`  Last Activity: ${projectData.stats.lastActivity || 'Never'}`)
      
      if (projectData.stats.lastActivity) {
        const lastActivity = new Date(projectData.stats.lastActivity)
        const now = new Date()
        const minutesAgo = Math.round((now - lastActivity) / (1000 * 60))
        console.log(`  Minutes since last activity: ${minutesAgo}`)
      }
    }
    
    // Check cache status
    console.log('\n🗄️ Cache Check:')
    console.log('Note: Analytics API uses in-memory cache with 30-second TTL')
    console.log('First refresh may return cached data if within TTL window')
  }
  
  console.log('\n\n💡 Analytics Update Insights:')
  console.log('1. The analytics bot should be running to collect new messages')
  console.log('2. API has a 30-second cache that may cause stale data on first refresh')
  console.log('3. Force refresh parameter now bypasses the cache')
  console.log('4. Messages are stored with proper timestamps for time-based filtering')
  
  // Check if bot is running
  console.log('\n🤖 Bot Status:')
  try {
    const { execSync } = require('child_process')
    const botStatus = execSync('ps aux | grep analytics-bot | grep -v grep', { encoding: 'utf8' })
    if (botStatus) {
      console.log('✅ Analytics bot is running')
    }
  } catch (e) {
    console.log('❌ Analytics bot is NOT running')
    console.log('Run: ./discord-bots/manage-bots.sh start-analytics')
  }
}

checkAnalyticsUpdate().catch(console.error) 