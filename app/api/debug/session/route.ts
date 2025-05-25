import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { findUserByUsername } from '@/lib/user-identity';

export async function GET(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({ 
        session: null,
        message: 'No session found'
      });
    }
    
    // Extract the handle from session
    const sessionHandle = session?.twitterHandle || session?.user?.name;
    let userFromDb = null;
    
    if (sessionHandle) {
      const normalizedHandle = sessionHandle.replace('@', '').toLowerCase();
      userFromDb = await findUserByUsername(normalizedHandle);
    }
    
    return NextResponse.json({
      session: {
        user: session.user,
        twitterHandle: session.twitterHandle,
        expires: session.expires,
        // Include any other session properties
        ...session
      },
      extracted: {
        sessionHandle,
        normalizedHandle: sessionHandle ? sessionHandle.replace('@', '').toLowerCase() : null
      },
      userFromDb: userFromDb ? {
        id: userFromDb.id,
        name: userFromDb.name,
        twitterHandle: userFromDb.twitterHandle,
        role: userFromDb.role,
        approvalStatus: userFromDb.approvalStatus
      } : null,
      comparison: {
        sessionHasTwitterHandle: !!session.twitterHandle,
        sessionUserName: session?.user?.name,
        foundInDb: !!userFromDb,
        approvalStatus: userFromDb?.approvalStatus || 'not found'
      }
    });
    
  } catch (error) {
    console.error('Session debug error:', error);
    return NextResponse.json({ 
      error: 'Failed to debug session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 