const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function emergencyCleanup() {
  console.log('🚨 EMERGENCY DISCORD MESSAGE CLEANUP\n');
  console.log('='.repeat(70));
  console.log('⚠️  This script will remove duplicate and orphaned messages\n');
  
  try {
    // 1. First, ensure bot is not running
    console.log('⚠️  IMPORTANT: Make sure Discord analytics bot is STOPPED!');
    console.log('   Run: npm run discord:analytics:stop\n');
    
    // 2. Get valid projects
    console.log('1️⃣ IDENTIFYING VALID PROJECTS:');
    const validProjects = new Set();
    const projectKeys = await redis.keys('project:discord:*');
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key);
      if (project && project.id) {
        validProjects.add(project.id);
        console.log(`   ✅ ${project.name} (${project.id})`);
      }
    }
    
    // 3. Count current messages
    console.log('\n2️⃣ COUNTING MESSAGES:');
    let totalMessages = 0;
    let cursor = 0;
    
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: 5000 
      });
      cursor = newCursor;
      totalMessages += keys.length;
    } while (cursor !== 0);
    
    console.log(`   Total messages found: ${totalMessages}`);
    
    // 4. Find and remove duplicates
    console.log('\n3️⃣ REMOVING DUPLICATE MESSAGES:');
    
    const messageIdToKey = new Map();
    const duplicateKeys = [];
    cursor = 0;
    let processed = 0;
    
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: 1000 
      });
      cursor = newCursor;
      
      for (const msgKey of keys) {
        try {
          const msg = await redis.json.get(msgKey);
          processed++;
          
          if (msg && msg.messageId) {
            if (messageIdToKey.has(msg.messageId)) {
              // This is a duplicate
              duplicateKeys.push(msgKey);
            } else {
              messageIdToKey.set(msg.messageId, msgKey);
            }
          } else {
            // No message ID = invalid
            duplicateKeys.push(msgKey);
          }
        } catch (e) {
          // Can't read = invalid
          duplicateKeys.push(msgKey);
        }
        
        if (processed % 5000 === 0) {
          console.log(`   Processed ${processed}/${totalMessages} messages...`);
        }
      }
    } while (cursor !== 0);
    
    console.log(`   Found ${duplicateKeys.length} duplicate/invalid messages`);
    
    // Delete duplicates in batches
    if (duplicateKeys.length > 0) {
      console.log('   Deleting duplicates...');
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < duplicateKeys.length; i += BATCH_SIZE) {
        const batch = duplicateKeys.slice(i, i + BATCH_SIZE);
        await redis.del(...batch);
        
        if ((i + BATCH_SIZE) % 1000 === 0) {
          console.log(`   Deleted ${i + BATCH_SIZE}/${duplicateKeys.length} duplicates...`);
        }
      }
      console.log(`   ✅ Deleted ${duplicateKeys.length} duplicate messages`);
    }
    
    // 5. Remove orphaned messages
    console.log('\n4️⃣ REMOVING ORPHANED MESSAGES:');
    
    const orphanedKeys = [];
    const validMessageKeys = [];
    cursor = 0;
    
    // Find orphaned messages
    for (const [messageId, msgKey] of messageIdToKey) {
      try {
        const msg = await redis.json.get(msgKey);
        if (msg && msg.projectId) {
          if (validProjects.has(msg.projectId)) {
            validMessageKeys.push({ key: msgKey, msg });
          } else {
            orphanedKeys.push(msgKey);
          }
        } else {
          orphanedKeys.push(msgKey);
        }
      } catch (e) {
        orphanedKeys.push(msgKey);
      }
    }
    
    console.log(`   Found ${orphanedKeys.length} orphaned messages`);
    console.log(`   Found ${validMessageKeys.length} valid messages`);
    
    // Delete orphaned messages
    if (orphanedKeys.length > 0) {
      console.log('   Deleting orphaned messages...');
      const BATCH_SIZE = 100;
      
      for (let i = 0; i < orphanedKeys.length; i += BATCH_SIZE) {
        const batch = orphanedKeys.slice(i, i + BATCH_SIZE);
        await redis.del(...batch);
        
        if ((i + BATCH_SIZE) % 1000 === 0) {
          console.log(`   Deleted ${i + BATCH_SIZE}/${orphanedKeys.length} orphaned...`);
        }
      }
      console.log(`   ✅ Deleted ${orphanedKeys.length} orphaned messages`);
    }
    
    // 6. Rebuild clean indexes
    console.log('\n5️⃣ REBUILDING CLEAN INDEXES:');
    
    // Clear old indexes
    const indexPatterns = [
      'discord:messages:project:*',
      'discord:messages:user:*',
      'discord:messages:channel:*'
    ];
    
    for (const pattern of indexPatterns) {
      cursor = 0;
      do {
        const [newCursor, keys] = await redis.scan(cursor, { 
          match: pattern, 
          count: 100 
        });
        cursor = newCursor;
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } while (cursor !== 0);
    }
    console.log('   Cleared old indexes');
    
    // Rebuild from valid messages
    let rebuilt = 0;
    for (const { key, msg } of validMessageKeys) {
      await redis.sadd(`discord:messages:project:${msg.projectId}`, key);
      await redis.sadd(`discord:messages:channel:${msg.channelId}`, key);
      await redis.sadd(`discord:messages:user:${msg.userId}`, key);
      rebuilt++;
      
      if (rebuilt % 500 === 0) {
        console.log(`   Rebuilt ${rebuilt}/${validMessageKeys.length} messages...`);
      }
    }
    
    console.log(`   ✅ Rebuilt indexes for ${rebuilt} valid messages`);
    
    // 7. Final verification
    console.log('\n6️⃣ FINAL VERIFICATION:');
    
    for (const projectId of validProjects) {
      const count = await redis.scard(`discord:messages:project:${projectId}`);
      const project = await redis.json.get(projectId);
      console.log(`   ${project.name}: ${count} messages`);
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ EMERGENCY CLEANUP COMPLETE!\n');
    console.log(`Started with: ${totalMessages} messages`);
    console.log(`Removed: ${duplicateKeys.length} duplicates`);
    console.log(`Removed: ${orphanedKeys.length} orphaned`);
    console.log(`Final count: ${validMessageKeys.length} valid messages`);
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Check bot logs for any errors');
    console.log('2. Fix any bot issues before restarting');
    console.log('3. Restart bot: npm run discord:analytics:start');
    console.log('4. Monitor for any new duplicates');
    
  } catch (error) {
    console.error('\n❌ Emergency cleanup failed:', error);
    console.error('\nPlease contact support immediately!');
  }
}

// Run immediately
console.log('Starting emergency cleanup...\n');
emergencyCleanup();
