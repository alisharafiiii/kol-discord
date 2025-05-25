import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Redis } from '@upstash/redis'

// Define admin wallet addresses for server-side verification
const ADMIN_WALLETS = [
  '0x37Ed24e7c7311836FD01702A882937138688c1A9', // ETH
  'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq', // Solana 1
  'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75', // Solana 2
  '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif'  // Solana 3
]

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const cookieStore = cookies()
  const walletAddress = cookieStore.get('walletAddress')
  
  // Basic check - no wallet address
  if (!walletAddress || !walletAddress.value) {
    console.log('Admin Layout: No wallet address cookie found')
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-400 font-mono p-4">
        <div className="text-2xl tracking-widest mb-4">Admin Access Denied</div>
        <div className="text-sm max-w-md text-center mb-6">
          You must connect a wallet with admin privileges to access this page.
        </div>
        <a href="/" className="px-4 py-2 border border-red-400 hover:bg-red-900/30">
          Return to Home
        </a>
      </div>
    )
  }
  
  const wallet = walletAddress.value
  
  try {
    // Check if this is a hardcoded admin wallet
    const isHardcodedAdmin = ADMIN_WALLETS.some(admin => {
      if (admin.startsWith('0x')) {
        // Case-insensitive for ETH
        return admin.toLowerCase() === wallet.toLowerCase()
      } else {
        // Case-sensitive for Solana
        return admin === wallet
      }
    })
    
    if (isHardcodedAdmin) {
      console.log('Admin Layout: ⚠️ ADMIN BYPASS for hardcoded wallet:', wallet)
      return (
        <div className="min-h-screen bg-black">
          {children}
        </div>
      )
    }
    
    // If not hardcoded, check with Redis
    const redis = Redis.fromEnv()
    const roleValue = await redis.hget('walletRoles', wallet.startsWith('0x') ? wallet.toLowerCase() : wallet)
    const role = typeof roleValue === 'string' ? roleValue : null
    
    if (role === 'admin') {
      console.log('Admin Layout: Access granted to wallet with admin role:', wallet)
      return (
        <div className="min-h-screen bg-black">
          {children}
        </div>
      )
    }
    
    // If we get here, the user doesn't have admin access
    console.log('Admin Layout: Access denied to wallet without admin role:', wallet)
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-400 font-mono p-4">
        <div className="text-2xl tracking-widest mb-4">Admin Access Denied</div>
        <div className="text-sm max-w-md text-center mb-6">
          Your wallet does not have admin privileges.
          <div className="mt-2">
            Wallet: {wallet.substring(0, 6)}...{wallet.substring(wallet.length - 4)}
          </div>
          <div className="mt-2">
            Role: {role || 'none'}
          </div>
        </div>
        <a href="/" className="px-4 py-2 border border-red-400 hover:bg-red-900/30">
          Return to Home
        </a>
      </div>
    )
  } catch (error) {
    console.error('Admin Layout: Error checking wallet role:', error)
    
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-red-400 font-mono p-4">
        <div className="text-2xl tracking-widest mb-4">Admin Access Error</div>
        <div className="text-sm max-w-md text-center mb-6">
          An error occurred while checking your wallet permissions.
          <br />
          <span className="text-yellow-400">Error: {String((error as any).message || 'Unknown error')}</span>
        </div>
        <a href="/" className="px-4 py-2 border border-red-400 hover:bg-red-900/30">
          Return to Home
        </a>
      </div>
    )
  }
} 