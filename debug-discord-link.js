#!/usr/bin/env node

/**
 * Debug script for Discord link Redis session issues
 * 
 * This script will:
 * 1. Connect to the main Redis instance
 * 2. Create a test session
 * 3. Verify it can be retrieved
 * 4. Check for any existing sessions
 */

const { Redis } = require('@upstash/redis')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Discord Link Debug Script')
console.log('============================\n')

// Check environment variables
console.log('1️⃣ Checking environment variables:')
console.log('   UPSTASH_REDIS_REST_URL:', process.env.UPSTASH_REDIS_REST_URL ? '✅ Set' : '❌ Missing')
console.log('   UPSTASH_REDIS_REST_TOKEN:', process.env.UPSTASH_REDIS_REST_TOKEN ? '✅ Set' : '❌ Missing')
console.log('   Redis URL starts with:', process.env.UPSTASH_REDIS_REST_URL?.substring(0, 30) + '...')

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error('\n❌ Missing required Redis credentials!')
  console.log('Please ensure your .env.local file contains:')
  console.log('UPSTASH_REDIS_REST_URL=https://polished-vulture-15957.upstash.io')
  console.log('UPSTASH_REDIS_REST_TOKEN=your-token-here')
  process.exit(1)
}

async function debugRedisSession() {
  try {
    // Initialize Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    })

    console.log('\n2️⃣ Testing Redis connection...')
    const ping = await redis.ping()
    console.log('   Redis ping:', ping === 'PONG' ? '✅ Connected' : '❌ Failed')

    // Create a test session
    const testSessionId = 'test-' + Date.now()
    const testSessionData = {
      twitterHandle: 'testuser',
      twitterId: '123456789',
      timestamp: new Date().toISOString()
    }

    console.log('\n3️⃣ Creating test session...')
    console.log('   Session ID:', testSessionId)
    console.log('   Session data:', JSON.stringify(testSessionData, null, 2))

    // Store session (same way Discord bot does)
    const sessionKey = `discord:verify:${testSessionId}`
    await redis.set(sessionKey, JSON.stringify(testSessionData), { ex: 600 })
    console.log('   ✅ Session stored with 10-minute expiration')

    // Retrieve session
    console.log('\n4️⃣ Retrieving test session...')
    const retrieved = await redis.get(sessionKey)
    console.log('   Retrieved:', retrieved ? '✅ Success' : '❌ Failed')
    if (retrieved) {
      // Upstash Redis automatically parses JSON
      console.log('   Data:', JSON.stringify(retrieved, null, 2))
    }

    // Check for existing Discord verification sessions
    console.log('\n5️⃣ Checking for existing Discord verification sessions...')
    const keys = await redis.keys('discord:verify:*')
    console.log('   Found', keys.length, 'verification session(s)')
    
    if (keys.length > 0) {
      console.log('\n   Existing sessions:')
      for (const key of keys.slice(0, 5)) { // Show first 5
        const ttl = await redis.ttl(key)
        const data = await redis.get(key)
        console.log(`   - ${key}`)
        console.log(`     TTL: ${ttl} seconds`)
        console.log(`     Data: ${data ? JSON.stringify(data, null, 2).replace(/\n/g, '\n     ') : 'null'}`)
      }
    }

    // Clean up test session
    await redis.del(sessionKey)
    console.log('\n✅ Test session cleaned up')

    // Check engagement bot Redis configuration
    console.log('\n6️⃣ Checking engagement bot configuration...')
    console.log('   Bot should use the SAME Redis credentials as the web app')
    console.log('   Make sure the bot .env file has:')
    console.log('   UPSTASH_REDIS_REST_URL=' + process.env.UPSTASH_REDIS_REST_URL)
    console.log('   UPSTASH_REDIS_REST_TOKEN=' + process.env.UPSTASH_REDIS_REST_TOKEN)

  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error(error.stack)
  }
}

debugRedisSession() 