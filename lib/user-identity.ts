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
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
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
 */
export async function hasAdminAccess(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  
  // Check hardcoded admin wallets first
  const ADMIN_WALLET_ETH = '0x37Ed24e7c7311836FD01702A882937138688c1A9'
  const ADMIN_WALLET_SOLANA_1 = 'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq'
  const ADMIN_WALLET_SOLANA_2 = 'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75'
  const ADMIN_WALLET_SOLANA_3 = '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif'
  
  // Different comparison for ETH vs Solana addresses
  if (wallet.startsWith('0x') && wallet.toLowerCase() === ADMIN_WALLET_ETH.toLowerCase()) {
    return true;
  }
  
  if (wallet === ADMIN_WALLET_SOLANA_1 || 
      wallet === ADMIN_WALLET_SOLANA_2 || 
      wallet === ADMIN_WALLET_SOLANA_3) {
    return true;
  }
  
  try {
    // Get the user role from Redis
    const role = await getRole(wallet);
    return role === 'admin';
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * Check if a wallet has core access (admin or core role)
 */
export async function hasCoreAccess(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  
  // Admin wallets always have core access
  if (await hasAdminAccess(wallet)) {
    return true;
  }
  
  try {
    // Get the user role from Redis
    const role = await getRole(wallet);
    return role === 'admin' || role === 'core';
  } catch (error) {
    console.error('Error checking core access:', error);
    return false;
  }
}

/**
 * Check if a wallet has scout access (admin, core, or scout role)
 */
export async function hasScoutAccess(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  
  // Admin and core wallets always have scout access
  if (await hasCoreAccess(wallet)) {
    return true;
  }
  
  try {
    // Get the user role from Redis
    const role = await getRole(wallet);
    return role === 'admin' || role === 'core' || role === 'scout';
  } catch (error) {
    console.error('Error checking scout access:', error);
    return false;
  }
}

/**
 * Check if a wallet has any access level (including viewer)
 */
export async function hasAnyAccess(wallet: string): Promise<boolean> {
  if (!wallet) return false;
  
  // Check if wallet has any role at all
  try {
    const role = await getRole(wallet);
    return !!role; // Return true if role exists, false otherwise
  } catch (error) {
    console.error('Error checking viewer access:', error);
    return false;
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
    if (!walletAddress) {
      console.error('checkUserRole: No wallet address provided');
      return { role: null, hasAccess: false };
    }

    // Debug log for troubleshooting
    console.log('Role check - Original wallet:', JSON.stringify(walletAddress), '→', walletAddress.startsWith('0x') 
      ? `Normalized: ${walletAddress.toLowerCase()}`
      : `Trimmed: ${walletAddress.trim()}`);
    
    // Normalize wallet address - lowercase for ETH addresses
    const normalizedWalletAddress = walletAddress.startsWith('0x')
      ? walletAddress.toLowerCase()
      : walletAddress.trim();
      
    // Debug wallet role check info
    console.log('🔍 ROLE CHECK:', {
      original: walletAddress,
      normalized: normalizedWalletAddress,
      isEVM: walletAddress.startsWith('0x'),
      isSame: walletAddress === normalizedWalletAddress,
      originalLength: walletAddress.length,
      normalizedLength: normalizedWalletAddress.length,
      requiredRoles
    });
    
    let role: string | null = null;
    
    // PRIORITY 1: Check if user has a Twitter-based role
    // Find user by wallet and check if they have a Twitter handle
    const userIds = await redis.smembers(`idx:wallet:${normalizedWalletAddress}`);
    if (userIds.length > 0) {
      const userId = userIds[0];
      const user = await redis.json.get(`user:${userId}`);
      if (user && (user as any).twitterHandle) {
        // User has Twitter handle, use their Twitter-based role
        role = (user as any).role || 'user'; // Default to user for Twitter users
        console.log(`✅ Found Twitter user with role: ${role}`);
      }
    }
    
    // PRIORITY 2: If no Twitter-based role, check wallet role (deprecated)
    if (!role) {
      // First, try legacy string key
      const roleStringKey = await redis.get(`role:${normalizedWalletAddress}`);
      if (roleStringKey) {
        role = String(roleStringKey);
        console.log('⚠️ Using deprecated wallet role:', role);
      } else {
        // Fallback to new hash storage
        const hashRole = await getRole(normalizedWalletAddress);
        if (hashRole) {
          role = hashRole;
          console.log('⚠️ Using deprecated wallet hash role:', role);
        }
      }
    }
    
    // Check if the user's role is in the list of required roles
    const hasAccess = role !== null && requiredRoles.includes(role);
    
    // Also check hardcoded admin wallets for backward compatibility
    const ADMIN_WALLET_ETH = '0x37Ed24e7c7311836FD01702A882937138688c1A9';
    const ADMIN_WALLET_SOLANA_1 = 'D1ZuvAKwpk6NQwJvFcbPvjujRByA6Kjk967WCwEt17Tq';
    const ADMIN_WALLET_SOLANA_2 = 'Eo5EKS2emxMNggKQJcq7LYwWjabrj3zvpG5rHAdmtZ75';
    const ADMIN_WALLET_SOLANA_3 = '6tcxFg4RGVmfuy7MgeUQ5qbFsLPF18PnGMsQnvwG4Xif';
    
    // Check if wallet is a hardcoded admin
    let isHardcodedAdmin = false;
    
    // For ETH addresses (case-insensitive comparison)
    if (walletAddress.startsWith('0x') && walletAddress.toLowerCase() === ADMIN_WALLET_ETH.toLowerCase()) {
      isHardcodedAdmin = true;
      console.log('✅ Found hardcoded ETH admin wallet');
    }
    
    // For Solana addresses (case-sensitive comparison)
    if (walletAddress === ADMIN_WALLET_SOLANA_1 || 
        walletAddress === ADMIN_WALLET_SOLANA_2 || 
        walletAddress === ADMIN_WALLET_SOLANA_3) {
      isHardcodedAdmin = true;
      console.log('✅ Found hardcoded Solana admin wallet');
    }
    
    // If hardcoded admin and 'admin' role is acceptable, grant access
    if (isHardcodedAdmin && requiredRoles.includes('admin')) {
      console.log('✅ Granting access to hardcoded admin wallet');
      return { role: 'admin', hasAccess: true };
    }
    
    console.log('🔑 Final role check result for', JSON.stringify(walletAddress) + ':', role, '(hasAccess:', hasAccess + ')');
    
    return { role, hasAccess };
  } catch (error) {
    console.error('Error in checkUserRole:', error);
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