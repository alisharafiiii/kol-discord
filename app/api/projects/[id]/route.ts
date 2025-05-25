import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProjectById } from '@/lib/project';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';
import { findUserByUsername } from '@/lib/user-identity';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    
    // Check if user is logged in with Twitter
    const session: any = await getServerSession(authOptions as any);
    if (!session?.user) {
      return NextResponse.json({ error: 'Twitter login required' }, { status: 401 });
    }
    
    const sessionHandle = session?.twitterHandle || session?.user?.name;
    if (!sessionHandle) {
      return NextResponse.json({ error: 'No Twitter handle found in session' }, { status: 401 });
    }
    
    console.log(`Delete project attempt - Project: ${projectId}, User: ${sessionHandle}`);
    
    // Get the project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if user is the creator
    const normalizedSessionHandle = sessionHandle.replace('@', '').toLowerCase();
    const normalizedProjectCreator = project.createdBy.replace('@', '').toLowerCase();
    const isCreator = normalizedSessionHandle === normalizedProjectCreator;
    
    // Check if user is admin
    const user = await findUserByUsername(normalizedSessionHandle);
    const isAdmin = user?.role === 'admin';
    
    console.log('Delete permission check:', {
      sessionHandle,
      projectCreator: project.createdBy,
      isCreator,
      isAdmin,
      userRole: user?.role
    });
    
    // Only admin or the project creator can delete
    if (!isCreator && !isAdmin) {
      console.error(`Delete failed: User ${sessionHandle} not authorized to delete project ${projectId}`);
      return NextResponse.json({ 
        error: 'Unauthorized to delete this project',
        details: 'Only the project creator or admin can delete projects'
      }, { status: 403 });
    }
    
    // Delete the project
    const success = await deleteProject(projectId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
    
    console.log(`Project ${projectId} deleted successfully by ${sessionHandle}`);
    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ 
      error: 'Failed to delete project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 