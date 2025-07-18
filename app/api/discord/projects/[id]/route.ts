import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { DiscordService } from '@/lib/services/discord-service'
import { redis } from '@/lib/redis'
import { hasAdminAccess, logAdminAccess } from '@/lib/admin-config'

async function checkUserAccess(session: any): Promise<{ hasAccess: boolean; userRole?: string }> {
  if (!session?.user) {
    return { hasAccess: false }
  }

  // Get user's current role from database
  let userRole = session?.role || session.user?.role
  
  // If no role in session or want to ensure latest role, fetch from Redis
  const twitterHandle = session?.twitterHandle || session?.user?.twitterHandle || session?.user?.name
  const normalizedHandle = twitterHandle?.toLowerCase().replace('@', '')
  
  console.log('[Discord Project] Checking access for:', {
    handle: normalizedHandle,
    sessionRole: userRole
  })
  
  // Check for master admins first
  if (hasAdminAccess(normalizedHandle, null)) {
    console.log('[Discord Project] Access granted: Master admin -', normalizedHandle)
    logAdminAccess(normalizedHandle, 'discord_project_access', { 
      method: 'master_admin',
      api: 'discord_project'
    })
    return { hasAccess: true, userRole: 'admin' }
  }
  
  // Try to get latest role from database
  if (normalizedHandle) {
    try {
      const userIds = await redis.smembers(`idx:username:${normalizedHandle}`)
      
      if (userIds && userIds.length > 0) {
        const userData = await redis.json.get(`user:${userIds[0]}`) as any
        if (userData?.role) {
          userRole = userData.role
          console.log('[Discord Project] Role from database:', userRole)
        }
      }
    } catch (error) {
      console.error('[Discord Project] Error fetching user role:', error)
    }
  }
  
  // Check if user has valid role
  const allowedRoles = ['admin', 'core', 'viewer', 'team']
  const hasAccess = allowedRoles.includes(userRole)
  
  console.log('[Discord Project] Final role check:', {
    userRole,
    allowedRoles,
    hasAccess
  })
  
  return { hasAccess, userRole }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Discord Project API: Request for project:', params.id)
    
    // Check if this is a public access request
    const { searchParams } = new URL(request.url)
    const isPublicRequest = searchParams.get('public') === 'true'
    
    // Handle URL-encoded colons in project ID
    const projectId = decodeURIComponent(params.id).replace(/--/g, ':')
    console.log('Discord Project API: Looking for project:', projectId)
    console.log('Discord Project API: Is public request:', isPublicRequest)
    
    // For public requests, check if the project ID matches the public share pattern
    if (isPublicRequest && projectId.startsWith('project:discord:')) {
      console.log('Discord Project API: Public share link detected, allowing public access')
      
      const project = await DiscordService.getProject(projectId)
      if (!project) {
        console.log('Discord Project API: Project not found')
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
      
      // Return limited project data for public access
      console.log('Discord Project API: Returning public project data:', project.name)
      return NextResponse.json({
        id: project.id,
        name: project.name,
        serverId: project.serverId,
        serverName: project.serverName,
        iconUrl: project.iconUrl,
        // Don't include sensitive data like webhook URLs
      })
    }
    
    // For non-public requests, require authentication
    const session = await getServerSession(authOptions)
    console.log('Discord Project API: Session exists:', !!session)
    console.log('Discord Project API: Session user:', session?.user?.name)
    
    const { hasAccess, userRole } = await checkUserAccess(session)
    console.log('Discord Project API: Access check result:', { hasAccess, userRole })
    
    if (!hasAccess) {
      return NextResponse.json({ 
        error: 'Forbidden - role not authorized',
        userRole,
        requiredRoles: ['admin', 'core', 'viewer']
      }, { status: 403 })
    }
    
    const project = await DiscordService.getProject(projectId)
    if (!project) {
      console.log('Discord Project API: Project not found')
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    console.log('Discord Project API: Project found:', project.name)
    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching Discord project:', error)
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { hasAccess } = await checkUserAccess(session)
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - role not authorized' }, { status: 403 })
    }

    const data = await request.json()
    await DiscordService.updateProject(params.id, data)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating Discord project:', error)
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    const { hasAccess } = await checkUserAccess(session)
    
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden - role not authorized' }, { status: 403 })
    }

    await DiscordService.deleteProject(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Discord project:', error)
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
} 