'use client'

import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import AdminPanel from '@/components/AdminPanel'
import Link from 'next/link'

// Admin wallet addresses to authorize access
const ADMIN_WALLETS = [
  '0x37Ed24e7c7311836FD01702A882937138688c1A9', // ETH
  'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq', // Solana 1
  'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75', // Solana 2
  '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif'  // Solana 3
]

export default function AdminPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is authorized to access the admin panel
    const checkAuthorization = async () => {
      // Wait for session to be loaded
      if (status === 'loading') return
      
      try {
        // For now, we'll use a simple check for the admin wallet
        // In a production app, you would check against a database of admin users
        
        // You can uncomment and use this API call if you have a backend auth endpoint
        // const response = await fetch('/api/admin/check-auth')
        // const data = await response.json()
        // setIsAuthorized(data.isAuthorized)
        
        // For testing, let's authorize all users 
        // (you can implement proper checks later)
        setIsAuthorized(true)
        
      } catch (error) {
        console.error('Authorization check failed:', error)
        setIsAuthorized(false)
      } finally {
        setLoading(false)
      }
    }
    
    checkAuthorization()
  }, [status, session])

  // Handle closing/exiting the admin panel
  const handleClose = () => {
    router.push('/')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black font-mono text-green-300">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-green-300 p-6">
        <div className="border border-red-500 p-6 max-w-md text-center">
          <h1 className="text-xl uppercase mb-4 text-red-400">Unauthorized</h1>
          <p className="mb-4 text-sm">You don't have permission to access the admin panel.</p>
          <Link href="/">
            <button className="px-4 py-2 border border-green-300 hover:bg-green-800">
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