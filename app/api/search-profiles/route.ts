import { NextResponse } from 'next/server'
import { searchProfiles } from '@/lib/redis'
 
export async function GET() {
  const results = await searchProfiles({})
  return NextResponse.json(results)
} 