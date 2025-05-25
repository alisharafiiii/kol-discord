'use client'

import NavigationHeader from './NavigationHeader'

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavigationHeader />
      <div className="pt-12 sm:pt-14">
        {children}
      </div>
    </>
  )
} 