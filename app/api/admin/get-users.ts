import { NextApiRequest, NextApiResponse } from 'next'
import { redis, InfluencerProfile } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all user keys from Redis
    const userKeys = await redis.keys('user:*')
    
    // Fetch all user profiles
    const users = await Promise.all(
      userKeys.map(async (key: string) => {
        const userId = key.replace('user:', '')
        const profile = await redis.json.get(key) as InfluencerProfile | null
        
        if (!profile) return null
        
        // Calculate total follower count from all social profiles
        let totalFollowers = profile.followerCount || 0
        if (profile.socialAccounts) {
          Object.values(profile.socialAccounts).forEach((account: any) => {
            if (account && 'followers' in account) {
              totalFollowers += account.followers || 0
            }
            if (account && 'subscribers' in account) {
              totalFollowers += account.subscribers || 0
            }
          })
        }
        
        return {
          ...profile,
          // Ensure ID is set correctly
          id: profile.id || userId,
          totalFollowers
        }
      })
    )
    
    // Filter out any null entries
    const validUsers = users.filter(Boolean)
    
    return res.status(200).json({ users: validUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
} 