import { Client, GatewayIntentBits } from 'discord.js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { ResilientRedis } from './lib/redis-resilient.mjs'
import { sendBotAlert, verifyEmailConnection } from './lib/email-notifier.mjs'
import { GoogleGenerativeAI } from '@google/generative-ai'
import fetch from 'node-fetch'

// Get current directory (ES modules compatibility)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
const envPath = join(__dirname, '..', '.env.local')
config({ path: envPath })
console.log('🔍 Loading environment from:', envPath)

// Initialize Redis connection with resilience
const redis = new ResilientRedis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  botName: 'Discord Analytics Bot'
})

// Verify email system
verifyEmailConnection().catch(err => {
  console.error('⚠️  Email system not available:', err.message)
})

// Points API configuration
const POINTS_API_URL = process.env.POINTS_API_URL || 'http://localhost:3000/api/discord/award-points'
const DISCORD_BOT_API_KEY = process.env.DISCORD_BOT_API_KEY || 'discord-bot-points-key-2024'
console.log(`🎯 Points API configured: ${POINTS_API_URL}`)

// Initialize Gemini AI for sentiment analysis
let model = null
if (process.env.GEMINI_API_KEY) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  console.log('✅ AI model initialized for sentiment analysis')
} else {
  console.warn('⚠️  No GEMINI_API_KEY found - sentiment analysis disabled')
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
})

// Cache for tracked channels per project
const projectChannelsCache = new Map()

// Cache for sentiment settings per project
const sentimentSettingsCache = new Map()

// Track bot health
let lastMessageProcessed = Date.now()
let totalMessagesProcessed = 0
let errorCount = 0

// Load sentiment settings for a project
async function loadSentimentSettings(projectId) {
  try {
    const settingsKey = `discord:sentiment:${projectId}`
    const settings = await redis.json.get(settingsKey)
    
    if (settings) {
      sentimentSettingsCache.set(projectId, {
        bullishKeywords: (settings.bullishKeywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k),
        bearishKeywords: (settings.bearishKeywords || '').split(',').map(k => k.trim().toLowerCase()).filter(k => k),
        bullishEmojis: (settings.bullishEmojis || '').split(',').map(e => e.trim()).filter(e => e),
        bearishEmojis: (settings.bearishEmojis || '').split(',').map(e => e.trim()).filter(e => e),
        ignoredChannels: settings.ignoredChannels || [],
        minimumMessageLength: settings.minimumMessageLength || 3
      })
      console.log(`📊 Loaded sentiment settings for project: ${projectId}`)
    }
  } catch (error) {
    console.error('Error loading sentiment settings:', error)
    errorCount++
  }
}

// Check for sentiment settings reload requests
async function checkSentimentReloads() {
  try {
    for (const projectId of projectChannelsCache.keys()) {
      const reloadKey = `discord:sentiment:reload:${projectId}`
      const shouldReload = await redis.get(reloadKey)
      
      if (shouldReload) {
        console.log(`🔄 Reloading sentiment settings for project: ${projectId}`)
        await loadSentimentSettings(projectId)
        await redis.del(reloadKey)
      }
    }
  } catch (error) {
    console.error('Error checking sentiment reloads:', error)
    errorCount++
  }
}

// Load tracked channels for all projects
async function loadTrackedChannels() {
  try {
    console.log('📊 Loading tracked channels...')
    
    // CRITICAL FIX: Clear the cache before reloading to prevent duplicates
    projectChannelsCache.clear()
    
    // Get all Discord projects - FIX: Use correct key pattern
    const projectKeys = await redis.keys('project:discord:*')
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key)
      if (project && project.isActive && project.trackedChannels?.length > 0) {
        projectChannelsCache.set(project.id, {
          name: project.name,
          channels: new Set(project.trackedChannels),
          serverId: project.serverId
        })
        console.log(`📌 Tracking ${project.trackedChannels.length} channels for project: ${project.name}`)
        
        // Load sentiment settings for this project
        await loadSentimentSettings(project.id)
      }
    }
    
    console.log(`✅ Loaded ${projectChannelsCache.size} active projects`)
  } catch (error) {
    console.error('❌ Error loading tracked channels:', error)
    errorCount++
    
    // If we can't load tracked channels, the bot can't function properly
    if (errorCount > 5) {
      await handleCriticalError(error, 'Failed to load tracked channels')
    }
  }
}

// Analyze sentiment using custom settings and Gemini
async function analyzeSentiment(content, projectId) {
  // Check minimum message length
  const settings = sentimentSettingsCache.get(projectId)
  if (settings && content.length < settings.minimumMessageLength) {
    return { score: 'neutral', confidence: 0.5 }
  }
  
  // First check custom keywords and emojis
  if (settings) {
    const lowerContent = content.toLowerCase()
    
    // Count bullish and bearish indicators
    let bullishCount = 0
    let bearishCount = 0
    
    // Check keywords
    for (const keyword of settings.bullishKeywords) {
      if (lowerContent.includes(keyword)) bullishCount++
    }
    for (const keyword of settings.bearishKeywords) {
      if (lowerContent.includes(keyword)) bearishCount++
    }
    
    // Check emojis
    for (const emoji of settings.bullishEmojis) {
      if (content.includes(emoji)) bullishCount++
    }
    for (const emoji of settings.bearishEmojis) {
      if (content.includes(emoji)) bearishCount++
    }
    
    // If we have clear indicators, use them
    if (bullishCount > bearishCount && bullishCount > 0) {
      return { score: 'positive', confidence: Math.min(0.9, 0.6 + (bullishCount * 0.1)) }
    } else if (bearishCount > bullishCount && bearishCount > 0) {
      return { score: 'negative', confidence: Math.min(0.9, 0.6 + (bearishCount * 0.1)) }
    }
  }
  
  // Fall back to AI analysis if no clear custom indicators
  if (!model || !content || content.length < 3) {
    return { score: 'neutral', confidence: 0.5 }
  }
  
  try {
    const prompt = `Analyze the sentiment of this Discord message and respond with ONLY ONE WORD - either "positive", "neutral", or "negative": "${content}"`
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const sentiment = response.text().toLowerCase().trim()
    
    // Validate response
    if (['positive', 'neutral', 'negative'].includes(sentiment)) {
      return { score: sentiment, confidence: 0.8 }
    }
    
    return { score: 'neutral', confidence: 0.5 }
  } catch (error) {
    console.error('Error analyzing sentiment:', error.message)
    return { score: 'neutral', confidence: 0.5 }
  }
}

// Award points for Discord message via API
async function awardPointsForMessage(discordUserId, discordUsername, projectId, projectName, messageId) {
  try {
    const response = await fetch(POINTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': DISCORD_BOT_API_KEY
      },
      body: JSON.stringify({
        discordUserId,
        discordUsername,
        projectId,
        projectName,
        messageId
      })
    })
    
    const result = await response.json()
    
    if (result.success && result.points > 0) {
      console.log(`💰 Awarded ${result.points} points to @${discordUsername}`)
    } else if (result.success && result.points === 0) {
      // User not linked or daily limit reached - silent skip
    } else {
      console.warn(`⚠️  Points API error: ${result.error || 'Unknown error'}`)
    }
    
    return result
  } catch (error) {
    // Don't throw - we don't want points failures to affect message processing
    console.error('❌ Points API call failed:', error.message)
    return { success: false, error: error.message }
  }
}

// Save message to Redis using the same structure as DiscordService
async function saveMessage(message, projectId, projectData) {
  try {
    // Check if channel is ignored for sentiment analysis
    const settings = sentimentSettingsCache.get(projectId)
    if (settings && settings.ignoredChannels.includes(message.channel.id)) {
      console.log(`⏭️ Skipping ignored channel: #${message.channel.name}`)
      return
    }
    
    const messageId = `message:discord:${projectId}:${message.id}`
    
    // CRITICAL FIX: Check if message already exists to prevent duplicates
    const existingMessage = await redis.exists(messageId)
    if (existingMessage) {
      console.log(`⚠️ Message ${message.id} already exists, skipping duplicate`)
      return
    }
    
    // Analyze sentiment with project ID
    const sentiment = await analyzeSentiment(message.content, projectId)
    
    const messageData = {
      id: messageId,
      messageId: message.id,
      projectId: projectId,
      serverId: message.guild.id,
      serverName: message.guild.name,
      channelId: message.channel.id,
      channelName: message.channel.name,
      userId: message.author.id,
      username: message.author.username,
      userAvatar: message.author.avatarURL(),
      content: message.content,
      timestamp: message.createdAt.toISOString(),
      hasAttachments: message.attachments.size > 0,
      attachments: Array.from(message.attachments.values()).map(a => ({
        id: a.id,
        url: a.url,
        name: a.name,
        size: a.size,
        contentType: a.contentType
      })),
      replyToId: message.reference?.messageId || null,
      sentiment: sentiment
    }
    
    // Save message
    await redis.json.set(messageId, '$', messageData)
    
    // Add to indexes
    await redis.sadd(`discord:messages:project:${projectId}`, messageId)
    await redis.sadd(`discord:messages:channel:${message.channel.id}`, messageId)
    await redis.sadd(`discord:messages:user:${message.author.id}`, messageId)
    
    // Update user stats
    await updateUserStats(message.author.id, message.author.username, projectId, sentiment.score)
    
    // Update project stats
    await updateProjectStats(projectId)
    
    // Log based on sentiment
    const sentimentEmoji = {
      positive: '😊',
      neutral: '😐',
      negative: '😞'
    }[sentiment.score] || '😐'
    
    console.log(`${sentimentEmoji} [${projectData.name}] #${message.channel.name} @${message.author.username}: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`)
    
    // Award points for the message (non-blocking)
    awardPointsForMessage(
      message.author.id,
      message.author.username,
      projectId,
      projectData.name,
      message.id
    ).catch(err => {
      console.error('⚠️  Failed to award points:', err.message)
    })
    
    // Update health metrics
    lastMessageProcessed = Date.now()
    totalMessagesProcessed++
    
    return messageData
  } catch (error) {
    console.error('Error saving message:', error)
    errorCount++
    throw error
  }
}

// Update user statistics
async function updateUserStats(userId, username, projectId, sentiment) {
  try {
    const userKey = `discord:user:${userId}`
    let user = await redis.json.get(userKey)
    
    if (!user) {
      user = {
        id: userId,
        username: username,
        projects: [projectId],
        stats: {
          [projectId]: {
            messageCount: 0,
            firstSeen: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            sentimentBreakdown: {
              positive: 0,
              neutral: 0,
              negative: 0
            }
          }
        }
      }
    }
    
    // Update stats
    if (!user.stats[projectId]) {
      user.stats[projectId] = {
        messageCount: 0,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        sentimentBreakdown: {
          positive: 0,
          neutral: 0,
          negative: 0
        }
      }
    }
    
    user.stats[projectId].messageCount++
    user.stats[projectId].lastSeen = new Date().toISOString()
    user.stats[projectId].sentimentBreakdown[sentiment]++
    
    if (!user.projects.includes(projectId)) {
      user.projects.push(projectId)
    }
    
    await redis.json.set(userKey, '$', user)
    await redis.sadd(`discord:users:project:${projectId}`, userId)
  } catch (error) {
    console.error('Error updating user stats:', error)
    errorCount++
  }
}

// Update project statistics
async function updateProjectStats(projectId) {
  try {
    const project = await redis.json.get(projectId)
    if (!project) return
    
    const messageIds = await redis.smembers(`discord:messages:project:${projectId}`)
    const userIds = await redis.smembers(`discord:users:project:${projectId}`)
    
    project.stats = {
      totalMessages: messageIds.length,
      totalUsers: userIds.length,
      lastActivity: new Date().toISOString()
    }
    
    await redis.json.set(projectId, '$', project)
  } catch (error) {
    console.error('Error updating project stats:', error)
    errorCount++
  }
}

// Handle critical errors
async function handleCriticalError(error, context) {
  console.error(`💀 CRITICAL ERROR in ${context}:`, error)
  
  try {
    await sendBotAlert('Discord Analytics Bot', error, {
      context: context,
      lastActivity: new Date(lastMessageProcessed).toISOString(),
      totalMessagesProcessed: totalMessagesProcessed,
      errorCount: errorCount,
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    })
  } catch (emailError) {
    console.error('Failed to send critical error email:', emailError)
  }
  
  // Exit to let PM2 restart
  process.exit(1)
}

// Health monitoring
function startHealthMonitoring() {
  setInterval(() => {
    const timeSinceLastMessage = Date.now() - lastMessageProcessed
    
    // If no message processed in 5 minutes and we have active projects, log warning
    if (timeSinceLastMessage > 5 * 60 * 1000 && projectChannelsCache.size > 0) {
      console.warn(`⚠️  No messages processed in ${Math.floor(timeSinceLastMessage / 1000)}s`)
    }
    
    // Log health stats every hour
    if (totalMessagesProcessed > 0 && totalMessagesProcessed % 100 === 0) {
      console.log(`📊 Health Report: ${totalMessagesProcessed} messages, ${errorCount} errors, uptime: ${Math.floor(process.uptime())}s`)
    }
  }, 60000) // Check every minute
}

// Handle Discord ready event
client.on('ready', async () => {
  console.log(`✅ Analytics bot logged in as ${client.user.tag}`)
  console.log(`📊 Monitoring ${client.guilds.cache.size} servers`)
  
  // Load tracked channels
  await loadTrackedChannels()
  
  // Start health monitoring
  startHealthMonitoring()
  
  // Reload tracked channels every 5 minutes
  setInterval(loadTrackedChannels, 5 * 60 * 1000)
  
  // Check for sentiment settings reloads every 30 seconds
  setInterval(checkSentimentReloads, 30 * 1000)
})

// Handle new messages
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return
  
  // Ignore DMs
  if (!message.guild) return
  
  // Check if this channel is being tracked by any project
  let trackedProject = null
  let projectData = null
  
  for (const [projectId, data] of projectChannelsCache) {
    if (data.channels.has(message.channel.id)) {
      trackedProject = projectId
      projectData = data
      break
    }
  }
  
  // If channel is not tracked, ignore
  if (!trackedProject) return
  
  try {
    // Save the message
    await saveMessage(message, trackedProject, projectData)
  } catch (error) {
    console.error('Error processing message:', error)
    errorCount++
    
    // If too many errors, something is seriously wrong
    if (errorCount > 100) {
      await handleCriticalError(error, 'Message processing')
    }
  }
})

// Handle Discord errors
client.on('error', async (error) => {
  console.error('Discord client error:', error)
  errorCount++
  
  // Discord connection errors are critical
  await handleCriticalError(error, 'Discord client')
})

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error)
  await handleCriticalError(error, 'Uncaught exception')
})

// Handle unhandled promise rejections
process.on('unhandledRejection', async (error) => {
  console.error('Unhandled rejection:', error)
  await handleCriticalError(error, 'Unhandled rejection')
})

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down analytics bot...')
  
  try {
    client.destroy()
    redis.destroy()
    console.log('✅ Analytics bot stopped gracefully')
    process.exit(0)
  } catch (error) {
    console.error('Error during shutdown:', error)
    process.exit(1)
  }
})

// PM2 graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 PM2 shutdown signal received...')
  
  try {
    client.destroy()
    redis.destroy()
    console.log('✅ Analytics bot stopped by PM2')
    process.exit(0)
  } catch (error) {
    console.error('Error during PM2 shutdown:', error)
    process.exit(1)
  }
})

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN)
  .then(() => console.log('🚀 Analytics bot starting...'))
  .catch(async (error) => {
    console.error('❌ Failed to start analytics bot:', error)
    await handleCriticalError(error, 'Bot startup')
  }) 