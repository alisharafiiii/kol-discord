import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/project';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { redis } from '@/lib/redis';

export async function GET(req: NextRequest) {
  try {
    // Get session
    const session: any = await getServerSession(authOptions as any);
    
    // Get all projects
    const allProjects = await getAllProjects();
    
    // Get project creator indexes
    const creatorIndexKeys = await redis.keys('idx:project:creator:*');
    const creatorIndexes: Record<string, string[]> = {};
    
    for (const key of creatorIndexKeys) {
      const projectIds = await redis.smembers(key);
      creatorIndexes[key] = projectIds;
    }
    
    // Debug data
    const debugData = {
      session: {
        hasSession: !!session,
        user: session?.user ? {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          twitterHandle: session.user.twitterHandle
        } : null,
        twitterHandle: session?.twitterHandle,
        provider: session?.provider,
        keys: session ? Object.keys(session) : []
      },
      extractedHandles: {
        fromTwitterHandle: session?.twitterHandle,
        fromUserName: session?.user?.name,
        final: session?.twitterHandle || session?.user?.name,
        normalized: (session?.twitterHandle || session?.user?.name || '').replace('@', '').toLowerCase()
      },
      projects: {
        total: allProjects.length,
        samples: allProjects.slice(0, 5).map(p => ({
          id: p.id,
          twitterHandle: p.twitterHandle,
          createdBy: p.createdBy,
          createdByNormalized: p.createdBy?.replace('@', '').toLowerCase(),
          assignedTo: p.assignedTo,
          createdAt: p.createdAt
        }))
      },
      creatorIndexes: creatorIndexKeys.map(key => ({
        key,
        projectCount: creatorIndexes[key].length,
        projectIds: creatorIndexes[key].slice(0, 3)
      })),
      filterTest: {
        sessionHandle: session?.twitterHandle || session?.user?.name,
        normalizedSessionHandle: (session?.twitterHandle || session?.user?.name || '').replace('@', '').toLowerCase(),
        matchingProjects: allProjects.filter(p => {
          const creatorHandle = p.createdBy?.replace('@', '').toLowerCase();
          const sessionHandle = (session?.twitterHandle || session?.user?.name || '').replace('@', '').toLowerCase();
          return creatorHandle === sessionHandle;
        }).map(p => ({
          id: p.id,
          twitterHandle: p.twitterHandle,
          createdBy: p.createdBy
        }))
      }
    };
    
    return NextResponse.json(debugData, { status: 200 });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({ 
      error: 'Debug endpoint failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 