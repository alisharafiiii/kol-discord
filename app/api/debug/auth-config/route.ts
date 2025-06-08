import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'Auth Configuration Check',
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ? '✓ Set' : '✗ Missing',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? '✓ Set' : '✗ Missing',
      TWITTER_CLIENT_ID: process.env.TWITTER_CLIENT_ID ? '✓ Set' : '✗ Missing',
      TWITTER_CLIENT_SECRET: process.env.TWITTER_CLIENT_SECRET ? '✓ Set' : '✗ Missing',
      REDIS_URL: process.env.REDIS_URL ? '✓ Set' : '✗ Missing',
      NODE_ENV: process.env.NODE_ENV || 'not set',
    },
    urls: {
      configured: process.env.NEXTAUTH_URL || 'NOT SET',
      expected_callback: process.env.NEXTAUTH_URL ? `${process.env.NEXTAUTH_URL}/api/auth/callback/twitter` : 'NEXTAUTH_URL not set'
    },
    timestamp: new Date().toISOString()
  });
} 