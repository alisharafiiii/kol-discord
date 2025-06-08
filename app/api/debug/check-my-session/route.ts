import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRoleFromTwitterSession, findUserByUsername } from '@/lib/user-identity';

export async function GET() {
  try {
    // Get the session
    const session: any = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({
        authenticated: false,
        message: 'No active session found. Please log in with Twitter.'
      });
    }
    
    // Get the Twitter handle from session
    const twitterHandle = session.twitterHandle;
    
    // Get user role
    const role = await getRoleFromTwitterSession(twitterHandle);
    
    // Get full user data
    const userData = twitterHandle ? await findUserByUsername(twitterHandle.replace('@', '')) : null;
    
    return NextResponse.json({
      authenticated: true,
      session: {
        twitterHandle: session.twitterHandle,
        userName: session.user?.name,
        userImage: session.user?.image,
        provider: session.provider,
        accessToken: session.accessToken ? 'Present' : 'Missing'
      },
      userProfile: userData ? {
        id: userData.id,
        name: userData.name,
        role: userData.role,
        approvalStatus: userData.approvalStatus,
        twitterHandle: userData.twitterHandle
      } : null,
      computedRole: role,
      debug: {
        sessionKeys: Object.keys(session),
        hasTwitterHandle: !!twitterHandle,
        rawHandle: twitterHandle
      }
    });
  } catch (error) {
    console.error('Error checking session:', error);
    return NextResponse.json({
      error: 'Failed to check session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 