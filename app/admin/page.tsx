'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminPanel from '@/components/AdminPanel'
import Link from 'next/link'

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authorized to access the admin panel
    const checkAuthorization = async () => {
      console.log('=== ADMIN PAGE: Starting authorization check ===');
      console.log('Session status:', status);
      console.log('Session data:', JSON.stringify(session, null, 2));
      
      try {
        // Wait for session to load
        if (status === 'loading') {
          console.log('ADMIN PAGE: Session still loading, waiting...');
          return
        }
        
        // Check if user is logged in
        if (status === 'unauthenticated' || !session) {
          console.log('ADMIN PAGE: No session found - user not logged in')
          setError('Please log in with Twitter to access the admin panel')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        // Get Twitter handle from session
        const twitterHandle = (session as any).twitterHandle || session?.user?.name
        console.log('ADMIN PAGE: Twitter handle from session:', twitterHandle);
        
        if (!twitterHandle) {
          console.log('ADMIN PAGE: No Twitter handle in session')
          setError('Twitter handle not found in session')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        // Check for hardcoded admin
        if (twitterHandle === 'sharafi_eth') {
          console.log('ADMIN PAGE: Master admin sharafi_eth detected - granting immediate access');
          setIsAuthorized(true);
          setUserRole('admin');
          setLoading(false);
          return;
        }
        
        console.log('ADMIN PAGE: Checking role for Twitter user:', twitterHandle)
        
        // Check user role via API
        const response = await fetch('/api/user/role')
        console.log('ADMIN PAGE: Role API response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('ADMIN PAGE: Role API error response:', errorText);
          throw new Error(`Role check failed with status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('ADMIN PAGE: Role check result:', JSON.stringify(data, null, 2))
        
        setUserRole(data.role)
        
        // Check session role first
        const sessionRole = (session as any)?.user?.role || (session as any)?.role;
        console.log('ADMIN PAGE: Session role:', sessionRole);
        console.log('ADMIN PAGE: API role:', data.role);
        
        // Only allow admin role
        if (data.role === 'admin' || sessionRole === 'admin') {
          console.log('ADMIN PAGE: User has admin role - granting access');
          setIsAuthorized(true)
        } else {
          console.log('ADMIN PAGE: User does NOT have admin role - denying access');
          setError(`You don't have admin permissions. Your role: ${data.role || 'none'}`)
          setIsAuthorized(false)
        }
      } catch (err: any) {
        console.error('ADMIN PAGE: Authorization check failed:', err)
        setError(`Error checking authorization: ${String((err as any).message || 'Unknown error')}`)
        setIsAuthorized(false)
      } finally {
        console.log('ADMIN PAGE: Authorization check complete. Authorized:', isAuthorized);
        setLoading(false)
      }
    }
    
    checkAuthorization()
  }, [session, status, router])

  // Handle closing/exiting the admin panel
  const handleClose = () => {
    router.push('/')
  }

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-mono text-green-300">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    const twitterHandle = (session as any)?.twitterHandle || session?.user?.name;
    console.log('ADMIN PAGE: Rendering access denied. Handle:', twitterHandle, 'Role:', userRole);
    
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-red-400 p-6">
        <div className="border border-red-500 p-6 max-w-md text-center">
          <h1 className="text-xl uppercase mb-4" style={{ fontFamily: 'Press Start 2P, monospace' }}>Admin Access Denied</h1>
          <p className="mb-4 text-sm" style={{ fontFamily: 'Roboto Mono, monospace' }}>{error || "Your Twitter account does not have admin privileges."}</p>
          {session && (
            <div className="mb-4 text-xs" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              <p>Twitter: @{twitterHandle}</p>
              <p>Role: {userRole || 'none'}</p>
            </div>
          )}
          <Link href="/">
            <button className="px-4 py-2 border border-red-400 hover:bg-red-900/30">
              Return to Home
            </button>
          </Link>
        </div>
      </div>
    )
  }

  // If authorized, render the admin panel
  console.log('ADMIN PAGE: Rendering admin panel for authorized user');
  return <AdminPanel onClose={handleClose} />
} 