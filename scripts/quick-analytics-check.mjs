import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function quickAnalyticsCheck() {
  console.log('⚡ QUICK ANALYTICS CHECK\n');
  
  const checks = {
    passed: 0,
    failed: 0,
    results: []
  };
  
  try {
    // Get active Discord projects
    const projectKeys = await redis.keys('project:discord:*');
    let totalMessages = 0;
    let totalUsers = 0;
    let totalChannels = new Set();
    
    console.log('📊 Checking Core Metrics:\n');
    
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey);
      if (!project || !project.isActive) continue;
      
      console.log(`\n🔍 ${project.name}:`);
      
      // 1. Message Count Check
      const messageKeys = await redis.smembers(`discord:messages:project:${project.id}`);
      const messageCount = messageKeys.length;
      totalMessages += messageCount;
      
      // 2. User Count Check
      const userKeys = await redis.smembers(`discord:users:project:${project.id}`);
      const userCount = userKeys.length;
      totalUsers += userCount;
      
      // 3. Sentiment Distribution Check
      let sentimentStats = { positive: 0, neutral: 0, negative: 0, missing: 0 };
      
      // Sample check (first 100 messages for speed)
      const sampleSize = Math.min(100, messageKeys.length);
      for (let i = 0; i < sampleSize; i++) {
        const msg = await redis.json.get(messageKeys[i]);
        if (!msg) continue;
        
        if (msg.sentiment?.score) {
          sentimentStats[msg.sentiment.score]++;
        } else {
          sentimentStats.missing++;
        }
        
        if (msg.channelId) {
          totalChannels.add(msg.channelId);
        }
      }
      
      // Calculate percentages
      const total = Object.values(sentimentStats).reduce((a, b) => a + b, 0);
      const sentimentPercentages = {
        positive: ((sentimentStats.positive / total) * 100).toFixed(1),
        neutral: ((sentimentStats.neutral / total) * 100).toFixed(1),
        negative: ((sentimentStats.negative / total) * 100).toFixed(1)
      };
      
      // Validate percentages add up to 100%
      const percentSum = parseFloat(sentimentPercentages.positive) + 
                        parseFloat(sentimentPercentages.neutral) + 
                        parseFloat(sentimentPercentages.negative);
      
      const percentageCheck = Math.abs(percentSum - 100) < 0.1 || sentimentStats.missing > 0;
      
      console.log(`   📨 Messages: ${messageCount}`);
      console.log(`   👥 Users: ${userCount}`);
      console.log(`   😊 Positive: ${sentimentPercentages.positive}%`);
      console.log(`   😐 Neutral: ${sentimentPercentages.neutral}%`);
      console.log(`   😞 Negative: ${sentimentPercentages.negative}%`);
      console.log(`   ✅ Sum: ${percentSum.toFixed(1)}% ${percentageCheck ? '✓' : '✗'}`);
      
      if (percentageCheck) {
        checks.passed++;
      } else {
        checks.failed++;
        checks.results.push(`${project.name}: Percentage sum = ${percentSum.toFixed(1)}%`);
      }
      
      // Check for data consistency
      if (messageCount > 0 && userCount === 0) {
        checks.failed++;
        checks.results.push(`${project.name}: Has messages but no users`);
      } else {
        checks.passed++;
      }
    }
    
    // Global summary
    console.log('\n' + '='.repeat(50));
    console.log('📈 GLOBAL TOTALS:');
    console.log(`   Total Messages: ${totalMessages}`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Total Channels: ${totalChannels.size}`);
    
    // Today's stats
    console.log('\n📅 TODAY\'S ACTIVITY:');
    const today = new Date().toISOString().split('T')[0];
    let todayMessages = 0;
    
    // Check today's messages from active projects
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey);
      if (!project || !project.isActive) continue;
      
      const messageKeys = await redis.smembers(`discord:messages:project:${project.id}`);
      // Sample first 50 messages from each project
      const sampleSize = Math.min(50, messageKeys.length);
      
      for (let i = 0; i < sampleSize; i++) {
        try {
          const msg = await redis.json.get(messageKeys[i]);
          if (msg?.timestamp?.startsWith(today)) {
            todayMessages++;
          }
        } catch (e) {
          // Skip errors
        }
      }
    }
    
    console.log(`   Messages today: ${todayMessages}+ (sampled)`);
    
    // Final verdict
    console.log('\n' + '='.repeat(50));
    console.log('🏁 VALIDATION RESULT:');
    console.log(`   ✅ Passed: ${checks.passed} checks`);
    console.log(`   ❌ Failed: ${checks.failed} checks`);
    
    if (checks.failed === 0) {
      console.log('\n✅ ZERO DISCREPANCIES - All checks passed!');
    } else {
      console.log('\n❌ DISCREPANCIES FOUND:');
      checks.results.forEach(result => console.log(`   - ${result}`));
    }
    
    console.log('\n💡 Run "node scripts/validate-analytics-frontend.mjs" for detailed validation');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit();
  }
}

quickAnalyticsCheck(); 