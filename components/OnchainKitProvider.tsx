'use client'
import { Wallet } from '@coinbase/onchainkit/wallet'

export default function OnchainKitProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return <Wallet appName="kol">{children}</Wallet>
} 