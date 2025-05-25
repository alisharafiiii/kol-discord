import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function POST(req: NextRequest) {
  try {
    const { handle } = await req.json();
    
    if (!handle) {
      return NextResponse.json({ error: 'Handle required' }, { status: 400 });
    }
    
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    const userId = `twitter_${normalizedHandle}`;
    
    const userData = {
      id: userId,
      twitterHandle: handle.startsWith('@') ? handle : `@${handle}`,
      name: handle,
      role: 'viewer',
      approvalStatus: 'approved',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      walletAddresses: {},
      socialAccounts: {
        twitter: {
          handle: normalizedHandle,
          followers: 0
        }
      }
    };
    
    // Save to Redis
    await redis.json.set(`user:${userId}`, '$', JSON.parse(JSON.stringify(userData)));
    
    // Create username index
    await redis.sadd(`idx:username:${normalizedHandle}`, userId);
    
    // Add to approval status index
    await redis.sadd(`idx:status:approved`, userId);
    
    return NextResponse.json({ 
      success: true, 
      message: `Created and approved test user: ${handle}`,
      user: userData
    });
    
  } catch (error) {
    console.error('Error creating test user:', error);
    return NextResponse.json({ 
      error: 'Failed to create test user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 