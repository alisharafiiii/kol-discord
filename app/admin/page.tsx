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
        
        // Get Twitter handle from session - check multiple possible locations
        const twitterHandle = (session as any)?.twitterHandle || 
                            (session as any)?.user?.twitterHandle ||
                            session?.user?.name ||
                            (session as any)?.user?.username;
                            
        console.log('ADMIN PAGE: Extracted Twitter handle:', twitterHandle);
        console.log('ADMIN PAGE: All possible handles:', {
          sessionTwitterHandle: (session as any)?.twitterHandle,
          userTwitterHandle: (session as any)?.user?.twitterHandle,
          userName: session?.user?.name,
          userUsername: (session as any)?.user?.username
        });
        
        if (!twitterHandle) {
          console.log('ADMIN PAGE: No Twitter handle in session')
          setError('Twitter handle not found in session')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        // HARDCODED CHECK - normalize handle and check for sharafi_eth
        const normalizedHandle = twitterHandle.toLowerCase().replace('@', '');
        console.log('ADMIN PAGE: Normalized handle:', normalizedHandle);
        
        if (normalizedHandle === 'sharafi_eth') {
          console.log('ADMIN PAGE: HARDCODED BYPASS - sharafi_eth detected - granting immediate access');
          setIsAuthorized(true);
          setUserRole('admin');
          setLoading(false);
          return;
        }
        
        console.log('ADMIN PAGE: Not sharafi_eth, checking role via API for:', twitterHandle)
        
        // Check user role via API (only for non-sharafi_eth users)
        try {
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
        } catch (apiError) {
          console.error('ADMIN PAGE: API call failed:', apiError);
          // If API fails but user is sharafi_eth (double check), still grant access
          if (normalizedHandle === 'sharafi_eth') {
            console.log('ADMIN PAGE: API failed but sharafi_eth detected - granting access anyway');
            setIsAuthorized(true);
            setUserRole('admin');
          } else {
            setError('Unable to verify permissions - API error');
            setIsAuthorized(false);
          }
        }
      } catch (err: any) {
        console.error('ADMIN PAGE: Authorization check failed:', err)
        
        // Last resort - check if session has sharafi_eth anywhere
        const sessionStr = JSON.stringify(session);
        if (sessionStr && sessionStr.toLowerCase().includes('sharafi_eth')) {
          console.log('ADMIN PAGE: Error occurred but sharafi_eth found in session - granting access');
          setIsAuthorized(true);
          setUserRole('admin');
        } else {
          setError(`Error checking authorization: ${String((err as any).message || 'Unknown error')}`)
          setIsAuthorized(false)
        }
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
    const twitterHandle = (session as any)?.twitterHandle || 
                         (session as any)?.user?.twitterHandle ||
                         session?.user?.name ||
                         (session as any)?.user?.username;
                         
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
              <p>Session Data: {JSON.stringify(session, null, 2).substring(0, 200)}...</p>
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