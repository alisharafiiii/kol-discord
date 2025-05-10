import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface InfluencerProfile {
  id: string
  name: string
  twitterHandle?: string
  profileImageUrl?: string
  followerCount?: number
  followingCount?: number
  bio?: string
  country?: string               // changed from location to country
  audienceTypes?: string[]            // e.g. ['NFT Collectors','Traders']
  primaryLanguage?: string
  chains?: string[]                   // active chains
  postPricePerPost?: number
  monthlySupportBudget?: number
  bestCollabUrls?: string[]           // default 3, admin can add more
  shippingInfo?: {                    // for merch/DHL
    fullName: string
    addressLine1: string
    addressLine2?: string
    city: string
    postalCode: string
    country: string
  }
  socialAccounts?: {                  // handles + follower/subscriber counts
    twitter?:   { handle: string; followers: number }
    instagram?: { handle: string; followers: number }
    tiktok?:    { handle: string; followers: number }
    youtube?:   { handle: string; subscribers: number }
    telegram?:  { handle: string; followers: number }
  }
  walletAddresses?: {                 // linked wallets
    coinbase?: string
    phantom?:  string
  }
  campaigns?: Array<{                 // campaign details
    id: string
    name: string
    budget: string
    sendDevice: boolean
    sendMerch: boolean
    notes: string
    url: string
    createdAt: string
    createdBy: string
    updatedAt?: string
    updatedBy?: string
  }>
  farcasterId?: string                // future Farcaster login
  approvalStatus: 'pending' | 'approved' | 'rejected'
  adminNotes?: string
  campaignHistory?: string[]          // campaign IDs
  devicesSent?: string[]              // ledger flex, stax, etc.
  merchSent?: string[]                // merch items
  linksWorked?: string[]              // URLs of past collabs
  paymentStatus?: {                   // phase-2 fees
    entryFeePaid?:   boolean
    monthlyFeePaid?: boolean
  }
  roiRank?: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
  role: 'user' | 'intern' | 'admin'
  createdAt: string                   // ISO timestamp
  updatedAt?: string
  updatedBy?: string                  // admin who made the last change
  approvedBy?: string                 // admin who approved the profile
  rejectedBy?: string                 // admin who rejected the profile
}

export async function saveProfile(profile: InfluencerProfile): Promise<void> {
  // save full profile
  await redis.json.set(`user:${profile.id}`, '$', JSON.parse(JSON.stringify(profile)))

  // index by location
  if (profile.country) {
    await redis.sadd(`idx:country:${profile.country}`, profile.id)
  }

  // index by follower count (sorted set)
  await redis.zadd(`idx:followers`, {
    score: profile.followerCount ?? 0,
    member: profile.id,
  })

  // index by each chain
  if (profile.chains) {
    await Promise.all(
      profile.chains.map((chain) =>
        redis.sadd(`idx:chain:${chain}`, profile.id)
      )
    )
  }

  // index by approval status
  await redis.sadd(`idx:status:${profile.approvalStatus}`, profile.id)
}

export async function getProfileById(id: string): Promise<InfluencerProfile | null> {
  const profile = await redis.json.get(`user:${id}`)
  return profile as InfluencerProfile | null
}

export async function searchProfiles(
  filters: Partial<{
    country: string
    minFollowers: number
    chains: string[]
    approvalStatus: 'pending' | 'approved' | 'rejected'
  }>
): Promise<InfluencerProfile[]> {
  // get all user keys
  const keys = await redis.keys('user:*')
  // load all profiles
  const all = await Promise.all(
    keys.map(key => redis.json.get(key) as Promise<InfluencerProfile>)
  )
  // filter in JS
  return (all as InfluencerProfile[]).filter(p => {
    if (filters.country && p.country !== filters.country) return false
    if (filters.minFollowers != null && (p.followerCount ?? 0) < filters.minFollowers) return false
    if (
      filters.chains &&
      !filters.chains.every(chain => p.chains?.includes(chain))
    ) return false
    if (filters.approvalStatus && p.approvalStatus !== filters.approvalStatus)
      return false
    return true
  })
}

// Add new functions for admin panel
export async function getProfile(id: string): Promise<InfluencerProfile | null> {
  try {
    const profile = await redis.json.get(`user:${id}`)
    return profile as InfluencerProfile | null
  } catch (error) {
    console.error(`Error fetching profile ${id}:`, error)
    return null
  }
}

export async function getAllProfileKeys(): Promise<string[]> {
  try {
    const keys = await redis.keys('user:*')
    // Extract just the profile IDs from the keys
    return keys.map(key => key.replace('user:', ''))
  } catch (error) {
    console.error('Error fetching profile keys:', error)
    return []
  }
}

/**
 * Check if a user profile exists with the same Twitter handle or wallet address
 * Returns existing profile or null if not found
 */
export async function findDuplicateProfile(profile: Partial<InfluencerProfile>): Promise<InfluencerProfile | null> {
  try {
    // Check by Twitter handle first
    if (profile.twitterHandle) {
      const handle = profile.twitterHandle.replace('@', '').toLowerCase();
      const userIds = await redis.smembers(`idx:username:${handle}`);
      
      if (userIds && userIds.length > 0) {
        const userData = await redis.json.get(`user:${userIds[0]}`);
        return userData as InfluencerProfile;
      }
    }
    
    // Then check by wallet addresses
    if (profile.walletAddresses && Object.keys(profile.walletAddresses).length > 0) {
      for (const [_, address] of Object.entries(profile.walletAddresses)) {
        if (typeof address === 'string') {
          const userIds = await redis.smembers(`idx:wallet:${address.toLowerCase()}`);
          if (userIds && userIds.length > 0) {
            const userData = await redis.json.get(`user:${userIds[0]}`);
            return userData as InfluencerProfile;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error checking for duplicate profile:', error);
    return null;
  }
}

/**
 * Save a profile to Redis, handling duplicate detection
 * If a duplicate is found, it merges the profiles and updates
 */
export async function saveProfileWithDuplicateCheck(profile: InfluencerProfile): Promise<InfluencerProfile> {
  // Check for existing profile
  const existingProfile = await findDuplicateProfile(profile);
  
  if (existingProfile) {
    // Merge profiles and update
    const mergedProfile = { ...existingProfile };
    
    // Update basic info if provided
    if (profile.name) mergedProfile.name = profile.name;
    if (profile.profileImageUrl) mergedProfile.profileImageUrl = profile.profileImageUrl;
    if (profile.bio) mergedProfile.bio = profile.bio;
    
    // Merge wallet addresses
    if (profile.walletAddresses) {
      mergedProfile.walletAddresses = {
        ...(mergedProfile.walletAddresses || {}),
        ...profile.walletAddresses
      };
    }
    
    // Merge social accounts
    if (profile.socialAccounts) {
      mergedProfile.socialAccounts = {
        ...(mergedProfile.socialAccounts || {}),
        ...profile.socialAccounts
      };
    }
    
    // Save merged profile
    await redis.json.set(`user:${existingProfile.id}`, '$', JSON.parse(JSON.stringify(mergedProfile)));
    
    // Update indexes for any new data
    await updateProfileIndexes(mergedProfile);
    
    return mergedProfile;
  } else {
    // No duplicate found, save as new profile
    await saveProfile(profile);
    return profile;
  }
}

/**
 * Update profile indexes for new user data
 */
async function updateProfileIndexes(profile: InfluencerProfile): Promise<void> {
  // Index username/Twitter handle
  if (profile.twitterHandle) {
    const handle = profile.twitterHandle.replace('@', '').toLowerCase();
    await redis.sadd(`idx:username:${handle}`, profile.id);
  }
  
  // Index wallet addresses
  if (profile.walletAddresses) {
    for (const [_, address] of Object.entries(profile.walletAddresses)) {
      if (typeof address === 'string') {
        await redis.sadd(`idx:wallet:${address.toLowerCase()}`, profile.id);
      }
    }
  }
  
  // Index country
  if (profile.country && typeof profile.country === 'string') {
    await redis.sadd(`idx:country:${profile.country}`, profile.id);
  }
}
