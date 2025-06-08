import { NextRequest, NextResponse } from 'next/server';
import { findUserByUsername } from '@/lib/user-identity';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    // Check if user is logged in with Twitter
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    // Get handle from query parameter or session
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    
    if (!handle) {
      // If no handle provided, use session handle
      const sessionHandle = session?.twitterHandle || session?.user?.name;
      if (!sessionHandle) {
        return NextResponse.json({ error: 'No handle provided' }, { status: 400 });
      }
      
      const normalizedHandle = sessionHandle.replace('@', '').toLowerCase();
      const user = await findUserByUsername(normalizedHandle);
      
      return NextResponse.json({ 
        role: user?.role || 'scout',
        handle: sessionHandle
      });
    }
    
    // Find user by the provided handle
    const normalizedHandle = handle.replace('@', '').toLowerCase();
    const user = await findUserByUsername(normalizedHandle);
    
    if (!user) {
      return NextResponse.json({ 
        role: 'scout', // Default role if user not found
        handle: handle
      });
    }
    
    return NextResponse.json({ 
      role: user.role,
      handle: handle,
      approvalStatus: user.approvalStatus
    });
    
  } catch (error) {
    console.error('Error fetching user role:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user role',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 