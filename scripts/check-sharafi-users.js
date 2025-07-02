const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

(async () => {
  console.log('🔍 Searching for all variations of sharafi_eth...\n');
  
  const variations = [
    'sharafi_eth',
    '@sharafi_eth', 
    '@@sharafi_eth',
    'SHARAFI_ETH',
    '@SHARAFI_ETH',
    '@@SHARAFI_ETH'
  ];
  
  try {
    // Check each variation
    for (const handle of variations) {
      console.log(`\n📋 Checking: "${handle}"`);
      
      // Check username index
      const userIds = await redis.smembers(`idx:username:${handle.toLowerCase()}`);
      
      if (userIds && userIds.length > 0) {
        console.log(`   Found ${userIds.length} user(s) with this handle`);
        
        for (const userId of userIds) {
          const userData = await redis.json.get(`user:${userId}`);
          if (userData) {
            console.log(`   - User ID: ${userId}`);
            console.log(`     Name: ${userData.name}`);
            console.log(`     Role: ${userData.role || 'not set'}`);
            console.log(`     Approval: ${userData.approvalStatus || 'not set'}`);
            console.log(`     Twitter Handle: ${userData.twitterHandle || userData.handle || 'not set'}`);
            console.log(`     Created: ${userData.createdAt}`);
          }
        }
      } else {
        console.log(`   No users found with this exact handle`);
      }
    }
    
    // Also scan all users for any containing sharafi
    console.log('\n\n🔍 Scanning all users containing "sharafi"...');
    const allUserKeys = await redis.keys('user:*');
    let sharafiUsers = [];
    
    for (const key of allUserKeys) {
      const userData = await redis.json.get(key);
      if (userData) {
        const handle = (userData.twitterHandle || userData.handle || '').toLowerCase();
        const name = (userData.name || '').toLowerCase();
        
        if (handle.includes('sharafi') || name.includes('sharafi')) {
          sharafiUsers.push({
            id: key,
            handle: userData.twitterHandle || userData.handle,
            name: userData.name,
            role: userData.role,
            approvalStatus: userData.approvalStatus
          });
        }
      }
    }
    
    if (sharafiUsers.length > 0) {
      console.log(`\nFound ${sharafiUsers.length} user(s) containing "sharafi":`);
      sharafiUsers.forEach(user => {
        console.log(`\n   ID: ${user.id}`);
        console.log(`   Handle: ${user.handle}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role || 'not set'}`);
        console.log(`   Approval: ${user.approvalStatus || 'not set'}`);
      });
    }
    
    console.log('\n\n💡 Recommendation:');
    console.log('   If you see duplicate users, we should:');
    console.log('   1. Keep the one with admin role');
    console.log('   2. Delete the duplicate with user role');
    console.log('   3. Update indexes accordingly');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
})(); 