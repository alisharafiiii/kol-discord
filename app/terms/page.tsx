'use client'

import Link from 'next/link'

export default function Terms() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            TERMS & CONDITIONS
          </h1>
          <div className="text-xs text-green-400">
            Last Updated: {new Date().toISOString().split('T')[0]}
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-8 text-sm">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">1. DISCLAIMER</h2>
            <p>This platform provides no financial, legal, or investment advice. All actions taken are at your own risk.</p>
            <p>We are not responsible for any losses incurred through the use of this platform.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">2. WALLET CONNECTIONS</h2>
            <p>By connecting your wallet, you acknowledge the risks involved in blockchain transactions.</p>
            <p>We do not store private keys or have access to your funds.</p>
            <p>You are responsible for the security of your wallet and transactions.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">3. USER CONTENT</h2>
            <p>You retain ownership of content you submit to the platform.</p>
            <p>By submitting content, you grant us a license to display it on the platform.</p>
            <p>You are responsible for ensuring your content does not violate any laws or third-party rights.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">4. PRIVACY</h2>
            <p>We collect minimal data necessary for platform operation.</p>
            <p>Your wallet addresses and transaction history are publicly visible on the blockchain.</p>
            <p>We do not sell or share your personal information with third parties.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">5. PROHIBITED ACTIVITIES</h2>
            <p>• Fraudulent or deceptive practices</p>
            <p>• Harassment or abusive behavior</p>
            <p>• Violation of any applicable laws</p>
            <p>• Attempting to exploit or hack the platform</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">6. LIMITATION OF LIABILITY</h2>
            <p>The platform is provided "as is" without warranties of any kind.</p>
            <p>We are not liable for any damages arising from your use of the platform.</p>
            <p>Your use of the platform is at your own risk.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">7. MODIFICATIONS</h2>
            <p>We reserve the right to modify these terms at any time.</p>
            <p>Continued use of the platform constitutes acceptance of modified terms.</p>
          </section>
          
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-green-400">8. GOVERNING LAW</h2>
            <p>These terms are governed by the laws of the jurisdiction in which you reside.</p>
            <p>You are responsible for compliance with local laws.</p>
          </section>
          
          <div className="mt-12 p-4 border border-green-500 bg-green-900/10">
            <p className="text-center">
              By using this platform, you acknowledge that you have read, understood, and agree to these terms.
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <div className="mt-12 text-center">
          <Link href="/">
            <button className="px-6 py-2 border border-green-300 hover:bg-green-900/20 transition-colors">
              ← Back to Home
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
} 