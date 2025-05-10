'use client'

import Header from '@/components/Header'
import LoginModal from '@/components/LoginModal'
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState, useRef } from 'react'
import styles from './page.module.css'

export default function Home() {
  const [slogan, setSlogan] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [sloganIndex, setSloganIndex] = useState(0)
  const logoClickCount = useRef(0)
  const logoClickTimer = useRef<NodeJS.Timeout | null>(null)
  const [showMatrixRain, setShowMatrixRain] = useState(false)
  const matrixCanvasRef = useRef<HTMLCanvasElement>(null)

  const slogans = [
    'welcome to The System.',
    'access isnt given, its granted.',
    'but only to a few... real ones.'
  ]

  // Matrix rain animation
  useEffect(() => {
    if (!showMatrixRain || !matrixCanvasRef.current) return
    
    const canvas = matrixCanvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    const fontSize = 14
    const columns = Math.floor(canvas.width / fontSize)
    const drops: number[] = []
    
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.floor(Math.random() * canvas.height)
    }
    
    // Characters to be used in the animation
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789'
    
    const draw = () => {
      if (!ctx) return
      
      // Black BG with slight opacity for fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      ctx.fillStyle = '#0F0' // Green text
      ctx.font = `${fontSize}px monospace`
      
      for (let i = 0; i < drops.length; i++) {
        // Random character
        const text = chars[Math.floor(Math.random() * chars.length)]
        
        // Draw the character
        ctx.fillText(text, i * fontSize, drops[i] * fontSize)
        
        // Move the drop down
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        
        drops[i]++
      }
    }
    
    const interval = setInterval(draw, 33)
    
    return () => clearInterval(interval)
  }, [showMatrixRain])

  // Typing animation effect
  useEffect(() => {
    let timeout: NodeJS.Timeout
    const typeText = () => {
      const currentSlogan = slogans[sloganIndex]
      if (!isDeleting) {
        if (slogan.length < currentSlogan.length) {
          setSlogan(currentSlogan.slice(0, slogan.length + 1))
          timeout = setTimeout(typeText, 0.5)
        } else {
          if (sloganIndex < slogans.length - 1) {
            timeout = setTimeout(() => {
              setIsDeleting(true)
              timeout = setTimeout(typeText, 1000)
            }, 2500)
          }
        }
      } else {
        if (slogan.length > 0) {
          setSlogan(currentSlogan.slice(0, slogan.length - 1))
          timeout = setTimeout(typeText, 0.25)
        } else {
          setIsDeleting(false)
          setSloganIndex(prev => prev + 1)
          timeout = setTimeout(typeText, 250)
        }
      }
    }
    timeout = setTimeout(typeText, 500)
    return () => clearTimeout(timeout)
  }, [slogan, isDeleting, sloganIndex, slogans])

  // Triple-click handler with matrix rain
  const handleLogoClick = () => {
    logoClickCount.current += 1
    if (logoClickTimer.current) {
      clearTimeout(logoClickTimer.current)
    }
    if (logoClickCount.current === 3) {
      logoClickCount.current = 0
      
      // Show matrix rain
      setShowMatrixRain(true)
      
      // After 1.5 seconds, show login modal
      setTimeout(() => {
        // Show login modal immediately after matrix animation starts
        // Call window.openLogin (already set in LoginModal component)
        if (typeof window !== 'undefined' && typeof (window as any).openLogin === 'function') {
          (window as any).openLogin()
        }
      }, 1500)
      
      // Hide matrix rain after 2 seconds
      setTimeout(() => {
        setShowMatrixRain(false)
      }, 2000)
    } else {
      logoClickTimer.current = setTimeout(() => {
        if (logoClickCount.current === 1) {
          // Regular single click behavior
          if (typeof window !== 'undefined' && typeof (window as any).openLogin === 'function') {
            (window as any).openLogin()
          }
        }
        logoClickCount.current = 0
      }, 400)
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center bg-black font-mono text-green-300">
      <Header />
      
      {/* Matrix rain animation */}
      <div className={`${styles.matrixRain} ${showMatrixRain ? styles.active : ''}`}>
        <canvas ref={matrixCanvasRef}></canvas>
      </div>
      
      {/* Logo with shine effect */}
      <div className="relative mt-10">
        <Image
          id="logo"
          src="/logo.png"
          alt="nabulines logo"
          width={60}
          height={60}
          className={`cursor-pointer select-none ${styles.logo}`}
          style={{ imageRendering: 'pixelated' }}
          onClick={handleLogoClick}
        />
      </div>
      {/* NABULINES text with retro pixel font */}
      <h1 className={`mt-3 text-2xl uppercase tracking-widest ${styles.pixelFont}`}>NABULINES</h1>
      {/* Typing animation slogan */}
      <div className="mt-2 h-6 text-sm font-light tracking-wide">
        {slogan}
        <span className={styles.cursor}>|</span>
      </div>
      {/* Cyberpunk Manifesto */}
      <section className="mt-8 max-w-xl text-center px-4 space-y-4">
        <div className="text-xs leading-relaxed space-y-3 font-light tracking-wide">
          <p>the feeds are lies. the noise is endless.</p>
          <p>but in the dark, the real ones glow.</p>
          <p>nabulines is a covert layer of connection — tracking influence across chains.</p>
          <p>we don't seek permission. we route around it.</p>
          <p>this isn't a community. it's an alignment.</p>
          <p>the system isn't broken. it's working — just not for you.</p>
          <p>join us.</p>
          <p>broadcast your presence.</p>
          <p>or vanish into the scroll.</p>
        </div>
      </section>
      {/* After the cyberpunk manifesto section, add this new team section */}
      <section className="mt-12 mb-8">
        <Link href="/team">
          <button className="px-6 py-3 text-sm border border-green-300 rounded hover:bg-green-800">
            Our Team
          </button>
        </Link>
      </section>
      {/* Action Buttons - About button removed */}
      <div className="mt-auto mb-12">
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
