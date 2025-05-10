import { redis, InfluencerProfile } from './redis';

/**
 * User identity management with priority-based matching:
 * 1. Username (Twitter handle) has highest priority
 * 2. Wallet address is secondary priority
 * 3. Other data is considered last
 */

/**
 * Find a user by username (Twitter handle)
 */
export async function findUserByUsername(username: string): Promise<InfluencerProfile | null> {
  if (!username) return null;
  
  try {
    // Query by username index
    const userIds = await redis.smembers(`idx:username:${username.toLowerCase()}`);
    if (userIds && userIds.length > 0) {
      const userData = await redis.json.get(`user:${userIds[0]}`);
      return userData as InfluencerProfile;
    }
    return null;
  } catch (error) {
    console.error('Error finding user by username:', error);
    return null;
  }
}

/**
 * Find a user by wallet address
 */
export async function findUserByWallet(walletAddress: string): Promise<InfluencerProfile | null> {
  if (!walletAddress) return null;
  
  try {
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
  } catch (error) {
    console.error('Error finding user by wallet:', error);
    return null;
  }
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
    throw error;
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
    
    // Update other fields if they're provided
    if (newData.name) updatedUser.name = newData.name;
    if (newData.profileImageUrl) updatedUser.profileImageUrl = newData.profileImageUrl;
    if (newData.bio) updatedUser.bio = newData.bio;
    if (newData.socialAccounts) {
      updatedUser.socialAccounts = {
        ...(updatedUser.socialAccounts || {}),
        ...newData.socialAccounts
      };
    }
    
    // Save updated user back to Redis
    await redis.json.set(`user:${existingUser.id}`, '$', JSON.parse(JSON.stringify(updatedUser)));
    
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
      role: 'user',
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