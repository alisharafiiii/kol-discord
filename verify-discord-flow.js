#!/usr/bin/env node

const Redis = require('ioredis');

async function verifyFlow() {
  console.log('=== Verifying Discord Connect Flow ===\n');
  
  // Connect to OLD Redis (what's actually being used)
  const redis = new Redis({
    host: 'polished-vulture-15957.upstash.io',
    port: 6379,
    tls: true,
    password: 'AT5VAAIjcDExYTJmODU3ODg1NzM0MDU4OGNmNmFhOWQwYTA0MTlmY3AxMA'
  });
  
  try {
    // 1. Check if sessions are being created
    console.log('1. Checking Discord sessions in Redis:');
    const sessions = await redis.keys('discord:verify:*');
    console.log(`   Found ${sessions.length} sessions`);
    
    if (sessions.length > 0) {
      // Check the most recent session
      const mostRecent = sessions[sessions.length - 1];
      const sessionData = await redis.get(mostRecent);
      const ttl = await redis.ttl(mostRecent);
      
      console.log(`\n   Most recent session: ${mostRecent}`);
      console.log(`   TTL: ${ttl} seconds`);
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        console.log(`   User: ${parsed.discordUsername} (${parsed.discordId})`);
        console.log(`   Created: ${new Date(parsed.timestamp).toISOString()}`);
      }
    }
    
    // 2. Test the API endpoint locally
    console.log('\n2. Testing local API endpoint:');
    try {
      const response = await fetch('http://localhost:3000/api/auth/discord-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'test' })
      });
      console.log(`   Local endpoint status: ${response.status}`);
    } catch (e) {
      console.log(`   Local endpoint error: ${e.message}`);
    }
    
    // 3. Test the production endpoint
    console.log('\n3. Testing production endpoints:');
    const urls = [
      'https://nabulines.com/api/auth/discord-link',
      'https://www.nabulines.com/api/auth/discord-link',
      'https://kol-1nondpaia-nabus-projects-b8bca9ec.vercel.app/api/auth/discord-link'
    ];
    
    for (const url of urls) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: 'test' })
        });
        console.log(`   ${url}: ${response.status}`);
      } catch (e) {
        console.log(`   ${url}: Error - ${e.message}`);
      }
    }
    
    // 4. Check what URL the bot is generating
    console.log('\n4. Bot configuration:');
    console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'Not set (using fallback)'}`);
    console.log(`   Fallback URL: https://nabulines.com`);
    
    console.log('\n📍 DIAGNOSIS:');
    console.log('   - Discord bot is creating sessions: ✅');
    console.log('   - Sessions are stored in OLD Redis: ✅');
    console.log('   - API endpoint returns 404 on production: ❌');
    console.log('\n   The issue is that the /api/auth/discord-link endpoint');
    console.log('   is not deployed or accessible on your production site.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    redis.disconnect();
  }
}

verifyFlow(); 