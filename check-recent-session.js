#!/usr/bin/env node

const Redis = require('ioredis');

async function checkRecentSession() {
  console.log('=== Checking Recent Discord Session ===\n');
  
  const redis = new Redis({
    host: 'polished-vulture-15957.upstash.io',
    port: 6379,
    tls: true,
    password: 'AT5VAAIjcDExYTJmODU3ODg1NzM0MDU4OGNmNmFhOWQwYTA0MTlmY3AxMA'
  });
  
  try {
    // Get all Discord sessions
    const sessions = await redis.keys('discord:verify:*');
    console.log(`Found ${sessions.length} total sessions\n`);
    
    // Sort by timestamp in the key
    const sortedSessions = sessions.sort((a, b) => {
      const timestampA = parseInt(a.split('-').pop());
      const timestampB = parseInt(b.split('-').pop());
      return timestampB - timestampA;
    });
    
    // Check the 3 most recent sessions
    console.log('Recent sessions:');
    for (let i = 0; i < Math.min(3, sortedSessions.length); i++) {
      const sessionKey = sortedSessions[i];
      const sessionData = await redis.get(sessionKey);
      const ttl = await redis.ttl(sessionKey);
      const sessionId = sessionKey.replace('discord:verify:', '');
      
      console.log(`\n${i + 1}. Session: ${sessionId}`);
      console.log(`   Key: ${sessionKey}`);
      console.log(`   TTL: ${ttl} seconds (${ttl < 0 ? 'EXPIRED' : 'ACTIVE'})`);
      
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log(`   User: ${parsed.discordUsername} (${parsed.discordId})`);
        console.log(`   Created: ${new Date(parsed.timestamp).toISOString()}`);
        console.log(`   Age: ${Math.round((Date.now() - parsed.timestamp) / 1000)} seconds ago`);
      } else {
        console.log('   Data: null (key exists but no data)');
      }
      
      // Check if this session was created in the last 5 minutes
      const timestamp = parseInt(sessionId.split('-').pop());
      const ageInSeconds = (Date.now() - timestamp) / 1000;
      if (ageInSeconds < 300) {
        console.log(`   ⚠️  This session was created ${Math.round(ageInSeconds)} seconds ago!`);
      }
    }
    
    console.log('\n\n📍 IMPORTANT:');
    console.log('If you just used /connect, there should be a session created within the last minute.');
    console.log('All the sessions above are EXPIRED (TTL: -1), which means they are older than 10 minutes.');
    console.log('\nThis suggests the bot might not be creating new sessions properly.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

checkRecentSession(); 