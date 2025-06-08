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

  const { type } = req.query

  try {
    // Get all profile keys
    const profileKeys = await getAllProfileKeys()
    
    // Fetch all profiles
    const profilePromises = profileKeys.map(key => getProfile(key))
    const profiles = await Promise.all(profilePromises)
    
    // Filter out any null values from failed fetches
    const validProfiles = profiles.filter(profile => profile !== null)
    
    // Process data based on requested type
    switch (type) {
      case 'signups':
        return res.status(200).json(getSignupTrend(validProfiles))
      case 'countries':
        return res.status(200).json(getCountryDistribution(validProfiles))
      case 'chains':
        return res.status(200).json(getChainDistribution(validProfiles))
      case 'contentTypes':
        return res.status(200).json(getContentTypeDistribution(validProfiles))
      case 'walletCounts':
        return res.status(200).json(getWalletCounts(validProfiles))
      case 'platforms':
        return res.status(200).json(getPlatformDistribution(validProfiles))
      default:
        // Return all stats
        return res.status(200).json({
          signups: getSignupTrend(validProfiles),
          countries: getCountryDistribution(validProfiles),
          chains: getChainDistribution(validProfiles),
          contentTypes: getContentTypeDistribution(validProfiles),
          walletCounts: getWalletCounts(validProfiles),
          platforms: getPlatformDistribution(validProfiles)
        })
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    return res.status(500).json({ error: 'Failed to fetch stats' })
  }
}

// Helper function to get signup trend
function getSignupTrend(profiles: any[]) {
  // Get last 30 days
  const dates: string[] = []
  const counts: number[] = []
  
  // Create date objects for the last 30 days
  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    counts.push(0) // Initialize with 0
  }
  
  // Count profiles created on each day
  profiles.forEach(profile => {
    if (profile.createdAt) {
      const createdDate = new Date(profile.createdAt)
      const now = new Date()
      
      // Only include if within last 30 days
      const diffTime = Math.abs(now.getTime() - createdDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 30) {
        // Find the index in our dates array
        const index = 29 - (diffDays - 1)
        if (index >= 0 && index < 30) {
          counts[index]++
        }
      }
    }
  })
  
  return { dates, counts }
}

// Helper function to get country distribution
function getCountryDistribution(profiles: any[]) {
  const countries: Record<string, number> = {}
  
  profiles.forEach(profile => {
    if (profile.country) {
      countries[profile.country] = (countries[profile.country] || 0) + 1
    }
  })
  
  return Object.entries(countries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10) // Top 10 countries
}

// Helper function to get chain distribution
function getChainDistribution(profiles: any[]) {
  const chains: Record<string, number> = {}
  
  profiles.forEach(profile => {
    if (profile.chains && Array.isArray(profile.chains)) {
      profile.chains.forEach((chain: string) => {
        chains[chain] = (chains[chain] || 0) + 1
      })
    }
  })
  
  return chains
}

// Helper function to get content type distribution
function getContentTypeDistribution(profiles: any[]) {
  const contentTypes: Record<string, number> = {
    'Thread': 0,
    'Video': 0,
    'Stream': 0,
    'Space': 0,
    'Other': 0
  }
  
  profiles.forEach(profile => {
    if (profile.contentType) {
      const types = Array.isArray(profile.contentType) ? profile.contentType : [profile.contentType]
      
      types.forEach((type: string) => {
        if (type in contentTypes) {
          contentTypes[type]++
        } else {
          contentTypes['Other']++
        }
      })
    }
  })
  
  return contentTypes
}

// Helper function to get wallet connection counts
function getWalletCounts(profiles: any[]) {
  const walletCounts: Record<string, number> = {
    '0 Wallets': 0,
    '1 Wallet': 0,
    '2 Wallets': 0,
    '3+ Wallets': 0
  }
  
  profiles.forEach(profile => {
    let count = 0
    
    if (profile.wallets) {
      count = Object.keys(profile.wallets).length
    }
    
    if (count === 0) walletCounts['0 Wallets']++
    else if (count === 1) walletCounts['1 Wallet']++
    else if (count === 2) walletCounts['2 Wallets']++
    else walletCounts['3+ Wallets']++
  })
  
  return walletCounts
}

// Helper function to get platform distribution
function getPlatformDistribution(profiles: any[]) {
  const platforms: Record<string, number> = {}
  
  profiles.forEach(profile => {
    if (profile.socialProfiles) {
      Object.keys(profile.socialProfiles).forEach(platform => {
        platforms[platform] = (platforms[platform] || 0) + 1
      })
    }
  })
  
  return Object.entries(platforms)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // Top 8 platforms
} 