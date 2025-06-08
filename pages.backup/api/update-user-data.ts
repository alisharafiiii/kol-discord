import { NextApiRequest, NextApiResponse } from 'next'
import { redis, InfluencerProfile } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT requests
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, chains, followerCount, ...otherData } = req.body
    
    // Validate inputs
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }
    
    // Get the user from Redis
    const userKey = `user:${userId}`
    const user = await redis.json.get(userKey) as InfluencerProfile | null
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Update chains if provided
    if (chains && Array.isArray(chains)) {
      // Remove user from old chain indexes if they exist
      if (user.chains && Array.isArray(user.chains)) {
        await Promise.all(
          user.chains.map(chain => redis.srem(`idx:chain:${chain}`, userId))
        )
      }
      
      // Set new chains
      await redis.json.set(userKey, '$.chains', chains)
      
      // Add user to new chain indexes
      await Promise.all(
        chains.map(chain => redis.sadd(`idx:chain:${chain}`, userId))
      )
    }
    
    // Update follower count if provided
    if (followerCount !== undefined) {
      await redis.json.set(userKey, '$.followerCount', followerCount)
      
      // Update in follower index
      await redis.zadd(`idx:followers`, {
        score: followerCount,
        member: userId,
      })
    }
    
    // Update any other fields provided
    for (const [key, value] of Object.entries(otherData)) {
      if (value !== undefined) {
        await redis.json.set(userKey, `$.${key}`, value)
      }
    }
    
    const updatedUser = await redis.json.get(userKey) as InfluencerProfile | null
    
    return res.status(200).json({ 
      success: true,
      user: updatedUser
    })
  } catch (error) {
    console.error('Error updating user data:', error)
    return res.status(500).json({ error: 'Failed to update user data' })
  }
} 