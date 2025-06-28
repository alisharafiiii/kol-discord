import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function summarizeSentiment() {
  const targetDates = ['2025-06-17', '2025-06-20', '2025-06-24'];
  const results = {};
  
  // Initialize results
  targetDates.forEach(date => {
    results[date] = {
      totalMessages: 0,
      withSentiment: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      missing: []
    };
  });
  
  try {
    // Get all Discord projects
    const projectKeys = await redis.keys('project:discord:*');
    
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey);
      if (!project || !project.isActive) continue;
      
      const messageKeys = await redis.smembers(`discord:messages:project:${project.id}`);
      
      // Process messages in batches to avoid timeout
      const batchSize = 100;
      for (let i = 0; i < messageKeys.length; i += batchSize) {
        const batch = messageKeys.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (messageKey) => {
          try {
            const message = await redis.json.get(messageKey);
            if (!message || !message.timestamp) return;
            
            const messageDate = message.timestamp.split('T')[0];
            if (!targetDates.includes(messageDate)) return;
            
            results[messageDate].totalMessages++;
            
            if (message.sentiment) {
              const score = message.sentiment.score || message.sentiment;
              results[messageDate].withSentiment++;
              
              if (score === 'positive') results[messageDate].positive++;
              else if (score === 'neutral') results[messageDate].neutral++;
              else if (score === 'negative') results[messageDate].negative++;
              else {
                results[messageDate].missing.push({
                  id: message.id,
                  user: message.username,
                  sentiment: score
                });
              }
            } else {
              results[messageDate].missing.push({
                id: message.id,
                user: message.username,
                content: message.content?.substring(0, 50)
              });
            }
          } catch (err) {
            // Skip errors
          }
        }));
      }
    }
    
    // Print results
    console.log('📊 DISCORD SENTIMENT ANALYSIS RESULTS\n');
    
    for (const date of targetDates) {
      const r = results[date];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📅 DATE: ${date}`);
      console.log('='.repeat(60));
      
      console.log(`\n✅ CLEARLY PROVIDED TOTAL: ${r.totalMessages} messages`);
      
      if (r.totalMessages === 0) {
        console.log('   No messages found for this date');
        continue;
      }
      
      console.log(`\n📊 SENTIMENT TAGGING STATUS:`);
      console.log(`   ✅ Messages WITH sentiment tags: ${r.withSentiment}`);
      console.log(`   ❌ Messages WITHOUT sentiment tags: ${r.totalMessages - r.withSentiment}`);
      
      if (r.missing.length > 0 && r.missing.length <= 10) {
        console.log(`\n   MESSAGES WITHOUT PROPER TAGS:`);
        r.missing.forEach(m => {
          console.log(`   - ${m.id}`);
          console.log(`     User: @${m.user}`);
          if (m.sentiment) console.log(`     Invalid sentiment: "${m.sentiment}"`);
          if (m.content) console.log(`     Content: ${m.content}...`);
        });
      } else if (r.missing.length > 10) {
        console.log(`\n   ⚠️  ${r.missing.length} messages without proper sentiment tags (too many to list)`);
      }
      
      console.log(`\n📈 SENTIMENT PERCENTAGES:`);
      const posPercent = r.totalMessages > 0 ? (r.positive / r.totalMessages * 100).toFixed(1) : 0;
      const neuPercent = r.totalMessages > 0 ? (r.neutral / r.totalMessages * 100).toFixed(1) : 0;
      const negPercent = r.totalMessages > 0 ? (r.negative / r.totalMessages * 100).toFixed(1) : 0;
      
      console.log(`   😊 Positive: ${posPercent}% (${r.positive} messages)`);
      console.log(`   😐 Neutral: ${neuPercent}% (${r.neutral} messages)`);
      console.log(`   😞 Negative: ${negPercent}% (${r.negative} messages)`);
      console.log(`   ─────────────────────────────`);
      
      const totalPercent = parseFloat(posPercent) + parseFloat(neuPercent) + parseFloat(negPercent);
      console.log(`   TOTAL: ${totalPercent.toFixed(1)}%`);
      
      console.log(`\n✅ EXPLICIT CONFIRMATION:`);
      if (r.totalMessages === r.withSentiment && Math.abs(totalPercent - 100) < 0.1) {
        console.log(`   ✅ All messages have sentiment tags`);
        console.log(`   ✅ Percentages add up to 100%`);
        console.log(`   ✅ NO CALCULATION BUG - Data is correct`);
      } else {
        console.log(`   ❌ ISSUE DETECTED:`);
        if (r.totalMessages !== r.withSentiment) {
          console.log(`   - ${r.totalMessages - r.withSentiment} messages missing sentiment tags`);
        }
        if (Math.abs(totalPercent - 100) >= 0.1) {
          console.log(`   - Percentages only add up to ${totalPercent.toFixed(1)}%`);
          console.log(`   - CALCULATION BUG: Missing ${(100 - totalPercent).toFixed(1)}% of data`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

summarizeSentiment(); 