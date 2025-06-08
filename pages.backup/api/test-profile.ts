import type { NextApiRequest, NextApiResponse } from 'next'
import { InfluencerProfile } from '@/lib/redis'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<InfluencerProfile>
) {
  const sample: InfluencerProfile = {
    id: 'test',
    name: 'ali sharafi',
    followerCount: 1000,
    location: 'Canada',
    chains: ['base', 'solana'],
    approvalStatus: 'pending',
    role: 'user',
    createdAt: new Date().toISOString(),
  }
  res.status(200).json(sample)
} 