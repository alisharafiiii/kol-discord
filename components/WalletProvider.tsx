'use client'
import { base } from 'wagmi/chains'
import { MiniKitProvider } from '@coinbase/onchainkit/minikit'

export default function WalletProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MiniKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto",
          theme: "mini-app-theme",
          name: "kol",
          logo: process.env.NEXT_PUBLIC_ICON_URL,
        },
      }}
    >
      {children}
    </MiniKitProvider>
  )
} 