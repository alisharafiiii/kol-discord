'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ModRules() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-black">
      {/* Retro grid overlay */}
      <div 
        className="fixed inset-0 opacity-[1%]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,255,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,0,0.1) 1px, transparent 1px)',
          backgroundSize: '100px 100px'
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500 rounded-full opacity-20" style={{ filter: 'blur(128px)' }} />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-400 rounded-full opacity-20" style={{ filter: 'blur(128px)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className={`text-center mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
          <h1 className="text-5xl sm:text-6xl font-bold mb-4 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500 bg-clip-text text-transparent">
            Ledger Discord
          </h1>
          <p className="text-2xl sm:text-3xl text-gray-300 font-light tracking-wide">MOD PLAYBOOK</p>
          <div className="mt-6 w-24 h-1 mx-auto bg-gradient-to-r from-green-400 to-emerald-400 rounded-full" />
        </div>

        <div className="grid gap-8 mb-16">
          {/* Do's Section */}
          <section className={`transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl transition-all duration-300" style={{ filter: 'blur(20px)' }} />
              <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ✓
                  </div>
                  <h2 className="text-3xl font-bold text-white">Do's</h2>
                </div>
                
                <div className="grid gap-3">
                  {[
                    "Match excitement about Ledger and new announcements",
                    "Drive speculation subtly and generate positive hype",
                    "Talk actively about Ledger and the bright future",
                    "Build relationships and warmly welcome newcomers",
                    "Promptly solve community issues and assist",
                    "Report or remove scams promptly",
                    "Encourage users to open tickets for private matters",
                    "Use friendly language (king, queen, champ, fam)"
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-green-900/10 transition-colors duration-200"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="text-green-400 mt-0.5">→</span>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Don'ts Section */}
          <section className={`transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-700/20 to-gray-600/20 rounded-2xl transition-all duration-300" style={{ filter: 'blur(20px)' }} />
              <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 hover:border-gray-500/40 transition-all duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center text-2xl shadow-lg">
                    ✕
                  </div>
                  <h2 className="text-3xl font-bold text-white">Don'ts</h2>
                </div>
                
                <div className="grid gap-3">
                  {[
                    "React negatively or escalate community issues",
                    "Engage in price discussions or speculation",
                    "Encourage negative sentiment toward Ledger",
                    "Discuss other projects negatively",
                    "Engage in DMs or accept friend requests",
                    "Reveal main Twitter IDs or real identity",
                    "Chat in languages other than English"
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-800/20 transition-colors duration-200"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <span className="text-gray-400 mt-0.5">→</span>
                      <span className="text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Two Column Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Behavior to Encourage */}
          <section className={`transition-all duration-700 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="h-full bg-gradient-to-br from-green-900/10 to-emerald-900/10 backdrop-blur-xl rounded-2xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">💎</span>
                <h2 className="text-2xl font-bold text-white">Behavior to Encourage</h2>
              </div>
              
              <ul className="space-y-3">
                {[
                  "Active discussions about Ledger features",
                  "Community artwork or memes",
                  "Cross-platform promotion",
                  "Speculation on announcements",
                  "Constructive feedback"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Behavior to Discourage */}
          <section className={`transition-all duration-700 delay-400 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
            <div className="h-full bg-gradient-to-br from-gray-800/10 to-gray-700/10 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/20 hover:border-gray-500/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">⚠️</span>
                <h2 className="text-2xl font-bold text-white">Behavior to Discourage</h2>
              </div>
              
              <ul className="space-y-3">
                {[
                  "Negative FUD spreading",
                  "False information",
                  "Price manipulation",
                  "Shilling other projects"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* Process Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {/* Check In/Out */}
          <div className={`transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="h-full bg-black/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg">
                🕐
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Check In/Out</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-green-400 font-semibold mb-1">Check In:</p>
                  <p className="text-gray-400">Post message & review summary</p>
                </div>
                <div>
                  <p className="text-green-400 font-semibold mb-1">Check Out:</p>
                  <p className="text-gray-400">Provide sentiment summary & key topics</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Minute Rule */}
          <div className={`transition-all duration-700 delay-600 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="h-full bg-black/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Five-Minute Rule</h3>
              <p className="text-gray-400 text-sm mb-3">Respond within 5 minutes for optimal engagement</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                </div>
                <span className="text-xs text-gray-500">5 min</span>
              </div>
            </div>
          </div>

          {/* AI Monitor */}
          <div className={`transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="h-full bg-black/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center text-2xl mb-4 shadow-lg">
                🤖
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI Sentiment Monitor</h3>
              <p className="text-gray-400 text-sm">Automated sentiment analysis for proactive community management</p>
            </div>
          </div>
        </div>

        {/* Security & Bots */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {/* Security */}
          <section className={`transition-all duration-700 delay-800 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="h-full bg-gradient-to-br from-green-900/10 to-emerald-800/10 backdrop-blur-xl rounded-2xl p-8 border border-green-600/20 hover:border-green-500/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🔐</span>
                <h2 className="text-2xl font-bold text-white">Security Best Practices</h2>
              </div>
              
              <div className="space-y-4">
                {[
                  { num: "01", text: "Password reset every two weeks" },
                  { num: "02", text: "2FA on all accounts" },
                  { num: "03", text: "Regular security training" },
                  { num: "04", text: "Separate personal accounts" }
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-2xl font-bold text-green-400/50">{item.num}</span>
                    <span className="text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Bots */}
          <section className={`transition-all duration-700 delay-900 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="h-full bg-gradient-to-br from-gray-800/10 to-gray-700/10 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/20 hover:border-gray-500/40 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🤖</span>
                <h2 className="text-2xl font-bold text-white">Server Bots</h2>
              </div>
              
              <div className="space-y-4">
                {[
                  { name: "Statbot", icon: "📊", desc: "Server analytics" },
                  { name: "Mee6", icon: "⚙️", desc: "Auto moderation" },
                  { name: "Quizcord", icon: "🎮", desc: "Weekly trivia" }
                ].map((bot, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-black/30">
                    <span className="text-2xl">{bot.icon}</span>
                    <div>
                      <p className="font-semibold text-white">{bot.name}</p>
                      <p className="text-sm text-gray-400">{bot.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Ticket Management */}
        <section className={`transition-all duration-700 delay-1000 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="bg-gradient-to-r from-green-900/10 via-gray-900/10 to-green-900/10 backdrop-blur-xl rounded-2xl p-8 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl">🎫</span>
              <h2 className="text-2xl font-bold text-white">Ticket Management</h2>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Guidelines</h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Engage actively in all tickets
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Close inactive after 48 hours
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">•</span>
                    Follow escalation path
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-3">Escalation Path</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="px-4 py-2 bg-green-500/20 rounded-lg text-green-300 font-medium">Mods</div>
                  <span className="text-green-400">→</span>
                  <div className="px-4 py-2 bg-green-500/20 rounded-lg text-green-300 font-medium">CM</div>
                  <span className="text-green-400">→</span>
                  <div className="px-4 py-2 bg-green-500/20 rounded-lg text-green-300 font-medium">Support</div>
                  <span className="text-green-400">→</span>
                  <div className="px-4 py-2 bg-green-500/20 rounded-lg text-green-300 font-medium">Product</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center mt-16">
          <Link href="/" className="inline-block">
            <button className="group relative px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl font-semibold text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105">
              <span className="relative z-10">← Back to Home</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </Link>
        </div>
      </div>
    </main>
  )
} 