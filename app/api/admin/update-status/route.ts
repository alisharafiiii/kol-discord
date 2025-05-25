import { NextRequest, NextResponse } from 'next/server'
import { redis, InfluencerProfile } from '@/lib/redis'

export async function POST(request: NextRequest) {
  try {
    // Ensure proper JSON parsing with explicit error handling
    let data;
    try {
      const text = await request.text();
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON data', 
        details: parseError instanceof Error ? parseError.message : String(parseError) 
      }, { status: 400 });
    }
    
    const { userId, status } = data;
    
    console.log(`Attempting to update status for user: ${userId} to ${status}`);
    
    // Validate inputs
    if (!userId || !['approved', 'pending', 'rejected'].includes(status)) {
      console.error(`Invalid inputs: userId=${userId}, status=${status}`);
      return NextResponse.json({ error: 'Invalid user ID or status' }, { status: 400 })
    }
    
    // Build Redis key for the user
    let userKey = `user:${userId}`;
    
    // Fetch user data from Redis
    console.log(`Fetching user data from Redis key: ${userKey}`);
    let userData = await redis.json.get(userKey) as InfluencerProfile | null;
    
    // If user not found by direct key, try to find by username
    if (!userData && !userId.startsWith('twitter_') && !userId.includes('_')) {
      // This might be a Twitter handle
      const normalizedHandle = userId.toLowerCase().replace('@', '');
      const userIds = await redis.smembers(`idx:username:${normalizedHandle}`);
      
      if (userIds && userIds.length > 0) {
        userKey = `user:${userIds[0]}`;
        userData = await redis.json.get(userKey) as InfluencerProfile | null;
      }
    }
    
    if (!userData) {
      console.error(`User not found in Redis with key: ${userKey}`);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log(`Found user: ${JSON.stringify(userData, null, 2).substring(0, 200)}...`);
    
    // Update status in Redis
    console.log(`Setting user approvalStatus to: ${status}`);
    try {
      await redis.json.set(userKey, '$.approvalStatus', JSON.stringify(status))
    } catch (err) {
      // Some Redis setups expect raw string without extra JSON.stringify – fallback
      console.warn('Primary json.set failed, retrying without stringify ...');
      await redis.json.set(userKey, '$.approvalStatus', status)
    }
    
    // Also update the status indexes
    const oldStatus = userData.approvalStatus || 'pending'
    if (oldStatus !== status) {
      console.log(`Updating status indexes: removing from ${oldStatus}, adding to ${status}`);
      // Remove from old status set
      await redis.srem(`idx:status:${oldStatus}`, userId)
      // Add to new status set
      await redis.sadd(`idx:status:${status}`, userId)
    }
    
    console.log(`Successfully updated user status: ${userId} -> ${status}`);

    // Ensure any other profiles with same twitter handle get same status
    if (userData.twitterHandle) {
      const handleNorm = userData.twitterHandle.replace('@','').toLowerCase()
      const dupIds = await redis.smembers(`idx:username:${handleNorm}`)
      for (const dupId of dupIds) {
        if (dupId === userId) continue
        try {
          await redis.json.set(`user:${dupId}`, '$.approvalStatus', status)
        } catch {}
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user status:', error)
    // More detailed error information
    const errorDetails = error instanceof Error ? 
      { message: error.message, stack: error.stack } : 
      { message: 'Unknown error type', error };
    console.error('Error details:', errorDetails);
    
    return NextResponse.json({ 
      error: 'Failed to update status',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 