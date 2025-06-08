import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername } from '@/lib/user-identity';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  console.log('=== USER ROLE API: Request received ===');
  
  try {
    // Check if user is logged in with Twitter
    const session: any = await getServerSession(authOptions as any);
    console.log('USER ROLE API: Session data:', JSON.stringify(session, null, 2));
    
    if (!session?.user) {
      console.log('USER ROLE API: No session user found');
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    // Get handle from query parameter or session
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    console.log('USER ROLE API: Handle from query:', handle);
    
    if (!handle) {
      // If no handle provided, use session handle
      const sessionHandle = session?.twitterHandle || session?.user?.name;
      console.log('USER ROLE API: Using session handle:', sessionHandle);
      
      if (!sessionHandle) {
        console.log('USER ROLE API: No handle found in session');
        return NextResponse.json({ error: 'No handle provided' }, { status: 400 });
      }
      
      // Temporary fix for sharafi_eth while Redis is down
      const normalizedSessionHandle = sessionHandle.replace('@', '').toLowerCase();
      console.log('USER ROLE API: Normalized session handle:', normalizedSessionHandle);
      
      if (normalizedSessionHandle === 'sharafi_eth') {
        console.log('USER ROLE API: Master admin sharafi_eth detected - returning admin role');
        return NextResponse.json({ 
          role: 'admin',
          handle: sessionHandle,
          approvalStatus: 'approved'
        });
      }
      
      const normalizedHandle = sessionHandle.replace('@', '').toLowerCase();
      
      try {
        const user = await findUserByUsername(normalizedHandle);
        console.log('USER ROLE API: User found in Redis:', user ? 'Yes' : 'No');
        
        const response = { 
          role: user?.role || 'scout',
          handle: sessionHandle
        };
        console.log('USER ROLE API: Returning response:', response);
        return NextResponse.json(response);
      } catch (redisError) {
        console.error('USER ROLE API: Redis error in role check:', redisError);
        // Return scout role if Redis is down
        const response = { 
          role: 'scout',
          handle: sessionHandle
        };
        console.log('USER ROLE API: Redis down, returning default response:', response);
        return NextResponse.json(response);
      }
    }
    
    // Find user by the provided handle
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    console.log('USER ROLE API: Normalized query handle:', normalizedHandle);
    
    // Temporary fix for sharafi_eth while Redis is down
    if (normalizedHandle === 'sharafi_eth') {
      console.log('USER ROLE API: Master admin sharafi_eth detected via query - returning admin role');
      return NextResponse.json({ 
        role: 'admin',
        handle: handle,
        approvalStatus: 'approved'
      });
    }
    
    try {
      const user = await findUserByUsername(normalizedHandle);
      console.log('USER ROLE API: User found in Redis via query:', user ? 'Yes' : 'No');
      
      if (!user) {
        const response = { 
          role: 'scout', // Default role if user not found
          handle: handle
        };
        console.log('USER ROLE API: User not found, returning default:', response);
        return NextResponse.json(response);
      }
      
      const response = { 
        role: user.role,
        handle: handle,
        approvalStatus: user.approvalStatus
      };
      console.log('USER ROLE API: Returning user data:', response);
      return NextResponse.json(response);
    } catch (redisError) {
      console.error('USER ROLE API: Redis error in role check:', redisError);
      const response = { 
        role: 'scout',
        handle: handle
      };
      console.log('USER ROLE API: Redis down, returning default:', response);
      return NextResponse.json(response);
    }
    
  } catch (error) {
    console.error('USER ROLE API: Error fetching user role:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 