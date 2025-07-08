const { config } = require('dotenv')
const path = require('path')

// Load environment variables
config({ path: path.join(__dirname, '..', '.env.local') })

// Import the batch processor
const batchProcessor = require('./engagement-batch-processor-v2.js')

console.log('\n' + '='.repeat(80))
console.log('🚀 ENGAGEMENT BATCH PROCESSOR - TEST RUN')
console.log('='.repeat(80))
console.log('This test will demonstrate the enhanced logging features:')
console.log('  • Current points configuration from database')
console.log('  • Twitter API rate limit status')
console.log('  • Detailed points calculations')
console.log('  • API usage tracking per tweet')
console.log('='.repeat(80) + '\n')

// Run the batch processor
async function runTest() {
  try {
    console.log('Starting batch processing...\n')
    await batchProcessor.processBatch()
    console.log('\n✅ Batch processing completed successfully!')
  } catch (error) {
    console.error('\n❌ Error during batch processing:', error.message)
  } finally {
    // Exit after completion
    process.exit(0)
  }
}

// Run the test
runTest() 