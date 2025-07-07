'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import PixelLoginModal from '@/components/PixelLoginModal'
import PixelDashboard from '@/components/PixelDashboard'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    console.log('[Dashboard] Session status:', status)
    console.log('[Dashboard] Session data:', session)
    
    // Check authentication status
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      console.log('[Dashboard] User is unauthenticated, showing login modal')
      setShowLoginModal(true)
      setIsLoading(false)
    } else if (status === 'authenticated' && session) {
      console.log('[Dashboard] User is authenticated:', session.user?.name)
      setIsLoading(false)
    }
  }, [status, session])

  const handleLoginSuccess = () => {
    console.log('[Dashboard] Login successful, reloading session')
    setShowLoginModal(false)
    // Force page reload to get fresh session
    window.location.reload()
  }

  const handleLoginClose = () => {
    setShowLoginModal(false)
    router.push('/')
  }

  // Show loading screen while checking auth
  if (isLoading || status === 'loading') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="pixel-container">
          <div className="pixel-loader">
            <div className="pixel-block"></div>
            <div className="pixel-block"></div>
            <div className="pixel-block"></div>
          </div>
          <p className="pixel-text text-green-300 mt-4">LOADING...</p>
        </div>
      </div>
    )
  }

  // Show login modal if not authenticated
  if (showLoginModal || status === 'unauthenticated') {
    return (
      <>
        <div className="min-h-screen bg-black flex items-center justify-center p-4">
          <div className="pixel-container pixel-border p-8 max-w-md">
            <h1 className="pixel-text text-2xl text-green-300 mb-4 text-center">NABULINES DASHBOARD</h1>
            <p className="pixel-text text-sm text-gray-400 text-center">Please login to view your points</p>
          </div>
        </div>
        <PixelLoginModal onClose={handleLoginClose} onSuccess={handleLoginSuccess} />
      </>
    )
  }

  // Show dashboard if authenticated
  if (status === 'authenticated' && session) {
    return <PixelDashboard session={session} />
  }

  // Fallback
  return null
} 