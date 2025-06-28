#!/usr/bin/env node
import { Redis } from '@upstash/redis'
import { config } from 'dotenv'

config({ path: '.env.local' })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

async function cleanupDuplicates() {
  console.log(`${colors.bright}${colors.cyan}🔍 Discord Analytics Duplicate Cleanup Script${colors.reset}`)
  console.log(`${colors.yellow}⚠️  This script will identify and remove duplicate Discord messages${colors.reset}\n`)
  
  try {
    // Step 1: Get all Discord projects
    console.log(`${colors.blue}Step 1: Loading Discord projects...${colors.reset}`)
    const projectKeys = await redis.keys('project:discord:*')
    console.log(`Found ${projectKeys.length} Discord projects\n`)
    
    const allStats = {
      totalMessages: 0,
      duplicatesFound: 0,
      orphanedEntries: 0,
      projectStats: {}
    }
    
    // Step 2: Analyze each project
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey)
      if (!project) continue
      
      console.log(`${colors.bright}📂 Analyzing project: ${project.name}${colors.reset}`)
      
      // Get all message IDs from the project index
      const indexKey = `discord:messages:project:${project.id}`
      const messageIds = await redis.smembers(indexKey)
      console.log(`  Found ${messageIds.length} entries in index`)
      
      // Check each message
      const validMessages = new Map() // messageId -> full redis key
      const duplicateKeys = []
      const orphanedIndexEntries = []
      
      for (const messageKey of messageIds) {
        try {
          const messageData = await redis.json.get(messageKey)
          
          if (!messageData) {
            // Orphaned index entry - message doesn't exist
            orphanedIndexEntries.push(messageKey)
            continue
          }
          
          // Extract Discord message ID from the key
          const discordMsgId = messageData.messageId || messageKey.split(':').pop()
          
          if (validMessages.has(discordMsgId)) {
            // Duplicate found - keep the first one
            duplicateKeys.push(messageKey)
          } else {
            validMessages.set(discordMsgId, messageKey)
          }
        } catch (err) {
          console.error(`  Error checking message ${messageKey}:`, err.message)
        }
      }
      
      // Store stats for this project
      allStats.projectStats[project.name] = {
        projectId: project.id,
        totalEntries: messageIds.length,
        validMessages: validMessages.size,
        duplicates: duplicateKeys.length,
        orphaned: orphanedIndexEntries.length,
        duplicateKeys,
        orphanedIndexEntries
      }
      
      allStats.totalMessages += validMessages.size
      allStats.duplicatesFound += duplicateKeys.length
      allStats.orphanedEntries += orphanedIndexEntries.length
      
      console.log(`  ✅ Valid messages: ${validMessages.size}`)
      console.log(`  ⚠️  Duplicates found: ${duplicateKeys.length}`)
      console.log(`  ❌ Orphaned entries: ${orphanedIndexEntries.length}\n`)
    }
    
    // Step 3: Show detailed preview
    console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}📊 CLEANUP PREVIEW SUMMARY${colors.reset}`)
    console.log(`${colors.bright}${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
    
    // Show project-specific stats
    for (const [projectName, stats] of Object.entries(allStats.projectStats)) {
      console.log(`${colors.bright}${projectName}:${colors.reset}`)
      console.log(`  • Total index entries: ${stats.totalEntries}`)
      console.log(`  • Valid messages to keep: ${colors.green}${stats.validMessages}${colors.reset}`)
      console.log(`  • Duplicate messages to remove: ${colors.red}${stats.duplicates}${colors.reset}`)
      console.log(`  • Orphaned index entries to clean: ${colors.red}${stats.orphaned}${colors.reset}`)
      
      // Special highlighting for mentioned projects
      if (projectName === 'Ledger' && stats.validMessages !== 1991) {
        console.log(`  ${colors.red}⚠️  WARNING: Expected 1991 messages for Ledger, found ${stats.validMessages}${colors.reset}`)
      }
      if (projectName === 'NABULINES' && stats.validMessages !== 172) {
        console.log(`  ${colors.red}⚠️  WARNING: Expected 172 messages for NABULINES, found ${stats.validMessages}${colors.reset}`)
      }
      console.log('')
    }
    
    console.log(`${colors.bright}TOTAL IMPACT:${colors.reset}`)
    console.log(`  • Valid messages preserved: ${colors.green}${allStats.totalMessages}${colors.reset}`)
    console.log(`  • Duplicates to remove: ${colors.red}${allStats.duplicatesFound}${colors.reset}`)
    console.log(`  • Orphaned entries to clean: ${colors.red}${allStats.orphanedEntries}${colors.reset}`)
    console.log(`  • Total operations: ${colors.yellow}${allStats.duplicatesFound + allStats.orphanedEntries}${colors.reset}\n`)
    
    // Safety check
    if (allStats.duplicatesFound === 0 && allStats.orphanedEntries === 0) {
      console.log(`${colors.green}✅ No duplicates or orphaned entries found! Database is clean.${colors.reset}`)
      return
    }
    
    // Step 4: Confirmation prompt
    console.log(`${colors.bright}${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`${colors.bright}${colors.red}⚠️  FINAL CONFIRMATION REQUIRED${colors.reset}`)
    console.log(`${colors.bright}${colors.red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
    console.log(`\nThis will permanently remove ${allStats.duplicatesFound + allStats.orphanedEntries} entries from Redis.`)
    console.log(`All ${allStats.totalMessages} valid messages will be preserved.\n`)
    console.log(`Type ${colors.bright}${colors.green}CONFIRM${colors.reset} to proceed or ${colors.bright}${colors.red}CANCEL${colors.reset} to abort: `)
    
    // Wait for user input
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
      console.log(`\n${colors.yellow}❌ Cleanup cancelled by user${colors.reset}`)
      return
    }
    
    // Step 5: Execute cleanup
    console.log(`\n${colors.blue}Executing cleanup...${colors.reset}`)
    let cleaned = 0
    
    for (const [projectName, stats] of Object.entries(allStats.projectStats)) {
      if (stats.duplicates === 0 && stats.orphaned === 0) continue
      
      console.log(`\nCleaning ${projectName}...`)
      
      // Remove duplicate messages
      for (const dupKey of stats.duplicateKeys) {
        try {
          // Remove from all indexes
          await redis.srem(`discord:messages:project:${stats.projectId}`, dupKey)
          
          // Get message data to clean other indexes
          const msgData = await redis.json.get(dupKey)
          if (msgData) {
            await redis.srem(`discord:messages:channel:${msgData.channelId}`, dupKey)
            await redis.srem(`discord:messages:user:${msgData.userId}`, dupKey)
          }
          
          // Delete the message
          await redis.del(dupKey)
          cleaned++
          
          if (cleaned % 100 === 0) {
            console.log(`  Cleaned ${cleaned} entries...`)
          }
        } catch (err) {
          console.error(`  Error removing duplicate ${dupKey}:`, err.message)
        }
      }
      
      // Remove orphaned index entries
      for (const orphanKey of stats.orphanedIndexEntries) {
        try {
          await redis.srem(`discord:messages:project:${stats.projectId}`, orphanKey)
          cleaned++
        } catch (err) {
          console.error(`  Error removing orphaned entry ${orphanKey}:`, err.message)
        }
      }
      
      console.log(`  ✅ Cleaned ${stats.duplicates + stats.orphaned} entries from ${projectName}`)
    }
    
    // Step 6: Verify and update stats
    console.log(`\n${colors.green}✅ Cleanup completed!${colors.reset}`)
    console.log(`   Removed ${cleaned} duplicate/orphaned entries`)
    
    // Update project stats
    console.log(`\n${colors.blue}Updating project statistics...${colors.reset}`)
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey)
      if (!project) continue
      
      const messageIds = await redis.smembers(`discord:messages:project:${project.id}`)
      const userIds = await redis.smembers(`discord:users:project:${project.id}`)
      
      project.stats = {
        totalMessages: messageIds.length,
        totalUsers: userIds.length,
        lastActivity: project.stats?.lastActivity || new Date().toISOString()
      }
      
      await redis.json.set(projectKey, '$', project)
      console.log(`  Updated stats for ${project.name}: ${messageIds.length} messages, ${userIds.length} users`)
    }
    
    console.log(`\n${colors.bright}${colors.green}✨ Database cleanup completed successfully!${colors.reset}`)
    
  } catch (error) {
    console.error(`\n${colors.red}❌ Error during cleanup:${colors.reset}`, error)
    console.error(`${colors.yellow}No changes were made to the database${colors.reset}`)
  }
}

// Run the cleanup
cleanupDuplicates() 