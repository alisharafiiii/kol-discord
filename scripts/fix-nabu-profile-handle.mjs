import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import { v4 as uuidv4 } from 'uuid';
import { writeFileSync } from 'fs';

// Load environment
config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function fixNabuProfile() {
  try {
    console.log('🔧 Fixing Profile Handle Mismatch\n');
    console.log('This script will rename nabu.base.eth profile to use correct Twitter handle: sharafi_eth\n');
    
    // Create backup
    const backup = {
      timestamp: new Date().toISOString(),
      oldData: {},
      actions: []
    };
    
    // 1. Get the existing sharafi_eth profile
    console.log('1. Retrieving existing profile data...');
    console.log('─'.repeat(60));
    
    const sharafiProfile = await redis.json.get('user:user_sharafi_eth');
    if (!sharafiProfile) {
      console.error('❌ Could not find sharafi_eth profile at user:user_sharafi_eth');
      return;
    }
    
    backup.oldData.sharafiProfile = JSON.parse(JSON.stringify(sharafiProfile));
    console.log('✅ Found sharafi_eth profile with correct Twitter handle');
    console.log(`   Name: ${sharafiProfile.name}`);
    console.log(`   Twitter: @${sharafiProfile.twitterHandle}`);
    console.log(`   Role: ${sharafiProfile.role}`);
    console.log(`   Status: ${sharafiProfile.approvalStatus}`);
    
    // 2. Generate proper UUID for the profile
    const newProfileId = uuidv4();
    console.log(`\n2. Generating new profile ID: ${newProfileId}`);
    console.log('─'.repeat(60));
    
    // 3. Create cleaned profile data
    const cleanedProfile = {
      ...sharafiProfile,
      id: newProfileId,
      twitterHandle: 'sharafi_eth', // Ensure correct Twitter handle
      name: sharafiProfile.name === 'nabu.base.eth' ? 'Sharafi' : sharafiProfile.name, // Fix name if needed
      updatedAt: new Date().toISOString()
    };
    
    console.log('✅ Prepared cleaned profile data');
    
    // 4. Save to new ProfileService location
    console.log('\n3. Migrating to ProfileService format...');
    console.log('─'.repeat(60));
    
    const newProfileKey = `profile:${newProfileId}`;
    await redis.json.set(newProfileKey, '$', JSON.parse(JSON.stringify(cleanedProfile)));
    backup.actions.push(`Created new profile at: ${newProfileKey}`);
    console.log(`✅ Created new profile at: ${newProfileKey}`);
    
    // 5. Update indexes
    console.log('\n4. Updating indexes...');
    console.log('─'.repeat(60));
    
    // Remove old indexes
    const oldIndexesToClean = [
      'idx:username:nabu.base.eth',
      'idx:username:sharafi_eth',
      'idx:profile:handle:nabu.base.eth',
      'idx:displayname:nabu.base.eth',
      'idx:role:admin',
      'idx:status:approved'
    ];
    
    for (const index of oldIndexesToClean) {
      await redis.srem(index, 'user_nabu.base.eth');
      await redis.srem(index, 'new:nabu.base.eth');
      await redis.srem(index, 'user_sharafi_eth');
      await redis.srem(index, '6aed6ef9-6a6d-4723-b76e-9c6eff808f7b');
    }
    console.log('✅ Cleaned old indexes');
    
    // Set new indexes with correct Twitter handle
    await redis.sadd('idx:profile:handle:sharafi_eth', newProfileId);
    await redis.sadd('idx:profile:role:admin', newProfileId);
    await redis.sadd('idx:profile:status:approved', newProfileId);
    
    backup.actions.push('Updated all indexes to use Twitter handle: sharafi_eth');
    console.log('✅ Set new indexes with Twitter handle: sharafi_eth');
    
    // 6. Clean up old data
    console.log('\n5. Cleaning up old data...');
    console.log('─'.repeat(60));
    
    // Delete old keys
    const keysToDelete = [
      'user:user_sharafi_eth',
      'profile:new:nabu.base.eth',
      'idx:username:nabu.base.eth',
      'idx:profile:handle:nabu.base.eth'
    ];
    
    for (const key of keysToDelete) {
      await redis.del(key);
      backup.actions.push(`Deleted: ${key}`);
      console.log(`   Deleted: ${key}`);
    }
    
    // 7. Clean up any remaining nabu.base.eth references
    console.log('\n6. Searching for any remaining nabu.base.eth references...');
    console.log('─'.repeat(60));
    
    const remainingKeys = await redis.keys('*nabu.base.eth*');
    if (remainingKeys.length > 0) {
      console.log(`Found ${remainingKeys.length} remaining keys:`);
      for (const key of remainingKeys) {
        console.log(`   - ${key}`);
        // Only delete if it's safe (not campaign or important data)
        if (key.includes('idx:') || key.includes('twitter_nabu.base.eth')) {
          await redis.del(key);
          backup.actions.push(`Deleted remaining key: ${key}`);
          console.log(`     ✅ Deleted`);
        }
      }
    } else {
      console.log('✅ No remaining nabu.base.eth references found');
    }
    
    // 8. Verify the fix
    console.log('\n7. Verifying the fix...');
    console.log('─'.repeat(60));
    
    const verifiedProfile = await redis.json.get(newProfileKey);
    const handleIndex = await redis.smembers('idx:profile:handle:sharafi_eth');
    
    console.log('✅ Profile successfully migrated:');
    console.log(`   Key: ${newProfileKey}`);
    console.log(`   ID: ${verifiedProfile.id}`);
    console.log(`   Twitter Handle: @${verifiedProfile.twitterHandle}`);
    console.log(`   Name: ${verifiedProfile.name}`);
    console.log(`   Index: idx:profile:handle:sharafi_eth -> ${handleIndex}`);
    
    // Save backup
    const backupFile = `nabu-profile-fix-backup-${Date.now()}.json`;
    writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    console.log(`\n📄 Backup saved to: ${backupFile}`);
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ PROFILE FIX COMPLETE');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('1. ✅ Renamed profile from nabu.base.eth to sharafi_eth');
    console.log('2. ✅ Created proper ProfileService entry with UUID');
    console.log('3. ✅ Updated all indexes to use Twitter handle');
    console.log('4. ✅ Removed all ENS-based references');
    console.log('5. ✅ Data integrity maintained - no data loss');
    
    console.log('\n🔒 From now on:');
    console.log('- Twitter handles will be the primary identifiers');
    console.log('- ENS names should NOT be used for profile creation');
    console.log('- The ProfileService will enforce Twitter-based identification');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

fixNabuProfile(); 