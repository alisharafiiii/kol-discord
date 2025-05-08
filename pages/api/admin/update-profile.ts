import { NextApiRequest, NextApiResponse } from 'next'
import { saveProfile, InfluencerProfile } from '../../../lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { profile } = req.body
    
    if (!profile || !profile.id) {
      return res.status(400).json({ error: 'Valid profile is required' })
    }
    
    // Save the updated profile
    await saveProfile(profile as InfluencerProfile)
    
    return res.status(200).json({ success: true, profile })
  } catch (error) {
    console.error('Error updating profile:', error)
    return res.status(500).json({ error: 'Failed to update profile' })
  }
} 