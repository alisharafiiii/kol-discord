const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function scanKeys(pattern, limit = 1000) {
  const results = [];
  let cursor = 0;
  let count = 0;
  
  do {
    const [newCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 });
    cursor = newCursor;
    results.push(...keys);
    count += keys.length;
    if (count >= limit) break;
  } while (cursor !== 0);
  
  return results;
}

async function diagnoseDataLoss() {
  console.log('🔍 Discord Analytics Data Loss Diagnosis\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Check Redis connection
    console.log('\n1️⃣ Checking Redis Connection...');
    const ping = await redis.ping();
    console.log('   ✅ Redis connected:', ping);
    
    // 2. Count key types
    console.log('\n2️⃣ Counting Discord-related Keys...');
    
    const projectKeys = await scanKeys('project:discord:*', 100);
    console.log('   📁 Discord Projects:', projectKeys.length);
    
    const messageKeys = await scanKeys('message:discord:*', 1000);
    console.log('   💬 Discord Messages (sample):', messageKeys.length);
    
    const projectIndexKeys = await scanKeys('discord:messages:project:*', 100);
    console.log('   📊 Project Message Indexes:', projectIndexKeys.length);
    
    const userIndexKeys = await scanKeys('discord:messages:user:*', 500);
    console.log('   👥 User Message Indexes:', userIndexKeys.length);
    
    const channelIndexKeys = await scanKeys('discord:messages:channel:*', 200);
    console.log('   📺 Channel Message Indexes:', channelIndexKeys.length);
    
    // 3. Check for TTL issues
    console.log('\n3️⃣ Checking for TTL/Expiry Issues...');
    let ttlIssues = 0;
    const sampleMessages = messageKeys.slice(0, 20);
    
    for (const key of sampleMessages) {
      const ttl = await redis.ttl(key);
      if (ttl > 0) {
        console.log(`   ⚠️ TTL found on ${key}: ${ttl} seconds`);
        ttlIssues++;
      }
    }
    
    if (ttlIssues === 0) {
      console.log('   ✅ No TTL issues found on message keys');
    }
    
    // 4. Check project details and message counts
    console.log('\n4️⃣ Analyzing Projects and Message Integrity...');
    
    for (const projectKey of projectKeys) {
      const project = await redis.json.get(projectKey);
      if (!project) continue;
      
      console.log(`\n   📋 Project: ${project.name}`);
      console.log(`      ID: ${project.id}`);
      console.log(`      Active: ${project.isActive}`);
      
      // Check message index
      const indexKey = `discord:messages:project:${project.id}`;
      const messageIds = await redis.smembers(indexKey);
      console.log(`      Messages in index: ${messageIds.length}`);
      
      // Verify message existence
      let existingCount = 0;
      let missingCount = 0;
      const sampleSize = Math.min(messageIds.length, 50);
      
      for (let i = 0; i < sampleSize; i++) {
        const exists = await redis.exists(messageIds[i]);
        if (exists) {
          existingCount++;
        } else {
          missingCount++;
          if (missingCount <= 3) {
            console.log(`      ❌ Missing message: ${messageIds[i]}`);
          }
        }
      }
      
      console.log(`      Sample check (${sampleSize}): ${existingCount} exist, ${missingCount} missing`);
      
      if (missingCount > 0) {
        const missingPercentage = (missingCount / sampleSize * 100).toFixed(1);
        console.log(`      ⚠️ Data loss detected: ~${missingPercentage}% messages missing`);
      }
    }
    
    // 5. Check for orphaned indexes
    console.log('\n5️⃣ Checking for Orphaned Indexes...');
    let orphanedIndexes = 0;
    
    for (const indexKey of projectIndexKeys.slice(0, 10)) {
      const messageIds = await redis.smembers(indexKey);
      let orphanedCount = 0;
      
      // Check a sample
      const sample = messageIds.slice(0, 20);
      for (const msgId of sample) {
        const exists = await redis.exists(msgId);
        if (!exists) orphanedCount++;
      }
      
      if (orphanedCount > 0) {
        orphanedIndexes++;
        const percentage = (orphanedCount / sample.length * 100).toFixed(1);
        console.log(`   ⚠️ ${indexKey}: ~${percentage}% orphaned entries`);
      }
    }
    
    if (orphanedIndexes === 0) {
      console.log('   ✅ No orphaned indexes detected in sample');
    }
    
    // 6. Check message timestamps
    console.log('\n6️⃣ Analyzing Message Timeline...');
    let oldestMsg = null;
    let newestMsg = null;
    let last24h = 0;
    let last7d = 0;
    let last30d = 0;
    
    const now = Date.now();
    const messageSample = await scanKeys('message:discord:*', 200);
    
    for (const msgKey of messageSample) {
      try {
        const msg = await redis.json.get(msgKey);
        if (!msg || !msg.timestamp) continue;
        
        const msgTime = new Date(msg.timestamp).getTime();
        const age = now - msgTime;
        
        if (!oldestMsg || msgTime < new Date(oldestMsg.timestamp).getTime()) {
          oldestMsg = msg;
        }
        if (!newestMsg || msgTime > new Date(newestMsg.timestamp).getTime()) {
          newestMsg = msg;
        }
        
        if (age < 24 * 60 * 60 * 1000) last24h++;
        if (age < 7 * 24 * 60 * 60 * 1000) last7d++;
        if (age < 30 * 24 * 60 * 60 * 1000) last30d++;
      } catch (e) {
        // Skip corrupted messages
      }
    }
    
    console.log('   📅 Message Timeline (sample of', messageSample.length, '):');
    if (oldestMsg) {
      console.log('      Oldest:', new Date(oldestMsg.timestamp).toISOString());
    }
    if (newestMsg) {
      console.log('      Newest:', new Date(newestMsg.timestamp).toISOString());
    }
    console.log('      Last 24h:', last24h);
    console.log('      Last 7d:', last7d);
    console.log('      Last 30d:', last30d);
    
    // 7. Check for backup keys
    console.log('\n7️⃣ Checking for Backup Data...');
    const backupKeys = await scanKeys('*backup*discord*', 100);
    console.log('   Backup keys found:', backupKeys.length);
    
    if (backupKeys.length > 0) {
      console.log('   📦 Backup keys:');
      for (const key of backupKeys.slice(0, 10)) {
        console.log('      -', key);
      }
    }
    
    // 8. Summary and recommendations
    console.log('\n' + '='.repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY\n');
    
    if (missingCount > 0 || orphanedIndexes > 0) {
      console.log('❌ DATA LOSS DETECTED');
      console.log('\nPossible causes:');
      console.log('1. Manual deletion of keys');
      console.log('2. Redis memory eviction (check maxmemory-policy)');
      console.log('3. Upstash tier limits reached');
      console.log('4. Accidental key overwrites');
      
      console.log('\n🔧 RECOVERY ACTIONS:');
      console.log('1. Check Upstash dashboard for usage/limits');
      console.log('2. Look for Redis backups or snapshots');
      console.log('3. Check bot logs for errors during message saves');
      console.log('4. Rebuild indexes from existing messages');
    } else {
      console.log('✅ No significant data loss detected');
      console.log('\nHowever, if users report missing data:');
      console.log('1. Check specific time ranges');
      console.log('2. Verify bot was running during those periods');
      console.log('3. Check for network/connection issues in logs');
    }
    
  } catch (error) {
    console.error('\n❌ Error during diagnosis:', error);
  }
}

// Run diagnosis
diagnoseDataLoss(); 