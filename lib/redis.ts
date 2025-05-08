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
