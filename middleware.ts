import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  
  // Only apply middleware to /admin and /collab routes
  if (!path.startsWith('/admin') && !path.startsWith('/collab')) {
    return NextResponse.next()
  }
  
  console.log('Middleware: Path accessed:', path)
  
  // WALLET CHECKS DISABLED - Authentication is handled by Twitter sessions in each route
  // Just pass through all requests
  return NextResponse.next()
}

// Configure paths that the middleware should run on
export const config = {
  matcher: ['/admin/:path*', '/collab/:path*', '/admin', '/collab']
} 