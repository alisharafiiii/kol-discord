import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/project';

export async function GET(req: NextRequest) {
  try {
    // Get handle from query parameter for testing
    const { searchParams } = new URL(req.url);
    const testHandle = searchParams.get('handle');
    
    if (!testHandle) {
      return NextResponse.json({ error: 'Please provide ?handle=username' }, { status: 400 });
    }
    
    // Get all projects
    const allProjects = await getAllProjects();
    
    // Normalize the test handle
    const normalizedTestHandle = testHandle.replace('@', '').toLowerCase();
    
    // Filter projects
    const matchingProjects = allProjects.filter(project => {
      const creatorHandle = project.createdBy?.replace('@', '').toLowerCase();
      return creatorHandle === normalizedTestHandle;
    });
    
    // Debug info
    const debugInfo = {
      testHandle,
      normalizedTestHandle,
      totalProjects: allProjects.length,
      matchingProjects: matchingProjects.length,
      allCreators: Array.from(new Set(allProjects.map(p => p.createdBy))),
      normalizedCreators: Array.from(new Set(allProjects.map(p => p.createdBy?.replace('@', '').toLowerCase()))),
      sampleProjects: allProjects.slice(0, 3).map(p => ({
        id: p.id,
        twitterHandle: p.twitterHandle,
        createdBy: p.createdBy,
        normalizedCreatedBy: p.createdBy?.replace('@', '').toLowerCase()
      })),
      matches: matchingProjects.map(p => ({
        id: p.id,
        twitterHandle: p.twitterHandle,
        createdBy: p.createdBy
      }))
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Test scout error:', error);
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 