import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/project';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: NextRequest) {
  try {
    // Check if user is logged in with Twitter
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    // Get the Twitter handle from session
    const twitterHandle = session?.twitterHandle || session?.user?.name;
    if (!twitterHandle) {
      return NextResponse.json({ error: 'No Twitter handle found in session' }, { status: 401 });
    }
    
    console.log('🔍 SCOUT PROJECTS DEBUG:', {
      sessionTwitterHandle: session?.twitterHandle,
      sessionUserName: session?.user?.name,
      extractedHandle: twitterHandle,
      sessionKeys: Object.keys(session || {})
    });
    
    // Normalize the handle (remove @ if present)
    const normalizedHandle = twitterHandle.replace('@', '').toLowerCase();
    console.log('🔍 Normalized handle for filtering:', normalizedHandle);
    
    // Get all projects
    const allProjects = await getAllProjects();
    console.log('🔍 Total projects found:', allProjects.length);
    
    // Log first few projects for debugging
    if (allProjects.length > 0) {
      console.log('🔍 Sample projects:', allProjects.slice(0, 3).map(p => ({
        id: p.id,
        twitterHandle: p.twitterHandle,
        createdBy: p.createdBy,
        normalizedCreatedBy: p.createdBy?.replace('@', '').toLowerCase()
      })));
    }
    
    // Filter projects created by this Twitter user
    const userProjects = allProjects.filter(project => {
      // Check if the project was created by this Twitter user
      const creatorHandle = project.createdBy?.replace('@', '').toLowerCase();
      const matches = creatorHandle === normalizedHandle;
      
      if (matches) {
        console.log('✅ Found matching project:', {
          projectId: project.id,
          projectTwitterHandle: project.twitterHandle,
          projectCreatedBy: project.createdBy,
          normalizedCreator: creatorHandle,
          normalizedSession: normalizedHandle
        });
      }
      
      return matches;
    });
    
    console.log(`🔍 Scout ${twitterHandle} has ${userProjects.length} projects out of ${allProjects.length} total`);
    
    return NextResponse.json({ projects: userProjects });
  } catch (error) {
    console.error('Error fetching scout projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
} 