import { NextRequest, NextResponse } from 'next/server'
import { ProfileService } from '@/lib/services/profile-service'
import { UnifiedProfile } from '@/lib/types/profile'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const approvedOnly = searchParams.get('approved') === 'true'
    
    // Search for all profiles (empty filter returns all)
    const allProfiles = await ProfileService.searchProfiles({})
    
    let profiles = allProfiles
    
    // Filter for approved users if requested
    if (approvedOnly) {
      profiles = allProfiles.filter((profile: UnifiedProfile) => 
        profile.role && ['admin', 'core', 'team', 'kol'].includes(profile.role)
      )
    }
    
    // Map to simplified format
    const users = profiles.map((profile: UnifiedProfile) => ({
      handle: profile.twitterHandle,
      name: profile.name || profile.twitterHandle,
      profileImageUrl: profile.profileImageUrl,
      role: profile.role
    }))
    
    // Sort by role priority and then by name
    const rolePriority = { admin: 0, core: 1, team: 2, kol: 3 }
    users.sort((a: any, b: any) => {
      const aPriority = rolePriority[a.role as keyof typeof rolePriority] ?? 999
      const bPriority = rolePriority[b.role as keyof typeof rolePriority] ?? 999
      if (aPriority !== bPriority) return aPriority - bPriority
      return (a.name || '').localeCompare(b.name || '')
    })
    
    // Return array directly for compatibility with frontend
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
} 