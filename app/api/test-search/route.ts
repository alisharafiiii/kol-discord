import { NextResponse } from 'next/server'
import { searchProfiles } from '@/lib/redis'

export async function GET() {
  // test filtering for our sample
  const results = await searchProfiles({
    country: 'Canada',
    minFollowers: 500,
    chains: ['base'],
    approvalStatus: 'pending',
  })
  return NextResponse.json(results)
} 