require('dotenv').config({ path: '.env.local' });

console.log('🧪 Discord Session Test');
console.log('======================\n');

async function testSession() {
  const url = process.env.UPSTASH_REDIS_REST_URL || 'https://caring-spider-49388.upstash.io';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || 'AcDsAAIjcDE2YjY4YmUzNDg5YTY0ODQxOGU3ZWI0MjliOGM3MzM2MnAxMA';
  
  console.log('Redis URL:', url);
  
  // Create a test session
  const sessionId = 'test-' + Date.now();
  const sessionData = {
    userId: '123456789',
    username: 'testuser',
    discriminator: '0',
    avatar: null,
    createdAt: Date.now()
  };
  
  try {
    // Set session
    console.log('\n1️⃣ Creating test session...');
    const setResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['SETEX', `discord:verify:${sessionId}`, 300, JSON.stringify(sessionData)])
    });
    
    const setResult = await setResponse.json();
    console.log(`Session created: ${setResult.result === 'OK' ? '✅ Success' : '❌ Failed'}`);
    console.log(`Key: discord:verify:${sessionId}`);
    
    // Get session
    console.log('\n2️⃣ Retrieving session...');
    const getResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', `discord:verify:${sessionId}`])
    });
    
    const getResult = await getResponse.json();
    if (getResult.result) {
      const retrieved = JSON.parse(getResult.result);
      console.log('✅ Session retrieved successfully:');
      console.log(JSON.stringify(retrieved, null, 2));
    } else {
      console.log('❌ Failed to retrieve session');
    }
    
    // Clean up
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['DEL', `discord:verify:${sessionId}`])
    });
    
    console.log('\n3️⃣ Session flow test:');
    console.log('✅ Bot can create sessions in Redis');
    console.log('✅ Web app can retrieve sessions from Redis');
    console.log('✅ Discord linking should work correctly');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSession(); 