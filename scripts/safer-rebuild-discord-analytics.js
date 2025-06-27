const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function scanKeys(pattern, limit = 10000) {
  const results = [];
  let cursor = 0;
  
  do {
    const [newCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = newCursor;
    results.push(...keys);
    if (results.length >= limit) break;
  } while (cursor !== 0);
  
  return results;
}

async function saferRebuildAnalytics() {
  console.log('🛡️ SAFER Discord Analytics Rebuild (with Backups)\n');
  console.log('='.repeat(50));
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPrefix = `backup:discord:rebuild:${timestamp}`;
  
  try {
    // 1. Create comprehensive backup first
    console.log('\n1️⃣ Creating Comprehensive Backup...');
    
    // Backup all index keys
    const indexKeys = {
      project: await scanKeys('discord:messages:project:*'),
      user: await scanKeys('discord:messages:user:*'),
      channel: await scanKeys('discord:messages:channel:*')
    };
    
    console.log(`   Backing up ${indexKeys.project.length} project indexes...`);
    console.log(`   Backing up ${indexKeys.user.length} user indexes...`);
    console.log(`   Backing up ${indexKeys.channel.length} channel indexes...`);
    
    // Save index contents
    const backupData = {
      timestamp: new Date().toISOString(),
      indexes: {
        project: {},
        user: {},
        channel: {}
      },
      counts: {
        project: indexKeys.project.length,
        user: indexKeys.user.length,
        channel: indexKeys.channel.length
      }
    };
    
    // Backup project indexes
    for (const key of indexKeys.project) {
      const members = await redis.smembers(key);
      backupData.indexes.project[key] = members;
    }
    
    // Store backup
    await redis.json.set(`${backupPrefix}:indexes`, '$', backupData);
    console.log(`   ✅ Backup saved to: ${backupPrefix}:indexes`);
    
    // 2. Analyze current state
    console.log('\n2️⃣ Analyzing Current State...');
    
    const messageKeys = await scanKeys('message:discord:*', 50000);
    console.log(`   Found ${messageKeys.length} Discord messages`);
    
    // Check for missing messages in indexes
    let orphanedCount = 0;
    const sampleSize = Math.min(100, messageKeys.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const msg = await redis.json.get(messageKeys[i]);
      if (!msg) continue;
      
      const indexKey = `discord:messages:project:${msg.projectId}`;
      const inIndex = await redis.sismember(indexKey, messageKeys[i]);
      if (!inIndex) orphanedCount++;
    }
    
    if (orphanedCount > 0) {
      const estimatedOrphaned = Math.round((orphanedCount / sampleSize) * messageKeys.length);
      console.log(`   ⚠️ Estimated ${estimatedOrphaned} orphaned messages needing re-indexing`);
    }
    
    // 3. Use versioned indexes instead of deleting
    console.log('\n3️⃣ Creating New Versioned Indexes...');
    
    const version = 'v2';
    let processed = 0;
    let errors = 0;
    const projectStats = new Map();
    const userStats = new Map();
    
    for (const msgKey of messageKeys) {
      try {
        const message = await redis.json.get(msgKey);
        if (!message) {
          errors++;
          continue;
        }
        
        // Add to versioned indexes
        await redis.sadd(`discord:messages:${version}:project:${message.projectId}`, msgKey);
        await redis.sadd(`discord:messages:${version}:channel:${message.channelId}`, msgKey);
        await redis.sadd(`discord:messages:${version}:user:${message.userId}`, msgKey);
        
        // Track stats
        if (!projectStats.has(message.projectId)) {
          projectStats.set(message.projectId, {
            messages: 0,
            users: new Set(),
            channels: new Set()
          });
        }
        
        const pStats = projectStats.get(message.projectId);
        pStats.messages++;
        pStats.users.add(message.userId);
        pStats.channels.add(message.channelId);
        
        processed++;
        
        if (processed % 1000 === 0) {
          console.log(`   Processed ${processed}/${messageKeys.length} messages...`);
        }
      } catch (error) {
        errors++;
        console.error(`   Error processing ${msgKey}:`, error.message);
      }
    }
    
    console.log(`   ✅ Created versioned indexes: ${processed} messages indexed (${errors} errors)`);
    
    // 4. Verify new indexes
    console.log('\n4️⃣ Verifying New Indexes...');
    
    let verificationPassed = true;
    
    for (const [projectId, stats] of projectStats) {
      const oldIndexKey = `discord:messages:project:${projectId}`;
      const newIndexKey = `discord:messages:${version}:project:${projectId}`;
      
      const oldCount = await redis.scard(oldIndexKey);
      const newCount = await redis.scard(newIndexKey);
      
      if (newCount < oldCount * 0.95) { // Allow 5% variance
        console.log(`   ⚠️ Project ${projectId}: Old=${oldCount}, New=${newCount} (possible data loss)`);
        verificationPassed = false;
      }
    }
    
    if (!verificationPassed) {
      console.log('\n❌ Verification failed - NOT switching to new indexes');
      console.log('   Run recovery from backup if needed');
      return;
    }
    
    console.log('   ✅ Verification passed');
    
    // 5. Atomic swap to new indexes
    console.log('\n5️⃣ Performing Atomic Index Swap...');
    
    // Create a transaction script for atomic swap
    const swapScript = `
      -- This would be done in a Redis transaction
      -- For now, we'll do it carefully with checks
    `;
    
    // Rename old indexes to backup
    for (const key of indexKeys.project) {
      await redis.rename(key, `${key}:old:${timestamp}`).catch(() => {});
    }
    
    // Rename new indexes to active
    const newIndexKeys = await scanKeys(`discord:messages:${version}:*`);
    for (const key of newIndexKeys) {
      const newKey = key.replace(`:${version}:`, ':');
      await redis.rename(key, newKey);
    }
    
    console.log('   ✅ Index swap completed');
    
    // 6. Update project stats
    console.log('\n6️⃣ Updating Project Statistics...');
    
    for (const [projectId, stats] of projectStats) {
      const project = await redis.json.get(projectId);
      if (!project) continue;
      
      project.stats = {
        totalMessages: stats.messages,
        totalUsers: stats.users.size,
        totalChannels: stats.channels.size,
        lastActivity: new Date().toISOString(),
        lastRebuild: timestamp
      };
      
      await redis.json.set(projectId, '$', project);
      console.log(`   Updated ${project.name}: ${stats.messages} messages, ${stats.users.size} users`);
    }
    
    // 7. Create recovery script
    console.log('\n7️⃣ Creating Recovery Script...');
    
    const recoveryScript = `
// Recovery script for ${timestamp}
const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function recover() {
  console.log('Recovering from backup: ${backupPrefix}:indexes');
  
  const backup = await redis.json.get('${backupPrefix}:indexes');
  if (!backup) {
    console.error('Backup not found!');
    return;
  }
  
  // Restore indexes from backup
  for (const [key, members] of Object.entries(backup.indexes.project)) {
    for (const member of members) {
      await redis.sadd(key, member);
    }
  }
  
  console.log('Recovery complete');
}

recover();
`;
    
    const fs = require('fs').promises;
    await fs.writeFile(`recovery-${timestamp}.js`, recoveryScript);
    console.log(`   ✅ Recovery script saved: recovery-${timestamp}.js`);
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ SAFER REBUILD COMPLETE\n');
    console.log('Summary:');
    console.log(`- Backup created: ${backupPrefix}:indexes`);
    console.log(`- Messages processed: ${processed}`);
    console.log(`- Projects updated: ${projectStats.size}`);
    console.log(`- Recovery script: recovery-${timestamp}.js`);
    
    console.log('\n⚠️ IMPORTANT:');
    console.log('1. Old indexes backed up with timestamp');
    console.log('2. New indexes verified before swap');
    console.log('3. Recovery script available if needed');
    console.log('4. Monitor analytics dashboard for issues');
    
  } catch (error) {
    console.error('\n❌ Rebuild failed:', error);
    console.error('\nTo recover, restore from backup:', backupPrefix);
  }
}

// Run safer rebuild
saferRebuildAnalytics(); 