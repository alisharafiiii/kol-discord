const { config } = require('dotenv')
const path = require('path')
const { Redis } = require('@upstash/redis')

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Redis
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
})

console.log('\n' + '='.repeat(80))
console.log('🔍 CHECKING ENGAGEMENT CONNECTIONS AND POINTS')
console.log('='.repeat(80))
console.log('This will show all Discord connections and their current points')
console.log('='.repeat(80) + '\n')

async function checkEngagementConnections() {
  try {
    // 1. Get all engagement connections
    console.log('📊 Step 1: Finding all engagement connections...')
    console.log('='.repeat(50))
    
    let cursor = 0
    let totalConnections = 0
    let connectionsWithPoints = 0
    let totalPointsSum = 0
    const connectionsList = []
    
    do {
      const result = await redis.scan(cursor, {
        match: 'engagement:connection:*',
        count: 100
      })
      
      cursor = result[0]
      const connectionKeys = result[1]
      
      for (const key of connectionKeys) {
        const connection = await redis.json.get(key)
        if (!connection) continue
        
        totalConnections++
        const points = connection.totalPoints || 0
        if (points > 0) connectionsWithPoints++
        totalPointsSum += points
        
        connectionsList.push({
          discordId: connection.discordId,
          twitterHandle: connection.twitterHandle,
          tier: connection.tier || 'micro',
          totalPoints: points,
          key: key
        })
      }
    } while (cursor !== 0)
    
    // Sort by points (highest first)
    connectionsList.sort((a, b) => b.totalPoints - a.totalPoints)
    
    // Show all connections
    console.log('\n📋 ALL CONNECTIONS:')
    console.log('='.repeat(80))
    console.log('Discord ID'.padEnd(20) + ' | ' + 
                'Twitter Handle'.padEnd(20) + ' | ' + 
                'Tier'.padEnd(10) + ' | ' + 
                'Points')
    console.log('-'.repeat(80))
    
    connectionsList.forEach(conn => {
      console.log(
        conn.discordId.padEnd(20) + ' | ' +
        `@${conn.twitterHandle}`.padEnd(20) + ' | ' +
        conn.tier.padEnd(10) + ' | ' +
        conn.totalPoints
      )
    })
    
    console.log('\n\n📊 SUMMARY:')
    console.log('='.repeat(60))
    console.log(`  • Total connections: ${totalConnections}`)
    console.log(`  • Connections with points > 0: ${connectionsWithPoints}`)
    console.log(`  • Total points across all users: ${totalPointsSum}`)
    
    // Check recent transactions
    console.log('\n\n📜 RECENT POINT TRANSACTIONS:')
    console.log('='.repeat(60))
    
    const recentTransactions = await redis.zrange('engagement:transactions:recent', 0, 9, { rev: true })
    
    if (recentTransactions.length === 0) {
      console.log('No recent transactions found')
    } else {
      for (const transactionId of recentTransactions) {
        const transaction = await redis.json.get(`engagement:transaction:${transactionId}`)
        if (transaction) {
          console.log(`\n• ${transaction.userName} | ${transaction.points > 0 ? '+' : ''}${transaction.points} points`)
          console.log(`  Action: ${transaction.action}`)
          console.log(`  Reason: ${transaction.description}`)
          console.log(`  Time: ${new Date(transaction.timestamp).toLocaleString()}`)
          console.log(`  By: ${transaction.adminName || 'System'}`)
        }
      }
    }
    
    // Test point update for a specific user
    if (connectionsList.length > 0) {
      console.log('\n\n🧪 TESTING POINT UPDATE:')
      console.log('='.repeat(60))
      
      const testUser = connectionsList[0] // Use first user as test
      console.log(`\nTesting point update for @${testUser.twitterHandle}...`)
      console.log(`Current points: ${testUser.totalPoints}`)
      
      // Add 100 test points
      const testPoints = 100
      await redis.json.numincrby(testUser.key, '$.totalPoints', testPoints)
      
      // Read back
      const updatedConnection = await redis.json.get(testUser.key)
      const newPoints = updatedConnection.totalPoints || 0
      
      console.log(`After adding ${testPoints} points: ${newPoints}`)
      
      // Revert the test
      await redis.json.numincrby(testUser.key, '$.totalPoints', -testPoints)
      console.log(`Reverted test points (back to ${testUser.totalPoints})`)
      
      if (newPoints === testUser.totalPoints + testPoints) {
        console.log('✅ Point update mechanism is working correctly!')
      } else {
        console.log('❌ Point update mechanism may have issues')
      }
    }
    
    console.log('\n\n💡 TROUBLESHOOTING TIPS:')
    console.log('='.repeat(60))
    console.log('If points aren\'t updating from admin panel:')
    console.log('1. Check browser console for errors')
    console.log('2. Ensure users have Discord connections (they need to /connect first)')
    console.log('3. Check that the admin session has proper role (admin or core)')
    console.log('4. Verify the API endpoint is accessible: /api/engagement/adjust-points')
    console.log('5. Make sure you\'re clicking "Save" after entering new points')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    process.exit(0)
  }
}

// Run the check
checkEngagementConnections() 