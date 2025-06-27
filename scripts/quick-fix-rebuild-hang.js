const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function quickRebuild() {
  console.log('⚡ QUICK Discord Analytics Rebuild (Skip Backup)\n');
  console.log('='.repeat(50));
  console.log('\n⚠️  WARNING: This skips the backup phase to avoid hanging');
  console.log('   Only use if you trust the data integrity\n');
  
  try {
    // 1. Quick count of current state
    console.log('1️⃣ Quick Analysis...');
    
    // Count messages using SCAN
    let messageCount = 0;
    let cursor = 0;
    
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: 1000  // Larger count for speed
      });
      cursor = newCursor;
      messageCount += keys.length;
    } while (cursor !== 0);
    
    console.log(`   Found ${messageCount} Discord messages to process`);
    
    // 2. Clear ALL old indexes (the nuclear option)
    console.log('\n2️⃣ Clearing Old Indexes...');
    console.log('   ⚠️  This will delete ALL Discord indexes');
    
    const patterns = [
      'discord:messages:project:*',
      'discord:messages:user:*', 
      'discord:messages:channel:*'
    ];
    
    for (const pattern of patterns) {
      let deleted = 0;
      cursor = 0;
      
      do {
        const [newCursor, keys] = await redis.scan(cursor, { 
          match: pattern, 
          count: 100 
        });
        cursor = newCursor;
        
        // Delete in batches
        if (keys.length > 0) {
          await redis.del(...keys);
          deleted += keys.length;
        }
      } while (cursor !== 0);
      
      console.log(`   Deleted ${deleted} ${pattern} indexes`);
    }
    
    // 3. Rebuild indexes from scratch
    console.log('\n3️⃣ Rebuilding Indexes...');
    
    let processed = 0;
    let errors = 0;
    const projectStats = new Map();
    
    cursor = 0;
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: 100 
      });
      cursor = newCursor;
      
      // Process batch
      for (const msgKey of keys) {
        try {
          const message = await redis.json.get(msgKey);
          if (!message) {
            errors++;
            continue;
          }
          
          // Add to indexes
          await redis.sadd(`discord:messages:project:${message.projectId}`, msgKey);
          await redis.sadd(`discord:messages:channel:${message.channelId}`, msgKey);
          await redis.sadd(`discord:messages:user:${message.userId}`, msgKey);
          
          // Track stats
          if (!projectStats.has(message.projectId)) {
            projectStats.set(message.projectId, {
              messages: 0,
              users: new Set(),
              projectName: message.projectId
            });
          }
          
          const pStats = projectStats.get(message.projectId);
          pStats.messages++;
          pStats.users.add(message.userId);
          
          processed++;
          
          if (processed % 500 === 0) {
            console.log(`   Processed ${processed}/${messageCount} messages...`);
          }
        } catch (error) {
          errors++;
        }
      }
    } while (cursor !== 0);
    
    console.log(`   ✅ Rebuilt indexes: ${processed} messages (${errors} errors)`);
    
    // 4. Update project stats
    console.log('\n4️⃣ Updating Project Statistics...');
    
    for (const [projectId, stats] of projectStats) {
      try {
        const project = await redis.json.get(projectId);
        if (!project) continue;
        
        project.stats = {
          totalMessages: stats.messages,
          totalUsers: stats.users.size,
          lastActivity: new Date().toISOString(),
          lastRebuild: new Date().toISOString()
        };
        
        await redis.json.set(projectId, '$', project);
        console.log(`   Updated ${project.name}: ${stats.messages} messages, ${stats.users.size} users`);
      } catch (error) {
        console.error(`   Error updating ${projectId}:`, error.message);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ QUICK REBUILD COMPLETE\n');
    console.log('Summary:');
    console.log(`- Messages processed: ${processed}`);
    console.log(`- Errors: ${errors}`);
    console.log(`- Projects updated: ${projectStats.size}`);
    
    // Verify Ledger specifically
    const ledgerKey = 'discord:messages:project:project:discord:OVPuPOX3_zHBnLUscRbdM';
    const ledgerCount = await redis.scard(ledgerKey);
    console.log(`\n🎯 Ledger messages: ${ledgerCount}`);
    
  } catch (error) {
    console.error('\n❌ Quick rebuild failed:', error);
  }
}

// Add confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚡ Quick Discord Analytics Rebuild');
console.log('==================================');
console.log('\nThis will:');
console.log('1. DELETE all existing Discord indexes');
console.log('2. Rebuild them from scratch');
console.log('3. Skip the backup phase that causes hanging');
console.log('\n⚠️  WARNING: No backup will be created!');
console.log('');

rl.question('Continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    quickRebuild().then(() => {
      rl.close();
    });
  } else {
    console.log('Cancelled.');
    rl.close();
  }
}); 