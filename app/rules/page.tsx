'use client'

import Link from 'next/link'

export default function Rules() {
  return (
    <main className="min-h-screen bg-black text-green-300 font-mono">
      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-lg font-bold mb-2">Community Rules</h1>
          <div className="text-xs text-green-400/70">
            Please follow these guidelines to maintain a positive community
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-6 text-xs leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">1. Respect & Professionalism</h2>
            <p className="text-green-300/80">• Treat all community members with respect</p>
            <p className="text-green-300/80">• No harassment, hate speech, or discriminatory behavior</p>
            <p className="text-green-300/80">• Keep discussions professional and constructive</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">2. Content Guidelines</h2>
            <p className="text-green-300/80">• Share authentic and original content</p>
            <p className="text-green-300/80">• No spam or repetitive promotional posts</p>
            <p className="text-green-300/80">• Ensure all content is relevant to campaigns</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">3. Campaign Participation</h2>
            <p className="text-green-300/80">• Follow campaign briefs and requirements</p>
            <p className="text-green-300/80">• Meet agreed deadlines and deliverables</p>
            <p className="text-green-300/80">• Maintain transparency about sponsored content</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">4. Platform Usage</h2>
            <p className="text-green-300/80">• No automated bots or fake engagement</p>
            <p className="text-green-300/80">• Don't share account credentials</p>
            <p className="text-green-300/80">• Report any bugs or security issues responsibly</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">5. Intellectual Property</h2>
            <p className="text-green-300/80">• Respect copyright and trademark laws</p>
            <p className="text-green-300/80">• Only use content you have rights to share</p>
            <p className="text-green-300/80">• Give proper attribution when required</p>
          </section>
          
          <section className="space-y-2">
            <h2 className="text-sm font-bold text-green-400">6. Violations & Enforcement</h2>
            <p className="text-green-300/80">• First violation: Warning</p>
            <p className="text-green-300/80">• Second violation: Temporary suspension</p>
            <p className="text-green-300/80">• Severe violations: Permanent ban</p>
          </section>
          
          <div className="mt-8 p-3 border border-green-500/30 bg-green-900/5">
            <p className="text-center text-xs">
              By participating in our platform, you agree to follow these community rules.
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