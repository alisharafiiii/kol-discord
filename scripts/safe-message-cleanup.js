const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function safeMessageCleanup() {
  console.log('🧹 SAFE DISCORD MESSAGE CLEANUP\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Identify valid projects
    console.log('1️⃣ IDENTIFYING VALID PROJECTS...');
    const projectKeys = await redis.keys('project:discord:*');
    const validProjects = new Set();
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key);
      if (project && project.id) {
        validProjects.add(project.id);
        console.log(`   ✓ ${project.name} (${project.id})`);
      }
    }
    
    console.log(`\n   Valid projects: ${validProjects.size}`);
    
    // 2. Count messages to clean
    console.log('\n2️⃣ ANALYZING MESSAGES...');
    
    let totalMessages = 0;
    let messagesToDelete = [];
    let messagesToKeep = 0;
    let cursor = 0;
    
    // Scan all messages
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: 500 
      });
      cursor = newCursor;
      
      // Check each message
      for (const msgKey of keys) {
        try {
          const msg = await redis.json.get(msgKey);
          totalMessages++;
          
          if (!msg || !msg.projectId || !validProjects.has(msg.projectId)) {
            messagesToDelete.push(msgKey);
          } else {
            messagesToKeep++;
          }
          
          // Progress update
          if (totalMessages % 1000 === 0) {
            console.log(`   Analyzed ${totalMessages} messages...`);
          }
        } catch (error) {
          // If can't read message, mark for deletion
          messagesToDelete.push(msgKey);
        }
      }
    } while (cursor !== 0);
    
    console.log(`\n   Total messages: ${totalMessages}`);
    console.log(`   Messages to keep: ${messagesToKeep}`);
    console.log(`   Messages to delete: ${messagesToDelete.length}`);
    
    // 3. Show what will be deleted
    console.log('\n3️⃣ CLEANUP SUMMARY:');
    
    // Sample some messages to be deleted
    const sampleSize = Math.min(5, messagesToDelete.length);
    console.log(`\n   Sample of messages to be deleted:`);
    
    for (let i = 0; i < sampleSize; i++) {
      try {
        const msg = await redis.json.get(messagesToDelete[i]);
        if (msg) {
          console.log(`   - Project: ${msg.projectId || 'UNKNOWN'}`);
          console.log(`     Server: ${msg.serverName || 'UNKNOWN'}`);
          console.log(`     Content: "${(msg.content || '').substring(0, 50)}..."\n`);
        }
      } catch (e) {
        console.log(`   - Corrupted message: ${messagesToDelete[i]}\n`);
      }
    }
    
    // 4. Confirm before proceeding
    if (messagesToDelete.length === 0) {
      console.log('\n✅ No orphaned messages found! All messages belong to valid projects.');
      return;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('⚠️  CLEANUP CONFIRMATION:');
    console.log(`   This will DELETE ${messagesToDelete.length} orphaned messages`);
    console.log(`   and KEEP ${messagesToKeep} valid messages`);
    console.log('\n   Valid projects that will be preserved:');
    for (const projectId of validProjects) {
      console.log(`   - ${projectId}`);
    }
    
    // 5. Perform cleanup
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nProceed with cleanup? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        console.log('\n4️⃣ PERFORMING CLEANUP...');
        
        let deleted = 0;
        const BATCH_SIZE = 100;
        
        // Delete in batches
        for (let i = 0; i < messagesToDelete.length; i += BATCH_SIZE) {
          const batch = messagesToDelete.slice(i, i + BATCH_SIZE);
          await redis.del(...batch);
          deleted += batch.length;
          
          if (deleted % 1000 === 0) {
            console.log(`   Deleted ${deleted}/${messagesToDelete.length} messages...`);
          }
        }
        
        console.log(`   ✅ Deleted ${deleted} orphaned messages`);
        
        // 6. Rebuild indexes for valid projects
        console.log('\n5️⃣ REBUILDING INDEXES...');
        
        // Clear all indexes first
        const indexPatterns = [
          'discord:messages:project:*',
          'discord:messages:user:*',
          'discord:messages:channel:*'
        ];
        
        for (const pattern of indexPatterns) {
          let indexCursor = 0;
          do {
            const [newCursor, keys] = await redis.scan(indexCursor, { 
              match: pattern, 
              count: 100 
            });
            indexCursor = newCursor;
            if (keys.length > 0) {
              await redis.del(...keys);
            }
          } while (indexCursor !== 0);
        }
        
        console.log('   Cleared old indexes');
        
        // Rebuild from remaining messages
        cursor = 0;
        let rebuilt = 0;
        
        do {
          const [newCursor, keys] = await redis.scan(cursor, { 
            match: 'message:discord:*', 
            count: 100 
          });
          cursor = newCursor;
          
          for (const msgKey of keys) {
            try {
              const msg = await redis.json.get(msgKey);
              if (msg && msg.projectId && validProjects.has(msg.projectId)) {
                await redis.sadd(`discord:messages:project:${msg.projectId}`, msgKey);
                await redis.sadd(`discord:messages:channel:${msg.channelId}`, msgKey);
                await redis.sadd(`discord:messages:user:${msg.userId}`, msgKey);
                rebuilt++;
              }
            } catch (e) {}
          }
        } while (cursor !== 0);
        
        console.log(`   ✅ Rebuilt indexes for ${rebuilt} messages`);
        
        // Final verification
        console.log('\n' + '='.repeat(60));
        console.log('✅ CLEANUP COMPLETE!\n');
        
        for (const projectId of validProjects) {
          const count = await redis.scard(`discord:messages:project:${projectId}`);
          console.log(`   ${projectId}: ${count} messages`);
        }
        
        console.log(`\nReduced from ${totalMessages} to ${rebuilt} messages`);
        console.log('All orphaned messages removed successfully!');
        
      } else {
        console.log('\nCleanup cancelled.');
      }
      
      rl.close();
    });
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
safeMessageCleanup(); 