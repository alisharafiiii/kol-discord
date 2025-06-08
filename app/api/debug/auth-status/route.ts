import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest) {
  try {
    // Get the session
    const session: any = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No session found'
      });
    }
    
    const handle = session?.twitterHandle || session?.user?.name;
    
    // Fetch the user profile to get current role
    let userProfile = null;
    if (handle) {
      try {
        const profileRes = await fetch(`http://localhost:3000/api/user/profile?handle=${handle}`);
        if (profileRes.ok) {
          const data = await profileRes.json();
          userProfile = data.user;
        }
      } catch (e) {
        console.error('Error fetching profile:', e);
      }
    }
    
    return NextResponse.json({
      authenticated: true,
      session: {
        user: {
          name: session.user?.name,
          email: session.user?.email,
          twitterHandle: session.twitterHandle,
          role: session.user?.role,
          approvalStatus: session.user?.approvalStatus
        }
      },
      profileData: userProfile,
      isAdmin: userProfile?.role === 'admin' || handle === 'sharafi_eth',
      message: 'Authentication status retrieved'
    });
    
  } catch (error) {
    console.error('Error checking auth status:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 