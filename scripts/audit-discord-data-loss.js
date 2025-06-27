const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });
const fs = require('fs').promises;

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function scanKeys(pattern, limit = 100000) {
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

async function auditDataLoss() {
  console.log('🔍 Discord Analytics Data Loss Audit\n');
  console.log('='.repeat(60));
  
  const auditReport = {
    timestamp: new Date().toISOString(),
    findings: [],
    rootCause: null,
    recommendations: []
  };
  
  try {
    // 1. Analyze current state
    console.log('\n1️⃣ Current Data State Analysis...');
    
    const messageKeys = await scanKeys('message:discord:*', 10000);
    const projectKeys = await scanKeys('project:discord:*');
    const userKeys = await scanKeys('discord:user:*');
    const indexKeys = {
      project: await scanKeys('discord:messages:project:*'),
      user: await scanKeys('discord:messages:user:*'),
      channel: await scanKeys('discord:messages:channel:*')
    };
    
    console.log(`   Messages: ${messageKeys.length}`);
    console.log(`   Projects: ${projectKeys.length}`);
    console.log(`   Users: ${userKeys.length}`);
    console.log(`   Indexes: ${indexKeys.project.length} project, ${indexKeys.user.length} user, ${indexKeys.channel.length} channel`);
    
    auditReport.findings.push({
      type: 'current_state',
      data: {
        messageCount: messageKeys.length,
        projectCount: projectKeys.length,
        userCount: userKeys.length,
        indexCounts: {
          project: indexKeys.project.length,
          user: indexKeys.user.length,
          channel: indexKeys.channel.length
        }
      }
    });
    
    // 2. Check message timeline
    console.log('\n2️⃣ Analyzing Message Timeline...');
    
    const messageDates = new Map();
    let oldestMessage = null;
    let newestMessage = null;
    let messagesByProject = new Map();
    
    // Sample messages to analyze timeline
    const sampleSize = Math.min(2000, messageKeys.length);
    console.log(`   Sampling ${sampleSize} messages...`);
    
    for (let i = 0; i < sampleSize; i++) {
      try {
        const msg = await redis.json.get(messageKeys[i]);
        if (!msg || !msg.timestamp) continue;
        
        const date = new Date(msg.timestamp).toISOString().split('T')[0];
        messageDates.set(date, (messageDates.get(date) || 0) + 1);
        
        if (!oldestMessage || new Date(msg.timestamp) < new Date(oldestMessage.timestamp)) {
          oldestMessage = msg;
        }
        if (!newestMessage || new Date(msg.timestamp) > new Date(newestMessage.timestamp)) {
          newestMessage = msg;
        }
        
        // Track by project
        const projectCount = messagesByProject.get(msg.projectId) || 0;
        messagesByProject.set(msg.projectId, projectCount + 1);
      } catch (e) {
        // Skip corrupted messages
      }
    }
    
    console.log(`   Date range: ${oldestMessage?.timestamp} to ${newestMessage?.timestamp}`);
    console.log(`   Messages across ${messageDates.size} days`);
    
    // Look for gaps in timeline
    const sortedDates = Array.from(messageDates.keys()).sort();
    let gaps = [];
    
    for (let i = 1; i < sortedDates.length; i++) {
      const curr = new Date(sortedDates[i]);
      const prev = new Date(sortedDates[i-1]);
      const daysDiff = (curr - prev) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 7) {
        gaps.push({
          from: sortedDates[i-1],
          to: sortedDates[i],
          days: daysDiff
        });
      }
    }
    
    if (gaps.length > 0) {
      console.log(`   ⚠️ Found ${gaps.length} significant gaps in data:`);
      gaps.forEach(gap => {
        console.log(`      ${gap.from} to ${gap.to} (${gap.days} days)`);
      });
    }
    
    // 3. Check for orphaned data
    console.log('\n3️⃣ Checking for Orphaned Data...');
    
    let orphanedMessages = 0;
    let indexedButMissing = 0;
    
    // Check if indexed messages actually exist
    for (const projectId of messagesByProject.keys()) {
      const indexKey = `discord:messages:project:${projectId}`;
      const indexedIds = await redis.smembers(indexKey);
      
      // Sample check
      const checkSize = Math.min(100, indexedIds.length);
      for (let i = 0; i < checkSize; i++) {
        const exists = await redis.exists(indexedIds[i]);
        if (!exists) {
          indexedButMissing++;
        }
      }
    }
    
    console.log(`   Indexed but missing: ${indexedButMissing} (sampled)`);
    
    // 4. Analyze recent operations
    console.log('\n4️⃣ Analyzing Recent Operations...');
    
    // Check for backup keys that might indicate when operations were performed
    const backupKeys = await scanKeys('backup:*');
    console.log(`   Found ${backupKeys.length} backup keys`);
    
    // Check git logs for relevant scripts
    const gitLogCmd = `git log --oneline --grep="duplicate\\|merge\\|clean\\|discord" --since="2 weeks ago" 2>/dev/null || echo "No git access"`;
    const { exec } = require('child_process');
    const gitLogs = await new Promise((resolve) => {
      exec(gitLogCmd, (err, stdout) => resolve(stdout || 'No commits found'));
    });
    
    console.log('   Recent relevant commits:');
    console.log(gitLogs.split('\n').slice(0, 10).map(l => '      ' + l).join('\n'));
    
    // 5. Identify patterns
    console.log('\n5️⃣ Identifying Data Loss Patterns...');
    
    // Check if profile merge operations affected Discord data
    const profileOperationKeys = await scanKeys('merge:plan:*');
    if (profileOperationKeys.length > 0) {
      console.log(`   ⚠️ Found ${profileOperationKeys.length} merge operation keys`);
      auditReport.findings.push({
        type: 'merge_operations',
        count: profileOperationKeys.length,
        warning: 'Profile merge operations detected'
      });
    }
    
    // 6. Root cause analysis
    console.log('\n6️⃣ Root Cause Analysis...');
    
    const potentialCauses = [];
    
    // Check 1: Index rebuild without preserving data
    if (indexedButMissing > 0) {
      potentialCauses.push({
        cause: 'Index corruption',
        evidence: `${indexedButMissing} messages referenced in indexes but don't exist`,
        severity: 'HIGH'
      });
    }
    
    // Check 2: Recent rebuild script execution
    const rebuildScriptExists = await fs.access('scripts/rebuild-discord-analytics.js').then(() => true).catch(() => false);
    if (rebuildScriptExists) {
      potentialCauses.push({
        cause: 'Index rebuild script deletes indexes',
        evidence: 'rebuild-discord-analytics.js deletes all indexes before rebuilding',
        severity: 'MEDIUM',
        detail: 'Script deletes discord:messages:* indexes which could cause temporary data unavailability'
      });
    }
    
    // Check 3: Bot downtime
    const botLogs = await fs.readFile('discord-bots/analytics-bot.log', 'utf-8').catch(() => '');
    const lastBotActivity = botLogs.split('\n').filter(l => l.includes('logged in')).pop();
    if (lastBotActivity) {
      console.log(`   Last bot activity: ${lastBotActivity}`);
      potentialCauses.push({
        cause: 'Bot downtime',
        evidence: 'Analytics bot was not running, causing data collection gap',
        severity: 'HIGH'
      });
    }
    
    // Primary root cause determination
    if (potentialCauses.length > 0) {
      auditReport.rootCause = potentialCauses.sort((a, b) => 
        a.severity === 'HIGH' ? -1 : b.severity === 'HIGH' ? 1 : 0
      )[0];
      
      console.log(`\n   🎯 PRIMARY ROOT CAUSE: ${auditReport.rootCause.cause}`);
      console.log(`      Evidence: ${auditReport.rootCause.evidence}`);
      if (auditReport.rootCause.detail) {
        console.log(`      Detail: ${auditReport.rootCause.detail}`);
      }
    }
    
    // 7. Generate recommendations
    console.log('\n7️⃣ Generating Recommendations...');
    
    auditReport.recommendations = [
      {
        priority: 'CRITICAL',
        action: 'Implement index versioning',
        details: 'Never delete indexes directly. Use versioned indexes (e.g., discord:messages:v2:project:*) and atomic swaps'
      },
      {
        priority: 'CRITICAL',
        action: 'Add pre-operation backups',
        details: 'Before any rebuild/cleanup operation, create full backups of affected keys'
      },
      {
        priority: 'HIGH',
        action: 'Implement operation locks',
        details: 'Use Redis locks to prevent concurrent operations on same data'
      },
      {
        priority: 'HIGH',
        action: 'Add data validation checks',
        details: 'Verify data integrity before and after any operation'
      },
      {
        priority: 'MEDIUM',
        action: 'Continuous monitoring',
        details: 'Set up alerts for message count drops, bot downtime, and index corruption'
      },
      {
        priority: 'MEDIUM',
        action: 'Audit trail',
        details: 'Log all data operations with timestamps and affected key counts'
      }
    ];
    
    // 8. Save audit report
    console.log('\n8️⃣ Saving Audit Report...');
    
    const reportPath = `discord-audit-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    await fs.writeFile(reportPath, JSON.stringify(auditReport, null, 2));
    console.log(`   ✅ Report saved to: ${reportPath}`);
    
    // Display recommendations
    console.log('\n' + '='.repeat(60));
    console.log('📋 AUDIT COMPLETE - RECOMMENDATIONS:\n');
    
    auditReport.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. [${rec.priority}] ${rec.action}`);
      console.log(`   ${rec.details}\n`);
    });
    
    // Code fixes needed
    console.log('🔧 IMMEDIATE CODE FIXES REQUIRED:\n');
    console.log('1. Update rebuild-discord-analytics.js:');
    console.log('   - Create backups before deleting indexes');
    console.log('   - Use versioned indexes instead of deleting');
    console.log('   - Add rollback capability\n');
    
    console.log('2. Add to analytics-bot.mjs:');
    console.log('   - Implement heartbeat monitoring');
    console.log('   - Add auto-recovery on connection loss');
    console.log('   - Log all index operations\n');
    
    console.log('3. Create new monitoring script:');
    console.log('   - Check message counts hourly');
    console.log('   - Alert on >10% drop in any metric');
    console.log('   - Auto-backup before any operation');
    
  } catch (error) {
    console.error('\n❌ Audit failed:', error);
    auditReport.error = error.message;
  }
  
  return auditReport;
}

// Run audit
auditDataLoss(); 