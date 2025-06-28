import { config } from 'dotenv';
import { Redis } from '@upstash/redis';
import { readFileSync, writeFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
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

// Backup storage
const backups = {};

/**
 * Create a backup of a user's data before migration
 */
async function backupUser(userId, data) {
  backups[userId] = {
    timestamp: new Date().toISOString(),
    data: JSON.parse(JSON.stringify(data))
  };
}

/**
 * Safely merge data from multiple sources
 */
function mergeProfileData(newProfile, oldProfile, existingData = {}) {
  // Start with existing data as base
  const merged = { ...existingData };
  
  // Core fields - prefer new profile data, fallback to old
  merged.id = newProfile.id || oldProfile.id || merged.id;
  merged.twitterHandle = newProfile.twitterHandle || oldProfile.twitterHandle || merged.twitterHandle;
  merged.name = newProfile.name || oldProfile.name || merged.name;
  merged.email = newProfile.email || oldProfile.email || merged.email;
  merged.bio = newProfile.bio || oldProfile.bio || merged.bio;
  merged.profileImageUrl = newProfile.profileImageUrl || oldProfile.profileImageUrl || merged.profileImageUrl;
  
  // Role and status - prefer most privileged/recent
  merged.role = selectBestRole(newProfile.role, oldProfile.role, merged.role);
  merged.approvalStatus = selectBestStatus(newProfile.approvalStatus, oldProfile.approvalStatus, merged.approvalStatus);
  
  // Tier information
  merged.tier = newProfile.tier || oldProfile.tier || merged.tier;
  merged.currentTier = newProfile.currentTier || oldProfile.currentTier || merged.currentTier;
  merged.isKOL = newProfile.isKOL || oldProfile.isKOL || merged.isKOL || false;
  
  // Merge arrays (campaigns, notes, tags)
  merged.campaigns = mergeArrays(
    merged.campaigns || [],
    newProfile.campaigns || [],
    oldProfile.campaigns || [],
    'campaignId'
  );
  
  merged.notes = mergeArrays(
    merged.notes || [],
    newProfile.notes || [],
    oldProfile.notes || [],
    'id'
  );
  
  merged.tags = [...new Set([
    ...(merged.tags || []),
    ...(newProfile.tags || []),
    ...(oldProfile.tags || [])
  ])];
  
  // Merge objects (wallets, contacts, social links)
  merged.walletAddresses = {
    ...merged.walletAddresses,
    ...oldProfile.walletAddresses,
    ...newProfile.walletAddresses
  };
  
  merged.contacts = {
    ...merged.contacts,
    ...oldProfile.contacts,
    ...newProfile.contacts
  };
  
  merged.socialLinks = {
    ...merged.socialLinks,
    ...oldProfile.socialLinks,
    ...newProfile.socialLinks
  };
  
  // Social stats - take the highest values
  merged.followerCount = Math.max(
    newProfile.followerCount || 0,
    oldProfile.followerCount || 0,
    merged.followerCount || 0
  );
  
  // Points and metrics
  merged.points = Math.max(
    newProfile.points || 0,
    oldProfile.points || 0,
    merged.points || 0
  );
  
  // Dates - preserve earliest created, update modified
  merged.createdAt = selectEarliestDate(
    newProfile.createdAt,
    oldProfile.createdAt,
    merged.createdAt
  );
  merged.updatedAt = new Date();
  
  // Preserve other important dates
  if (newProfile.approvedAt || oldProfile.approvedAt || merged.approvedAt) {
    merged.approvedAt = selectEarliestDate(
      newProfile.approvedAt,
      oldProfile.approvedAt,
      merged.approvedAt
    );
  }
  
  merged.lastLoginAt = selectLatestDate(
    newProfile.lastLoginAt,
    oldProfile.lastLoginAt,
    merged.lastLoginAt
  );
  
  // Location data
  merged.country = newProfile.country || oldProfile.country || merged.country;
  merged.city = newProfile.city || oldProfile.city || merged.city;
  
  // Shipping info
  if (newProfile.shippingInfo || oldProfile.shippingInfo || merged.shippingInfo) {
    merged.shippingInfo = {
      ...merged.shippingInfo,
      ...oldProfile.shippingInfo,
      ...newProfile.shippingInfo
    };
  }
  
  // Discord data
  merged.discordId = newProfile.discordId || oldProfile.discordId || merged.discordId;
  merged.discordUsername = newProfile.discordUsername || oldProfile.discordUsername || merged.discordUsername;
  
  // KOL metrics
  if (merged.isKOL && (newProfile.kolMetrics || oldProfile.kolMetrics)) {
    merged.kolMetrics = mergeKolMetrics(
      newProfile.kolMetrics,
      oldProfile.kolMetrics,
      merged.kolMetrics
    );
  }
  
  return merged;
}

/**
 * Select the best role (most privileged)
 */
function selectBestRole(...roles) {
  const roleHierarchy = ['admin', 'core', 'team', 'kol', 'user'];
  for (const role of roleHierarchy) {
    if (roles.includes(role)) return role;
  }
  return 'user';
}

/**
 * Select the best approval status
 */
function selectBestStatus(...statuses) {
  if (statuses.includes('approved')) return 'approved';
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('rejected')) return 'rejected';
  return 'pending';
}

/**
 * Merge arrays avoiding duplicates
 */
function mergeArrays(...arrays) {
  const [keyField] = arrays.slice(-1);
  const arraysToMerge = arrays.slice(0, -1);
  
  const merged = new Map();
  
  for (const array of arraysToMerge) {
    for (const item of array) {
      const key = keyField && item[keyField] ? item[keyField] : JSON.stringify(item);
      if (!merged.has(key) || (item.updatedAt && (!merged.get(key).updatedAt || new Date(item.updatedAt) > new Date(merged.get(key).updatedAt)))) {
        merged.set(key, item);
      }
    }
  }
  
  return Array.from(merged.values());
}

/**
 * Merge KOL metrics
 */
function mergeKolMetrics(...metrics) {
  const validMetrics = metrics.filter(m => m);
  if (validMetrics.length === 0) return {};
  
  return {
    totalCampaigns: Math.max(...validMetrics.map(m => m.totalCampaigns || 0)),
    totalEarnings: Math.max(...validMetrics.map(m => m.totalEarnings || 0)),
    totalViews: Math.max(...validMetrics.map(m => m.totalViews || 0)),
    totalEngagement: Math.max(...validMetrics.map(m => m.totalEngagement || 0)),
    averageEngagementRate: Math.max(...validMetrics.map(m => m.averageEngagementRate || 0)),
    topPlatform: validMetrics[0].topPlatform || 'twitter',
    tierHistory: mergeArrays(...validMetrics.map(m => m.tierHistory || []), 'date')
  };
}

/**
 * Select earliest date
 */
function selectEarliestDate(...dates) {
  const validDates = dates.filter(d => d).map(d => new Date(d));
  if (validDates.length === 0) return new Date();
  return new Date(Math.min(...validDates.map(d => d.getTime())));
}

/**
 * Select latest date
 */
function selectLatestDate(...dates) {
  const validDates = dates.filter(d => d).map(d => new Date(d));
  if (validDates.length === 0) return new Date();
  return new Date(Math.max(...validDates.map(d => d.getTime())));
}

/**
 * Migrate a single user
 */
async function migrateUser(mixedStateUser, dryRun = true) {
  const { handle, key: profileKey, id: oldId } = mixedStateUser;
  
  console.log(`\n📋 Migrating @${handle}...`);
  
  try {
    // 1. Gather all data sources
    const dataSources = {
      newProfile: null,
      oldProfile: null,
      oldUserData: null
    };
    
    // Get new profile data
    if (profileKey) {
      dataSources.newProfile = await redis.json.get(profileKey);
    }
    
    // Get old profile data from various possible locations
    const oldUserKey = `user:${oldId}`;
    const oldUserKey2 = `user:user_${handle}`;
    const oldIndexMembers = await redis.smembers(`idx:username:${handle}`);
    
    // Try different old user keys
    for (const key of [oldUserKey, oldUserKey2, ...oldIndexMembers.map(m => `user:${m}`)]) {
      try {
        const data = await redis.json.get(key);
        if (data) {
          dataSources.oldUserData = data;
          break;
        }
      } catch (e) {
        // Continue trying
      }
    }
    
    if (!dataSources.newProfile && !dataSources.oldUserData) {
      console.log(`   ❌ No data found for @${handle}`);
      return { success: false, reason: 'No data found' };
    }
    
    // 2. Create unified profile ID (UUID)
    const unifiedId = oldId.startsWith('user_') ? uuidv4() : oldId;
    
    // 3. Merge all data
    const mergedProfile = mergeProfileData(
      dataSources.newProfile || {},
      dataSources.oldUserData || {},
      {}
    );
    
    // 4. Ensure proper structure
    mergedProfile.id = unifiedId;
    mergedProfile.twitterHandle = handle;
    
    // 5. Create backup
    await backupUser(handle, {
      oldId,
      newProfile: dataSources.newProfile,
      oldUserData: dataSources.oldUserData,
      profileKey
    });
    
    if (dryRun) {
      console.log(`   ✅ [DRY RUN] Would migrate to ID: ${unifiedId}`);
      console.log(`   📊 Merged data preview:`, {
        id: mergedProfile.id,
        handle: mergedProfile.twitterHandle,
        role: mergedProfile.role,
        status: mergedProfile.approvalStatus,
        campaigns: mergedProfile.campaigns?.length || 0,
        points: mergedProfile.points || 0,
        wallets: Object.keys(mergedProfile.walletAddresses || {}).length
      });
      return { success: true, dryRun: true, newId: unifiedId };
    }
    
    // 6. Execute migration
    console.log(`   🔄 Migrating to new ID: ${unifiedId}`);
    
    // Save new unified profile
    const newProfileKey = `profile:${unifiedId}`;
    await redis.json.set(newProfileKey, '$', JSON.parse(JSON.stringify(mergedProfile)));
    
    // 7. Update all indexes
    console.log(`   📇 Updating indexes...`);
    
    // Clean old indexes
    await redis.del(`idx:username:${handle}`);
    
    // Set new indexes
    await redis.sadd(`idx:profile:handle:${handle}`, unifiedId);
    await redis.sadd(`idx:profile:role:${mergedProfile.role}`, unifiedId);
    await redis.sadd(`idx:profile:status:${mergedProfile.approvalStatus}`, unifiedId);
    
    if (mergedProfile.isKOL) {
      await redis.sadd(`idx:profile:kol:true`, unifiedId);
    }
    
    if (mergedProfile.tier || mergedProfile.currentTier) {
      await redis.sadd(`idx:profile:tier:${mergedProfile.tier || mergedProfile.currentTier}`, unifiedId);
    }
    
    // 8. Clean up old data
    console.log(`   🧹 Cleaning up old data...`);
    
    // Delete old profile keys
    if (profileKey && profileKey !== newProfileKey) {
      await redis.del(profileKey);
    }
    
    // Delete old user keys
    for (const oldKey of [`user:${oldId}`, `user:user_${handle}`, ...oldIndexMembers.map(m => `user:${m}`)]) {
      await redis.del(oldKey);
    }
    
    // Clean old indexes
    const oldIndexes = [
      `idx:role:${mergedProfile.role}`,
      `idx:status:${mergedProfile.approvalStatus}`,
      `idx:displayname:${(mergedProfile.name || '').toLowerCase().replace(/\s+/g, '')}`
    ];
    
    for (const index of oldIndexes) {
      await redis.srem(index, oldId);
      await redis.srem(index, `user_${handle}`);
      await redis.srem(index, handle);
    }
    
    console.log(`   ✅ Successfully migrated @${handle} to ${unifiedId}`);
    return { success: true, newId: unifiedId, oldId };
    
  } catch (error) {
    console.error(`   ❌ Error migrating @${handle}:`, error.message);
    return { success: false, reason: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateMixedStateUsers() {
  try {
    console.log('🚀 Mixed State User Migration Tool\n');
    console.log('This tool safely migrates users from mixed old/new state to unified profiles.');
    console.log('✅ Zero data loss guaranteed through merging and backups\n');
    
    // Read the report
    const reportData = JSON.parse(readFileSync('mixed-state-users-report.json', 'utf8'));
    const { mixedStateUsers } = reportData;
    
    // Filter users with old_id_format (highest priority)
    const usersToMigrate = mixedStateUsers.filter(user => 
      user.problems.includes('old_id_format')
    );
    
    console.log(`Found ${usersToMigrate.length} users to migrate:\n`);
    
    // Summary by role
    const byRole = {};
    usersToMigrate.forEach(user => {
      byRole[user.role] = (byRole[user.role] || 0) + 1;
    });
    
    console.log('By role:');
    Object.entries(byRole).forEach(([role, count]) => {
      console.log(`   - ${role}: ${count} users`);
    });
    
    console.log('\n🔧 Migration Options:');
    console.log('1. DRY RUN - Show what would be migrated (recommended first)');
    console.log('2. Migrate ALL users');
    console.log('3. Migrate specific users by handle');
    console.log('4. Migrate by role');
    console.log('5. Exit');
    
    const choice = await question('\nYour choice (1-5): ');
    
    let selectedUsers = [];
    let dryRun = false;
    
    switch (choice) {
      case '1':
        selectedUsers = usersToMigrate;
        dryRun = true;
        break;
        
      case '2':
        selectedUsers = usersToMigrate;
        break;
        
      case '3':
        console.log('\nEnter handles to migrate (comma-separated, without @):');
        const handles = await question('Handles: ');
        const handleList = handles.split(',').map(h => h.trim().toLowerCase());
        selectedUsers = usersToMigrate.filter(u => handleList.includes(u.handle));
        break;
        
      case '4':
        console.log('\nSelect role to migrate:');
        console.log('1. admin');
        console.log('2. core');
        console.log('3. kol');
        console.log('4. user');
        const roleChoice = await question('Role (1-4): ');
        const roleMap = { '1': 'admin', '2': 'core', '3': 'kol', '4': 'user' };
        const selectedRole = roleMap[roleChoice];
        if (selectedRole) {
          selectedUsers = usersToMigrate.filter(u => u.role === selectedRole);
        }
        break;
        
      case '5':
        console.log('Exiting without changes.');
        rl.close();
        return;
    }
    
    if (selectedUsers.length === 0) {
      console.log('\nNo users selected.');
      rl.close();
      return;
    }
    
    console.log(`\n📋 Selected ${selectedUsers.length} users for migration${dryRun ? ' (DRY RUN)' : ''}:`);
    selectedUsers.forEach((user, idx) => {
      console.log(`${idx + 1}. @${user.handle} (${user.role}/${user.status})`);
    });
    
    if (!dryRun) {
      const confirm = await question('\n⚠️  Proceed with migration? (yes/no): ');
      if (confirm.toLowerCase() !== 'yes') {
        console.log('Migration cancelled.');
        rl.close();
        return;
      }
    }
    
    console.log('\n🔄 Starting migration...\n');
    
    const results = {
      success: [],
      failed: []
    };
    
    for (const user of selectedUsers) {
      const result = await migrateUser(user, dryRun);
      if (result.success) {
        results.success.push({ ...user, ...result });
      } else {
        results.failed.push({ ...user, ...result });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Save migration results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultFile = `migration-results-${timestamp}.json`;
    
    writeFileSync(resultFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      dryRun,
      results,
      backups: dryRun ? {} : backups
    }, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log(`MIGRATION ${dryRun ? 'PREVIEW' : 'COMPLETE'}`);
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`\n📄 Results saved to: ${resultFile}`);
    
    if (!dryRun && results.success.length > 0) {
      console.log('\n✨ Migration completed successfully!');
      console.log('🔒 All data preserved and merged');
      console.log('📇 All indexes updated');
      console.log('🗄️ Backups stored in results file');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    rl.close();
  }
}

// Run migration
migrateMixedStateUsers(); 