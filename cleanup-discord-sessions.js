require('dotenv').config({ path: '.env.local' });

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://caring-spider-49388.upstash.io';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA';

async function redisCommand(command) {
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  return await response.json();
}

async function cleanupSessions() {
  console.log('🧹 Cleaning up Discord sessions');
  console.log('==============================\n');
  
  try {
    // Get all Discord verification sessions
    const keysResult = await redisCommand(['KEYS', 'discord:verify:*']);
    const sessionKeys = keysResult.result || [];
    
    console.log(`Found ${sessionKeys.length} Discord sessions\n`);
    
    let cleaned = 0;
    let kept = 0;
    
    for (const key of sessionKeys) {
      const dataResult = await redisCommand(['GET', key]);
      if (dataResult.result) {
        try {
          const session = JSON.parse(dataResult.result);
          
          // Check if it has the wrong format (userId instead of discordId)
          if (session.userId && !session.discordId) {
            console.log(`❌ Removing session with wrong format: ${key}`);
            await redisCommand(['DEL', key]);
            cleaned++;
          } else if (session.discordId) {
            // Check TTL
            const ttlResult = await redisCommand(['TTL', key]);
            if (ttlResult.result <= 0) {
              console.log(`❌ Removing expired session: ${key}`);
              await redisCommand(['DEL', key]);
              cleaned++;
            } else {
              console.log(`✅ Keeping valid session: ${key} (TTL: ${ttlResult.result}s)`);
              kept++;
            }
          }
        } catch (e) {
          console.log(`❌ Removing invalid session: ${key}`);
          await redisCommand(['DEL', key]);
          cleaned++;
        }
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`- Cleaned: ${cleaned} sessions`);
    console.log(`- Kept: ${kept} sessions`);
    
    console.log('\n✅ Cleanup complete!');
    console.log('Users should now be able to use /connect successfully.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

cleanupSessions(); 