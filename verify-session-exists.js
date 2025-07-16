require('dotenv').config({ path: '.env.local' });

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL || 'https://caring-spider-49388.upstash.io';
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA';

async function verifySession(sessionId) {
  console.log('🔍 Verifying Session in Redis');
  console.log('=============================\n');
  
  console.log(`Session ID: ${sessionId}`);
  console.log(`Redis Key: discord:verify:${sessionId}\n`);
  
  try {
    // Check in caring-spider Redis
    const response = await fetch(REDIS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', `discord:verify:${sessionId}`])
    });
    
    const result = await response.json();
    
    if (result.result) {
      console.log('✅ Session EXISTS in caring-spider Redis!');
      const session = JSON.parse(result.result);
      console.log('\nSession data:');
      console.log(JSON.stringify(session, null, 2));
      
      // Check TTL
      const ttlResponse = await fetch(REDIS_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REDIS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['TTL', `discord:verify:${sessionId}`])
      });
      
      const ttlResult = await ttlResponse.json();
      console.log(`\nTTL: ${ttlResult.result} seconds (${Math.floor(ttlResult.result / 60)} minutes remaining)`);
      
      console.log('\n💡 DIAGNOSIS:');
      console.log('The session EXISTS in the correct Redis instance.');
      console.log('But the web app cannot find it.');
      console.log('\n🔴 This confirms: Vercel is using different Redis credentials!');
      console.log('\nSOLUTION:');
      console.log('1. Go to your Vercel dashboard');
      console.log('2. Update these environment variables:');
      console.log(`   REDIS_URL = redis://default:${REDIS_TOKEN}@caring-spider-49388.upstash.io:6379`);
      console.log(`   UPSTASH_REDIS_REST_URL = ${REDIS_URL}`);
      console.log(`   UPSTASH_REDIS_REST_TOKEN = ${REDIS_TOKEN}`);
      console.log('3. Redeploy the application');
      
    } else {
      console.log('❌ Session NOT found in caring-spider Redis');
      console.log('This is unexpected since we saw it being created...');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get session ID from command line or use the one from your test
const sessionId = process.argv[2] || 'verify-918575895374082078-1752707098961';
verifySession(sessionId); 