import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { redis } from '@/lib/redis'
import { nanoid } from 'nanoid'

const ALLOWED_ROLES = ['admin', 'core', 'hunter', 'kol', 'brand_mod', 'brand_hunter']

export async function GET(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    // const session = await getServerSession(authOptions)
    
    // if (!session?.user?.email || !ALLOWED_ROLES.includes(session.user.role || '')) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign') || 'default'
    
    console.log('[Metrics GET] Fetching metrics for campaign:', campaignId)
    
    // Fetch metrics for the campaign
    const metricsKey = `metrics:${campaignId}`
    const entries = await redis.lrange(metricsKey, 0, -1)
    
    console.log('[Metrics GET] Raw entries from Redis:', entries.length)
    
    const parsedEntries = entries.map(entry => {
      try {
        // Handle if entry is already an object or needs parsing
        if (typeof entry === 'string') {
          return JSON.parse(entry)
        } else if (typeof entry === 'object' && entry !== null) {
          return entry
        } else {
          console.warn('[Metrics GET] Unexpected entry type:', typeof entry)
          return null
        }
      } catch (parseError) {
        console.error('[Metrics GET] Failed to parse entry:', parseError)
        return null
      }
    }).filter(Boolean)
    
    // Reverse the order to show oldest first (maintaining chronological order)
    parsedEntries.reverse()
    
    console.log('[Metrics GET] Returning', parsedEntries.length, 'parsed entries')

    return NextResponse.json({ entries: parsedEntries })
  } catch (error) {
    console.error('[Metrics GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    console.log('[Metrics POST] Session:', session ? {
      email: session.user?.email,
      role: session.user?.role,
      id: session.user?.id
    } : 'No session')
    
    // Check if user can edit metrics (admin or core only)
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    console.log('[Metrics POST] Can edit:', canEdit, 'Role:', session?.user?.role)
    
    // if (!session) {
    //   return NextResponse.json({ error: 'Not authenticated. Please sign in.' }, { status: 401 })
    // }
    
    // if (!canEdit) {
    //   return NextResponse.json({ 
    //     error: 'Insufficient permissions', 
    //     details: `Your role: ${session.user?.role || 'none'}. Required: admin or core` 
    //   }, { status: 403 })
    // }

    const data = await request.json()
    const { campaignId = 'default', ...metricData } = data
    
    console.log('[Metrics POST] Creating entry for campaign:', campaignId)
    console.log('[Metrics POST] Entry data:', metricData)
    
    // Create new metric entry
    const entry = {
      id: nanoid(),
      ...metricData,
      createdAt: new Date().toISOString(),
      createdBy: session?.user?.id || session?.user?.email || 'test-user'
    }
    
    // Save to Redis using lpush (adds to beginning)
    const metricsKey = `metrics:${campaignId}`
    await redis.lpush(metricsKey, JSON.stringify(entry))
    
    console.log('[Metrics POST] Entry saved with ID:', entry.id)
    
    // Verify it was saved - handle the response properly
    try {
      const verifyEntries = await redis.lrange(metricsKey, 0, 0)
      if (verifyEntries && verifyEntries.length > 0) {
        const firstEntry = typeof verifyEntries[0] === 'string' 
          ? verifyEntries[0] 
          : JSON.stringify(verifyEntries[0])
        console.log('[Metrics POST] Verification - first entry:', firstEntry.substring(0, 100))
      } else {
        console.log('[Metrics POST] Verification - no entries found after save')
      }
    } catch (verifyError) {
      console.log('[Metrics POST] Verification skipped due to error:', verifyError)
    }
    
    return NextResponse.json({ success: true, entry })
  } catch (error) {
    console.error('[Metrics POST] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to save metric',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // Check if user can edit metrics (admin or core only)
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canEdit) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get('campaign') || 'default'
    const entryId = searchParams.get('entryId')
    
    console.log('[Metrics DELETE] Campaign ID:', campaignId)
    console.log('[Metrics DELETE] Entry ID to delete:', entryId)
    
    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }
    
    // Get all entries
    const metricsKey = `metrics:${campaignId}`
    const entries = await redis.lrange(metricsKey, 0, -1)
    
    console.log('[Metrics DELETE] Total entries found:', entries.length)
    
    // Filter out the entry to delete
    let foundEntry = false
    const remainingEntries = []
    
    for (const entry of entries) {
      // Handle both object and string entries
      let entryData
      if (typeof entry === 'string') {
        try {
          entryData = JSON.parse(entry)
        } catch (e) {
          console.error('[Metrics DELETE] Failed to parse string entry:', e)
          remainingEntries.push(entry)
          continue
        }
      } else {
        entryData = entry
      }
      
      console.log('[Metrics DELETE] Checking entry ID:', entryData.id, 'against:', entryId)
      
      if (entryData.id !== entryId) {
        // Keep this entry - store as string
        remainingEntries.push(JSON.stringify(entryData))
      } else {
        foundEntry = true
      }
    }
    
    console.log('[Metrics DELETE] Entry found:', foundEntry)
    console.log('[Metrics DELETE] Entries after filter:', remainingEntries.length)
    
    // Clear the list and add back remaining entries
    await redis.del(metricsKey)
    if (remainingEntries.length > 0) {
      await redis.rpush(metricsKey, ...remainingEntries)
    }
    
    return NextResponse.json({ success: true, found: foundEntry, remaining: remainingEntries.length })
  } catch (error) {
    console.error('[Metrics DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete metric' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TEMPORARILY DISABLED FOR TESTING
    const session = await getServerSession(authOptions)
    
    // const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'core'
    const canEdit = true // TEMPORARILY ENABLED FOR TESTING
    
    // if (!session || !canEdit) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    const data = await request.json()
    const { campaignId = 'default', entryId, ...updates } = data
    
    console.log('[Metrics PUT] Campaign ID:', campaignId)
    console.log('[Metrics PUT] Entry ID to update:', entryId)
    console.log('[Metrics PUT] Updates:', updates)
    
    if (!entryId) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 })
    }
    
    // Get all entries
    const metricsKey = `metrics:${campaignId}`
    const entries = await redis.lrange(metricsKey, 0, -1)
    
    console.log('[Metrics PUT] Total entries found:', entries.length)
    
    // Update the specific entry
    let foundEntry = false
    const updatedEntries = []
    
    for (const entry of entries) {
      // Handle both object and string entries
      let entryData
      if (typeof entry === 'string') {
        try {
          entryData = JSON.parse(entry)
        } catch (e) {
          console.error('[Metrics PUT] Failed to parse string entry:', e)
          updatedEntries.push(entry)
          continue
        }
      } else {
        entryData = entry
      }
      
      console.log('[Metrics PUT] Checking entry ID:', entryData.id, 'against:', entryId)
      
      if (entryData.id === entryId) {
        foundEntry = true
        // Update the entry
        const updated = {
          ...entryData,
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: session?.user?.id || session?.user?.email || 'test-user'
        }
        console.log('[Metrics PUT] Updated entry:', updated)
        updatedEntries.push(JSON.stringify(updated))
      } else {
        // Keep as string
        updatedEntries.push(JSON.stringify(entryData))
      }
    }
    
    console.log('[Metrics PUT] Entry found:', foundEntry)
    
    // Clear the list and add back updated entries
    await redis.del(metricsKey)
    if (updatedEntries.length > 0) {
      await redis.rpush(metricsKey, ...updatedEntries)
    }
    
    return NextResponse.json({ success: true, found: foundEntry })
  } catch (error) {
    console.error('[Metrics PUT] Error:', error)
    return NextResponse.json({ error: 'Failed to update metric' }, { status: 500 })
  }
} 