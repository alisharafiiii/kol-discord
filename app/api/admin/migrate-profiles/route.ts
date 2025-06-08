import { NextRequest, NextResponse } from 'next/server'
import { checkAuth } from '@/lib/auth-utils'
import { ProfileMigrationService } from '@/lib/services/profile-migration'

export async function POST(request: NextRequest) {
  try {
    // Check auth - only admins can run migration
    const auth = await checkAuth(request, ['admin'])
    
    if (!auth.authenticated || !auth.hasAccess) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      )
    }
    
    console.log('Starting profile migration...')
    
    // Run migration
    const result = await ProfileMigrationService.migrateAllProfiles()
    
    console.log('Migration completed:', result)
    
    return NextResponse.json({
      message: 'Migration completed',
      ...result
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { 
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 