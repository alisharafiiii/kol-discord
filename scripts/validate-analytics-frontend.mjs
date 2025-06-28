import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function validateAnalytics() {
  console.log(`${colors.blue}🔍 ANALYTICS VALIDATION SCRIPT${colors.reset}\n`);
  console.log('This script validates frontend analytics against Redis data\n');
  
  const validationResults = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  try {
    // 1. Get all Discord projects
    console.log('1️⃣ Loading Discord Projects...');
    const projectKeys = await redis.keys('project:discord:*');
    const activeProjects = [];
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key);
      if (project && project.isActive) {
        activeProjects.push(project);
        console.log(`   ✓ ${project.name} (${project.id})`);
      }
    }
    
    // 2. Validate each project's data
    for (const project of activeProjects) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 Validating: ${project.name}`);
      console.log('='.repeat(60));
      
      // Get all messages for this project
      const messageKeys = await redis.smembers(`discord:messages:project:${project.id}`);
      console.log(`\n📨 Total messages in Redis: ${messageKeys.length}`);
      
      // Validate message data integrity
      const messageStats = {
        total: 0,
        withSentiment: 0,
        sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
        byDate: {},
        byChannel: {},
        byUser: {},
        errors: []
      };
      
      // Process messages
      for (const messageKey of messageKeys) {
        try {
          const message = await redis.json.get(messageKey);
          if (!message) {
            messageStats.errors.push(`Missing message data: ${messageKey}`);
            continue;
          }
          
          messageStats.total++;
          
          // Validate required fields
          const requiredFields = ['id', 'messageId', 'projectId', 'timestamp', 'userId', 'username', 'content', 'channelId', 'sentiment'];
          const missingFields = requiredFields.filter(field => !message[field]);
          
          if (missingFields.length > 0) {
            messageStats.errors.push(`Message ${message.id} missing fields: ${missingFields.join(', ')}`);
          }
          
          // Check sentiment
          if (message.sentiment) {
            messageStats.withSentiment++;
            const sentimentScore = message.sentiment.score || message.sentiment;
            
            if (['positive', 'neutral', 'negative'].includes(sentimentScore)) {
              messageStats.sentimentCounts[sentimentScore]++;
            } else {
              messageStats.errors.push(`Invalid sentiment "${sentimentScore}" in message ${message.id}`);
            }
          }
          
          // Group by date
          if (message.timestamp) {
            const date = message.timestamp.split('T')[0];
            messageStats.byDate[date] = (messageStats.byDate[date] || 0) + 1;
          }
          
          // Group by channel
          if (message.channelId) {
            messageStats.byChannel[message.channelId] = (messageStats.byChannel[message.channelId] || 0) + 1;
          }
          
          // Group by user
          if (message.userId) {
            messageStats.byUser[message.userId] = (messageStats.byUser[message.userId] || 0) + 1;
          }
          
        } catch (err) {
          messageStats.errors.push(`Error reading ${messageKey}: ${err.message}`);
        }
      }
      
      // 3. Validate calculations
      console.log('\n📐 Validating Calculations:');
      
      // Check if message count matches
      const countCheck = messageStats.total === messageKeys.length;
      console.log(`   Message count: ${countCheck ? '✅' : '❌'} ${messageStats.total} vs ${messageKeys.length}`);
      if (!countCheck) {
        validationResults.failed.push(`${project.name}: Message count mismatch`);
      }
      
      // Check sentiment coverage
      const sentimentCoverage = (messageStats.withSentiment / messageStats.total * 100).toFixed(1);
      console.log(`   Sentiment coverage: ${sentimentCoverage}%`);
      
      if (messageStats.withSentiment < messageStats.total) {
        validationResults.warnings.push(`${project.name}: ${messageStats.total - messageStats.withSentiment} messages without sentiment`);
      }
      
      // Validate sentiment percentages
      const sentimentTotal = Object.values(messageStats.sentimentCounts).reduce((a, b) => a + b, 0);
      if (sentimentTotal !== messageStats.withSentiment) {
        console.log(`   ${colors.red}❌ Sentiment count mismatch: ${sentimentTotal} vs ${messageStats.withSentiment}${colors.reset}`);
        validationResults.failed.push(`${project.name}: Sentiment count mismatch`);
      } else {
        console.log(`   ${colors.green}✅ Sentiment counts match${colors.reset}`);
        validationResults.passed.push(`${project.name}: Sentiment validation`);
      }
      
      // Calculate and validate percentages
      console.log('\n📊 Sentiment Percentages:');
      const percentages = {};
      let totalPercentage = 0;
      
      Object.entries(messageStats.sentimentCounts).forEach(([sentiment, count]) => {
        const percent = messageStats.total > 0 ? (count / messageStats.total * 100) : 0;
        percentages[sentiment] = percent;
        totalPercentage += percent;
        console.log(`   ${sentiment}: ${percent.toFixed(1)}% (${count} messages)`);
      });
      
      console.log(`   ─────────────────`);
      console.log(`   Total: ${totalPercentage.toFixed(1)}%`);
      
      if (Math.abs(totalPercentage - 100) > 0.1 && messageStats.total > 0) {
        console.log(`   ${colors.red}❌ Percentages don't add up to 100%${colors.reset}`);
        validationResults.failed.push(`${project.name}: Percentage calculation error`);
      } else if (messageStats.total > 0) {
        console.log(`   ${colors.green}✅ Percentages correctly add up to 100%${colors.reset}`);
        validationResults.passed.push(`${project.name}: Percentage calculation`);
      }
      
      // 4. Check date-based aggregations
      console.log('\n📅 Date-based Message Distribution:');
      const sortedDates = Object.keys(messageStats.byDate).sort();
      sortedDates.slice(-7).forEach(date => {
        console.log(`   ${date}: ${messageStats.byDate[date]} messages`);
      });
      
      // 5. Check user statistics
      const userCount = Object.keys(messageStats.byUser).length;
      const avgMessagesPerUser = (messageStats.total / userCount).toFixed(1);
      console.log(`\n👥 User Statistics:`);
      console.log(`   Total users: ${userCount}`);
      console.log(`   Avg messages/user: ${avgMessagesPerUser}`);
      
      // 6. Check channel distribution
      console.log('\n📢 Channel Distribution:');
      Object.entries(messageStats.byChannel)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([channelId, count]) => {
          console.log(`   ${channelId}: ${count} messages`);
        });
      
      // 7. Report errors
      if (messageStats.errors.length > 0) {
        console.log(`\n${colors.red}⚠️  Errors Found:${colors.reset}`);
        messageStats.errors.slice(0, 10).forEach(err => {
          console.log(`   - ${err}`);
        });
        if (messageStats.errors.length > 10) {
          console.log(`   ... and ${messageStats.errors.length - 10} more errors`);
        }
        validationResults.failed.push(`${project.name}: ${messageStats.errors.length} data errors`);
      }
    }
    
    // 8. Check for orphaned data
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('🔍 Checking for Orphaned Data...');
    console.log('='.repeat(60));
    
    // Check for messages without projects
    const allMessageKeys = await redis.keys('message:discord:*');
    const orphanedMessages = [];
    
    for (const messageKey of allMessageKeys) {
      const projectId = messageKey.split(':')[2];
      const projectExists = activeProjects.some(p => p.id === projectId);
      
      if (!projectExists) {
        orphanedMessages.push(messageKey);
      }
    }
    
    if (orphanedMessages.length > 0) {
      console.log(`${colors.yellow}⚠️  Found ${orphanedMessages.length} orphaned messages${colors.reset}`);
      validationResults.warnings.push(`${orphanedMessages.length} orphaned messages found`);
    } else {
      console.log(`${colors.green}✅ No orphaned messages found${colors.reset}`);
      validationResults.passed.push('No orphaned data');
    }
    
    // 9. Final Report
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📋 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    
    console.log(`\n${colors.green}✅ PASSED: ${validationResults.passed.length} checks${colors.reset}`);
    validationResults.passed.forEach(item => console.log(`   ✓ ${item}`));
    
    if (validationResults.warnings.length > 0) {
      console.log(`\n${colors.yellow}⚠️  WARNINGS: ${validationResults.warnings.length} issues${colors.reset}`);
      validationResults.warnings.forEach(item => console.log(`   ⚠ ${item}`));
    }
    
    if (validationResults.failed.length > 0) {
      console.log(`\n${colors.red}❌ FAILED: ${validationResults.failed.length} checks${colors.reset}`);
      validationResults.failed.forEach(item => console.log(`   ✗ ${item}`));
    }
    
    // Final verdict
    console.log('\n' + '='.repeat(60));
    if (validationResults.failed.length === 0) {
      console.log(`${colors.green}✅ VALIDATION PASSED - Zero Discrepancies Found!${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ VALIDATION FAILED - ${validationResults.failed.length} Discrepancies Found${colors.reset}`);
    }
    console.log('='.repeat(60));
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        passed: validationResults.passed.length,
        warnings: validationResults.warnings.length,
        failed: validationResults.failed.length
      },
      details: validationResults
    };
    
    const filename = `analytics-validation-${Date.now()}.json`;
    require('fs').writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${filename}`);
    
  } catch (error) {
    console.error(`${colors.red}❌ Validation Error:${colors.reset}`, error);
  } finally {
    process.exit();
  }
}

// Run validation
validateAnalytics(); 