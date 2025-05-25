import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Only apply middleware to /admin and /collab routes
  if (!path.startsWith('/admin') && !path.startsWith('/collab')) {
    return NextResponse.next()
  }
  
  console.log('Middleware checking wallet for path:', path)
  
  // Get wallet address from cookie
  const walletCookie = request.cookies.get('walletAddress')
  
  // If no wallet cookie yet (first visit before connecting), just continue so client can connect wallet / log in
  if (!walletCookie || !walletCookie.value) {
    console.log('No wallet cookie – allowing request so client can connect wallet')
    return NextResponse.next()
  }
  
  console.log(`Wallet cookie found: ${walletCookie.value.substring(0, 10)}...`)
  
  // For now we trust client side role-gating; middleware just passes through
  return NextResponse.next()
}

// Configure paths that the middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/collab/:path*', '/admin', '/collab']
} 