require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function checkEngagementHealth() {
  console.log('\n🏥 Engagement System Health Check');
  console.log('==========================================\n');
  
  const issues = [];
  const warnings = [];
  
  try {
    // 1. Check tier configurations
    console.log('1️⃣ Checking Tier Configurations...');
    const tierKeys = await redis.keys('engagement:tier-config:*');
    
    if (tierKeys.length === 0) {
      issues.push('No tier configurations found');
      console.log('❌ No tier configurations exist!');
    } else {
      console.log(`✅ Found ${tierKeys.length} tier configurations`);
      
      // Verify micro tier specifically (default tier)
      const microConfig = await redis.get('engagement:tier-config:micro');
      if (!microConfig) {
        issues.push('Default "micro" tier configuration missing');
        console.log('❌ Default "micro" tier is missing!');
      } else {
        const config = JSON.parse(microConfig);
        console.log(`   Micro tier: ${config.submissionCost} points to submit`);
      }
    }
    
    // 2. Check active connections
    console.log('\n2️⃣ Checking User Connections...');
    const connectionKeys = await redis.keys('engagement:connection:*');
    console.log(`   Found ${connectionKeys.length} connected users`);
    
    if (connectionKeys.length > 0) {
      let zeroPointUsers = 0;
      let noTierUsers = 0;
      
      for (const key of connectionKeys) {
        const connRaw = await redis.get(key);
        if (connRaw) {
          const conn = JSON.parse(connRaw);
          if (!conn.totalPoints || conn.totalPoints === 0) {
            zeroPointUsers++;
          }
          if (!conn.tier) {
            noTierUsers++;
          }
        }
      }
      
      if (zeroPointUsers > 0) {
        warnings.push(`${zeroPointUsers} users have 0 points`);
        console.log(`⚠️  ${zeroPointUsers} users have 0 points`);
      }
      
      if (noTierUsers > 0) {
        warnings.push(`${noTierUsers} users have no tier assigned`);
        console.log(`⚠️  ${noTierUsers} users have no tier assigned`);
      }
    }
    
    // 3. Check Twitter mappings
    console.log('\n3️⃣ Checking Twitter Mappings...');
    const twitterKeys = await redis.keys('engagement:twitter:*');
    console.log(`   Found ${twitterKeys.length} Twitter ID mappings`);
    
    if (twitterKeys.length !== connectionKeys.length) {
      warnings.push(`Mismatch: ${connectionKeys.length} connections but ${twitterKeys.length} Twitter mappings`);
      console.log(`⚠️  Connection/mapping mismatch`);
    }
    
    // 4. Check pending tweets
    console.log('\n4️⃣ Checking Pending Tweets...');
    const pendingKeys = await redis.keys('engagement:pending:*');
    console.log(`   Found ${pendingKeys.length} pending tweet queues`);
    
    // 5. Check recent tweets
    console.log('\n5️⃣ Checking Recent Tweet Activity...');
    const tweetKeys = await redis.keys('engagement:tweet:*');
    console.log(`   Found ${tweetKeys.length} tracked tweets`);
    
    // 6. Check Redis connectivity
    console.log('\n6️⃣ Testing Redis Operations...');
    const testKey = 'engagement:health-check:test';
    await redis.set(testKey, 'OK', 'EX', 10);
    const testValue = await redis.get(testKey);
    
    if (testValue === 'OK') {
      console.log('✅ Redis read/write operations working');
    } else {
      issues.push('Redis read/write test failed');
      console.log('❌ Redis operations not working properly');
    }
    
    // 7. Check environment variables
    console.log('\n7️⃣ Checking Environment Configuration...');
    const requiredEnvVars = [
      'REDIS_URL',
      'DISCORD_ENGAGEMENT_BOT_TOKEN',
      'TWITTER_BEARER_TOKEN'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        issues.push(`Missing environment variable: ${envVar}`);
        console.log(`❌ Missing: ${envVar}`);
      } else {
        console.log(`✅ ${envVar} is set`);
      }
    }
    
    // Summary
    console.log('\n📊 HEALTH CHECK SUMMARY');
    console.log('==========================================');
    
    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ System appears healthy!');
    } else {
      if (issues.length > 0) {
        console.log('\n🔴 CRITICAL ISSUES:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n🟡 WARNINGS:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
      }
      
      console.log('\n💡 RECOMMENDED ACTIONS:');
      if (issues.includes('No tier configurations found')) {
        console.log('   1. Run: node setup-tier-configs.js');
      }
      if (warnings.some(w => w.includes('0 points'))) {
        console.log('   2. Grant initial points to users');
      }
      if (issues.some(i => i.includes('environment variable'))) {
        console.log('   3. Check .env file and bot configuration');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during health check:', error);
  } finally {
    redis.quit();
  }
}

checkEngagementHealth(); 