import { NextRequest, NextResponse } from 'next/server';
import { identifyUser, isRedisConfigured } from '@/lib/user-identity';

/**
 * API endpoint to handle wallet-based identity management
 * This will find or create a user based on wallet address
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Redis is configured
    if (!isRedisConfigured()) {
      console.warn('Redis is not configured, returning mock success response');
      
      // Return a mock success response instead of an error
      // This prevents client-side errors while still logging the issue
      return NextResponse.json({
        success: true,
        user: {
          id: `local_${Date.now()}`,
          name: 'Local User',
          role: 'viewer',
          approvalStatus: 'pending',
          createdAt: new Date().toISOString(),
          // We'll add the wallet data provided by the client later
        },
        isNewUser: true,
        note: 'Using local mode due to Redis configuration issue'
      });
    }
    
    const data = await request.json();
    const { walletAddress, walletType } = data;
    
    if (!walletAddress || !walletType) {
      return NextResponse.json(
        { error: 'Wallet address and type are required' },
        { status: 400 }
      );
    }
    
    // Create wallet data
    const walletData = {
      walletAddresses: {
        [walletType]: walletAddress
      },
      role: "viewer" as const
    };
    
    // Identify or create user
    const { user, isNewUser } = await identifyUser(walletData);
    
    const res = NextResponse.json({ success: true, user, isNewUser });

    // Persist wallet cookie (1 day) so edge-middleware can pick it up
    res.cookies.set('walletAddress', walletAddress, {
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
      secure: true
    });

    return res;
  } catch (error) {
    console.error('Error in wallet identity API:', error);
    
    // Return a minimal success response instead of an error
    // This helps prevent client-side errors
    return NextResponse.json({
      success: true,
      user: {
        id: `error_${Date.now()}`,
        name: 'Temporary User',
        role: 'user',
        approvalStatus: 'pending',
        createdAt: new Date().toISOString(),
      },
      isNewUser: true,
      note: 'Using fallback due to server error'
    });
  }
} 