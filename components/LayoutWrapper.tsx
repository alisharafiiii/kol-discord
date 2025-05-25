'use client'

import NavigationHeader from './NavigationHeader'
import { usePathname } from 'next/navigation'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLandingPage = pathname === '/'
  
  return (
    <>
      <NavigationHeader />
      <div className={isLandingPage ? '' : 'pt-12 sm:pt-14'}>
        {children}
      </div>
    </>
  )
} 