import { NextApiRequest, NextApiResponse } from 'next'
import { getProfileById, saveProfile } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId, adminName } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }
    
    // Get the profile
    const profile = await getProfileById(userId)
    
    if (!profile) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Update approval status
    profile.approvalStatus = 'approved'
    profile.updatedAt = new Date().toISOString()
    profile.updatedBy = adminName || 'Unknown Admin'
    profile.approvedBy = adminName || 'Unknown Admin'
    
    // Save the updated profile
    await saveProfile(profile)
    
    return res.status(200).json({ success: true, profile })
  } catch (error) {
    console.error('Error approving user:', error)
    return res.status(500).json({ error: 'Failed to approve user' })
  }
} 