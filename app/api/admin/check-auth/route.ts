import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Admin wallet addresses allowed to access the admin panel
const ADMIN_WALLETS = [
  '0x37Ed24e7c7311836FD01702A882937138688c1A9',
  'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq',
  'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75',
  '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif'
]

// Admin email addresses allowed to access the admin panel
const ADMIN_EMAILS = [
  'admin@example.com',
  // Add any specific admin email addresses
]

// Simple function to check if a user session indicates admin access
export async function GET(request: NextRequest) {
  try {
    // Get the user's session
    const session = await getServerSession(authOptions)
    
    // For demo purposes, allow everyone access for now
    // In production, you would implement proper checks against your admin list
    const isAuthorized = true
    
    // Example of more restrictive check:
    // const isAuthorized = Boolean(
    //   session?.user?.email && 
    //   ADMIN_EMAILS.includes(session.user.email)
    // )
    
    return NextResponse.json({ isAuthorized })
  } catch (error) {
    console.error('Error checking admin authorization:', error)
    return NextResponse.json({ isAuthorized: false }, { status: 500 })
  }
} 