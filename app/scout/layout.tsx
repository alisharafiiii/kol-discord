'use client'

import { useEffect } from 'react'

export default function ScoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  useEffect(() => {
    // iOS Chrome compatibility
    if (typeof window !== 'undefined') {
      // Ensure page is properly loaded on iOS
      const style = document.documentElement.style as any
      style.webkitTouchCallout = 'none'
      style.webkitUserSelect = 'none'
    }
  }, [])

  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  )
} 