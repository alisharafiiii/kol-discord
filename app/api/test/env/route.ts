import { NextResponse } from 'next/server';

export async function GET() {
  // Direct environment variable check
  const env = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '[HIDDEN]' : undefined,
    TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? '[HIDDEN]' : undefined,
    REDIS_URL: process.env.REDIS_URL ? '[HIDDEN]' : undefined,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Count how many are set
  const setCount = Object.entries(env).filter(([key, value]) => value !== undefined && key !== 'NODE_ENV').length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    configured: setCount,
    total: 5,
    details: env,
    vercelUrl: process.env.VERCEL_URL,
    isVercel: !!process.env.VERCEL,
  });
} 