"use client";

import { type ReactNode } from "react";
import { base } from "wagmi/chains";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { createConfig, WagmiConfig, http } from 'wagmi';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';

// Create Wagmi config with Coinbase & WalletConnect connectors
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({ appName: 'kol' }),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'kol-temp', showQrModal: true }),
  ],
  transports: { [base.id]: http() },
  ssr: true,
});

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiConfig config={wagmiConfig}>
      <MiniKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={{
          appearance: {
            mode: "auto",
            theme: "mini-app-theme",
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME,
            logo: process.env.NEXT_PUBLIC_ICON_URL,
          },
        }}
      >
        {props.children}
      </MiniKitProvider>
    </WagmiConfig>
  );
}
