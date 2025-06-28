import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function verifyAllAnalytics() {
  console.log('🔍 Verifying All Analytics Data\n');
  
  try {
    const projectId = 'project:discord:OVPuPOX3_zHBnLUscRbdM'; // Ledger
    
    // Get all message IDs
    const messageIds = await redis.smembers(`discord:messages:project:${projectId}`);
    console.log(`📊 Total messages in project: ${messageIds.length}\n`);
    
    // 1. Verify Total Messages
    console.log('1️⃣ TOTAL MESSAGES VERIFICATION:');
    console.log('=' .repeat(50));
    console.log(`✅ Redis count: ${messageIds.length}`);
    console.log(`   Should match frontend "Total Messages" stat\n`);
    
    // 2. Verify Unique Users
    console.log('2️⃣ UNIQUE USERS VERIFICATION:');
    console.log('=' .repeat(50));
    const uniqueUsers = new Set();
    const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
    
    // Sample all messages for accurate counts
    let processedCount = 0;
    for (const messageId of messageIds) {
      try {
        const message = await redis.json.get(messageId);
        if (!message) continue;
        
        processedCount++;
        uniqueUsers.add(message.userId);
        
        if (message.sentiment?.score) {
          sentimentBreakdown[message.sentiment.score]++;
        }
      } catch (err) {
        // Skip errors
      }
      
      // Progress indicator
      if (processedCount % 500 === 0) {
        process.stdout.write(`\r   Processing: ${processedCount}/${messageIds.length} messages...`);
      }
    }
    
    console.log(`\r✅ Unique users: ${uniqueUsers.size}                              `);
    console.log(`   Should match frontend "Active Users" stat\n`);
    
    // 3. Verify Sentiment Breakdown
    console.log('3️⃣ SENTIMENT BREAKDOWN VERIFICATION:');
    console.log('=' .repeat(50));
    console.log(`✅ Positive: ${sentimentBreakdown.positive} messages`);
    console.log(`✅ Neutral: ${sentimentBreakdown.neutral} messages`);
    console.log(`✅ Negative: ${sentimentBreakdown.negative} messages`);
    console.log(`   Total with sentiment: ${sentimentBreakdown.positive + sentimentBreakdown.neutral + sentimentBreakdown.negative}`);
    console.log(`   Should match frontend "Sentiment Distribution" chart\n`);
    
    // 4. Verify Average Messages per User
    console.log('4️⃣ AVERAGE MESSAGES/USER VERIFICATION:');
    console.log('=' .repeat(50));
    const avgMessagesPerUser = uniqueUsers.size > 0 ? (processedCount / uniqueUsers.size).toFixed(1) : 0;
    console.log(`✅ Average: ${avgMessagesPerUser} messages/user`);
    console.log(`   Should match frontend "Avg Messages/User" stat\n`);
    
    // 5. Verify Sentiment Score
    console.log('5️⃣ SENTIMENT SCORE VERIFICATION:');
    console.log('=' .repeat(50));
    const sentimentScore = processedCount > 0 
      ? ((sentimentBreakdown.positive - sentimentBreakdown.negative) / processedCount * 100).toFixed(1)
      : 0;
    console.log(`✅ Sentiment Score: ${sentimentScore}%`);
    console.log(`   Should match frontend "Sentiment Score" stat\n`);
    
    // 6. Daily Trend Sample
    console.log('6️⃣ DAILY TREND SAMPLE:');
    console.log('=' .repeat(50));
    const dailyData = {};
    
    // Get last 7 days of data
    const today = new Date();
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split('T')[0]);
    }
    
    // Count messages per day
    let sampledForDaily = 0;
    for (const messageId of messageIds) {
      try {
        const message = await redis.json.get(messageId);
        if (!message || !message.timestamp) continue;
        
        const messageDate = message.timestamp.split('T')[0];
        if (last7Days.includes(messageDate)) {
          if (!dailyData[messageDate]) {
            dailyData[messageDate] = { count: 0, positive: 0, neutral: 0, negative: 0 };
          }
          dailyData[messageDate].count++;
          
          if (message.sentiment?.score) {
            dailyData[messageDate][message.sentiment.score]++;
          }
          sampledForDaily++;
        }
      } catch (err) {
        // Skip
      }
      
      // Limit sampling for performance
      if (sampledForDaily > 1000) break;
    }
    
    console.log('Last 7 days activity:');
    last7Days.forEach(date => {
      const data = dailyData[date] || { count: 0 };
      console.log(`   ${date}: ${data.count} messages`);
    });
    console.log(`   Should match frontend daily trend chart\n`);
    
    // Summary
    console.log('\n📋 VERIFICATION SUMMARY:');
    console.log('=' .repeat(50));
    console.log('All values above should exactly match what is displayed in the frontend.');
    console.log('If there are discrepancies, check:');
    console.log('1. API caching (30-second TTL)');
    console.log('2. Multiple dev servers running');
    console.log('3. Browser caching');
    console.log('4. Timeframe filters (daily/weekly/monthly)');
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    process.exit();
  }
}

verifyAllAnalytics(); 