import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { findUserByUsername, getRoleFromTwitterSession } from '@/lib/user-identity';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET() {
  try {
    console.log('\n=== COMPREHENSIVE SHARAFI_ETH DIAGNOSIS ===\n');
    
    // 1. Check current session
    const session: any = await getServerSession(authOptions as any);
    console.log('Current session:', session);
    
    // 2. Test Redis connection
    const testKey = 'test:ping';
    await redis.set(testKey, 'pong');
    const testValue = await redis.get(testKey);
    await redis.del(testKey);
    const redisWorking = testValue === 'pong';
    
    // 3. Find all possible sharafi_eth users
    const allUserKeys = await redis.keys('user:*');
    const sharafiProfiles = [];
    
    for (const key of allUserKeys) {
      try {
        const profile = await redis.json.get(key) as any;
        if (profile && (
          profile.twitterHandle?.toLowerCase().includes('sharafi') ||
          profile.name?.toLowerCase().includes('sharafi') ||
          profile.id?.toLowerCase().includes('sharafi')
        )) {
          sharafiProfiles.push({
            key,
            id: profile.id,
            name: profile.name,
            twitterHandle: profile.twitterHandle,
            role: profile.role,
            approvalStatus: profile.approvalStatus
          });
        }
      } catch (e) {
        // Skip invalid entries
      }
    }
    
    // 4. Check username indexes
    const usernameIndexes = {
      sharafi_eth: await redis.smembers('idx:username:sharafi_eth'),
      '@sharafi_eth': await redis.smembers('idx:username:@sharafi_eth'),
      'sharafi': await redis.smembers('idx:username:sharafi')
    };
    
    // 5. Test findUserByUsername function
    const findResults = {
      sharafi_eth: await findUserByUsername('sharafi_eth'),
      '@sharafi_eth': await findUserByUsername('@sharafi_eth'),
      sharafi: await findUserByUsername('sharafi')
    };
    
    // 6. Test getRoleFromTwitterSession
    const roleResults = {
      sharafi_eth: await getRoleFromTwitterSession('sharafi_eth'),
      '@sharafi_eth': await getRoleFromTwitterSession('@sharafi_eth'),
      sharafi: await getRoleFromTwitterSession('sharafi')
    };
    
    // 7. Check the specific user that should be admin
    const expectedAdminUser = await redis.json.get('user:user_sharafi_eth');
    
    return NextResponse.json({
      redisWorking,
      session: {
        authenticated: !!session,
        twitterHandle: session?.twitterHandle,
        userName: session?.user?.name
      },
      sharafiProfiles,
      usernameIndexes,
      findResults: Object.entries(findResults).map(([key, value]) => ({
        query: key,
        found: !!value,
        role: value?.role,
        id: value?.id
      })),
      roleResults,
      expectedAdminUser: expectedAdminUser ? {
        id: (expectedAdminUser as any).id,
        role: (expectedAdminUser as any).role,
        twitterHandle: (expectedAdminUser as any).twitterHandle
      } : null,
      summary: {
        totalSharafiProfiles: sharafiProfiles.length,
        adminProfiles: sharafiProfiles.filter(p => p.role === 'admin').length,
        userProfiles: sharafiProfiles.filter(p => p.role === 'user').length
      }
    });
    
  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({
      error: 'Diagnosis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 