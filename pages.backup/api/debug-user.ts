import { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { username } = req.query

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username parameter is required' })
    }

    // Normalize username to lowercase and remove @ if present
    const normalizedUsername = username.toLowerCase().replace(/^@/, '')
    
    // Check for user by username index
    const userIds = await redis.smembers(`idx:username:${normalizedUsername}`)
    
    if (!userIds || userIds.length === 0) {
      // Try a direct key lookup for user data
      const directUserKey = `user:${normalizedUsername}`
      const directUser = await redis.json.get(directUserKey)
      
      if (!directUser) {
        // Search all user records for this username
        const userKeys = await redis.keys('user:*')
        const allUsers = await Promise.all(
          userKeys.map(async (key) => {
            const userData = await redis.json.get(key)
            return { key, data: userData }
          })
        )
        
        // Find users with matching username in any field
        const matchingUsers = allUsers.filter(user => {
          if (!user.data) return false
          
          const data = user.data as any
          
          // Check various username fields
          if (data.twitterHandle && data.twitterHandle.toLowerCase().replace(/^@/, '') === normalizedUsername) return true
          if (data.handle && data.handle.toLowerCase().replace(/^@/, '') === normalizedUsername) return true
          
          // Check in social accounts
          if (data.socialAccounts && data.socialAccounts.twitter && 
              typeof data.socialAccounts.twitter === 'object' && 
              'handle' in data.socialAccounts.twitter) {
            const twitterHandle = data.socialAccounts.twitter.handle
            if (twitterHandle && twitterHandle.toLowerCase().replace(/^@/, '') === normalizedUsername) return true
          }
          
          return false
        })
        
        if (matchingUsers.length > 0) {
          // Return all matching user records
          return res.status(200).json({ 
            found: true,
            message: `Found ${matchingUsers.length} matching records`,
            users: matchingUsers
          })
        }
        
        return res.status(404).json({ error: 'User not found' })
      }
      
      return res.status(200).json({
        found: true,
        message: 'Found user by direct key lookup',
        user: directUser
      })
    }
    
    // Get user data by user IDs from index
    const users = await Promise.all(
      userIds.map(async (userId) => {
        const userData = await redis.json.get(`user:${userId}`)
        return { userId, userData }
      })
    )
    
    // Get all fields from Redis for this user
    const allKeys = await redis.keys(`*:${normalizedUsername}*`)
    const redisData: Record<string, unknown> = {}
    
    for (const key of allKeys) {
      try {
        const type = await redis.type(key)
        let value: unknown
        
        if (type === 'hash') {
          value = await redis.hgetall(key)
        } else if (type === 'string') {
          value = await redis.get(key)
        } else if (type === 'set') {
          value = await redis.smembers(key)
        } else if (type === 'list') {
          value = await redis.lrange(key, 0, -1)
        } else if (type === 'ReJSON-RL' || type === 'json') {
          value = await redis.json.get(key)
        } else {
          value = `Unsupported Redis type: ${type}`
        }
        
        redisData[key] = value
      } catch (error: any) {
        redisData[key] = `Error fetching: ${error?.message || 'Unknown error'}`
      }
    }
    
    // Return all the data we found
    return res.status(200).json({
      found: true,
      message: `Found ${users.length} users`,
      users,
      allKeys,
      redisData
    })
    
  } catch (error: any) {
    console.error('Error fetching user data:', error)
    return res.status(500).json({ error: 'Failed to fetch user data', message: error?.message })
  }
} 