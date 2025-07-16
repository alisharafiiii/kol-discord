require('dotenv').config({ path: '.env.local' });

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://caring-spider-49388.upstash.io';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA';

async function testSessionCreation() {
  console.log('🧪 Testing Session Creation Like Bot Does');
  console.log('========================================\n');
  
  // Simulate what the bot does
  const testUserId = '918575895374082078'; // alinabu's Discord ID from logs
  const sessionId = `verify-${testUserId}-${Date.now()}`;
  const sessionKey = `discord:verify:${sessionId}`;
  
  console.log('Creating test session:');
  console.log(`Session ID: ${sessionId}`);
  console.log(`Redis Key: ${sessionKey}`);
  
  const sessionData = {
    discordId: testUserId,
    discordUsername: 'alinabu',
    discordTag: 'alinabu#1234',
    timestamp: Date.now()
  };
  
  console.log('\nSession data:', JSON.stringify(sessionData, null, 2));
  
  // Store via REST API
  const response = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['SETEX', sessionKey, 600, JSON.stringify(sessionData)])
  });
  
  const result = await response.json();
  console.log('\nRedis response:', result.result);
  
  // Verify it was stored
  const getResponse = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(['GET', sessionKey])
  });
  
  const getResult = await getResponse.json();
  if (getResult.result) {
    console.log('✅ Session stored and retrieved successfully');
    
    // This is the URL the bot would generate
    const verificationUrl = `https://www.nabulines.com/auth/discord-link?session=${sessionId}`;
    console.log('\n📎 Test URL:');
    console.log(verificationUrl);
    console.log('\nIf you visit this URL and authenticate with Twitter,');
    console.log('it should work because the session exists in Redis.');
  } else {
    console.log('❌ Failed to retrieve session');
  }
}

testSessionCreation().catch(console.error); 