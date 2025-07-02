import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { ProfileService } from '@/lib/services/profile-service'
import { checkAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Get session data
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No session found. Please sign in.' }, { status: 401 })
    }
    
    // Get Twitter handle from session
    const twitterHandle = (session as any)?.twitterHandle || session?.user?.name
    
    if (!twitterHandle) {
      return NextResponse.json({ 
        error: 'No Twitter handle found in session',
        session: JSON.parse(JSON.stringify(session))
      }, { status: 400 })
    }
    
    // Get current role from database
    const profile = await ProfileService.getProfileByHandle(twitterHandle)
    
    // Check auth for sync endpoint
    const authCheck = await checkAuth(request, ['admin', 'core', 'team'])
    
    const debugInfo = {
      session: {
        twitterHandle,
        sessionRole: (session as any)?.role,
        sessionApprovalStatus: (session as any)?.approvalStatus,
        userName: session?.user?.name,
        userRole: (session?.user as any)?.role,
        userApprovalStatus: (session?.user as any)?.approvalStatus,
      },
      database: {
        profileFound: !!profile,
        databaseRole: profile?.role || null,
        databaseApprovalStatus: profile?.approvalStatus || null,
        isKOL: profile?.isKOL || false,
      },
      authCheck: {
        authenticated: authCheck.authenticated,
        hasAccess: authCheck.hasAccess,
        checkedRole: authCheck.role,
        requiredRoles: ['admin', 'core', 'team'],
      },
      recommendation: null as string | null,
    }
    
    // Add recommendation based on findings
    if (!profile) {
      debugInfo.recommendation = 'Your profile was not found in the database. Please contact an admin to create your profile.'
    } else if (profile.role !== (session as any)?.role) {
      debugInfo.recommendation = `Your session has outdated role information. Session shows "${(session as any)?.role}" but database shows "${profile.role}". Please sign out and sign back in to refresh your session.`
    } else if (!['admin', 'core', 'team'].includes(profile.role)) {
      debugInfo.recommendation = `Your role "${profile.role}" does not have access to sync features. You need one of: admin, core, or team. Please contact an admin to update your role.`
    } else if (profile.approvalStatus !== 'approved') {
      debugInfo.recommendation = `Your account has role "${profile.role}" but approval status is "${profile.approvalStatus}". Please contact an admin for approval.`
    } else {
      debugInfo.recommendation = 'Your authentication looks correct. If sync is still failing, there may be a different issue.'
    }
    
    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Debug auth role error:', error)
    return NextResponse.json({ 
      error: 'Failed to check auth role',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 