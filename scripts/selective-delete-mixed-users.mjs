import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';
import readline from 'readline';

// Load environment
config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve));

async function deleteUserCompletely(handle, profileKey, profileId) {
  try {
    console.log(`\n🗑️  Deleting @${handle}...`);
    
    // 1. Delete the profile
    console.log(`   - Deleting profile key: ${profileKey}`);
    await redis.del(profileKey);
    
    // 2. Clean up old system indexes
    const oldUsernameIndex = `idx:username:${handle}`;
    console.log(`   - Cleaning old username index: ${oldUsernameIndex}`);
    await redis.del(oldUsernameIndex);
    
    // 3. Clean up new system indexes (if any)
    const newHandleIndex = `idx:profile:handle:${handle}`;
    console.log(`   - Cleaning new handle index: ${newHandleIndex}`);
    await redis.del(newHandleIndex);
    
    // 4. Clean up role/status/tier indexes
    const indexesToClean = [
      'idx:profile:role:admin',
      'idx:profile:role:core',
      'idx:profile:role:kol',
      'idx:profile:role:user',
      'idx:profile:status:approved',
      'idx:profile:status:pending',
      'idx:profile:status:rejected',
      'idx:profile:tier:micro',
      'idx:profile:tier:macro',
      'idx:profile:tier:mega',
      'idx:profile:tier:premium'
    ];
    
    console.log('   - Cleaning role/status/tier indexes...');
    for (const index of indexesToClean) {
      await redis.srem(index, profileId);
      // Also clean up any variations
      await redis.srem(index, profileKey);
      await redis.srem(index, handle);
    }
    
    console.log(`   ✅ @${handle} deleted successfully!`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error deleting @${handle}:`, error.message);
    return false;
  }
}

async function selectiveDeleteMixedUsers() {
  try {
    console.log('🔧 Selective Delete Mixed State Users\n');
    
    // Read the report file
    const reportData = JSON.parse(readFileSync('mixed-state-users-report.json', 'utf8'));
    const { mixedStateUsers } = reportData;
    
    // Filter users with old_id_format, excluding admins
    const usersToDelete = mixedStateUsers.filter(user => 
      user.problems.includes('old_id_format') && user.role !== 'admin'
    );
    
    console.log(`Found ${usersToDelete.length} non-admin users with old ID format:\n`);
    
    // Show summary
    const byRole = {};
    usersToDelete.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
    });
    
    console.log('By role:');
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} users`);
    });
    
    console.log('\nOptions:');
    console.log('1. Delete ALL non-admin users with mixed state');
    console.log('2. Delete specific users by handle');
    console.log('3. Delete users by role (kol, core, user)');
    console.log('4. Show detailed list of all affected users');
    console.log('5. Exit without changes');
    
    const choice = await question('\nYour choice (1-5): ');
    
    let selectedUsers = [];
    
    switch (choice) {
      case '1':
        selectedUsers = usersToDelete;
        break;
        
      case '2':
        console.log('\nEnter handles to delete (comma-separated, without @):');
        const handles = await question('Handles: ');
        const handleList = handles.split(',').map(h => h.trim().toLowerCase());
        selectedUsers = usersToDelete.filter(u => handleList.includes(u.handle));
        break;
        
      case '3':
        console.log('\nSelect role to delete:');
        console.log('1. kol');
        console.log('2. core');
        console.log('3. user');
        const roleChoice = await question('Role (1-3): ');
        const roleMap = { '1': 'kol', '2': 'core', '3': 'user' };
        const selectedRole = roleMap[roleChoice];
        if (selectedRole) {
          selectedUsers = usersToDelete.filter(u => u.role === selectedRole);
        }
        break;
        
      case '4':
        console.log('\nDetailed list of users with mixed state:');
        usersToDelete.forEach((user, idx) => {
          console.log(`${idx + 1}. @${user.handle}`);
          console.log(`   Role: ${user.role}, Status: ${user.status}`);
          console.log(`   Key: ${user.key}`);
          console.log(`   ID: ${user.id}`);
          console.log(`   Issues: ${user.problems.join(', ')}\n`);
        });
        rl.close();
        return;
        
      case '5':
        console.log('Exiting without changes.');
        rl.close();
        return;
        
      default:
        console.log('Invalid choice. Exiting.');
        rl.close();
        return;
    }
    
    if (selectedUsers.length === 0) {
      console.log('\nNo users selected for deletion.');
      rl.close();
      return;
    }
    
    // Show selected users
    console.log(`\n📋 Selected ${selectedUsers.length} users for deletion:`);
    selectedUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. @${user.handle} (${user.role}/${user.status})`);
    });
    
    const confirm = await question('\n⚠️  Are you sure you want to delete these users? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('Deletion cancelled.');
      rl.close();
      return;
    }
    
    console.log('\n🚀 Starting deletion process...\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const user of selectedUsers) {
      const success = await deleteUserCompletely(user.handle, user.key, user.id);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('DELETION COMPLETE');
    console.log('='.repeat(60));
    console.log(`✅ Successfully deleted: ${successCount} users`);
    console.log(`❌ Failed to delete: ${failCount} users`);
    console.log(`📊 Total processed: ${selectedUsers.length} users`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

selectiveDeleteMixedUsers(); 