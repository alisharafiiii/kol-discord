const cron = require('node-cron')
const { processBatch } = require('./engagement-batch-processor-v2')

console.log('🤖 Starting Engagement Cron Job v2...')
console.log(`⏰ Current time: ${new Date().toISOString()}`)
console.log('📅 Schedule: Every hour at :00')

// Run batch processing every hour
cron.schedule('0 * * * *', async () => {
  console.log('\n' + '='.repeat(80))
  console.log(`⏰ Running scheduled batch processing at ${new Date().toISOString()}`)
  console.log('='.repeat(80))
  
  try {
    const result = await processBatch()
    console.log('\n✅ Batch processing completed successfully')
    console.log(`📊 Summary: ${result.tweetsProcessed} tweets, ${result.engagementsFound} engagements, ${result.pointsAwarded} points awarded`)
  } catch (error) {
    console.error('\n❌ Batch processing failed:', error.message)
  }
})

// Also run once on startup
console.log('\n🚀 Running initial batch processing...')
processBatch()
  .then((result) => {
    console.log('✅ Initial batch completed')
    console.log(`📊 Summary: ${result.tweetsProcessed} tweets, ${result.engagementsFound} engagements, ${result.pointsAwarded} points awarded`)
  })
  .catch(error => console.error('❌ Initial batch failed:', error))

console.log('\n⏳ Cron job scheduled - will run every hour at :00')
console.log('📝 Logs are written to: logs/batch_processor_logs/')

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