import { NextRequest, NextResponse } from 'next/server';
import { updateProject, getProjectById } from '@/lib/project';
import { checkUserRole } from '@/lib/user-identity';

export async function POST(req: NextRequest) {
  try {
    // Get wallet from request cookies or custom header
    const walletFromCookie = req.cookies.get('walletAddress')?.value || req.cookies.get('wallet')?.value;
    const walletFromHeader = req.headers.get('X-Wallet-Address');
    const walletAddress = walletFromCookie || walletFromHeader;
    
    console.log(`Project update attempt - Cookie wallet: ${walletFromCookie || 'none'}, Header wallet: ${walletFromHeader || 'none'}`);
    
    if (!walletAddress) {
      console.error('Project update failed: No wallet address in cookies or headers');
      return NextResponse.json({ error: 'No wallet connected' }, { status: 401 });
    }
    
    // Check if user has admin, core or scout role
    const roleCheck = await checkUserRole(walletAddress, ['admin', 'core', 'scout']);
    console.log(`Project update role check for ${walletAddress}: `, roleCheck);
    
    if (!roleCheck.hasAccess) {
      console.error(`Project update failed: User with wallet ${walletAddress} is not authorized. Role: ${roleCheck.role || 'none'}`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Get data from request body
    const data = await req.json();
    
    // Log received data for debugging
    console.log('Update project data received:', JSON.stringify(data));
    
    if (!data.id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Get the existing project to verify access
    const existingProject = await getProjectById(data.id);
    
    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    // If not admin, check if user is the creator or assigned to the project
    if (roleCheck.role !== 'admin') {
      const isCreator = existingProject.createdBy === walletAddress;
      const isAssigned = existingProject.assignedTo === walletAddress;
      
      if (!isCreator && !isAssigned) {
        return NextResponse.json({ 
          error: 'You are not authorized to update this project' 
        }, { status: 403 });
      }
    }
    
    // Update fields that are allowed to be changed
    const updates: Record<string, any> = {};
    
    // Validate and sanitize follower count
    if (data.followerCount !== undefined) {
      updates.followerCount = Number(data.followerCount) || 0;
    }
    
    // Validate badge type
    if (data.badgeType && ['none', 'blue', 'gold'].includes(data.badgeType)) {
      updates.badgeType = data.badgeType;
    }
    
    // Profile image URL
    if (data.profileImageUrl !== undefined) {
      updates.profileImageUrl = data.profileImageUrl;
    }
    
    // Notes
    if (data.notes !== undefined) {
      updates.notes = data.notes;
    }
    
    // Website
    if (data.website !== undefined) {
      // Format website URL if needed - ensure it starts with https:// if not already
      let websiteUrl = data.website || '';
      if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
        websiteUrl = `https://${websiteUrl}`;
        console.log(`Formatted website URL: ${websiteUrl}`);
      }
      updates.website = websiteUrl;
    }
    
    // Validate and sanitize socialLinks
    if (data.socialLinks && typeof data.socialLinks === 'object') {
      const sanitizedSocialLinks: Record<string, string> = {};
      
      // Ensure it's a proper object and all values are strings
      Object.entries(data.socialLinks).forEach(([platform, username]) => {
        if (typeof username === 'string') {
          sanitizedSocialLinks[platform] = username;
        }
      });
      
      updates.socialLinks = sanitizedSocialLinks;
    }
    
    // Only admin/core can change priority, stage and assignment
    if (['admin', 'core'].includes(roleCheck.role)) {
      // Validate priority
      if (data.priority && ['low', 'medium', 'high'].includes(data.priority)) {
        updates.priority = data.priority;
      }
      
      // Validate stage
      if (data.stage) {
        const validStages = ['dmd', 'replied', 'no-reply', 'meeting', 'no-budget', 'high-budget', 'completed', 'rejected'];
        if (validStages.includes(data.stage)) {
          updates.stage = data.stage;
        }
      }
      
      // Assignment
      if (data.assignedTo !== undefined) {
        updates.assignedTo = data.assignedTo;
      }
    }
    
    // Twitter handle can only be changed by admin
    if (roleCheck.role === 'admin' && data.twitterHandle) {
      updates.twitterHandle = data.twitterHandle;
    }
    
    // Update the project
    try {
      const updatedProject = await updateProject(data.id, updates, walletAddress);
      
      if (!updatedProject) {
        return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, project: updatedProject });
    } catch (updateError) {
      console.error('Error in updateProject:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update project',
        details: updateError instanceof Error ? updateError.message : 'Unknown error' 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing project update:', error);
    return NextResponse.json({ 
      error: 'Failed to process project update',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 