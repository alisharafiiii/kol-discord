import { NextRequest, NextResponse } from 'next/server'
import { redis, InfluencerProfile } from '@/lib/redis'

export async function GET(req: NextRequest) {
  try {
    // Parse query params
    const searchParams = req.nextUrl.searchParams
    const approvedOnly = searchParams.get('approved') === 'true'

    // Fetch all user keys
    const userKeys = await redis.keys('user:*')

    // Retrieve profiles
    const users: InfluencerProfile[] = []
    for (const key of userKeys) {
      const profile = await redis.json.get(key) as InfluencerProfile | null
      if (!profile) continue
      if (approvedOnly && profile.approvalStatus !== 'approved') continue
      users.push({ ...profile, id: profile.id || key.replace('user:', '') })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
} 