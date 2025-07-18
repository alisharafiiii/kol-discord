import { redis } from '@/lib/redis'
import { UnifiedProfile, CampaignParticipation, Note, KOLMetrics, UserRole } from '@/lib/types/profile'
import { v4 as uuidv4 } from 'uuid'

export class ProfileService {
  private static readonly PREFIX = 'profile:'
  private static readonly INDEX_PREFIX = 'idx:profile:'
  
  /**
   * Create or update a unified profile
   */
  static async saveProfile(profile: UnifiedProfile): Promise<UnifiedProfile> {
    try {
      console.log('[ProfileService.saveProfile] Starting save for:', profile.twitterHandle || profile.id)
      
      // Ensure required fields
      if (!profile.id) profile.id = uuidv4()
      if (!profile.createdAt) profile.createdAt = new Date()
      profile.updatedAt = new Date()
      
      // Normalize Twitter handle
      if (profile.twitterHandle) {
        profile.twitterHandle = profile.twitterHandle.replace('@', '').toLowerCase()
      }
      
      // Ensure name field has a value
      if (!profile.name && profile.twitterHandle) {
        profile.name = profile.twitterHandle
      }
      
      console.log('[ProfileService.saveProfile] Saving profile:', {
        id: profile.id,
        handle: profile.twitterHandle,
        name: profile.name,
        role: profile.role,
        approvalStatus: profile.approvalStatus
      })
      
      // Save to Redis
      const key = `${this.PREFIX}${profile.id}`
      console.log('[ProfileService.saveProfile] Saving to Redis key:', key)
      
      await redis.json.set(
        key,
        '$',
        JSON.parse(JSON.stringify(profile))
      )
      
      console.log('[ProfileService.saveProfile] Profile saved to Redis successfully')
      
      // Update indexes
      await this.updateIndexes(profile)
      
      console.log('[ProfileService.saveProfile] Indexes updated successfully')
      
      return profile
    } catch (error) {
      console.error('[ProfileService.saveProfile] Error saving profile:', error)
      throw error
    }
  }
  
  /**
   * Get profile by ID
   */
  static async getProfileById(id: string): Promise<UnifiedProfile | null> {
    try {
      const profile = await redis.json.get(`${this.PREFIX}${id}`)
      return profile ? this.deserializeProfile(profile) : null
    } catch (error) {
      console.error('Error getting profile:', error)
      return null
    }
  }
  
  /**
   * Get profile by Twitter handle
   */
  static async getProfileByHandle(handle: string): Promise<UnifiedProfile | null> {
    try {
      const normalizedHandle = handle.replace('@', '').toLowerCase()
      console.log('ProfileService.getProfileByHandle:', { handle, normalizedHandle })
      
      // Don't use hardcoded profiles - fetch from database
      
      const profileIds = await redis.smembers(`${this.INDEX_PREFIX}handle:${normalizedHandle}`)
      console.log('ProfileService: Found profile IDs:', profileIds)
      
      if (profileIds.length === 0) return null
      
      // Get the first profile (should only be one per handle)
      return this.getProfileById(profileIds[0])
    } catch (error) {
      console.error('Error getting profile by handle:', error)
      return null
    }
  }
  
  /**
   * Search profiles with filters
   */
  static async searchProfiles(filters: {
    role?: UserRole
    approvalStatus?: string
    tier?: string
    country?: string
    isKOL?: boolean
    searchTerm?: string
  } = {}): Promise<UnifiedProfile[]> {
    try {
      let profileIds: string[] = []
      
      // If we have a search term, search all profiles
      if (filters.searchTerm) {
        // Get all profile keys
        const keys = await redis.keys(`${this.PREFIX}*`)
        
        // Get all profiles and filter by search term
        const profiles = await Promise.all(
          keys.map(async (key: string) => {
            const profile = await redis.json.get(key)
            return profile ? this.deserializeProfile(profile) : null
          })
        )
        
        // Filter nulls and apply search
        const searchLower = filters.searchTerm.toLowerCase()
        return profiles.filter((profile): profile is UnifiedProfile => {
          if (!profile) return false
          
          // Apply other filters
          if (filters.role && profile.role !== filters.role) return false
          if (filters.approvalStatus && profile.approvalStatus !== filters.approvalStatus) return false
          if (filters.tier && profile.currentTier !== filters.tier) return false
          if (filters.country && profile.country !== filters.country) return false
          if (filters.isKOL !== undefined && profile.isKOL !== filters.isKOL) return false
          
          // Apply search term
          return (
            profile.name?.toLowerCase().includes(searchLower) ||
            profile.twitterHandle?.toLowerCase().includes(searchLower) ||
            profile.email?.toLowerCase().includes(searchLower) ||
            false
          )
        })
      }
      
      // Start with all profiles if no specific filters
      if (!filters.role && !filters.approvalStatus && !filters.tier && !filters.country && filters.isKOL === undefined) {
        console.log('[ProfileService] No filters provided, getting all profiles')
        const keys = await redis.keys(`${this.PREFIX}*`)
        console.log('[ProfileService] Found profile keys:', keys.length)
        
        // Get all profiles
        const profiles = await Promise.all(
          keys.map(async (key: string) => {
            try {
              const profile = await redis.json.get(key)
              return profile ? this.deserializeProfile(profile) : null
            } catch (error) {
              console.error(`[ProfileService] Error getting profile ${key}:`, error)
              return null
            }
          })
        )
        
        // Filter out nulls
        const validProfiles = profiles.filter((p): p is UnifiedProfile => p !== null)
        console.log('[ProfileService] Valid profiles:', validProfiles.length)
        return validProfiles
      } else {
        // Use indexes for filtering
        const setsToIntersect: string[][] = []
        
        if (filters.role) {
          const roleIds = await redis.smembers(`${this.INDEX_PREFIX}role:${filters.role}`)
          setsToIntersect.push(roleIds)
        }
        
        if (filters.approvalStatus) {
          const statusIds = await redis.smembers(`${this.INDEX_PREFIX}status:${filters.approvalStatus}`)
          setsToIntersect.push(statusIds)
        }
        
        if (filters.tier) {
          const tierIds = await redis.smembers(`${this.INDEX_PREFIX}tier:${filters.tier}`)
          setsToIntersect.push(tierIds)
        }
        
        // Intersect all sets
        if (setsToIntersect.length > 0) {
          profileIds = setsToIntersect.reduce((acc, set) => 
            acc.length === 0 ? set : acc.filter(id => set.includes(id))
          )
        }
        
        // Get all profiles
        const profiles = await Promise.all(
          profileIds.map(id => this.getProfileById(id))
        )
        
        // Filter nulls and apply additional filters
        return profiles.filter((profile): profile is UnifiedProfile => {
          if (!profile) return false
          
          if (filters.isKOL !== undefined && profile.isKOL !== filters.isKOL) {
            return false
          }
          
          if (filters.country && profile.country !== filters.country) {
            return false
          }
          
          return true
        })
      }
    } catch (error) {
      console.error('Error searching profiles:', error)
      return []
    }
  }
  
  /**
   * Merge two profiles (when user logs in with Twitter)
   */
  static async mergeProfiles(
    existingProfileId: string,
    newData: Partial<UnifiedProfile>
  ): Promise<UnifiedProfile> {
    try {
      const existing = await this.getProfileById(existingProfileId)
      if (!existing) throw new Error('Existing profile not found')
      
      // Merge data (new data takes precedence for most fields)
      const merged: UnifiedProfile = {
        ...existing,
        ...newData,
        id: existing.id, // Keep original ID
        createdAt: existing.createdAt, // Keep original creation date
        updatedAt: new Date(),
        
        // Merge arrays
        campaigns: [...(existing.campaigns || []), ...(newData.campaigns || [])],
        notes: [...(existing.notes || []), ...(newData.notes || [])],
        tags: Array.from(new Set([...(existing.tags || []), ...(newData.tags || [])])),
        
        // Merge objects
        contacts: { ...existing.contacts, ...newData.contacts },
        socialLinks: { ...existing.socialLinks, ...newData.socialLinks },
        walletAddresses: { ...existing.walletAddresses, ...newData.walletAddresses },
      }
      
      // Update KOL metrics if needed
      if (merged.isKOL) {
        merged.kolMetrics = await this.calculateKOLMetrics(merged)
      }
      
      return this.saveProfile(merged)
    } catch (error) {
      console.error('Error merging profiles:', error)
      throw error
    }
  }
  
  /**
   * Add a campaign participation to a profile
   */
  static async addCampaignParticipation(
    profileId: string,
    participation: CampaignParticipation
  ): Promise<UnifiedProfile> {
    try {
      const profile = await this.getProfileById(profileId)
      if (!profile) throw new Error('Profile not found')
      
      // Initialize campaigns array if needed
      if (!profile.campaigns) profile.campaigns = []
      
      // Check if already participating
      const existingIndex = profile.campaigns.findIndex(
        c => c.campaignId === participation.campaignId
      )
      
      if (existingIndex >= 0) {
        // Update existing participation
        profile.campaigns[existingIndex] = participation
      } else {
        // Add new participation
        profile.campaigns.push(participation)
      }
      
      // Mark as KOL if not already
      if (!profile.isKOL) {
        profile.isKOL = true
        profile.currentTier = participation.tier
      }
      
      // Update metrics
      profile.kolMetrics = await this.calculateKOLMetrics(profile)
      
      return this.saveProfile(profile)
    } catch (error) {
      console.error('Error adding campaign participation:', error)
      throw error
    }
  }
  
  /**
   * Add a note to a profile
   */
  static async addNote(
    profileId: string,
    authorId: string,
    authorName: string,
    content: string,
    campaignId?: string,
    authorImage?: string
  ): Promise<Note> {
    try {
      const profile = await this.getProfileById(profileId)
      if (!profile) throw new Error('Profile not found')
      
      const note: Note = {
        id: uuidv4(),
        authorId,
        authorName,
        authorImage,
        content,
        createdAt: new Date(),
        campaignId
      }
      
      if (!profile.notes) profile.notes = []
      profile.notes.push(note)
      
      await this.saveProfile(profile)
      
      // TODO: Send email notification
      
      return note
    } catch (error) {
      console.error('Error adding note:', error)
      throw error
    }
  }
  
  /**
   * Calculate KOL metrics based on campaign participations
   */
  private static async calculateKOLMetrics(profile: UnifiedProfile): Promise<KOLMetrics> {
    const campaigns = profile.campaigns || []
    
    const metrics: KOLMetrics = {
      totalCampaigns: campaigns.length,
      totalEarnings: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      totalViews: campaigns.reduce((sum, c) => sum + (c.totalViews || 0), 0),
      totalEngagement: campaigns.reduce((sum, c) => sum + (c.totalEngagement || 0), 0),
      averageEngagementRate: 0,
      topPlatform: 'twitter',
      tierHistory: []
    }
    
    // Calculate average engagement rate
    if (metrics.totalViews > 0) {
      metrics.averageEngagementRate = (metrics.totalEngagement / metrics.totalViews) * 100
    }
    
    // Find top platform
    const platformCounts = campaigns.reduce((acc, c) => {
      acc[c.platform] = (acc[c.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const topPlatform = Object.entries(platformCounts)
      .sort(([, a], [, b]) => b - a)[0]
    
    if (topPlatform) {
      metrics.topPlatform = topPlatform[0] as any
    }
    
    // Build tier history
    metrics.tierHistory = campaigns
      .filter(c => c.tier)
      .map(c => ({
        tier: c.tier!,
        date: c.joinedAt,
        campaignId: c.campaignId
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime())
    
    return metrics
  }
  
  /**
   * Update Redis indexes for efficient searching
   */
  private static async updateIndexes(profile: UnifiedProfile): Promise<void> {
    console.log('[ProfileService.updateIndexes] Starting index update for:', profile.twitterHandle || profile.id)
    
    try {
      // Execute each index update individually instead of using pipeline
      // This ensures compatibility with Upstash Redis
      
      // Handle index
      if (profile.twitterHandle) {
        const handleKey = `${this.INDEX_PREFIX}handle:${profile.twitterHandle}`
        console.log('[ProfileService.updateIndexes] Adding to handle index:', handleKey, 'value:', profile.id)
        await redis.sadd(handleKey, profile.id)
      }
      
      // Role index
      const roleKey = `${this.INDEX_PREFIX}role:${profile.role}`
      console.log('[ProfileService.updateIndexes] Adding to role index:', roleKey, 'value:', profile.id)
      await redis.sadd(roleKey, profile.id)
      
      // Status index
      const statusKey = `${this.INDEX_PREFIX}status:${profile.approvalStatus}`
      console.log('[ProfileService.updateIndexes] Adding to status index:', statusKey, 'value:', profile.id)
      await redis.sadd(statusKey, profile.id)
      
      // KOL index
      if (profile.isKOL) {
        const kolKey = `${this.INDEX_PREFIX}kol:true`
        console.log('[ProfileService.updateIndexes] Adding to KOL index:', kolKey, 'value:', profile.id)
        await redis.sadd(kolKey, profile.id)
      }
      
      // Tier index (for all users, not just KOLs)
      if (profile.tier) {
        const tierKey = `${this.INDEX_PREFIX}tier:${profile.tier}`
        console.log('[ProfileService.updateIndexes] Adding to tier index:', tierKey, 'value:', profile.id)
        await redis.sadd(tierKey, profile.id)
      } else if (profile.currentTier) {
        // Legacy support for currentTier
        const tierKey = `${this.INDEX_PREFIX}tier:${profile.currentTier}`
        console.log('[ProfileService.updateIndexes] Adding to currentTier index:', tierKey, 'value:', profile.id)
        await redis.sadd(tierKey, profile.id)
      }
      
      // Country index
      if (profile.country) {
        const countryKey = `${this.INDEX_PREFIX}country:${profile.country}`
        console.log('[ProfileService.updateIndexes] Adding to country index:', countryKey, 'value:', profile.id)
        await redis.sadd(countryKey, profile.id)
      }
      
      console.log('[ProfileService.updateIndexes] All indexes updated successfully')
    } catch (error) {
      console.error('[ProfileService.updateIndexes] Error updating indexes:', error)
      throw error
    }
  }
  
  /**
   * Delete a profile and clean up all indexes
   */
  static async deleteProfile(profileId: string): Promise<boolean> {
    try {
      console.log('[ProfileService.deleteProfile] Starting deletion for:', profileId)
      
      // Get the profile first to clean up indexes
      const profile = await this.getProfileById(profileId)
      if (!profile) {
        console.log('[ProfileService.deleteProfile] Profile not found:', profileId)
        return false
      }
      
      console.log('[ProfileService.deleteProfile] Found profile:', {
        id: profile.id,
        handle: profile.twitterHandle,
        name: profile.name
      })
      
      // Clean up indexes
      const cleanupPromises = []
      
      // Handle index
      if (profile.twitterHandle) {
        const handleKey = `${this.INDEX_PREFIX}handle:${profile.twitterHandle}`
        console.log('[ProfileService.deleteProfile] Removing from handle index:', handleKey)
        cleanupPromises.push(redis.srem(handleKey, profile.id))
      }
      
      // Role index
      const roleKey = `${this.INDEX_PREFIX}role:${profile.role}`
      console.log('[ProfileService.deleteProfile] Removing from role index:', roleKey)
      cleanupPromises.push(redis.srem(roleKey, profile.id))
      
      // Status index
      const statusKey = `${this.INDEX_PREFIX}status:${profile.approvalStatus}`
      console.log('[ProfileService.deleteProfile] Removing from status index:', statusKey)
      cleanupPromises.push(redis.srem(statusKey, profile.id))
      
      // KOL index
      if (profile.isKOL) {
        const kolKey = `${this.INDEX_PREFIX}kol:true`
        console.log('[ProfileService.deleteProfile] Removing from KOL index:', kolKey)
        cleanupPromises.push(redis.srem(kolKey, profile.id))
      }
      
      // Tier index
      if (profile.tier) {
        const tierKey = `${this.INDEX_PREFIX}tier:${profile.tier}`
        console.log('[ProfileService.deleteProfile] Removing from tier index:', tierKey)
        cleanupPromises.push(redis.srem(tierKey, profile.id))
      } else if (profile.currentTier) {
        const tierKey = `${this.INDEX_PREFIX}tier:${profile.currentTier}`
        console.log('[ProfileService.deleteProfile] Removing from currentTier index:', tierKey)
        cleanupPromises.push(redis.srem(tierKey, profile.id))
      }
      
      // Country index
      if (profile.country) {
        const countryKey = `${this.INDEX_PREFIX}country:${profile.country}`
        console.log('[ProfileService.deleteProfile] Removing from country index:', countryKey)
        cleanupPromises.push(redis.srem(countryKey, profile.id))
      }
      
      // Execute all cleanup operations
      await Promise.all(cleanupPromises)
      console.log('[ProfileService.deleteProfile] All indexes cleaned up')
      
      // Delete the profile
      const key = `${this.PREFIX}${profile.id}`
      console.log('[ProfileService.deleteProfile] Deleting profile key:', key)
      await redis.del(key)
      
      console.log('[ProfileService.deleteProfile] Profile deleted successfully')
      return true
    } catch (error) {
      console.error('[ProfileService.deleteProfile] Error deleting profile:', error)
      throw error
    }
  }
  
  /**
   * Parse contact field (convert @ handles to Telegram links)
   */
  static parseContactField(input: string): string {
    if (input.startsWith('@')) {
      return `https://t.me/${input.substring(1)}`
    }
    return input
  }
  
  /**
   * Deserialize profile from Redis
   */
  private static deserializeProfile(data: any): UnifiedProfile {
    return {
      ...data,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
      approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : undefined,
      lastLoginAt: data.lastLoginAt ? new Date(data.lastLoginAt) : undefined,
      campaigns: data.campaigns?.map((c: any) => ({
        ...c,
        joinedAt: new Date(c.joinedAt),
        completedAt: c.completedAt ? new Date(c.completedAt) : undefined
      })),
      notes: data.notes?.map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt)
      }))
    }
  }
} 