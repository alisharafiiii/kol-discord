import type { NextApiRequest, NextApiResponse } from 'next'
import { getProfile, getAllProfileKeys } from '@/lib/redis'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get all profile keys
    const keys = await getAllProfileKeys()
    
    // Fetch all profiles
    const profilePromises = keys.map(key => getProfile(key))
    const profiles = await Promise.all(profilePromises)
    
    // Filter out any null values from failed fetches
    const validProfiles = profiles.filter(profile => profile !== null)
    
    // Calculate follower counts
    const usersWithStats = validProfiles.map(profile => {
      // Calculate total followers across all social platforms
      let totalFollowers = 0
      
      if (profile.socialProfiles) {
        Object.values(profile.socialProfiles).forEach((platform: any) => {
          if (platform.followers && !isNaN(parseInt(platform.followers))) {
            totalFollowers += parseInt(platform.followers)
          }
        })
      }
      
      return {
        ...profile,
        totalFollowers,
        // Add any other calculated fields here
      }
    })
    
    return res.status(200).json({ users: usersWithStats })
  } catch (error) {
    console.error('Error fetching users:', error)
    return res.status(500).json({ error: 'Failed to fetch users' })
  }
} 