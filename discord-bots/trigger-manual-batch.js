#!/usr/bin/env node

const { exec } = require('child_process')
const { processBatch } = require('./engagement-batch-processor-v2')

async function triggerManualBatch() {
  console.log('🎯 Manual Batch Trigger Script')
  console.log('='.repeat(60))
  
  try {
    console.log('\n✅ Starting batch processing...')
    
    const result = await processBatch()
    
    console.log('\n' + '='.repeat(60))
    console.log('✅ Manual batch completed successfully!')
    
    if (result) {
      console.log('\n📊 Results:')
      console.log(`- Tweets processed: ${result.tweetsProcessed || 0}`)
      console.log(`- Engagements found: ${result.engagementsFound || 0}`)
      console.log(`- Points awarded: ${result.pointsAwarded || 0}`)
      console.log(`- API calls used: ${result.apiCallsUsed || 0}`)
      
      if (result.status === 'paused_rate_limit') {
        console.log('\n⚠️  Batch paused due to rate limit')
        console.log(`Will automatically resume at: ${result.willResumeAt}`)
      }
    }
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Manual batch failed:', error.message)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  triggerManualBatch()
} 