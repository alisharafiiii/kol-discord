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
console.log('🔧 FIXING ENGAGEMENT POINTS CONFIGURATION')
console.log('='.repeat(80))
console.log('Setting points to expected values: Like=10, Comment=20, RT=35')
console.log('='.repeat(80) + '\n')

async function fixPointsConfiguration() {
  try {
    const tiers = ['micro', 'rising', 'star', 'legend', 'hero']
    
    console.log('📊 Current Configuration:')
    console.log('='.repeat(50))
    
    // Show current configuration first
    for (const tier of tiers) {
      const retweetRule = await redis.json.get(`engagement:rules:${tier}-retweet`)
      const replyRule = await redis.json.get(`engagement:rules:${tier}-reply`)
      const likeRule = await redis.json.get(`engagement:rules:${tier}-like`)
      
      console.log(`\n${tier.toUpperCase()} Tier (Current):`)
      console.log(`   • Retweet: ${retweetRule?.points || 35} points`)
      console.log(`   • Reply/Comment: ${replyRule?.points || 20} points`)
      console.log(`   • Like: ${likeRule?.points || 10} points`)
    }
    
    console.log('\n\n🔧 Updating Configuration...')
    console.log('='.repeat(50))
    
    // Set all tiers to the base values that users expect
    const basePoints = {
      retweet: 35,
      reply: 20,  // This is "comment" in user terminology
      like: 10
    }
    
    for (const tier of tiers) {
      // Create or update retweet rule
      await redis.json.set(`engagement:rules:${tier}-retweet`, '$', {
        points: basePoints.retweet,
        description: `Retweet engagement for ${tier} tier`,
        updatedAt: new Date().toISOString()
      })
      
      // Create or update reply rule (comments)
      await redis.json.set(`engagement:rules:${tier}-reply`, '$', {
        points: basePoints.reply,
        description: `Reply/Comment engagement for ${tier} tier`,
        updatedAt: new Date().toISOString()
      })
      
      // Create or update like rule
      await redis.json.set(`engagement:rules:${tier}-like`, '$', {
        points: basePoints.like,
        description: `Like engagement for ${tier} tier`,
        updatedAt: new Date().toISOString()
      })
      
      console.log(`\n✅ Updated ${tier.toUpperCase()} tier`)
    }
    
    console.log('\n\n📊 New Configuration:')
    console.log('='.repeat(50))
    
    // Verify the changes
    for (const tier of tiers) {
      const retweetRule = await redis.json.get(`engagement:rules:${tier}-retweet`)
      const replyRule = await redis.json.get(`engagement:rules:${tier}-reply`)
      const likeRule = await redis.json.get(`engagement:rules:${tier}-like`)
      
      console.log(`\n${tier.toUpperCase()} Tier (Updated):`)
      console.log(`   • Retweet: ${retweetRule?.points} points`)
      console.log(`   • Reply/Comment: ${replyRule?.points} points`)
      console.log(`   • Like: ${likeRule?.points} points`)
    }
    
    console.log('\n\n💡 Additional Fixes Needed:')
    console.log('='.repeat(60))
    console.log('\n1. Clear stuck interactions to allow re-awarding points:')
    console.log('   Run: node clear-stuck-interactions.js')
    
    console.log('\n2. Increase batch processing frequency:')
    console.log('   Currently running every 30 minutes, consider every 15 minutes')
    
    console.log('\n3. Handle rate limit errors better:')
    console.log('   - Implement retry logic for 429 errors')
    console.log('   - Process failed tweets in next batch')
    
    console.log('\n4. Monitor high-engagement tweets:')
    console.log('   - Tweets with >100 engagements need manual review')
    console.log('   - Consider implementing pagination')
    
    console.log('\n✅ Points configuration has been fixed!')
    console.log('   All tiers now use: RT=35, Comment=20, Like=10')
    
  } catch (error) {
    console.error('❌ Error fixing configuration:', error)
  } finally {
    process.exit(0)
  }
}

// Run the fix
fixPointsConfiguration() 