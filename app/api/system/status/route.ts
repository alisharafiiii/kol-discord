import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { TwitterSyncService } from '@/lib/services/twitter-sync-service'

export async function GET(request: NextRequest) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        redis: false,
        twitter: false,
      },
      twitter: {
        bearerTokenConfigured: false,
        rateLimit: null as any,
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        hasTwitterCreds: false,
        hasRedisCreds: false,
      }
    }
    
    // Check Redis
    try {
      await redis.ping()
      status.services.redis = true
    } catch (error) {
      console.error('Redis check failed:', error)
    }
    
    // Check Twitter
    try {
      status.twitter.bearerTokenConfigured = Boolean(process.env.TWITTER_BEARER_TOKEN)
      status.twitter.rateLimit = await TwitterSyncService.getRateLimitStatus()
      status.services.twitter = status.twitter.bearerTokenConfigured
    } catch (error) {
      console.error('Twitter check failed:', error)
    }
    
    // Check environment
    status.environment.hasTwitterCreds = Boolean(
      process.env.TWITTER_CLIENT_ID && 
      process.env.TWITTER_CLIENT_SECRET &&
      process.env.TWITTER_BEARER_TOKEN
    )
    status.environment.hasRedisCreds = Boolean(
      process.env.REDIS_URL || 
      (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    )
    
    const allServicesOk = Object.values(status.services).every(v => v === true)
    
    return NextResponse.json(status, {
      status: allServicesOk ? 200 : 503
    })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        error: 'Status check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 