import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { findUserByUsername } from '@/lib/user-identity';
import { getAllCampaigns } from '@/lib/campaign';

export async function GET() {
  try {
    // Get session
    const session: any = await getServerSession(authOptions as any);
    
    if (!session) {
      return NextResponse.json({
        error: 'No session found',
        authenticated: false
      });
    }
    
    const twitterHandle = session.twitterHandle || session.user?.name;
    
    // Get user profile
    const user = twitterHandle ? await findUserByUsername(twitterHandle.replace('@', '')) : null;
    
    // Get campaigns
    let campaigns: any[] = [];
    let campaignError = null;
    try {
      campaigns = await getAllCampaigns();
    } catch (error) {
      campaignError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Check team membership
    const isTeamMember = campaigns.some((campaign: any) => 
      campaign.teamMembers.includes(twitterHandle) || 
      campaign.createdBy === twitterHandle
    );
    
    return NextResponse.json({
      authenticated: true,
      session: {
        twitterHandle,
        userName: session.user?.name
      },
      userProfile: user ? {
        id: user.id,
        role: user.role,
        approvalStatus: user.approvalStatus,
        twitterHandle: user.twitterHandle
      } : null,
      access: {
        isAdmin: user?.role === 'admin',
        isApproved: user?.approvalStatus === 'approved',
        isTeamMember,
        shouldHaveAccess: user?.role === 'admin' || user?.approvalStatus === 'approved' || isTeamMember
      },
      campaigns: {
        count: campaigns.length,
        error: campaignError
      }
    });
  } catch (error) {
    console.error('Debug campaigns access error:', error);
    return NextResponse.json({
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 