import { saveProfileWithDuplicateCheck, InfluencerProfile } from '../../lib/redis'
import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const formData = req.body

    // Remove the ID requirement - we'll generate it based on Twitter handle
    // if (!formData.id) {
    //   return res.status(400).json({ message: 'User ID is required' })
    // }

    // Create profile object without specifying ID - let the system handle it
    const profile: Partial<InfluencerProfile> = {
      // Remove the hardcoded ID - the duplicate check will handle this
      // id: formData.id,
      name: formData.name,
      twitterHandle: formData.twitterHandle,
      profileImageUrl: formData.profileImageUrl,
      country: Array.isArray(formData.country) && formData.country.length > 0 
        ? formData.country.join(', ') // Store multi-country as comma-separated list
        : undefined,
      audienceTypes: formData.audienceTypes || [],
      chains: formData.chains || [],
      postPricePerPost: formData.postPricePerPost ? Number(formData.postPricePerPost) : undefined,
      monthlySupportBudget: formData.monthlySupportBudget ? Number(formData.monthlySupportBudget) : undefined,
      bestCollabUrls: formData.bestCollabUrls?.filter((url: string) => url) || [],
      socialAccounts: formData.socialAccounts || {},
      walletAddresses: formData.walletAddresses || {},
      adminNotes: formData.contentTypes?.length 
        ? `Content Types: ${formData.contentTypes.join(', ')}`
        : undefined,
      createdAt: formData.createdAt || new Date().toISOString(),
      approvalStatus: 'pending',
      role: 'user',
    }

    // Use saveProfileWithDuplicateCheck to prevent duplicate creation
    const savedProfile = await saveProfileWithDuplicateCheck(profile as InfluencerProfile)

    return res.status(200).json({ success: true, profile: savedProfile })
  } catch (error) {
    console.error('Error saving profile:', error)
    return res.status(500).json({ message: 'Failed to save profile', error: String(error) })
  }
} 