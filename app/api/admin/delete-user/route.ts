import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { checkUserRole } from '@/lib/user-identity';

export async function DELETE(req: NextRequest) {
  try {
    // Check admin authorization
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    const roleCheck = await checkUserRole(walletAddress, ['admin']);
    if (!roleCheck.hasAccess) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    // Get user data – if we can't find by ID, attempt by handle set
    let user = await redis.json.get(`user:${userId}`) as any;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build list of user IDs that share the same Twitter handle (duplicates)
    let duplicateIds: string[] = [];
    if (user.twitterHandle) {
      const hNorm = user.twitterHandle.replace('@','').toLowerCase();
      duplicateIds = await redis.smembers(`idx:username:${hNorm}`);
    }
    if (!duplicateIds.includes(userId)) duplicateIds.push(userId);
    
    // Helper to cleanup indexes for a single profile
    const cleanupForProfile = async (uId: string, profile: any) => {
      const promises = [];
      if (profile.twitterHandle) {
        const h = profile.twitterHandle.replace('@','').toLowerCase();
        promises.push(redis.srem(`idx:username:${h}`, uId));
      }
      if (profile.walletAddresses) {
        Object.values(profile.walletAddresses).forEach((addr: any) => {
          if (typeof addr === 'string') promises.push(redis.srem(`idx:wallet:${addr.toLowerCase()}`, uId));
        })
      }
      if (profile.approvalStatus) promises.push(redis.srem(`idx:status:${profile.approvalStatus}`, uId));
      if (profile.name) {
        const dn = profile.name.toLowerCase().replace(/\s+/g,'');
        promises.push(redis.srem(`idx:displayname:${dn}`, uId));
      }
      if (profile.role) promises.push(redis.srem(`idx:role:${profile.role}`, uId));
      promises.push(redis.del(`user:${uId}`));
      await Promise.all(promises);
    };

    // Iterate over duplicates and clean each
    for (const dupId of duplicateIds) {
      const dupProfile = dupId === userId ? user : await redis.json.get(`user:${dupId}`);
      if (dupProfile) await cleanupForProfile(dupId, dupProfile);
    }
    
    console.log(`Deleted profiles: ${duplicateIds.join(', ')}`);
    
    return NextResponse.json({ 
      success: true, 
      message: `Users ${duplicateIds.join(', ')} deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error deleting users:', error);
    return NextResponse.json({ 
      error: 'Failed to delete users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 