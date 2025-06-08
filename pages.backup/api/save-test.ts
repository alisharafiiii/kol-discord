import type { NextApiRequest, NextApiResponse } from 'next'
import { saveProfile, getProfileById, InfluencerProfile } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const sample: InfluencerProfile = {
    id: 'save-test',
    name: 'save check',
    followerCount: 1234,
    location: 'Canada',
    chains: ['base'],
    approvalStatus: 'pending',
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  await saveProfile(sample)
  const loaded = await getProfileById('save-test')
  res.status(200).json(loaded)
} 