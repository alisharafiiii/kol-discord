require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function debugTweetSubmission(discordId) {
  console.log('\n🔍 Debugging Tweet Submission for Discord ID:', discordId);
  console.log('==========================================\n');
  
  try {
    // 1. Check if user has a connection
    console.log('1️⃣ Checking Discord connection...');
    const connectionKey = `engagement:connection:${discordId}`;
    const connectionRaw = await redis.get(connectionKey);
    
    if (!connectionRaw) {
      console.log('❌ No connection found in Redis!');
      console.log('   User needs to use /connect command first');
      return;
    }
    
    const connection = JSON.parse(connectionRaw);
    console.log('✅ Connection found:');
    console.log('   - Twitter handle:', connection.twitterHandle);
    console.log('   - Twitter ID:', connection.twitterId);
    console.log('   - Total points:', connection.totalPoints);
    console.log('   - Tier:', connection.tier || 'micro');
    console.log('   - Created:', connection.createdAt);
    
    // 2. Check tier configuration
    console.log('\n2️⃣ Checking tier configuration...');
    const tier = connection.tier || 'micro';
    const tierConfigKey = `engagement:tier-config:${tier}`;
    const tierConfigRaw = await redis.get(tierConfigKey);
    
    if (!tierConfigRaw) {
      console.log(`❌ No tier configuration found for "${tier}" tier!`);
      console.log('   This is likely why tweet submission fails');
      console.log('   Need to set up tier configurations');
      
      // Check if any tier configs exist
      const allTierKeys = await redis.keys('engagement:tier-config:*');
      if (allTierKeys.length === 0) {
        console.log('\n   ⚠️  NO TIER CONFIGURATIONS EXIST AT ALL!');
        console.log('   This is the root cause - bot cannot determine submission costs');
      } else {
        console.log('\n   Available tier configs:', allTierKeys);
      }
    } else {
      const tierConfig = JSON.parse(tierConfigRaw);
      console.log(`✅ Tier config for "${tier}" found:`);
      console.log('   - Submission cost:', tierConfig.submissionCost || 500);
      console.log('   - Daily limit:', tierConfig.dailyLimit || 5);
      console.log('   - Like reward:', tierConfig.likeReward || 10);
      console.log('   - Retweet reward:', tierConfig.retweetReward || 10);
      console.log('   - Reply reward:', tierConfig.replyReward || 10);
      
      // Check if user has enough points
      const submissionCost = tierConfig.submissionCost || 500;
      if (connection.totalPoints < submissionCost) {
        console.log(`\n⚠️  User has insufficient points! (${connection.totalPoints} < ${submissionCost})`);
      }
    }
    
    // 3. Check daily submission limit
    console.log('\n3️⃣ Checking daily submission limit...');
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `engagement:daily:${today}:${discordId}`;
    const dailyCount = await redis.get(dailyKey);
    
    if (dailyCount) {
      console.log(`   Daily submissions today: ${dailyCount}`);
      const tierConfig = tierConfigRaw ? JSON.parse(tierConfigRaw) : {};
      const dailyLimit = tierConfig.dailyLimit || 5;
      if (parseInt(dailyCount) >= dailyLimit) {
        console.log(`   ⚠️  Daily limit reached! (${dailyCount} >= ${dailyLimit})`);
      }
    } else {
      console.log('   No submissions today yet');
    }
    
    // 4. Check project configuration (if needed)
    console.log('\n4️⃣ Checking project configuration...');
    const projectId = 'ledger';
    const projectKey = `project:${projectId}`;
    const projectRaw = await redis.get(projectKey);
    
    if (!projectRaw) {
      console.log('   ⚠️  No project configuration found');
      console.log('   Bot might use default settings');
    } else {
      const project = JSON.parse(projectRaw);
      console.log('   ✅ Project config found:', project.name);
    }
    
    // 5. Summary
    console.log('\n📊 SUMMARY:');
    console.log('==========================================');
    
    if (!tierConfigRaw) {
      console.log('🔴 MAIN ISSUE: No tier configuration exists!');
      console.log('   The bot cannot determine submission costs or rewards');
      console.log('   Solution: Run setup script to create tier configurations');
    } else if (connection.totalPoints < (JSON.parse(tierConfigRaw).submissionCost || 500)) {
      console.log('🟡 User has insufficient points for submission');
    } else {
      console.log('🟢 User setup looks good - check bot logs for other errors');
    }
    
  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    redis.quit();
  }
}

// Check if Discord ID was provided
const discordId = process.argv[2];
if (!discordId) {
  console.log('Usage: node debug-tweet-submission.js <discord-id>');
  console.log('Example: node debug-tweet-submission.js 123456789012345678');
  process.exit(1);
}

debugTweetSubmission(discordId); 