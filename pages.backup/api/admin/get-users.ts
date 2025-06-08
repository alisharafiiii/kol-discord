import { NextApiRequest, NextApiResponse } from 'next'
import { redis, InfluencerProfile } from '@/lib/redis'

type SocialAccount = {
  handle: string;
  followers?: number;
  subscribers?: number;
}

type SocialAccounts = {
  twitter?: SocialAccount;
  instagram?: SocialAccount;
  tiktok?: SocialAccount;
  youtube?: SocialAccount;
  telegram?: SocialAccount;
}

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
        
        // Get Twitter handle from profile or social accounts
        const twitterHandle = profile.twitterHandle || 
                 (handleFromSocial ? `@${handleFromSocial.replace(/^@/, '')}` : null)
        
        // Create a normalized user object with consistent properties
        return {
          ...profile,
          // Use consistent ID scheme
          id: profile.id || userId,
          // Use the Twitter handle from profile or social accounts, ensuring it has @ prefix
          handle: twitterHandle,
          // Keep both totalFollowers for UI and followerCount for original data
          totalFollowers,
          followerCount: profile.followerCount || totalFollowers
        }
      })
    )
    
    // Filter out any null entries
    const validUsers = users.filter(Boolean) as any[]
    
    // Deduplicate by Twitter handle (instead of ID) to ensure each user appears only once
    const uniqueUsersMap = new Map()
    
    validUsers.forEach(user => {
      const twitterHandle = user.handle?.toLowerCase() || user.twitterHandle?.toLowerCase()
      
      // If we don't have a Twitter handle, use the ID as fallback
      const key = twitterHandle || user.id
      
      if (!key) return
      
      // If this Twitter handle is already in our map
      if (uniqueUsersMap.has(key)) {
        const existing = uniqueUsersMap.get(key)
        
        // Keep the record with more complete data
        // If new record has more followers or has handle when existing doesn't
        if ((!existing.handle && user.handle) || 
            (user.totalFollowers > (existing.totalFollowers || 0))) {
          
          // Merge the records to keep the most complete data
          const mergedUser = {
            ...existing,
            ...user,
            // Ensure we keep the higher follower count
            totalFollowers: Math.max(user.totalFollowers || 0, existing.totalFollowers || 0),
            // Keep the handle if it exists
            handle: user.handle || existing.handle,
            twitterHandle: user.twitterHandle || existing.twitterHandle
          }
          
          uniqueUsersMap.set(key, mergedUser)
        }
      } else {
        // First time seeing this Twitter handle
        uniqueUsersMap.set(key, user)
      }
    })
    
    // Convert the map back to an array
    const uniqueUsers = Array.from(uniqueUsersMap.values())
    
    return res.status(200).json({ users: uniqueUsers })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
} 