const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { Redis } = require('@upstash/redis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

(async () => {
  console.log('🔧 Fixing sharafi_eth admin role...\n');
  
  try {
    // First, let's find the existing sharafi_eth user
    const userIds = await redis.smembers('idx:username:sharafi_eth');
    
    if (!userIds || userIds.length === 0) {
      console.log('❌ User sharafi_eth not found!');
      process.exit(1);
    }
    
    const userId = userIds[0]; // twitter_sharafi_eth
    const userData = await redis.json.get(`user:${userId}`);
    
    if (!userData) {
      console.log('❌ User data not found!');
      process.exit(1);
    }
    
    console.log('📋 Current User State:');
    console.log(`   ID: ${userId}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Handle: ${userData.twitterHandle || userData.handle}`);
    console.log(`   Current Role: ${userData.role}`);
    console.log(`   Current Status: ${userData.approvalStatus}`);
    
    // Update the user to admin role and approved status
    console.log('\n🔄 Updating user...');
    
    // Update role
    await redis.json.set(`user:${userId}`, '$.role', 'admin');
    await redis.json.set(`user:${userId}`, '$.approvalStatus', 'approved');
    
    // Update role indexes - remove from old role
    if (userData.role && userData.role !== 'admin') {
      await redis.srem(`idx:role:${userData.role}`, userId);
      console.log(`   ✅ Removed from idx:role:${userData.role}`);
    }
    
    // Add to admin role index
    await redis.sadd('idx:role:admin', userId);
    console.log('   ✅ Added to idx:role:admin');
    
    // Update approval status indexes
    if (userData.approvalStatus && userData.approvalStatus !== 'approved') {
      await redis.srem(`idx:status:${userData.approvalStatus}`, userId);
      console.log(`   ✅ Removed from idx:status:${userData.approvalStatus}`);
    }
    
    await redis.sadd('idx:status:approved', userId);
    console.log('   ✅ Added to idx:status:approved');
    
    // Also check if we need to clean up the @@ variation
    const adminUsers = await redis.smembers('idx:role:admin');
    console.log('\n📋 Checking admin role index...');
    console.log(`   Total admin users: ${adminUsers.length}`);
    
    // Look for any user that might be @@sharafi_eth
    for (const adminId of adminUsers) {
      const adminData = await redis.json.get(`user:${adminId}`);
      if (adminData) {
        const handle = adminData.twitterHandle || adminData.handle || '';
        if (handle.toLowerCase().includes('sharafi_eth') && adminId !== userId) {
          console.log(`\n   ⚠️  Found duplicate admin: ${adminId}`);
          console.log(`      Handle: ${handle}`);
          console.log(`      Name: ${adminData.name}`);
          // We'll keep both for now, but log it
        }
      }
    }
    
    // Verify the update
    const updatedUser = await redis.json.get(`user:${userId}`);
    console.log('\n✅ User successfully updated!');
    console.log(`   New Role: ${updatedUser.role}`);
    console.log(`   New Status: ${updatedUser.approvalStatus}`);
    
    console.log('\n📝 Next Steps:');
    console.log('   1. Clear your browser cache/cookies');
    console.log('   2. Log out from the application');
    console.log('   3. Log back in with Twitter');
    console.log('   4. The batch job should now work!');
    
    console.log('\n💡 If still having issues:');
    console.log('   - Check role at: https://www.nabulines.com/api/debug/check-my-role');
    console.log('   - Make sure you\'re logged in as @sharafi_eth (not @@sharafi_eth)');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  
  process.exit(0);
})(); 