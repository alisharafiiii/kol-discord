import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const profile = await redis.json.get(`user:${params.id}`)
  return NextResponse.json(profile)
} 