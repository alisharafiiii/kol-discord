import { NextApiRequest, NextApiResponse } from 'next'
import { redis } from '../../../lib/redis'

interface MonthlyData {
  month: string;
  approved: number;
  pending: number;
  rejected: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get monthly stats from Redis, or generate placeholder data if not available
    const monthlyStatsKey = 'stats:monthly'
    let monthlyData = await redis.get(monthlyStatsKey) as MonthlyData[] | null
    
    if (!monthlyData) {
      // Generate placeholder data for the current year
      const currentDate = new Date()
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      
      monthlyData = Array.from({ length: currentDate.getMonth() + 1 }, (_, i) => ({
        month: monthNames[i],
        approved: 0,
        pending: 0,
        rejected: 0
      }))
      
      // Initialize with data based on user creation dates and status
      const keys = await redis.keys('user:*')
      const profiles = await Promise.all(
        keys.map(key => redis.json.get(key))
      )
      
      profiles.forEach((profile: any) => {
        if (profile && profile.createdAt) {
          const createdDate = new Date(profile.createdAt)
          // Only count if created this year
          if (createdDate.getFullYear() === currentDate.getFullYear()) {
            const monthIndex = createdDate.getMonth()
            if (monthlyData && monthIndex < monthlyData.length) {
              const status = profile.approvalStatus as 'approved' | 'pending' | 'rejected'
              if (status) {
                monthlyData[monthIndex][status] += 1
              }
            }
          }
        }
      })
    }
    
    return res.status(200).json({ monthlyData })
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }
} 