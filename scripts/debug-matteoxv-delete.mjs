#!/usr/bin/env node

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { Redis } from '@upstash/redis'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '..', '.env.local') })

// Parse REDIS_URL if needed
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
  console.error('❌ Redis credentials not found')
  process.exit(1)
}

let url = UPSTASH_REDIS_REST_URL
let token = UPSTASH_REDIS_REST_TOKEN

if (UPSTASH_REDIS_REST_URL.startsWith('redis://')) {
  try {
    const parsedUrl = new URL(UPSTASH_REDIS_REST_URL)
    token = parsedUrl.password
    url = `https://${parsedUrl.hostname}`
  } catch (e) {
    console.error('Failed to parse REDIS_URL:', e.message)
    process.exit(1)
  }
}

const redis = new Redis({ url, token })

console.log('='.repeat(80));
console.log('DEBUGGING matteoxv|| USER DELETION ISSUE');
console.log('='.repeat(80));

async function main() {
  try {
    // 1. Check username index with exact string
    console.log('\n1. Checking username index for "matteoxv||"...');
    const normalizedHandle = 'matteoxv||'.toLowerCase();
    console.log('   Normalized handle:', normalizedHandle);
    
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
    console.log('   User IDs from index:', userIds);
    
    // 2. Check for user data if found
    if (userIds && userIds.length > 0) {
      for (const userId of userIds) {
        console.log(`\n   Checking user data for ID: ${userId}`);
        const userData = await redis.json.get(`user:${userId}`);
        if (userData) {
          console.log('   Found user data:', JSON.stringify(userData, null, 2));
        } else {
          console.log('   No data found for this ID in Redis');
        }
      }
    }
    
    // 3. Try various ID formats
    console.log('\n2. Trying various ID formats...');
    const possibleIds = [
      'matteoxv||',
      'matteoxv',
      'user_matteoxv||',
      'user_matteoxv',
      'twitter_matteoxv||',
      'twitter_matteoxv'
    ];
    
    for (const id of possibleIds) {
      console.log(`\n   Checking ID: "${id}"`);
      const userData = await redis.json.get(`user:${id}`);
      if (userData) {
        console.log('   ✅ FOUND USER with this ID!');
        console.log('   User data:', JSON.stringify(userData, null, 2));
      } else {
        console.log('   ❌ No data for this ID');
      }
    }
    
    // 4. Search all user keys containing matteoxv
    console.log('\n3. Searching all user keys containing "matteoxv"...');
    const allKeys = await redis.keys('user:*');
    const matchingKeys = allKeys.filter(key => key.toLowerCase().includes('matteoxv'));
    
    if (matchingKeys.length > 0) {
      console.log('   Found matching keys:', matchingKeys);
      for (const key of matchingKeys) {
        const userData = await redis.json.get(key);
        console.log(`\n   Data for ${key}:`);
        if (userData) {
          console.log(JSON.stringify(userData, null, 2));
        }
      }
    } else {
      console.log('   No keys found containing "matteoxv"');
    }
    
    // 5. Check all username indexes
    console.log('\n4. Checking all username indexes containing "matteoxv"...');
    const usernameIndexKeys = await redis.keys('idx:username:*');
    const matchingIndexes = usernameIndexKeys.filter(key => key.toLowerCase().includes('matteoxv'));
    
    if (matchingIndexes.length > 0) {
      console.log('   Found matching username indexes:', matchingIndexes);
      for (const indexKey of matchingIndexes) {
        const members = await redis.smembers(indexKey);
        console.log(`   ${indexKey} contains:`, members);
      }
    } else {
      console.log('   No username indexes found containing "matteoxv"');
    }
    
    // 6. Test what happens when we try to delete
    console.log('\n5. Testing deletion process...');
    console.log('   What the admin panel might be sending as userId:');
    const possibleUserIds = [
      'matteoxv||',           // Raw username
      '@matteoxv||',          // With @ symbol
      'user_matteoxv||',      // Standard format
      'user:matteoxv||',      // With prefix
      'user:user_matteoxv||'  // Double prefix
    ];
    
    for (const testId of possibleUserIds) {
      console.log(`\n   If admin sends userId="${testId}":`);
      
      // Simulate the delete logic
      let actualUserId = testId;
      let user = null;
      
      if (testId.startsWith('user:')) {
        const checkId = testId;
        console.log(`     - Checking directly: ${checkId}`);
        user = await redis.json.get(checkId);
      } else if (testId.startsWith('user_')) {
        const checkId = `user:${testId}`;
        console.log(`     - Checking with prefix: ${checkId}`);
        user = await redis.json.get(checkId);
      } else {
        // Try as username
        const normalizedUsername = testId.toLowerCase().replace('@', '');
        console.log(`     - Checking as username: ${normalizedUsername}`);
        const foundIds = await redis.smembers(`idx:username:${normalizedUsername}`);
        console.log(`     - Found IDs from username index:`, foundIds);
        
        if (foundIds && foundIds.length > 0) {
          actualUserId = foundIds[0];
          const redisKey = actualUserId.startsWith('user:') ? actualUserId : `user:${actualUserId}`;
          console.log(`     - Checking user data at: ${redisKey}`);
          user = await redis.json.get(redisKey);
        }
      }
      
      if (user) {
        console.log(`     ✅ Would find user for deletion`);
      } else {
        console.log(`     ❌ Would NOT find user`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDATIONS:');
    console.log('='.repeat(80));
    console.log('\nBased on the findings above, here are the next steps:');
    console.log('1. Check what exact value is being passed as userId from the frontend');
    console.log('2. Ensure the user actually exists in Redis with the expected ID format');
    console.log('3. If the user exists but with a different ID, update the deletion logic');
    console.log('4. Consider URL encoding issues with the || characters');
    
  } catch (error) {
    console.error('\nError:', error);
  }
}

main(); 