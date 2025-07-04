import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-utils'
import { redis } from '@/lib/redis'

interface TierConfig {
  tier: string
  displayName: string
  multiplier: number
  submissionCost: number
  dailyTweetLimit: number
}

export async function GET(request: NextRequest) {
  try {
    // Check auth
    const auth = await checkAuth(request, ['admin', 'core', 'viewer'])
    if (!auth.authenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get current tier configurations
    const tiers = ['micro', 'rising', 'star', 'legend', 'hero']
    const configs: TierConfig[] = []
    
    for (const tier of tiers) {
      const config = await redis.json.get(`engagement:tier-config:${tier}`) as TierConfig | null
      
      if (config) {
        configs.push(config)
      } else {
        // Return default config if none exists
        configs.push(getDefaultConfig(tier))
      }
    }
    
    return NextResponse.json({ tiers: configs })
  } catch (error) {
    console.error('Error fetching tier configurations:', error)
    return NextResponse.json({ error: 'Failed to fetch tier configurations' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check auth - only admin can modify tier configurations
    const auth = await checkAuth(request, ['admin'])
    if (!auth.authenticated || !auth.hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    
    const { tiers } = await request.json()
    
    if (!tiers || !Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Invalid tier configurations' }, { status: 400 })
    }
    
    // Validate and save each tier configuration
    for (const config of tiers) {
      if (!config.tier || !config.displayName || 
          config.multiplier === undefined || 
          config.submissionCost === undefined || 
          config.dailyTweetLimit === undefined) {
        return NextResponse.json({ error: 'Invalid tier configuration' }, { status: 400 })
      }
      
      // Validate ranges
      if (config.multiplier < 0.1 || config.multiplier > 10) {
        return NextResponse.json({ error: 'Multiplier must be between 0.1 and 10' }, { status: 400 })
      }
      
      if (config.submissionCost < 0 || config.submissionCost > 10000) {
        return NextResponse.json({ error: 'Submission cost must be between 0 and 10000' }, { status: 400 })
      }
      
      if (config.dailyTweetLimit < 1 || config.dailyTweetLimit > 100) {
        return NextResponse.json({ error: 'Daily tweet limit must be between 1 and 100' }, { status: 400 })
      }
      
      // Save configuration
      await redis.json.set(`engagement:tier-config:${config.tier}`, '$', config)
      
      // Also update the scenario data for backward compatibility
      const scenarioData = {
        dailyTweetLimit: config.dailyTweetLimit,
        submissionCost: config.submissionCost,
        bonusMultiplier: config.multiplier,
        categories: ['General', 'DeFi', 'NFT', 'Gaming', 'Tech'],
        minFollowers: getMinFollowers(config.tier)
      }
      
      await redis.json.set(`engagement:scenarios:tier${getTierNumber(config.tier)}`, '$', scenarioData)
    }
    
    return NextResponse.json({ success: true, message: 'Tier configurations saved successfully' })
  } catch (error) {
    console.error('Error saving tier configurations:', error)
    return NextResponse.json({ error: 'Failed to save tier configurations' }, { status: 500 })
  }
}

function getDefaultConfig(tier: string): TierConfig {
  const defaults: Record<string, TierConfig> = {
    micro: { tier: 'micro', displayName: 'MICRO', multiplier: 1.0, submissionCost: 50, dailyTweetLimit: 3 },
    rising: { tier: 'rising', displayName: 'RISING', multiplier: 1.5, submissionCost: 75, dailyTweetLimit: 5 },
    star: { tier: 'star', displayName: 'STAR', multiplier: 2.0, submissionCost: 100, dailyTweetLimit: 7 },
    legend: { tier: 'legend', displayName: 'LEGEND', multiplier: 2.5, submissionCost: 150, dailyTweetLimit: 10 },
    hero: { tier: 'hero', displayName: 'HERO', multiplier: 3.0, submissionCost: 200, dailyTweetLimit: 15 }
  }
  
  return defaults[tier] || defaults.micro
}

function getTierNumber(tier: string): number {
  const tierMap: Record<string, number> = {
    micro: 1,
    rising: 2,
    star: 3,
    legend: 4,
    hero: 5
  }
  
  return tierMap[tier] || 1
}

function getMinFollowers(tier: string): number {
  const followersMap: Record<string, number> = {
    micro: 100,
    rising: 500,
    star: 1000,
    legend: 5000,
    hero: 10000
  }
  
  return followersMap[tier] || 100
} 