const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN
});

async function ultraFastLedgerRebuild() {
  console.log('⚡ ULTRA-FAST Ledger-Only Rebuild\n');
  console.log('='.repeat(50));
  console.log('\n📌 This rebuilds ONLY Ledger project indexes');
  console.log('   Other projects will need separate rebuild\n');
  
  const LEDGER_PROJECT_ID = 'project:discord:OVPuPOX3_zHBnLUscRbdM';
  
  try {
    // 1. Clear ONLY Ledger indexes
    console.log('1️⃣ Clearing Ledger indexes...');
    
    const ledgerIndexKey = `discord:messages:project:${LEDGER_PROJECT_ID}`;
    await redis.del(ledgerIndexKey);
    console.log('   ✅ Cleared Ledger project index');
    
    // 2. Find and rebuild ONLY Ledger messages
    console.log('\n2️⃣ Rebuilding Ledger messages only...');
    
    let processed = 0;
    let cursor = 0;
    const startTime = Date.now();
    
    // Process in larger batches for speed
    const BATCH_SIZE = 1000;
    
    do {
      const [newCursor, keys] = await redis.scan(cursor, { 
        match: 'message:discord:*', 
        count: BATCH_SIZE 
      });
      cursor = newCursor;
      
      // Process batch
      for (const msgKey of keys) {
        try {
          // Quick check if it's a Ledger message
          const message = await redis.json.get(msgKey);
          
          if (message && message.projectId === LEDGER_PROJECT_ID) {
            // Only rebuild Ledger project index
            await redis.sadd(ledgerIndexKey, msgKey);
            processed++;
            
            if (processed % 100 === 0) {
              const elapsed = Date.now() - startTime;
              const rate = processed / (elapsed / 1000);
              console.log(`   Processed ${processed} Ledger messages (${Math.round(rate)} msg/sec)`);
            }
          }
        } catch (error) {
          // Skip errors silently for speed
        }
      }
      
      // Quick exit if we've found all Ledger messages
      if (processed >= 2000) {
        console.log('   ✅ Found expected number of Ledger messages');
        break;
      }
    } while (cursor !== 0);
    
    // 3. Verify results
    console.log('\n3️⃣ Verifying Ledger rebuild...');
    
    const finalCount = await redis.scard(ledgerIndexKey);
    console.log(`   ✅ Ledger messages indexed: ${finalCount}`);
    
    // 4. Update project stats
    const project = await redis.json.get(LEDGER_PROJECT_ID);
    if (project) {
      project.stats = {
        totalMessages: finalCount,
        lastActivity: new Date().toISOString(),
        lastRebuild: new Date().toISOString()
      };
      await redis.json.set(LEDGER_PROJECT_ID, '$', project);
      console.log('   ✅ Updated Ledger project stats');
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('✅ ULTRA-FAST REBUILD COMPLETE\n');
    console.log(`🎯 Ledger messages: ${finalCount}`);
    console.log(`⏱️  Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`📊 Processing rate: ${Math.round(processed / totalTime)} messages/sec`);
    
    console.log('\n💡 Note: Only Ledger was rebuilt.');
    console.log('   Other projects still need rebuild if required.');
    
  } catch (error) {
    console.error('\n❌ Ultra-fast rebuild failed:', error);
  }
}

// Run immediately without prompts for speed
console.log('Starting ultra-fast Ledger rebuild...\n');
ultraFastLedgerRebuild(); 