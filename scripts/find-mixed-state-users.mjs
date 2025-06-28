import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import { writeFileSync } from 'fs';

// Load environment
config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function findMixedStateUsers() {
  try {
    console.log('🔍 Searching for users in mixed state between old and new systems...\n');
    
    const mixedStateUsers = [];
    const issues = {
      oldIdFormat: [],
      missingNewIndex: [],
      hasOldIndex: [],
      duplicateIndexEntries: []
    };
    
    // 1. Get all profile keys from new system
    console.log('1. Scanning new system profiles (profile:*)...');
    const profileKeys = await redis.keys('profile:*');
    console.log(`   Found ${profileKeys.length} profile keys\n`);
    
    // 2. Check each profile for mixed state issues
    console.log('2. Analyzing each profile for mixed state issues...\n');
    
    for (const key of profileKeys) {
      try {
        const profile = await redis.json.get(key);
        if (!profile) continue;
        
        const profileId = profile.id;
        const handle = profile.twitterHandle?.toLowerCase().replace('@', '');
        
        if (!handle) continue;
        
        const problems = [];
        
        // Check 1: Old ID format (user_* instead of UUID)
        if (profileId && profileId.startsWith('user_')) {
          problems.push('old_id_format');
          issues.oldIdFormat.push({
            key,
            id: profileId,
            handle
          });
        }
        
        // Check 2: Check for old system index
        const oldIndexKey = `idx:username:${handle}`;
        const oldIndexMembers = await redis.smembers(oldIndexKey);
        if (oldIndexMembers.length > 0) {
          problems.push('has_old_index');
          issues.hasOldIndex.push({
            key,
            id: profileId,
            handle,
            oldIndexMembers
          });
        }
        
        // Check 3: Check for new system index
        const newIndexKey = `idx:profile:handle:${handle}`;
        const newIndexMembers = await redis.smembers(newIndexKey);
        if (newIndexMembers.length === 0) {
          problems.push('missing_new_index');
          issues.missingNewIndex.push({
            key,
            id: profileId,
            handle
          });
        }
        
        // Check 4: Check for duplicate/mismatched entries
        if (newIndexMembers.length > 1 || 
            (newIndexMembers.length > 0 && !newIndexMembers.includes(profileId))) {
          problems.push('index_mismatch');
          issues.duplicateIndexEntries.push({
            key,
            id: profileId,
            handle,
            indexEntries: newIndexMembers
          });
        }
        
        // If any problems found, add to mixed state list
        if (problems.length > 0) {
          mixedStateUsers.push({
            key,
            id: profileId,
            handle,
            name: profile.name,
            role: profile.role,
            status: profile.approvalStatus,
            problems
          });
        }
        
      } catch (err) {
        console.error(`   Error processing ${key}:`, err.message);
      }
    }
    
    // 3. Check for orphaned old system entries
    console.log('\n3. Checking for orphaned old system entries...');
    const oldUserKeys = await redis.keys('user:*');
    console.log(`   Found ${oldUserKeys.length} old user: keys`);
    
    const orphanedOldUsers = [];
    for (const key of oldUserKeys) {
      try {
        const user = await redis.json.get(key);
        if (user && user.twitterHandle) {
          const handle = user.twitterHandle.toLowerCase().replace('@', '');
          // Check if there's a corresponding new profile
          const profileExists = profileKeys.some(pk => pk.includes(handle));
          if (!profileExists) {
            orphanedOldUsers.push({
              key,
              id: key.replace('user:', ''),
              handle,
              name: user.name,
              role: user.role,
              status: user.approvalStatus
            });
          }
        }
      } catch (err) {
        // Skip
      }
    }
    
    // 4. Generate report
    console.log('\n' + '='.repeat(80));
    console.log('MIXED STATE USERS REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n📊 Summary:`);
    console.log(`   Total profiles analyzed: ${profileKeys.length}`);
    console.log(`   Profiles with mixed state issues: ${mixedStateUsers.length}`);
    console.log(`   Orphaned old system users: ${orphanedOldUsers.length}`);
    
    if (mixedStateUsers.length > 0) {
      console.log(`\n🔄 Mixed State Users (similar to alinabu):`);
      console.log('─'.repeat(80));
      
      mixedStateUsers.forEach((user, idx) => {
        console.log(`\n${idx + 1}. @${user.handle} (${user.name || 'No name'})`);
        console.log(`   Key: ${user.key}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}, Status: ${user.status}`);
        console.log(`   Issues: ${user.problems.join(', ')}`);
      });
    }
    
    if (issues.oldIdFormat.length > 0) {
      console.log(`\n⚠️  Users with old ID format (user_*):`);
      issues.oldIdFormat.forEach(u => {
        console.log(`   - @${u.handle}: ${u.id}`);
      });
    }
    
    if (issues.hasOldIndex.length > 0) {
      console.log(`\n⚠️  Users with old system indexes:`);
      issues.hasOldIndex.forEach(u => {
        console.log(`   - @${u.handle}: idx:username:${u.handle} -> ${u.oldIndexMembers.join(', ')}`);
      });
    }
    
    if (orphanedOldUsers.length > 0) {
      console.log(`\n🔴 Orphaned Old System Users (no new profile):`);
      console.log('─'.repeat(80));
      
      orphanedOldUsers.forEach((user, idx) => {
        console.log(`${idx + 1}. @${user.handle} - ${user.key} (${user.role}/${user.status})`);
      });
    }
    
    // 5. Save results to file for further processing
    const results = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProfiles: profileKeys.length,
        mixedStateCount: mixedStateUsers.length,
        orphanedCount: orphanedOldUsers.length
      },
      mixedStateUsers,
      orphanedOldUsers,
      issues
    };
    
    console.log(`\n💾 Saving detailed results to: mixed-state-users-report.json`);
    writeFileSync('mixed-state-users-report.json', JSON.stringify(results, null, 2));
    
    console.log(`\n✅ Analysis complete!`);
    console.log(`\n💡 To fix these users, you can:`);
    console.log(`   1. Create a migration script to standardize the data`);
    console.log(`   2. Use the admin panel to manually delete and recreate them`);
    console.log(`   3. Run a cleanup script similar to delete-user-alinabu.mjs`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

findMixedStateUsers(); 