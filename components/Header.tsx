'use client'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'

export default function Header() {
  const { data: session } = useSession()
  const pathname = usePathname()
  
  // Don't show header on landing page
  if (pathname === '/' || !session?.user) return null
  
  return (
    <div className="absolute top-4 right-4 flex items-center gap-2">
      <img 
        src={session.user.image || '/logo.png'} 
        alt={session.user.name || 'User'} 
        className="w-8 h-8 rounded-full" 
        style={{ imageRendering: 'pixelated' }} 
      />
      <span className="text-xs">{session.user.name}</span>
    </div>
  )
} 