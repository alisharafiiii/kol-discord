'use client'

import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center bg-black font-mono text-green-300">
      <Header />
      {/* single clickable logo */}
      <Image
        id="logo"
        src="/logo.png"
        alt="nabulines logo"
        width={120}
        height={120}
        className="mt-10 cursor-pointer select-none"
        style={{ imageRendering: 'pixelated' }}
        onClick={() => (globalThis as any).openLogin?.()}
      />
      <h1 className="mt-3 text-xs uppercase tracking-widest">
        nabulines – kol connector
      </h1>
      {/* About Section */}
      <section className="mt-8 max-w-2xl text-center px-4 space-y-4">
        <h2 className="text-sm uppercase border-b border-green-300 pb-2">About Nabulines</h2>
        <p className="text-xs">
          Nabulines is a retro cyberpunk Key Opinion Leader (KOL) connector designed to bridge the gap between influencers and blockchain campaigns.
          Discover your favorite KOLs, explore their stats, and collaborate seamlessly on-chain.
        </p>
      </section>
      {/* Action Buttons */}
      <div className="mt-auto mb-12 flex gap-8">
        <Link href="/about">
          <button className="px-6 py-3 text-sm border border-green-300 rounded hover:bg-green-800">
            About
          </button>
        </Link>
        <Link href="/terms">
          <button className="px-6 py-3 text-sm border border-green-300 rounded hover:bg-green-800">
            Terms & Conditions
          </button>
        </Link>
      </div>
      <LoginModal />
    </main>
  )
}
