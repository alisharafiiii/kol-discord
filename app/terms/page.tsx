'use client'

import Link from 'next/link'

export default function Terms() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-bold mb-2">Terms & Conditions</h1>
          <div className="text-xs text-green-400/70">
            Last Updated: {new Date().toISOString().split('T')[0]}
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-6 text-xs leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">1. Disclaimer</h2>
            <p className="text-green-300/80">This platform provides no financial, legal, or investment advice. All actions taken are at your own risk.</p>
            <p className="text-green-300/80">We are not responsible for any losses incurred through the use of this platform.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">2. Wallet Connections</h2>
            <p className="text-green-300/80">By connecting your wallet, you acknowledge the risks involved in blockchain transactions.</p>
            <p className="text-green-300/80">We do not store private keys or have access to your funds.</p>
            <p className="text-green-300/80">You are responsible for the security of your wallet and transactions.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">3. User Content</h2>
            <p className="text-green-300/80">You retain ownership of content you submit to the platform.</p>
            <p className="text-green-300/80">By submitting content, you grant us a license to display it on the platform.</p>
            <p className="text-green-300/80">You are responsible for ensuring your content does not violate any laws or third-party rights.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">4. Privacy</h2>
            <p className="text-green-300/80">We collect minimal data necessary for platform operation.</p>
            <p className="text-green-300/80">Your wallet addresses and transaction history are publicly visible on the blockchain.</p>
            <p className="text-green-300/80">We do not sell or share your personal information with third parties.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">5. Prohibited Activities</h2>
            <p className="text-green-300/80">• Fraudulent or deceptive practices</p>
            <p className="text-green-300/80">• Harassment or abusive behavior</p>
            <p className="text-green-300/80">• Violation of any applicable laws</p>
            <p className="text-green-300/80">• Attempting to exploit or hack the platform</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">6. Limitation of Liability</h2>
            <p className="text-green-300/80">The platform is provided "as is" without warranties of any kind.</p>
            <p className="text-green-300/80">We are not liable for any damages arising from your use of the platform.</p>
            <p className="text-green-300/80">Your use of the platform is at your own risk.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">7. Modifications</h2>
            <p className="text-green-300/80">We reserve the right to modify these terms at any time.</p>
            <p className="text-green-300/80">Continued use of the platform constitutes acceptance of modified terms.</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">8. Governing Law</h2>
            <p className="text-green-300/80">These terms are governed by the laws of the jurisdiction in which you reside.</p>
            <p className="text-green-300/80">You are responsible for compliance with local laws.</p>
          </section>
          
          <div className="mt-8 p-3 border border-green-500/30 bg-green-900/5">
            <p className="text-center text-xs">
              By using this platform, you acknowledge that you have read, understood, and agree to these terms.
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <div className="mt-8 text-center">
          <Link href="/">
            <button className="px-4 py-1.5 border border-green-300 hover:bg-green-900/20 transition-colors text-xs">
              ← Back to Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
} 