const Redis = require('@upstash/redis').Redis
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function investigateJuneData() {
  console.log('🔍 Investigating Discord Analytics Data Discrepancy for June 24-25\n')
  
  // Test project ID - using Ledger project as example
  const projectId = process.argv[2] || 'project:discord:OVPuPOX3_zHBnLUscRbdM' // Pass project ID as argument or use Ledger as default
  
  try {
    // Step 1: Get all message IDs for the project
    console.log('Step 1: Fetching all message IDs...')
    const messageIds = await redis.smembers(`discord:messages:project:${projectId}`)
    console.log(`Total message IDs found: ${messageIds.length}`)
    
    // Step 2: Process messages to count by date
    console.log('\nStep 2: Processing messages by date...')
    const dateCounts = {}
    const june24Messages = []
    const june25Messages = []
    let processedCount = 0
    let errorCount = 0
    
    // Process in batches
    const batchSize = 50
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (messageId) => {
          try {
            const message = await redis.json.get(messageId)
            return { messageId, message }
          } catch (error) {
            errorCount++
            return { messageId, error: error.message }
          }
        })
      )
      
      for (const result of batchResults) {
        if (result.error) {
          continue
        }
        
        const message = result.message
        if (!message || !message.timestamp) {
          continue
        }
        
        processedCount++
        
        // Parse timestamp
        const msgDate = new Date(message.timestamp)
        const dateKey = msgDate.toISOString().slice(0, 10)
        
        // Count by date
        dateCounts[dateKey] = (dateCounts[dateKey] || 0) + 1
        
        // Collect June 24-25 messages for detailed analysis
        if (dateKey === '2024-06-24') {
          june24Messages.push({
            id: message.id || result.messageId,
            timestamp: message.timestamp,
            parsedDate: msgDate.toString(),
            dateKey,
            username: message.username,
            content: message.content?.substring(0, 50) + '...'
          })
        } else if (dateKey === '2024-06-25') {
          june25Messages.push({
            id: message.id || result.messageId,
            timestamp: message.timestamp,
            parsedDate: msgDate.toString(),
            dateKey,
            username: message.username,
            content: message.content?.substring(0, 50) + '...'
          })
        }
      }
      
      // Progress update
      if (i % 500 === 0) {
        process.stdout.write(`\rProcessed: ${i}/${messageIds.length} messages...`)
      }
    }
    
    console.log(`\n\nProcessed ${processedCount} messages successfully`)
    console.log(`Errors encountered: ${errorCount}`)
    
    // Step 3: Display date counts for June 2024
    console.log('\nStep 3: Message counts by date (June 2024):')
    console.log('============================================')
    
    const juneDates = Object.keys(dateCounts)
      .filter(date => date.startsWith('2024-06'))
      .sort()
    
    let juneTotal = 0
    for (const date of juneDates) {
      const count = dateCounts[date]
      juneTotal += count
      console.log(`${date}: ${count} messages ${date === '2024-06-24' || date === '2024-06-25' ? '⚠️' : ''}`)
    }
    console.log(`\nTotal June 2024 messages: ${juneTotal}`)
    
    // Step 4: Detailed analysis of June 24-25
    console.log('\nStep 4: Detailed Analysis of June 24-25:')
    console.log('========================================')
    console.log(`June 24: ${june24Messages.length} messages`)
    console.log(`June 25: ${june25Messages.length} messages`)
    
    // Show sample messages from each day
    console.log('\nSample messages from June 24:')
    june24Messages.slice(0, 3).forEach(msg => {
      console.log(`  - ${msg.timestamp} | @${msg.username}: ${msg.content}`)
    })
    
    console.log('\nSample messages from June 25:')
    june25Messages.slice(0, 3).forEach(msg => {
      console.log(`  - ${msg.timestamp} | @${msg.username}: ${msg.content}`)
    })
    
    // Step 5: Check timezone issues
    console.log('\nStep 5: Timezone Analysis:')
    console.log('=========================')
    
    // Check timestamps around midnight
    const midnightMessages = [...june24Messages, ...june25Messages]
      .filter(msg => {
        const hour = new Date(msg.timestamp).getUTCHours()
        return hour >= 22 || hour <= 2
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    
    console.log('\nMessages around midnight UTC (22:00-02:00):')
    midnightMessages.slice(0, 10).forEach(msg => {
      const date = new Date(msg.timestamp)
      console.log(`  ${msg.timestamp} (UTC: ${date.toUTCString()}) -> dateKey: ${msg.dateKey}`)
    })
    
    // Step 6: Simulate weekly timeframe calculation
    console.log('\nStep 6: Simulating Weekly Timeframe (like the UI):')
    console.log('==================================================')
    
    const now = new Date()
    const weeklyStart = new Date(now)
    weeklyStart.setDate(weeklyStart.getDate() - 7)
    weeklyStart.setHours(0, 0, 0, 0)
    
    console.log(`Current time: ${now.toISOString()}`)
    console.log(`Weekly start: ${weeklyStart.toISOString()}`)
    console.log(`Weekly end: ${now.toISOString()}`)
    
    // Count messages in weekly timeframe
    let weeklyTotal = 0
    const weeklyDailyCounts = {}
    
    for (const [dateKey, count] of Object.entries(dateCounts)) {
      const date = new Date(dateKey + 'T00:00:00Z')
      if (date >= weeklyStart && date <= now) {
        weeklyTotal += count
        weeklyDailyCounts[dateKey] = count
      }
    }
    
    console.log(`\nMessages in weekly timeframe: ${weeklyTotal}`)
    console.log('Daily breakdown:')
    Object.entries(weeklyDailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => {
        console.log(`  ${date}: ${count}`)
      })
    
    // Step 7: Check for orphaned messages
    console.log('\nStep 7: Checking for potential issues:')
    console.log('=====================================')
    
    // Check for messages with invalid timestamps
    const invalidTimestamps = []
    for (const msg of [...june24Messages, ...june25Messages]) {
      const date = new Date(msg.timestamp)
      if (isNaN(date.getTime())) {
        invalidTimestamps.push(msg)
      }
    }
    
    if (invalidTimestamps.length > 0) {
      console.log(`⚠️  Found ${invalidTimestamps.length} messages with invalid timestamps`)
    } else {
      console.log('✅ All timestamps are valid')
    }
    
    // Summary
    console.log('\n📊 SUMMARY:')
    console.log('===========')
    console.log(`Total messages in index: ${messageIds.length}`)
    console.log(`Successfully processed: ${processedCount}`)
    console.log(`June 24 messages: ${june24Messages.length}`)
    console.log(`June 25 messages: ${june25Messages.length}`)
    console.log(`\nPotential issues to investigate:`)
    console.log('- Timezone handling in date filtering')
    console.log('- Date key generation using toISOString().slice(0, 10)')
    console.log('- Start/end date boundary conditions in weekly view')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the investigation
investigateJuneData().catch(console.error) 