import { NextApiRequest, NextApiResponse } from 'next'
import { getProfileById, redis } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all user keys from Redis
    const keys = await redis.keys('user:*')
    
    // Load all profiles
    const users = await Promise.all(
      keys.map(key => getProfileById(key.replace('user:', '')))
    )
    
    // Filter out null values and return
    return res.status(200).json({ users: users.filter(Boolean) })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
} 