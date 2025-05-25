import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);
  
  return NextResponse.json({
    userAgent,
    isMobile,
    detection: {
      mobile: 'Check window.solana and window.solana.isPhantom',
      desktop: 'Check window.phantom.solana and window.phantom.solana.isPhantom'
    },
    notes: {
      mobile: 'Phantom mobile injects window.solana when in their in-app browser',
      desktop: 'Phantom desktop extension injects window.phantom.solana',
      deepLink: 'Use https://phantom.app/ul/browse/[encoded-url] to open in Phantom app'
    }
  })
} 