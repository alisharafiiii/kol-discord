const Redis = require('@upstash/redis').Redis
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

async function investigateDateFiltering() {
  console.log('🔍 Investigating Discord Analytics Date Filtering Issues\n')
  
  const projectId = process.argv[2] || 'project:discord:OVPuPOX3_zHBnLUscRbdM'
  console.log(`Using project: ${projectId}`)
  
  try {
    // Get a sample of messages
    console.log('\n1. Fetching sample messages...')
    const messageIds = await redis.smembers(`discord:messages:project:${projectId}`)
    console.log(`Total messages in index: ${messageIds.length}`)
    
    // Take a sample of 100 messages
    const sampleIds = messageIds.slice(0, 100)
    const messages = []
    
    for (const messageId of sampleIds) {
      try {
        const message = await redis.json.get(messageId)
        if (message && message.timestamp) {
          messages.push(message)
        }
      } catch (error) {
        // Skip errors
      }
    }
    
    console.log(`Sample size: ${messages.length} messages`)
    
    // 2. Test date key generation
    console.log('\n2. Testing date key generation...')
    console.log('----------------------------------------')
    
    // Group messages by different date key methods
    const dateKeyMethods = {
      'toISOString().slice(0, 10)': {},
      'toLocaleDateString("en-CA")': {},
      'UTC manual': {},
      'Local timezone': {}
    }
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp)
      
      // Method 1: Current implementation
      const key1 = date.toISOString().slice(0, 10)
      dateKeyMethods['toISOString().slice(0, 10)'][key1] = 
        (dateKeyMethods['toISOString().slice(0, 10)'][key1] || 0) + 1
      
      // Method 2: LocaleDateString
      const key2 = date.toLocaleDateString('en-CA')
      dateKeyMethods['toLocaleDateString("en-CA")'][key2] = 
        (dateKeyMethods['toLocaleDateString("en-CA")'][key2] || 0) + 1
      
      // Method 3: UTC manual
      const key3 = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
      dateKeyMethods['UTC manual'][key3] = 
        (dateKeyMethods['UTC manual'][key3] || 0) + 1
      
      // Method 4: Local timezone
      const key4 = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      dateKeyMethods['Local timezone'][key4] = 
        (dateKeyMethods['Local timezone'][key4] || 0) + 1
    })
    
    // Compare results
    for (const [method, counts] of Object.entries(dateKeyMethods)) {
      console.log(`\n${method}:`)
      const sortedDates = Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))
      sortedDates.slice(0, 5).forEach(([date, count]) => {
        console.log(`  ${date}: ${count} messages`)
      })
    }
    
    // 3. Test weekly timeframe filtering
    console.log('\n3. Testing weekly timeframe filtering...')
    console.log('----------------------------------------')
    
    const now = new Date()
    const weeklyStart = new Date(now)
    weeklyStart.setDate(weeklyStart.getDate() - 7)
    weeklyStart.setHours(0, 0, 0, 0)
    
    console.log(`Now: ${now.toISOString()} (${now.toString()})`)
    console.log(`Weekly start: ${weeklyStart.toISOString()} (${weeklyStart.toString()})`)
    
    // Count messages using different filtering methods
    let method1Count = 0
    let method2Count = 0
    let method3Count = 0
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp)
      
      // Method 1: Direct comparison (current implementation)
      if (msgDate >= weeklyStart && msgDate <= now) {
        method1Count++
      }
      
      // Method 2: ISO string comparison
      if (msg.timestamp >= weeklyStart.toISOString() && msg.timestamp <= now.toISOString()) {
        method2Count++
      }
      
      // Method 3: Date only comparison (ignore time)
      const msgDateOnly = new Date(msgDate.toISOString().slice(0, 10) + 'T00:00:00.000Z')
      const startDateOnly = new Date(weeklyStart.toISOString().slice(0, 10) + 'T00:00:00.000Z')
      const endDateOnly = new Date(now.toISOString().slice(0, 10) + 'T23:59:59.999Z')
      
      if (msgDateOnly >= startDateOnly && msgDateOnly <= endDateOnly) {
        method3Count++
      }
    })
    
    console.log(`\nMessages in weekly range:`)
    console.log(`  Method 1 (Date object comparison): ${method1Count}`)
    console.log(`  Method 2 (ISO string comparison): ${method2Count}`)
    console.log(`  Method 3 (Date only comparison): ${method3Count}`)
    
    // 4. Check for timezone edge cases
    console.log('\n4. Checking timezone edge cases...')
    console.log('----------------------------------------')
    
    const edgeCases = messages.filter(msg => {
      const date = new Date(msg.timestamp)
      const hour = date.getUTCHours()
      return hour >= 22 || hour <= 2 // Messages near midnight UTC
    })
    
    console.log(`Found ${edgeCases.length} messages near midnight UTC`)
    
    if (edgeCases.length > 0) {
      console.log('\nSample edge cases:')
      edgeCases.slice(0, 5).forEach(msg => {
        const date = new Date(msg.timestamp)
        const dateKey = date.toISOString().slice(0, 10)
        console.log(`  ${msg.timestamp}`)
        console.log(`    -> UTC: ${date.toUTCString()}`)
        console.log(`    -> Local: ${date.toString()}`)
        console.log(`    -> Date key: ${dateKey}`)
      })
    }
    
    // 5. Simulate the exact analytics calculation
    console.log('\n5. Simulating exact analytics calculation...')
    console.log('----------------------------------------')
    
    // Recreate the exact logic from DiscordService
    const dailyData = {}
    let totalMessages = 0
    
    messages.forEach(msg => {
      const msgDate = new Date(msg.timestamp)
      
      // Filter by weekly timeframe
      if (msgDate < weeklyStart || msgDate > now) {
        return
      }
      
      totalMessages++
      
      // Generate date key exactly as in the service
      const dateKey = msgDate.toISOString().slice(0, 10)
      dailyData[dateKey] = (dailyData[dateKey] || 0) + 1
    })
    
    console.log(`Total messages (simulated): ${totalMessages}`)
    console.log('Daily breakdown:')
    Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([date, count]) => {
        console.log(`  ${date}: ${count}`)
      })
    
    // 6. Compare with aggregated sum
    const dailySum = Object.values(dailyData).reduce((sum, count) => sum + count, 0)
    console.log(`\nSum of daily counts: ${dailySum}`)
    console.log(`Total messages: ${totalMessages}`)
    console.log(`Match: ${dailySum === totalMessages ? '✅ YES' : '❌ NO'}`)
    
    // 7. Recommendations
    console.log('\n📊 FINDINGS AND RECOMMENDATIONS:')
    console.log('================================')
    console.log('\n1. DATE KEY GENERATION:')
    console.log('   Current: date.toISOString().slice(0, 10)')
    console.log('   This converts to UTC date, which may differ from local date')
    console.log('   Example: 2024-06-24T23:00:00-04:00 becomes 2024-06-25 in UTC')
    
    console.log('\n2. DATE FILTERING:')
    console.log('   Weekly start uses setHours(0,0,0,0) which sets to LOCAL midnight')
    console.log('   But date keys use UTC dates')
    console.log('   This can cause boundary issues')
    
    console.log('\n3. RECOMMENDED FIXES:')
    console.log('   a) Use consistent timezone throughout (preferably UTC)')
    console.log('   b) When setting weekly start, use UTC methods:')
    console.log('      weeklyStart.setUTCHours(0, 0, 0, 0)')
    console.log('   c) Consider storing pre-calculated date keys in messages')
    console.log('   d) Add timezone parameter to analytics API')
    
  } catch (error) {
    console.error('Error:', error)
  }
}

// Run the investigation
investigateDateFiltering().catch(console.error) 