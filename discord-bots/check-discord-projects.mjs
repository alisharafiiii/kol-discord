import { Redis } from '@upstash/redis'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
const envPath = join(__dirname, '..', '.env.local')
config({ path: envPath })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function checkDiscordProjects() {
  console.log('🔍 Checking Discord Projects in Redis\n')
  
  try {
    // Check for Discord projects
    const projectKeys = await redis.keys('project:discord:*')
    console.log(`Found ${projectKeys.length} Discord project(s)\n`)
    
    if (projectKeys.length === 0) {
      console.log('❌ No Discord projects found!')
      console.log('\nThis is why the analytics bot shows "0 active projects".')
      console.log('\nTo fix this, you need to:')
      console.log('1. Create a Discord project in the admin panel')
      console.log('2. Set the project as active')
      console.log('3. Add tracked channels to the project')
      return
    }
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key)
      console.log(`📁 Project: ${project.name}`)
      console.log(`   ID: ${project.id}`)
      console.log(`   Active: ${project.isActive ? '✅' : '❌'}`)
      console.log(`   Server ID: ${project.serverId || 'Not set'}`)
      console.log(`   Tracked Channels: ${project.trackedChannels?.length || 0}`)
      
      if (project.trackedChannels && project.trackedChannels.length > 0) {
        console.log('   Channel IDs:')
        project.trackedChannels.forEach(ch => console.log(`     - ${ch}`))
      }
      
      console.log(`   Stats:`)
      console.log(`     - Total Messages: ${project.stats?.totalMessages || 0}`)
      console.log(`     - Total Users: ${project.stats?.totalUsers || 0}`)
      console.log(`     - Last Activity: ${project.stats?.lastActivity || 'Never'}`)
      console.log()
    }
    
    // Check for recent messages
    console.log('📊 Checking for recent Discord messages...')
    const messageKeys = await redis.keys('message:discord:*')
    console.log(`Found ${messageKeys.length} total Discord messages in Redis`)
    
    if (messageKeys.length > 0) {
      // Get a sample message
      const sampleMessage = await redis.json.get(messageKeys[0])
      console.log('\n📝 Sample message:')
      console.log(`   Project: ${sampleMessage.projectId}`)
      console.log(`   Server: ${sampleMessage.serverName}`)
      console.log(`   Channel: #${sampleMessage.channelName}`)
      console.log(`   User: @${sampleMessage.username}`)
      console.log(`   Time: ${sampleMessage.timestamp}`)
    }
    
  } catch (error) {
    console.error('❌ Error checking Discord projects:', error)
  }
}

checkDiscordProjects() 