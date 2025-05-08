'use client'
import { createConfig, WagmiConfig, http } from 'wagmi'
import { base } from 'viem/chains'
import { coinbaseWallet, walletConnect } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Static connectors list
const qc = new QueryClient()

const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: 'kol' }),
    walletConnect({ projectId: 'kol-temp', showQrModal: true }),
  ],
  transports: { [base.id]: http() },
  ssr: true,
})

export default function WagmiProviderWrap({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WagmiConfig config={config}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </WagmiConfig>
  )
} 