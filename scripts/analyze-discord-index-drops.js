const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs').promises;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function analyzeIndexDrops() {
  console.log('🔍 Analyzing Discord Analytics Index Drops\n');
  console.log('='.repeat(60));
  
  const report = {
    timestamp: new Date().toISOString(),
    findings: [],
    rootCause: null
  };
  
  try {
    // 1. Check current index counts
    console.log('\n1️⃣ Current Index State...');
    
    const projects = [];
    let cursor = 0;
    do {
      const [newCursor, keys] = await redis.scan(cursor, { match: 'project:discord:*', count: 10 });
      cursor = newCursor;
      for (const key of keys) {
        const project = await redis.json.get(key);
        if (project) projects.push(project);
      }
    } while (cursor !== 0);
    
    console.log(`   Found ${projects.length} Discord projects`);
    
    for (const project of projects) {
      console.log(`\n   📋 Project: ${project.name} (${project.id})`);
      
      // Check message count in index
      const indexKey = `discord:messages:project:${project.id}`;
      const messageIds = await redis.smembers(indexKey);
      console.log(`      Messages in index: ${messageIds.length}`);
      
      // Count actual messages
      let actualCount = 0;
      let missingCount = 0;
      const sampleSize = Math.min(100, messageIds.length);
      
      for (let i = 0; i < sampleSize; i++) {
        const exists = await redis.exists(messageIds[i]);
        if (exists) {
          actualCount++;
        } else {
          missingCount++;
        }
      }
      
      const estimatedMissing = Math.round((missingCount / sampleSize) * messageIds.length);
      console.log(`      Sample check: ${actualCount}/${sampleSize} exist`);
      if (missingCount > 0) {
        console.log(`      ⚠️ Estimated ${estimatedMissing} messages missing from ${messageIds.length} indexed`);
      }
      
      // Check for duplicate or versioned indexes
      const versionedIndexKeys = [];
      cursor = 0;
      do {
        const [newCursor, keys] = await redis.scan(cursor, { 
          match: `discord:messages:*:project:${project.id}*`, 
          count: 100 
        });
        cursor = newCursor;
        versionedIndexKeys.push(...keys);
      } while (cursor !== 0);
      
      if (versionedIndexKeys.length > 1) {
        console.log(`      ⚠️ Multiple index versions found:`);
        for (const key of versionedIndexKeys) {
          const count = await redis.scard(key);
          console.log(`         ${key}: ${count} entries`);
        }
      }
    }
    
    // 2. Check for running processes
    console.log('\n2️⃣ Checking Running Processes...');
    
    // Check bot heartbeat
    const botHeartbeat = await redis.get('discord:bot:heartbeat');
    if (botHeartbeat) {
      const lastBeat = new Date(parseInt(botHeartbeat));
      const ageSeconds = Math.round((Date.now() - lastBeat.getTime()) / 1000);
      console.log(`   Bot heartbeat: ${lastBeat.toISOString()} (${ageSeconds}s ago)`);
    } else {
      console.log('   ⚠️ No bot heartbeat found');
    }
    
    // Check for rebuild locks
    const rebuildLock = await redis.get('lock:discord:rebuild');
    if (rebuildLock) {
      console.log('   ⚠️ Active rebuild lock found!');
      report.findings.push({
        type: 'active_rebuild',
        severity: 'HIGH',
        message: 'Rebuild operation may be in progress'
      });
    }
    
    // 3. Analyze cache behavior
    console.log('\n3️⃣ Analyzing Cache Behavior...');
    
    // Check for cache keys
    const cacheKeys = [];
    cursor = 0;
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'discord:stats:cache:*', 
        count: 100 
      });
      cursor = newCursor;
      cacheKeys.push(...keys);
    } while (cursor !== 0);
    
    console.log(`   Found ${cacheKeys.length} cache keys`);
    
    for (const key of cacheKeys.slice(0, 5)) {
      const ttl = await redis.ttl(key);
      const data = await redis.json.get(key);
      console.log(`   ${key}:`);
      if (data) {
        console.log(`      Messages: ${data.totalMessages}, TTL: ${ttl}s`);
      }
    }
    
    // 4. Check recent operations
    console.log('\n4️⃣ Checking Recent Operations...');
    
    // Look for backup keys that indicate recent rebuilds
    const backupKeys = [];
    cursor = 0;
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'backup:discord:*', 
        count: 100 
      });
      cursor = newCursor;
      backupKeys.push(...keys);
    } while (cursor !== 0);
    
    console.log(`   Found ${backupKeys.length} backup keys`);
    
    // Sort by timestamp if encoded in key
    const recentBackups = backupKeys
      .filter(key => key.includes('2025'))
      .sort()
      .reverse()
      .slice(0, 5);
      
    if (recentBackups.length > 0) {
      console.log('   Recent backups:');
      for (const key of recentBackups) {
        console.log(`      ${key}`);
      }
    }
    
    // 5. Check for index manipulation patterns
    console.log('\n5️⃣ Analyzing Index Manipulation Patterns...');
    
    // Check if indexes are being overwritten
    const indexPatterns = [
      'discord:messages:project:*',
      'discord:messages:v2:project:*',
      'discord:messages:user:*',
      'discord:messages:channel:*'
    ];
    
    for (const pattern of indexPatterns) {
      const keys = [];
      cursor = 0;
      do {
        const [newCursor, foundKeys] = await redis.scan(cursor, { 
          match: pattern, 
          count: 100 
        });
        cursor = newCursor;
        keys.push(...foundKeys);
        if (keys.length >= 10) break;
      } while (cursor !== 0);
      
      if (keys.length > 0) {
        console.log(`   Pattern ${pattern}: ${keys.length} keys found`);
      }
    }
    
    // 6. Root cause analysis
    console.log('\n6️⃣ Root Cause Analysis...');
    
    const potentialCauses = [];
    
    // Check 1: Cache inconsistency
    potentialCauses.push({
      cause: 'API Cache Inconsistency',
      evidence: 'Analytics API has 30-second in-memory cache that may return stale data',
      severity: 'MEDIUM',
      details: 'Cache key only includes projectId and timeframe, not message count'
    });
    
    // Check 2: Index versioning issues
    if (versionedIndexKeys?.length > 1) {
      potentialCauses.push({
        cause: 'Multiple Index Versions',
        evidence: 'Found multiple index versions for same project',
        severity: 'HIGH',
        details: 'Different index versions may have different counts'
      });
    }
    
    // Check 3: Bot reload behavior
    potentialCauses.push({
      cause: 'Bot Channel Reload',
      evidence: 'Analytics bot reloads tracked channels every 5 minutes',
      severity: 'HIGH',
      details: 'loadTrackedChannels() runs every 5 minutes, may affect indexing'
    });
    
    // Check 4: Concurrent operations
    if (rebuildLock) {
      potentialCauses.push({
        cause: 'Concurrent Rebuild Operations',
        evidence: 'Active rebuild lock found',
        severity: 'CRITICAL',
        details: 'Multiple rebuild operations may be interfering'
      });
    }
    
    // Determine primary cause
    report.rootCause = potentialCauses.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    })[0];
    
    console.log(`\n   🎯 MOST LIKELY CAUSE: ${report.rootCause.cause}`);
    console.log(`      Evidence: ${report.rootCause.evidence}`);
    console.log(`      Details: ${report.rootCause.details}`);
    
    // 7. Recommendations
    console.log('\n7️⃣ Recommendations...');
    
    console.log('\n   IMMEDIATE ACTIONS:');
    console.log('   1. Check if analytics bot is running multiple instances');
    console.log('   2. Verify no scheduled scripts are running rebuild operations');
    console.log('   3. Clear API cache and test if counts stabilize');
    
    console.log('\n   INVESTIGATION STEPS:');
    console.log('   1. Monitor index counts every minute for 10 minutes:');
    console.log('      watch -n 60 "redis-cli scard discord:messages:project:PROJECT_ID"');
    console.log('   2. Check bot logs for any errors during channel reload');
    console.log('   3. Verify safer-rebuild script is not being called automatically');
    
    console.log('\n   POTENTIAL FIXES:');
    console.log('   1. Disable analytics bot\'s 5-minute channel reload');
    console.log('   2. Add index count to API cache key');
    console.log('   3. Implement index locking during operations');
    console.log('   4. Add monitoring for index count changes');
    
    // Save report
    const reportPath = `discord-index-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n   📄 Full report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    report.error = error.message;
  }
  
  return report;
}

// Run analysis
analyzeIndexDrops(); 