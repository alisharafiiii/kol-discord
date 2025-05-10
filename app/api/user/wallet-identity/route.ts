import { NextRequest, NextResponse } from 'next/server';
import { identifyUser } from '@/lib/user-identity';

/**
 * API endpoint to handle wallet-based identity management
 * This will find or create a user based on wallet address
 */
export async function POST(request: NextRequest) {
  try {
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
      role: "user" as const
    };
    
    // Identify or create user
    const { user, isNewUser } = await identifyUser(walletData);
    
    return NextResponse.json({
      success: true,
      user,
      isNewUser
    });
  } catch (error) {
    console.error('Error in wallet identity API:', error);
    return NextResponse.json(
      { error: 'Failed to process wallet identity' },
      { status: 500 }
    );
  }
} 