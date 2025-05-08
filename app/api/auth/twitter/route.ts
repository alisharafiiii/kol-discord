import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

const oauth = new OAuth({
  consumer: {
    key: process.env.TWITTER_API_KEY || '',
    secret: process.env.TWITTER_API_SECRET || ''
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
  try {
    console.log('TW_API_KEY:', process.env.TWITTER_API_KEY)
    console.log('TW_API_SECRET:', process.env.TWITTER_API_SECRET)
    const url = new URL(request.url)
    const callbackUrl = url.searchParams.get('callbackUrl')
    console.log('callbackUrl:', callbackUrl)

    const reqData = {
      url: 'https://api.twitter.com/oauth/request_token',
      method: 'POST',
      data: { oauth_callback: callbackUrl }
    }
    const authHeader = oauth.toHeader(oauth.authorize(reqData))
    const res = await fetch(reqData.url, {
      method: reqData.method,
      headers: {
        ...authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(reqData.data as any).toString()
    })
    if (!res.ok) {
      const body = await res.text()
      console.error('twitter request_token error body:', body)
      return NextResponse.json({ error: body }, { status: 500 })
    }
    const text = await res.text()
    console.log('twitter resp:', text)
    const params = new URLSearchParams(text)
    const oauthToken = params.get('oauth_token')
    await redis.set(`twitter:temp:${oauthToken}`, params.get('oauth_token_secret')!, { ex: 300 })
    return NextResponse.json({ authUrl: `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}` })
  } catch (err: any) {
    console.error('request-token error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
} 