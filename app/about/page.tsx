import Link from 'next/link'

export default function AboutPage() {
  return (
    <main className="flex flex-col min-h-screen items-center bg-black font-mono text-green-300 p-8">
      <h1 className="text-2xl uppercase mb-4 border-b border-green-300 pb-2">About Nabulines</h1>
      <div className="max-w-2xl space-y-4 text-xs">
        <p>
          Nabulines is a retro cyberpunk Key Opinion Leader (KOL) connector application. Our platform bridges the gap between
          influencers and blockchain campaigns. With Nabulines, brands can discover trusted voices, view real-time stats, and
          collaborate on-chain seamlessly.
        </p>
        <p>
          Built with a matrix-inspired UI, green-on-black aesthetics, and pixelated fonts, Nabulines immerses you in the nostalgia
          of classic cyberpunk while leveraging the power of modern blockchain technology.
        </p>
        <p>
          Whether you're an NFT collector, DeFi user, or crypto trader, Nabulines helps you connect with the most influential
          opinion leaders in your space.
        </p>
      </div>
      <Link href="/">
        <button className="mt-8 px-6 py-2 text-sm border border-green-300 rounded hover:bg-green-800">
          Back to Home
        </button>
      </Link>
    </main>
  )
} 