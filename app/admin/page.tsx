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
      try {
        // Wait for session to load
        if (status === 'loading') {
          return
        }
        
        // Check if user is logged in
        if (status === 'unauthenticated' || !session) {
          console.log('No session found - user not logged in')
          setError('Please log in with Twitter to access the admin panel')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        // Get Twitter handle from session
        const twitterHandle = (session as any).twitterHandle
        
        if (!twitterHandle) {
          console.log('No Twitter handle in session')
          setError('Twitter handle not found in session')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        console.log('Checking role for Twitter user:', twitterHandle)
        
        // Check user role via API
        const response = await fetch('/api/user/role')
        
        if (!response.ok) {
          throw new Error(`Role check failed with status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Role check result:', data)
        
        setUserRole(data.role)
        
        // Only allow admin role
        if (data.role === 'admin') {
          setIsAuthorized(true)
        } else {
          setError(`You don't have admin permissions. Your role: ${data.role || 'none'}`)
          setIsAuthorized(false)
        }
      } catch (err: any) {
        console.error('Authorization check failed:', err)
        setError(`Error checking authorization: ${String((err as any).message || 'Unknown error')}`)
        setIsAuthorized(false)
      } finally {
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-red-400 p-6">
        <div className="border border-red-500 p-6 max-w-md text-center">
          <h1 className="text-xl uppercase mb-4" style={{ fontFamily: 'Press Start 2P, monospace' }}>Access Denied</h1>
          <p className="mb-4 text-sm" style={{ fontFamily: 'Roboto Mono, monospace' }}>{error || "You don't have permission to access the admin panel."}</p>
          {session && (
            <p className="mb-2 text-xs" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Logged in as: @{(session as any).twitterHandle || session.user?.name}
            </p>
          )}
          {userRole && (
            <p className="mb-4 text-xs" style={{ fontFamily: 'Roboto Mono, monospace' }}>
              Your role: {userRole}
            </p>
          )}
          <p className="mb-4 text-xs" style={{ fontFamily: 'Roboto Mono, monospace' }}>
            Only users with admin role can access this page.
          </p>
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
  return <AdminPanel onClose={handleClose} />
} 