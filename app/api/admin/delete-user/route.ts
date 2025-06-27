import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ProfileService } from '@/lib/services/profile-service';

export async function DELETE(req: NextRequest) {
  try {
    // Check if user is logged in with Twitter and is admin
    const session: any = await getServerSession(authOptions as any);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    // Get Twitter handle from session
    const twitterHandle = session?.twitterHandle || session?.user?.twitterHandle || session?.user?.name;
    const normalizedHandle = twitterHandle?.toLowerCase().replace('@', '');
    
    console.log('[ADMIN DELETE-USER] Twitter handle:', twitterHandle, 'Normalized:', normalizedHandle);
    
    // Check if user is sharafi_eth (hardcoded admin) or has admin role
    if (normalizedHandle !== 'sharafi_eth') {
      const userRole = session?.user?.role || session?.role;
      console.log('[ADMIN DELETE-USER] User role:', userRole);
      
      if (userRole !== 'admin') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }
    
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    console.log(`[ADMIN DELETE-USER] Attempting to delete user: ${userId}`);
    
    try {
      // First, try ProfileService (new system)
      let deletedFromProfileService = false;
      
      // Check if it's a UUID (ProfileService ID)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
      
      if (isUUID) {
        console.log(`[ADMIN DELETE-USER] Detected UUID, checking ProfileService`);
        const profile = await ProfileService.getProfileById(userId);
        if (profile) {
          await ProfileService.deleteProfile(userId);
          deletedFromProfileService = true;
          console.log(`[ADMIN DELETE-USER] Deleted from ProfileService: ${userId}`);
        }
      }
      
      // If not found by ID, try by handle in ProfileService
      if (!deletedFromProfileService) {
        const normalizedUsername = userId.toLowerCase().replace('@', '');
        console.log(`[ADMIN DELETE-USER] Checking ProfileService by handle: ${normalizedUsername}`);
        
        const profile = await ProfileService.getProfileByHandle(normalizedUsername);
        if (profile) {
          await ProfileService.deleteProfile(profile.id);
          deletedFromProfileService = true;
          console.log(`[ADMIN DELETE-USER] Deleted from ProfileService by handle: ${normalizedUsername}`);
        }
      }
      
      // If deleted from ProfileService, we're done
      if (deletedFromProfileService) {
        return NextResponse.json({ 
          success: true, 
          message: `User ${userId} deleted successfully from ProfileService`,
          deletedBy: twitterHandle 
        });
      }
      
      // Otherwise, check old system
      console.log(`[ADMIN DELETE-USER] Not found in ProfileService, checking old system`);
      
      // First, check if the userId is actually a username (handle)
      // This handles cases where the frontend passes a username instead of an ID
      let actualUserId = userId;
      let user = null;
      
      // Try to get user directly by ID first
      if (userId.startsWith('user:')) {
        user = await redis.json.get(userId) as any;
        actualUserId = userId;
      } else if (userId.startsWith('user_')) {
        user = await redis.json.get(`user:${userId}`) as any;
        actualUserId = `user:${userId}`;
      } else {
        // If it's not a standard user ID format, try to look it up as a username
        const normalizedUsername = userId.toLowerCase().replace('@', '');
        console.log(`[ADMIN DELETE-USER] Looking up by username: ${normalizedUsername}`);
        
        // Try to find by username index
        const userIds = await redis.smembers(`idx:username:${normalizedUsername}`);
        if (userIds && userIds.length > 0) {
          actualUserId = userIds[0];
          const redisKey = actualUserId.startsWith('user:') ? actualUserId : `user:${actualUserId}`;
          user = await redis.json.get(redisKey) as any;
          console.log(`[ADMIN DELETE-USER] Found user by username lookup: ${actualUserId}`);
        }
      }
      
      // If still no user found, return error
      if (!user) {
        console.log(`[ADMIN DELETE-USER] User not found for: ${userId}`);
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      // Extract clean user ID for operations
      const cleanUserId = actualUserId.startsWith('user:') ? actualUserId.replace('user:', '') : actualUserId;
      
      // Build list of user IDs that share the same Twitter handle (duplicates)
      let duplicateIds: string[] = [];
      if (user.twitterHandle) {
        const hNorm = user.twitterHandle.replace('@','').toLowerCase();
        duplicateIds = await redis.smembers(`idx:username:${hNorm}`);
      }
      if (!duplicateIds.includes(cleanUserId)) duplicateIds.push(cleanUserId);
      
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
        const dupProfile = dupId === cleanUserId ? user : await redis.json.get(`user:${dupId}`);
        if (dupProfile) await cleanupForProfile(dupId, dupProfile);
      }
      
      console.log(`[ADMIN DELETE-USER] Deleted profiles: ${duplicateIds.join(', ')}`);
      
      return NextResponse.json({ 
        success: true, 
        message: `Users ${duplicateIds.join(', ')} deleted successfully`,
        deletedBy: twitterHandle 
      });
    } catch (redisError) {
      console.error('[ADMIN DELETE-USER] Redis error:', redisError);
      return NextResponse.json({ 
        error: 'Failed to delete user - database error' 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('[ADMIN DELETE-USER] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 