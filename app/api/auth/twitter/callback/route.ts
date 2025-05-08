import { NextResponse } from 'next/server'
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'
import { redis } from '@/lib/redis'

// Create OAuth 1.0a instance
const oauth = new OAuth({
  consumer: {
    key: process.env.TWITTER_CLIENT_ID!,
    secret: process.env.TWITTER_CLIENT_SECRET!,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64')
  },
})

export async function GET(request: Request) {
  // Get the oauth_token and oauth_verifier from the callback
  const { searchParams } = new URL(request.url)
  const oauth_token = searchParams.get('oauth_token')
  const oauth_verifier = searchParams.get('oauth_verifier')

  if (!oauth_token || !oauth_verifier) {
    return NextResponse.redirect(new URL('/?error=missing_oauth_params', request.url))
  }

  try {
    // Get the token secret from Redis
    const oauth_token_secret = await redis.get(`twitter_oauth_token_secret:${oauth_token}`)
    
    if (!oauth_token_secret) {
      return NextResponse.redirect(new URL('/?error=token_expired', request.url))
    }

    // Access token endpoint
    const accessTokenEndpoint = 'https://api.twitter.com/oauth/access_token'
    
    // Generate request data
    const requestData = {
      url: accessTokenEndpoint,
      method: 'POST',
      data: { 
        oauth_token,
        oauth_verifier
      },
    }

    // Generate request authorization header with token secret
    const headers = oauth.toHeader(
      oauth.authorize(requestData, { key: oauth_token, secret: oauth_token_secret as string })
    )

    // Make the request to Twitter
    const twitterResponse = await fetch(accessTokenEndpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!twitterResponse.ok) {
      throw new Error(`Twitter API error: ${twitterResponse.status} ${twitterResponse.statusText}`)
    }

    // Parse the response
    const responseText = await twitterResponse.text()
    const responseParams = new URLSearchParams(responseText)
    
    const access_token = responseParams.get('oauth_token')
    const access_token_secret = responseParams.get('oauth_token_secret')
    const user_id = responseParams.get('user_id')
    const screen_name = responseParams.get('screen_name')

    if (!access_token || !access_token_secret || !user_id || !screen_name) {
      throw new Error('Missing parameters in Twitter response')
    }

    // Store the user information in your application's session or database
    // For now, we'll store it in Redis with a session ID
    const sessionId = crypto.randomUUID()
    await redis.json.set(`twitter_user:${sessionId}`, '$', {
      id: user_id,
      screen_name,
      access_token,
      access_token_secret,
      authenticated: true,
    })
    
    // Set a cookie with the session ID
    const redirectUrl = new URL('/', request.url)
    const nextResponse = NextResponse.redirect(redirectUrl)
    
    // Set the cookie
    nextResponse.cookies.set('twitter_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    })
    
    return nextResponse
  } catch (error) {
    console.error('Error in Twitter callback:', error)
    return NextResponse.redirect(new URL('/?error=twitter_auth_failed', request.url))
  }
} 