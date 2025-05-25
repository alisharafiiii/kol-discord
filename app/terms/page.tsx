'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

export default function Terms() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Background matrix effect
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    const chars = '01'
    const fontSize = 10
    const columns = canvas.width / fontSize
    const drops: number[] = []
    
    for (let i = 0; i < columns; i++) {
      drops[i] = 1
    }
    
    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#0F0'
      ctx.font = fontSize + 'px monospace'
      
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)]
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      }
    }
    
    const interval = setInterval(draw, 33)
    return () => clearInterval(interval)
  }, [])

  return (
    <main className="relative min-h-screen bg-black text-green-300 font-mono overflow-hidden">
      {/* Matrix background */}
      <canvas 
        ref={canvasRef} 
        className="fixed inset-0 opacity-10 pointer-events-none"
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4 text-green-400 glitch-text">
            <span className="inline-block animate-pulse">⟨</span>
            TERMS & CONDITIONS
            <span className="inline-block animate-pulse">⟩</span>
          </h1>
          <div className="text-xs text-green-500 opacity-70">
            LAST_UPDATED: {new Date().toISOString().split('T')[0]}
          </div>
          <div className="mt-2 text-xs text-red-400 animate-pulse">
            [SYSTEM_NOTICE]: BY ACCESSING THIS NODE, YOU ACCEPT ALL TERMS
          </div>
        </div>
        
        {/* Terminal-style content */}
        <div className="space-y-8 bg-black/50 border border-green-500/30 p-6 md:p-8 rounded-lg backdrop-blur-sm">
          <div className="text-yellow-400 text-sm mb-6 font-bold">
            &gt; INITIALIZING LEGAL_PROTOCOL.exe...
          </div>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-red-500">▓</span> DISCLAIMER::NOT_ADVICE
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p className="text-gray-400">[0x01] NOT_FINANCIAL_ADVICE</p>
              <p className="text-gray-400">[0x02] NOT_LEGAL_ADVICE</p>
              <p className="text-gray-400">[0x03] NOT_LIFE_ADVICE</p>
              <p className="text-yellow-500 mt-2">&gt;&gt; DYOR || GET_REKT</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-yellow-500">◈</span> WALLET::RISK_PROTOCOL
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>CONNECTION == CONSENT</p>
              <p>KEYS.STORAGE = NULL</p>
              <p>TOKENS.CUSTODY = FALSE</p>
              <p className="text-red-400">MISCLICK ? USER.FAULT : TRUE</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-purple-500">◊</span> PROMISES::VOID
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>AIRDROP.GUARANTEED = FALSE</p>
              <p>PUMP.PROMISED = FALSE</p>
              <p>BUILD.PROBABILITY = MAYBE</p>
              <p>DISAPPEAR.CHANCE = NON_ZERO</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-cyan-500">⬡</span> BLOCKCHAIN::PUBLIC_LEDGER
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>ONCHAIN.VISIBILITY = PUBLIC</p>
              <p>ACTIVITY.DISPLAY = ENABLED</p>
              <p>PRIVACY.LEVEL = ZERO</p>
              <p className="text-yellow-500">WARNING: DONT_BE_STUPID</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-green-500">◉</span> DATA::MINIMAL_TRACKING
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>PERSONAL_INFO.COLLECT = FALSE</p>
              <p>COOKIES.CREEPY = FALSE</p>
              <p>WEB2_TRACKING = NULL</p>
              <p>ANALYTICS.TYPE = VIBES_ONLY</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-orange-500">⬢</span> JURISDICTION::USER_RESPONSIBILITY
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>IF (YOUR_REGION.CRYPTO == ILLEGAL) {`{`}</p>
              <p className="pl-4">CLOSE_TAB();</p>
              <p className="pl-4">FORGET_URL();</p>
              <p>{`}`}</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-red-500">⬣</span> BEHAVIOR::ACCEPTABLE_USE
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>SCAMS.ALLOWED = FALSE</p>
              <p>HATE.TOLERATED = FALSE</p>
              <p>SPAM.PERMITTED = FALSE</p>
              <p className="text-green-400">DEGENS.WELCOME = TRUE</p>
              <p className="text-red-400">VILLAINS.STATUS = BANNED</p>
            </div>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-lg text-green-400 font-bold flex items-center gap-2">
              <span className="text-pink-500">◈</span> RISK::EXPERIMENTAL_SOFTWARE
            </h2>
            <div className="pl-4 space-y-1 text-sm">
              <p>BUGS.EXIST = TRUE</p>
              <p>EXPLOITS.POSSIBLE = TRUE</p>
              <p>RUGS.PROBABILITY = NON_ZERO</p>
              <p className="text-yellow-500">SHIP_FAST && BREAK_THINGS</p>
              <p className="text-red-400">USE_AT_OWN_RISK = MANDATORY</p>
            </div>
          </section>
          
          <div className="mt-12 p-4 border border-green-500 bg-green-900/20 rounded">
            <h2 className="text-lg text-green-400 font-bold mb-2">TL;DR</h2>
            <p className="text-sm">BY USING THIS SYSTEM, YOU ACCEPT ALL TERMS</p>
            <p className="text-sm">DISAGREE ? THEN GTFO</p>
          </div>
          
          <div className="text-center mt-8 text-green-400 animate-pulse">
            <p className="text-lg font-bold">
              ⟨ STAY_SOVEREIGN | STAY_SPOOKY | STAY_DEGEN ⟩
            </p>
          </div>
        </div>
        
        {/* Back button */}
        <div className="mt-12 text-center">
          <Link href="/">
            <button className="px-6 py-3 border-2 border-green-500 text-green-400 hover:bg-green-500 hover:text-black transition-all duration-300 font-bold tracking-wider">
              &lt; RETURN_TO_MAINFRAME /&gt;
            </button>
          </Link>
        </div>
      </div>
      
      <style jsx>{`
        .glitch-text {
          position: relative;
          animation: glitch 2s infinite;
        }
        
        @keyframes glitch {
          0%, 90%, 100% {
            text-shadow: 
              0.05em 0 0 rgba(255, 0, 0, 0.75),
              -0.05em -0.025em 0 rgba(0, 255, 0, 0.75),
              0.025em 0.05em 0 rgba(0, 0, 255, 0.75);
          }
          85% {
            text-shadow: 
              0.05em 0 0 rgba(255, 0, 0, 0.75),
              -0.05em -0.025em 0 rgba(0, 255, 0, 0.75),
              0.025em 0.05em 0 rgba(0, 0, 255, 0.75);
            transform: translate(2px, -2px);
          }
        }
      `}</style>
    </main>
  )
} 