const cron = require('node-cron')
const { processBatch, checkRateLimit } = require('./engagement-batch-processor-v2')
const pmx = require('@pm2/io')

// Initialize required modules from engagement-batch-processor-v2.js
require('dotenv').config({ path: '../.env.local' })

// Register PM2 action
pmx.action('manual-run', async (reply) => {
  console.log('📨 Received manual-run action from PM2')
  
  try {
    const result = await runManualBatch((data) => {
      // Send progress updates through PM2
      reply(data)
    })
    reply({ success: true, result })
  } catch (error) {
    console.error('❌ Error in manual batch:', error)
    reply({ success: false, error: error.message })
  }
})

console.log('🤖 Starting Engagement Cron Job v2...')
console.log(`⏰ Current time: ${new Date().toISOString()}`)
console.log('📅 Schedule: Every hour at :00')
console.log('🎯 Manual trigger: pm2 trigger engagement-cron-v2 manual-run')

// Check if IPC is available
console.log('🔍 IPC Channel Available:', !!process.send)
console.log('🔍 Process PID:', process.pid)
console.log('🔍 PM2 Environment:', !!process.env.PM2_HOME)

// Check current rate limit status on startup
checkRateLimit().then(status => {
  console.log(`📊 Current rate limit: ${status.current}/${status.current + status.remaining} (${Math.round((status.current / 120) * 100)}% used)`)
  if (!status.allowed) {
    console.log(`⚠️  Rate limit exceeded! Will reset in ${status.resetIn} minutes`)
  }
}).catch(err => {
  console.error('Failed to check rate limit:', err)
})

// Manual trigger function
async function runManualBatch(sendResponse) {
  console.log('\n' + '='.repeat(80))
  console.log(`🎯 Manual batch processing triggered at ${new Date().toISOString()}`)
  console.log('='.repeat(80))
  
  try {
    // Check rate limit first
    const rateStatus = await checkRateLimit()
    console.log(`📊 Rate limit check: ${rateStatus.current}/120 used, ${rateStatus.remaining} remaining`)
    
    if (!rateStatus.allowed) {
      const message = `⚠️  Cannot run manual batch - rate limit exceeded. Reset in ${rateStatus.resetIn} minutes`
      console.log(message)
      if (sendResponse) sendResponse({ success: false, message })
      return
    }
    
    // Check if we have enough API calls for at least a few tweets
    if (rateStatus.remaining < 4) {
      const message = `⚠️  Cannot run manual batch - only ${rateStatus.remaining} API calls remaining (need at least 4)`
      console.log(message)
      if (sendResponse) sendResponse({ success: false, message })
      return
    }
    
    console.log('✅ Rate limit check passed, starting batch...')
    const result = await processBatch()
    
    const summary = `✅ Manual batch completed: ${result.tweetsProcessed} tweets, ${result.engagementsFound} engagements, ${result.pointsAwarded} points`
    console.log('\n' + summary)
    
    if (sendResponse) sendResponse({ 
      success: true, 
      message: summary,
      details: {
        tweetsProcessed: result.tweetsProcessed,
        engagementsFound: result.engagementsFound,
        pointsAwarded: result.pointsAwarded,
        apiCallsUsed: result.apiCallsUsed
      }
    })
  } catch (error) {
    const message = `❌ Manual batch failed: ${error.message}`
    console.error('\n' + message)
    if (sendResponse) sendResponse({ success: false, message })
  }
}

// PM2 action handler
process.on('message', (packet) => {
  // Debug logging to see what's being received
  console.log('🔍 PM2 Message Received:', {
    type: typeof packet,
    packet: packet,
    stringified: JSON.stringify(packet, null, 2)
  })
  
  // Handle different message formats
  if (packet === 'manual-run' || 
      packet.data === 'manual-run' || 
      packet.topic === 'manual-run' ||
      (packet.data && packet.data.cmd === 'manual-run')) {
    console.log('📨 Received manual-run trigger from PM2')
    
    // Send response back to PM2
    const sendResponse = (data) => {
      if (process.send) {
        process.send({
          type: 'process:msg',
          data: data
        })
      }
    }
    
    runManualBatch(sendResponse)
  } else {
    console.log('⚠️  Unrecognized PM2 message:', packet)
  }
})

// Add a simpler message handler to test
process.on('message', function(msg) {
  console.log('📬 Simple message handler received:', msg)
})

// Test if we can send messages
if (process.send) {
  process.send({
    type: 'process:msg',
    data: { ready: true, pid: process.pid }
  })
  console.log('📤 Sent ready message to PM2')
}

// Run batch processing every hour
cron.schedule('0 * * * *', async () => {
  console.log('\n' + '='.repeat(80))
  console.log(`⏰ Running scheduled batch processing at ${new Date().toISOString()}`)
  console.log('='.repeat(80))
  
  try {
    // Check rate limit before running
    const rateStatus = await checkRateLimit()
    if (!rateStatus.allowed) {
      console.log(`⚠️  Skipping batch - rate limit exceeded. Reset in ${rateStatus.resetIn} minutes`)
      return
    }
    
    const result = await processBatch()
    console.log('\n✅ Batch processing completed successfully')
    console.log(`📊 Summary: ${result.tweetsProcessed} tweets, ${result.engagementsFound} engagements, ${result.pointsAwarded} points awarded`)
  } catch (error) {
    console.error('\n❌ Batch processing failed:', error.message)
  }
})

// NO automatic run on startup - only scheduled runs
console.log('\n⏳ Cron job scheduled - will run every hour at :00')
console.log('📝 Logs are written to: logs/batch_processor_logs/')
console.log('⚠️  Note: No immediate batch run on startup to preserve API rate limits')

// Show next scheduled run
const now = new Date()
const nextHour = new Date(now)
nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
const minutesUntilNextRun = Math.round((nextHour - now) / 1000 / 60)
console.log(`⏭️  Next batch will run in ${minutesUntilNextRun} minutes at ${nextHour.toISOString()}`)

// Keep the process running
process.stdin.resume()

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Received SIGINT, shutting down gracefully...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n👋 Received SIGTERM, shutting down gracefully...')
  process.exit(0)
}) 