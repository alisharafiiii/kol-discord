const path = require('path')
const { nanoid } = require('nanoid')

// Load environment variables from parent directory
const envPath = path.join(__dirname, '..', '.env.local')
console.log('🔍 Loading environment from:', envPath)
require('dotenv').config({ path: envPath })

const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes } = require('discord.js')
const { ResilientRedis } = require('./lib/redis-resilient.js')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const { toEdtIsoString, getEdtDateString, getCurrentEdt } = require('./lib/timezone')

// Check required environment variables
const requiredVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN']
const optionalVars = ['GEMINI_API_KEY', 'GOOGLE_AI_API_KEY'] // Try both for compatibility
const missingVars = requiredVars.filter(v => !process.env[v])

// Check for Discord bot token (either name)
const hasDiscordToken = process.env.DISCORD_ENGAGEMENT_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN
if (!hasDiscordToken) {
  missingVars.push('DISCORD_ENGAGEMENT_BOT_TOKEN or DISCORD_BOT_TOKEN')
}

// Check for Gemini/Google AI key
const hasAiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '))
  console.error('🔍 Please check your .env.local file contains:')
  missingVars.forEach(v => console.error(`   ${v}=your_value_here`))
  process.exit(1)
}

if (!hasAiKey) {
  console.warn('⚠️  No AI API key found (GEMINI_API_KEY or GOOGLE_AI_API_KEY)')
  console.warn('   Sentiment analysis will be disabled')
}

// Initialize Redis with resilient wrapper
console.log('🔄 Connecting to main Redis instance:', process.env.UPSTASH_REDIS_REST_URL)
const redis = new ResilientRedis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  botName: 'Discord Engagement Bot'
})

// Initialize Gemini for sentiment analysis (if available)
let genAI = null
let model = null

if (hasAiKey) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
  genAI = new GoogleGenerativeAI(apiKey)
  model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  console.log('✅ AI model initialized for sentiment analysis')
}

// Initialize Discord client with stability improvements
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers
  ],
  ws: {
    large_threshold: 250,
    compress: true
  },
  retryLimit: 5,
  presence: {
    status: 'online',
    activities: [{
      name: 'for /connect commands',
      type: 'WATCHING'
    }]
  }
})

// Tweet URL regex
const TWEET_REGEX = /https?:\/\/(twitter\.com|x\.com)\/[\w]+\/status\/(\d+)/i

// Bot configuration
const BOT_CHANNEL_NAME = 'engagement-tracker'
const ADMIN_ROLE_NAME = 'admin'
const KOL_ROLE_NAME = 'kol'

// Role hierarchy (higher number = higher priority)
const ROLE_HIERARCHY = {
  'admin': 4,
  'core': 3,
  'team': 2,
  'kol': 1,
  'user': 0
}

// Helper function to extract tweet ID from URL
function extractTweetId(url) {
  const match = url.match(TWEET_REGEX)
  return match ? match[2] : null
}

// Helper function to extract Twitter handle from URL
function extractTwitterHandle(url) {
  const match = url.match(/https?:\/\/(twitter\.com|x\.com)\/([\w]+)\/status/)
  return match ? match[2] : null
}

// Create a new user profile (pending approval)
async function createUserProfile(twitterHandle, discordId, discordUsername = null) {
  try {
    const normalizedHandle = twitterHandle.toLowerCase().replace('@', '')
    const userId = `profile:${normalizedHandle}`  // Use profile: prefix for ProfileService compatibility
    
    console.log(`[createUserProfile] Creating profile for @${normalizedHandle} with Discord: ${discordUsername || 'Unknown'}`)
    
    const newUser = {
      id: userId,
      twitterHandle: normalizedHandle,  // Remove @ from twitterHandle field
      name: normalizedHandle, // Use handle as name initially
      approvalStatus: 'pending', // Set to pending, requiring admin approval
      role: 'user', // Default to user role
      tier: 'micro', // Default tier
      discordId: discordId,
      discordUsername: discordUsername, // Add Discord username
      createdAt: toEdtIsoString(new Date()),
      updatedAt: toEdtIsoString(new Date()),
      socialAccounts: {
        twitter: {
          handle: normalizedHandle,
          connected: true
        }
      }
    }
    
    // Add Discord to social accounts if we have the username
    if (discordUsername) {
      newUser.socialAccounts.discord = {
        id: discordId,
        username: discordUsername,
        tag: discordUsername,  // Add tag field for compatibility
        connected: true
      }
    }
    
    // Save to Redis using ProfileService prefix
    await redis.json.set(userId, '$', newUser)
    
    // Create indexes for both ProfileService and legacy systems
    await redis.sAdd(`idx:profile:handle:${normalizedHandle}`, userId)  // ProfileService index
    await redis.sAdd(`idx:username:${normalizedHandle}`, userId)  // Legacy index
    
    // Add to profile indexes for searching
    await redis.sAdd(`idx:profile:role:user`, userId)
    await redis.sAdd(`idx:profile:status:pending`, userId)
    await redis.sAdd(`idx:profile:tier:micro`, userId)
    
    // Add to pending users set (not approved)
    await redis.sAdd('users:pending', userId)
    
    console.log(`✅ Created new user profile (pending) for @${normalizedHandle} with Discord: ${discordUsername || 'Not provided'}`)
    return newUser
  } catch (error) {
    console.error('Error creating user profile:', error)
    throw error
  }
}


// Check if user is approved in the database
async function isUserApproved(twitterHandle) {
  try {
    const normalizedHandle = twitterHandle.toLowerCase().replace('@', '')
    
    // Try ProfileService format first (profile:handle)
    const profileId = `profile:${normalizedHandle}`
    let userData = await redis.json.get(profileId)
    
    // If not found, try legacy format via username index
    if (!userData) {
      const userIds = await redis.smembers(`idx:username:${normalizedHandle}`)
      if (userIds && userIds.length > 0) {
        // Check ALL entries in the index, not just the first one
        for (const userId of userIds) {
          userData = await redis.json.get(userId)
          if (userData) break // Stop when we find valid data
        }
      }
    }
    
    // If still not found, check ProfileService index
    if (!userData) {
      const profileIds = await redis.smembers(`idx:profile:handle:${normalizedHandle}`)
      if (profileIds && profileIds.length > 0) {
        // Check ALL entries in the index
        for (const profileId of profileIds) {
          userData = await redis.json.get(profileId)
          if (userData) break // Stop when we find valid data
        }
      }
    }
    
    if (!userData) {
      return { approved: false, userData: null, exists: false }
    }
    
    // Check approval status
    const isApproved = userData.approvalStatus === 'approved'
    return { approved: isApproved, userData, exists: true }
  } catch (error) {
    console.error('Error checking user approval:', error)
    return { approved: false, userData: null, exists: false }
  }
}

// Get user's current role from database
async function getUserRole(twitterHandle) {
  try {
    const { approved, userData } = await isUserApproved(twitterHandle)
    if (!approved || !userData) return 'user'
    
    return userData.role || 'user'
  } catch (error) {
    console.error('Error getting user role:', error)
    return 'user'
  }
}

// Update user's role in database
async function updateUserRole(twitterHandle, newRole) {
  try {
    const normalizedHandle = twitterHandle.toLowerCase().replace('@', '')
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`)
    
    if (userIds && userIds.length > 0) {
      await redis.json.set(userIds[0], '$.role', newRole)
      return true
    }
    return false
  } catch (error) {
    console.error('Error updating user role:', error)
    return false
  }
}

// Get tier-based scenarios
async function getTierScenarios(tier) {
  try {
    const safeTier = tier || 'micro' // Default to micro if tier is null/undefined
    
    // First check if we have tier configuration from admin panel
    const tierConfig = await redis.json.get(`engagement:tier-config:${safeTier}`)
    if (tierConfig) {
      // Convert tier config to scenario format
      return {
        dailyTweetLimit: tierConfig.dailyTweetLimit,
        submissionCost: tierConfig.submissionCost,
        bonusMultiplier: tierConfig.multiplier,
        categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech', 'Memes', 'News'],
        minFollowers: getMinFollowersByTier(safeTier)
      }
    }
    
    // Fall back to scenario data if no tier config
    const scenarios = await redis.json.get(`engagement:scenarios:${safeTier}`)
    return scenarios || getDefaultScenarios(safeTier)
  } catch (error) {
    console.error('Error getting tier scenarios:', error)
    return getDefaultScenarios(tier || 'micro')
  }
}

// Get minimum followers by tier
function getMinFollowersByTier(tier) {
  const followersMap = {
    'micro': 100,
    'rising': 500,
    'star': 1000,
    'legend': 5000,
    'hero': 10000
  }
  return followersMap[tier] || 100
}

// Default scenarios by tier
function getDefaultScenarios(tier) {
  const scenarios = {
    'micro': {
      dailyTweetLimit: 5,
      categories: ['General', 'DeFi', 'NFT'],
      minFollowers: 100,
      bonusMultiplier: 1.0
    },
    'rising': {
      dailyTweetLimit: 10,
      categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech'],
      minFollowers: 500,
      bonusMultiplier: 1.5
    },
    'star': {
      dailyTweetLimit: 20,
      categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech', 'Memes', 'News'],
      minFollowers: 1000,
      bonusMultiplier: 2.0
    },
    'legend': {
      dailyTweetLimit: 30,
      categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech', 'Memes', 'News', 'Special'],
      minFollowers: 5000,
      bonusMultiplier: 2.5
    },
    'hero': {
      dailyTweetLimit: 50,
      categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech', 'Memes', 'News', 'Special', 'VIP'],
      minFollowers: 10000,
      bonusMultiplier: 3.0
    }
  }
  
  return scenarios[tier] || scenarios['micro']
}

// Utility function for retrying operations
async function retryOperation(fn, operation = 'operation', retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      console.error(`[RETRY] ${operation} failed (attempt ${i + 1}/${retries}):`, error.message)
      if (i === retries - 1) throw error
      // Exponential backoff: 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)))
    }
  }
}

// Create minimal tweet embed with preview
function createTweetEmbed(tweet, submitterName, includeButtons = true) {
  // Choose color based on tier - more vibrant colors
  const tierColors = {
    'micro': 0x6B7280,   // Gray
    'rising': 0x3B82F6,  // Blue
    'star': 0xFBBF24,    // Yellow
    'legend': 0xFB923C,  // Orange
    'hero': 0xA855F7     // Purple
  }
  
  // Tier emojis for better visibility
  const tierEmojis = {
    'micro': '⚪',
    'rising': '🔵',
    'star': '⭐',
    'legend': '🟠',
    'hero': '🟣'
  }
  
  // Tier display names
  const tierNames = {
    'micro': 'MICRO',
    'rising': 'RISING',
    'star': 'STAR',
    'legend': 'LEGEND',
    'hero': 'HERO'
  }
  
  // Calculate potential points with new values
  const likePoints = Math.floor(10 * tweet.bonusMultiplier)
  const retweetPoints = Math.floor(35 * tweet.bonusMultiplier)
  const replyPoints = Math.floor(20 * tweet.bonusMultiplier)
  
  const tierEmoji = tierEmojis[tweet.tier] || '⚪'
  const tierName = tierNames[tweet.tier] || tweet.tier.toUpperCase()
  
  const embed = new EmbedBuilder()
    .setColor(tierColors[tweet.tier] || 0x1DA1F2)
    .setAuthor({ 
      name: `@${tweet.authorHandle}`, 
      url: `https://twitter.com/${tweet.authorHandle}`,
      iconURL: 'https://abs.twimg.com/icons/apple-touch-icon-192x192.png'
    })
    .setDescription(
      `${tierEmoji} **${tierName} TIER** ${tierEmoji}\n\n` +
      `${tweet.content ? `"${tweet.content}"\n\n` : ''}` +
      `**💰 Earn ${tweet.bonusMultiplier}x points:**\n` +
      `❤️ Like: ${likePoints} pts | 🔁 RT: ${retweetPoints} pts | 💬 Reply: ${replyPoints} pts`
    )
    .addFields(
      { name: 'Tier', value: `${tierEmoji} ${tierName}`, inline: true },
      { name: 'Category', value: `${tweet.category}`, inline: true },
      { name: 'Submitted', value: `<t:${Math.floor(new Date(tweet.submittedAt).getTime() / 1000)}:R>`, inline: true }
    )
    .setFooter({ text: `Submitted by ${submitterName}` })
  
  if (includeButtons) {
    // Create clickable button for the tweet
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setLabel('View & Engage')
          .setStyle(ButtonStyle.Link)
          .setURL(tweet.url)
          .setEmoji('🐦')
      )
    
    return { embeds: [embed], components: [row] }
  }
  
  return { embeds: [embed] }
}

// Handle slash commands
client.on('ready', async () => {
  console.log(`✅ Engagement bot logged in as ${client.user.tag}`)
  
  // Validate bot permissions in all guilds
  for (const guild of client.guilds.cache.values()) {
    const botMember = guild.members.cache.get(client.user.id)
    if (!botMember) continue
    
    const permissions = botMember.permissions.toArray()
    console.log(`📋 Permissions in ${guild.name}:`, permissions.length, 'permissions')
    
    // Check for required permissions
    const requiredPermissions = [
      'ViewChannel',
      'SendMessages',
      'EmbedLinks',
      'ReadMessageHistory',
      'UseExternalEmojis',
      'ManageRoles' // For KOL role assignment
    ]
    
    const missingPermissions = requiredPermissions.filter(perm => !permissions.includes(perm))
    
    if (missingPermissions.length > 0) {
      console.warn(`⚠️  Missing permissions in ${guild.name}:`)
      missingPermissions.forEach(perm => console.warn(`   - ${perm}`))
      console.warn(`   Please grant these permissions to the bot for full functionality`)
    } else {
      console.log(`✅ All required permissions granted in ${guild.name}`)
    }
    
    // Check role hierarchy for KOL role assignment
    const kolRole = guild.roles.cache.find(role => role.name.toLowerCase() === 'kol')
    if (kolRole && botMember.roles.highest.position <= kolRole.position) {
      console.warn(`⚠️  Bot role position too low in ${guild.name}`)
      console.warn(`   Move bot role above 'kol' role to enable role assignment`)
    }
  }
  
  // Start checking for channel info requests
  setInterval(async () => {
    try {
      // Look for any channel info requests
      const keys = await redis.keys('discord:channel-info-request:*')
      
      for (const key of keys) {
        const request = await redis.get(key)
        if (!request) continue
        
        let channelId, serverId, projectId
        try {
          // Upstash Redis returns the parsed object directly
          const parsed = typeof request === 'string' ? JSON.parse(request) : request
          channelId = parsed.channelId
          serverId = parsed.serverId
          projectId = parsed.projectId
        } catch (parseError) {
          console.error(`Error parsing channel info request from ${key}:`, parseError)
          console.error('Raw request data:', request)
          await redis.del(key)
          continue
        }
        
        // Try to fetch the channel
        try {
          console.log(`[DEBUG] Looking for guild ${serverId}`)
          console.log(`[DEBUG] Available guilds: ${client.guilds.cache.map(g => `${g.name} (${g.id})`).join(', ')}`)
          
          const guild = client.guilds.cache.get(serverId)
          if (!guild) {
            console.log(`Guild ${serverId} not found in cache`)
            continue
          }
          
          const channel = guild.channels.cache.get(channelId)
          if (channel) {
            // Store the response
            const responseKey = `discord:channel-info-response:${channelId}`
            await redis.set(responseKey, JSON.stringify({
              id: channelId,
              name: channel.name,
              type: channel.type === 0 ? 'text' : 'voice'
            }), {
              ex: 60 // expire in 60 seconds
            })
            
            // Also store permanent channel metadata
            const channelMetadataKey = `channel:discord:${channelId}`
            await redis.json.set(channelMetadataKey, '$', {
              id: channelId,
              name: channel.name,
              type: channel.type === 0 ? 'text' : 'voice',
              projectId: projectId || null,
              updatedAt: toEdtIsoString(new Date())
            })
            
            console.log(`✅ Fetched channel info: #${channel.name} (${channelId})`)
          } else {
            console.log(`Channel ${channelId} not found in guild ${serverId}`)
          }
        } catch (error) {
          console.error(`Error fetching channel ${channelId}:`, error)
        }
        
        // Delete the request
        await redis.del(key)
      }
    } catch (error) {
      console.error('Error processing channel info requests:', error)
    }
  }, 2000) // Check every 2 seconds
  
  // Register slash commands
  const commands = [
    {
      name: 'ping',
      description: 'Test if bot is responding'
    },
    {
      name: 'connect',
      description: 'Connect your Twitter account (must be approved)'
    },
    {
      name: 'submit',
      description: 'Submit a tweet for engagement tracking',
      options: [{
        name: 'url',
        type: 3, // STRING
        description: 'The tweet URL',
        required: true
      }, {
        name: 'category',
        type: 3,
        description: 'Tweet category (optional)',
        required: false
      }]
    },
    {
      name: 'stats',
      description: 'View your engagement stats'
    },
    {
      name: 'leaderboard',
      description: 'View the engagement leaderboard'
    },
    {
      name: 'recent',
      description: 'View recently submitted tweets'
    },
    {
      name: 'points',
      description: 'View your points balance and recent activity'
    },
    {
      name: 'tier',
      description: 'Admin: Set user tier',
      options: [{
        name: 'user',
        type: 6, // USER
        description: 'The user to update',
        required: true
      }, {
        name: 'tier',
        type: 3, // STRING
        description: 'Tier level (micro/rising/star/legend/hero)',
        required: true,
        choices: [
          { name: 'Micro', value: 'micro' },
          { name: 'Rising', value: 'rising' },
          { name: 'Star', value: 'star' },
          { name: 'Legend', value: 'legend' },
          { name: 'Hero', value: 'hero' }
        ]
      }]
    },
    {
      name: 'scenarios',
      description: 'Admin: Configure tier scenarios',
      options: [{
        name: 'tier',
        type: 3, // STRING
        description: 'Tier level (micro/rising/star/legend/hero)',
        required: true,
        choices: [
          { name: 'Micro', value: 'micro' },
          { name: 'Rising', value: 'rising' },
          { name: 'Star', value: 'star' },
          { name: 'Legend', value: 'legend' },
          { name: 'Hero', value: 'hero' }
        ]
      }, {
        name: 'daily_limit',
        type: 4,
        description: 'Daily tweet limit',
        required: false
      }, {
        name: 'min_followers',
        type: 4,
        description: 'Minimum followers required',
        required: false
      }, {
        name: 'bonus_multiplier',
        type: 10, // DOUBLE
        description: 'Points bonus multiplier',
        required: false
      }]
    },
    {
      name: 'adjustpoints',
      description: 'Admin/Core: Adjust user points',
      options: [{
        name: 'user',
        type: 6, // USER
        description: 'The user whose points to adjust',
        required: true
      }, {
        name: 'points',
        type: 4, // INTEGER
        description: 'Points to add (positive) or remove (negative)',
        required: true
      }, {
        name: 'reason',
        type: 3, // STRING
        description: 'Reason for adjustment (optional)',
        required: false
      }]
    }
  ]
  
  // Import REST and Routes for proper command registration
  const { REST } = require('@discordjs/rest')
  const { Routes } = require('discord-api-types/v9')
  
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_ENGAGEMENT_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN)
  
  try {
    console.log('🔄 Refreshing application (/) commands...')
    
    // Clear existing commands first to remove duplicates
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: [] }
    )
    
    // Register commands to each guild for instant update
    for (const guild of client.guilds.cache.values()) {
      try {
        await rest.put(
          Routes.applicationGuildCommands(client.user.id, guild.id),
          { body: commands }
        )
        console.log(`✅ Registered commands to guild: ${guild.name}`)
      } catch (error) {
        console.error(`❌ Failed to register to ${guild.name}:`, error.message)
      }
    }
    
    console.log('✅ Slash commands registered')
  } catch (error) {
    console.error('Error registering commands:', error)
  }
})

// Handle interactions
client.on('interactionCreate', async (interaction) => {
  console.log(`📥 Received interaction: ${interaction.type} - Command: ${interaction.commandName || 'N/A'} - User: ${interaction.user?.tag || 'Unknown'}`)
  
  try {
    // Handle slash commands
    if (interaction.isCommand()) {
      const { commandName } = interaction
      console.log(`🎯 Processing command: ${commandName}`)
      
      if (commandName === 'ping') {
        await interaction.reply({ content: '🏓 Pong!', flags: 64 })
        return
      }
      
      if (commandName === 'connect') {
        await interaction.deferReply({ flags: 64 })
        
        try {
          // Generate a unique verification session
          const sessionId = `verify-${interaction.user.id}-${Date.now()}`
          const sessionKey = `discord:verify:${sessionId}`
          
          // Store session data
          await redis.set(sessionKey, JSON.stringify({
            discordId: interaction.user.id,
            discordUsername: interaction.user.username,
            discordTag: interaction.user.tag,
            timestamp: Date.now()
          }), { ex: 600 }) // Expires in 10 minutes
          
          // Create verification URL that will use the website's Twitter OAuth
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.nabulines.com'
          const verificationUrl = `${baseUrl}/auth/discord-link?session=${sessionId}`
          
          const embed = new EmbedBuilder()
            .setColor(0x1DA1F2) // Twitter blue
            .setTitle('🔐 Secure Twitter Connection')
            .setDescription(
              'To securely connect your Twitter account, you need to verify ownership through Twitter OAuth.\n\n' +
              '**Click the button below to:**\n' +
              '1. Sign in with Twitter (OAuth)\n' +
              '2. Authorize the connection\n' +
              '3. Your accounts will be linked automatically'
            )
            .addFields(
              { name: '⏱️ Expires In', value: '10 minutes', inline: true },
              { name: '🔒 Security', value: 'OAuth 2.0', inline: true }
            )
            .setFooter({ text: 'Only you can complete this verification' })
          
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setLabel('Verify Twitter Account')
                .setStyle(ButtonStyle.Link)
                .setURL(verificationUrl)
                .setEmoji('🐦')
            )
          
          await interaction.editReply({
            embeds: [embed],
            components: [row],
            flags: 64
          })
        } catch (error) {
          console.error('Error in connect command:', error)
          await interaction.editReply('❌ An error occurred. Please try again.')
        }
      }
      
      else if (commandName === 'submit') {
        await interaction.deferReply({ flags: 64 }) // 64 is the flag for ephemeral
        
        const url = interaction.options.getString('url')
        const category = interaction.options.getString('category')
        console.log(`[SUBMIT] User ${interaction.user.tag} submitting tweet: ${url}`)
        
        // Validate URL
        const tweetId = extractTweetId(url)
        if (!tweetId) {
          await interaction.editReply('❌ Invalid tweet URL. Please provide a valid Twitter/X URL.')
          return
        }
        console.log(`[SUBMIT] Tweet ID extracted: ${tweetId}`)
        
        // Check if user is connected
        const connection = await redis.json.get(`engagement:connection:${interaction.user.id}`)
        if (!connection) {
          await interaction.editReply('❌ Please connect your Twitter account first using `/connect`')
          return
        }
        console.log(`[SUBMIT] User connected as @${connection.twitterHandle}`)
        
        // Check if user is still approved
        console.log(`[SUBMIT] Checking approval status for @${connection.twitterHandle}...`)
        const { approved } = await isUserApproved(connection.twitterHandle)
        console.log(`[SUBMIT] Approval status: ${approved}`)
        if (!approved) {
          await interaction.editReply('❌ Your Twitter account is no longer approved. Please contact an admin.')
          return
        }
        
        // Check tier scenarios
        console.log(`[SUBMIT] Getting tier scenarios for tier: ${connection.tier}`)
        const scenarios = await getTierScenarios(connection.tier)
        console.log(`[SUBMIT] Tier scenarios loaded: daily limit = ${scenarios.dailyTweetLimit}`)
        
        // STEP 1: Check user's current points
        const currentPoints = connection.totalPoints || 0
        console.log(`[SUBMIT] User's current points: ${currentPoints}`)
        
        // STEP 2: Retrieve the required submission cost from settings based on tier
        const submissionCost = scenarios.submissionCost || 0
        console.log(`[SUBMIT] Required submission cost for tier ${connection.tier}: ${submissionCost} points`)
        
        // STEP 3: Check if user has enough points
        if (submissionCost > 0 && currentPoints < submissionCost) {
          // User doesn't have enough points
          await interaction.editReply(
            `❌ Not enough points. You need **${submissionCost} points** to submit a tweet.\n` +
            `Your current balance: **${currentPoints} points**\n` +
            `You need **${submissionCost - currentPoints} more points** to submit.`
          )
          return
        }
        
        // Check daily limit
        const today = getEdtDateString(new Date())
        const dailySubmissions = await redis.get(`engagement:daily:${interaction.user.id}:${today}`) || 0
        
        if (dailySubmissions >= scenarios.dailyTweetLimit) {
          await interaction.editReply(`❌ You've reached your daily limit of ${scenarios.dailyTweetLimit} tweets for Tier ${connection.tier}.`)
          return
        }
        
        // Check for duplicate
        const isDuplicate = await redis.exists(`engagement:tweetid:${tweetId}`)
        if (isDuplicate) {
          await interaction.editReply('❌ This tweet has already been submitted.')
          return
        }
        
        // Extract author handle
        const authorHandle = extractTwitterHandle(url)
        
        // Check if submitter is author or admin
        const member = interaction.guild.members.cache.get(interaction.user.id)
        const isAdmin = member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME)
        
        // Compare handles case-insensitively
        if (!isAdmin && connection.twitterHandle.toLowerCase() !== authorHandle.toLowerCase()) {
          await interaction.editReply('❌ You can only submit your own tweets. Admins can submit any tweet.')
          return
        }
        
        // Validate category
        let finalCategory = category
        if (category && !scenarios.categories.includes(category)) {
          await interaction.editReply(`❌ Invalid category. Available categories for Tier ${connection.tier}: ${scenarios.categories.join(', ')}`)
          return
        }
        
        if (!finalCategory) {
          finalCategory = 'General'
        }
        
        // Submit tweet
        try {
          // Try to fetch tweet content from Twitter API
          let tweetContent = null
          try {
            const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=text`, {
              headers: {
                'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
              }
            })
            
            if (response.ok) {
              const tweetData = await response.json()
              tweetContent = tweetData.data?.text || null
              console.log('📝 Fetched tweet content:', tweetContent ? 'Success' : 'No content')
            }
          } catch (error) {
            console.log('⚠️ Could not fetch tweet content:', error.message)
          }

          const tweet = {
            id: nanoid(),
            tweetId,
            submitterDiscordId: interaction.user.id,
            submittedAt: new Date(),
            category: finalCategory,
            url,
            authorHandle,
            content: tweetContent,
            tier: connection.tier,
            bonusMultiplier: scenarios.bonusMultiplier
          }
          
          // Save tweet with retry logic
          await retryOperation(async () => {
            console.log(`[SUBMIT] Saving tweet data...`)
            console.log(`[SUBMIT] Tweet ID: ${tweet.id}`)
            console.log(`[SUBMIT] Tweet object:`, JSON.stringify(tweet, null, 2))
            
            // Save tweet JSON
            await redis.json.set(`engagement:tweet:${tweet.id}`, '$', tweet)
            console.log(`[SUBMIT] ✅ Tweet JSON saved`)
            
            // Store in sorted set for admin panel compatibility
            console.log(`[SUBMIT] Adding to recent tweets sorted set...`)
            await redis.zadd('engagement:tweets:recent', { score: Date.now(), member: tweet.id })
            console.log(`[SUBMIT] ✅ Added to sorted set`)
            
            // Map tweet ID for quick lookup
            console.log(`[SUBMIT] Setting tweet ID mapping...`)
            await redis.set(`engagement:tweetid:${tweet.tweetId}`, tweet.id)
            console.log(`[SUBMIT] ✅ Tweet ID mapping set`)
            
            // Add to pending queue for batch processing
            const pendingDate = getEdtDateString(new Date())
            console.log(`[SUBMIT] Adding to pending queue for date: ${pendingDate}`)
            await redis.sAdd(`engagement:pending:${pendingDate}`, tweet.id)
            console.log(`[SUBMIT] ✅ Added tweet ${tweet.id} to pending queue`)
          }, 'save tweet', 3)
          
          // Increment daily counter
          console.log(`[SUBMIT] Incrementing daily counter for user ${interaction.user.id} on ${today}`)
          await redis.incr(`engagement:daily:${interaction.user.id}:${today}`)
          console.log(`[SUBMIT] ✅ Daily counter incremented`)
          
          console.log(`[SUBMIT] Setting counter expiry...`)
          await redis.expire(`engagement:daily:${interaction.user.id}:${today}`, 86400) // 24 hours
          console.log(`[SUBMIT] ✅ Counter expiry set`)
          
          // STEP 4: Deduct points immediately if submission cost is configured
          if (submissionCost > 0) {
            console.log(`[SUBMIT] Deducting ${submissionCost} points from user @${connection.twitterHandle}`)
            console.log(`[SUBMIT] Redis instance type: ${redis.constructor.name}`)
            console.log(`[SUBMIT] Redis.json exists: ${!!redis.json}`)
            console.log(`[SUBMIT] Redis.json.numincrby exists: ${!!redis.json?.numincrby}`)
            
            try {
              // Deduct points from user's connection
              await redis.json.numincrby(`engagement:connection:${interaction.user.id}`, '$.totalPoints', -submissionCost)
              console.log(`[SUBMIT] Successfully deducted ${submissionCost} points. New balance: ${currentPoints - submissionCost}`)
              
              // Log the point deduction for transparency
              const deductionLog = {
                id: nanoid(),
                userId: interaction.user.id,
                twitterHandle: connection.twitterHandle,
                action: 'tweet_submission',
                points: -submissionCost,
                balance: currentPoints - submissionCost,
                tweetId: tweet.id,
                timestamp: toEdtIsoString(new Date()),
                tier: connection.tier
              }
              
              // Save deduction log
              await redis.json.set(`engagement:deduction:${deductionLog.id}`, '$', deductionLog)
                              await redis.zadd('engagement:deductions:recent', { score: Date.now(), member: deductionLog.id })
              
            } catch (deductError) {
              console.error('[SUBMIT] Error deducting points:', deductError)
              // Don't fail the submission, but log the error
            }
          }
          
          // Send to channel
          const channel = interaction.guild.channels.cache.find(ch => ch.name === BOT_CHANNEL_NAME)
          if (channel) {
            // Debug: Check bot permissions in channel
            const botMember = interaction.guild.members.cache.get(client.user.id)
            const perms = channel.permissionsFor(botMember)
            console.log(`Bot permissions in #${BOT_CHANNEL_NAME}:`, {
              viewChannel: perms.has('ViewChannel'),
              sendMessages: perms.has('SendMessages'),
              embedLinks: perms.has('EmbedLinks'),
              readMessageHistory: perms.has('ReadMessageHistory'),
              useExternalEmojis: perms.has('UseExternalEmojis')
            })
            try {
              const messageContent = createTweetEmbed(tweet, interaction.user.username)
              await channel.send(messageContent)
              console.log(`✅ Posted tweet preview to #${BOT_CHANNEL_NAME}`)
            } catch (channelError) {
              console.error('Error posting to channel:', channelError)
              console.log('Make sure the bot has permission to send messages in #engagement-tracker')
              console.log('Required permissions: View Channel, Send Messages, Embed Links')
              
              // Try sending without buttons as fallback
              try {
                console.log('Attempting to send without buttons...')
                const simpleEmbed = createTweetEmbed(tweet, interaction.user.username, false)
                await channel.send(simpleEmbed)
                console.log('✅ Sent simplified preview without buttons')
              } catch (fallbackError) {
                console.error('Even simple embed failed:', fallbackError)
                console.log('Bot may lack basic permissions in the channel')
                
                // Last resort - send plain text
                try {
                  const plainMessage = `**@${tweet.authorHandle}**\n` +
                    `${tweet.content ? `"${tweet.content}"\n\n` : ''}` +
                    `💰 Earn ${tweet.bonusMultiplier}x points | ⭐ Tier ${tweet.tier} | ${tweet.category}\n` +
                    `🔗 ${tweet.url}`
                  await channel.send(plainMessage)
                  console.log('✅ Sent plain text preview')
                } catch (textError) {
                  console.error('Cannot send any message to channel:', textError)
                }
              }
            }
          } else {
            console.log(`Channel "${BOT_CHANNEL_NAME}" not found. Please create it for tweet announcements.`)
          }
          
          // Create success message with point deduction info if applicable
          let successMessage = `✅ Tweet submitted successfully! (${parseInt(dailySubmissions) + 1}/${scenarios.dailyTweetLimit} today)`
          
          if (submissionCost > 0) {
            successMessage += `\n💰 **${submissionCost} points deducted** - New balance: **${currentPoints - submissionCost} points**`
          }
          
          await interaction.editReply(successMessage)
                  } catch (error) {
            console.error('[SUBMIT] ❌ Error submitting tweet:', error)
            console.error('[SUBMIT] Error stack:', error.stack)
            console.error('[SUBMIT] Error type:', error.constructor.name)
            console.error('[SUBMIT] Error message:', error.message)
            await interaction.editReply('❌ An error occurred while submitting the tweet. Please try again.')
          }
      }
      
      else if (commandName === 'stats') {
        await interaction.deferReply({ flags: 64 }) // 64 is the flag for ephemeral
        
        const connection = await redis.json.get(`engagement:connection:${interaction.user.id}`)
        if (!connection) {
          await interaction.editReply('❌ Please connect your Twitter account first using `/connect`')
          return
        }
        
        // Get tier scenarios
        const scenarios = await getTierScenarios(connection.tier)
        
        // Get today's submissions
        const today = getEdtDateString(new Date())
        const dailySubmissions = await redis.get(`engagement:daily:${interaction.user.id}:${today}`) || 0
        
        // Get recent engagements (skip for now since we don't have logs yet)
        const logs = []
        
        const embed = new EmbedBuilder()
          .setColor(0x00FF00)
          .setTitle('📊 Your Engagement Stats')
          .setDescription(`**Twitter:** @${connection.twitterHandle}\n**Tier:** ${connection.tier ? connection.tier.toUpperCase() : 'MICRO'}\n**Total Points:** ${connection.totalPoints || 0}`)
          .addFields(
            { name: 'Daily Limit', value: `${dailySubmissions}/${scenarios.dailyTweetLimit}`, inline: true },
            { name: 'Bonus Multiplier', value: `${scenarios.bonusMultiplier}x`, inline: true },
            { name: 'Submission Cost', value: `${scenarios.submissionCost || 0} points`, inline: true },
            { name: 'Categories', value: scenarios.categories.join(', '), inline: false }
          )
          .setTimestamp()
        
        if (logs.length > 0) {
          const recentActivity = logs.map(log => 
            `${log.interactionType === 'like' ? '❤️' : log.interactionType === 'retweet' ? '🔁' : '💬'} +${log.points} points`
          ).join('\n')
          embed.addFields({ name: 'Recent Activity', value: recentActivity })
        }
        
        await interaction.editReply({ embeds: [embed] })
      }
      
      else if (commandName === 'leaderboard') {
        await interaction.deferReply()
        
        // Get leaderboard data
        const keys = await redis.keys('engagement:connection:*')
        const entries = []
        
        for (const key of keys.slice(0, 50)) {
          const connection = await redis.json.get(key)
          if (connection) {
            entries.push({
              discordId: connection.discordId,
              twitterHandle: connection.twitterHandle,
              totalPoints: connection.totalPoints || 0,
              tier: connection.tier
            })
          }
        }
        
        // Sort by points
        entries.sort((a, b) => b.totalPoints - a.totalPoints)
        
        const embed = new EmbedBuilder()
          .setColor(0xFFD700) // Gold
          .setTitle('🏆 Engagement Leaderboard')
          .setDescription('Top 10 Engagers')
          .setTimestamp()
        
        const top10 = entries.slice(0, 10).map((entry, index) => {
          const tierEmoji = {
            'micro': '⚪',
            'rising': '🟢',
            'star': '⭐',
            'legend': '🟠',
            'hero': '👑'
          }[entry.tier] || '⚪'
          return `**${index + 1}.** @${entry.twitterHandle} ${tierEmoji} ${entry.tier ? entry.tier.toUpperCase() : 'MICRO'} - ${entry.totalPoints} points`
        }).join('\n')
        
        embed.addFields({ name: 'Rankings', value: top10 || 'No data yet' })
        
        await interaction.editReply({ embeds: [embed] })
      }
      
      else if (commandName === 'recent') {
        await interaction.deferReply()
        
        try {
          // Get recent tweets from sorted set
          const tweetIds = await redis.zrange('engagement:tweets:recent', 0, 9, { rev: true }) // Get last 10
          const tweets = []
          
          for (const id of tweetIds) {
            const tweet = await redis.json.get(`engagement:tweet:${id}`)
            if (tweet) tweets.push(tweet)
          }
          
          const embed = new EmbedBuilder()
            .setColor(0x1DA1F2) // Twitter blue
            .setTitle('🐦 Recent Tweets for Engagement')
            .setDescription('Click on any tweet to engage and earn points!')
            .setTimestamp()
          
          if (tweets.length === 0) {
            embed.addFields({ name: 'No tweets yet', value: 'Be the first to submit a tweet with `/submit`!' })
          } else {
            let tweetList = ''
            tweets.forEach((tweet, index) => {
              tweetList += `**${index + 1}. @${tweet.authorHandle}**\n`
              if (tweet.content) {
                tweetList += `"${tweet.content.substring(0, 100)}${tweet.content.length > 100 ? '...' : ''}"\n`
              }
              tweetList += `💰 ${tweet.bonusMultiplier}x points | ⭐ Tier ${tweet.tier} | [View Tweet](${tweet.url})\n\n`
            })
            embed.addFields({ name: 'Recent Tweets', value: tweetList || 'No tweets yet' })
          }
          
          await interaction.editReply({ embeds: [embed] })
        } catch (error) {
          console.error('Error in /recent command:', error)
          await interaction.editReply('❌ An error occurred while fetching recent tweets.')
        }
      }
      
      else if (commandName === 'points') {
        await interaction.reply({ 
          embeds: [{
            color: 0x00ff00,
            title: '🎮 Nabulines Points Dashboard',
            description: 'View your points, weekly activity, and recent transactions in our retro-style dashboard!',
            fields: [
              {
                name: '🔗 Access Your Dashboard',
                value: '[Click here to view your points dashboard](https://www.nabulines.com/dashboard)',
                inline: false
              }
            ],
            footer: {
              text: 'Login with your Twitter/X account to see your stats'
            }
          }],
          flags: 64 // Ephemeral
        })
      }
      
      else if (commandName === 'tier') {
        // Admin only
        const member = interaction.guild.members.cache.get(interaction.user.id)
        const isAdmin = member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME)
        
        if (!isAdmin) {
          await interaction.reply({ content: '❌ This command is admin only.', flags: 64 })
          return
        }
        
        const user = interaction.options.getUser('user')
        const tier = interaction.options.getString('tier')
        
        const validTiers = ['micro', 'rising', 'star', 'legend', 'hero']
        if (!validTiers.includes(tier)) {
          await interaction.reply({ content: '❌ Invalid tier. Must be one of: micro, rising, star, legend, hero', flags: 64 })
          return
        }
        
        const connection = await redis.json.get(`engagement:connection:${user.id}`)
        if (!connection) {
          await interaction.reply({ content: '❌ User has not connected their Twitter account.', flags: 64 })
          return
        }
        
        await redis.json.set(`engagement:connection:${user.id}`, '$.tier', tier)
        await interaction.reply({ content: `✅ Updated ${user.username}'s tier to ${tier.toUpperCase()}`, flags: 64 })
      }
      
      else if (commandName === 'scenarios') {
        // Admin only
        const member = interaction.guild.members.cache.get(interaction.user.id)
        const isAdmin = member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME)
        
        if (!isAdmin) {
          await interaction.reply({ content: '❌ This command is admin only.', flags: 64 })
          return
        }
        
        const tier = interaction.options.getString('tier')
        const dailyLimit = interaction.options.getInteger('daily_limit')
        const minFollowers = interaction.options.getInteger('min_followers')
        const bonusMultiplier = interaction.options.getNumber('bonus_multiplier')
        
        const validTiers = ['micro', 'rising', 'star', 'legend', 'hero']
        if (!validTiers.includes(tier)) {
          await interaction.reply({ content: '❌ Invalid tier. Must be one of: micro, rising, star, legend, hero', flags: 64 })
          return
        }
        
        // Get current scenarios
        const currentScenarios = await getTierScenarios(tier)
        
        // Update with new values
        if (dailyLimit !== null) currentScenarios.dailyTweetLimit = dailyLimit
        if (minFollowers !== null) currentScenarios.minFollowers = minFollowers
        if (bonusMultiplier !== null) currentScenarios.bonusMultiplier = bonusMultiplier
        
        // Save scenarios
        await redis.json.set(`engagement:scenarios:${tier}`, '$', currentScenarios)
        
        await interaction.reply({ 
          content: `✅ Updated ${tier.toUpperCase()} tier scenarios:\n` +
                   `Daily Limit: ${currentScenarios.dailyTweetLimit}\n` +
                   `Min Followers: ${currentScenarios.minFollowers}\n` +
                   `Bonus Multiplier: ${currentScenarios.bonusMultiplier}x`,
          flags: 64 
        })
      }
      
      else if (commandName === 'adjustpoints') {
        // Admin/Core only
        const member = interaction.guild.members.cache.get(interaction.user.id)
        const isAdmin = member.roles.cache.some(role => role.name === ADMIN_ROLE_NAME)
        const isCore = member.roles.cache.some(role => role.name === 'core')
        
        if (!isAdmin && !isCore) {
          await interaction.reply({ content: '❌ This command is for Admin and Core roles only.', flags: 64 })
          return
        }
        
        const user = interaction.options.getUser('user')
        const points = interaction.options.getInteger('points')
        const reason = interaction.options.getString('reason') || 'Manual adjustment'
        
        // Get user connection
        const connection = await redis.json.get(`engagement:connection:${user.id}`)
        if (!connection) {
          await interaction.reply({ content: `❌ User ${user.username} has not connected their Twitter account.`, flags: 64 })
          return
        }
        
        // Update points
        const currentPoints = connection.totalPoints || 0
        const newPoints = Math.max(0, currentPoints + points) // Ensure points don't go negative
        
        await redis.json.set(`engagement:connection:${user.id}`, '$.totalPoints', newPoints)
        
        // Create transaction log
        const transactionId = `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const transaction = {
          id: transactionId,
          userId: user.id,
          userName: `@${connection.twitterHandle}`,
          points: points,
          action: 'manual_adjustment',
          timestamp: toEdtIsoString(new Date()),
          description: reason,
          adminId: interaction.user.id,
          adminName: interaction.user.username,
          previousBalance: currentPoints,
          newBalance: newPoints
        }
        
        // Save transaction
        await redis.json.set(`engagement:transaction:${transactionId}`, '$', transaction)
                            await redis.zadd('engagement:transactions:recent', { score: Date.now(), member: transactionId })
        
        // Log the adjustment
        console.log(`[Points Adjustment] ${interaction.user.username} adjusted ${points} points for @${connection.twitterHandle} (${user.id}). Reason: ${reason}`)
        
        // Create response embed
        const embed = new EmbedBuilder()
          .setColor(points > 0 ? 0x00FF00 : 0xFF0000) // Green for positive, red for negative
          .setTitle('💰 Points Adjustment')
          .setDescription(`Successfully adjusted points for @${connection.twitterHandle}`)
          .addFields(
            { name: 'Adjustment', value: `${points > 0 ? '+' : ''}${points} points`, inline: true },
            { name: 'New Balance', value: `${newPoints} points`, inline: true },
            { name: 'Previous Balance', value: `${currentPoints} points`, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setFooter({ text: `Adjusted by ${interaction.user.username}` })
          .setTimestamp()
        
        await interaction.reply({ embeds: [embed], flags: 64 })
      }
    }
    
    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === 'connect-twitter') {
        const handle = interaction.fields.getTextInputValue('twitter-handle')
        const cleanHandle = handle.toLowerCase().replace('@', '').trim()
        
        // Check if user is approved
        const { approved, userData, exists } = await isUserApproved(cleanHandle)
        
        // If user doesn't exist, create a new profile (pending approval)
        if (!exists) {
          try {
            const newUser = await createUserProfile(cleanHandle, interaction.user.id, interaction.user.username)
            console.log(`✅ Created new profile (pending) for @${cleanHandle} with Discord: ${interaction.user.username}`)
            
            await interaction.reply({ 
              content: `📝 Your Twitter account @${cleanHandle} has been registered!\n\n` +
                       `⏳ **Your account is pending approval.** An admin will review and approve your account soon.\n` +
                       `📢 You'll be notified once approved and can then use the engagement features.`, 
              flags: 64 
            })
            return
          } catch (error) {
            console.error('Error creating new user profile:', error)
            await interaction.reply({ 
              content: '❌ An error occurred while creating your profile. Please try again or contact an admin.', 
              flags: 64 
            })
            return
          }
        }
        
        // If user exists but is not approved
        if (!approved) {
          await interaction.reply({ 
            content: '❌ Your Twitter account is pending approval. Please wait for an admin to approve your account.', 
            flags: 64 
          })
          return
        }
        
        // Check if handle is already connected
        const existingDiscordId = await redis.get(`engagement:twitter:${cleanHandle}`)
        if (existingDiscordId && existingDiscordId !== interaction.user.id) {
          await interaction.reply({ 
            content: '❌ This Twitter account is already connected to another Discord user.', 
            flags: 64 
          })
          return
        }
        
        // Get current role from database
        const currentRole = userData.role || 'user'
        
        // Assign KOL role if user doesn't have a higher role
        let finalRole = currentRole
        if (ROLE_HIERARCHY[currentRole] < ROLE_HIERARCHY['kol']) {
          finalRole = 'kol'
          await updateUserRole(cleanHandle, 'kol')
          
          // Also assign Discord role if available
          try {
            const member = await interaction.guild.members.fetch(interaction.user.id)
            const kolRole = interaction.guild.roles.cache.find(role => role.name.toLowerCase() === KOL_ROLE_NAME)
            
            if (kolRole) {
              // Check if bot has permission to manage roles
              const botMember = interaction.guild.members.cache.get(client.user.id)
              if (!botMember.permissions.has('ManageRoles')) {
                console.warn('⚠️  Bot lacks "Manage Roles" permission - cannot assign KOL role')
                console.log('   Please grant the bot "Manage Roles" permission in Discord')
              } 
              // Check if bot's highest role is above the KOL role
              else if (botMember.roles.highest.position <= kolRole.position) {
                console.warn('⚠️  Bot\'s role is not high enough to assign the KOL role')
                console.log('   Please move the bot\'s role above the KOL role in Discord settings')
              }
              // Try to assign the role
              else if (!member.roles.cache.has(kolRole.id)) {
                await member.roles.add(kolRole)
                console.log(`✅ Assigned KOL role to ${member.user.tag}`)
              }
            } else {
              console.warn(`⚠️  No role found with name "${KOL_ROLE_NAME}" (case-insensitive)`)
              console.log('   Please create a role named "kol" in your Discord server')
            }
          } catch (error) {
            console.error('❌ Error assigning Discord role:', error.message)
            if (error.code === 50013) {
              console.log('   This is a permissions issue. Please check:')
              console.log('   1. Bot has "Manage Roles" permission')
              console.log('   2. Bot\'s role is above the KOL role in the hierarchy')
            }
          }
        }
        
        // IMPORTANT: Update main user profile with Discord info
        console.log(`[CONNECT] Updating user profile for @${cleanHandle} with Discord info...`)
        
        // Try ProfileService format first (profile:handle)
        const profileId = `profile:${cleanHandle}`
        let profile = await redis.json.get(profileId)
        let foundProfileId = profileId
        
        // If not found, try legacy format (user:user_handle)
        if (!profile) {
          const userIds = await redis.smembers(`idx:username:${cleanHandle}`)
          if (userIds && userIds.length > 0) {
            foundProfileId = userIds[0]
            profile = await redis.json.get(foundProfileId)
          }
        }
        
        if (profile) {
          console.log(`[CONNECT] Found profile ${foundProfileId}, adding Discord info...`)
          
          // Update profile with Discord info
          await redis.json.set(foundProfileId, '$.discordId', interaction.user.id)
          await redis.json.set(foundProfileId, '$.discordUsername', interaction.user.username)
          
          // Ensure socialAccounts exists and update Discord info
          if (!profile.socialAccounts) {
            await redis.json.set(foundProfileId, '$.socialAccounts', {})
          }
          
          await redis.json.set(foundProfileId, '$.socialAccounts.discord', {
            id: interaction.user.id,
            username: interaction.user.username,
            tag: interaction.user.tag || interaction.user.username,
            connected: true
          })
          
          // Update profile index for ProfileService if needed
          const indexKey = `idx:profile:handle:${cleanHandle}`
                        await redis.sAdd(indexKey, foundProfileId)
          
          console.log(`✅ Updated main profile with Discord: ${interaction.user.username}`)
        } else {
          console.log(`⚠️ No profile found for @${cleanHandle} - Discord info will be stored in engagement connection only`)
        }
        
        // Create connection - get tier from user profile
        const userTier = userData.tier || 'micro'  // Default to micro if no tier
        const connection = {
          discordId: interaction.user.id,
          twitterHandle: cleanHandle,
          tier: userTier,
          connectedAt: new Date(),
          totalPoints: 0,
          role: finalRole
        }
        
        await redis.json.set(`engagement:connection:${interaction.user.id}`, '$', connection)
        await redis.set(`engagement:twitter:${cleanHandle}`, interaction.user.id)
        
        // Also link for Discord points bridge
        console.log(`[CONNECT] Linking Discord user ${interaction.user.id} to platform user ${userIds?.[0] || cleanHandle}`)
        if (userIds && userIds.length > 0) {
          await redis.set(`discord:user:map:${interaction.user.id}`, userIds[0])
        }
        
        let message = `✅ Successfully connected Twitter account @${cleanHandle}!`
        if (finalRole === 'kol' && currentRole !== 'kol') {
          message += '\n🎉 You\'ve been assigned the KOL role!'
        }
        
        await interaction.reply({ 
          content: message, 
          flags: 64 
        })
      }
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error)
    
    // Try to respond to the user
    try {
      if (interaction.deferred) {
        await interaction.editReply({ content: '❌ An error occurred processing your request. Please try again.' })
      } else if (!interaction.replied) {
        await interaction.reply({ content: '❌ An error occurred processing your request. Please try again.', flags: 64 })
      }
    } catch (replyError) {
      console.error('Could not send error message to user:', replyError)
    }
  }
})

// Enhanced error handling and connection monitoring
client.on('error', (error) => {
  console.error('[CLIENT ERROR]', toEdtIsoString(new Date()), error)
})

// Monitor connection status
client.on('shardReconnecting', (id) => {
  console.log(`[SHARD ${id}] Reconnecting...`, toEdtIsoString(new Date()))
})

client.on('shardReady', (id) => {
  console.log(`[SHARD ${id}] Ready!`, toEdtIsoString(new Date()))
})

client.on('shardDisconnect', (event, id) => {
  console.warn(`[SHARD ${id}] Disconnected:`, event)
})

client.on('shardResume', (id, replayedEvents) => {
  console.log(`[SHARD ${id}] Resumed, replayed ${replayedEvents} events`)
})

client.on('warn', (info) => {
  console.warn('[CLIENT WARNING]', info)
})

client.on('debug', (info) => {
  // Only log important debug info to reduce noise
  if (info.includes('Heartbeat') || info.includes('WS')) return
  if (process.env.DEBUG_BOT === 'true') {
    console.debug('[DEBUG]', info)
  }
})

// Handle regular messages (for ping/pong)
client.on('messageCreate', async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return
  
  // Simple ping/pong response
  if (message.content.toLowerCase() === 'ping' || message.content.toLowerCase() === '!ping') {
    try {
      await message.reply('pong! 🏓')
      console.log(`Replied to ping from ${message.author.tag}`)
    } catch (error) {
      console.error('Error replying to ping:', error)
    }
  }
})

// Login
const botToken = process.env.DISCORD_ENGAGEMENT_BOT_TOKEN || process.env.DISCORD_BOT_TOKEN
if (!botToken) {
  console.error('❌ No bot token found! Please set DISCORD_ENGAGEMENT_BOT_TOKEN in your .env.local file')
  console.error('   You need to create a separate Discord bot for the engagement bot')
  process.exit(1)
}

client.login(botToken)
  .then(() => console.log('🚀 Engagement bot starting...'))
  .catch((error) => {
    console.error('❌ Failed to login:', error)
    console.error('   Make sure DISCORD_ENGAGEMENT_BOT_TOKEN is set correctly in .env.local')
  }) 
