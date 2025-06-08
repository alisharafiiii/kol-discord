import { NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET() {
  try {
    console.log('\n=== Fixing nabulines role ===\n');
    
    // Search for all user IDs that might be nabulines
    const possibleIds = [
      'twitter_nabulines',
      'user_nabulines',
      'twitter_@nabulines'
    ];
    
    // Also check username index
    const usernameIndexIds = await redis.smembers('idx:username:nabulines');
    
    // Check all user keys
    const allUserKeys = await redis.keys('user:*');
    const nabulinesKeys = allUserKeys.filter(key => 
      key.toLowerCase().includes('nabulines')
    );
    
    const profiles = [];
    
    // Check each possible location
    for (const key of [...possibleIds.map(id => `user:${id}`), ...nabulinesKeys]) {
      try {
        const profile = await redis.json.get(key);
        if (profile) {
          profiles.push({ key, profile });
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
    
    // Fix all profiles to have admin role
    let fixedCount = 0;
    for (const { key, profile } of profiles) {
      const typedProfile = profile as any;
      if (typedProfile.role !== 'admin') {
        typedProfile.role = 'admin';
        typedProfile.approvalStatus = 'approved';
        typedProfile.updatedAt = new Date().toISOString();
        
        await redis.json.set(key, '$', JSON.parse(JSON.stringify(typedProfile)));
        
        // Update role index
        if (typedProfile.id) {
          await redis.sadd('idx:role:admin', typedProfile.id);
          await redis.srem('idx:role:user', typedProfile.id);
        }
        
        fixedCount++;
      }
    }
    
    // Ensure username index is correct
    await redis.sadd('idx:username:nabulines', 'user_nabulines');
    
    return NextResponse.json({
      success: true,
      message: `Fixed nabulines role`,
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
    console.error('Error fixing nabulines role:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fix role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 