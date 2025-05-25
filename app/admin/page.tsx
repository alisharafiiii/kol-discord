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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is authorized to access the admin panel
    const checkAuthorization = async () => {
      try {
        // Get wallet from localStorage
        const walletAddress = localStorage.getItem('walletAddress')
        
        if (!walletAddress) {
          console.log('No wallet address found - redirecting from admin page')
          setIsAuthorized(false)
          setLoading(false)
          return
        }
        
        // Check if wallet is in admin list
        const isHardcodedAdmin = ADMIN_WALLETS.some(admin => {
          if (admin.startsWith('0x')) {
            // Case-insensitive comparison for ETH addresses
            return admin.toLowerCase() === walletAddress.toLowerCase()
          } else {
            // Case-sensitive comparison for Solana addresses
            return admin === walletAddress
          }
        })
        
        if (isHardcodedAdmin) {
          console.log('Admin access granted for hardcoded wallet:', walletAddress)
          setIsAuthorized(true)
          setLoading(false)
          return
        }
        
        // If not hardcoded, check with the API
        const response = await fetch(`/api/admin/check-role?wallet=${walletAddress}`)
        
        if (!response.ok) {
          throw new Error(`Role check failed with status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Role check result:', data)
        
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
  }, [router])

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-black font-mono text-red-400 p-6">
        <div className="border border-red-500 p-6 max-w-md text-center">
          <h1 className="text-xl uppercase mb-4" style={{ fontFamily: 'Press Start 2P, monospace' }}>Access Denied</h1>
          <p className="mb-4 text-sm" style={{ fontFamily: 'Roboto Mono, monospace' }}>{error || "You don't have permission to access the admin panel."}</p>
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