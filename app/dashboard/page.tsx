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
    // Check authentication status
    if (status === 'loading') return
    
    if (status === 'unauthenticated') {
      setShowLoginModal(true)
      setIsLoading(false)
    } else if (status === 'authenticated') {
      setIsLoading(false)
    }
  }, [status])

  // Show loading screen while checking auth
  if (isLoading) {
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
  if (showLoginModal && !session) {
    return (
      <div className="min-h-screen bg-black">
        <PixelLoginModal 
          onClose={() => {
            setShowLoginModal(false)
            router.push('/')
          }}
          onSuccess={() => {
            setShowLoginModal(false)
            window.location.reload()
          }}
        />
      </div>
    )
  }

  // Show dashboard if authenticated
  if (session) {
    return <PixelDashboard session={session} />
  }

  // Fallback
  return null
} 