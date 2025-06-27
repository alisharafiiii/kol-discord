import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export async function POST(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // Check if user can edit metrics
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canEdit) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const { url } = await request.json()
    
    // Extract tweet ID from URL
    const tweetIdMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
    if (!tweetIdMatch) {
      return NextResponse.json({ error: 'Invalid Twitter URL' }, { status: 400 })
    }
    
    const tweetId = tweetIdMatch[1]
    
    // Fetch tweet data using Twitter API
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN
    if (!twitterBearerToken) {
      console.log('Twitter API not configured - no bearer token found')
      return NextResponse.json({ 
        error: 'Twitter API not configured. Please add TWITTER_BEARER_TOKEN to your environment variables.' 
      }, { status: 500 })
    }

    const response = await fetch(
      `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,author_id&expansions=author_id&user.fields=name,profile_image_url`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
        },
      }
    )

    // Check for rate limit before processing response
    if (response.status === 429) {
      const rateLimitReset = response.headers.get('x-rate-limit-reset')
      const rateLimitRemaining = response.headers.get('x-rate-limit-remaining')
      const retryAfter = response.headers.get('retry-after')
      
      console.error('Twitter API rate limit exceeded')
      
      const errorResponse = NextResponse.json({ 
        error: 'Twitter API rate limit exceeded. Please wait before trying again.',
        rateLimitReset: rateLimitReset ? parseInt(rateLimitReset) : null,
        rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : 0,
        retryAfter: retryAfter ? parseInt(retryAfter) : 60
      }, { status: 429 })
      
      // Add rate limit headers to our response
      if (rateLimitReset) {
        errorResponse.headers.set('X-RateLimit-Reset', rateLimitReset)
      }
      if (retryAfter) {
        errorResponse.headers.set('Retry-After', retryAfter)
      }
      
      return errorResponse
    }

    const responseData = await response.json()
    
    // Check for Twitter API errors
    if (responseData.errors) {
      const error = responseData.errors[0]
      console.error('Twitter API error:', error)
      
      if (error.type === 'https://api.twitter.com/2/problems/resource-not-found') {
        return NextResponse.json({ 
          error: `Tweet not found. The tweet may have been deleted or the URL is incorrect. (ID: ${tweetId})` 
        }, { status: 404 })
      } else if (error.title === 'Forbidden') {
        return NextResponse.json({ 
          error: 'This tweet is from a protected account and cannot be accessed.' 
        }, { status: 403 })
      } else {
        return NextResponse.json({ 
          error: `Twitter API error: ${error.detail || error.title || 'Unknown error'}` 
        }, { status: 400 })
      }
    }

    if (!response.ok) {
      console.error('Twitter API HTTP error:', response.status, response.statusText)
      return NextResponse.json({ 
        error: `Twitter API error: ${response.statusText} (${response.status})` 
      }, { status: response.status })
    }

    // Extract metrics and author info
    const tweet = responseData.data
    const author = responseData.includes?.users?.[0]
    
    if (!tweet || !tweet.public_metrics) {
      return NextResponse.json({ error: 'Tweet metrics not available' }, { status: 404 })
    }

    // Success response with rate limit info
    const successResponse = NextResponse.json({
      likes: tweet.public_metrics.like_count || 0,
      retweets: tweet.public_metrics.retweet_count || 0,
      replies: tweet.public_metrics.reply_count || 0,
      impressions: tweet.public_metrics.impression_count || 0,
      authorName: author?.name || '',
      authorPfp: author?.profile_image_url || ''
    })

    // Add rate limit headers from Twitter's response
    const rateLimitRemaining = response.headers.get('x-rate-limit-remaining')
    const rateLimitReset = response.headers.get('x-rate-limit-reset')
    
    if (rateLimitRemaining) {
      successResponse.headers.set('X-RateLimit-Remaining', rateLimitRemaining)
    }
    if (rateLimitReset) {
      successResponse.headers.set('X-RateLimit-Reset', rateLimitReset)
    }

    return successResponse
  } catch (error) {
    console.error('Error fetching Twitter data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Twitter data. Please check your internet connection and try again.' 
    }, { status: 500 })
  }
} 