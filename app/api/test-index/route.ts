import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET() {
  const byCountry  = await redis.smembers('idx:country:Canada')
  const byChain    = await redis.smembers('idx:chain:base')
  const byFollowers= await redis.zrange('idx:followers', 0, -1)
  const byStatus   = await redis.smembers('idx:status:pending')
  return NextResponse.json({ byCountry, byChain, byFollowers, byStatus })
} 