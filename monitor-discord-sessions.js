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

async function monitor() {
  console.log('🔍 Monitoring Discord Sessions (Press Ctrl+C to stop)');
  console.log('====================================================\n');
  console.log('Try using /connect in Discord and watch for new sessions...\n');
  
  let knownSessions = new Set();
  
  // Get initial sessions
  const initialKeys = await redisCommand(['KEYS', 'discord:verify:*']);
  (initialKeys.result || []).forEach(key => knownSessions.add(key));
  
  console.log(`Starting with ${knownSessions.size} existing sessions\n`);
  
  setInterval(async () => {
    try {
      const currentKeys = await redisCommand(['KEYS', 'discord:verify:*']);
      const currentSessions = new Set(currentKeys.result || []);
      
      // Check for new sessions
      for (const key of currentSessions) {
        if (!knownSessions.has(key)) {
          console.log(`\n🆕 NEW SESSION DETECTED: ${key}`);
          
          // Get session details
          const dataResult = await redisCommand(['GET', key]);
          if (dataResult.result) {
            const session = JSON.parse(dataResult.result);
            console.log('   Discord User:', session.discordUsername || session.username || 'unknown');
            console.log('   Discord ID:', session.discordId || session.userId || 'unknown');
            console.log('   Created:', new Date(session.timestamp || session.createdAt).toISOString());
            
            // Extract session ID
            const sessionId = key.replace('discord:verify:', '');
            console.log(`\n   ✅ Bot successfully created session!`);
            console.log(`   Session ID: ${sessionId}`);
            console.log(`   URL: https://www.nabulines.com/auth/discord-link?session=${sessionId}`);
          }
          
          knownSessions.add(key);
        }
      }
      
      // Check for removed sessions
      for (const key of knownSessions) {
        if (!currentSessions.has(key)) {
          console.log(`\n❌ SESSION REMOVED: ${key}`);
          knownSessions.delete(key);
        }
      }
      
    } catch (error) {
      console.error('Monitor error:', error.message);
    }
  }, 2000); // Check every 2 seconds
}

monitor().catch(console.error); 