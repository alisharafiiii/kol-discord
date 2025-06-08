import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    console.log('\n=== Diagnosing sharafi_eth role issue ===\n');
    
    // Search for all user IDs that might be sharafi_eth
    const possibleIds = [
      'twitter_sharafi_eth',
      'user_sharafi_eth',
      'user_sharafi_eth_',
      'twitter_@sharafi_eth'
    ];
    
    // Also check username index
    const usernameIndexIds = await redis.smembers('idx:username:sharafi_eth');
    console.log('Username index contains:', usernameIndexIds);
    
    // Check all user keys
    const allUserKeys = await redis.keys('user:*');
    const sharafiKeys = allUserKeys.filter(key => 
      key.toLowerCase().includes('sharafi')
    );
    console.log('All keys containing "sharafi":', sharafiKeys);
    
    const profiles = [];
    
    // Check each possible location
    for (const key of [...possibleIds.map(id => `user:${id}`), ...sharafiKeys]) {
      try {
        const profile = await redis.json.get(key);
        if (profile) {
          profiles.push({ key, profile });
          console.log(`Found profile at ${key}:`, profile);
        }
      } catch (e) {
        // Key doesn't exist
      }
    }
    
    // Also check from username index
    for (const userId of usernameIndexIds) {
      const profile = await redis.json.get(`user:${userId}`);
      if (profile) {
        profiles.push({ key: `user:${userId}`, profile });
      }
    }
    
    console.log(`\nFound ${profiles.length} profiles for sharafi_eth\n`);
    
    // Fix all profiles to have admin role
    let fixedCount = 0;
    for (const { key, profile } of profiles) {
      const typedProfile = profile as any;
      if (typedProfile.role !== 'admin') {
        console.log(`Fixing role for ${key} from ${typedProfile.role} to admin`);
        typedProfile.role = 'admin';
        typedProfile.approvalStatus = 'approved';
        typedProfile.updatedAt = new Date().toISOString();
        
        await redis.json.set(key, '$', JSON.parse(JSON.stringify(typedProfile)));
        
        // Update role index
        if (typedProfile.id) {
          await redis.sadd('idx:role:admin', typedProfile.id);
          // Remove from other role indexes if present
          await redis.srem('idx:role:user', typedProfile.id);
          await redis.srem('idx:role:viewer', typedProfile.id);
        }
        
        fixedCount++;
      }
    }
    
    // Ensure username index is correct
    await redis.sadd('idx:username:sharafi_eth', 'user_sharafi_eth');
    
    return NextResponse.json({
      success: true,
      message: `Diagnosed and fixed sharafi_eth role issue`,
      foundProfiles: profiles.length,
      fixedProfiles: fixedCount,
      profiles: profiles.map(({ key, profile }) => ({
        key,
        id: (profile as any).id,
        role: (profile as any).role,
        twitterHandle: (profile as any).twitterHandle,
        name: (profile as any).name
      }))
    });
    
  } catch (error) {
    console.error('Error fixing sharafi_eth role:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 