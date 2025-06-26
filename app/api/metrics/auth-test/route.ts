import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Return detailed session information
    return NextResponse.json({
      authenticated: !!session,
      session: session ? {
        email: session.user?.email,
        name: session.user?.name,
        role: session.user?.role,
        id: session.user?.id,
        image: session.user?.image
      } : null,
      permissions: {
        canViewMetrics: session ? ['admin', 'core', 'hunter', 'kol', 'brand_mod', 'brand_hunter'].includes(session.user?.role || '') : false,
        canEditMetrics: session ? (session.user?.role === 'admin' || session.user?.role === 'core') : false,
        userRole: session?.user?.role || 'not authenticated'
      }
    })
  } catch (error) {
    console.error('Error checking auth:', error)
    return NextResponse.json({ 
      error: 'Failed to check authentication',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 