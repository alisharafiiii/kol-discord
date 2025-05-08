import './globals.css'
import type { Metadata } from 'next'
import WagmiProvider from '@/components/WagmiProvider'
import OnchainKitProvider from '@/components/OnchainKitProvider'
import SessionWrap from '@/components/SessionWrap'
import { Wallet } from '@coinbase/onchainkit/wallet'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'nabulines kol platform',
  description: 'retro kol connector',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionWrap>
          <WagmiProvider>
            <OnchainKitProvider>
              <Wallet appName="kol">
                {children}
              </Wallet>
            </OnchainKitProvider>
          </WagmiProvider>
        </SessionWrap>
      </body>
    </html>
  )
}
