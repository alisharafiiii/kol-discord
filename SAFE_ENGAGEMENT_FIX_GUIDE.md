# Safe Engagement System Fix Guide

## Current Situation
1. Discord `/connect` command works ✅
2. Leaderboard displays correctly ✅  
3. Tweet submission fails immediately after linking ❌
4. Both Redis instances appear to be inaccessible

## Step-by-Step Safe Fix Process

### Step 1: Verify Bot Environment File
First, let's check if the bot has its own environment file:

```bash
# Check for bot-specific env file
ls -la discord-bots/.env*

# If no .env exists in discord-bots, create one:
cp .env.local discord-bots/.env
```

### Step 2: Test Redis Connectivity with curl
Let's verify if the Redis instances are truly inaccessible:

```bash
# Test the Upstash REST API endpoints
curl -s -X GET "https://caring-spider-49388.upstash.io/ping" \
  -H "Authorization: Bearer AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA"

# If that works, the instance is active
```

### Step 3: Create Safe Configuration Script
Create `safe-engagement-setup.js`:

```javascript
require('dotenv').config();
const Redis = require('ioredis');

console.log('🛡️ Safe Engagement Setup Script');
console.log('================================\n');

// Configuration with fallback
const REDIS_CONFIG = {
  // Primary (new instance)
  primary: {
    name: 'Primary (caring-spider)',
    url: process.env.REDIS_URL || 'redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379',
    rest: {
      url: 'https://caring-spider-49388.upstash.io',
      token: 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA'
    }
  }
};

async function setupEngagement() {
  console.log('1️⃣ Testing Redis connection...\n');
  
  const redis = new Redis(REDIS_CONFIG.primary.url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
    enableOfflineQueue: false
  });
  
  try {
    // Test connection
    await redis.ping();
    console.log('✅ Redis connection successful!\n');
    
    // Check current state
    console.log('2️⃣ Checking current system state...\n');
    
    const tierConfigs = await redis.keys('engagement:tier-config:*');
    const connections = await redis.keys('engagement:connection:*');
    
    console.log(`Tier configurations: ${tierConfigs.length}`);
    console.log(`User connections: ${connections.length}`);
    
    // Set up tier configs if missing
    if (tierConfigs.length === 0) {
      console.log('\n3️⃣ Setting up tier configurations...\n');
      
      const microTier = {
        name: 'Micro',
        submissionCost: 500,
        dailyLimit: 5,
        likeReward: 10,
        retweetReward: 10,
        replyReward: 10
      };
      
      await redis.set('engagement:tier-config:micro', JSON.stringify(microTier));
      console.log('✅ Created micro tier configuration');
    }
    
    // Grant initial points if needed
    if (connections.length > 0) {
      console.log('\n4️⃣ Checking user points...\n');
      
      let needsPoints = 0;
      for (const key of connections) {
        const connData = await redis.get(key);
        if (connData) {
          const conn = JSON.parse(connData);
          if (!conn.totalPoints || conn.totalPoints < 500) {
            needsPoints++;
            conn.totalPoints = Math.max(conn.totalPoints || 0, 1000);
            conn.tier = conn.tier || 'micro';
            await redis.set(key, JSON.stringify(conn));
          }
        }
      }
      
      if (needsPoints > 0) {
        console.log(`✅ Granted points to ${needsPoints} users`);
      } else {
        console.log('✅ All users have sufficient points');
      }
    }
    
    console.log('\n✅ System setup complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNRESET') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Connection failed. Try using the REST API instead:');
      console.log('   Update your bot to use @upstash/redis instead of ioredis');
    }
  } finally {
    redis.quit();
  }
}

setupEngagement();
```

### Step 4: Update .env.local Safely

**IMPORTANT**: First backup your current .env.local:
```bash
cp .env.local .env.local.backup-$(date +%s)
```

Then update these lines in `.env.local`:

```env
# Updated Redis Configuration
REDIS_URL="redis://default:AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA@caring-spider-49388.upstash.io:6379"
UPSTASH_REDIS_REST_URL="https://caring-spider-49388.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA"
```

### Step 5: Verify Configuration
Run this verification command:

```bash
# Verify the new configuration
export $(cat .env.local | grep -v '^#' | xargs) && node -e "
console.log('REDIS_URL:', process.env.REDIS_URL ? 'Set ✅' : 'Missing ❌');
console.log('Host:', process.env.REDIS_URL?.match(/@([^:]+)/)?.[1] || 'Unknown');
"
```

### Step 6: Run Safe Setup
```bash
export $(cat .env.local | grep -v '^#' | xargs) && node safe-engagement-setup.js
```

### Step 7: Start the Bot with Verification
```bash
cd discord-bots

# Start with logs visible
export $(cat ../.env.local | grep -v '^#' | xargs) && node engagement-bot.js

# Once confirmed working, use PM2:
# pm2 start engagement-bot.js --name "engagement-bot"
```

## Alternative: Using Upstash REST API

If standard Redis connection fails, the bot may need to use the REST API:

```javascript
// In engagement-bot.js, replace:
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// With:
const { Redis } = require('@upstash/redis');
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});
```

## Verification Checklist

After completing the steps:

1. [ ] Redis connection test passes
2. [ ] Tier configurations exist (at least 'micro')
3. [ ] Users have points (1000+)
4. [ ] Bot starts without errors
5. [ ] `/connect` still works
6. [ ] `/points` shows correct balance
7. [ ] `/submit` accepts tweet URLs
8. [ ] Points are deducted after submission

## Troubleshooting

### If Redis connection fails:
1. Check if you're behind a firewall/VPN
2. Try the REST API approach
3. Verify credentials are exactly as shown

### If tweet submission still fails:
1. Check bot logs: `pm2 logs engagement-bot`
2. Run debug for specific user: `node debug-tweet-submission.js <discord-id>`
3. Verify tier config exists: Check for 'engagement:tier-config:micro' key

### Emergency Rollback:
```bash
# Restore previous config
cp .env.local.backup-<timestamp> .env.local
```

## Summary of Changes

1. **Redis Instance**: Moving from old (polished-vulture) to new (caring-spider)
2. **Initial Setup**: Creating tier configurations if missing
3. **User Points**: Ensuring all users have at least 1000 points
4. **Verification**: Multiple checkpoints to ensure safe migration

This approach ensures no data loss and provides rollback options at each step. 