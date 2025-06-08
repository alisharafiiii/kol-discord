import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, getProjectsByAssignee, getProjectsByCreator } from '@/lib/project';
import { checkAuth } from '@/lib/auth-utils';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { Project } from '@/lib/project';

const CACHE_TTL = 60; // Cache for 60 seconds

export async function GET(req: NextRequest) {
  try {
    // Check authentication and role using Twitter session
    const authCheck = await checkAuth(req, ['admin', 'core', 'scout']);
    
    console.log(`Project listing attempt - User: ${authCheck.user?.twitterHandle || 'none'}, Role: ${authCheck.role || 'none'}`);
    
    if (!authCheck.authenticated) {
      console.error('Project listing failed: No authenticated session');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'Please log in with Twitter to view projects' 
      }, { status: 401 });
    }
    
    if (!authCheck.hasAccess) {
      console.error(`Project listing failed: User @${authCheck.user?.twitterHandle} is not authorized. Role: ${authCheck.role || 'none'}`);
      return NextResponse.json({ 
        error: 'Unauthorized',
        message: 'You need scout, core, or admin role to view projects'
      }, { status: 403 });
    }
    
    // Get filter params
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');
    
    let projects: Project[] = [];
    
    // For user-specific filters, use the Twitter handle as identifier
    const userIdentifier = authCheck.user?.twitterHandle || '';

    if (filter === 'assigned') {
      // Note: This might need adjustment based on how projects are assigned
      // For now, using Twitter handle as the identifier
      projects = await getProjectsByAssignee(userIdentifier);
    } else if (filter === 'created') {
      projects = await getProjectsByCreator(userIdentifier);
    } else {
      projects = await getAllProjects();
    }
    
    // Ensure websites are properly formatted with https:// if needed
    const normalizedProjects = projects.map(project => {
      if (project.website && !project.website.match(/^https?:\/\//i)) {
        return {
          ...project,
          website: `https://${project.website}`
        };
      }
      return project;
    });
    
    console.log(`Listed ${normalizedProjects.length} projects for ${filter || 'all'} filter`);
    
    return NextResponse.json({ projects: normalizedProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
} 