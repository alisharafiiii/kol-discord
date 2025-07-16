require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function setupTierConfigs() {
  console.log('🔧 Setting up Engagement Tier Configurations');
  console.log('==========================================\n');
  
  try {
    // Define tier configurations
    const tiers = {
      micro: {
        name: 'Micro',
        submissionCost: 500,
        dailyLimit: 5,
        likeReward: 10,
        retweetReward: 10,
        replyReward: 10,
        weeklyBonus: 100,
        monthlyBonus: 500
      },
      nano: {
        name: 'Nano',
        submissionCost: 300,
        dailyLimit: 10,
        likeReward: 15,
        retweetReward: 15,
        replyReward: 15,
        weeklyBonus: 200,
        monthlyBonus: 1000
      },
      mid: {
        name: 'Mid',
        submissionCost: 200,
        dailyLimit: 20,
        likeReward: 20,
        retweetReward: 20,
        replyReward: 20,
        weeklyBonus: 500,
        monthlyBonus: 2500
      },
      macro: {
        name: 'Macro',
        submissionCost: 100,
        dailyLimit: 50,
        likeReward: 25,
        retweetReward: 25,
        replyReward: 25,
        weeklyBonus: 1000,
        monthlyBonus: 5000
      },
      mega: {
        name: 'Mega',
        submissionCost: 50,
        dailyLimit: 100,
        likeReward: 30,
        retweetReward: 30,
        replyReward: 30,
        weeklyBonus: 2000,
        monthlyBonus: 10000
      }
    };
    
    // Save each tier configuration
    for (const [tierKey, config] of Object.entries(tiers)) {
      const key = `engagement:tier-config:${tierKey}`;
      await redis.set(key, JSON.stringify(config));
      console.log(`✅ Created ${config.name} tier configuration:`);
      console.log(`   - Submission cost: ${config.submissionCost} points`);
      console.log(`   - Daily limit: ${config.dailyLimit} submissions`);
      console.log(`   - Rewards: ${config.likeReward} per engagement`);
    }
    
    // Create default project configuration
    console.log('\n📦 Setting up default project configuration...');
    const projectConfig = {
      id: 'ledger',
      name: 'Ledger',
      description: 'Ledger engagement tracking',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    
    await redis.set('project:ledger', JSON.stringify(projectConfig));
    console.log('✅ Created Ledger project configuration');
    
    // Verify configurations
    console.log('\n🔍 Verifying configurations...');
    const verifyKeys = await redis.keys('engagement:tier-config:*');
    console.log(`   Found ${verifyKeys.length} tier configurations`);
    
    // Check if there are any existing connections that need default points
    console.log('\n👥 Checking existing connections...');
    const connections = await redis.keys('engagement:connection:*');
    
    if (connections.length > 0) {
      console.log(`   Found ${connections.length} existing connections`);
      
      // Give initial points to users with 0 points
      let updated = 0;
      for (const connKey of connections) {
        const connRaw = await redis.get(connKey);
        if (connRaw) {
          const conn = JSON.parse(connRaw);
          if (!conn.totalPoints || conn.totalPoints === 0) {
            conn.totalPoints = 1000; // Initial points grant
            conn.tier = conn.tier || 'micro';
            await redis.set(connKey, JSON.stringify(conn));
            updated++;
            console.log(`   ✅ Granted 1000 initial points to ${conn.twitterHandle}`);
          }
        }
      }
      
      if (updated > 0) {
        console.log(`\n✅ Updated ${updated} users with initial points`);
      }
    }
    
    console.log('\n✨ Tier configuration setup complete!');
    console.log('==========================================');
    console.log('Users can now submit tweets with the following costs:');
    console.log('  - Micro: 500 points (5 tweets/day)');
    console.log('  - Nano: 300 points (10 tweets/day)');
    console.log('  - Mid: 200 points (20 tweets/day)');
    console.log('  - Macro: 100 points (50 tweets/day)');
    console.log('  - Mega: 50 points (100 tweets/day)');
    
  } catch (error) {
    console.error('❌ Error setting up configurations:', error);
  } finally {
    redis.quit();
  }
}

setupTierConfigs(); 