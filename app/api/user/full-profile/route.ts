import { NextRequest, NextResponse } from 'next/server';
import { redis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    
    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }
    
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    
    // Get user IDs by handle
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
    
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the full profile
    let profile = null;
    for (const userId of userIds) {
      const userProfile = await redis.json.get(`user:${userId}`);
      if (userProfile) {
        profile = userProfile;
        break;
      }
    }
    
    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    return NextResponse.json(profile);
    
  } catch (error) {
    console.error('Error fetching full user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    const updates = await req.json();
    
    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }
    
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    
    // Get user IDs by handle
    const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
    
    if (!userIds || userIds.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update the profile
    const userId = userIds[0];
    const existingProfile = await redis.json.get(`user:${userId}`);
    
    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    
    // Merge updates with existing profile
    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Save updated profile
    await redis.json.set(`user:${userId}`, '$', JSON.parse(JSON.stringify(updatedProfile)));
    
    // Update role index if role changed
    if (updates.role && updates.role !== (existingProfile as any).role) {
      // Remove from old role index
      if ((existingProfile as any).role) {
        await redis.srem(`idx:role:${(existingProfile as any).role}`, userId);
      }
      // Add to new role index
      await redis.sadd(`idx:role:${updates.role}`, userId);
    }
    
    return NextResponse.json(updatedProfile);
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
} 