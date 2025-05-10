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
        
        // Use the twitter handle from socialAccounts if available
        let handleFromSocial = ''
        if (profile.socialAccounts && profile.socialAccounts.twitter && 
            typeof profile.socialAccounts.twitter === 'object' && 
            'handle' in profile.socialAccounts.twitter) {
          handleFromSocial = profile.socialAccounts.twitter.handle || ''
          // Also update followers from Twitter if available
          if ('followers' in profile.socialAccounts.twitter && 
              typeof profile.socialAccounts.twitter.followers === 'number') {
            totalFollowers = profile.socialAccounts.twitter.followers
          }
        }
        
        // Handle other social accounts for total follower count
        if (profile.socialAccounts) {
          Object.entries(profile.socialAccounts).forEach(([platform, account]) => {
            if (platform !== 'twitter' && account && typeof account === 'object') {
              if ('followers' in account && typeof account.followers === 'number') {
                totalFollowers += account.followers
              }
              if ('subscribers' in account && typeof account.subscribers === 'number') {
                totalFollowers += account.subscribers
              }
            }
          })
        }
        
        // Create a normalized user object with consistent properties
        return {
          ...profile,
          // Use consistent ID scheme
          id: profile.id || userId,
          // Use the Twitter handle from profile or social accounts, ensuring it has @ prefix
          handle: profile.twitterHandle || 
                 (handleFromSocial ? `@${handleFromSocial.replace(/^@/, '')}` : null),
          // Keep both totalFollowers for UI and followerCount for original data
          totalFollowers,
          followerCount: profile.followerCount || totalFollowers
        }
      })
    )
    
    // Filter out any null entries and duplicates by ID
    const uniqueIdMap = new Map()
    users.filter(Boolean).forEach(user => {
      if (user && user.id) {
        // If we already have this ID, keep the most complete record
        if (uniqueIdMap.has(user.id)) {
          const existing = uniqueIdMap.get(user.id)
          // Prefer the record with a valid handle
          if (!existing.handle && user.handle) {
            uniqueIdMap.set(user.id, user)
          } 
          // Prefer the record with more followers if both have handles
          else if (existing.handle && user.handle && 
                   user.totalFollowers > existing.totalFollowers) {
            uniqueIdMap.set(user.id, user)
          }
        } else {
          uniqueIdMap.set(user.id, user)
        }
      }
    })
    
    // Convert the map back to an array
    const validUsers = Array.from(uniqueIdMap.values())
    
    return res.status(200).json({ users: validUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
} 