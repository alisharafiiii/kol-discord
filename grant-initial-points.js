require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL);

async function grantInitialPoints(pointAmount = 1000) {
  console.log('\n💰 Granting Initial Points to Users');
  console.log('==========================================\n');
  
  try {
    // Get all connections
    const connectionKeys = await redis.keys('engagement:connection:*');
    console.log(`Found ${connectionKeys.length} connected users\n`);
    
    if (connectionKeys.length === 0) {
      console.log('No users found. Use /connect in Discord first!');
      return;
    }
    
    let updated = 0;
    let skipped = 0;
    
    for (const key of connectionKeys) {
      const connRaw = await redis.get(key);
      if (connRaw) {
        const conn = JSON.parse(connRaw);
        const discordId = key.split(':').pop();
        
        if (!conn.totalPoints || conn.totalPoints < pointAmount) {
          const oldPoints = conn.totalPoints || 0;
          conn.totalPoints = Math.max(oldPoints, pointAmount);
          conn.tier = conn.tier || 'micro';
          
          await redis.set(key, JSON.stringify(conn));
          
          console.log(`✅ ${conn.twitterHandle} (@${conn.twitterUsername})`);
          console.log(`   Discord ID: ${discordId}`);
          console.log(`   Points: ${oldPoints} → ${conn.totalPoints}`);
          console.log(`   Tier: ${conn.tier}\n`);
          
          updated++;
        } else {
          skipped++;
        }
      }
    }
    
    console.log('==========================================');
    console.log(`✅ Updated ${updated} users with initial points`);
    console.log(`⏭️  Skipped ${skipped} users (already have ${pointAmount}+ points)`);
    
    if (updated > 0) {
      console.log('\n🎉 Users can now submit tweets!');
      console.log('   - Micro tier costs 500 points per submission');
      console.log('   - Users earn 10 points per like/retweet/reply');
    }
    
  } catch (error) {
    console.error('❌ Error granting points:', error);
  } finally {
    redis.quit();
  }
}

// Check if custom point amount was provided
const customPoints = parseInt(process.argv[2]);
const pointAmount = customPoints || 1000;

console.log(`Will grant ${pointAmount} initial points to users...`);
grantInitialPoints(pointAmount); 