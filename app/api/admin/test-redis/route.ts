import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    console.log('Testing Redis connection...');
    
    // Test 1: Simple set/get
    const testKey = 'test:connection';
    const testValue = { test: true, timestamp: new Date().toISOString() };
    
    await redis.json.set(testKey, '$', testValue);
    const retrieved = await redis.json.get(testKey);
    await redis.del(testKey);
    
    // Test 2: Check sharafi_eth user
    const sharafiUser = await redis.json.get('user:user_sharafi_eth');
    
    // Test 3: Check username index
    const usernameIndex = await redis.smembers('idx:username:sharafi_eth');
    
    return NextResponse.json({
      redisWorking: true,
      testPassed: JSON.stringify(retrieved) === JSON.stringify(testValue),
      sharafiUser: sharafiUser ? {
        id: (sharafiUser as any).id,
        role: (sharafiUser as any).role,
        twitterHandle: (sharafiUser as any).twitterHandle
      } : null,
      usernameIndex,
      envVars: {
        REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set'
      }
    });
  } catch (error) {
    console.error('Redis test failed:', error);
    return NextResponse.json({
      redisWorking: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      envVars: {
        REDIS_URL: process.env.REDIS_URL ? 'Set' : 'Not set',
        UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ? 'Set' : 'Not set',
        UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ? 'Set' : 'Not set'
      }
    });
  }
} 