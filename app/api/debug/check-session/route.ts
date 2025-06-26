import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getTwitterHandleFromSession } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    
    const twitterHandle = getTwitterHandleFromSession(session)
    
    return NextResponse.json({
      session: {
        user: session.user,
        twitterHandle: (session as any).twitterHandle,
        role: (session as any).role,
        fullSession: session
      },
      extractedHandle: twitterHandle,
      analysis: {
        userKeys: Object.keys(session.user || {}),
        sessionKeys: Object.keys(session || {}),
        userName: session.user?.name,
        userTwitterHandle: (session.user as any)?.twitterHandle,
        sessionTwitterHandle: (session as any)?.twitterHandle
      }
    })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ error: 'Failed to check session' }, { status: 500 })
  }
} 