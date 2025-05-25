import { NextRequest, NextResponse } from 'next/server';
import { findUserByWallet, findUserByUsername } from '@/lib/user-identity';
import { redis, InfluencerProfile } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    // Get the identifier from the query parameter - could be wallet or handle
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const handle = searchParams.get('handle');
    
    if (!wallet && !handle) {
      return NextResponse.json({ error: 'Either wallet address or handle is required' }, { status: 400 });
    }
    
    let user = null;
    
    // Try to find by wallet first
    if (wallet) {
      user = await findUserByWallet(wallet);
    }
    
    // If no user found by wallet, or if handle is provided, try by handle
    if (!user && handle) {
      const normalizedHandle = handle.replace('@', '').toLowerCase();
      const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
      if (userIds && userIds.length > 0) {
        let chosen: InfluencerProfile | null = null;
        for (const id of userIds) {
          const profile = await redis.json.get(`user:${id}`) as InfluencerProfile | null;
          if (!chosen) chosen = profile;
          if (profile?.approvalStatus === 'approved') {
            chosen = profile;
            break;
          }
        }
        user = chosen;
      }
    }
    
    // If still no user and wallet was provided, try treating wallet as a Twitter handle
    if (!user && wallet) {
      const normalizedWallet = wallet.replace('@', '').toLowerCase();
      user = await findUserByUsername(normalizedWallet);
    }
    
    if (!user) {
      return NextResponse.json({ 
        user: {
          id: (wallet || handle || '').substring(0, 8),
          profileImageUrl: null,
          approvalStatus: 'pending'
        }
      });
    }
    
    // Return the user profile with necessary fields including approval status
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        profileImageUrl: user.profileImageUrl,
        twitterHandle: user.twitterHandle,
        approvalStatus: user.approvalStatus || 'pending',
        role: user.role || 'user'
      }
    });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
} 