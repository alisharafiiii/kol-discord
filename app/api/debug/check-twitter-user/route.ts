import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { findUserByUsername } from '@/lib/user-identity';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    
    if (!handle) {
      return NextResponse.json({ error: 'Handle parameter required' }, { status: 400 });
    }
    
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    
    // Check if user exists via findUserByUsername
    const user = await findUserByUsername(normalizedHandle);
    
    // Check the username index directly
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
    
    // Check all user keys for this handle
    const allUserKeys = await redis.keys('user:*');
    const matchingUsers = [];
    
    for (const key of allUserKeys) {
      const userData = await redis.json.get(key);
      if (userData && (userData as any).twitterHandle) {
        const userHandle = (userData as any).twitterHandle.replace('@', '').toLowerCase();
        if (userHandle === normalizedHandle) {
          matchingUsers.push({ key, data: userData });
        }
      }
    }
    
    return NextResponse.json({
      handle: handle,
      normalizedHandle: normalizedHandle,
      foundByFunction: !!user,
      user: user,
      indexUserIds: userIds,
      allMatchingUsers: matchingUsers,
      totalUserKeys: allUserKeys.length
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 });
  }
} 