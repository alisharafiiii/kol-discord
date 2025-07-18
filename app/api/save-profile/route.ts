import { NextRequest, NextResponse } from 'next/server'
import { saveProfileWithDuplicateCheck, InfluencerProfile } from '@/lib/redis'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.json()

    // Generate a proper user ID based on the Twitter handle
    const twitterHandle = formData.twitterHandle?.replace('@', '').toLowerCase() || ''
    const userId = twitterHandle ? `user_${twitterHandle}` : `user_${Date.now()}_${Math.random().toString(36).substring(7)}`

    // Create profile object with a proper ID
    const profile: Partial<InfluencerProfile> = {
      id: userId,  // Add the generated ID
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

    return NextResponse.json({ success: true, profile: savedProfile })
  } catch (error) {
    console.error('Error saving profile:', error)
    return NextResponse.json(
      { message: 'Failed to save profile', error: String(error) }, 
      { status: 500 }
    )
  }
} 