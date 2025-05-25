import { NextRequest, NextResponse } from 'next/server';
import { checkProjectExists, getProjectByHandle } from '@/lib/project';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  try {
    console.time('check-exists-total');
    
    // Check if user is logged in with Twitter
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    // Get Twitter handle from query params
    const { searchParams } = new URL(req.url);
    const twitterHandle = searchParams.get('handle');
    
    if (!twitterHandle) {
      return NextResponse.json({ error: 'Twitter handle is required' }, { status: 400 });
    }
    
    console.time('check-exists-lookup');
    // Always check directly - no caching to avoid stale data
    const exists = await checkProjectExists(twitterHandle);
    console.timeEnd('check-exists-lookup');
    
    if (exists) {
      // Get the project ID
      const project = await getProjectByHandle(twitterHandle);
      return NextResponse.json({ 
        exists: true, 
        projectId: project?.id || null,
        message: 'Project with this Twitter handle already exists'
      });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking project:', error);
    return NextResponse.json({ error: 'Failed to check project' }, { status: 500 });
  } finally {
    console.timeEnd('check-exists-total');
  }
} 