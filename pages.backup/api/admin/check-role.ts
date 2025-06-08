import { NextApiRequest, NextApiResponse } from 'next'
import { Redis } from '@upstash/redis'
import { getRole } from '@/lib/roles'
import { hasScoutAccess, hasCoreAccess, hasAdminAccess } from '@/lib/user-identity'

// Initialize Redis client with fallback/error handling
let redis: Redis;
try {
  redis = Redis.fromEnv()
} catch (error) {
  console.error('Failed to initialize Redis client:', error)
  // We'll handle this in the request handler
}

// Define role types
const ROLES = ['admin', 'core', 'scout', 'viewer'] as const
type Role = typeof ROLES[number]

// Redis keys
const ROLE_HASH_KEY = 'walletRoles'

// Helper function to detect if an address is an EVM (Ethereum) address
function isEVMAddress(address: string): boolean {
  return address.startsWith('0x');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', success: false })
  }

  // Check if Redis is properly initialized
  if (!redis) {
    console.error('Redis connection not available for check-role');
    return res.status(500).json({
      success: false,
      error: 'Redis connection not available. Check your environment variables.'
    })
  }

  try {
    const { wallet } = req.query
    
    if (!wallet || typeof wallet !== 'string') {
      console.log('Missing wallet address in request');
      return res.status(400).json({ 
        error: 'A wallet address is required',
        success: false 
      })
    }

    // Properly normalize the wallet address based on type
    // EVM addresses are normalized to lowercase
    // Non-EVM addresses (like Solana) preserve their case
    const isEVM = isEVMAddress(wallet);
    const normalizedWallet = isEVM ? wallet.trim().toLowerCase() : wallet.trim();
    console.log(`Role check - Original wallet: "${wallet}" → ${isEVM ? 'Normalized' : 'Trimmed'}: "${normalizedWallet}"`);
    
    try {
      // Enhanced debugging to help diagnose Solana wallet issues
      console.log(`🔍 WALLET ROLE CHECK:`, {
        original: wallet,
        normalized: normalizedWallet,
        isEVM,
        isSame: wallet === normalizedWallet,
        originalLength: wallet.length,
        normalizedLength: normalizedWallet.length
      });
      
      // Use the unified role access check for consistent behavior across the app
      const role = await getRole(wallet);
      console.log(`🔑 Unified role check result for "${wallet}": ${role || 'null'} (hasAccess: ${!!role})`);
      
      // Legacy check - keeping for diagnostic purposes
      const directRole = await redis.hget(ROLE_HASH_KEY, normalizedWallet) as Role | null;
      console.log(`👉 Legacy direct lookup for "${normalizedWallet}" returned role: ${directRole || 'null'}`);
      
      // Pre-check access levels for different role types
      const adminAccess = await hasAdminAccess(wallet);
      const coreAccess = await hasCoreAccess(wallet);
      const scoutAccess = await hasScoutAccess(wallet);
      
      // Prepare response
      const response = { 
        success: true,
        wallet: normalizedWallet,
        // Use the role from our check
        role: role,
        isAdmin: role === 'admin',
        isCore: role === 'core',
        isScout: role === 'scout',
        isViewer: role === 'viewer',
        isAtLeastScout: ['admin', 'core', 'scout'].includes(role || '')
      };

      return res.status(200).json(response);
    } catch (redisError: unknown) {
      const errorMessage = redisError instanceof Error ? redisError.message : 'Unknown Redis error';
      console.error('Redis error getting role:', redisError)
      return res.status(500).json({
        error: `Database error: ${errorMessage}`,
        success: false
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error checking wallet role:', error)
    return res.status(500).json({ 
      error: `Failed to check wallet role: ${errorMessage}`,
      success: false 
    })
  }
} 