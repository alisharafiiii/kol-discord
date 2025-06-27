#!/usr/bin/env node

/**
 * Fix Discord Analytics Bot Reload Issue
 * 
 * This script provides two solutions:
 * 1. Quick fix: Disable the 5-minute reload interval
 * 2. Better fix: Optimize the reload to use indexed lookups
 */

import { readFile, writeFile, copyFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BOT_PATH = join(__dirname, '..', 'discord-bots', 'analytics-bot.mjs')
const BACKUP_PATH = join(__dirname, '..', 'discord-bots', 'analytics-bot.mjs.backup')

async function applyQuickFix() {
  console.log('🚀 Applying quick fix: Disabling 5-minute reload interval...')
  
  try {
    // Create backup
    await copyFile(BOT_PATH, BACKUP_PATH)
    console.log('✅ Created backup at:', BACKUP_PATH)
    
    // Read bot file
    let content = await readFile(BOT_PATH, 'utf8')
    
    // Comment out the setInterval line
    content = content.replace(
      /(\s*)(setInterval\(loadTrackedChannels, 5 \* 60 \* 1000\))/,
      '$1// DISABLED: This was causing index read inconsistencies\n$1// $2'
    )
    
    // Write back
    await writeFile(BOT_PATH, content)
    console.log('✅ Disabled 5-minute reload interval')
    console.log('📝 Channels will now only be loaded on bot startup')
    console.log('💡 To reload channels, restart the bot')
    
  } catch (error) {
    console.error('❌ Error applying quick fix:', error)
  }
}

async function applyOptimizedFix() {
  console.log('🚀 Applying optimized fix: Replacing keys() with indexed lookup...')
  
  try {
    // Create backup
    await copyFile(BOT_PATH, BACKUP_PATH)
    console.log('✅ Created backup at:', BACKUP_PATH)
    
    // Read bot file
    let content = await readFile(BOT_PATH, 'utf8')
    
    // Replace the loadTrackedChannels function with optimized version
    const optimizedFunction = `// Load tracked channels for all projects
async function loadTrackedChannels() {
  try {
    console.log('📊 Loading tracked channels...')
    
    // OPTIMIZED: Use project index instead of keys() scan
    const projectIndex = await redis.smembers('discord:projects:active')
    
    if (!projectIndex || projectIndex.length === 0) {
      // Fallback to keys() for initial setup only
      console.log('⚠️  No project index found, performing initial scan...')
      const projectKeys = await redis.keys('project:discord:*')
      
      // Build the index for future use
      const activeProjects = []
      for (const key of projectKeys) {
        const project = await redis.json.get(key)
        if (project && project.isActive) {
          activeProjects.push(key)
        }
      }
      
      if (activeProjects.length > 0) {
        await redis.sadd('discord:projects:active', ...activeProjects)
        console.log('✅ Built active projects index with', activeProjects.length, 'projects')
      }
      
      // Continue with normal loading
      for (const key of projectKeys) {
        const project = await redis.json.get(key)
        if (project && project.isActive && project.trackedChannels?.length > 0) {
          projectChannelsCache.set(project.id, {
            name: project.name,
            channels: new Set(project.trackedChannels),
            serverId: project.serverId
          })
          console.log(\`📌 Tracking \${project.trackedChannels.length} channels for project: \${project.name}\`)
          
          // Load sentiment settings for this project
          await loadSentimentSettings(project.id)
        }
      }
    } else {
      // Use the index for efficient loading
      for (const projectKey of projectIndex) {
        const project = await redis.json.get(projectKey)
        if (project && project.isActive && project.trackedChannels?.length > 0) {
          projectChannelsCache.set(project.id, {
            name: project.name,
            channels: new Set(project.trackedChannels),
            serverId: project.serverId
          })
          console.log(\`📌 Tracking \${project.trackedChannels.length} channels for project: \${project.name}\`)
          
          // Load sentiment settings for this project
          await loadSentimentSettings(project.id)
        }
      }
    }
    
    console.log(\`✅ Loaded \${projectChannelsCache.size} active projects\`)
  } catch (error) {
    console.error('❌ Error loading tracked channels:', error)
  }
}`

    // Replace the function
    content = content.replace(
      /\/\/ Load tracked channels for all projects[\s\S]*?^}/m,
      optimizedFunction
    )
    
    // Also add a function to update the index when projects change
    const updateIndexFunction = `

// Update active projects index when a project is activated/deactivated
async function updateProjectIndex(projectId, isActive) {
  try {
    const projectKey = \`project:discord:\${projectId}\`
    if (isActive) {
      await redis.sadd('discord:projects:active', projectKey)
      console.log('✅ Added project to active index:', projectId)
    } else {
      await redis.srem('discord:projects:active', projectKey)
      console.log('✅ Removed project from active index:', projectId)
    }
  } catch (error) {
    console.error('❌ Error updating project index:', error)
  }
}
`

    // Insert before the client ready handler
    const clientReadyIndex = content.indexOf('// Handle Discord ready event')
    content = content.slice(0, clientReadyIndex) + updateIndexFunction + '\n' + content.slice(clientReadyIndex)
    
    // Re-enable the interval with a longer duration (30 minutes instead of 5)
    content = content.replace(
      /\/\/.*DISABLED.*\n.*\/\/\s*(setInterval\(loadTrackedChannels, 5 \* 60 \* 1000\))/,
      '  // Reload tracked channels every 30 minutes (optimized version)\n  setInterval(loadTrackedChannels, 30 * 60 * 1000)'
    )
    
    // Write back
    await writeFile(BOT_PATH, content)
    console.log('✅ Applied optimized fix')
    console.log('📝 Bot now uses indexed lookups instead of keys() scan')
    console.log('📝 Reload interval increased to 30 minutes')
    console.log('💡 Restart the bot to apply changes')
    
  } catch (error) {
    console.error('❌ Error applying optimized fix:', error)
  }
}

// Main menu
async function main() {
  console.log('🔧 Discord Analytics Bot Reload Fix')
  console.log('==================================')
  console.log()
  console.log('Choose a fix option:')
  console.log('1. Quick Fix - Disable 5-minute reload (recommended for immediate relief)')
  console.log('2. Optimized Fix - Replace keys() with indexed lookup')
  console.log('3. Exit')
  console.log()
  
  const readline = await import('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  
  rl.question('Enter your choice (1-3): ', async (answer) => {
    switch (answer) {
      case '1':
        await applyQuickFix()
        break
      case '2':
        await applyOptimizedFix()
        break
      case '3':
        console.log('👋 Exiting...')
        break
      default:
        console.log('❌ Invalid choice')
    }
    
    rl.close()
    
    if (answer === '1' || answer === '2') {
      console.log()
      console.log('🎯 Next steps:')
      console.log('1. Stop the analytics bot: npm run discord:analytics:stop')
      console.log('2. Start it again: npm run discord:analytics:start')
      console.log('3. Monitor the logs: tail -f discord-bots/analytics-bot.log')
    }
  })
}

main().catch(console.error) 