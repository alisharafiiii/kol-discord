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

    const body = await request.json()
    
    // Support both single URL and batch of URLs
    const urls = Array.isArray(body.urls) ? body.urls : (body.url ? [body.url] : [])
    
    if (urls.length === 0) {
      return NextResponse.json({ error: 'No URLs provided' }, { status: 400 })
    }
    
    // Extract tweet IDs from URLs
    const tweetIds: string[] = []
    const urlToIdMap: Record<string, string> = {}
    
    for (const url of urls) {
      const tweetIdMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
      if (tweetIdMatch) {
        const tweetId = tweetIdMatch[1]
        tweetIds.push(tweetId)
        urlToIdMap[tweetId] = url
      }
    }
    
    if (tweetIds.length === 0) {
      return NextResponse.json({ error: 'No valid Twitter URLs found' }, { status: 400 })
    }
    
    // Fetch tweet data using Twitter API
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN
    if (!twitterBearerToken) {
      console.log('Twitter API not configured - no bearer token found')
      return NextResponse.json({ 
        error: 'Twitter API not configured. Please add TWITTER_BEARER_TOKEN to your environment variables.' 
      }, { status: 500 })
    }

    // Use batch endpoint - Twitter API v2 allows up to 100 tweets per request
    const response = await fetch(
      `https://api.twitter.com/2/tweets?ids=${tweetIds.join(',')}&tweet.fields=public_metrics,author_id&expansions=author_id&user.fields=name,profile_image_url`,
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

    if (!response.ok) {
      console.error('Twitter API HTTP error:', response.status, response.statusText)
      return NextResponse.json({ 
        error: `Twitter API error: ${response.statusText} (${response.status})` 
      }, { status: response.status })
    }

    const responseData = await response.json()
    
    // Process batch response
    const results: Record<string, any> = {}
    const errors: Record<string, string> = {}
    
    // Process successful tweets
    if (responseData.data && Array.isArray(responseData.data)) {
      const authorMap: Record<string, any> = {}
      
      // Build author map
      if (responseData.includes?.users) {
        for (const user of responseData.includes.users) {
          authorMap[user.id] = user
        }
      }
      
      // Process each tweet
      for (const tweet of responseData.data) {
        const author = authorMap[tweet.author_id]
        const url = urlToIdMap[tweet.id]
        
        results[url] = {
          likes: tweet.public_metrics?.like_count || 0,
          retweets: tweet.public_metrics?.retweet_count || 0,
          replies: tweet.public_metrics?.reply_count || 0,
          impressions: tweet.public_metrics?.impression_count || 0,
          authorName: author?.name || '',
          authorPfp: author?.profile_image_url || ''
        }
      }
    }
    
    // Process errors (deleted tweets, etc.)
    if (responseData.errors && Array.isArray(responseData.errors)) {
      for (const error of responseData.errors) {
        const url = urlToIdMap[error.resource_id]
        if (url) {
          if (error.type === 'https://api.twitter.com/2/problems/resource-not-found') {
            errors[url] = 'Tweet not found (may have been deleted)'
          } else if (error.title === 'Forbidden') {
            errors[url] = 'Tweet is from a protected account'
          } else {
            errors[url] = error.detail || error.title || 'Unknown error'
          }
        }
      }
    }
    
    // For single URL requests, maintain backward compatibility
    if (!Array.isArray(body.urls) && body.url) {
      if (results[body.url]) {
        // Add rate limit headers from Twitter's response
        const successResponse = NextResponse.json(results[body.url])
        
        const rateLimitRemaining = response.headers.get('x-rate-limit-remaining')
        const rateLimitReset = response.headers.get('x-rate-limit-reset')
        
        if (rateLimitRemaining) {
          successResponse.headers.set('X-RateLimit-Remaining', rateLimitRemaining)
        }
        if (rateLimitReset) {
          successResponse.headers.set('X-RateLimit-Reset', rateLimitReset)
        }
        
        return successResponse
      } else if (errors[body.url]) {
        return NextResponse.json({ error: errors[body.url] }, { status: 404 })
      } else {
        return NextResponse.json({ error: 'Tweet data not available' }, { status: 404 })
      }
    }
    
    // Return batch results
    const batchResponse = NextResponse.json({ results, errors })
    
    // Add rate limit headers
    const rateLimitRemaining = response.headers.get('x-rate-limit-remaining')
    const rateLimitReset = response.headers.get('x-rate-limit-reset')
    
    if (rateLimitRemaining) {
      batchResponse.headers.set('X-RateLimit-Remaining', rateLimitRemaining)
    }
    if (rateLimitReset) {
      batchResponse.headers.set('X-RateLimit-Reset', rateLimitReset)
    }
    
    return batchResponse
  } catch (error) {
    console.error('Error fetching Twitter data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Twitter data. Please check your internet connection and try again.' 
    }, { status: 500 })
  }
} 