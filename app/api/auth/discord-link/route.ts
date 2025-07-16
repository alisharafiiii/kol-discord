/**
 * ✅ STABLE & VERIFIED - DO NOT MODIFY WITHOUT EXPLICIT REVIEW
 * 
 * Discord account linking API endpoint.
 * Last verified: December 2024
 * 
 * Key functionality:
 * - Validates Discord verification sessions
 * - Creates/updates user profiles with Discord info
 * - Establishes engagement connections for tweet tracking
 * - Links Discord users to platform for points system
 * 
 * CRITICAL: This endpoint is used by the Discord bot /connect command.
 * The user ID format handling fix is essential for points bridge.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'
import { DiscordPointsBridge } from '@/lib/services/discord-points-bridge'

export async function POST(request: NextRequest) {
  console.log('=== Discord Link API Called ===')
  console.log('Method:', request.method)
  console.log('URL:', request.url)
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  
  try {
    // Get the current session
    const session = await getServerSession(authOptions)
    console.log('Discord link API - Session:', JSON.stringify(session, null, 2))
    
    const twitterHandleFromSession = (session as any)?.twitterHandle || (session?.user as any)?.twitterHandle
    console.log('Twitter handle from session:', twitterHandleFromSession)
    
    if (!session?.user || !twitterHandleFromSession) {
      console.log('Discord link API - No session or Twitter handle')
      console.log('Session exists?', !!session)
      console.log('Session user exists?', !!session?.user)
      return NextResponse.json(
        { error: 'Not authenticated or missing Twitter handle' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    console.log('Request body:', body)
    const { sessionId } = body
    console.log('Discord link API - Session ID:', sessionId)
    
    if (!sessionId) {
      console.log('No session ID provided in request')
      return NextResponse.json(
        { error: 'No session ID provided' },
        { status: 400 }
      )
    }
    
    // Get the Discord verification session
    const sessionKey = `discord:verify:${sessionId}`
    console.log('Looking for session key:', sessionKey)
    
    // Log Redis connection status
    console.log('Redis connected?', redis.status === 'ready')
    console.log('Redis status:', redis.status)
    
    const sessionData = await redis.get(sessionKey)
    console.log('Session data retrieved:', sessionData ? 'Found' : 'Not found')
    console.log('Session data type:', typeof sessionData)
    console.log('Session data length:', sessionData ? String(sessionData).length : 0)
    
    if (!sessionData) {
      console.log('Session not found in Redis')
      console.log('Checking for any Discord sessions...')
      try {
        const allKeys = await redis.keys('discord:verify:*')
        console.log('Total Discord sessions in Redis:', allKeys.length)
        if (allKeys.length > 0) {
          console.log('Sample sessions:', allKeys.slice(0, 3))
        }
      } catch (e) {
        console.log('Error checking keys:', e)
      }
      
      return NextResponse.json(
        { error: 'Verification session expired or not found' },
        { status: 404 }
      )
    }
    
    const parsedData = typeof sessionData === 'string' ? JSON.parse(sessionData) : sessionData
    console.log('Parsed session data:', parsedData)
    const { discordId, discordUsername, discordTag } = parsedData
    const twitterHandle = twitterHandleFromSession.toLowerCase().replace('@', '')
    
    console.log('Processing link for:', { discordId, discordUsername, twitterHandle })
    
    // Check if user profile exists
    const userIds = await redis.smembers(`idx:username:${twitterHandle}`)
    let userId: string
    let isNewUser = false
    
    if (!userIds || userIds.length === 0) {
      // Create new profile
      userId = `user_${twitterHandle}`
      isNewUser = true
      console.log('Creating new profile for:', userId)
      
      const newProfile = {
        id: userId,
        twitterHandle: `@${twitterHandle}`,
        name: session.user.name,
        profileImageUrl: session.user.image || '',
        approvalStatus: 'pending',
        role: 'user',
        tier: 'micro',
        isKOL: false,
        discordId: discordId,
        discordUsername: discordUsername,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        socialAccounts: {
          twitter: {
            handle: twitterHandle,
            connected: true
          },
          discord: {
            id: discordId,
            username: discordUsername,
            tag: discordTag,
            connected: true
          }
        }
      }
      
      // Save to Redis
      await redis.json.set(userId, '$', newProfile)
      
      // Create username index
      await redis.sadd(`idx:username:${twitterHandle}`, userId)
      
      // Add to pending users set
      await redis.sadd('users:pending', userId)
      console.log('New profile created successfully')
    } else {
      // Update existing profile
      userId = userIds[0]
      console.log('Updating existing profile:', userId)
      
      // Get the existing profile first
      const existingProfile = await redis.json.get(userId) as any
      
      // If profile doesn't exist in Redis, create a new one
      if (!existingProfile) {
        console.log('Profile not found in Redis, creating new one')
        const newProfile = {
          id: userId,
          twitterHandle: `@${twitterHandle}`,
          name: session.user.name,
          profileImageUrl: session.user.image || '',
          approvalStatus: 'approved', // Existing user, likely already approved
          role: (session as any).role || 'user',
          tier: 'micro',
          isKOL: false,
          discordId: discordId,
          discordUsername: discordUsername,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          socialAccounts: {
            twitter: {
              handle: twitterHandle,
              connected: true
            },
            discord: {
              id: discordId,
              username: discordUsername,
              tag: discordTag,
              connected: true
            }
          }
        }
        
        await redis.json.set(userId, '$', newProfile)
      } else {
        console.log('Updating existing profile with Discord info')
        // Update the profile with Discord info
        const updatedProfile = {
          ...existingProfile,
          discordId: discordId,
          discordUsername: discordUsername,
          updatedAt: new Date().toISOString(),
          socialAccounts: {
            ...(existingProfile.socialAccounts || {}),
            discord: {
              id: discordId,
              username: discordUsername,
              tag: discordTag,
              connected: true
            }
          }
        }
        
        await redis.json.set(userId, '$', updatedProfile)
      }
    }
    
    // Get the profile data
    const profile = await redis.json.get(userId) as any
    console.log('Profile retrieved:', profile ? 'Success' : 'Failed')
    
    // Create engagement connection
    const connection = {
      discordId: discordId,
      twitterHandle: twitterHandle,
      tier: profile?.tier || 'micro',
      connectedAt: new Date(),
      totalPoints: 0,
      role: profile?.role || 'user'
    }
    
    console.log('Creating engagement connection...')
    await redis.json.set(`engagement:connection:${discordId}`, '$', connection)
    await redis.set(`engagement:twitter:${twitterHandle}`, discordId)
    
    // Link Discord user to platform user for points system
    // Keep the full userId as it's the actual key in Redis
    console.log(`Linking Discord user ${discordId} to platform user ${userId}`)
    const linkResult = await DiscordPointsBridge.linkDiscordUser(discordId, userId)
    console.log(`Discord points bridge link result: ${linkResult}`)
    
    // Clean up verification session
    console.log('Cleaning up verification session...')
    await redis.del(sessionKey)
    
    const response = {
      success: true,
      message: isNewUser ? 'Account created and linked successfully' : 'Accounts linked successfully',
      profile: {
        twitterHandle: `@${twitterHandle}`,
        discordUsername: discordUsername,
        approvalStatus: profile?.approvalStatus || 'pending',
        isNewUser
      }
    }
    
    console.log('=== Discord Link API Success ===')
    console.log('Response:', response)
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('=== Discord Link API Error ===')
    console.error('Error linking Discord account:', error)
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    
    return NextResponse.json(
      { error: 'Failed to link accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 