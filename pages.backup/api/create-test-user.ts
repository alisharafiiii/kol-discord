import { NextApiRequest, NextApiResponse } from 'next'
import { redis, InfluencerProfile } from '@/lib/redis'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Create a test user for based_mena
    const testUser: InfluencerProfile = {
      id: "based_mena",
      name: "Based MENA",
      twitterHandle: "@based_mena",
      profileImageUrl: "https://example.com/profile.jpg",
      followerCount: 5000,
      bio: "Crypto and Web3 enthusiast from the MENA region",
      country: "United Arab Emirates",
      audienceTypes: ["Crypto Traders", "DeFi Users"],
      chains: ["Ethereum", "Solana", "Base"],
      walletAddresses: {
        phantom: "84XFY6jknaQSLUUwb3WjhujvWxjvcr6WN2xJ97XXG1jj"
      },
      role: "user",
      approvalStatus: "pending",
      createdAt: new Date().toISOString()
    }

    // Save the test user to Redis
    await redis.json.set(`user:${testUser.id}`, '$', JSON.parse(JSON.stringify(testUser)))

    // Also add to indexes
    if (testUser.country) {
      await redis.sadd(`idx:country:${testUser.country}`, testUser.id)
    }

    // Add to follower count index
    await redis.zadd(`idx:followers`, {
      score: testUser.followerCount || 0,
      member: testUser.id,
    })

    // Add to chain indexes
    if (testUser.chains) {
      await Promise.all(
        testUser.chains.map((chain) =>
          redis.sadd(`idx:chain:${chain}`, testUser.id)
        )
      )
    }

    // Add to approval status index
    await redis.sadd(`idx:status:${testUser.approvalStatus}`, testUser.id)

    return res.status(200).json({ success: true, user: testUser })
  } catch (error) {
    console.error('Error creating test user:', error)
    return res.status(500).json({ error: 'Failed to create test user' })
  }
} 