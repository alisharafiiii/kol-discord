import { NextRequest, NextResponse } from 'next/server';
import { deleteProject, getProjectById } from '@/lib/project';
import { checkUserRole } from '@/lib/user-identity';

export async function DELETE(req: NextRequest) {
  try {
    // Get wallet from request
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    console.log(`Delete project attempt - Wallet: ${walletAddress}`);
    
    if (!walletAddress) {
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    // Get project ID from request body
    const { projectId } = await req.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }
    
    // Get the project first
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // Check if user has permission to delete
    // Only admin or the project creator can delete
    const roleCheck = await checkUserRole(walletAddress, ['admin']);
    const isCreator = project.createdBy === walletAddress;
    
    if (!roleCheck.hasAccess && !isCreator) {
      console.error(`Delete failed: User ${walletAddress} not authorized to delete project ${projectId}`);
      return NextResponse.json({ error: 'Unauthorized to delete this project' }, { status: 403 });
    }
    
    // Delete the project
    const success = await deleteProject(projectId);
    
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }
    
    console.log(`Project ${projectId} deleted successfully by ${walletAddress}`);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
} 