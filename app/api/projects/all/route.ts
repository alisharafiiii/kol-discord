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
    
    // Get all projects without filtering
    console.log('🔍 Fetching all projects for scout dashboard');
    const projects = await getAllProjects();
    
    console.log(`🔍 Returning ${projects.length} total projects`);
    
    return NextResponse.json({ 
      success: true, 
      projects,
      count: projects.length
    });
  } catch (error) {
    console.error('Error fetching all projects:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 