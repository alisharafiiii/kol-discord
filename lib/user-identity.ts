import { redis, InfluencerProfile } from './redis';
import { getRole } from './roles';

/**
 * User identity management with priority-based matching:
 * 1. Username (Twitter handle) has highest priority
 * 2. Wallet address is secondary priority
 * 3. Other data is considered last
 */

// Add a helper function to check if Redis is properly configured
export function isRedisConfigured(): boolean {
  // Check for either REDIS_URL or Upstash-specific variables
  return Boolean(
    process.env.REDIS_URL || 
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  );
}

// Add graceful fallback for when Redis isn't available
async function safeRedisOperation<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
  if (!isRedisConfigured()) {
    console.warn('Redis is not properly configured, using fallback data');
    return fallback;
  }
  
  try {
    return await operation();
  } catch (error) {
    console.error('Redis operation failed:', error);
    return fallback;
  }
}

/**
 * Find a user by username (Twitter handle)
 */
export async function findUserByUsername(username: string): Promise<InfluencerProfile | null> {
  if (!username) return null;
  
  return safeRedisOperation(async () => {
    // Query by username index
    const userIds = await redis.smembers(`idx:username:${username.toLowerCase()}`);
    if (userIds && userIds.length > 0) {
      const userData = await redis.json.get(`user:${userIds[0]}`);
      return userData as InfluencerProfile;
    }
    return null;
  }, null);
}

/**
 * Find a user by wallet address
 */
export async function findUserByWallet(walletAddress: string): Promise<InfluencerProfile | null> {
  if (!walletAddress) return null;
  
  return safeRedisOperation(async () => {
    // Query by wallet index
    const userIds = await redis.smembers(`idx:wallet:${walletAddress.toLowerCase()}`);
    if (userIds && userIds.length > 0) {
      const userData = await redis.json.get(`user:${userIds[0]}`);
      return userData as InfluencerProfile;
    }
    
    // Fallback: scan through all users to find wallet
    // This is expensive but ensures we find users with this wallet
    const userKeys = await redis.keys('user:*');
    
    for (const key of userKeys) {
      const userData = await redis.json.get(key) as InfluencerProfile | null;
      if (!userData?.walletAddresses) continue;
      
      // Check if any wallet address matches
      const hasMatchingWallet = Object.values(userData.walletAddresses).some(
        address => typeof address === 'string' && address.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (hasMatchingWallet) {
        return userData;
      }
    }
    
    return null;
  }, null);
}

/**
 * Handle user identification when signing in
 * 
 * This function implements the priority logic:
 * 1. First check for username match
 * 2. Then check for wallet match
 * 3. Create new user if no match found
 */
export async function identifyUser(
  userData: Partial<InfluencerProfile>
): Promise<{ user: InfluencerProfile; isNewUser: boolean }> {
  try {
    // If Redis is not configured, create a temporary local user
    if (!isRedisConfigured()) {
      console.warn('Redis not configured, creating temporary local user');
      const now = new Date().toISOString();
      
      // Create a simple local user based on the provided data
      const localUser: InfluencerProfile = {
        id: `local_${Date.now()}`,
        name: userData.name || 'Local User',
        role: userData.role || 'viewer',
        approvalStatus: 'pending',
        createdAt: now,
        walletAddresses: userData.walletAddresses || {},
        twitterHandle: userData.twitterHandle,
        profileImageUrl: userData.profileImageUrl,
      };
      
      // Store in local storage if in browser
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('localUser', JSON.stringify(localUser));
        } catch (e) {
          console.error('Failed to save local user to localStorage:', e);
        }
      }
      
      return { user: localUser, isNewUser: true };
    }
    
    // Normal flow with Redis
    let existingUser: InfluencerProfile | null = null;
    
    // Priority 1: Try to match by username/Twitter handle
    if (userData.twitterHandle) {
      const handle = userData.twitterHandle.replace('@', '').toLowerCase();
      existingUser = await findUserByUsername(handle);
    }
    
    // Priority 2: Try to match by wallet address
    if (!existingUser && userData.walletAddresses) {
      for (const address of Object.values(userData.walletAddresses)) {
        if (typeof address === 'string') {
          existingUser = await findUserByWallet(address);
          if (existingUser) break;
        }
      }
    }
    
    if (existingUser) {
      // Update existing user with any new data
      const updatedUser = await updateUserProfile(existingUser, userData);
      return { user: updatedUser, isNewUser: false };
    } else {
      // Create new user
      const newUser = await createNewUser(userData);
      return { user: newUser, isNewUser: true };
    }
  } catch (error) {
    console.error('Error identifying user:', error);
    
    // Fallback to a minimal local user object when Redis fails
    const now = new Date().toISOString();
    const emergencyUser: InfluencerProfile = {
      id: `emergency_${Date.now()}`,
      name: userData.name || 'Emergency User',
      role: userData.role || 'viewer',
      approvalStatus: 'pending',
      createdAt: now,
      walletAddresses: userData.walletAddresses || {},
    };
    
    return { user: emergencyUser, isNewUser: true };
  }
}

/**
 * Update an existing user profile with new data
 */
async function updateUserProfile(
  existingUser: InfluencerProfile,
  newData: Partial<InfluencerProfile>
): Promise<InfluencerProfile> {
  try {
    const updatedUser = { ...existingUser };
    
    // Merge wallets if new wallet data is available
    if (newData.walletAddresses && Object.keys(newData.walletAddresses).length > 0) {
      updatedUser.walletAddresses = {
        ...(updatedUser.walletAddresses || {}),
        ...newData.walletAddresses
      };
      
      // Index each wallet
      for (const [type, address] of Object.entries(newData.walletAddresses)) {
        if (typeof address === 'string') {
          await redis.sadd(`idx:wallet:${address.toLowerCase()}`, existingUser.id);
        }
      }
    }
    
    // Update other fields ONLY if they're provided (preserve existing values)
    if (newData.name) updatedUser.name = newData.name;
    if (newData.profileImageUrl) updatedUser.profileImageUrl = newData.profileImageUrl;
    if (newData.bio) updatedUser.bio = newData.bio;
    
    // CRITICAL: Only update role and approvalStatus if explicitly provided
    // This prevents overwriting admin-set approval status during login
    if (newData.role !== undefined) updatedUser.role = newData.role;
    if (newData.approvalStatus !== undefined) updatedUser.approvalStatus = newData.approvalStatus;
    
    if (newData.socialAccounts) {
      updatedUser.socialAccounts = {
        ...(updatedUser.socialAccounts || {}),
        ...newData.socialAccounts
      };
    }
    
    // Always update the timestamp
    updatedUser.updatedAt = new Date().toISOString();
    
    // Save updated user back to Redis
    await redis.json.set(`user:${existingUser.id}`, '$', JSON.parse(JSON.stringify(updatedUser)));
    
    console.log(`Updated user ${existingUser.id}: preserved approvalStatus=${updatedUser.approvalStatus}, role=${updatedUser.role}`);
    
    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Create a new user in the database
 */
async function createNewUser(userData: Partial<InfluencerProfile>): Promise<InfluencerProfile> {
  try {
    const now = new Date().toISOString();
    let userId = '';
    
    // Generate user ID based on priority
    if (userData.twitterHandle) {
      // Clean the handle
      const handle = userData.twitterHandle.replace('@', '').toLowerCase();
      userId = `twitter_${handle}`;
    } else if (userData.walletAddresses && Object.keys(userData.walletAddresses).length > 0) {
      // Use first wallet type and short version of address
      const [walletType, address] = Object.entries(userData.walletAddresses)[0];
      const shortAddress = typeof address === 'string' 
        ? address.substring(0, 8) 
        : 'unknown';
      userId = `wallet_${walletType}_${shortAddress}`;
    } else {
      // Fallback to random ID
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    
    // Create full user object
    const newUser: InfluencerProfile = {
      id: userId,
      name: userData.name || 'Anonymous User',
      createdAt: now,
      updatedAt: now,
      role: userData.role || 'user',
      approvalStatus: 'pending',
      ...(userData as any)
    };
    
    // Save to Redis
    await redis.json.set(`user:${userId}`, '$', JSON.parse(JSON.stringify(newUser)));
    
    // Create indexes for username and wallets
    if (userData.twitterHandle) {
      const handle = userData.twitterHandle.replace('@', '').toLowerCase();
      await redis.sadd(`idx:username:${handle}`, userId);
    }
    
    if (userData.walletAddresses) {
      for (const [type, address] of Object.entries(userData.walletAddresses)) {
        if (typeof address === 'string') {
          await redis.sadd(`idx:wallet:${address.toLowerCase()}`, userId);
        }
      }
    }
    
    // Add to approval status index
    await redis.sadd(`idx:status:pending`, userId);
    
    return newUser;
  } catch (error) {
    console.error('Error creating new user:', error);
    throw error;
  }
}

/**
 * Check if a wallet has admin access
 * DISABLED: Wallet-based authentication is disabled. Use Twitter login.
 */
export async function hasAdminAccess(wallet: string): Promise<boolean> {
  console.log('⚠️ Wallet-based admin access check is disabled. Use Twitter login.');
  return false;
}

/**
 * Check if a wallet has core access (admin or core role)
 * DISABLED: Wallet-based authentication is disabled. Use Twitter login.
 */
export async function hasCoreAccess(wallet: string): Promise<boolean> {
  console.log('⚠️ Wallet-based core access check is disabled. Use Twitter login.');
  return false;
}

/**
 * Check if a wallet has scout access (admin, core, or scout role)
 * DISABLED: Wallet-based authentication is disabled. Use Twitter login.
 */
export async function hasScoutAccess(wallet: string): Promise<boolean> {
  console.log('⚠️ Wallet-based scout access check is disabled. Use Twitter login.');
  return false;
}

/**
 * Check if a wallet has any access level (including viewer)
 * DISABLED: Wallet-based authentication is disabled. Use Twitter login.
 */
export async function hasAnyAccess(wallet: string): Promise<boolean> {
  console.log('⚠️ Wallet-based access check is disabled. Use Twitter login.');
  return false;
}

/**
 * Get user role from Twitter session (no wallet checks)
 * @param twitterHandle - The Twitter handle from the session
 * @returns The user's role or null if not found
 */
export async function getRoleFromTwitterSession(twitterHandle: string | undefined): Promise<string | null> {
  if (!twitterHandle) return null;
  
  try {
    // Normalize the handle - remove ALL @ symbols
    const handle = twitterHandle.replace(/^@+/, '').toLowerCase();
    
    // Find user by Twitter handle
    const user = await findUserByUsername(handle);
    
    if (user) {
      console.log(`✅ Found Twitter user ${handle} with role: ${user.role}`);
      return user.role || 'user'; // Default to 'user' role if not set
    }
    
    // If not found, try with @ prefix (in case it's stored that way)
    const userWithAt = await findUserByUsername(`@${handle}`);
    if (userWithAt) {
      console.log(`✅ Found Twitter user @${handle} with role: ${userWithAt.role}`);
      return userWithAt.role || 'user';
    }
    
    // Also try with double @ (in case it's stored that way)
    const userWithDoubleAt = await findUserByUsername(`@@${handle}`);
    if (userWithDoubleAt) {
      console.log(`✅ Found Twitter user @@${handle} with role: ${userWithDoubleAt.role}`);
      return userWithDoubleAt.role || 'user';
    }
    
    console.log(`❌ User ${twitterHandle} not found in any format`);
    return null;
  } catch (error) {
    console.error('Error getting role from Twitter session:', error);
    return null;
  }
}

/**
 * Check if wallet has any of the specified roles
 * @param walletAddress - The wallet address to check
 * @param requiredRoles - Array of roles that provide access
 * @returns Object with role and hasAccess properties
 */
export async function checkUserRole(walletAddress: string, requiredRoles: string[] = ['admin']) {
  try {
    // DISABLED WALLET CHECKS - Always return no access for wallet-based auth
    // This forces the application to use Twitter-based authentication only
    console.log('⚠️ Wallet-based authentication is disabled. Please use Twitter login.');
    return { role: null, hasAccess: false };
  } catch (error) {
    console.error('Error in checkUserRole:', error);
    return { role: null, hasAccess: false };
  }
}

/**
 * Check user role based on Twitter session only
 * @param session - The NextAuth session object
 * @param requiredRoles - Array of roles that provide access
 * @returns Object with role and hasAccess properties
 */
export async function checkUserRoleFromSession(session: any, requiredRoles: string[] = ['admin']) {
  try {
    if (!session?.twitterHandle) {
      console.log('No Twitter handle in session');
      return { role: null, hasAccess: false };
    }
    
    // Remove any @ symbols from the handle
    const cleanHandle = session.twitterHandle.replace(/^@+/, '');
    
    const role = await getRoleFromTwitterSession(cleanHandle);
    const hasAccess = role !== null && requiredRoles.includes(role);
    
    console.log(`🔑 Twitter session role check for ${cleanHandle}: ${role} (hasAccess: ${hasAccess})`);
    
    return { role, hasAccess };
  } catch (error) {
    console.error('Error checking role from session:', error);
    return { role: null, hasAccess: false };
  }
}

// Check if request has valid admin access
export async function getUserIdFromWallet(walletAddress: string): Promise<string | null> {
  try {
    if (!walletAddress) return null;
    
    // Normalize wallet address
    const normalizedWalletAddress = walletAddress.startsWith('0x')
      ? walletAddress.toLowerCase()
      : walletAddress;
    
    // Get user IDs associated with this wallet
    const userIds = await redis.smembers(`idx:wallet:${normalizedWalletAddress}`);
    
    if (!userIds || userIds.length === 0) return null;
    
    // Return the first user ID (we assume a wallet is only associated with one user)
    return userIds[0];
  } catch (error) {
    console.error('Error getting user ID from wallet:', error);
    return null;
  }
}