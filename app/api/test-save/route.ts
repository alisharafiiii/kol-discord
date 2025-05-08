import { NextResponse } from 'next/server'
import { saveProfile, getProfileById, InfluencerProfile } from '@/lib/redis'

export async function GET() {
  const sample = {
    id: 'save-test',
    name: 'save check',
    followerCount: 1234,
    country: 'Canada',
    chains: ['base'],
    approvalStatus: 'pending',
    role: 'user',
    createdAt: new Date().toISOString(),
  } as InfluencerProfile

  await saveProfile(sample)
  const loaded = await getProfileById('save-test')
  return NextResponse.json(loaded)
} 