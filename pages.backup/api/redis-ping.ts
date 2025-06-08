console.log('UPSTASH URL:', process.env.UPSTASH_REDIS_REST_URL)

import type { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '../../lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const pong = await redis.ping()
    res.status(200).json({ pong })
  } catch (err: any) {
    res.status(500).json({ error: 'redis ping failed: ' + err.message })
  }
} 