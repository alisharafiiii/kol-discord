require('dotenv').config();

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://caring-spider-49388.upstash.io';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA';

async function redisCommand(command) {
  const response = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  
  const data = await response.json();
  return data.result;
}

async function setupEngagement() {
  console.log('🚀 Setting up Engagement System via REST API');
  console.log('============================================\n');
  
  try {
    // Test connection
    console.log('1️⃣ Testing connection...');
    const pong = await redisCommand(['PING']);
    console.log(`✅ Connection successful: ${pong}\n`);
    
    // Set up tier configurations
    console.log('2️⃣ Setting up tier configurations...\n');
    
    const tiers = {
      micro: {
        name: 'Micro',
        submissionCost: 500,
        dailyLimit: 5,
        likeReward: 10,
        retweetReward: 10,
        replyReward: 10
      },
      nano: {
        name: 'Nano',
        submissionCost: 300,
        dailyLimit: 10,
        likeReward: 15,
        retweetReward: 15,
        replyReward: 15
      }
    };
    
    for (const [tierKey, config] of Object.entries(tiers)) {
      const key = `engagement:tier-config:${tierKey}`;
      await redisCommand(['SET', key, JSON.stringify(config)]);
      console.log(`✅ Created ${config.name} tier (${config.submissionCost} points)`);
    }
    
    // Check for existing connections
    console.log('\n3️⃣ Checking user connections...');
    const connections = await redisCommand(['KEYS', 'engagement:connection:*']);
    console.log(`Found ${connections.length} connected users`);
    
    if (connections.length > 0) {
      console.log('\n4️⃣ Granting initial points...\n');
      
      for (const key of connections) {
        const userData = await redisCommand(['GET', key]);
        if (userData) {
          const user = JSON.parse(userData);
          if (!user.totalPoints || user.totalPoints < 1000) {
            user.totalPoints = 1000;
            user.tier = user.tier || 'micro';
            await redisCommand(['SET', key, JSON.stringify(user)]);
            console.log(`✅ Granted 1000 points to ${user.twitterHandle}`);
          }
        }
      }
    }
    
    console.log('\n✅ Engagement system setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start the engagement bot');
    console.log('2. Users can submit tweets (500 points for micro tier)');
    console.log('3. Users earn 10 points per engagement');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setupEngagement(); 