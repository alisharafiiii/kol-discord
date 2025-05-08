'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig, http } from 'wagmi'
import { base } from 'viem/chains'
import { coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { MiniKitProvider } from '@coinbase/onchainkit/minikit'

const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: 'kol' }),
    walletConnect({ projectId: 'kol-temp', showQrModal: true }),
  ],
  transports: { [base.id]: http() },
  ssr: true,
})

const queryClient = new QueryClient()

export default function AppProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </WagmiConfig>
  )
} 