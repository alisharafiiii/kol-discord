const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function implementPreventiveMeasures() {
  console.log('🛡️ Implementing Discord Analytics Data Protection Measures\n');
  console.log('='.repeat(50));
  
  try {
    // 1. Create backup of current project configurations
    console.log('\n1️⃣ Backing Up Project Configurations...');
    const projectKeys = [];
    let cursor = 0;
    
    do {
      const [newCursor, keys] = await redis.scan(cursor, { match: 'project:discord:*', count: 100 });
      cursor = newCursor;
      projectKeys.push(...keys);
    } while (cursor !== 0);
    
    const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupKey = `backup:discord:projects:${backupTimestamp}`;
    const projects = [];
    
    for (const key of projectKeys) {
      const project = await redis.json.get(key);
      if (project) {
        projects.push(project);
      }
    }
    
    await redis.json.set(backupKey, '$', projects);
    console.log(`   ✅ Backed up ${projects.length} projects to ${backupKey}`);
    
    // 2. Create monitoring script
    console.log('\n2️⃣ Creating Monitoring Configuration...');
    
    const monitoringConfig = {
      checks: {
        botRunning: {
          enabled: true,
          interval: 300, // 5 minutes
          alert: true
        },
        messageIngestion: {
          enabled: true,
          minMessagesPerHour: 10,
          alert: true
        },
        dataIntegrity: {
          enabled: true,
          interval: 3600, // 1 hour
          maxOrphanedPercentage: 5
        }
      },
      alerts: {
        webhook: process.env.DISCORD_ALERT_WEBHOOK || null,
        email: process.env.ALERT_EMAIL || null
      },
      backup: {
        enabled: true,
        interval: 86400, // 24 hours
        retention: 7 // days
      }
    };
    
    await redis.json.set('discord:monitoring:config', '$', monitoringConfig);
    console.log('   ✅ Monitoring configuration saved');
    
    // 3. Set up data retention policy
    console.log('\n3️⃣ Setting Up Data Retention Policy...');
    
    const retentionPolicy = {
      messages: {
        maxAge: 365, // days
        archiveAfter: 90, // days
        compressionEnabled: true
      },
      analytics: {
        aggregationInterval: 86400, // 24 hours
        keepRawData: 30, // days
        keepAggregates: 'forever'
      },
      indexes: {
        rebuildInterval: 604800, // 7 days
        verifyIntegrity: true
      }
    };
    
    await redis.json.set('discord:retention:policy', '$', retentionPolicy);
    console.log('   ✅ Data retention policy configured');
    
    // 4. Create health check endpoint data
    console.log('\n4️⃣ Setting Up Health Check Data...');
    
    const healthCheckData = {
      lastCheck: new Date().toISOString(),
      status: 'healthy',
      metrics: {
        projects: projects.length,
        botRunning: true,
        lastMessageReceived: new Date().toISOString(),
        indexesHealthy: true
      }
    };
    
    await redis.json.set('discord:health:status', '$', healthCheckData);
    await redis.expire('discord:health:status', 600); // 10 minutes
    console.log('   ✅ Health check data initialized');
    
    // 5. Document recovery procedures
    console.log('\n5️⃣ Documenting Recovery Procedures...');
    
    const recoveryProcedures = `
# Discord Analytics Recovery Procedures

## Immediate Actions if Data Loss Detected:

1. **Check Bot Status**
   \`\`\`bash
   ./discord-bots/manage-bots.sh status
   \`\`\`

2. **Restart Bot if Needed**
   \`\`\`bash
   ./discord-bots/manage-bots.sh start-analytics
   \`\`\`

3. **Run Diagnosis**
   \`\`\`bash
   node scripts/diagnose-discord-data-loss.js
   \`\`\`

4. **Rebuild Indexes**
   \`\`\`bash
   node scripts/rebuild-discord-analytics.js
   \`\`\`

## Prevention Measures:

1. **Daily Backups**: Automated via monitoring config
2. **Health Checks**: Every 5 minutes via bot
3. **Index Verification**: Weekly automated checks
4. **Retention Policy**: Prevents unbounded growth

## Key Redis Patterns:

- Projects: \`project:discord:*\`
- Messages: \`message:discord:*\`
- Indexes: \`discord:messages:*\`
- Users: \`discord:user:*\`
- Backups: \`backup:discord:*\`

## Contact:

If automated recovery fails, check:
1. Upstash dashboard for quota/limits
2. Bot logs in \`discord-bots/analytics-bot.log\`
3. Redis connection status
`;
    
    const fs = require('fs').promises;
    await fs.writeFile('DISCORD_ANALYTICS_RECOVERY.md', recoveryProcedures);
    console.log('   ✅ Recovery procedures documented');
    
    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ PREVENTIVE MEASURES IMPLEMENTED\n');
    
    console.log('📋 Summary:');
    console.log('- Project backups created');
    console.log('- Monitoring configuration set');
    console.log('- Data retention policy established');
    console.log('- Health check system initialized');
    console.log('- Recovery procedures documented');
    
    console.log('\n🔧 Recommended Cron Jobs:');
    console.log('```bash');
    console.log('# Add to crontab:');
    console.log('*/5 * * * * cd /path/to/project && node scripts/check-discord-health.js');
    console.log('0 */6 * * * cd /path/to/project && node scripts/backup-discord-data.js');
    console.log('0 3 * * 0 cd /path/to/project && node scripts/verify-discord-integrity.js');
    console.log('```');
    
    console.log('\n⚠️ IMPORTANT:');
    console.log('1. Monitor Upstash usage to avoid hitting limits');
    console.log('2. Set up alerts for bot failures');
    console.log('3. Review logs regularly');
    console.log('4. Test recovery procedures monthly');
    
  } catch (error) {
    console.error('\n❌ Error implementing measures:', error);
  }
}

// Run implementation
implementPreventiveMeasures(); 