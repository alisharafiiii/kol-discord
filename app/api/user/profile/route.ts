import { NextRequest, NextResponse } from 'next/server';
import { findUserByWallet, findUserByUsername } from '@/lib/user-identity';
import { redis, InfluencerProfile } from '@/lib/redis';
import { ProfileService } from '@/lib/services/profile-service';
import type { UnifiedProfile } from '@/lib/types/profile';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserStats } from '@/lib/utils/user-stats';
import { hasAdminAccess, logAdminAccess } from '@/lib/admin-config';

export async function GET(req: NextRequest) {
  console.log('=== USER PROFILE API: Request received ===');
  
  // Log request details for debugging mobile issues
  const userAgent = req.headers.get('user-agent') || 'Unknown'
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent)
  console.log('USER PROFILE API: User-Agent:', userAgent)
  console.log('USER PROFILE API: Is Mobile:', isMobile)
  
  try {
    // Get the identifier from the query parameter - could be wallet or handle
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');
    const handle = searchParams.get('handle');
    
    console.log('USER PROFILE API: Params - wallet:', wallet, 'handle:', handle);
    
    if (!wallet && !handle) {
      console.log('USER PROFILE API: No wallet or handle provided');
      return NextResponse.json({ error: 'Either wallet address or handle is required' }, { status: 400 });
    }
    
    // Don't use hardcoded response - fetch actual data from database
    const identifier = (wallet || handle || '').toLowerCase();
    console.log('USER PROFILE API: Checking identifier:', identifier);
    
    let user = null;
    
    try {
      // Try to find by wallet first
      if (wallet) {
        console.log('USER PROFILE API: Searching by wallet:', wallet);
        user = await findUserByWallet(wallet);
        console.log('USER PROFILE API: User found by wallet:', user ? 'Yes' : 'No');
      }
      
      // If no user found by wallet, or if handle is provided, try by handle
      if (!user && handle) {
        const normalizedHandle = handle.replace('@', '').toLowerCase();
        console.log('USER PROFILE API: Searching by handle in ProfileService:', normalizedHandle);
        
        // First try ProfileService which has complete data
        const unifiedProfile = await ProfileService.getProfileByHandle(normalizedHandle);
        if (unifiedProfile) {
          console.log('USER PROFILE API: Found unified profile');
          
          // Get user stats
          const stats = await getUserStats(normalizedHandle);
          
          // Return the complete profile data
          const response = {
            user: {
              id: unifiedProfile.id,
              name: unifiedProfile.name || unifiedProfile.twitterHandle || 'Unknown User',
              profileImageUrl: unifiedProfile.profileImageUrl?.replace('_normal', '_400x400'),
              twitterHandle: unifiedProfile.twitterHandle,
              approvalStatus: unifiedProfile.approvalStatus,
              role: unifiedProfile.role,
              tier: unifiedProfile.tier || unifiedProfile.currentTier || 'micro',
              scoutCount: stats.scoutCount,
              contestCount: stats.contestCount,
              // Complete profile data
              email: unifiedProfile.email,
              phone: unifiedProfile.phone,
              contacts: unifiedProfile.contacts,
              shippingAddress: unifiedProfile.shippingAddress,
              bio: unifiedProfile.bio,
              country: unifiedProfile.country,
              city: unifiedProfile.city,
              socialLinks: unifiedProfile.socialLinks,
              walletAddresses: unifiedProfile.walletAddresses,
              createdAt: unifiedProfile.createdAt,
              updatedAt: unifiedProfile.updatedAt,
              notes: unifiedProfile.notes,
              // KOL specific
              isKOL: unifiedProfile.isKOL,
              currentTier: unifiedProfile.currentTier,
              kolMetrics: unifiedProfile.kolMetrics,
              campaigns: unifiedProfile.campaigns
            }
          };
          console.log('USER PROFILE API: Returning unified profile data');
          return NextResponse.json(response);
        }
        
        // Fall back to old Redis lookup
        console.log('USER PROFILE API: Searching by handle in Redis:', normalizedHandle);
        
        const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
        console.log('USER PROFILE API: User IDs found:', userIds);
        
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
          console.log('USER PROFILE API: User found in Redis:', user ? 'Yes' : 'No');
          if (user) {
            console.log('USER PROFILE API: User role:', user.role);
          }
        }
      }
      
      // If still no user and wallet was provided, try treating wallet as a Twitter handle
      if (!user && wallet) {
        const normalizedWallet = wallet.replace('@', '').toLowerCase();
        console.log('USER PROFILE API: Trying wallet as Twitter handle:', normalizedWallet);
        user = await findUserByUsername(normalizedWallet);
        console.log('USER PROFILE API: User found by username:', user ? 'Yes' : 'No');
      }
    } catch (redisError) {
      console.error('USER PROFILE API: Redis connection error:', redisError);
      // Continue with default response
    }
    
    if (!user) {
      const defaultResponse = { 
        user: {
          id: (wallet || handle || '').substring(0, 8),
          profileImageUrl: null,
          approvalStatus: 'pending'
        }
      };
      console.log('USER PROFILE API: No user found, returning default:', JSON.stringify(defaultResponse, null, 2));
      return NextResponse.json(defaultResponse);
    }
    
    // Get user stats for the found user
    const userHandle = user.twitterHandle || handle || '';
    const stats = await getUserStats(userHandle);
    
    // Return the user profile with necessary fields including approval status
    const response = {
      user: {
        id: user.id,
        name: user.name,
        profileImageUrl: user.profileImageUrl?.replace('_normal', '_400x400'),
        twitterHandle: user.twitterHandle,
        approvalStatus: user.approvalStatus,
        role: user.role,
        tier: user.tier || 'micro',
        scoutCount: stats.scoutCount,
        contestCount: stats.contestCount,
        // Add direct email, phone, telegram fields (they may exist even if not in type)
        email: (user as any).email,
        phone: (user as any).phone,
        telegram: (user as any).telegram,
        // Add available fields from InfluencerProfile
        bio: user.bio,
        country: user.country,
        shippingInfo: user.shippingInfo,
        shippingAddress: (user as any).shippingAddress,
        socialAccounts: user.socialAccounts,
        walletAddresses: user.walletAddresses,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        adminNotes: user.adminNotes,
        // KOL specific fields
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        audienceTypes: user.audienceTypes,
        chains: user.chains,
        postPricePerPost: user.postPricePerPost,
        monthlySupportBudget: user.monthlySupportBudget,
        campaigns: user.campaigns,
        campaignHistory: user.campaignHistory
      }
    };
    console.log('USER PROFILE API: Returning user data:', JSON.stringify(response, null, 2));
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('USER PROFILE API: Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  console.log('=== USER PROFILE API: PUT Request received ===');
  
  try {
    // Check authentication
    const session: any = await getServerSession(authOptions as any);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('USER PROFILE API: Session data:', JSON.stringify(session, null, 2));
    
    // Get Twitter handle from session
    const twitterHandle = session?.twitterHandle || session?.user?.twitterHandle || session?.user?.name;
    const normalizedSessionHandle = twitterHandle?.toLowerCase().replace('@', '');
    
    console.log('USER PROFILE API: Session handle:', normalizedSessionHandle);
    
    // Check role from session first
    let userRole = session?.role || session?.user?.role;
    
    // If no role in session, fetch from database
    if (!userRole && normalizedSessionHandle) {
      try {
        const userIds = await redis.smembers(`idx:username:${normalizedSessionHandle}`);
        if (userIds && userIds.length > 0) {
          const userData = await redis.json.get(`user:${userIds[0]}`) as InfluencerProfile | null;
          userRole = userData?.role || 'user';
          console.log('USER PROFILE API: Fetched role from database:', userRole);
        }
      } catch (err) {
        console.error('USER PROFILE API: Error fetching user role:', err);
        userRole = 'user';
      }
    }
    
    console.log('USER PROFILE API: Final user role:', userRole);
    
    // Check if user has necessary permissions
    const allowedRoles = ['admin', 'core', 'team'];
    if (!hasAdminAccess(normalizedSessionHandle, userRole) && !allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    
    const data = await req.json();
    const { handle, name, email, phone, telegram, contacts, shippingAddress, role, approvalStatus } = data;
    
    // Log admin access for profile updates
    logAdminAccess(normalizedSessionHandle, 'profile_update', {
      method: userRole,
      targetHandle: handle,
      api: 'user_profile'
    });
    
    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }
    
    // Role updates require admin permissions
    if (role !== undefined && userRole !== 'admin' && userRole !== 'core') {
      return NextResponse.json({ error: 'Only admin or core users can update roles' }, { status: 403 });
    }
    
    // Approval status updates require admin permissions
    if (approvalStatus !== undefined && userRole !== 'admin' && userRole !== 'core') {
      return NextResponse.json({ error: 'Only admin or core users can update approval status' }, { status: 403 });
    }
    
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    console.log('USER PROFILE API: Updating profile for handle:', normalizedHandle);
    
    // First try to find in ProfileService (new system)
    let profile = await ProfileService.getProfileByHandle(normalizedHandle);
    
    if (profile) {
      console.log('USER PROFILE API: Found profile in ProfileService, updating...');
      
      // Update profile fields
      if (name !== undefined) profile.name = name;
      if (email !== undefined) profile.email = email;
      if (phone !== undefined) profile.phone = phone;
      if (role !== undefined) profile.role = role;
      if (approvalStatus !== undefined) profile.approvalStatus = approvalStatus;
      
      // Update contacts
      if (telegram !== undefined || contacts?.telegram !== undefined) {
        if (!profile.contacts) profile.contacts = {};
        profile.contacts.telegram = telegram || contacts?.telegram;
      }
      
      // Update shipping address if provided
      if (shippingAddress) {
        profile.shippingAddress = {
          street: shippingAddress.addressLine1 || '',
          city: shippingAddress.city || '',
          state: shippingAddress.state,
          postalCode: shippingAddress.postalCode || '',
          country: shippingAddress.country || '',
          phone: shippingAddress.phone
        };
      }
      
      // Save updated profile
      await ProfileService.saveProfile(profile);
      
      console.log('USER PROFILE API: Profile updated successfully in ProfileService');
      
      return NextResponse.json({ 
        success: true,
        message: 'Profile updated successfully',
        updates: {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          contacts: profile.contacts,
          shippingAddress: profile.shippingAddress
        }
      });
    }
    
    // Fall back to old Redis system
    console.log('USER PROFILE API: Profile not found in ProfileService, checking old Redis system...');
    
    // Try to find the user by handle
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userId = userIds[0];
    const user = await redis.json.get(`user:${userId}`) as InfluencerProfile | null;
    
    if (!user) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    
    // Update user profile fields
    const updates: any = {};
    
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (telegram !== undefined) updates.telegram = telegram;
    
    // Also update contacts if telegram is provided
    if (telegram !== undefined || contacts?.telegram !== undefined) {
      updates.contacts = {
        ...(user as any).contacts,
        telegram: telegram || contacts?.telegram
      };
    }
    
    // Update shipping address if provided
    if (shippingAddress) {
      updates.shippingAddress = {
        addressLine1: shippingAddress.addressLine1 || '',
        addressLine2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || ''
      };
    }
    
    // Also update in shippingInfo format for backward compatibility
    if (shippingAddress) {
      updates.shippingInfo = {
        fullName: user.name || user.twitterHandle,
        addressLine1: shippingAddress.addressLine1 || '',
        addressLine2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city || '',
        postalCode: shippingAddress.postalCode || '',
        country: shippingAddress.country || ''
      };
    }
    
    // Update timestamps
    updates.updatedAt = new Date().toISOString();
    
    // Update in Redis - merge with existing user data
    const updatedUser = {
      ...user,
      ...updates
    };
    
    console.log('USER PROFILE API: Saving updated user:', {
      userId,
      handle: normalizedHandle,
      updates: Object.keys(updates)
    });
    
    try {
      // Save the entire updated user object
      await redis.json.set(`user:${userId}`, '$', updatedUser);
      console.log('USER PROFILE API: Redis update successful');
    } catch (redisError) {
      console.error('USER PROFILE API: Redis update error:', redisError);
      throw redisError;
    }
    
    console.log('USER PROFILE API: Profile updated successfully');
    
    return NextResponse.json({ 
      success: true,
      message: 'Profile updated successfully',
      updates
    });
    
  } catch (error) {
    console.error('USER PROFILE API: Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update user profile' }, { status: 500 });
  }
} 