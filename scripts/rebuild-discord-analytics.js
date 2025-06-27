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

async function rebuildAnalytics() {
  console.log('🔧 Discord Analytics Recovery & Rebuild\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Clean up duplicate projects
    console.log('\n1️⃣ Checking for Duplicate Projects...');
    const projectKeys = await scanKeys('project:discord:*');
    const projectsByServerId = new Map();
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key);
      if (!project) continue;
      
      const existing = projectsByServerId.get(project.serverId);
      if (existing) {
        console.log(`   ⚠️ Duplicate found: ${project.name} (${project.serverId})`);
        console.log(`      - ${existing.id} (created: ${existing.createdAt})`);
        console.log(`      - ${project.id} (created: ${project.createdAt})`);
        
        // Keep the older one
        const existingDate = new Date(existing.createdAt);
        const projectDate = new Date(project.createdAt);
        
        if (projectDate < existingDate) {
          projectsByServerId.set(project.serverId, project);
        }
      } else {
        projectsByServerId.set(project.serverId, project);
      }
    }
    
    console.log(`   ✅ Found ${projectsByServerId.size} unique projects`);
    
    // 2. Rebuild message indexes
    console.log('\n2️⃣ Rebuilding Message Indexes...');
    
    // Clear old indexes first
    const oldIndexKeys = [
      ...await scanKeys('discord:messages:project:*'),
      ...await scanKeys('discord:messages:channel:*'),
      ...await scanKeys('discord:messages:user:*')
    ];
    
    console.log(`   Clearing ${oldIndexKeys.length} old index keys...`);
    for (const key of oldIndexKeys) {
      await redis.del(key);
    }
    
    // Scan all messages and rebuild indexes
    const messageKeys = await scanKeys('message:discord:*', 50000);
    console.log(`   Processing ${messageKeys.length} messages...`);
    
    let processed = 0;
    let errors = 0;
    const userStats = new Map();
    const projectStats = new Map();
    
    for (const msgKey of messageKeys) {
      try {
        const message = await redis.json.get(msgKey);
        if (!message) {
          errors++;
          continue;
        }
        
        // Add to project index
        await redis.sadd(`discord:messages:project:${message.projectId}`, msgKey);
        
        // Add to channel index
        await redis.sadd(`discord:messages:channel:${message.channelId}`, msgKey);
        
        // Add to user index
        await redis.sadd(`discord:messages:user:${message.userId}`, msgKey);
        
        // Update user stats
        const userKey = `${message.userId}:${message.projectId}`;
        if (!userStats.has(userKey)) {
          userStats.set(userKey, {
            userId: message.userId,
            username: message.username,
            projectId: message.projectId,
            messageCount: 0,
            sentimentCounts: { positive: 0, neutral: 0, negative: 0 }
          });
        }
        
        const stats = userStats.get(userKey);
        stats.messageCount++;
        if (message.sentiment?.score) {
          stats.sentimentCounts[message.sentiment.score]++;
        }
        
        // Update project stats
        if (!projectStats.has(message.projectId)) {
          projectStats.set(message.projectId, {
            totalMessages: 0,
            uniqueUsers: new Set(),
            channels: new Set()
          });
        }
        
        const pStats = projectStats.get(message.projectId);
        pStats.totalMessages++;
        pStats.uniqueUsers.add(message.userId);
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
    
    console.log(`   ✅ Processed ${processed} messages (${errors} errors)`);
    
    // 3. Update user statistics
    console.log('\n3️⃣ Rebuilding User Statistics...');
    
    for (const [key, stats] of userStats) {
      const userKey = `discord:user:${stats.userId}`;
      let user = await redis.json.get(userKey);
      
      if (!user) {
        user = {
          id: stats.userId,
          username: stats.username,
          projects: [],
          stats: {}
        };
      }
      
      if (!user.projects.includes(stats.projectId)) {
        user.projects.push(stats.projectId);
      }
      
      user.stats[stats.projectId] = {
        messageCount: stats.messageCount,
        lastSeen: new Date().toISOString(),
        sentimentBreakdown: stats.sentimentCounts
      };
      
      await redis.json.set(userKey, '$', user);
      await redis.sadd(`discord:users:project:${stats.projectId}`, stats.userId);
    }
    
    console.log(`   ✅ Updated ${userStats.size} user statistics`);
    
    // 4. Update project statistics
    console.log('\n4️⃣ Updating Project Statistics...');
    
    for (const [projectId, stats] of projectStats) {
      const project = await redis.json.get(projectId);
      if (!project) continue;
      
      project.stats = {
        totalMessages: stats.totalMessages,
        totalUsers: stats.uniqueUsers.size,
        totalChannels: stats.channels.size,
        lastActivity: new Date().toISOString()
      };
      
      await redis.json.set(projectId, '$', project);
      console.log(`   Updated ${project.name}: ${stats.totalMessages} messages, ${stats.uniqueUsers.size} users`);
    }
    
    // 5. Clear analytics cache
    console.log('\n5️⃣ Clearing Analytics Cache...');
    const cacheKeys = await scanKeys('analytics:cache:*');
    for (const key of cacheKeys) {
      await redis.del(key);
    }
    console.log(`   ✅ Cleared ${cacheKeys.length} cache entries`);
    
    // 6. Verify integrity
    console.log('\n6️⃣ Verifying Data Integrity...');
    let integrityIssues = 0;
    
    for (const [projectId, project] of projectsByServerId) {
      const indexKey = `discord:messages:project:${project.id}`;
      const messageIds = await redis.smembers(indexKey);
      
      // Check a sample
      const sampleSize = Math.min(50, messageIds.length);
      let missing = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const exists = await redis.exists(messageIds[i]);
        if (!exists) missing++;
      }
      
      if (missing > 0) {
        integrityIssues++;
        console.log(`   ⚠️ ${project.name}: ${missing}/${sampleSize} messages missing`);
      }
    }
    
    if (integrityIssues === 0) {
      console.log('   ✅ All indexes verified successfully');
    }
    
    // 7. Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ RECOVERY COMPLETE\n');
    console.log('Summary:');
    console.log(`- Projects: ${projectsByServerId.size}`);
    console.log(`- Messages indexed: ${processed}`);
    console.log(`- User stats updated: ${userStats.size}`);
    console.log(`- Cache cleared: ${cacheKeys.length} entries`);
    console.log(`- Integrity issues: ${integrityIssues}`);
    
    console.log('\n📝 Next Steps:');
    console.log('1. Verify analytics dashboard shows correct data');
    console.log('2. Monitor bot logs for any errors');
    console.log('3. Set up regular backups of Redis data');
    console.log('4. Consider implementing data retention policies');
    
  } catch (error) {
    console.error('\n❌ Recovery failed:', error);
  }
}

// Run recovery
rebuildAnalytics(); 