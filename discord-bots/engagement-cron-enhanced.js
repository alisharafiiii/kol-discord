const cron = require('node-cron')
const { processBatch } = require('./engagement-batch-processor-enhanced')

console.log('🤖 Starting Enhanced Engagement Cron Job...')
console.log(`📅 Started at: ${new Date().toLocaleString()}`)
console.log(`⏱️ Schedule: Every 30 minutes`)
console.log('─'.repeat(60))

// Track batch statistics
let totalBatches = 0
let successfulBatches = 0
let failedBatches = 0

// Run batch processing every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  totalBatches++
  console.log(`\n⏰ Running scheduled batch #${totalBatches} at ${new Date().toLocaleString()}`)
  
  try {
    await processBatch()
    successfulBatches++
    console.log(`✅ Batch #${totalBatches} completed successfully`)
  } catch (error) {
    failedBatches++
    console.error(`❌ Batch #${totalBatches} failed:`, error.message)
  }
  
  // Log statistics
  console.log(`\n📊 Batch Statistics:`)
  console.log(`   ├─ Total: ${totalBatches}`)
  console.log(`   ├─ Successful: ${successfulBatches}`)
  console.log(`   ├─ Failed: ${failedBatches}`)
  console.log(`   └─ Success Rate: ${Math.round((successfulBatches / totalBatches) * 100)}%`)
})

// Listen for PM2 messages to trigger manual batch
process.on('message', async (msg) => {
  if (msg === 'manual-run' || (msg.data && msg.data.action === 'manual-run')) {
    console.log('\n🚀 Manual batch triggered via PM2 message')
    totalBatches++
    
    try {
      await processBatch()
      successfulBatches++
      console.log(`✅ Manual batch #${totalBatches} completed successfully`)
      
      // Send success response
      if (process.send) {
        process.send({
          type: 'manual-run-complete',
          success: true,
          batchNumber: totalBatches
        })
      }
    } catch (error) {
      failedBatches++
      console.error(`❌ Manual batch #${totalBatches} failed:`, error.message)
      
      // Send error response
      if (process.send) {
        process.send({
          type: 'manual-run-complete',
          success: false,
          error: error.message,
          batchNumber: totalBatches
        })
      }
    }
  }
})

// Run initial batch on startup
console.log('\n🚀 Running initial batch processing...')
totalBatches++

processBatch()
  .then(() => {
    successfulBatches++
    console.log(`✅ Initial batch #${totalBatches} completed successfully`)
  })
  .catch(error => {
    failedBatches++
    console.error(`❌ Initial batch #${totalBatches} failed:`, error.message)
  })

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down engagement cron job...')
  console.log(`📊 Final Statistics:`)
  console.log(`   ├─ Total Batches: ${totalBatches}`)
  console.log(`   ├─ Successful: ${successfulBatches}`)
  console.log(`   ├─ Failed: ${failedBatches}`)
  console.log(`   └─ Success Rate: ${Math.round((successfulBatches / totalBatches) * 100)}%`)
  process.exit(0)
})

// Keep the process running
process.stdin.resume()

console.log('\n✅ Enhanced engagement cron job is ready!')
console.log('📋 Features:')
console.log('   ├─ Detailed batch logging')
console.log('   ├─ User engagement tracking')
console.log('   ├─ Rate limit handling')
console.log('   ├─ Discord role synchronization')
console.log('   └─ PM2 manual trigger support') 