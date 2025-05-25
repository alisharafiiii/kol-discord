import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects, getProjectsByAssignee, getProjectsByCreator } from '@/lib/project';
import { checkUserRole } from '@/lib/user-identity';
import { redis } from '@/lib/redis';
import { Project } from '@/lib/project';

const CACHE_TTL = 60; // Cache for 60 seconds

export async function GET(req: NextRequest) {
  try {
    // Get wallet from request cookies or custom header
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    console.log(`Project listing attempt - Cookie wallet: ${walletFromCookie || 'none'}, Header wallet: ${walletFromHeader || 'none'}`);
    
    if (!walletAddress) {
      console.error('Project listing failed: No wallet address in cookies or headers');
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    // Check if user has any of these roles
    const roleCheck = await checkUserRole(walletAddress, ['admin', 'core', 'scout']);
    console.log(`Project listing role check for ${walletAddress}: `, roleCheck);
    
    if (!roleCheck.hasAccess) {
      console.error(`Project listing failed: User with wallet ${walletAddress} is not authorized. Role: ${roleCheck.role || 'none'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get filter params
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');
    
    let projects: Project[] = [];

    if (filter === 'assigned') {
      projects = await getProjectsByAssignee(walletAddress);
    } else if (filter === 'created') {
      projects = await getProjectsByCreator(walletAddress);
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