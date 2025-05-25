'use client'

import { WagmiProvider as WagmiConfigProvider, createConfig, http } from 'wagmi'
import { mainnet, base, optimism, arbitrum, polygon } from 'wagmi/chains'
import { coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

// Create queryClient
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
    },
  },
})

// Check if we're on iOS
const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

// Create wagmi config with better iOS support
const config = createConfig({
  chains: [mainnet, base, optimism, arbitrum, polygon],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
  },
  connectors: [
    coinbaseWallet({
      appName: 'Nabulines',
      // Use smart wallet for iOS to avoid deep linking issues
      preference: isIOS ? 'smartWalletOnly' : 'all',
    }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
      metadata: {
        name: 'Nabulines',
        description: 'Web3 Collaboration Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://nabulines.com',
        icons: ['https://nabulines.com/icon.png']
      },
      showQrModal: true,
      qrModalOptions: {
        mobileLinks: ['phantom','coinbase','metamask','rainbow'],
      },
    } as any),
  ],
  ssr: true,
})

export default function WagmiProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiConfigProvider>
  )
} 